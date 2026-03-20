/**
 * Property test P13: Civilian win condition
 *
 * For any game state where all active players have roles of 'civilian' or 'detective',
 * evaluateWinCondition must return 'civilian'.
 *
 * Conversely, if at least one 'undercover' or 'mr_white' is active,
 * the result must NOT be 'civilian'.
 *
 * Validates: Requirements P13
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateWinCondition } from '../lib/gameEngine';
import type { Role } from '@undercover/shared';

// Generates a list of unique player IDs of a given length
const playerIdsArb = (min: number, max: number) =>
  fc
    .array(fc.uuid(), { minLength: min, maxLength: max })
    .filter((ids) => new Set(ids).size === ids.length);

describe('P13: Civilian win condition', () => {
  it('returns "civilian" when all active players are civilian or detective', () => {
    fc.assert(
      fc.property(
        // Generate 1–12 unique player IDs
        playerIdsArb(1, 12),
        (playerIds) => {
          // Assign each player a role of 'civilian' or 'detective'
          const playerRoles: Record<string, Role> = {};
          for (const id of playerIds) {
            playerRoles[id] = fc.sample(
              fc.constantFrom<Role>('civilian', 'detective'),
              1,
            )[0];
          }

          const result = evaluateWinCondition(playerIds, playerRoles);
          expect(result).toBe('civilian');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not return "civilian" when at least one undercover or mr_white is active', () => {
    fc.assert(
      fc.property(
        // Generate 1–12 unique player IDs
        playerIdsArb(1, 12),
        // Pick at least one index to be a threat role
        fc.constantFrom<Role>('undercover', 'mr_white'),
        (playerIds, threatRole) => {
          const playerRoles: Record<string, Role> = {};

          // Assign the first player the threat role
          playerRoles[playerIds[0]] = threatRole;

          // Assign remaining players civilian or detective
          for (let i = 1; i < playerIds.length; i++) {
            playerRoles[playerIds[i]] = fc.sample(
              fc.constantFrom<Role>('civilian', 'detective'),
              1,
            )[0];
          }

          const result = evaluateWinCondition(playerIds, playerRoles);
          expect(result).not.toBe('civilian');
        },
      ),
      { numRuns: 100 },
    );
  });
});
