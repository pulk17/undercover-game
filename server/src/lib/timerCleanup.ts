import { cancelTurnTimer } from './clueManager';
import { cancelDiscussionTimer } from './discussionManager';
import { cancelVoteTimer } from './voteManager';
import { cancelMrWhiteGuessTimer, cancelSelfRevealTimer } from '../handlers/gameHandlers';
import { cancelHostGraceTimer } from './reconnectionManager';
import { logger } from './logger';

/**
 * Cancel all active timers for a room.
 * Call this when:
 * - Room is deleted
 * - Game ends
 * - Server shuts down
 */
export function cancelAllTimersForRoom(roomCode: string): void {
  try {
    cancelTurnTimer(roomCode);
    cancelDiscussionTimer(roomCode);
    cancelVoteTimer(roomCode);
    cancelMrWhiteGuessTimer(roomCode);
    cancelSelfRevealTimer(roomCode);
    cancelHostGraceTimer(roomCode);
    
    logger.debug('Cancelled all timers for room', { roomCode });
  } catch (err) {
    logger.error('Error cancelling timers for room', err, { roomCode });
  }
}

/**
 * Global timer registry for graceful shutdown
 */
const activeRooms = new Set<string>();

export function registerActiveRoom(roomCode: string): void {
  activeRooms.add(roomCode);
}

export function unregisterActiveRoom(roomCode: string): void {
  activeRooms.delete(roomCode);
  cancelAllTimersForRoom(roomCode);
}

/**
 * Cancel all timers for all rooms (graceful shutdown)
 */
export function cancelAllTimers(): void {
  logger.info('Cancelling all timers for graceful shutdown', { roomCount: activeRooms.size });
  
  for (const roomCode of activeRooms) {
    cancelAllTimersForRoom(roomCode);
  }
  
  activeRooms.clear();
}

/**
 * Setup graceful shutdown handlers
 */
export function setupGracefulShutdown(): void {
  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    cancelAllTimers();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
