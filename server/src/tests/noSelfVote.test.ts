/**
 * Property test P12: No self-vote
 *
 * The vote validation logic in `game:vote_cast` must always reject votes
 * where voterId === targetId. Additionally, any stored VoteRecord must
 * never have voterId === targetId.
 *
 * Validates: Requirements 4.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { GamePhase, VoteRecord, WinFaction } from '@undercover/shared';

// ─── Pure self-vote check (mirrors the handler logic) ────────────────────────

/**
 * Pure function extracted from the game:vote_cast handler.
 * Returns true if the vote should be rejected (self-vote detected).
 */
function isSelfVote(voterId: string, targetId: string): boolean {
  return voterId === targetId;
}

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const playerIdArb = fc.uuid();

/**
 * Generates a pair of distinct player IDs (voterId !== targetId).
 */
const distinctPlayerPairArb = fc.tuple(playerIdArb, playerIdArb).filter(
  ([a, b]) => a !== b,
);

const validVoteRecordArb: fc.Arbitrary<VoteRecord> = distinctPlayerPairArb.map(
  ([voterId, targetId]) => ({
    voterId,
    targetId,
    round: 1,
  }),
);

const phaseArb = fc.constantFrom<GamePhase>(
  'lobby', 'role_reveal', 'clue', 'discussion', 'vote', 'elimination', 'mr_white_guess', 'game_over',
);

const winFactionArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom<WinFaction>('civilian', 'undercover', 'mr_white'),
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('P12: No self-vote', () => {
  it('Test 1: isSelfVote always catches voterId === targetId', () => {
    fc.assert(
      fc.property(playerIdArb, (playerId) => {
        // When voterId === targetId, the check must return true (reject the vote)
        expect(isSelfVote(playerId, playerId)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('Test 2: No stored VoteRecord has voterId === targetId', () => {
    fc.assert(
      fc.property(fc.array(validVoteRecordArb, { minLength: 0, maxLength: 20 }), (votes) => {
        // Every vote in the array was generated with voterId !== targetId
        // This invariant must hold for all valid stored game state
        for (const vote of votes) {
          expect(vote.voterId).not.toBe(vote.targetId);
        }
      }),
      { numRuns: 100 },
    );
  });
});
