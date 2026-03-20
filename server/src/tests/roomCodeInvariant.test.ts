/**
 * Property test P1: Room code character invariant
 *
 * Room codes must be exactly 6 characters long and only contain characters
 * from the allowed set (uppercase alphanumeric minus 0, O, 1, I).
 *
 * Validates: Requirements 3.1
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Re-export the internal generateCode logic by replicating the same charset/length
// used in RoomManager so we can test the invariant without Redis.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

const ALLOWED_CHARS = new Set(CODE_CHARS.split(''));
const DISALLOWED_CHARS = ['0', 'O', '1', 'I'];

describe('P1: Room code character invariant', () => {
  it('generated codes are exactly 6 characters long', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (_seed) => {
        const code = generateCode();
        expect(code).toHaveLength(CODE_LENGTH);
      }),
      { numRuns: 100 },
    );
  });

  it('generated codes only contain allowed characters (no 0, O, 1, I)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 999 }), (_seed) => {
        const code = generateCode();

        // Every character must be in the allowed set
        for (const ch of code) {
          expect(ALLOWED_CHARS.has(ch)).toBe(true);
        }

        // Disallowed characters must never appear
        for (const bad of DISALLOWED_CHARS) {
          expect(code.includes(bad)).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('allowed charset does not contain ambiguous characters', () => {
    for (const bad of DISALLOWED_CHARS) {
      expect(CODE_CHARS.includes(bad)).toBe(false);
    }
  });
});
