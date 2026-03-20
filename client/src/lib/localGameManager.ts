/**
 * LocalGameManager
 *
 * Runs the full Undercover game loop on a single device (pass-and-play)
 * without any network connection. Mirrors the server-side game engine.
 *
 * Architecture:
 *  - Pure client-side class with an EventEmitter-like interface so existing
 *    screens can subscribe to the same event names used by Socket.IO.
 *  - State is stored in a Zustand-compatible snapshot that callers can read.
 *  - Word pairs are loaded from IndexedDB cache (populated by the Service
 *    Worker / online fetch); falls back to a small built-in stub set.
 */

import type {
  Player,
  GameConfig,
  WordPair,
  Role,
  GamePhase,
  ClueEntry,
  VoteRecord,
  WinFaction,
} from '../../../shared/types';

// ─── Role distribution table (mirrors server/src/lib/roleDistributor.ts) ─────

const DISTRIBUTION: Record<number, [number, number, number]> = {
  3:  [2, 1, 0],
  4:  [3, 1, 0],
  5:  [3, 1, 1],
  6:  [4, 1, 1],
  7:  [5, 1, 1],
  8:  [5, 2, 1],
  9:  [6, 2, 1],
  10: [7, 2, 1],
  11: [7, 3, 1],
  12: [8, 3, 1],
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── IndexedDB word-pair cache helpers ───────────────────────────────────────

const IDB_DB_NAME = 'undercover-local';
const IDB_STORE   = 'word-pairs';
const IDB_VERSION = 2; // keep in sync with offlineQueue.ts

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_DB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('word-pairs')) {
        db.createObjectStore('word-pairs', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function cacheWordPairs(pairs: WordPair[]): Promise<void> {
  const db = await openIDB();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  const store = tx.objectStore(IDB_STORE);
  for (const pair of pairs) store.put(pair);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

export async function loadCachedWordPairs(): Promise<WordPair[]> {
  try {
    const db = await openIDB();
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result as WordPair[]);
      req.onerror   = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

// ─── Minimal built-in stub pairs (offline fallback when IDB is empty) ────────

const STUB_PAIRS: WordPair[] = [
  { id: 'stub-1', wordA: 'Coffee', wordB: 'Tea', category: 'food', difficulty: 'easy', language: 'en', region: 'global', ageGroup: 'all' },
  { id: 'stub-2', wordA: 'Cat', wordB: 'Dog', category: 'animals', difficulty: 'easy', language: 'en', region: 'global', ageGroup: 'all' },
  { id: 'stub-3', wordA: 'Guitar', wordB: 'Violin', category: 'music', difficulty: 'medium', language: 'en', region: 'global', ageGroup: 'all' },
  { id: 'stub-4', wordA: 'Football', wordB: 'Rugby', category: 'sports', difficulty: 'medium', language: 'en', region: 'global', ageGroup: 'all' },
  { id: 'stub-5', wordA: 'Ocean', wordB: 'Sea', category: 'nature', difficulty: 'easy', language: 'en', region: 'global', ageGroup: 'all' },
];

const LOCAL_ELIMINATION_DELAY_MS = 1500;

function normalizeGuess(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// ─── Local game state ─────────────────────────────────────────────────────────

export interface LocalGameState {
  phase: GamePhase;
  round: number;
  players: Player[];
  activePlayers: string[];
  spectators: string[];
  clueLog: ClueEntry[];
  votes: VoteRecord[];
  currentTurnPlayerId: string | null;
  eliminatedThisRound: string | null;
  revealedEliminationRole: Role | null;
  winner: WinFaction | null;
  wordPair: WordPair | null;
  /** Index into activePlayers for the current role-reveal handoff */
  revealIndex: number;
}

// ─── Event types ──────────────────────────────────────────────────────────────

type LocalEventMap = {
  'phase_changed':    { phase: GamePhase; state: LocalGameState };
  'role_assigned':    { playerId: string; role: Role; word: string | null };
  'clue_submitted':   { entry: ClueEntry };
  'turn_changed':     { playerId: string };
  'votes_revealed':   { votes: VoteRecord[]; tally: Record<string, number>; eliminatedPlayerId: string | null; isTie: boolean };
  'tie_broken':       { eliminatedPlayerId: string; strategy: string };
  'elimination':      { playerId: string; role?: Role };
  'winner':           { faction: WinFaction };
  'handoff_required': { playerId: string; nickname: string };
  'error':            { message: string };
};

type Listener<K extends keyof LocalEventMap> = (payload: LocalEventMap[K]) => void;

// ─── LocalGameManager ─────────────────────────────────────────────────────────

export class LocalGameManager {
  private listeners: { [K in keyof LocalEventMap]?: Listener<K>[] } = {};
  private state: LocalGameState;
  private config: GameConfig;
  /** Private role/word map — never exposed in state */
  private roleMap: Map<string, { role: Role; word: string | null }> = new Map();
  private usedWordPairIds: Set<string> = new Set();

  constructor(players: Player[], config: GameConfig) {
    this.config = config;
    this.state = {
      phase: 'lobby',
      round: 0,
      players: [...players],
      activePlayers: players.map((p) => p.id),
      spectators: [],
      clueLog: [],
      votes: [],
      currentTurnPlayerId: null,
      eliminatedThisRound: null,
      revealedEliminationRole: null,
      winner: null,
      wordPair: null,
      revealIndex: 0,
    };
  }

  // ── Event emitter ────────────────────────────────────────────────────────

  on<K extends keyof LocalEventMap>(event: K, listener: Listener<K>): this {
    if (!this.listeners[event]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listeners as any)[event] = [];
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.listeners[event] as any[]).push(listener);
    return this;
  }

  off<K extends keyof LocalEventMap>(event: K, listener: Listener<K>): this {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = this.listeners[event] as any[] | undefined;
    if (arr) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (this.listeners as any)[event] = arr.filter((l) => l !== listener);
    }
    return this;
  }

  private emit<K extends keyof LocalEventMap>(event: K, payload: LocalEventMap[K]): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    arr?.forEach((l) => l(payload));
  }

  private emitState(): void {
    this.emit('phase_changed', { phase: this.state.phase, state: this.state });
  }

  // ── Public state accessor ────────────────────────────────────────────────

  getState(): Readonly<LocalGameState> {
    return this.state;
  }

  getRoleForPlayer(playerId: string): { role: Role; word: string | null } | undefined {
    return this.roleMap.get(playerId);
  }

  // ── Game start ───────────────────────────────────────────────────────────

  async startGame(): Promise<void> {
    const wordPair = await this.selectWordPair();
    if (!wordPair) {
      this.emit('error', { message: 'No word pairs available. Please go online to load words.' });
      return;
    }

    this.state = {
      ...this.state,
      phase: 'role_reveal',
      round: 1,
      wordPair,
      activePlayers: this.state.players.map((p) => p.id),
      spectators: [],
      clueLog: [],
      votes: [],
      eliminatedThisRound: null,
      revealedEliminationRole: null,
      winner: null,
      revealIndex: 0,
    };

    this.distributeRoles(wordPair);
    this.emitState();
    this.startNextHandoff();
  }

  // ── Role reveal / handoff ────────────────────────────────────────────────

  /** Called by PassAndPlayScreen when the current player taps "Ready" */
  confirmHandoff(): void {
    const { revealIndex, activePlayers } = this.state;
    const playerId = activePlayers[revealIndex];
    const assignment = this.roleMap.get(playerId);
    if (!assignment) return;

    this.emit('role_assigned', { playerId, role: assignment.role, word: assignment.word });
  }

  /** Called by RoleRevealScreen when the player taps "I'm Ready" */
  playerReadyAfterReveal(): void {
    const { revealIndex, activePlayers } = this.state;
    const nextIndex = revealIndex + 1;

    if (nextIndex < activePlayers.length) {
      this.state = { ...this.state, revealIndex: nextIndex };
      this.startNextHandoff();
    } else {
      // All players have seen their roles — start clue phase
      this.startCluePhase();
    }
  }

  private startNextHandoff(): void {
    const { revealIndex, activePlayers, players } = this.state;
    const playerId = activePlayers[revealIndex];
    const player = players.find((p) => p.id === playerId);
    if (!player) return;
    this.emit('handoff_required', { playerId, nickname: player.nickname });
  }

  // ── Clue phase ───────────────────────────────────────────────────────────

  private startCluePhase(): void {
    const shuffledActivePlayers = shuffle(this.state.activePlayers);
    const firstPlayer = shuffledActivePlayers[0];
    this.state = {
      ...this.state,
      phase: 'clue',
      activePlayers: shuffledActivePlayers,
      currentTurnPlayerId: firstPlayer,
      clueLog: this.state.round === 1 ? [] : this.state.clueLog,
    };
    this.emit('phase_changed', { phase: 'clue', state: this.state });
    this.emit('turn_changed', { playerId: firstPlayer });
  }

  submitClue(playerId: string, clue: string): void {
    if (this.state.phase !== 'clue') {
      this.emit('error', { message: 'Not in clue phase' });
      return;
    }
    if (this.state.currentTurnPlayerId !== playerId) {
      this.emit('error', { message: 'Not your turn' });
      return;
    }

    const player = this.state.players.find((p) => p.id === playerId);
    const entry: ClueEntry = {
      playerId,
      nickname: player?.nickname ?? playerId,
      clue,
      round: this.state.round,
      timestamp: Date.now(),
    };

    const newLog = [...this.state.clueLog, entry];
    const nextPlayer = this.getNextActiveTurnPlayer(playerId);

    if (!nextPlayer) {
      // All players have submitted — move to discussion
      this.state = { ...this.state, clueLog: newLog, currentTurnPlayerId: null };
      this.emitState();
      this.emit('clue_submitted', { entry });
      this.startDiscussionPhase();
    } else {
      this.state = { ...this.state, clueLog: newLog, currentTurnPlayerId: nextPlayer };
      this.emitState();
      this.emit('clue_submitted', { entry });
      this.emit('turn_changed', { playerId: nextPlayer });
    }
  }

  private getNextActiveTurnPlayer(currentId: string): string | null {
    const { activePlayers } = this.state;
    const idx = activePlayers.indexOf(currentId);
    if (idx === -1 || idx === activePlayers.length - 1) return null;
    return activePlayers[idx + 1];
  }

  // ── Discussion phase ─────────────────────────────────────────────────────

  private startDiscussionPhase(): void {
    this.state = { ...this.state, phase: 'discussion' };
    this.emit('phase_changed', { phase: 'discussion', state: this.state });
  }

  endDiscussion(): void {
    this.startVotePhase();
  }

  // ── Vote phase ───────────────────────────────────────────────────────────

  private startVotePhase(): void {
    this.state = { ...this.state, phase: 'vote', votes: [] };
    this.emit('phase_changed', { phase: 'vote', state: this.state });
  }

  castVote(voterId: string, targetId: string): void {
    if (this.state.phase !== 'vote') {
      this.emit('error', { message: 'Not in vote phase' });
      return;
    }
    if (!this.state.activePlayers.includes(voterId)) {
      this.emit('error', { message: 'Voter is not active' });
      return;
    }
    if (!this.state.activePlayers.includes(targetId)) {
      this.emit('error', { message: 'Target is not active' });
      return;
    }
    if (voterId === targetId) {
      this.emit('error', { message: 'Cannot vote for yourself' });
      return;
    }
    if (this.state.votes.some((v) => v.voterId === voterId)) {
      this.emit('error', { message: 'Already voted' });
      return;
    }

    const vote: VoteRecord = { voterId, targetId, round: this.state.round };
    const newVotes = [...this.state.votes, vote];
    this.state = { ...this.state, votes: newVotes };
    this.emitState();

    // Check if all active players have voted
    if (newVotes.length >= this.state.activePlayers.length) {
      this.revealVotes(newVotes);
    }
  }

  /** Host/timer can force reveal before all votes are in */
  forceRevealVotes(): void {
    this.revealVotes(this.state.votes);
  }

  private revealVotes(votes: VoteRecord[]): void {
    const tally: Record<string, number> = {};
    for (const v of votes) {
      tally[v.targetId] = (tally[v.targetId] ?? 0) + 1;
    }

    if (Object.keys(tally).length === 0) {
      this.emit('votes_revealed', { votes, tally, isTie: false, eliminatedPlayerId: null });
      this.advanceRound();
      return;
    }

    const maxVotes = Math.max(...Object.values(tally));
    const tied = Object.keys(tally).filter((id) => tally[id] === maxVotes);
    const isTie = tied.length > 1;

    let eliminatedId: string | null = null;
    if (!isTie) {
      eliminatedId = tied[0]!;
    } else {
      switch (this.config.tieResolution) {
        case 'random':
          eliminatedId = tied[Math.floor(Math.random() * tied.length)]!;
          break;
        case 're_vote':
        case 'all_survive':
          // Eliminated ID remains null
          break;
      }
    }

    this.emit('votes_revealed', { votes, tally, eliminatedPlayerId: eliminatedId, isTie });

    if (!isTie) {
      this.eliminatePlayer(eliminatedId!);
      return;
    }

    // Handle Tie Consequences
    switch (this.config.tieResolution) {
      case 'all_survive':
        this.advanceRound();
        break;
      case 'random':
        this.emit('tie_broken', { eliminatedPlayerId: eliminatedId!, strategy: 'random' });
        this.eliminatePlayer(eliminatedId!);
        break;
      case 're_vote':
        this.state = { 
          ...this.state, 
          votes: this.state.votes.filter((v) => v.round !== this.state.round),
        };
        this.emitState();
        break;
    }
  }

  private resolveElimination(tally: Record<string, number>): void {
    const maxVotes = Math.max(...Object.values(tally));
    const tied = Object.keys(tally).filter((id) => tally[id] === maxVotes);

    let eliminatedId: string | null = null;

    if (tied.length === 1) {
      eliminatedId = tied[0];
    } else {
      // Tie resolution
      switch (this.config.tieResolution) {
        case 'all_survive':
          this.advanceRound();
          return;
        case 'random':
          eliminatedId = tied[Math.floor(Math.random() * tied.length)];
          break;
        case 're_vote':
          // Simplified: random among tied for local mode
          eliminatedId = tied[Math.floor(Math.random() * tied.length)];
          break;
      }
    }

    if (!eliminatedId) {
      this.advanceRound();
      return;
    }

    this.eliminatePlayer(eliminatedId);
  }

  // ── Elimination ──────────────────────────────────────────────────────────

  private eliminatePlayer(playerId: string): void {
    const assignment = this.roleMap.get(playerId);
    const role = assignment?.role;

    const newActive = this.state.activePlayers.filter((id) => id !== playerId);
    const newSpectators = [...this.state.spectators, playerId];

    this.state = {
      ...this.state,
      phase: 'elimination',
      activePlayers: newActive,
      spectators: newSpectators,
      eliminatedThisRound: playerId,
      revealedEliminationRole: this.config.postEliminationReveal ? role ?? null : null,
    };

    this.emit('elimination', {
      playerId,
      role: this.config.postEliminationReveal ? role : undefined,
    });
    this.emit('phase_changed', { phase: 'elimination', state: this.state });

    setTimeout(() => {
      if (role === 'mr_white') {
        this.state = { ...this.state, phase: 'mr_white_guess' };
        this.emit('phase_changed', { phase: 'mr_white_guess', state: this.state });
        return;
      }

      this.checkWinCondition();
    }, LOCAL_ELIMINATION_DELAY_MS);
  }

  submitMrWhiteGuess(guess: string): void {
    const wordPair = this.state.wordPair;
    const correct =
      wordPair !== null &&
      normalizeGuess(guess) === normalizeGuess(wordPair.wordA);

    if (correct) {
      this.declareWinner('mr_white');
    } else if (this.shouldEnterFinalConfrontation()) {
      this.startVotePhase();
    } else {
      this.checkWinCondition();
    }
  }

  // ── Win condition ────────────────────────────────────────────────────────

  private checkWinCondition(): void {
    const winner = this.evaluateWinCondition();
    if (winner) {
      this.declareWinner(winner);
    } else {
      this.advanceRound();
    }
  }

  private evaluateWinCondition(): WinFaction | null {
    const { activePlayers } = this.state;

    const activeRoles = activePlayers.map((id) => this.roleMap.get(id)?.role);
    const undercoverCount = activeRoles.filter((r) => r === 'undercover').length;
    const mrWhiteCount    = activeRoles.filter((r) => r === 'mr_white').length;
    const civilianCount   = activeRoles.filter((r) => r === 'civilian' || r === 'detective').length;

    // Civilian win: all undercover + mr_white eliminated, ≥2 civilians remain
    if (undercoverCount === 0 && mrWhiteCount === 0 && civilianCount >= 1) {
      return 'civilian';
    }

    // Undercover win: undercover count ≥ civilian count
    if (undercoverCount >= civilianCount) {
      return 'undercover';
    }

    // Mr. White only wins passively as the last player standing.
    if (mrWhiteCount > 0 && activePlayers.length === 1) {
      return 'mr_white';
    }

    return null;
  }

  private declareWinner(faction: WinFaction): void {
    this.state = { ...this.state, phase: 'game_over', winner: faction };
    this.emit('winner', { faction });
    this.emit('phase_changed', { phase: 'game_over', state: this.state });
  }

  // ── Round advance ────────────────────────────────────────────────────────

  private advanceRound(): void {
    if (this.shouldEnterFinalConfrontation()) {
      this.state = {
        ...this.state,
        phase: 'mr_white_guess',
        currentTurnPlayerId: null,
        votes: [],
      };
      this.emitState();
      return;
    }

    this.state = {
      ...this.state,
      round: this.state.round + 1,
      eliminatedThisRound: null,
      revealedEliminationRole: null,
      revealIndex: 0,
    };
    this.startCluePhase();
  }

  private shouldEnterFinalConfrontation(): boolean {
    if (this.state.activePlayers.length !== 3) {
      return false;
    }

    return this.state.activePlayers.some(
      (playerId) => this.roleMap.get(playerId)?.role === 'mr_white',
    );
  }

  // ── Role distribution ────────────────────────────────────────────────────

  private distributeRoles(wordPair: WordPair): void {
    const { activePlayers } = this.state;
    const n = activePlayers.length;
    const dist = DISTRIBUTION[n];

    if (!dist) {
      this.emit('error', { message: `No distribution for ${n} players` });
      return;
    }

    const [civilians, undercovers, mrWhites] = dist;
    const roles: Role[] = [
      ...Array<Role>(civilians).fill('civilian'),
      ...Array<Role>(undercovers).fill('undercover'),
      ...Array<Role>(mrWhites).fill('mr_white'),
    ];

    const shuffledPlayers = shuffle(activePlayers);
    const shuffledRoles   = shuffle(roles);

    this.roleMap.clear();
    shuffledPlayers.forEach((playerId, i) => {
      const role = shuffledRoles[i];
      const word =
        role === 'civilian' || role === 'detective'
          ? wordPair.wordA
          : role === 'undercover'
          ? wordPair.wordB
          : null;
      this.roleMap.set(playerId, { role, word });
    });
  }

  // ── Word pair selection ──────────────────────────────────────────────────

  private async selectWordPair(): Promise<WordPair | null> {
    let pairs = await loadCachedWordPairs();

    if (pairs.length === 0) {
      pairs = STUB_PAIRS;
    }

    const { categories, difficulty } = this.config;
    const filtered = pairs.filter(
      (p) =>
        (categories.length === 0 || categories.includes('any') || categories.includes(p.category)) &&
        p.difficulty === difficulty
    );

    // Anti-repeat
    const unused = filtered.filter((p) => !this.usedWordPairIds.has(p.id));
    const pool = unused.length > 0 ? unused : filtered;

    if (pool.length === 0) return null;

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    this.usedWordPairIds.add(chosen.id);
    return chosen;
  }
}
