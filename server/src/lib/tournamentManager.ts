import type { Server } from 'socket.io';
import type { GameState, Room, WinFaction, Role } from '@undercover/shared';
import { redis } from './redis';
import { getRoom, saveRoom } from '../managers/RoomManager';
import { toPublicGameState } from '../handlers/gameHandlers';
import { WordSelector } from './wordSelector';
import { RoleDistributor } from './roleDistributor';
import { deliverRoles } from './roleDelivery';

const GAME_TTL = 60 * 60 * 24;
const TOURNAMENT_GAMES = 5;

// ─── Point schedule ───────────────────────────────────────────────────────────

export const TOURNAMENT_POINTS = {
  surviveRound: 1,
  correctVote: 2,
  winUndercover: 5,
  winMrWhite: 8,
} as const;

// ─── Tournament state stored in Redis ────────────────────────────────────────

export interface TournamentState {
  gameNumber: number;           // 1–5
  scores: Record<string, number>;
  undercoverHistory: Record<string, number>; // playerId → times assigned undercover
}

function tournamentKey(roomCode: string): string {
  return `tournament:${roomCode}`;
}

export async function getTournamentState(roomCode: string): Promise<TournamentState | null> {
  const raw = await redis.get<string>(tournamentKey(roomCode));
  if (!raw) return null;
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as TournamentState);
}

export async function saveTournamentState(
  roomCode: string,
  state: TournamentState,
): Promise<void> {
  await redis.set(tournamentKey(roomCode), JSON.stringify(state), { ex: GAME_TTL });
}

// ─── Initialise tournament ────────────────────────────────────────────────────

export async function initTournament(
  roomCode: string,
  playerIds: string[],
): Promise<TournamentState> {
  const scores: Record<string, number> = {};
  const undercoverHistory: Record<string, number> = {};
  for (const id of playerIds) {
    scores[id] = 0;
    undercoverHistory[id] = 0;
  }
  const state: TournamentState = { gameNumber: 1, scores, undercoverHistory };
  await saveTournamentState(roomCode, state);
  return state;
}

// ─── Award points ─────────────────────────────────────────────────────────────

/**
 * Award points at the end of a game.
 *
 * @param gameState  Final game state
 * @param room       Room (for player roles)
 * @param correctVoters  Player IDs who voted for the eliminated player this round
 */
export async function awardTournamentPoints(
  roomCode: string,
  gameState: GameState,
  room: Room,
  correctVoters: string[],
): Promise<TournamentState | null> {
  const ts = await getTournamentState(roomCode);
  if (!ts) return null;

  const winner: WinFaction | null = gameState.winner;

  for (const player of room.players) {
    const id = player.id;
    if (!(id in ts.scores)) continue;

    // +1 for surviving (still in activePlayers at game end)
    if (gameState.activePlayers.includes(id)) {
      ts.scores[id] = (ts.scores[id] ?? 0) + TOURNAMENT_POINTS.surviveRound;
    }

    // +2 for correct vote
    if (correctVoters.includes(id)) {
      ts.scores[id] = (ts.scores[id] ?? 0) + TOURNAMENT_POINTS.correctVote;
    }

    // Win bonuses
    if (winner === 'undercover' && (player.role === 'undercover')) {
      ts.scores[id] = (ts.scores[id] ?? 0) + TOURNAMENT_POINTS.winUndercover;
    }
    if (winner === 'mr_white' && player.role === 'mr_white') {
      ts.scores[id] = (ts.scores[id] ?? 0) + TOURNAMENT_POINTS.winMrWhite;
    }
  }

  await saveTournamentState(roomCode, ts);
  return ts;
}

// ─── Role rotation ────────────────────────────────────────────────────────────

/**
 * Selects the next undercover player(s) ensuring every player gets the role
 * at least once across 5 games. Returns a list of player IDs that MUST be
 * assigned undercover in the next game.
 *
 * The distributor will still shuffle the rest of the roles normally; this
 * function only returns the forced undercover IDs.
 */
export function pickForcedUndercoverIds(
  playerIds: string[],
  undercoverHistory: Record<string, number>,
  undercoverSlotsNeeded: number,
): string[] {
  // Players who haven't been undercover yet get priority
  const neverUndercover = playerIds.filter((id) => (undercoverHistory[id] ?? 0) === 0);

  if (neverUndercover.length === 0) return []; // everyone has had a turn — free assignment

  // Shuffle the never-undercover list and pick up to undercoverSlotsNeeded
  const shuffled = [...neverUndercover].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(undercoverSlotsNeeded, shuffled.length));
}

// ─── Start next tournament game ───────────────────────────────────────────────

/**
 * Advances the tournament to the next game.
 * - Increments gameNumber
 * - Selects a new word pair
 * - Distributes roles with rotation enforcement
 * - Initialises a fresh GameState with cumulative tournamentScores
 * - Emits game:phase_changed (role_reveal) to the room
 */
export async function startNextTournamentGame(
  roomCode: string,
  io: Server,
): Promise<void> {
  const room = await getRoom(roomCode);
  if (!room) return;

  const ts = await getTournamentState(roomCode);
  if (!ts) return;

  ts.gameNumber += 1;

  const activePlayers = room.players.filter((p) => p.isActive && p.isConnected);
  const playerIds = activePlayers.map((p) => p.id);

  // Select word pair
  const wordPair = room.config.customWordPair ?? await WordSelector.selectPair({
    categories: room.config.categories,
    difficulty: room.config.difficulty,
    roomCode,
  });

  // Determine how many undercover slots the standard distribution gives
  const assignments = RoleDistributor.distribute(
    playerIds,
    room.config.mode,
    room.config.detectiveEnabled,
    wordPair,
  );

  const undercoverCount = assignments.filter((a) => a.role === 'undercover').length;

  // Enforce rotation: swap in players who haven't been undercover yet
  const forcedIds = pickForcedUndercoverIds(playerIds, ts.undercoverHistory, undercoverCount);

  if (forcedIds.length > 0) {
    // Find current undercover assignments and swap with forced players
    const currentUndercoverAssignments = assignments.filter((a) => a.role === 'undercover');
    const forcedSet = new Set(forcedIds);

    for (let i = 0; i < Math.min(forcedIds.length, currentUndercoverAssignments.length); i++) {
      const forcedId = forcedIds[i];
      const swapTarget = currentUndercoverAssignments[i];

      // Find the forced player's current assignment
      const forcedAssignment = assignments.find((a) => a.playerId === forcedId);
      if (!forcedAssignment || !swapTarget) continue;

      // Swap roles and words
      const tmpRole = forcedAssignment.role;
      const tmpWord = forcedAssignment.word;
      forcedAssignment.role = swapTarget.role;
      forcedAssignment.word = swapTarget.word;
      swapTarget.role = tmpRole;
      swapTarget.word = tmpWord;
    }
  }

  // Update undercover history
  for (const a of assignments) {
    if (a.role === 'undercover') {
      ts.undercoverHistory[a.playerId] = (ts.undercoverHistory[a.playerId] ?? 0) + 1;
    }
  }

  // Deliver roles privately
  const playerSocketMap: Record<string, string> = {};
  for (const p of activePlayers) playerSocketMap[p.id] = p.id;
  await deliverRoles(roomCode, assignments, playerSocketMap, io);

  // Update player roles in room
  const assignmentMap = new Map(assignments.map((a) => [a.playerId, a]));
  for (const player of room.players) {
    const a = assignmentMap.get(player.id);
    if (a) { player.role = a.role; player.word = a.word; player.isActive = true; player.strikes = 0; }
  }
  room.phase = 'role_reveal';
  room.lastActivityAt = Date.now();
  await saveRoom(room);

  // Fresh GameState with carried-over tournament scores
  const gameState: GameState = {
    roomCode,
    round: 1,
    phase: 'role_reveal',
    activePlayers: playerIds,
    spectators: [],
    clueLog: [],
    votes: [],
    currentTurnPlayerId: null,
    wordPair,
    eliminatedThisRound: null,
    winner: null,
    tournamentScores: { ...ts.scores },
    phaseEndsAt: null,
  };

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });
  await saveTournamentState(roomCode, ts);

  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'role_reveal', state: publicState });
}

// ─── Check if tournament is over ─────────────────────────────────────────────

export async function isTournamentComplete(roomCode: string): Promise<boolean> {
  const ts = await getTournamentState(roomCode);
  if (!ts) return false;
  return ts.gameNumber >= TOURNAMENT_GAMES;
}
