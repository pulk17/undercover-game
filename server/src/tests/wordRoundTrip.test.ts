/**
 * Property test P19: WordPair round-trip serialization
 *
 * For any valid WordPair, WordParser.parse(WordSerializer.serialize(pair))
 * must deeply equal the original.
 *
 * Validates: Requirements 23.4
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { WordParser } from '../lib/wordParser';
import { WordSerializer } from '../lib/wordSerializer';
import type { WordPair } from '@undercover/shared';

const difficultyArb = fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<'easy' | 'medium' | 'hard'>;
const ageGroupArb = fc.constantFrom('all', 'teen', 'adult') as fc.Arbitrary<'all' | 'teen' | 'adult'>;

const wordPairArb: fc.Arbitrary<WordPair> = fc.record({
  id: fc.uuid(),
  wordA: fc.string({ minLength: 1, maxLength: 50 }),
  wordB: fc.string({ minLength: 1, maxLength: 50 }),
  category: fc.string({ minLength: 1, maxLength: 30 }),
  difficulty: difficultyArb,
  language: fc.string({ minLength: 2, maxLength: 10 }),
  region: fc.string({ minLength: 1, maxLength: 30 }),
  ageGroup: ageGroupArb,
});

describe('P19: WordPair round-trip serialization', () => {
  it('serialize then parse returns deeply equal WordPair', () => {
    fc.assert(
      fc.property(wordPairArb, (pair) => {
        const serialized = WordSerializer.serialize(pair);
        const result = WordParser.parse(serialized);

        expect(result.ok).toBe(true);
        if (result.ok) {
          expect(result.value).toEqual(pair);
        }
      }),
      { numRuns: 100 },
    );
  });
});
