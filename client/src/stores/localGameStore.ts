/**
 * localGameStore
 *
 * Zustand store that bridges LocalGameManager events to React components.
 * Screens subscribe to this store instead of directly to the manager.
 */

import { create } from 'zustand';
import { LocalGameManager, type LocalGameState } from '../lib/localGameManager';
import type { Player, GameConfig, Role } from '../../../shared/types';

interface LocalGameStoreState {
  manager: LocalGameManager | null;
  gameState: LocalGameState | null;
  /** The player whose role is currently being revealed */
  handoffPlayer: { playerId: string; nickname: string } | null;
  /** Role/word for the player currently at the reveal screen */
  currentRevealRole: { role: Role; word: string | null } | null;
  isLocalMode: boolean;
}

interface LocalGameStoreActions {
  initLocalGame(players: Player[], config: GameConfig): void;
  startGame(): Promise<void>;
  confirmHandoff(): void;
  playerReadyAfterReveal(): void;
  submitClue(playerId: string, clue: string): void;
  endDiscussion(): void;
  castVote(voterId: string, targetId: string): void;
  forceRevealVotes(): void;
  submitMrWhiteGuess(guess: string): void;
  reset(): void;
}

type LocalGameStore = LocalGameStoreState & LocalGameStoreActions;

const initialState: LocalGameStoreState = {
  manager: null,
  gameState: null,
  handoffPlayer: null,
  currentRevealRole: null,
  isLocalMode: false,
};

export const useLocalGameStore = create<LocalGameStore>((set, get) => ({
  ...initialState,

  initLocalGame(players: Player[], config: GameConfig) {
    const manager = new LocalGameManager(players, config);

    manager.on('phase_changed', ({ state }) => {
      set({ gameState: { ...state } });
    });

    manager.on('handoff_required', ({ playerId, nickname }) => {
      set({ handoffPlayer: { playerId, nickname }, currentRevealRole: null });
    });

    manager.on('role_assigned', ({ role, word }) => {
      set({ currentRevealRole: { role, word }, handoffPlayer: null });
    });

    set({ manager, isLocalMode: true, gameState: manager.getState() as LocalGameState });
  },

  async startGame() {
    const { manager } = get();
    if (!manager) return;
    await manager.startGame();
  },

  confirmHandoff() {
    get().manager?.confirmHandoff();
  },

  playerReadyAfterReveal() {
    get().manager?.playerReadyAfterReveal();
  },

  submitClue(playerId: string, clue: string) {
    get().manager?.submitClue(playerId, clue);
  },

  endDiscussion() {
    get().manager?.endDiscussion();
  },

  castVote(voterId: string, targetId: string) {
    get().manager?.castVote(voterId, targetId);
  },

  forceRevealVotes() {
    get().manager?.forceRevealVotes();
  },

  submitMrWhiteGuess(guess: string) {
    get().manager?.submitMrWhiteGuess(guess);
  },

  reset() {
    set(initialState);
  },
}));
