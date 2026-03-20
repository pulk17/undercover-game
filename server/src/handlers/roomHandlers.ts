import type { Socket, Server } from 'socket.io';
import type { GameConfig, Player } from '@undercover/shared';
import { createRoom, joinRoom, leaveRoom, getRoom, saveRoom } from '../managers/RoomManager';
import { generateQrDataUrl } from '../lib/qrcode';
import { handleDisconnect, handleReconnect } from '../lib/reconnectionManager';

export function registerRoomHandlers(socket: Socket, io: Server): void {
  // room:create
  socket.on('room:create', async (payload: { config: GameConfig; passwordHash: string | null }) => {
    try {
      const { config, passwordHash } = payload;
      const user = socket.data.user;

      const hostPlayer: Player = {
        id: socket.id,
        userId: user.uid,
        nickname: user.displayName ?? 'Player',
        avatarUrl: user.photoURL ?? null,
        role: null,
        word: null,
        isHost: true,
        isActive: true,
        isConnected: true,
        joinOrder: 0,
        strikes: 0,
      };

      const room = await createRoom(hostPlayer, config, passwordHash);
      const qrDataUrl = await generateQrDataUrl(room.code);

      socket.data.roomCode = room.code;
      socket.join(room.code);

      socket.emit('room:created', { room, qrDataUrl });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // room:join
  socket.on('room:join', async (payload: { code: string; passwordHash: string | null }) => {
    try {
      const { code, passwordHash } = payload;
      const upperCode = code.toUpperCase();
      const user = socket.data.user;

      const player: Player = {
        id: socket.id,
        userId: user.uid,
        nickname: user.displayName ?? 'Player',
        avatarUrl: user.photoURL ?? null,
        role: null,
        word: null,
        isHost: false,
        isActive: true,
        isConnected: true,
        joinOrder: 0, // set by joinRoom based on room.players.length
        strikes: 0,
      };

      const room = await joinRoom(upperCode, player, passwordHash, io);

      socket.data.roomCode = upperCode;
      socket.join(upperCode);

      socket.emit('room:joined', { room });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // room:leave
  socket.on('room:leave', async () => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;

    try {
      await leaveRoom(code, socket.id, io);
      socket.leave(code);
      socket.data.roomCode = undefined;
      socket.emit('room:left', {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // host:kick — host removes a player from the room
  socket.on('host:kick', async ({ playerId }: { playerId: string }) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;

    try {
      const room = await getRoom(code);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can kick players' });
        return;
      }

      if (playerId === socket.id) {
        socket.emit('room:error', { message: 'Host cannot kick themselves' });
        return;
      }

      // Notify the kicked player before removing them
      io.to(playerId).emit('room:kicked', { reason: 'Kicked by host' });

      // Remove from room (broadcasts room:player_left to all)
      await leaveRoom(code, playerId, io);

      // Force-disconnect the kicked socket from the room channel
      const kickedSocket = io.sockets.sockets.get(playerId);
      if (kickedSocket) {
        kickedSocket.leave(code);
        kickedSocket.data.roomCode = undefined;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // host:transfer — voluntarily transfer host role to another player
  socket.on('host:transfer', async ({ newHostId }: { newHostId: string }) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;

    try {
      const room = await getRoom(code);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the current host can transfer host role' });
        return;
      }

      if (newHostId === socket.id) {
        socket.emit('room:error', { message: 'You are already the host' });
        return;
      }

      const newHostPlayer = room.players.find((p) => p.id === newHostId);
      if (!newHostPlayer) {
        socket.emit('room:error', { message: 'Target player not found in room' });
        return;
      }

      // Swap host flags
      const oldHostPlayer = room.players.find((p) => p.id === socket.id);
      if (oldHostPlayer) oldHostPlayer.isHost = false;
      newHostPlayer.isHost = true;
      room.hostId = newHostId;
      room.lastActivityAt = Date.now();

      await saveRoom(room);
      io.to(code).emit('host:transferred', { newHostId });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // game:reconnect — player reconnecting after disconnect
  socket.on('game:reconnect', async (payload: { roomCode: string; playerId: string }) => {
    await handleReconnect(socket, io, payload);
  });

  // disconnect — mark player as disconnected (not removed), start reconnect window
  socket.on('disconnect', async () => {
    await handleDisconnect(socket, io);
  });
}
