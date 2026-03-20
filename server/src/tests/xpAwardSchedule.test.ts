/**
 * Property test P16: XP award schedule correctness
 *
 * For any completed game with a known set of outcomes (win condition, rounds survived,
 * correct votes, daily bonus eligibility), the XP awarded to the player must equal
 * the sum of all applicable schedule entries and must not include any inapplicable entries.
 *
 * XP Schedule:
 *   - play any game: +10 (always, unless guest)
 *   - win as Civilian (role=civilian or detective, winFaction=civilian): +20
 *   - win as Undercover (role=undercover, winFaction=undercover): +40
 *   - win as Mr. White (role=mr_white, winFaction=mr_white): +60
 *   - survive 3+ rounds: +15
 *   - correct votes: +10 per vote
 *   - daily play bonus: +25
 *
 * Validates: Requirements P16
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeXP } from '../lib/progressionService';
import type { XPOutcome } from '../lib/progressionService';

/** Manually compute expected XP from the schedule rules */
function expectedXP(outcome: XPOutcome): number {
  if (outcome.isGuest) return 0;

  let xp = 10; // play any game

  if (outcome.winFaction === 'civilian' && (outcome.role === 'civilian' || outcome.role === 'detective')) {
    xp += 20;
  } else if (outcome.winFaction === 'undercover' && outcome.role === 'undercover') {
    xp += 40;
  } else if (outcome.winFaction === 'mr_white' && outcome.role === 'mr_white') {
    xp += 60;
  }

  if (outcome.roundsSurvived >= 3) xp += 15;
  xp += outcome.correctVotes * 10;
  if (outcome.isDailyBonus) xp += 25;

  return xp;
}

const roleArb = fc.constantFrom<XPOutcome['role']>('civilian', 'undercover', 'mr_white', 'detective');
const winFactionArb = fc.constantFrom<XPOutcome['winFaction']>('civilian', 'undercover', 'mr_white', null);

const xpOutcomeArb = fc.record<XPOutcome>({
  role: roleArb,
  winFaction: winFactionArb,
  roundsSurvived: fc.integer({ min: 0, max: 10 }),
  correctVotes: fc.integer({ min: 0, max: 5 }),
  isDailyBonus: fc.boolean(),
  isGuest: fc.boolean(),
});

describe('P16: XP award schedule correctness', () => {
  it('computeXP matches the sum of all applicable schedule entries for any outcome', () => {
    fc.assert(
      fc.property(xpOutcomeArb, (outcome) => {
        expect(computeXP(outcome)).toBe(expectedXP(outcome));
      }),
      { numRuns: 100 },
    );
  });

  // Deterministic edge cases
  it('guest always gets 0 XP', () => {
    const outcome: XPOutcome = {
      role: 'civilian',
      winFaction: 'civilian',
      roundsSurvived: 5,
      correctVotes: 3,
      isDailyBonus: true,
      isGuest: true,
    };
    expect(computeXP(outcome)).toBe(0);
  });

  it('civilian win with no other bonuses gives exactly 30 XP', () => {
    const outcome: XPOutcome = {
      role: 'civilian',
      winFaction: 'civilian',
      roundsSurvived: 0,
      correctVotes: 0,
      isDailyBonus: false,
      isGuest: false,
    };
    expect(computeXP(outcome)).toBe(30); // 10 (play) + 20 (civilian win)
  });

  it('Mr. White win with daily bonus and 3 correct votes gives exactly 125 XP', () => {
    const outcome: XPOutcome = {
      role: 'mr_white',
      winFaction: 'mr_white',
      roundsSurvived: 0,
      correctVotes: 3,
      isDailyBonus: true,
      isGuest: false,
    };
    expect(computeXP(outcome)).toBe(125); // 10 + 60 + 25 + 30
  });
});
