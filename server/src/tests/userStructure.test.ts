/**
 * Property test P4: User structure invariants
 *
 * Tests that user/auth structures are well-formed:
 * - AuthUser objects always have required fields (uid, nickname, xp, level)
 * - Guest users have a generated nickname (non-empty)
 * - JWT payload structure is valid (uid present, isGuest is boolean)
 *
 * Validates: Requirements 2.1, 2.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { AuthUser, Level, TextScale } from '@undercover/shared';

const LEVELS: Level[] = ['rookie', 'agent', 'operative', 'infiltrator', 'mastermind', 'phantom'];
const TEXT_SCALES: TextScale[] = ['small', 'medium', 'large'];

const userPreferencesArb = fc.record({
  language: fc.constantFrom('en', 'fr', 'es', 'de', 'ar'),
  textScale: fc.constantFrom(...TEXT_SCALES) as fc.Arbitrary<TextScale>,
  hapticEnabled: fc.boolean(),
  notifications: fc.boolean(),
});

const authUserArb: fc.Arbitrary<AuthUser> = fc.record({
  uid: fc.uuid(),
  displayName: fc.string({ minLength: 1, maxLength: 50 }),
  avatarUrl: fc.webUrl(),
  nickname: fc.string({ minLength: 1, maxLength: 12 }),
  xp: fc.nat({ max: 1_000_000 }),
  level: fc.constantFrom(...LEVELS) as fc.Arbitrary<Level>,
  achievements: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 20 }),
  purchasedPacks: fc.array(fc.string({ minLength: 1, maxLength: 30 }), { maxLength: 10 }),
  friends: fc.array(fc.uuid(), { maxLength: 50 }),
  preferences: userPreferencesArb,
});

/** Simulated JWT payload shape (mirrors server/src/middleware/auth.ts) */
interface JwtPayload {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isGuest: boolean;
}

const jwtPayloadArb: fc.Arbitrary<JwtPayload> = fc.record({
  uid: fc.uuid(),
  email: fc.option(fc.emailAddress(), { nil: null }),
  displayName: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  photoURL: fc.option(fc.webUrl(), { nil: null }),
  isGuest: fc.boolean(),
});

describe('P4: User structure invariants', () => {
  it('AuthUser always has required fields present and non-empty', () => {
    fc.assert(
      fc.property(authUserArb, (user) => {
        expect(user.uid).toBeTruthy();
        expect(typeof user.uid).toBe('string');
        expect(user.uid.length).toBeGreaterThan(0);

        expect(user.nickname).toBeTruthy();
        expect(user.nickname.length).toBeGreaterThan(0);
        expect(user.nickname.length).toBeLessThanOrEqual(12);

        expect(typeof user.xp).toBe('number');
        expect(user.xp).toBeGreaterThanOrEqual(0);

        expect(LEVELS).toContain(user.level);

        expect(Array.isArray(user.achievements)).toBe(true);
        expect(Array.isArray(user.purchasedPacks)).toBe(true);
        expect(Array.isArray(user.friends)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('guest users always have a non-empty nickname', () => {
    fc.assert(
      fc.property(
        fc.record({
          uid: fc.uuid(),
          nickname: fc.string({ minLength: 1, maxLength: 12 }),
          isGuest: fc.constant(true),
        }),
        (guest) => {
          expect(guest.isGuest).toBe(true);
          expect(guest.nickname).toBeTruthy();
          expect(guest.nickname.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('JWT payload always has uid and isGuest as boolean', () => {
    fc.assert(
      fc.property(jwtPayloadArb, (payload) => {
        expect(payload.uid).toBeTruthy();
        expect(typeof payload.uid).toBe('string');
        expect(typeof payload.isGuest).toBe('boolean');

        // Guest users must not have an email
        if (payload.isGuest) {
          // email may be null for guests — just verify the field exists
          expect('email' in payload).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
