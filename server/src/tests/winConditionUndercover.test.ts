/**
 * Property test P14: Undercover win condition
 *
 * For any game state where undercoverCount >= activePlayers.length / 2,
 * evaluateWinCondition must return 'undercover'.
 *
 * Conversely, when undercoverCount < activePlayers.length / 2,
 * the result must NOT be 'undercover'.
 *
 * Validates: Requirements P14
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateWinCondition } from '../lib/gameEngine';
import type { Role } from '@undercover/shared';

/**
 * Generates an array of `count` unique UUIDs.
 */
const uniqueIds = (count: number): fc.Arbitrary<string[]> =>
  fc
    .array(fc.uuid(), { minLength: count, maxLength: count + 20 })
    .map((ids) => [...new Set(ids)].slice(0, count))
    .filter((ids) => ids.length === count);

describe('P14: Undercover win condition', () => {
  it('returns "undercover" when undercoverCount >= activePlayers.length / 2', () => {
    fc.assert(
      fc.property(
        // Total active players: 2–12
        fc.integer({ min: 2, max: 12 }).chain((total) =>
          // undercoverCount must be >= total / 2 (at least 1)
          fc.integer({ min: Math.ceil(total / 2), max: total }).chain((undercoverCount) =>
            uniqueIds(total).map((ids) => ({ ids, undercoverCount })),
          ),
        ),
        ({ ids, undercoverCount }) => {
          const playerRoles: Record<string, Role> = {};
          for (let i = 0; i < ids.length; i++) {
            playerRoles[ids[i]] = i < undercoverCount ? 'undercover' : 'civilian';
          }

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).toBe('undercover');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not return "undercover" when undercoverCount < activePlayers.length / 2', () => {
    fc.assert(
      fc.property(
        // Total active players: 3–12 (need at least 3 so undercover minority is possible)
        fc.integer({ min: 3, max: 12 }).chain((total) => {
          // undercoverCount strictly less than total / 2
          const maxUndercover = Math.ceil(total / 2) - 1;
          return fc
            .integer({ min: 0, max: maxUndercover })
            .chain((undercoverCount) =>
              uniqueIds(total).map((ids) => ({ ids, undercoverCount, total })),
            );
        }),
        ({ ids, undercoverCount }) => {
          const playerRoles: Record<string, Role> = {};
          for (let i = 0; i < ids.length; i++) {
            playerRoles[ids[i]] = i < undercoverCount ? 'undercover' : 'civilian';
          }

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).not.toBe('undercover');
        },
      ),
      { numRuns: 100 },
    );
  });
});
