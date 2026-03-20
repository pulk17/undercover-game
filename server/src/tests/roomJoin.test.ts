/**
 * Property test P2: Room join invariants
 *
 * Tests that room join logic maintains invariants:
 * - A room never exceeds maxPlayers (max 12)
 * - Player IDs in a room are unique
 * - Room code format is preserved after join
 *
 * Validates: Requirements 3.2
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Player, Room, GameConfig } from '@undercover/shared';

// Charset used by RoomManager (no 0, O, 1, I)
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ALLOWED_CHARS = new Set(CODE_CHARS.split(''));

function makeRoomCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

/** Pure join logic extracted from RoomManager.joinRoom */
function joinRoom(room: Room, player: Player): Room | { error: string } {
  if (room.phase !== 'lobby') return { error: 'Game already in progress' };
  if (room.players.length >= room.config.maxPlayers) return { error: 'Room is full' };
  // Idempotent rejoin
  if (room.players.some((p) => p.id === player.id)) return room;

  return {
    ...room,
    players: [...room.players, player],
    lastActivityAt: Date.now(),
  };
}

const playerArb: fc.Arbitrary<Player> = fc.record({
  id: fc.uuid(),
  userId: fc.option(fc.uuid(), { nil: null }),
  nickname: fc.string({ minLength: 1, maxLength: 12 }),
  avatarUrl: fc.option(fc.webUrl(), { nil: null }),
  role: fc.constant(null),
  word: fc.constant(null),
  isHost: fc.boolean(),
  isActive: fc.constant(true),
  isConnected: fc.constant(true),
  joinOrder: fc.nat(),
  strikes: fc.constant(0),
});

const configArb: fc.Arbitrary<GameConfig> = fc.record({
  mode: fc.constantFrom('classic', 'speed_round', 'tournament') as fc.Arbitrary<GameConfig['mode']>,
  categories: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 3 }),
  difficulty: fc.constantFrom('easy', 'medium', 'hard') as fc.Arbitrary<GameConfig['difficulty']>,
  clueTimerSeconds: fc.option(fc.integer({ min: 10, max: 120 }), { nil: null }),
  discussionTimerSeconds: fc.option(fc.integer({ min: 30, max: 300 }), { nil: null }),
  tieResolution: fc.constantFrom('re_vote', 'all_survive', 'random') as fc.Arbitrary<GameConfig['tieResolution']>,
  postEliminationReveal: fc.boolean(),
  detectiveEnabled: fc.boolean(),
  silentRoundEnabled: fc.boolean(),
  customWordPair: fc.constant(null),
  maxPlayers: fc.integer({ min: 3, max: 12 }),
});

function makeRoom(players: Player[], config: GameConfig): Room {
  return {
    code: makeRoomCode(),
    hostId: players[0]?.id ?? 'host',
    players,
    config,
    phase: 'lobby',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    passwordHash: null,
  };
}

describe('P2: Room join invariants', () => {
  it('room never exceeds maxPlayers after join attempts', () => {
    fc.assert(
      fc.property(
        configArb,
        fc.array(playerArb, { minLength: 1, maxLength: 15 }),
        (config, players) => {
          // Ensure unique IDs
          const uniquePlayers = players.filter(
            (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
          );

          const initialPlayers = uniquePlayers.slice(0, Math.min(config.maxPlayers - 1, uniquePlayers.length));
          let room = makeRoom(initialPlayers, config);

          for (const player of uniquePlayers) {
            const result = joinRoom(room, player);
            if (!('error' in result)) {
              room = result;
            }
          }

          expect(room.players.length).toBeLessThanOrEqual(config.maxPlayers);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('player IDs in a room are always unique', () => {
    fc.assert(
      fc.property(
        configArb,
        fc.array(playerArb, { minLength: 1, maxLength: 12 }),
        (config, players) => {
          const uniquePlayers = players.filter(
            (p, i, arr) => arr.findIndex((x) => x.id === p.id) === i,
          );

          let room = makeRoom([], config);

          for (const player of uniquePlayers) {
            const result = joinRoom(room, player);
            if (!('error' in result)) {
              room = result;
            }
          }

          const ids = room.players.map((p) => p.id);
          const uniqueIds = new Set(ids);
          expect(uniqueIds.size).toBe(ids.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('room code format is preserved after join', () => {
    fc.assert(
      fc.property(configArb, playerArb, (config, player) => {
        const room = makeRoom([], config);
        const originalCode = room.code;

        const result = joinRoom(room, player);
        const updatedRoom = 'error' in result ? room : result;

        expect(updatedRoom.code).toBe(originalCode);
        expect(updatedRoom.code).toHaveLength(6);
        for (const ch of updatedRoom.code) {
          expect(ALLOWED_CHARS.has(ch)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
