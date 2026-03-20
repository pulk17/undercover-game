/**
 * Property test P3: Nickname length validation
 *
 * The profile update schema must accept nicknames of 1–12 characters and
 * reject empty strings and strings longer than 12 characters.
 *
 * Validates: Requirements 2.8
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { z } from 'zod';

// Mirror the schema from server/src/routes/profile.ts
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(12).optional(),
  preferences: z
    .object({
      language: z.string().optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

describe('P3: Nickname length validation', () => {
  it('accepts nicknames of 1–12 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 12 }),
        (nickname) => {
          const result = updateProfileSchema.safeParse({ displayName: nickname });
          expect(result.success).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('rejects empty string nicknames', () => {
    const result = updateProfileSchema.safeParse({ displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects nicknames longer than 12 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 13, maxLength: 100 }),
        (nickname) => {
          const result = updateProfileSchema.safeParse({ displayName: nickname });
          expect(result.success).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
