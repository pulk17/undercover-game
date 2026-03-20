/// <reference types="vite/client" />
import { create } from 'zustand';
import { io } from 'socket.io-client';
import type { Room, Player, GameConfig } from '../../../shared/types';

// Derive socket URL: use VITE_SOCKET_URL if set, otherwise same origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  autoConnect: false,
  transports: ['websocket'],   // skip polling — no HTTP probe, no proxy noise
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  reconnectionAttempts: 10,
  timeout: 10000,
});

/** Call after a session cookie is established (login / guest auth) */
export function connectSocket() {
  if (!socket.connected) socket.connect();
}

// ─── State & Actions ──────────────────────────────────────────────────────────

interface RoomState {
  room: Room | null;
  players: Player[];
  isHost: boolean;
  qrDataUrl: string | null;
  error: string | null;
  isConnected: boolean;
}

interface RoomActions {
  createRoom(config: GameConfig, passwordHash: string | null): Promise<void>;
  joinRoom(code: string, passwordHash: string | null): Promise<void>;
  leaveRoom(): Promise<void>;
  updateRoomConfig(config: GameConfig, passwordHash?: string | null): Promise<void>;
  setRoom(room: Room | null): void;
  setPlayers(players: Player[]): void;
  reset(): void;
}

type RoomStore = RoomState & RoomActions;

const initialState: RoomState = {
  room: null,
  players: [],
  isHost: false,
  qrDataUrl: null,
  error: null,
  isConnected: false,
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useRoomStore = create<RoomStore>((set, get) => {
  // Track connection status
  socket.on('connect', () => set({ isConnected: true, error: null }));
  socket.on('disconnect', () => set({ isConnected: false }));
  socket.on('room:error', ({ message }: { message: string }) => set({ error: message }));

  socket.on('game:state_sync', ({ players }: { players?: Player[] }) => {
    if (!players) return;
    set((state) => ({
      players,
      room: state.room ? { ...state.room, players } : state.room,
      isHost: players.some((player) => player.id === socket.id && player.isHost),
    }));
  });

  // Persistent room event listeners
  socket.on('room:player_joined', ({ players }: { players: Player[] }) => {
    set((state) => ({
      players,
      room: state.room ? { ...state.room, players } : state.room,
      error: null,
    }));
  });

  socket.on('room:player_left', ({ players }: { players: Player[] }) => {
    set((state) => ({
      players,
      room: state.room ? { ...state.room, players } : state.room,
      isHost: players.some((player) => player.id === socket.id && player.isHost),
    }));
  });

  socket.on('room:player_disconnected', ({ playerId }: { playerId: string }) => {
    set((state) => {
      const players = state.players.map((player) => {
        if (player.id === playerId) {
          return { ...player, isConnected: false };
        }
        return player;
      });

      return {
        players,
        room: state.room ? { ...state.room, players } : state.room,
        error: null,
      };
    });
  });

  socket.on('room:updated', ({ room }: { room: Room }) => {
    set({
      room,
      players: room.players,
      isHost: room.players.some((player) => player.id === socket.id && player.isHost),
      error: null,
    });
  });

  socket.on('room:player_reconnected', ({
    playerId,
    previousPlayerId,
    nickname,
  }: {
    playerId: string;
    previousPlayerId?: string;
    nickname: string;
  }) => {
    set((state) => {
      let matched = false;
      const players = state.players.map((player) => {
        if (
          player.id === playerId ||
          (previousPlayerId && player.id === previousPlayerId) ||
          player.nickname === nickname
        ) {
          matched = true;
          return { ...player, id: playerId, isConnected: true };
        }
        return player;
      });

      if (!matched) return state;

      return {
        players,
        room: state.room ? { ...state.room, players } : state.room,
        isHost: players.some((player) => player.id === socket.id && player.isHost),
        error: null,
      };
    });
  });

  socket.on('host:transferred', ({ newHostId }: { newHostId: string }) => {
    set((state) => {
      const players = state.players.map((player) => ({
        ...player,
        isHost: player.id === newHostId,
      }));
      return {
        players,
        room: state.room
          ? { ...state.room, hostId: newHostId, players }
          : state.room,
        isHost: newHostId === socket.id,
        error: null,
      };
    });
  });

  socket.on('room:kicked', () => {
    // Kicked players are removed from the room
    get().reset();
  });

  socket.on(
    'game:reset',
    ({ players }: { phase: 'lobby'; players: Player[] }) => {
      set((state) => ({
        players,
        room: state.room
          ? { ...state.room, phase: 'lobby', players }
          : state.room,
        isHost: players.some((player) => player.id === socket.id && player.isHost),
        error: null,
      }));
    },
  );

  socket.on('room:closed', ({ reason }: { reason: string }) => {
    set({ ...initialState, error: reason });
  });

  return {
    ...initialState,

    async createRoom(config: GameConfig, passwordHash: string | null) {
      set({ error: null });
      if (!socket.connected) {
        set({ error: 'Cannot connect to server. Please ensure you are signed in and try again.' });
        throw new Error('Server connection offline');
      }
      return new Promise<void>((resolve, reject) => {
        const handleCreated = ({ room, qrDataUrl }: { room: Room; qrDataUrl: string }) => {
          clearTimeout(timeout);
          socket.off('room:error', handleError);
          set({
            room,
            players: room.players,
            isHost: room.players.some((player) => player.id === socket.id && player.isHost),
            qrDataUrl,
          });
          resolve();
        };

        const handleError = ({ message }: { message: string }) => {
          clearTimeout(timeout);
          socket.off('room:created', handleCreated);
          set({ error: message });
          reject(new Error(message));
        };

        const timeout = setTimeout(() => {
          socket.off('room:created', handleCreated);
          socket.off('room:error', handleError);
          set({ error: 'Room creation timed out' });
          reject(new Error('Room creation timed out'));
        }, 10000);

        socket.once('room:created', handleCreated);
        socket.once('room:error', handleError);

        socket.emit('room:create', { config, passwordHash });
      });
    },

    async joinRoom(code: string, passwordHash: string | null) {
      set({ error: null });
      if (!socket.connected) {
        set({ error: 'Cannot connect to server. Please ensure you are signed in and try again.' });
        throw new Error('Server connection offline');
      }
      return new Promise<void>((resolve, reject) => {
        const handleJoined = ({ room }: { room: Room }) => {
          clearTimeout(timeout);
          socket.off('room:error', handleError);
          set({
            room,
            players: room.players,
            isHost: room.players.some((player) => player.id === socket.id && player.isHost),
          });
          resolve();
        };

        const handleError = ({ message }: { message: string }) => {
          clearTimeout(timeout);
          socket.off('room:joined', handleJoined);
          set({ error: message });
          reject(new Error(message));
        };

        const timeout = setTimeout(() => {
          socket.off('room:joined', handleJoined);
          socket.off('room:error', handleError);
          set({ error: 'Join room timed out' });
          reject(new Error('Join room timed out'));
        }, 10000);

        socket.once('room:joined', handleJoined);
        socket.once('room:error', handleError);

        socket.emit('room:join', { code, passwordHash });
      });
    },

    async leaveRoom() {
      return new Promise<void>((resolve) => {
        socket.once('room:left', () => {
          get().reset();
          resolve();
        });

        socket.emit('room:leave');
      });
    },

    async updateRoomConfig(config: GameConfig, passwordHash?: string | null) {
      set({ error: null });
      return new Promise<void>((resolve, reject) => {
        const handleUpdated = ({ room }: { room: Room }) => {
          clearTimeout(timeout);
          socket.off('room:error', handleError);
          set({
            room,
            players: room.players,
            isHost: room.players.some((player) => player.id === socket.id && player.isHost),
          });
          resolve();
        };

        const handleError = ({ message }: { message: string }) => {
          clearTimeout(timeout);
          socket.off('room:updated', handleUpdated);
          set({ error: message });
          reject(new Error(message));
        };

        const timeout = setTimeout(() => {
          socket.off('room:updated', handleUpdated);
          socket.off('room:error', handleError);
          reject(new Error('Room update timed out'));
        }, 10000);

        socket.once('room:updated', handleUpdated);
        socket.once('room:error', handleError);

        socket.emit('room:update_config', { config, passwordHash });
      });
    },

    setRoom(room: Room | null) {
      set({
        room,
        players: room?.players ?? [],
        isHost: room?.players.some((player) => player.id === socket.id && player.isHost) ?? false,
      });
    },

    setPlayers(players: Player[]) {
      set({ players });
    },

    reset() {
      set(initialState);
    },
  };
});
