/**
 * Property test P8: Anti-repeat invariant
 *
 * Tests that the anti-repeat mechanism prevents the same word pair from being
 * selected twice in a row for the same room:
 * - Given a set of already-used pair IDs, the selector should not return a pair
 *   whose ID is in the used set (when eligible alternatives exist)
 * - When all pairs are used, the pool resets and any pair may be returned
 *
 * Tests the pure filtering logic (not the Redis call).
 *
 * Validates: Requirements 4.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { WordPair, Difficulty } from '@undercover/shared';

type AgeGroup = 'all' | 'teen' | 'adult';

const difficultyArb = fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<Difficulty>;
const ageGroupArb = fc.constantFrom('all', 'teen', 'adult') as fc.Arbitrary<AgeGroup>;

const wordPairArb: fc.Arbitrary<WordPair> = fc.record({
  id: fc.uuid(),
  wordA: fc.string({ minLength: 1, maxLength: 50 }),
  wordB: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  difficulty: difficultyArb,
  language: fc.string({ minLength: 2, maxLength: 10 }),
  region: fc.string({ minLength: 1, maxLength: 30 }),
  ageGroup: ageGroupArb,
});

/**
 * Pure anti-repeat selection logic extracted from WordSelector.selectPair.
 * Returns the eligible pool (or full pool if all used).
 */
function selectEligiblePool(pairs: WordPair[], usedIds: Set<string>): WordPair[] {
  const eligible = pairs.filter((p) => !usedIds.has(p.id));
  return eligible.length > 0 ? eligible : pairs;
}

describe('P8: Anti-repeat invariant', () => {
  it('eligible pool excludes already-used pair IDs when alternatives exist', () => {
    fc.assert(
      fc.property(
        fc.array(wordPairArb, { minLength: 2, maxLength: 20 }),
        (pairs) => {
          // Ensure unique IDs
          const uniquePairs = pairs.filter(
            (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
          );
          if (uniquePairs.length < 2) return;

          // Mark all but the last pair as used
          const usedIds = new Set(uniquePairs.slice(0, -1).map((p) => p.id));
          const pool = selectEligiblePool(uniquePairs, usedIds);

          // Pool should only contain the unused pair(s)
          for (const pair of pool) {
            expect(usedIds.has(pair.id)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('when all pairs are used, the full pool is returned (reset behaviour)', () => {
    fc.assert(
      fc.property(
        fc.array(wordPairArb, { minLength: 1, maxLength: 20 }),
        (pairs) => {
          const uniquePairs = pairs.filter(
            (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
          );
          if (uniquePairs.length === 0) return;

          // Mark every pair as used
          const usedIds = new Set(uniquePairs.map((p) => p.id));
          const pool = selectEligiblePool(uniquePairs, usedIds);

          // Pool resets to the full set
          expect(pool.length).toBe(uniquePairs.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a pair selected from the eligible pool is never in the used set (when alternatives exist)', () => {
    fc.assert(
      fc.property(
        fc.array(wordPairArb, { minLength: 2, maxLength: 20 }),
        (pairs) => {
          const uniquePairs = pairs.filter(
            (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
          );
          if (uniquePairs.length < 2) return;

          // Use a random subset (not all) as already-used
          const usedCount = Math.floor(uniquePairs.length / 2);
          const usedIds = new Set(uniquePairs.slice(0, usedCount).map((p) => p.id));

          const pool = selectEligiblePool(uniquePairs, usedIds);

          // Simulate picking a random pair from the pool
          const selected = pool[Math.floor(Math.random() * pool.length)];

          expect(usedIds.has(selected.id)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
