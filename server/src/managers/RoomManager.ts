import { redis } from '../lib/redis';
import type { Room, Player, GameConfig } from '@undercover/shared';
import type { Server } from 'socket.io';

// Charset excludes 0, O, 1, I to avoid visual ambiguity
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const TTL_SECONDS = 86400; // 24 hours
const MAX_RETRIES = 10;

function roomKey(code: string): string {
  return `room:${code}`;
}

function gameKey(code: string): string {
  return `game:${code}`;
}

function usedWordsKey(code: string): string {
  return `used_words:${code}`;
}

function generateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

export async function createRoom(
  hostPlayer: Player,
  config: GameConfig,
  passwordHash: string | null,
): Promise<Room> {
  let code: string | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const candidate = generateCode();
    const existing = await redis.get(roomKey(candidate));
    if (existing === null) {
      code = candidate;
      break;
    }
  }

  if (code === null) {
    throw new Error('Failed to generate a unique room code after maximum retries');
  }

  const now = Date.now();
  const room: Room = {
    code,
    hostId: hostPlayer.id,
    players: [hostPlayer],
    config,
    phase: 'lobby',
    createdAt: now,
    lastActivityAt: now,
    passwordHash,
  };

  await redis.set(roomKey(code), JSON.stringify(room), { ex: TTL_SECONDS });

  return room;
}

export async function getRoom(code: string): Promise<Room | null> {
  const data = await redis.get<string>(roomKey(code));
  if (data === null) return null;
  // Upstash may auto-parse JSON; handle both string and object
  if (typeof data === 'string') {
    return JSON.parse(data) as Room;
  }
  return data as unknown as Room;
}

export async function saveRoom(room: Room): Promise<void> {
  await redis.set(roomKey(room.code), JSON.stringify(room), { ex: TTL_SECONDS });
  // Keep related keys in sync with the same TTL
  await Promise.allSettled([
    redis.expire(gameKey(room.code), TTL_SECONDS),
    redis.expire(usedWordsKey(room.code), TTL_SECONDS),
  ]);
}

export async function touchRoom(code: string): Promise<void> {
  await Promise.allSettled([
    redis.expire(roomKey(code), TTL_SECONDS),
    redis.expire(gameKey(code), TTL_SECONDS),
    redis.expire(usedWordsKey(code), TTL_SECONDS),
  ]);
}

export async function deleteRoom(code: string): Promise<void> {
  const { unregisterActiveRoom } = await import('../lib/timerCleanup');
  unregisterActiveRoom(code);
  await redis.del(roomKey(code), gameKey(code), usedWordsKey(code));
}

export async function leaveRoom(
  code: string,
  playerId: string,
  io: Server,
): Promise<Room | null> {
  const room = await getRoom(code);
  if (room === null) return null;

  room.players = room.players.filter((p) => p.id !== playerId);

  if (room.players.length === 0) {
    await redis.del(roomKey(code));
    return null;
  }

  if (playerId === room.hostId) {
    const newHost = [...room.players].sort((a, b) => a.joinOrder - b.joinOrder)[0];
    room.hostId = newHost.id;
    newHost.isHost = true;
    io.to(code).emit('host:transferred', { newHostId: room.hostId });
  }

  room.lastActivityAt = Date.now();
  await saveRoom(room);

  io.to(code).emit('room:player_left', { playerId, players: room.players });

  return room;
}

export async function joinRoom(
  code: string,
  player: Player,
  passwordHash: string | null,
  io: Server,
): Promise<Room> {
  const room = await getRoom(code);
  if (room === null) throw new Error('Room not found');
  if (room.phase !== 'lobby') throw new Error('Game already in progress');
  if (room.players.length >= room.config.maxPlayers) throw new Error('Room is full');
  if (room.passwordHash !== null && passwordHash !== room.passwordHash) {
    throw new Error('Incorrect password');
  }

  // Idempotent rejoin — player already in room
  if (room.players.some((p) => p.id === player.id)) return room;

  room.players.push(player);
  room.lastActivityAt = Date.now();

  await saveRoom(room);

  io.to(code).emit('room:player_joined', { players: room.players });

  return room;
}
