/**
 * Property test P5: Role distribution correctness
 *
 * For any N ∈ {3,4,5,6,7,8,9,10,12} and classic mode, role counts must
 * exactly match the distribution table, and every player gets exactly one role.
 *
 * Validates: Requirements 4.1, 4.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { RoleDistributor } from '../lib/roleDistributor';
import type { WordPair } from '@undercover/shared';

const VALID_COUNTS = [3, 4, 5, 6, 7, 8, 9, 10, 12] as const;

/** Standard distribution table */
const DISTRIBUTION: Record<number, [number, number, number]> = {
  3:  [2, 1, 0],
  4:  [3, 1, 0],
  5:  [3, 1, 1],
  6:  [4, 1, 1],
  7:  [5, 1, 1],
  8:  [5, 2, 1],
  9:  [6, 2, 1],
  10: [7, 2, 1],
  12: [8, 3, 1],
};

const mockWordPair: WordPair = {
  id: 'test-id',
  wordA: 'Apple',
  wordB: 'Pear',
  category: 'food',
  difficulty: 'easy',
  language: 'en',
  region: 'global',
  ageGroup: 'all',
};

describe('P5: Role distribution correctness', () => {
  it('role counts match distribution table for all valid player counts (classic mode)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_COUNTS),
        (n) => {
          const playerIds = Array.from({ length: n }, (_, i) => `player-${i}`);
          const assignments = RoleDistributor.distribute(playerIds, 'classic', false, mockWordPair);

          // Every player gets exactly one role
          expect(assignments).toHaveLength(n);
          const assignedIds = assignments.map((a) => a.playerId);
          expect(new Set(assignedIds).size).toBe(n);

          // Count roles
          const civilians = assignments.filter((a) => a.role === 'civilian').length;
          const undercovers = assignments.filter((a) => a.role === 'undercover').length;
          const mrWhites = assignments.filter((a) => a.role === 'mr_white').length;

          const [expectedC, expectedU, expectedMW] = DISTRIBUTION[n];
          expect(civilians).toBe(expectedC);
          expect(undercovers).toBe(expectedU);
          expect(mrWhites).toBe(expectedMW);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('every player ID appears exactly once in assignments', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...VALID_COUNTS),
        (n) => {
          const playerIds = Array.from({ length: n }, (_, i) => `player-${i}`);
          const assignments = RoleDistributor.distribute(playerIds, 'classic', false, mockWordPair);

          const assignedIds = new Set(assignments.map((a) => a.playerId));
          expect(assignedIds.size).toBe(n);
          for (const id of playerIds) {
            expect(assignedIds.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
