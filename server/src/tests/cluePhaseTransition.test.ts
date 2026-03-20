/**
 * Property test P10: All Clues Submitted Triggers Phase Transition
 *
 * For any set of N active players (3–12), once every player has a ClueEntry
 * in the log for the current round, `allCluesSubmitted(gameState)` returns true.
 *
 * Validates: Requirements 7.8
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { allCluesSubmitted } from '../lib/clueManager';
import type { GameState, ClueEntry, GamePhase, WinFaction } from '@undercover/shared';

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const phaseArb = fc.constantFrom<GamePhase>(
  'lobby', 'role_reveal', 'clue', 'discussion', 'vote', 'elimination', 'mr_white_guess', 'game_over',
);

const winFactionArb = fc.oneof(
  fc.constant(null),
  fc.constantFrom<WinFaction>('civilian', 'undercover', 'mr_white'),
);

/** Generate N unique player IDs */
function playerIdsArb(n: number): fc.Arbitrary<string[]> {
  return fc.uniqueArray(fc.uuid(), { minLength: n, maxLength: n });
}

/** Build a GameState with all active players having submitted a clue for the given round */
function buildGameStateAllSubmitted(
  playerIds: string[],
  round: number,
  extraEntries: ClueEntry[] = [],
): GameState {
  const clueLog: ClueEntry[] = [
    ...playerIds.map((playerId, i) => ({
      playerId,
      nickname: `Player${i}`,
      clue: Math.random() > 0.2 ? `clue-${i}` : null, // allow null (skipped)
      round,
      timestamp: Date.now() + i,
    })),
    ...extraEntries,
  ];

  return {
    roomCode: 'ABCDEF',
    round,
    phase: 'clue',
    activePlayers: playerIds,
    spectators: [],
    clueLog,
    votes: [],
    currentTurnPlayerId: null,
    wordPair: null,
    eliminatedThisRound: null,
    winner: null,
    tournamentScores: null,
    phaseEndsAt: null,
  };
}

/** Build a GameState where at least one active player is missing a clue for the round */
function buildGameStateMissingClue(
  playerIds: string[],
  round: number,
): GameState {
  // All players except the last have submitted
  const submitters = playerIds.slice(0, playerIds.length - 1);
  const clueLog: ClueEntry[] = submitters.map((playerId, i) => ({
    playerId,
    nickname: `Player${i}`,
    clue: `clue-${i}`,
    round,
    timestamp: Date.now() + i,
  }));

  return {
    roomCode: 'ABCDEF',
    round,
    phase: 'clue',
    activePlayers: playerIds,
    spectators: [],
    clueLog,
    votes: [],
    currentTurnPlayerId: playerIds[playerIds.length - 1],
    wordPair: null,
    eliminatedThisRound: null,
    winner: null,
    tournamentScores: null,
    phaseEndsAt: null,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('P10: allCluesSubmitted', () => {
  it('returns true when every active player has a ClueEntry for the current round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }).chain((n) =>
          fc.tuple(playerIdsArb(n), fc.integer({ min: 1, max: 10 })),
        ),
        ([playerIds, round]) => {
          const gameState = buildGameStateAllSubmitted(playerIds, round);
          expect(allCluesSubmitted(gameState)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when at least one active player has not submitted a clue for the current round', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }).chain((n) =>
          fc.tuple(playerIdsArb(n), fc.integer({ min: 1, max: 10 })),
        ),
        ([playerIds, round]) => {
          // Need at least 2 players so we can have one missing
          if (playerIds.length < 2) return;
          const gameState = buildGameStateMissingClue(playerIds, round);
          expect(allCluesSubmitted(gameState)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when clueLog has entries for a different round only', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }).chain((n) =>
          fc.tuple(playerIdsArb(n), fc.integer({ min: 2, max: 10 })),
        ),
        ([playerIds, round]) => {
          // All entries are for round - 1 (previous round), not current round
          const gameState = buildGameStateAllSubmitted(playerIds, round - 1);
          gameState.round = round; // advance round without new entries
          expect(allCluesSubmitted(gameState)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns false when activePlayers is empty', () => {
    const gameState: GameState = {
      roomCode: 'ABCDEF',
      round: 1,
      phase: 'clue',
      activePlayers: [],
      spectators: [],
      clueLog: [],
      votes: [],
      currentTurnPlayerId: null,
      wordPair: null,
      eliminatedThisRound: null,
      winner: null,
      tournamentScores: null,
      phaseEndsAt: null,
    };
    expect(allCluesSubmitted(gameState)).toBe(false);
  });

  it('ignores clue entries from spectators (non-active players)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 3, max: 12 }).chain((n) =>
          fc.tuple(playerIdsArb(n + 2), fc.integer({ min: 1, max: 10 })),
        ),
        ([allIds, round]) => {
          const spectatorIds = allIds.slice(0, 2);
          const activeIds = allIds.slice(2);

          // Only spectators have submitted; active players have not
          const clueLog: ClueEntry[] = spectatorIds.map((playerId, i) => ({
            playerId,
            nickname: `Spectator${i}`,
            clue: `clue-${i}`,
            round,
            timestamp: Date.now() + i,
          }));

          const gameState: GameState = {
            roomCode: 'ABCDEF',
            round,
            phase: 'clue',
            activePlayers: activeIds,
            spectators: spectatorIds,
            clueLog,
            votes: [],
            currentTurnPlayerId: activeIds[0],
            wordPair: null,
            eliminatedThisRound: null,
            winner: null,
            tournamentScores: null,
            phaseEndsAt: null,
          };

          expect(allCluesSubmitted(gameState)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
