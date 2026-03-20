import type { Role, WinFaction } from '@undercover/shared';

/**
 * Returns the roles of all currently active players.
 */
export function getActiveRoles(
  activePlayers: string[],
  playerRoles: Record<string, Role>,
): Role[] {
  return activePlayers.map((id) => playerRoles[id]).filter((role): role is Role => role !== undefined);
}

/**
 * Pure function — no side effects, no I/O.
 *
 * Evaluates win conditions in priority order:
 *  1. Undercover wins  — undercoverCount >= activePlayers.length / 2
 *  2. Mr. White wins   — Mr. White is active and only 1 or 3 players remain
 *  3. Civilians win    — no active undercover or mr_white players remain
 *  4. null             — game continues
 */
export function evaluateWinCondition(
  activePlayers: string[],
  playerRoles: Record<string, Role>,
): WinFaction | null {
  const roles = getActiveRoles(activePlayers, playerRoles);

  const undercoverCount = roles.filter((r) => r === 'undercover').length;
  const mrWhiteCount = roles.filter((r) => r === 'mr_white').length;
  const civilianCount = roles.filter((r) => r === 'civilian' || r === 'detective').length;

  // 1. Undercover wins when they reach parity with or outnumber everyone else
  if (undercoverCount >= activePlayers.length / 2) {
    return 'undercover';
  }

  // 2. Mr. White wins when they are the last player standing,
  //    or when exactly 3 players remain and Mr. White is among them
  if (mrWhiteCount > 0 && (activePlayers.length === 1 || activePlayers.length === 3)) {
    return 'mr_white';
  }

  // 3. Civilians win when all threats have been eliminated
  if (undercoverCount === 0 && mrWhiteCount === 0 && civilianCount > 0) {
    return 'civilian';
  }

  return null;
}
