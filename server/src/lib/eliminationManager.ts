import type { Server } from 'socket.io';
import type { GameState, Room, Role } from '@undercover/shared';
import { redis } from './redis';
import { saveRoom } from '../managers/RoomManager';
import { toPublicGameState, startMrWhiteGuessTimer, awardXPForGame, evaluateAchievementsForGame } from '../handlers/gameHandlers';
import { evaluateWinCondition } from './gameEngine';
import { awardRoomLeaderboardPoints } from './roomLeaderboardService';

const GAME_TTL = 60 * 60 * 24; // 24 hours
const MR_WHITE_GUESS_WINDOW_MS = 10_000;

/**
 * Handles the elimination flow after `game:votes_revealed` resolves a winner.
 *
 * Steps:
 *  1. Remove eliminatedPlayerId from activePlayers, add to spectators
 *  2. Emit `game:elimination` (with role if postEliminationReveal is enabled)
 *  3. Evaluate win condition
 *  4. If game over → emit `game:winner` and return
 *  5. If eliminated player is Mr. White → open guess window and return
 *  6. Otherwise → advance to next round
 */
export async function eliminatePlayer(
  io: Server,
  roomCode: string,
  gameState: GameState,
  eliminatedPlayerId: string,
  room: Room,
): Promise<void> {
  // 1. Move player from activePlayers to spectators
  gameState.activePlayers = gameState.activePlayers.filter((id) => id !== eliminatedPlayerId);
  if (!gameState.spectators.includes(eliminatedPlayerId)) {
    gameState.spectators.push(eliminatedPlayerId);
  }

  // 2. Get eliminated player's role and nickname from room
  const eliminatedPlayer = room.players.find((p) => p.id === eliminatedPlayerId);
  const eliminatedRole: Role | null = eliminatedPlayer?.role ?? null;
  const nickname: string = eliminatedPlayer?.nickname ?? eliminatedPlayerId;
  if (eliminatedPlayer) {
    eliminatedPlayer.isActive = false;
  }
  room.lastActivityAt = Date.now();
  await saveRoom(room);

  // 3. Determine whether to reveal the role
  const revealRole = room.config.postEliminationReveal === true;

  // 4. Emit game:elimination to the room
  io.to(roomCode).emit('game:elimination', {
    eliminatedPlayerId,
    role: revealRole ? eliminatedRole : null,
    nickname,
  });

  // 5. Build playerRoles map from active players only
  const playerRoles: Record<string, Role> = {};
  for (const player of room.players) {
    if (gameState.activePlayers.includes(player.id) && player.role !== null) {
      playerRoles[player.id] = player.role;
    }
  }

  // 6. Evaluate win condition
  const winFaction = evaluateWinCondition(gameState.activePlayers, playerRoles);

  if (winFaction !== null) {
    // Game over
    gameState.winner = winFaction;
    gameState.phase = 'game_over';

    if (room.config.mode === 'tournament') {
      const { awardTournamentPoints } = await import('./tournamentManager');
      const correctVoters = gameState.votes
        .filter((vote) => vote.targetId === eliminatedPlayerId)
        .map((vote) => vote.voterId);
      const tournamentState = await awardTournamentPoints(roomCode, gameState, room, correctVoters);
      if (tournamentState) {
        gameState.tournamentScores = { ...tournamentState.scores };
      }
    }

    const roomLeaderboardScores = await awardRoomLeaderboardPoints(room, gameState);
    if (room.config.mode !== 'tournament') {
      gameState.tournamentScores = roomLeaderboardScores;
    }

    await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

    const publicState = toPublicGameState(gameState);
    io.to(roomCode).emit('game:winner', { winner: winFaction, state: publicState });

    // Award XP and evaluate achievements for all players
    void awardXPForGame(io, room, gameState);
    void evaluateAchievementsForGame(io, room, gameState);

    // Tournament mode: advance to next game if not the final game
    const room2 = room; // already have room in scope
    if (room2.config.mode === 'tournament') {
      const { isTournamentComplete, startNextTournamentGame } = await import('./tournamentManager');
      const done = await isTournamentComplete(roomCode);
      if (!done) {
        // Brief delay so clients can display the winner screen before next game starts
        setTimeout(() => {
          void startNextTournamentGame(roomCode, io);
        }, 5_000);
      }
    }
    return;
  }

  // 7. Mr. White guess window
  if (eliminatedRole === 'mr_white') {
    gameState.phase = 'mr_white_guess';
    gameState.phaseEndsAt = Date.now() + MR_WHITE_GUESS_WINDOW_MS;
    await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });
    io.to(roomCode).emit('game:phase_changed', {
      phase: 'mr_white_guess',
      state: toPublicGameState(gameState),
    });

    // Emit only to the eliminated player's socket
    io.to(eliminatedPlayerId).emit('game:mr_white_window', {
      phaseEndsAt: gameState.phaseEndsAt,
    });

    // Start server-side 10s auto-expiry timer
    startMrWhiteGuessTimer(roomCode, io);
    return;
  }

  // 8. No win condition, not Mr. White — advance to next round
  await advanceToNextRound(io, roomCode, gameState, room);
}

/**
 * Advances the game to the next round's clue phase.
 * If Final Confrontation conditions are met (3 active players and Mr. White is among them),
 * reveals all roles and grants Mr. White a final guess before the vote.
 */
export async function advanceToNextRound(
  io: Server,
  roomCode: string,
  gameState: GameState,
  room: Room,
): Promise<void> {
  gameState.round += 1;
  gameState.currentTurnPlayerId = null;

  // Check Final Confrontation: exactly 3 active players and Mr. White is among them
  const mrWhitePlayer = room.players.find(
    (p) => p.role === 'mr_white' && gameState.activePlayers.includes(p.id),
  );

  if (gameState.activePlayers.length === 3 && mrWhitePlayer !== undefined) {
    // Build roleReveal map for all active players
    const roleReveal: Record<string, Role> = {};
    for (const player of room.players) {
      if (gameState.activePlayers.includes(player.id) && player.role !== null) {
        roleReveal[player.id] = player.role;
      }
    }

    // Reveal all roles to everyone
    io.to(roomCode).emit('game:final_confrontation', { roleReveal });

    // Grant Mr. White a final guess window before the vote
    gameState.phase = 'mr_white_guess';
    gameState.phaseEndsAt = Date.now() + 10_000;

    await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });
    io.to(roomCode).emit('game:phase_changed', {
      phase: 'mr_white_guess',
      state: toPublicGameState(gameState),
    });

    // Notify Mr. White's socket of their guess window
    io.to(mrWhitePlayer.id).emit('game:mr_white_window', {
      phaseEndsAt: gameState.phaseEndsAt,
    });

    // Start server-side 10s auto-expiry timer
    startMrWhiteGuessTimer(roomCode, io);
    return;
  }

  // Normal path: start next clue phase
  gameState.phase = 'clue';

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'clue', state: publicState });

  const { startCluePhase } = await import('./clueManager');
  await startCluePhase(gameState, room, io);
}
