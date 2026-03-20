/// <reference types="vite/client" />
import { create } from 'zustand';
import { io } from 'socket.io-client';
import type { Room, Player, GameConfig } from '../../../shared/types';

// Derive socket URL: use VITE_SOCKET_URL if set, otherwise same origin
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? '';

export const socket = io(SOCKET_URL, { withCredentials: true });

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
  socket.on('connect', () => set({ isConnected: true }));
  socket.on('disconnect', () => set({ isConnected: false }));

  // Persistent room event listeners
  socket.on('room:player_joined', ({ players }: { players: Player[] }) => {
    set({ players });
  });

  socket.on('room:player_left', ({ players }: { players: Player[] }) => {
    set({ players });
  });

  socket.on('host:transferred', ({ newHostId }: { newHostId: string }) => {
    set({ isHost: newHostId === socket.id });
  });

  socket.on('room:kicked', () => {
    // Kicked players are removed from the room
    get().reset();
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
        const timeout = setTimeout(() => {
          socket.off('room:created');
          socket.off('room:error');
          set({ error: 'Room creation timed out' });
          reject(new Error('Room creation timed out'));
        }, 10000);

        socket.once(
          'room:created',
          ({ room, qrDataUrl }: { room: Room; qrDataUrl: string }) => {
            clearTimeout(timeout);
            set({ room, players: room.players, isHost: true, qrDataUrl });
            resolve();
          },
        );

        socket.once('room:error', ({ message }: { message: string }) => {
          clearTimeout(timeout);
          set({ error: message });
          reject(new Error(message));
        });

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
        const timeout = setTimeout(() => {
          socket.off('room:joined');
          socket.off('room:error');
          set({ error: 'Join room timed out' });
          reject(new Error('Join room timed out'));
        }, 10000);

        socket.once('room:joined', ({ room }: { room: Room }) => {
          clearTimeout(timeout);
          set({ room, players: room.players, isHost: false });
          resolve();
        });

        socket.once('room:error', ({ message }: { message: string }) => {
          clearTimeout(timeout);
          set({ error: message });
          reject(new Error(message));
        });

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

    setRoom(room: Room | null) {
      set({ room, players: room?.players ?? [] });
    },

    setPlayers(players: Player[]) {
      set({ players });
    },

    reset() {
      set(initialState);
    },
  };
});
