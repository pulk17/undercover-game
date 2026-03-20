/**
 * Property test P15: Mr. White passive win condition
 *
 * Mr. White wins passively only when they are the last active player.
 * Final-3 states continue into the dedicated guess flow instead.
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateWinCondition } from '../lib/gameEngine';
import type { Role } from '@undercover/shared';

/**
 * Generates exactly `count` unique UUIDs.
 */
const uniqueIds = (count: number): fc.Arbitrary<string[]> =>
  fc
    .array(fc.uuid(), { minLength: count, maxLength: count + 20 })
    .map((ids) => [...new Set(ids)].slice(0, count))
    .filter((ids) => ids.length === count);

describe('P15: Mr. White win condition', () => {
  it('does not return "mr_white" when Mr. White is active and exactly 3 players remain', () => {
    fc.assert(
      fc.property(
        uniqueIds(3),
        (ids) => {
          const playerRoles: Record<string, Role> = {
            [ids[0]]: 'mr_white',
            [ids[1]]: 'civilian',
            [ids[2]]: 'civilian',
          };

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns "mr_white" when Mr. White is the last player standing (1 active player)', () => {
    fc.assert(
      fc.property(
        uniqueIds(1),
        (ids) => {
          const playerRoles: Record<string, Role> = {
            [ids[0]]: 'mr_white',
          };

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).toBe('mr_white');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not return "mr_white" when Mr. White is active but player count is not 1', () => {
    // Use player counts that are NOT 1 and where undercover doesn't win
    fc.assert(
      fc.property(
        // Pick a count from {2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}
        fc.constantFrom(2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12).chain((total) =>
          uniqueIds(total).map((ids) => ({ ids, total })),
        ),
        ({ ids, total }) => {
          // 1 Mr. White, rest civilians — undercover count = 0 (no undercover win)
          const playerRoles: Record<string, Role> = {};
          playerRoles[ids[0]] = 'mr_white';
          for (let i = 1; i < total; i++) {
            playerRoles[ids[i]] = 'civilian';
          }

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).not.toBe('mr_white');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('does not return "mr_white" when no Mr. White is active', () => {
    fc.assert(
      fc.property(
        // 3 players, all civilians — no Mr. White
        uniqueIds(3),
        (ids) => {
          const playerRoles: Record<string, Role> = {
            [ids[0]]: 'civilian',
            [ids[1]]: 'civilian',
            [ids[2]]: 'civilian',
          };

          const result = evaluateWinCondition(ids, playerRoles);
          expect(result).not.toBe('mr_white');
        },
      ),
      { numRuns: 100 },
    );
  });
});
