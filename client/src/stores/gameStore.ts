import { create } from 'zustand';
import { socket } from './roomStore';
import type { Role, GamePhase, PublicGameState, GameStateDelta, GameState as SharedGameState } from '../../../shared/types';
import { saveGameState, loadGameState, clearGameState } from '../lib/gameStateCache';

// ─── State & Actions ──────────────────────────────────────────────────────────

interface GameState {
  myRole: Role | null;
  myWord: string | null;
  gameState: PublicGameState | null;
  phase: GamePhase;
}

interface GameActions {
  setMyRole(role: Role, word: string | null): void;
  setGameState(state: PublicGameState): void;
  applyDelta(delta: GameStateDelta): void;
  reset(): void;
}

type GameStore = GameState & GameActions;

const initialState: GameState = {
  myRole: null,
  myWord: null,
  gameState: null,
  phase: 'lobby',
};

// ─── Navigation callback (set by App) ────────────────────────────────────────

let _navigate: ((path: string) => void) | null = null;

export function setNavigate(fn: (path: string) => void) {
  _navigate = fn;
}

function phaseToRoute(phase: GamePhase): string {
  switch (phase) {
    case 'role_reveal':   return '/game/reveal';
    case 'clue':          return '/game/clue';
    case 'discussion':    return '/game/discuss';
    case 'vote':          return '/game/vote';
    case 'elimination':   return '/game/elim';
    case 'self_reveal':   return '/game/elim';
    case 'mr_white_guess':return '/game/mrwhite';
    case 'game_over':     return '/game/over';
    default:              return '/lobby';
  }
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useGameStore = create<GameStore>((set) => {
  // Restore persisted game state on initialization
  const persisted = loadGameState();
  const restoredState: Partial<GameState> = persisted
    ? { gameState: persisted as unknown as PublicGameState, phase: persisted.phase }
    : {};

  // Listen for private role assignment
  socket.on('game:role_assigned', ({ role, word }: { role: Role; word: string | null }) => {
    set({ myRole: role, myWord: word });
  });

  // Listen for full state sync (reconnect)
  socket.on('game:state_sync', ({ state }: { state: PublicGameState | null }) => {
    if (state === null) {
      set({ gameState: null, phase: 'lobby' });
      clearGameState();
      return;
    }

    set({ gameState: state, phase: state.phase });
    saveGameState(state as unknown as SharedGameState);
    if (_navigate) {
      _navigate(phaseToRoute(state.phase));
    }
  });

  // Listen for phase changes
  socket.on('game:phase_changed', ({ phase, state }: { phase: GamePhase; state: PublicGameState }) => {
    set({ phase, gameState: state });
    saveGameState(state as unknown as SharedGameState);
    if (_navigate) {
      _navigate(phaseToRoute(phase));
    }
  });

  socket.on(
    'game:winner',
    ({ state }: { winner: string | null; state: PublicGameState }) => {
      set({ gameState: state, phase: 'game_over' });
      saveGameState(state as unknown as SharedGameState);
      if (_navigate) {
        _navigate(phaseToRoute('game_over'));
      }
    },
  );

  socket.on('game:reset', () => {
    set(initialState);
    clearGameState();
    if (_navigate) {
      _navigate('/lobby');
    }
  });

  return {
    ...initialState,
    ...restoredState,

    setMyRole(role: Role, word: string | null) {
      set({ myRole: role, myWord: word });
    },

    setGameState(state: PublicGameState) {
      set({ gameState: state, phase: state.phase });
      saveGameState(state as unknown as SharedGameState);
      if (_navigate) {
        _navigate(phaseToRoute(state.phase));
      }
    },

    applyDelta(delta: GameStateDelta) {
      set((prev) => ({
        gameState: prev.gameState
          ? { ...prev.gameState, ...delta.payload }
          : null,
      }));
    },

    reset() {
      set(initialState);
      clearGameState();
    },
  };
});
