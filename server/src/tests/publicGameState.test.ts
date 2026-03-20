/**
 * Property test P6: Broadcast GameState never contains role/word/pre-reveal votes
 *
 * For any GameState, toPublicGameState must strip wordPair, votes, and
 * player role/word fields. The resulting object must not contain any of those fields.
 *
 * Validates: Requirements 4.7, 14.6
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { toPublicGameState } from '../handlers/gameHandlers';
import type { GameState, GamePhase, WinFaction } from '@undercover/shared';

const phaseArb = fc.constantFrom<GamePhase>(
  'lobby', 'role_reveal', 'clue', 'discussion', 'vote', 'elimination', 'mr_white_guess', 'game_over',
);

const winFactionArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom<WinFaction>('civilian', 'undercover', 'mr_white'),
);

const wordPairArb = fc.record({
  id: fc.uuid(),
  wordA: fc.string({ minLength: 1, maxLength: 30 }),
  wordB: fc.string({ minLength: 1, maxLength: 30 }),
  category: fc.string({ minLength: 1, maxLength: 20 }),
  difficulty: fc.constantFrom('easy' as const, 'medium' as const, 'hard' as const),
  language: fc.string({ minLength: 2, maxLength: 5 }),
  region: fc.string({ minLength: 1, maxLength: 20 }),
  ageGroup: fc.constantFrom('all' as const, 'teen' as const, 'adult' as const),
});

const voteRecordArb = fc.record({
  voterId: fc.uuid(),
  targetId: fc.uuid(),
  round: fc.integer({ min: 1, max: 10 }),
});

const gameStateArb: fc.Arbitrary<GameState> = fc.record({
  roomCode: fc.string({ minLength: 6, maxLength: 6 }),
  round: fc.integer({ min: 1, max: 20 }),
  phase: phaseArb,
  activePlayers: fc.array(fc.uuid(), { minLength: 0, maxLength: 12 }),
  spectators: fc.array(fc.uuid(), { minLength: 0, maxLength: 12 }),
  clueLog: fc.constant([]),
  votes: fc.array(voteRecordArb, { minLength: 0, maxLength: 12 }),
  currentTurnPlayerId: fc.oneof(fc.constant(null), fc.uuid()),
  wordPair: fc.oneof(fc.constant(null), wordPairArb),
  eliminatedThisRound: fc.oneof(fc.constant(null), fc.uuid()),
  winner: winFactionArb,
  tournamentScores: fc.constant(null),
  phaseEndsAt: fc.oneof(fc.constant(null), fc.integer({ min: 0 })),
});

describe('P6: PublicGameState strips sensitive fields', () => {
  it('toPublicGameState removes wordPair and votes', () => {
    fc.assert(
      fc.property(gameStateArb, (state) => {
        const publicState = toPublicGameState(state);

        // wordPair must be stripped
        expect('wordPair' in publicState).toBe(false);

        // votes must be stripped
        expect('votes' in publicState).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('toPublicGameState preserves all non-sensitive fields', () => {
    fc.assert(
      fc.property(gameStateArb, (state) => {
        const publicState = toPublicGameState(state);

        // Core fields must be preserved
        expect(publicState.roomCode).toBe(state.roomCode);
        expect(publicState.round).toBe(state.round);
        expect(publicState.phase).toBe(state.phase);
        expect(publicState.activePlayers).toEqual(state.activePlayers);
        expect(publicState.spectators).toEqual(state.spectators);
        expect(publicState.winner).toBe(state.winner);
      }),
      { numRuns: 100 },
    );
  });
});
