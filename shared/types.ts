// ─── Enums (as union types) ───────────────────────────────────────────────────

export type Role = 'civilian' | 'undercover' | 'mr_white' | 'detective';

export type GamePhase =
  | 'lobby'
  | 'role_reveal'
  | 'clue'
  | 'discussion'
  | 'vote'
  | 'elimination'
  | 'mr_white_guess'
  | 'self_reveal'
  | 'game_over';

export type GameMode =
  | 'classic'
  | 'speed_round'
  | 'team_mode'
  | 'secret_alliance'
  | 'double_agent'
  | 'reverse_mode'
  | 'mr_white_army'
  | 'tournament';

export type Difficulty = 'easy' | 'medium' | 'hard';

export type TieResolution = 're_vote' | 'all_survive' | 'random';

export type WinFaction = 'civilian' | 'undercover' | 'mr_white';

export type Level =
  | 'rookie'
  | 'agent'
  | 'operative'
  | 'infiltrator'
  | 'mastermind'
  | 'phantom';

export type TextScale = 'small' | 'medium' | 'large';

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface WordPair {
  id: string;
  wordA: string;
  wordB: string;
  category: string;
  difficulty: Difficulty;
  language: string;
  region: string;
  ageGroup: 'all' | 'teen' | 'adult';
}

export interface Player {
  id: string;             // socket ID or stable user ID
  userId: string | null;  // null for guests
  nickname: string;
  avatarUrl: string | null;
  role: Role | null;      // null until role assigned; never sent to other clients
  word: string | null;    // null until assigned; never sent to other clients
  isHost: boolean;
  isActive: boolean;      // false when eliminated
  isConnected: boolean;
  joinOrder: number;
  strikes: number;        // Speed Round strikes
}

export interface Room {
  code: string;           // 6-char alphanumeric, no 0/O/1/I
  hostId: string;
  players: Player[];
  config: GameConfig;
  phase: GamePhase;
  createdAt: number;      // Unix ms
  lastActivityAt: number; // Unix ms; TTL reset on any activity
  passwordHash: string | null;
}

export interface GameConfig {
  mode: GameMode;
  categories: string[];
  difficulty: Difficulty;
  clueTimerSeconds: number | null;      // null = unlimited
  discussionTimerSeconds: number | null;
  tieResolution: TieResolution;
  postEliminationReveal: boolean;
  detectiveEnabled: boolean;
  silentRoundEnabled: boolean;
  customWordPair: WordPair | null;
  maxPlayers: number;                   // 3–12
}

export interface ClueEntry {
  playerId: string;
  nickname: string;
  clue: string | null;  // null = skipped
  round: number;
  timestamp: number;
}

export interface VoteRecord {
  voterId: string;
  targetId: string;
  round: number;
}

export interface GameState {
  roomCode: string;
  round: number;
  phase: GamePhase;
  activePlayers: string[];                    // player IDs still in game
  spectators: string[];                       // eliminated player IDs
  clueLog: ClueEntry[];
  votes: VoteRecord[];                        // hidden from clients until reveal
  currentTurnPlayerId: string | null;
  wordPair: WordPair | null;                  // server-only; never sent to clients
  eliminatedThisRound: string | null;
  winner: WinFaction | null;
  tournamentScores: Record<string, number> | null;
  phaseEndsAt: number | null;                 // Unix ms for timer-driven phases
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface UserPreferences {
  language: string;
  textScale: TextScale;
  hapticEnabled: boolean;
  notifications: boolean;
}

export interface AuthUser {
  uid: string;
  displayName: string;
  avatarUrl: string;
  nickname: string;       // max 12 chars
  xp: number;
  level: Level;
  achievements: string[];
  purchasedPacks: string[];
  friends: string[];
  preferences: UserPreferences;
}

// ─── Deltas (server → client partial updates) ─────────────────────────────────

export interface GameStateDelta {
  type: string;
  payload: Partial<GameState>;
}

// ─── Public Game State ────────────────────────────────────────────────────────
// GameState with wordPair, votes, and all player role/word fields stripped.

export type PublicGameState = Omit<GameState, 'wordPair' | 'votes'>;

// ─── Pass and Play (Local Offline Mode) ──────────────────────────────────────

export type PnPPhase =
  | 'SETUP'
  | 'ROLE_REVEAL'
  | 'CLUE_PHASE'
  | 'DISCUSSION'
  | 'VOTING'
  | 'ELIMINATION'
  | 'MR_WHITE_GUESS'
  | 'GAME_OVER';

export type PnPRevealSubPhase =
  | 'COVER'        // black screen, "pass to [name]"
  | 'TAP_TO_SHOW'  // player has device, hasn't tapped yet
  | 'VISIBLE'      // word showing, countdown running
  | 'HIDDEN'       // auto-hidden, confirm button + 1 peek available
  | 'CONFIRMED';   // player confirmed, ready to pass to next

export type PnPVoteSubPhase =
  | 'COVER'        // black screen between voters
  | 'ACTIVE'       // current voter sees vote screen
  | 'TALLY';       // all votes cast, animate reveal

export type PlayerRole = 'CIVILIAN' | 'UNDERCOVER' | 'MR_WHITE';

export type WinnerFaction = 'CIVILIAN' | 'UNDERCOVER' | 'MR_WHITE';

export interface PnPPlayer {
  id: string;               // nanoid(), never shown in UI
  name: string;             // display name, unique per game
  role: PlayerRole;         // assigned at game start, hidden until reveal
  word: string | null;      // null for Mr. White
  isAlive: boolean;
  hasSeenWord: boolean;     // true after CONFIRMED in role reveal
  cluesThisRound: string[]; // one per round — empty string if timed out
  totalVotesReceived: number;
}

export interface PnPClue {
  playerId: string;
  clue: string;             // empty string = timeout/skip
  roundNumber: number;
  timedOut: boolean;
}

export interface PnPVote {
  voterId: string;
  targetId: string | null;  // null = abstain
}

export interface PnPRoundElimination {
  roundNumber: number;
  eliminatedPlayerId: string;
  eliminatedRole: PlayerRole;
  voteCount: number;
  wasTie: boolean;
  tieResolution: 'revote' | 'random' | 'skipped';
  mrWhiteGuess: string | null;
  mrWhiteGuessCorrect: boolean | null;
}

export interface PnPSettings {
  includeMrWhite: boolean;
  undercoverCount: 1 | 2;
  clueTimerSeconds: number | null;    // null = unlimited
  discussionTimerSeconds: number | null;
  tieResolution: 'revote' | 'random' | 'skip_round';
  wordPeekAllowed: boolean;           // allow players to re-peek word mid-game
  postEliminationReveal: boolean;     // show word when eliminated
  detectiveEnabled: boolean;
  silentRoundEnabled: boolean;
  category: string;
  difficulty: 'easy' | 'medium' | 'hard';
  maxPlayers: number;
}

export interface PnPGameState {
  // identity
  gameId: string;
  createdAt: number;
  
  // players
  players: PnPPlayer[];
  
  // game config
  settings: PnPSettings;
  wordPair: { civilian: string; undercover: string };
  
  // phase
  phase: PnPPhase;
  currentRound: number;
  
  // role reveal sub-state
  revealSubPhase: PnPRevealSubPhase;
  revealPlayerIndex: number;       // index into players[]
  revealPeekUsed: boolean;
  revealTimerStart: number | null; // Date.now() when word became visible
  
  // clue phase sub-state
  clueStartingPlayerId: string;    // rotates each round
  clueCurrentIndex: number;        // current turn index within alive players
  clues: PnPClue[];
  clueTimerStart: number | null;
  
  // discussion sub-state
  discussionTimerStart: number | null;
  
  // voting sub-state
  voteSubPhase: PnPVoteSubPhase;
  voteCurrentVoterIndex: number;   // index within alive players
  votes: PnPVote[];                // accumulates, revealed only at TALLY
  
  // elimination history
  eliminations: PnPRoundElimination[];
  
  // end state
  winner: WinnerFaction | null;
  finalRoleReveal: boolean;        // true when game over screen shows all roles
}
