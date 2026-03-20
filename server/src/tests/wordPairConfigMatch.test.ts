/**
 * Property test P7: Word pair config match
 *
 * Tests that word pairs returned by the selector match the requested config:
 * - If category X is requested, returned pair has category X
 * - If difficulty Y is requested, returned pair has difficulty Y
 * - If language Z is requested, returned pair has language Z
 *
 * Tests the pure filtering/matching logic from WordParser.
 *
 * Validates: Requirements 4.3
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WordParser } from '../lib/wordParser';
import type { WordPair, Difficulty } from '@undercover/shared';

type AgeGroup = 'all' | 'teen' | 'adult';

const difficultyArb = fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<Difficulty>;
const ageGroupArb = fc.constantFrom('all', 'teen', 'adult') as fc.Arbitrary<AgeGroup>;

/** Arbitrary for a valid raw DB row with explicit category/difficulty/language */
function rawRowWithConfigArb(
  category: string,
  difficulty: Difficulty,
  language: string,
): fc.Arbitrary<Record<string, unknown>> {
  return fc.record({
    id: fc.uuid(),
    word_a: fc.string({ minLength: 1, maxLength: 50 }),
    word_b: fc.string({ minLength: 1, maxLength: 50 }),
    category: fc.constant(category),
    difficulty: fc.constant(difficulty),
    language: fc.constant(language),
    region: fc.string({ minLength: 1, maxLength: 30 }),
    age_group: ageGroupArb,
  });
}

/** Pure filter: given a pool of parsed pairs, return those matching config */
function filterByConfig(
  pairs: WordPair[],
  category: string,
  difficulty: Difficulty,
  language: string,
): WordPair[] {
  return pairs.filter(
    (p) => p.category === category && p.difficulty === difficulty && p.language === language,
  );
}

describe('P7: Word pair config match', () => {
  it('parsed pair has the same category as the raw DB row', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        difficultyArb,
        fc.string({ minLength: 2, maxLength: 10 }),
        (category, difficulty, language) => {
          const rawArb = rawRowWithConfigArb(category, difficulty, language);
          fc.assert(
            fc.property(rawArb, (raw) => {
              const result = WordParser.parse(raw);
              expect(result.ok).toBe(true);
              if (!result.ok) return;
              expect(result.value.category).toBe(category);
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it('parsed pair has the same difficulty as the raw DB row', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        difficultyArb,
        fc.string({ minLength: 2, maxLength: 10 }),
        (category, difficulty, language) => {
          const rawArb = rawRowWithConfigArb(category, difficulty, language);
          fc.assert(
            fc.property(rawArb, (raw) => {
              const result = WordParser.parse(raw);
              expect(result.ok).toBe(true);
              if (!result.ok) return;
              expect(result.value.difficulty).toBe(difficulty);
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it('parsed pair has the same language as the raw DB row', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        difficultyArb,
        fc.string({ minLength: 2, maxLength: 10 }),
        (category, difficulty, language) => {
          const rawArb = rawRowWithConfigArb(category, difficulty, language);
          fc.assert(
            fc.property(rawArb, (raw) => {
              const result = WordParser.parse(raw);
              expect(result.ok).toBe(true);
              if (!result.ok) return;
              expect(result.value.language).toBe(language);
            }),
            { numRuns: 10 },
          );
        },
      ),
      { numRuns: 20 },
    );
  });

  it('filterByConfig returns only pairs matching all three criteria', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }),
        difficultyArb,
        fc.string({ minLength: 2, maxLength: 10 }),
        fc.array(
          fc.record({
            id: fc.uuid(),
            wordA: fc.string({ minLength: 1, maxLength: 50 }),
            wordB: fc.string({ minLength: 1, maxLength: 50 }),
            category: fc.string({ minLength: 1, maxLength: 20 }),
            difficulty: difficultyArb,
            language: fc.string({ minLength: 2, maxLength: 10 }),
            region: fc.string({ minLength: 1, maxLength: 30 }),
            ageGroup: ageGroupArb,
          }),
          { minLength: 0, maxLength: 20 },
        ),
        (category, difficulty, language, pairs) => {
          const filtered = filterByConfig(pairs, category, difficulty, language);

          for (const pair of filtered) {
            expect(pair.category).toBe(category);
            expect(pair.difficulty).toBe(difficulty);
            expect(pair.language).toBe(language);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
