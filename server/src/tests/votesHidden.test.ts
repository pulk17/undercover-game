/**
 * Property test P11: Votes hidden until reveal condition
 *
 * For any GameState with any votes array, toPublicGameState must never
 * expose the `votes` field to clients — regardless of phase or vote contents.
 *
 * Validates: Requirements 4.7
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

const voteRecordArb = fc.record({
  voterId: fc.string(),
  targetId: fc.string(),
  round: fc.integer({ min: 1, max: 10 }),
});

const gameStateArb: fc.Arbitrary<GameState> = fc.record({
  roomCode: fc.string({ minLength: 6, maxLength: 6 }),
  round: fc.integer({ min: 1, max: 20 }),
  phase: phaseArb,
  activePlayers: fc.array(fc.uuid(), { minLength: 0, maxLength: 12 }),
  spectators: fc.array(fc.uuid(), { minLength: 0, maxLength: 12 }),
  clueLog: fc.constant([]),
  votes: fc.array(voteRecordArb),
  currentTurnPlayerId: fc.oneof(fc.constant(null), fc.uuid()),
  wordPair: fc.constant(null),
  eliminatedThisRound: fc.oneof(fc.constant(null), fc.uuid()),
  winner: winFactionArb,
  tournamentScores: fc.constant(null),
  phaseEndsAt: fc.oneof(fc.constant(null), fc.integer({ min: 0 })),
});

describe('P11: Votes hidden until reveal condition', () => {
  it('toPublicGameState never exposes the votes field', () => {
    fc.assert(
      fc.property(gameStateArb, (state) => {
        const publicState = toPublicGameState(state);
        expect(publicState).not.toHaveProperty('votes');
      }),
      { numRuns: 100 },
    );
  });
});
