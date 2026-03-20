import type { Server } from 'socket.io';
import type { GameState } from '@undercover/shared';
import { redis } from './redis';
import { getRoom } from '../managers/RoomManager';
import { toPublicGameState } from '../handlers/gameHandlers';

const GAME_TTL = 60 * 60 * 24; // 24 hours

// ─── Active discussion timers ─────────────────────────────────────────────────

const activeDiscussionTimers = new Map<string, NodeJS.Timeout>();

// ─── Timer helpers ────────────────────────────────────────────────────────────

export function cancelDiscussionTimer(roomCode: string): void {
  const existing = activeDiscussionTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    activeDiscussionTimers.delete(roomCode);
  }
}

/**
 * Schedule a discussion expiry timer for `delayMs` milliseconds from now.
 * Replaces any existing timer for the room.
 */
export function scheduleDiscussionExpiry(roomCode: string, delayMs: number, io: Server): void {
  cancelDiscussionTimer(roomCode);
  const handle = setTimeout(async () => {
    activeDiscussionTimers.delete(roomCode);
    try {
      await handleDiscussionExpiry(roomCode, io);
    } catch {
      // swallow — timer expiry errors should not crash the server
    }
  }, delayMs);
  activeDiscussionTimers.set(roomCode, handle);
}

// ─── Discussion phase ─────────────────────────────────────────────────────────

/**
 * Starts the discussion phase for a room.
 *
 * - Sets phase to 'discussion' in GameState
 * - If discussionTimerSeconds > 0: sets phaseEndsAt and starts a server-side
 *   setTimeout that auto-transitions to vote phase on expiry
 * - If discussionTimerSeconds is null or 0 (unlimited): sets phaseEndsAt to null
 * - Persists updated GameState to Redis
 * - Emits `game:phase_changed` to the room with the updated PublicGameState
 */
export async function startDiscussionPhase(
  io: Server,
  roomCode: string,
  gameState: GameState,
): Promise<void> {
  // Cancel any existing discussion timer for this room
  cancelDiscussionTimer(roomCode);

  // Load room config to get discussionTimerSeconds
  const room = await getRoom(roomCode);
  const discussionDuration = room?.config.discussionTimerSeconds ?? null;

  // Set phase
  gameState.phase = 'discussion';

  // Set timer
  if (discussionDuration && discussionDuration > 0) {
    gameState.phaseEndsAt = Date.now() + discussionDuration * 1000;
    scheduleDiscussionExpiry(roomCode, discussionDuration * 1000, io);
  } else {
    // Unlimited mode
    gameState.phaseEndsAt = null;
  }

  // Persist to Redis
  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  // Broadcast phase change
  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'discussion', state: publicState });
}

// ─── Timer expiry ─────────────────────────────────────────────────────────────

async function handleDiscussionExpiry(roomCode: string, io: Server): Promise<void> {
  const rawState = await redis.get<string>(`game:${roomCode}`);
  if (!rawState) return;

  const gameState: GameState =
    typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

  // Only transition if still in discussion phase
  if (gameState.phase !== 'discussion') return;

  // Transition to vote phase
  gameState.phase = 'vote';
  gameState.phaseEndsAt = null;

  await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

  const publicState = toPublicGameState(gameState);
  io.to(roomCode).emit('game:phase_changed', { phase: 'vote', state: publicState });
}
