/**
 * Property test P18: API validation rejects invalid bodies
 *
 * Zod schemas used in API routes must reject invalid/malformed bodies.
 * Covers: auth guest (no body schema), auth google body schema,
 * profile update body schema, and custom word pair schema.
 *
 * Validates: Requirements 2.1, 2.2, 2.8
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// ── Schemas mirrored from routes ──────────────────────────────────────────────

// auth.ts: POST /api/v1/auth/google
const googleBodySchema = z.object({
  idToken: z.string().min(1),
});

// profile.ts: PATCH /api/v1/profile/me
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(12).optional(),
  preferences: z
    .object({
      language: z.string().optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

// profile.ts: POST /api/v1/profile/me/words
const customWordSchema = z.object({
  wordA: z.string().min(1).max(100),
  wordB: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.string().min(2).max(10).default('en'),
  region: z.string().min(1).max(50).default('global'),
  ageGroup: z.enum(['all', 'teen', 'adult']).default('all'),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Arbitrary that generates random non-string values */
const nonStringArb = fc.oneof(
  fc.integer(),
  fc.boolean(),
  fc.constant(null),
  fc.constant(undefined),
  fc.float(),
);

/** Arbitrary that generates random objects with arbitrary keys/values */
const randomObjectArb = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 10 }),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('P18: API validation rejects invalid bodies', () => {
  describe('auth google body schema', () => {
    it('rejects bodies missing idToken', () => {
      fc.assert(
        fc.property(randomObjectArb, (body) => {
          // Remove idToken to ensure it's missing
          const { idToken: _removed, ...bodyWithout } = body as Record<string, unknown>;
          const result = googleBodySchema.safeParse(bodyWithout);
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects bodies where idToken is not a string', () => {
      fc.assert(
        fc.property(nonStringArb, (badValue) => {
          const result = googleBodySchema.safeParse({ idToken: badValue });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty idToken string', () => {
      const result = googleBodySchema.safeParse({ idToken: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('profile update body schema', () => {
    it('rejects displayName longer than 12 characters', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 13, maxLength: 200 }), (longName) => {
          const result = updateProfileSchema.safeParse({ displayName: longName });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('rejects empty displayName', () => {
      const result = updateProfileSchema.safeParse({ displayName: '' });
      expect(result.success).toBe(false);
    });

    it('rejects displayName that is not a string', () => {
      fc.assert(
        fc.property(nonStringArb, (badValue) => {
          if (badValue === undefined) return; // undefined means field is absent (valid)
          const result = updateProfileSchema.safeParse({ displayName: badValue });
          expect(result.success).toBe(false);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('custom word pair schema', () => {
    it('rejects invalid difficulty values', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !['easy', 'medium', 'hard'].includes(s)),
          (badDifficulty) => {
            const result = customWordSchema.safeParse({
              wordA: 'Apple',
              wordB: 'Pear',
              category: 'food',
              difficulty: badDifficulty,
            });
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('rejects bodies missing required fields', () => {
      // Missing wordA
      expect(customWordSchema.safeParse({ wordB: 'Pear', category: 'food', difficulty: 'easy' }).success).toBe(false);
      // Missing wordB
      expect(customWordSchema.safeParse({ wordA: 'Apple', category: 'food', difficulty: 'easy' }).success).toBe(false);
      // Missing category
      expect(customWordSchema.safeParse({ wordA: 'Apple', wordB: 'Pear', difficulty: 'easy' }).success).toBe(false);
      // Missing difficulty
      expect(customWordSchema.safeParse({ wordA: 'Apple', wordB: 'Pear', category: 'food' }).success).toBe(false);
    });

    it('rejects empty required string fields', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('wordA', 'wordB', 'category'),
          (emptyField) => {
            const body: Record<string, unknown> = {
              wordA: 'Apple',
              wordB: 'Pear',
              category: 'food',
              difficulty: 'easy',
            };
            body[emptyField] = '';
            const result = customWordSchema.safeParse(body);
            expect(result.success).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
