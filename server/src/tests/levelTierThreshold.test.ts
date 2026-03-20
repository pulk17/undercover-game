/**
 * Property test P17: Level tier threshold correctness
 *
 * For any XP total, the computed level must be the unique tier whose XP range
 * contains that total:
 *   Rookie:      0–5 XP
 *   Agent:       6–15 XP
 *   Operative:   16–30 XP
 *   Infiltrator: 31–50 XP
 *   Mastermind:  51–80 XP
 *   Phantom:     81+ XP
 *
 * Validates: Requirements P17
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeLevel } from '../lib/progressionService';
import type { Level } from '@undercover/shared';

/** Reference implementation of tier thresholds */
function expectedLevel(xp: number): Level {
  if (xp >= 81) return 'phantom';
  if (xp >= 51) return 'mastermind';
  if (xp >= 31) return 'infiltrator';
  if (xp >= 16) return 'operative';
  if (xp >= 6) return 'agent';
  return 'rookie';
}

describe('P17: Level tier threshold correctness', () => {
  it('computeLevel returns the unique tier whose XP range contains the total', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 10000 }), (xp) => {
        expect(computeLevel(xp)).toBe(expectedLevel(xp));
      }),
      { numRuns: 100 },
    );
  });

  // Deterministic boundary tests
  it('XP=0 → rookie', () => expect(computeLevel(0)).toBe('rookie'));
  it('XP=5 → rookie', () => expect(computeLevel(5)).toBe('rookie'));
  it('XP=6 → agent', () => expect(computeLevel(6)).toBe('agent'));
  it('XP=15 → agent', () => expect(computeLevel(15)).toBe('agent'));
  it('XP=16 → operative', () => expect(computeLevel(16)).toBe('operative'));
  it('XP=30 → operative', () => expect(computeLevel(30)).toBe('operative'));
  it('XP=31 → infiltrator', () => expect(computeLevel(31)).toBe('infiltrator'));
  it('XP=50 → infiltrator', () => expect(computeLevel(50)).toBe('infiltrator'));
  it('XP=51 → mastermind', () => expect(computeLevel(51)).toBe('mastermind'));
  it('XP=80 → mastermind', () => expect(computeLevel(80)).toBe('mastermind'));
  it('XP=81 → phantom', () => expect(computeLevel(81)).toBe('phantom'));
  it('XP=9999 → phantom', () => expect(computeLevel(9999)).toBe('phantom'));
});
