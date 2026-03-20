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
