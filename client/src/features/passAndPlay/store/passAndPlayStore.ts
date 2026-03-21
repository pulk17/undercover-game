import { create } from 'zustand';
import type {
  PnPGameState,
  PnPPlayer,
  PnPSettings,
  PnPPhase,
  PnPRevealSubPhase,
  PnPVoteSubPhase,
  WinnerFaction,
} from '../../../../../shared/types';
import { assignRoles } from '../utils/roleAssignment';
import { checkWinCondition, isFinalConfrontation } from '../utils/winCondition';
import { tallyVotes, randomTieBreaker } from '../utils/voteCounter';
import { getAlivePlayers, getClueStartingIndex, getNextStartingPlayerId } from '../utils/playerOrder';

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'pnp_game_state';

interface PnPStore extends PnPGameState {
  // Setup
  initGame(names: string[], settings: PnPSettings, wordPair: { civilian: string; undercover: string }): void;
  
  // Role reveal
  advanceRevealCover(): void;
  advanceRevealTap(): void;
  autoHideWord(): void;
  peekWord(): void;
  confirmWordSeen(): void;
  forceRevealCover(): void;
  
  // Clue phase
  submitClue(clue: string): void;
  timeoutClue(): void;
  
  // Discussion
  startVoting(): void;
  
  // Voting
  advanceVoteCover(): void;
  castVote(targetId: string | null): void;
  confirmTally(): void;
  
  // Elimination
  submitMrWhiteGuess(guess: string): void;
  confirmElimination(): void;
  
  // Game over
  resetGame(): void;
  
  // Persistence
  saveToStorage(): void;
  loadFromStorage(): boolean;
  clearStorage(): void;
}

const createInitialState = (): PnPGameState => ({
  gameId: '',
  createdAt: 0,
  players: [],
  settings: {
    includeMrWhite: true,
    undercoverCount: 1,
    clueTimerSeconds: 60,
    discussionTimerSeconds: 120,
    tieResolution: 'revote',
    wordPeekAllowed: true,
    postEliminationReveal: true,
    detectiveEnabled: false,
    silentRoundEnabled: false,
    category: 'general',
    difficulty: 'medium',
    maxPlayers: 8,
  },
  wordPair: { civilian: '', undercover: '' },
  phase: 'SETUP',
  currentRound: 0,
  revealSubPhase: 'COVER',
  revealPlayerIndex: 0,
  revealPeekUsed: false,
  revealTimerStart: null,
  clueStartingPlayerId: '',
  clueCurrentIndex: 0,
  clues: [],
  clueTimerStart: null,
  discussionTimerStart: null,
  voteSubPhase: 'COVER',
  voteCurrentVoterIndex: 0,
  votes: [],
  eliminations: [],
  winner: null,
  finalRoleReveal: false,
});

export const usePassAndPlayStore = create<PnPStore>((set, get) => ({
  ...createInitialState(),

  // ─── Setup ──────────────────────────────────────────────────────────────────

  initGame(names, settings, wordPair) {
    console.log('[PnP] initGame called with:', { nameCount: names.length, settings, wordPair });
    
    // Generate unique game ID using timestamp + random
    const gameId = `pnp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    const players = assignRoles(names, wordPair, settings);
    console.log('[PnP] Players assigned:', players.length, 'players');
    
    set({
      gameId,
      createdAt: Date.now(),
      players,
      settings,
      wordPair,
      phase: 'ROLE_REVEAL',
      currentRound: 1,
      revealSubPhase: 'COVER',
      revealPlayerIndex: 0,
      revealPeekUsed: false,
      clueStartingPlayerId: players[0].id,
      clueTimerStart: null,
    });
    
    console.log('[PnP] Game initialized, phase set to ROLE_REVEAL');
    get().saveToStorage();
  },

  // ─── Role Reveal ────────────────────────────────────────────────────────────

  advanceRevealCover() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL' || state.revealSubPhase !== 'COVER') return;
    
    set({ revealSubPhase: 'TAP_TO_SHOW' });
    get().saveToStorage();
  },

  advanceRevealTap() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL' || state.revealSubPhase !== 'TAP_TO_SHOW') return;
    
    set({
      revealSubPhase: 'VISIBLE',
      revealTimerStart: Date.now(),
      revealPeekUsed: false,
    });
    get().saveToStorage();
  },

  autoHideWord() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL' || state.revealSubPhase !== 'VISIBLE') return;
    
    set({
      revealSubPhase: 'HIDDEN',
      revealTimerStart: null,
    });
    get().saveToStorage();
  },

  peekWord() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL' || state.revealSubPhase !== 'HIDDEN') return;
    if (state.revealPeekUsed) return;
    
    set({
      revealSubPhase: 'VISIBLE',
      revealTimerStart: Date.now(),
      revealPeekUsed: true,
    });
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      const currentState = get();
      if (currentState.revealSubPhase === 'VISIBLE' && currentState.revealPeekUsed) {
        set({ revealSubPhase: 'HIDDEN', revealTimerStart: null });
        get().saveToStorage();
      }
    }, 3000);
    
    get().saveToStorage();
  },

  confirmWordSeen() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL' || state.revealSubPhase !== 'HIDDEN') return;
    
    const currentPlayer = state.players[state.revealPlayerIndex];
    const updatedPlayers = state.players.map(p =>
      p.id === currentPlayer.id ? { ...p, hasSeenWord: true } : p
    );
    
    // Check if this is the last player
    if (state.revealPlayerIndex === state.players.length - 1) {
      // Move to clue phase
      set({
        players: updatedPlayers,
        phase: 'CLUE_PHASE',
        revealSubPhase: 'CONFIRMED',
        clueCurrentIndex: 0,
      });
    } else {
      // Move to next player
      set({
        players: updatedPlayers,
        revealPlayerIndex: state.revealPlayerIndex + 1,
        revealSubPhase: 'COVER',
        revealPeekUsed: false,
      });
    }
    
    get().saveToStorage();
  },

  forceRevealCover() {
    const state = get();
    if (state.phase !== 'ROLE_REVEAL') return;
    
    set({
      revealSubPhase: 'COVER',
      revealTimerStart: null,
    });
    get().saveToStorage();
  },

  // ─── Clue Phase ─────────────────────────────────────────────────────────────

  submitClue(clue) {
    const state = get();
    if (state.phase !== 'CLUE_PHASE') return;
    
    const alivePlayers = getAlivePlayers(state.players);
    const currentPlayer = alivePlayers[state.clueCurrentIndex];
    
    const newClue = {
      playerId: currentPlayer.id,
      clue: clue.trim(),
      roundNumber: state.currentRound,
      timedOut: false,
    };
    
    const updatedClues = [...state.clues, newClue];
    
    // Check if all alive players have given clues
    if (state.clueCurrentIndex === alivePlayers.length - 1) {
      // Move to discussion
      set({
        clues: updatedClues,
        phase: 'DISCUSSION',
        discussionTimerStart: state.settings.discussionTimerSeconds ? Date.now() : null,
        clueTimerStart: null,
      });
    } else {
      // Move to next player
      set({
        clues: updatedClues,
        clueCurrentIndex: state.clueCurrentIndex + 1,
        clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
      });
    }
    
    get().saveToStorage();
  },

  timeoutClue() {
    const state = get();
    if (state.phase !== 'CLUE_PHASE') return;
    
    const alivePlayers = getAlivePlayers(state.players);
    const currentPlayer = alivePlayers[state.clueCurrentIndex];
    
    const newClue = {
      playerId: currentPlayer.id,
      clue: '',
      roundNumber: state.currentRound,
      timedOut: true,
    };
    
    const updatedClues = [...state.clues, newClue];
    
    if (state.clueCurrentIndex === alivePlayers.length - 1) {
      set({
        clues: updatedClues,
        phase: 'DISCUSSION',
        discussionTimerStart: state.settings.discussionTimerSeconds ? Date.now() : null,
        clueTimerStart: null,
      });
    } else {
      set({
        clues: updatedClues,
        clueCurrentIndex: state.clueCurrentIndex + 1,
        clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
      });
    }
    
    get().saveToStorage();
  },

  // ─── Discussion ─────────────────────────────────────────────────────────────

  startVoting() {
    const state = get();
    if (state.phase !== 'DISCUSSION') return;
    
    set({
      phase: 'VOTING',
      voteSubPhase: 'COVER',
      voteCurrentVoterIndex: 0,
      votes: [],
      discussionTimerStart: null,
    });
    
    get().saveToStorage();
  },

  // ─── Voting ─────────────────────────────────────────────────────────────────

  advanceVoteCover() {
    const state = get();
    if (state.phase !== 'VOTING' || state.voteSubPhase !== 'COVER') return;
    
    set({ voteSubPhase: 'ACTIVE' });
    get().saveToStorage();
  },

  castVote(targetId) {
    const state = get();
    if (state.phase !== 'VOTING' || state.voteSubPhase !== 'ACTIVE') return;
    
    const alivePlayers = getAlivePlayers(state.players);
    const currentVoter = alivePlayers[state.voteCurrentVoterIndex];
    
    const newVote = {
      voterId: currentVoter.id,
      targetId,
    };
    
    const updatedVotes = [...state.votes, newVote];
    
    // Check if this is the last voter
    if (state.voteCurrentVoterIndex === alivePlayers.length - 1) {
      set({
        votes: updatedVotes,
        voteSubPhase: 'TALLY',
      });
    } else {
      set({
        votes: updatedVotes,
        voteSubPhase: 'COVER',
        voteCurrentVoterIndex: state.voteCurrentVoterIndex + 1,
      });
    }
    
    get().saveToStorage();
  },

  confirmTally() {
    const state = get();
    if (state.phase !== 'VOTING' || state.voteSubPhase !== 'TALLY') return;
    
    const alivePlayers = getAlivePlayers(state.players);
    const tallyResult = tallyVotes(state.votes, alivePlayers);
    
    // Handle tie
    if (tallyResult.wasTie) {
      if (state.settings.tieResolution === 'revote') {
        // TODO: Implement revote logic
        // For now, use random
        const eliminatedId = randomTieBreaker(tallyResult.tiedPlayerIds);
        const eliminatedPlayer = state.players.find(p => p.id === eliminatedId)!;
        
        if (eliminatedPlayer.role === 'MR_WHITE') {
          set({ phase: 'MR_WHITE_GUESS' });
        } else {
          set({ phase: 'ELIMINATION' });
        }
      } else if (state.settings.tieResolution === 'random') {
        const eliminatedId = randomTieBreaker(tallyResult.tiedPlayerIds);
        const eliminatedPlayer = state.players.find(p => p.id === eliminatedId)!;
        
        if (eliminatedPlayer.role === 'MR_WHITE') {
          set({ phase: 'MR_WHITE_GUESS' });
        } else {
          set({ phase: 'ELIMINATION' });
        }
      } else {
        // skip_round - no elimination, clear votes and continue
        // FIXED: Properly clear votes and start new round
        set({
          phase: 'CLUE_PHASE',
          currentRound: state.currentRound + 1,
          clueCurrentIndex: 0,
          votes: [],
          voteSubPhase: 'COVER',
          voteCurrentVoterIndex: 0,
          clueStartingPlayerId: getNextStartingPlayerId(state.players, state.clueStartingPlayerId),
          clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
        });
      }
    } else if (tallyResult.eliminatedPlayerId) {
      const eliminatedPlayer = state.players.find(p => p.id === tallyResult.eliminatedPlayerId)!;
      
      if (eliminatedPlayer.role === 'MR_WHITE') {
        set({ phase: 'MR_WHITE_GUESS' });
      } else {
        set({ phase: 'ELIMINATION' });
      }
    } else {
      // All abstained - no elimination, clear votes and continue
      // FIXED: Properly clear votes and start new round
      set({
        phase: 'CLUE_PHASE',
        currentRound: state.currentRound + 1,
        clueCurrentIndex: 0,
        votes: [],
        voteSubPhase: 'COVER',
        voteCurrentVoterIndex: 0,
        clueStartingPlayerId: getNextStartingPlayerId(state.players, state.clueStartingPlayerId),
        clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
      });
    }
    
    get().saveToStorage();
  },

  // ─── Elimination ────────────────────────────────────────────────────────────

  submitMrWhiteGuess(guess) {
    const state = get();
    if (state.phase !== 'MR_WHITE_GUESS') return;
    
    const normalizedGuess = guess.trim().toLowerCase();
    const normalizedAnswer = state.wordPair.civilian.toLowerCase();
    const isCorrect = normalizedGuess === normalizedAnswer;
    
    const alivePlayers = getAlivePlayers(state.players);
    const tallyResult = tallyVotes(state.votes, alivePlayers);
    const mrWhitePlayer = state.players.find(p => p.role === 'MR_WHITE')!;
    
    const elimination = {
      roundNumber: state.currentRound,
      eliminatedPlayerId: mrWhitePlayer.id,
      eliminatedRole: mrWhitePlayer.role,
      voteCount: tallyResult.voteCount,
      wasTie: tallyResult.wasTie,
      tieResolution: tallyResult.wasTie ? (state.settings.tieResolution as any) : ('skipped' as const),
      mrWhiteGuess: guess,
      mrWhiteGuessCorrect: isCorrect,
    };
    
    // FIXED: Update players first, then check win condition
    const updatedPlayers = state.players.map(p =>
      p.id === mrWhitePlayer.id ? { ...p, isAlive: false } : p
    );
    
    const winner = checkWinCondition(updatedPlayers, isCorrect);
    
    if (winner) {
      set({
        players: updatedPlayers,
        eliminations: [...state.eliminations, elimination],
        winner,
        phase: 'GAME_OVER',
        finalRoleReveal: true,
      });
    } else {
      set({
        players: updatedPlayers,
        eliminations: [...state.eliminations, elimination],
        phase: 'ELIMINATION',
      });
    }
    
    get().saveToStorage();
  },

  confirmElimination() {
    const state = get();
    if (state.phase !== 'ELIMINATION') return;
    
    const alivePlayers = getAlivePlayers(state.players);
    const tallyResult = tallyVotes(state.votes, alivePlayers);
    
    let eliminatedId = tallyResult.eliminatedPlayerId;
    if (!eliminatedId && tallyResult.wasTie) {
      eliminatedId = randomTieBreaker(tallyResult.tiedPlayerIds);
    }
    
    if (!eliminatedId) {
      // No elimination, continue to next round
      // FIXED: Clear votes and start clue timer
      set({
        phase: 'CLUE_PHASE',
        currentRound: state.currentRound + 1,
        clueCurrentIndex: 0,
        votes: [],
        voteSubPhase: 'COVER',
        voteCurrentVoterIndex: 0,
        clueStartingPlayerId: getNextStartingPlayerId(state.players, state.clueStartingPlayerId),
        clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
      });
      get().saveToStorage();
      return;
    }
    
    const eliminatedPlayer = state.players.find(p => p.id === eliminatedId)!;
    const updatedPlayers = state.players.map(p =>
      p.id === eliminatedId ? { ...p, isAlive: false } : p
    );
    
    const elimination = {
      roundNumber: state.currentRound,
      eliminatedPlayerId: eliminatedId,
      eliminatedRole: eliminatedPlayer.role,
      voteCount: tallyResult.voteCount,
      wasTie: tallyResult.wasTie,
      tieResolution: tallyResult.wasTie ? (state.settings.tieResolution as any) : ('skipped' as const),
      mrWhiteGuess: null,
      mrWhiteGuessCorrect: null,
    };
    
    // Check win condition with updated players
    const winner = checkWinCondition(updatedPlayers);
    
    if (winner) {
      set({
        players: updatedPlayers,
        eliminations: [...state.eliminations, elimination],
        winner,
        phase: 'GAME_OVER',
        finalRoleReveal: true,
      });
    } else {
      // Continue to next round
      // FIXED: Clear votes and start clue timer
      set({
        players: updatedPlayers,
        eliminations: [...state.eliminations, elimination],
        phase: 'CLUE_PHASE',
        currentRound: state.currentRound + 1,
        clueCurrentIndex: 0,
        votes: [],
        voteSubPhase: 'COVER',
        voteCurrentVoterIndex: 0,
        clueStartingPlayerId: getNextStartingPlayerId(updatedPlayers, state.clueStartingPlayerId),
        clueTimerStart: state.settings.clueTimerSeconds ? Date.now() : null,
      });
    }
    
    get().saveToStorage();
  },

  // ─── Game Over ──────────────────────────────────────────────────────────────

  resetGame() {
    set(createInitialState());
    get().clearStorage();
  },

  // ─── Persistence ────────────────────────────────────────────────────────────

  saveToStorage() {
    try {
      const state = get();
      const toSave = {
        ...state,
        schemaVersion: SCHEMA_VERSION,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  },

  loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      
      const parsed = JSON.parse(saved);
      
      // Check schema version
      if (parsed.schemaVersion !== SCHEMA_VERSION) {
        console.warn('Game state schema mismatch, clearing storage');
        get().clearStorage();
        return false;
      }
      
      // Never restore mid-reveal for security
      if (parsed.phase === 'ROLE_REVEAL' && parsed.revealSubPhase === 'VISIBLE') {
        parsed.revealSubPhase = 'COVER';
        parsed.revealTimerStart = null;
      }
      
      delete parsed.schemaVersion;
      set(parsed);
      return true;
    } catch (error) {
      console.error('Failed to load game state:', error);
      get().clearStorage();
      return false;
    }
  },

  clearStorage() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  },
}));
