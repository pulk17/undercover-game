/**
 * Property test P9: WordPair structural completeness
 *
 * For any WordPair loaded from the DB (mocked), all required fields
 * (id, wordA, wordB, category, difficulty, language, region, ageGroup)
 * must be present and non-null.
 *
 * Validates: Requirements 5.6, 23.1
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WordParser } from '../lib/wordParser';

const difficultyArb = fc.constantFrom('easy', 'medium', 'hard');
const ageGroupArb = fc.constantFrom('all', 'teen', 'adult');

/** Arbitrary that generates valid raw DB rows */
const validRawRowArb = fc.record({
  id: fc.uuid(),
  word_a: fc.string({ minLength: 1, maxLength: 50 }),
  word_b: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.string({ minLength: 1, maxLength: 30 }),
  difficulty: difficultyArb,
  language: fc.string({ minLength: 2, maxLength: 10 }),
  region: fc.string({ minLength: 1, maxLength: 30 }),
  age_group: ageGroupArb,
});

const REQUIRED_FIELDS = ['id', 'wordA', 'wordB', 'category', 'difficulty', 'language', 'region', 'ageGroup'] as const;

describe('P9: WordPair structural completeness', () => {
  it('all required fields are present and non-null for any valid DB row', () => {
    fc.assert(
      fc.property(validRawRowArb, (rawRow) => {
        const result = WordParser.parse(rawRow);

        expect(result.ok).toBe(true);
        if (!result.ok) return;

        const pair = result.value;

        for (const field of REQUIRED_FIELDS) {
          expect(pair[field]).toBeDefined();
          expect(pair[field]).not.toBeNull();
          expect(pair[field]).not.toBe('');
        }
      }),
      { numRuns: 100 },
    );
  });
});
