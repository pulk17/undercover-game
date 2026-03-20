import type { Server, Socket } from 'socket.io';
import type { GameState, Role } from '@undercover/shared';
import { redis } from './redis';
import { getRoom, saveRoom } from '../managers/RoomManager';
import { toPublicGameState } from '../handlers/gameHandlers';

const RECONNECT_TTL = 60;       // 60s window to reconnect
const HOST_GRACE_TTL = 90;      // 90s grace period before host auto-transfer
const GAME_TTL = 60 * 60 * 24; // 24 hours

// Active host-grace timers keyed by roomCode
const hostGraceTimers = new Map<string, ReturnType<typeof setTimeout>>();

function reconnectKey(code: string, playerId: string): string {
  return `reconnect:${code}:${playerId}`;
}

function hostGraceKey(code: string): string {
  return `host_grace:${code}`;
}

/**
 * Called when a socket disconnects.
 *
 * Instead of removing the player from the room, we:
 *  1. Mark player.isConnected = false in the Room
 *  2. Write a `reconnect:{code}:{playerId}` key with 60s TTL
 *  3. Notify the room of the disconnection
 *  4. If the player was the host, start a 90s grace timer
 */
export async function handleDisconnect(socket: Socket, io: Server): Promise<void> {
  const roomCode = socket.data.roomCode as string | undefined;
  if (!roomCode) return;

  try {
    const room = await getRoom(roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === socket.id);
    if (!player) return;

    // Mark disconnected
    player.isConnected = false;
    room.lastActivityAt = Date.now();
    await saveRoom(room);

    // Write reconnect key (60s TTL)
    await redis.set(reconnectKey(roomCode, socket.id), '1', { ex: RECONNECT_TTL });

    // Notify room
    io.to(roomCode).emit('room:player_disconnected', {
      playerId: socket.id,
      nickname: player.nickname,
    });

    // If host disconnected, start 90s grace period
    if (room.hostId === socket.id) {
      await startHostGracePeriod(roomCode, socket.id, io);
    }
  } catch {
    // best-effort
  }
}

/**
 * Starts a 90s grace period for a disconnected host.
 * If the host doesn't reconnect within 90s, auto-transfer to the next player
 * in join order.
 */
async function startHostGracePeriod(
  roomCode: string,
  hostId: string,
  io: Server,
): Promise<void> {
  // Cancel any existing grace timer
  cancelHostGraceTimer(roomCode);

  // Store grace metadata in Redis so it survives server restarts
  await redis.set(hostGraceKey(roomCode), hostId, { ex: HOST_GRACE_TTL + 5 });

  const timer = setTimeout(async () => {
    hostGraceTimers.delete(roomCode);
    await redis.del(hostGraceKey(roomCode));

    try {
      const room = await getRoom(roomCode);
      if (!room) return;

      // Only transfer if the original host is still disconnected
      if (room.hostId !== hostId) return;
      const hostPlayer = room.players.find((p) => p.id === hostId);
      if (hostPlayer?.isConnected) return;

      // Find next connected player by join order
      const nextHost = room.players
        .filter((p) => p.id !== hostId && p.isConnected)
        .sort((a, b) => a.joinOrder - b.joinOrder)[0];

      if (!nextHost) return; // no connected players left

      // Transfer host
      const oldHost = room.players.find((p) => p.id === hostId);
      if (oldHost) oldHost.isHost = false;
      nextHost.isHost = true;
      room.hostId = nextHost.id;
      room.lastActivityAt = Date.now();
      await saveRoom(room);

      io.to(roomCode).emit('host:transferred', { newHostId: nextHost.id });
    } catch {
      // best-effort
    }
  }, HOST_GRACE_TTL * 1000);

  hostGraceTimers.set(roomCode, timer);
}

export function cancelHostGraceTimer(roomCode: string): void {
  const existing = hostGraceTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    hostGraceTimers.delete(roomCode);
  }
}

/**
 * Called when a socket reconnects with a `game:reconnect` event.
 *
 * Steps:
 *  1. Verify reconnect key exists in Redis
 *  2. Restore socket.data.roomCode and re-join the Socket.IO room channel
 *  3. Mark player.isConnected = true
 *  4. Cancel host grace timer if applicable
 *  5. Emit `game:state_sync` with full PublicGameState
 *  6. Re-send private role via `game:role_assigned`
 *  7. Notify room of reconnection
 */
export async function handleReconnect(
  socket: Socket,
  io: Server,
  payload: { roomCode: string; playerId: string },
): Promise<void> {
  const { roomCode, playerId } = payload;

  try {
    // 1. Verify reconnect key
    const key = reconnectKey(roomCode, playerId);
    const exists = await redis.get<string>(key);
    if (!exists) {
      socket.emit('room:error', { message: 'Reconnect window expired. Please rejoin the room.' });
      return;
    }
    await redis.del(key);

    // 2. Load room
    const room = await getRoom(roomCode);
    if (!room) {
      socket.emit('room:error', { message: 'Room no longer exists' });
      return;
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) {
      socket.emit('room:error', { message: 'Player not found in room' });
      return;
    }

    // 3. Update socket identity and re-join channel
    // Note: socket.id may differ after reconnect; update player.id to new socket.id
    const oldId = playerId;
    const newId = socket.id;
    const idChanged = oldId !== newId;

    if (idChanged) {
      player.id = newId;
      if (room.hostId === oldId) room.hostId = newId;
    }

    player.isConnected = true;
    room.lastActivityAt = Date.now();
    await saveRoom(room);

    socket.data.roomCode = roomCode;
    socket.join(roomCode);

    // 4. Cancel host grace timer if this was the host
    if (room.hostId === newId) {
      cancelHostGraceTimer(roomCode);
      await redis.del(hostGraceKey(roomCode));
    }

    // 5. Load game state and emit state_sync
    const rawState = await redis.get<string>(`game:${roomCode}`);
    if (rawState) {
      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Update activePlayers / spectators if player ID changed
      if (idChanged) {
        gameState.activePlayers = gameState.activePlayers.map((id) => (id === oldId ? newId : id));
        gameState.spectators = gameState.spectators.map((id) => (id === oldId ? newId : id));
        if (gameState.currentTurnPlayerId === oldId) gameState.currentTurnPlayerId = newId;
        gameState.votes = gameState.votes.map((v) => ({
          ...v,
          voterId: v.voterId === oldId ? newId : v.voterId,
          targetId: v.targetId === oldId ? newId : v.targetId,
        }));
        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });
      }

      const publicState = toPublicGameState(gameState);
      socket.emit('game:state_sync', { state: publicState, players: room.players });

      // 6. Re-send private role
      const roleKey = `role:${roomCode}:${newId}`;
      const rawRole = await redis.get<string>(roleKey);
      if (rawRole) {
        const { role, word } = typeof rawRole === 'string'
          ? JSON.parse(rawRole) as { role: Role; word: string | null }
          : rawRole as { role: Role; word: string | null };
        socket.emit('game:role_assigned', { role, word });
      }
    } else {
      // No active game — just sync room state
      socket.emit('game:state_sync', { state: null, players: room.players });
    }

    // 7. Notify room
    io.to(roomCode).emit('room:player_reconnected', {
      playerId: newId,
      nickname: player.nickname,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Reconnect failed';
    socket.emit('room:error', { message });
  }
}
