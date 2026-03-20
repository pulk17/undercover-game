import type { Server } from 'socket.io';
import type { GameState, Room, ClueEntry, PublicGameState } from '@undercover/shared';
import { redis } from './redis';
import { getRoom, saveRoom } from '../managers/RoomManager';
import { toPublicGameState } from '../handlers/gameHandlers';

const GAME_TTL = 60 * 60 * 24; // 24 hours
const SPEED_ROUND_TIMER_SECONDS = 20;

// ─── Active turn timers ───────────────────────────────────────────────────────

const activeTurnTimers = new Map<string, NodeJS.Timeout>();

// ─── Pure helper ─────────────────────────────────────────────────────────────

/**
 * Returns true when every active player has a ClueEntry in the log for the
 * current round (clue may be null = skipped).
 */
export function allCluesSubmitted(gameState: GameState): boolean {
  const { activePlayers, clueLog, round } = gameState;
  if (activePlayers.length === 0) return false;
  return activePlayers.every((playerId) =>
    clueLog.some((entry) => entry.playerId === playerId && entry.round === round),
  );
}

// ─── Timer helpers ────────────────────────────────────────────────────────────

export function cancelTurnTimer(roomCode: string): void {
  const existing = activeTurnTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    activeTurnTimers.delete(roomCode);
  }
}

export function startTurnTimer(roomCode: string, timerSeconds: number, io: Server): void {
  cancelTurnTimer(roomCode);

  const handle = setTimeout(async () => {
    activeTurnTimers.delete(roomCode);
    try {
      await handleTimerExpiry(roomCode, io);
    } catch {
      // swallow — timer expiry errors should not crash the server
    }
  }, timerSeconds * 1000);

  activeTurnTimers.set(roomCode, handle);
}

// ─── Timer expiry ─────────────────────────────────────────────────────────────

async function handleTimerExpiry(roomCode: string, io: Server): Promise<void> {
  const rawState = await redis.get<string>(`game:${roomCode}`);
  if (!rawState) return;

  const gameState: GameState =
    typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

  if (gameState.phase !== 'clue' || !gameState.currentTurnPlayerId) return;

  const room = await getRoom(roomCode);
  if (!room) return;

  const playerId = gameState.currentTurnPlayerId;

  // Speed Round: increment strikes, possibly eliminate
  if (room.config.mode === 'speed_round') {
    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.strikes = (player.strikes ?? 0) + 1;

      if (player.strikes >= 3) {
        // Eliminate player
        player.isActive = false;
        gameState.activePlayers = gameState.activePlayers.filter((id) => id !== playerId);
        gameState.spectators.push(playerId);

        await saveRoom(room);
        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        io.to(roomCode).emit('game:elimination', { playerId, role: undefined });

        // Record skipped clue for eliminated player
        const nickname = player.nickname;
        const skippedEntry: ClueEntry = {
          playerId,
          nickname,
          clue: null,
          round: gameState.round,
          timestamp: Date.now(),
        };
        gameState.clueLog.push(skippedEntry);
        io.to(roomCode).emit('game:clue_submitted', { entry: skippedEntry });

        // Check if all remaining players have submitted
        if (allCluesSubmitted(gameState)) {
          const { startDiscussionPhase } = await import('./discussionManager');
          await startDiscussionPhase(io, roomCode, gameState);
          return;
        }

        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });
        await advanceTurn(gameState, room, io);
        return;
      }

      await saveRoom(room);
    }
  }

  // Record skipped clue
  const player = room.players.find((p) => p.id === playerId);
  const nickname = player?.nickname ?? playerId;
  const skippedEntry: ClueEntry = {
    playerId,
    nickname,
    clue: null,
    round: gameState.round,
    timestamp: Date.now(),
  };
  gameState.clueLog.push(skippedEntry);
  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  io.to(roomCode).emit('game:clue_submitted', { entry: skippedEntry });

  await advanceTurn(gameState, room, io);
}

// ─── Advance turn ─────────────────────────────────────────────────────────────

export async function advanceTurn(
  gameState: GameState,
  room: Room,
  io: Server,
): Promise<void> {
  const roomCode = gameState.roomCode;

  // Check if all clues submitted for this round
  if (allCluesSubmitted(gameState)) {
    const { startDiscussionPhase } = await import('./discussionManager');
    await startDiscussionPhase(io, roomCode, gameState);
    return;
  }

  // Find next player who hasn't submitted a clue this round
  const { activePlayers, clueLog, round } = gameState;
  const submittedThisRound = new Set(
    clueLog.filter((e) => e.round === round).map((e) => e.playerId),
  );

  const currentIndex = activePlayers.indexOf(gameState.currentTurnPlayerId ?? '');
  let nextPlayerId: string | null = null;

  // Search from current position forward (wrapping)
  for (let i = 1; i <= activePlayers.length; i++) {
    const candidate = activePlayers[(currentIndex + i) % activePlayers.length];
    if (!submittedThisRound.has(candidate)) {
      nextPlayerId = candidate;
      break;
    }
  }

  if (!nextPlayerId) {
    // Fallback: all submitted (shouldn't reach here, but be safe)
    const { startDiscussionPhase } = await import('./discussionManager');
    await startDiscussionPhase(io, roomCode, gameState);
    return;
  }

  gameState.currentTurnPlayerId = nextPlayerId;

  // Determine timer
  const timerSeconds = resolveTimerSeconds(room);
  gameState.phaseEndsAt = timerSeconds !== null ? Date.now() + timerSeconds * 1000 : null;

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  io.to(roomCode).emit('game:turn_changed', {
    playerId: nextPlayerId,
    endsAt: gameState.phaseEndsAt,
  });

  if (timerSeconds !== null) {
    startTurnTimer(roomCode, timerSeconds, io);
  }
}

// ─── Resolve timer seconds ────────────────────────────────────────────────────

function resolveTimerSeconds(room: Room): number | null {
  if (room.config.mode === 'speed_round') return SPEED_ROUND_TIMER_SECONDS;
  return room.config.clueTimerSeconds ?? null;
}

// ─── Start clue phase ─────────────────────────────────────────────────────────

export async function startCluePhase(
  gameState: GameState,
  room: Room,
  io: Server,
): Promise<void> {
  const roomCode = gameState.roomCode;

  if (gameState.activePlayers.length === 0) return;

  // Turn order = activePlayers in their current order, index 0 first
  gameState.currentTurnPlayerId = gameState.activePlayers[0];

  // Set timer
  const timerSeconds = resolveTimerSeconds(room);
  gameState.phaseEndsAt = timerSeconds !== null ? Date.now() + timerSeconds * 1000 : null;

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  io.to(roomCode).emit('game:turn_changed', {
    playerId: gameState.currentTurnPlayerId,
    endsAt: gameState.phaseEndsAt,
  });

  if (timerSeconds !== null) {
    startTurnTimer(roomCode, timerSeconds, io);
  }
}
