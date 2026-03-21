import type { PnPPlayer } from '../../../../../shared/types';

/**
 * Gets all alive players in their original order
 */
export function getAlivePlayers(players: PnPPlayer[]): PnPPlayer[] {
  return players.filter(p => p.isAlive);
}

/**
 * Finds the starting player for clue phase based on stored player ID
 * If that player is eliminated, returns the next alive player in order
 */
export function getClueStartingIndex(
  players: PnPPlayer[],
  startingPlayerId: string
): number {
  const alivePlayers = getAlivePlayers(players);
  
  // Find the starting player in alive list
  const startIndex = alivePlayers.findIndex(p => p.id === startingPlayerId);
  
  if (startIndex !== -1) {
    return startIndex;
  }
  
  // Starting player is eliminated - find next alive player after them in original order
  const originalIndex = players.findIndex(p => p.id === startingPlayerId);
  
  for (let i = 1; i < players.length; i++) {
    const checkIndex = (originalIndex + i) % players.length;
    const player = players[checkIndex];
    if (player.isAlive) {
      return alivePlayers.findIndex(p => p.id === player.id);
    }
  }
  
  // Fallback (should never happen if there are alive players)
  return 0;
}

/**
 * Gets the next starting player ID for the next round
 * Advances to the next player in original order
 */
export function getNextStartingPlayerId(
  players: PnPPlayer[],
  currentStartingPlayerId: string
): string {
  const currentIndex = players.findIndex(p => p.id === currentStartingPlayerId);
  const nextIndex = (currentIndex + 1) % players.length;
  return players[nextIndex].id;
}
