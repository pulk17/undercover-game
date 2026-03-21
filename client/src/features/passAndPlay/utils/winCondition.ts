import type { PnPPlayer, WinnerFaction } from '../../../../../shared/types';

/**
 * Checks win condition after each elimination
 * Priority order matters - checked in sequence
 * 
 * FIXED: Changed to match server logic - undercover wins at parity (>= 50%)
 * FIXED: Added check for zero alive players
 */
export function checkWinCondition(
  players: PnPPlayer[],
  mrWhiteGuessCorrect?: boolean
): WinnerFaction | null {
  // Priority 1: Mr. White guessed correctly
  if (mrWhiteGuessCorrect === true) return 'MR_WHITE';
  
  const alive = players.filter(p => p.isAlive);
  
  // FIXED: Handle edge case of no alive players
  if (alive.length === 0) {
    // Game is over but no winner - shouldn't happen in normal gameplay
    // Default to civilians winning
    return 'CIVILIAN';
  }
  
  const civilianCount = alive.filter(p => p.role === 'CIVILIAN').length;
  const undercoverCount = alive.filter(p => p.role === 'UNDERCOVER').length;
  const mrWhiteAlive = alive.some(p => p.role === 'MR_WHITE');
  
  // Priority 2: No undercoverts or Mr. White left
  if (undercoverCount === 0 && !mrWhiteAlive) return 'CIVILIAN';
  
  // Priority 3: Undercoverts at parity or majority (>= 50% of alive players)
  // FIXED: Match server logic - use alive.length / 2 instead of civilianCount
  if (undercoverCount >= alive.length / 2) return 'UNDERCOVER';
  
  // FIXED: Handle edge case of only Mr. White remaining
  if (mrWhiteAlive && alive.length === 1) {
    // Mr. White is the last player standing - they win
    return 'MR_WHITE';
  }
  
  // Priority 4: Only Mr. White left with civilians (no undercoverts)
  // Game continues — civilians must also eliminate Mr. White
  
  return null; // game continues
}

/**
 * Checks if this is the final confrontation scenario
 * Exactly 3 alive and Mr. White is among them
 */
export function isFinalConfrontation(players: PnPPlayer[]): boolean {
  const alive = players.filter(p => p.isAlive);
  return alive.length === 3 && alive.some(p => p.role === 'MR_WHITE');
}
