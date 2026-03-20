import type { Socket, Server } from 'socket.io';
import type { GameConfig, Player } from '@undercover/shared';
import { createRoom, joinRoom, leaveRoom, getRoom, saveRoom, deleteRoom } from '../managers/RoomManager';
import { generateQrDataUrl } from '../lib/qrcode';
import { handleDisconnect, handleReconnect } from '../lib/reconnectionManager';

export function registerRoomHandlers(socket: Socket, io: Server): void {
  // room:create
  socket.on('room:create', async (payload: { config: GameConfig; passwordHash: string | null }) => {
    try {
      const { config, passwordHash } = payload;
      const user = socket.data.user;

      const { validateNickname, logValidationError } = await import('../lib/validation');

      // Validate nickname
      const nicknameValidation = validateNickname(user.displayName ?? 'Player');
      if (!nicknameValidation.valid) {
        logValidationError('room_create', nicknameValidation.error!, { userId: user.uid });
        socket.emit('room:error', { message: nicknameValidation.error });
        return;
      }

      const hostPlayer: Player = {
        id: socket.id,
        userId: user.uid,
        nickname: nicknameValidation.sanitized,
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
      
      // Sync game state to set phase to 'lobby'
      socket.emit('game:state_sync', { state: null, players: room.players });
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

      const { validateRoomCode, validateNickname, logValidationError } = await import('../lib/validation');

      // Validate room code
      const codeValidation = validateRoomCode(upperCode);
      if (!codeValidation.valid) {
        logValidationError('room_join', codeValidation.error!, { userId: user.uid, code: upperCode });
        socket.emit('room:error', { message: codeValidation.error });
        return;
      }

      // Validate nickname
      const nicknameValidation = validateNickname(user.displayName ?? 'Player');
      if (!nicknameValidation.valid) {
        logValidationError('room_join', nicknameValidation.error!, { userId: user.uid });
        socket.emit('room:error', { message: nicknameValidation.error });
        return;
      }

      const player: Player = {
        id: socket.id,
        userId: user.uid,
        nickname: nicknameValidation.sanitized,
        avatarUrl: user.photoURL ?? null,
        role: null,
        word: null,
        isHost: false,
        isActive: true,
        isConnected: true,
        joinOrder: 0, // set by joinRoom based on room.players.length
        strikes: 0,
      };

      const room = await joinRoom(codeValidation.sanitized, player, passwordHash, io);

      socket.data.roomCode = codeValidation.sanitized;
      socket.join(codeValidation.sanitized);

      socket.emit('room:joined', { room });
      
      // Sync game state to set phase to 'lobby'
      socket.emit('game:state_sync', { state: null, players: room.players });
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
      const room = await getRoom(code);
      if (room && room.hostId === socket.id && room.players.length > 1) {
        io.to(code).emit('room:closed', { reason: 'The host ended the room.' });
        const sockets = await io.in(code).fetchSockets();
        for (const memberSocket of sockets) {
          memberSocket.leave(code);
          memberSocket.data.roomCode = undefined;
        }
        await deleteRoom(code);
        socket.emit('room:left', {});
        return;
      }

      await leaveRoom(code, socket.id, io);
      socket.leave(code);
      socket.data.roomCode = undefined;
      socket.emit('room:left', {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  // room:update_config
  socket.on('room:update_config', async (payload: { config: GameConfig; passwordHash?: string | null }) => {
    const code = socket.data.roomCode as string | undefined;
    if (!code) return;

    try {
      const room = await getRoom(code);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can update room settings' });
        return;
      }

      if (room.phase !== 'lobby') {
        socket.emit('room:error', { message: 'Room settings can only be changed in the lobby' });
        return;
      }

      room.config = payload.config;
      if (payload.passwordHash !== undefined) {
        room.passwordHash = payload.passwordHash;
      }
      room.lastActivityAt = Date.now();

      await saveRoom(room);
      io.to(code).emit('room:updated', { room });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      socket.emit('room:error', { message });
    }
  });

  socket.on('profile:update_identity', async ({ displayName }: { displayName: string }) => {
    const nextName = displayName.trim().slice(0, 12);
    if (!nextName) return;

    socket.data.user = {
      ...socket.data.user,
      displayName: nextName,
    };

    const code = socket.data.roomCode as string | undefined;
    if (!code) return;

    try {
      const room = await getRoom(code);
      if (!room) return;

      const player = room.players.find((entry) => entry.id === socket.id);
      if (!player) return;

      player.nickname = nextName;
      room.lastActivityAt = Date.now();

      await saveRoom(room);
      io.to(code).emit('room:updated', { room });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to sync player identity';
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
