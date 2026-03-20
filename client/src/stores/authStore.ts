import { create } from 'zustand';
import type { AuthUser } from '../../../shared/types';
import { env } from '../env';
import { flushOfflineQueue } from '../lib/offlineQueue';
import { connectSocket } from './roomStore';

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login(idToken: string): Promise<void>;
  loginAsGuest(): Promise<void>;
  logout(): Promise<void>;
  fetchMe(): Promise<void>;
  setUser(user: AuthUser | null): void;
}

type AuthStore = AuthState & AuthActions;

const BASE = env.VITE_API_BASE_URL;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: { message?: string }; message?: string }).error?.message ?? (body as { message?: string }).message ?? `HTTP ${res.status}`);
  }
  const body = await res.json() as { data: T; error: unknown };
  return body.data;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  async login(idToken: string) {
    set({ isLoading: true, error: null });
    try {
      const user = await apiFetch<AuthUser>('/auth/google', {
        method: 'POST',
        body: JSON.stringify({ idToken }),
      });
      set({ user, isLoading: false });
      connectSocket();
      void flushOfflineQueue();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  async loginAsGuest() {
    set({ isLoading: true, error: null });
    try {
      const user = await apiFetch<AuthUser>('/auth/guest', { method: 'POST' });
      set({ user, isLoading: false });
      connectSocket();
      void flushOfflineQueue();
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  async logout() {
    set({ isLoading: true, error: null });
    try {
      await apiFetch<void>('/auth/logout', { method: 'POST' });
      set({ user: null, isLoading: false });
    } catch (err) {
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  async fetchMe() {
    set({ isLoading: true, error: null });
    try {
      const user = await apiFetch<AuthUser>('/auth/me');
      set({ user, isLoading: false });
      connectSocket();
      // Flush any queued offline XP/stats now that we have a session
      void flushOfflineQueue();
    } catch (err) {
      set({ user: null, error: (err as Error).message, isLoading: false });
    }
  },

  setUser(user: AuthUser | null) {
    set({ user });
  },
}));
