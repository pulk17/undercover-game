import type { Server } from 'socket.io';
import type { GameState } from '@undercover/shared';
import { redis } from './redis';
import { getRoom } from '../managers/RoomManager';
import { toPublicGameState } from '../handlers/gameHandlers';
import { loadAndValidatePhase } from './phaseTransition';

const GAME_TTL = 60 * 60 * 24; // 24 hours
const VOTE_PHASE_DURATION_MS = 30_000; // 30 seconds
const ELIMINATION_REVEAL_DELAY_MS = 2_500;

// ─── Active vote timers ───────────────────────────────────────────────────────

const activeVoteTimers = new Map<string, NodeJS.Timeout>();

// ─── Timer helpers ────────────────────────────────────────────────────────────

export function cancelVoteTimer(roomCode: string): void {
  const existing = activeVoteTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    activeVoteTimers.delete(roomCode);
  }
}

/**
 * Schedule a vote expiry timer for `delayMs` milliseconds from now.
 * Replaces any existing timer for the room.
 */
export function scheduleVoteExpiry(roomCode: string, delayMs: number, io: Server): void {
  cancelVoteTimer(roomCode);
  const handle = setTimeout(async () => {
    activeVoteTimers.delete(roomCode);
    try {
      await handleVoteExpiry(roomCode, io);
    } catch {
      // swallow — timer expiry errors should not crash the server
    }
  }, delayMs);
  activeVoteTimers.set(roomCode, handle);
}

// ─── Vote phase ───────────────────────────────────────────────────────────────

/**
 * Starts the vote phase for a room.
 *
 * - Sets phase to 'vote' in GameState
 * - Sets phaseEndsAt to Date.now() + 30_000
 * - Schedules a 30s server-side timer that auto-calls revealVotes on expiry
 * - Persists updated GameState to Redis
 * - Emits `game:phase_changed` to the room with the updated PublicGameState
 *   (publicState includes activePlayers as the vote targets)
 */
export async function startVotePhase(
  io: Server,
  roomCode: string,
  gameState: GameState,
): Promise<void> {
  // Cancel any existing vote timer for this room
  cancelVoteTimer(roomCode);

  // Set phase
  gameState.phase = 'vote';
  gameState.phaseEndsAt = Date.now() + VOTE_PHASE_DURATION_MS;

  // Schedule auto-expiry
  scheduleVoteExpiry(roomCode, VOTE_PHASE_DURATION_MS, io);

  // Persist to Redis
  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  // Broadcast phase change — publicState includes activePlayers as vote targets
  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'vote', state: publicState });
}

// ─── Timer expiry ─────────────────────────────────────────────────────────────

/**
 * Called when the vote timer expires.
 * Delegates to revealVotes to compute the tally and transition to elimination.
 */
async function handleVoteExpiry(roomCode: string, io: Server): Promise<void> {
  const { loadAndValidatePhase } = await import('./phaseTransition');
  const gameState = await loadAndValidatePhase(roomCode, 'vote');
  if (!gameState) return;

  await revealVotes(roomCode, gameState, io);
}


/**
 * Reveals votes and transitions to the elimination phase (or resolves a tie).
 * Computes the vote tally for the current round, determines the eliminated
 * player (or null on tie), persists state, and emits `game:votes_revealed`.
 */
export async function revealVotes(
  roomCode: string,
  gameState: GameState,
  io: Server,
): Promise<void> {
  // 1. Cancel any running vote timer
  cancelVoteTimer(roomCode);

  // 2. If this is a re-vote resolution, restore the original activePlayers after tallying
  const restoreKey = `revote_restore:${roomCode}`;
  const rawRestore = await redis.get<string>(restoreKey);
  let originalActivePlayers: string[] | null = null;
  if (rawRestore) {
    originalActivePlayers =
      typeof rawRestore === 'string' ? JSON.parse(rawRestore) : (rawRestore as string[]);
    await redis.del(restoreKey);
  }

  // 3. Compute tally for the current round
  const tally: Record<string, number> = {};
  for (const vote of gameState.votes) {
    if (vote.round === gameState.round) {
      tally[vote.targetId] = (tally[vote.targetId] ?? 0) + 1;
    }
  }

  // 4. Find the maximum vote count
  const maxVotes = Object.values(tally).reduce((max, count) => Math.max(max, count), 0);

  // 5. Find all players tied at the top
  const topPlayers = Object.entries(tally)
    .filter(([, count]) => count === maxVotes)
    .map(([playerId]) => playerId);

  const isTie = topPlayers.length > 1;
  const eliminatedPlayerId = isTie ? null : (topPlayers[0] ?? null);

  // 6. Restore original activePlayers if this was a re-vote
  if (originalActivePlayers !== null) {
    gameState.activePlayers = originalActivePlayers;
  }

  // 7. Emit game:votes_revealed before resolving
  io.to(roomCode).emit('game:votes_revealed', {
    tally,
    eliminatedPlayerId,
    isTie,
  });

  // 8. Handle tie resolution or proceed to elimination
  if (isTie) {
    await resolveTie(roomCode, gameState, topPlayers, io);
    return;
  }

  if (!eliminatedPlayerId) return;

  // 9. Transition into the elimination reveal and then resolve it server-side
  await scheduleEliminationResolution(roomCode, gameState, eliminatedPlayerId, io);
}

/**
 * Resolves a tie according to the room's configured tieResolution strategy.
 *
 * - 're_vote': Start a new vote phase restricted to the tied players as candidates.
 *   activePlayers is temporarily set to the tied players so only they can be voted for.
 * - 'all_survive': No elimination; advance to the next round's clue phase.
 * - 'random': Pick one tied player at random and proceed to elimination.
 */
async function resolveTie(
  roomCode: string,
  gameState: GameState,
  tiedPlayers: string[],
  io: Server,
): Promise<void> {
  const room = await getRoom(roomCode);
  if (!room) return;

  const strategy = room.config.tieResolution;

  if (strategy === 're_vote') {
    // Restrict activePlayers to only the tied players for the re-vote
    const originalActivePlayers = gameState.activePlayers;
    gameState.activePlayers = tiedPlayers;

    // Clear votes for the new vote round so players can vote again
    gameState.votes = gameState.votes.filter((v) => v.round !== gameState.round);

    // Persist before starting vote phase (startVotePhase will also persist)
    await startVotePhase(io, roomCode, gameState);

    // Restore full active players list after startVotePhase persists
    // We need to update Redis with the restored list while keeping phase=vote
    // and the restricted activePlayers for the duration of the re-vote.
    // The re-vote will naturally call revealVotes again when complete,
    // at which point tiedPlayers will be the new candidates.
    // Store the original list so it can be restored after re-vote resolves.
    // We embed it in a side-channel key in Redis.
    await redis.set(
      `revote_restore:${roomCode}`,
      JSON.stringify(originalActivePlayers),
      { ex: GAME_TTL },
    );
    return;
  }

  if (strategy === 'all_survive') {
    // No elimination — advance to next round
    gameState.eliminatedThisRound = null;
    gameState.round += 1;
    gameState.phase = 'clue';
    gameState.phaseEndsAt = null;
    gameState.currentTurnPlayerId = null;

    await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

    const publicState = toPublicGameState(gameState);
    io.to(roomCode).emit('game:phase_changed', { phase: 'clue', state: publicState });

    const { startCluePhase } = await import('./clueManager');
    await startCluePhase(gameState, room, io);
    return;
  }

  if (strategy === 'random') {
    // Pick a random tied player
    const randomIndex = Math.floor(Math.random() * tiedPlayers.length);
    const chosen = tiedPlayers[randomIndex]!;

    // Notify clients of the random pick
    io.to(roomCode).emit('game:tie_broken', { eliminatedPlayerId: chosen, strategy: 'random' });
    await scheduleEliminationResolution(roomCode, gameState, chosen, io);
    return;
  }
}

async function scheduleEliminationResolution(
  roomCode: string,
  gameState: GameState,
  eliminatedPlayerId: string,
  io: Server,
): Promise<void> {
  gameState.eliminatedThisRound = eliminatedPlayerId;
  gameState.phase = 'elimination';
  gameState.phaseEndsAt = Date.now() + ELIMINATION_REVEAL_DELAY_MS;

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'elimination', state: publicState });

  setTimeout(async () => {
    try {
      const [rawState, room] = await Promise.all([
        redis.get<string>(`game:${roomCode}`),
        getRoom(roomCode),
      ]);
      if (!rawState || !room) return;

      const latestState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      if (
        latestState.phase !== 'elimination' ||
        latestState.eliminatedThisRound !== eliminatedPlayerId
      ) {
        return;
      }

      const { eliminatePlayer } = await import('./eliminationManager');
      await eliminatePlayer(io, roomCode, latestState, eliminatedPlayerId, room);
    } catch {
      // best-effort; reveal timers should never crash the server
    }
  }, ELIMINATION_REVEAL_DELAY_MS);
}
