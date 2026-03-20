import type { Socket, Server } from 'socket.io';
import type { GameState, PublicGameState, ClueEntry, WinFaction, Room } from '@undercover/shared';
import { getRoom, saveRoom } from '../managers/RoomManager';
import { WordSelector } from '../lib/wordSelector';
import { RoleDistributor } from '../lib/roleDistributor';
import { deliverRoles } from '../lib/roleDelivery';
import { EntitlementService } from '../lib/entitlementService';
import { redis } from '../lib/redis';
import { cancelTurnTimer, advanceTurn, allCluesSubmitted, startTurnTimer } from '../lib/clueManager';
import { cancelDiscussionTimer, scheduleDiscussionExpiry } from '../lib/discussionManager';
import { revealVotes, cancelVoteTimer, scheduleVoteExpiry } from '../lib/voteManager';
import { isWordGuessCorrect } from '../lib/wordGuess';
import { awardXP } from '../lib/progressionService';
import type { XPOutcome } from '../lib/progressionService';
import { evaluateAchievements } from '../lib/achievementService';
import type { AchievementContext } from '../lib/achievementService';
import { adminFirestore } from '../lib/firebase';
import { awardRoomLeaderboardPoints } from '../lib/roomLeaderboardService';

const GAME_TTL = 60 * 60 * 24; // 24 hours
const MR_WHITE_GUESS_TIMEOUT_MS = 10_000;
const SELF_REVEAL_TIMEOUT_MS = 15_000;
const ALLOWED_REACTIONS = new Set(['😂', '😭', '🤡', '💀', '👀', '🤯', '🙃', '😹']);
const lastReactionAtBySocket = new Map<string, number>();

// Tracks active Mr. White guess timers keyed by roomCode
const mrWhiteGuessTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Tracks active self-reveal timers keyed by roomCode
const selfRevealTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Starts a 10s server-side timeout for the Mr. White guess window.
 * If Mr. White doesn't guess in time, the window either advances to the
 * next round or continues into the final vote, depending on context.
 */
export function startMrWhiteGuessTimer(roomCode: string, io: Server): void {
  // Cancel any existing timer for this room
  cancelMrWhiteGuessTimer(roomCode);

  const timer = setTimeout(async () => {
    mrWhiteGuessTimers.delete(roomCode);
    try {
      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Only act if still in mr_white_guess phase (guard against race conditions)
      if (gameState.phase !== 'mr_white_guess') return;

      const room = await getRoom(roomCode);
      if (!room) return;

      const { advanceToNextRound } = await import('../lib/eliminationManager');
      await advanceToNextRound(io, roomCode, gameState, room);
    } catch {
      // Silently ignore errors in timer callback
    }
  }, MR_WHITE_GUESS_TIMEOUT_MS);

  mrWhiteGuessTimers.set(roomCode, timer);
}

/**
 * Cancels the active Mr. White guess timer for a room, if any.
 */
export function cancelMrWhiteGuessTimer(roomCode: string): void {
  const existing = mrWhiteGuessTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    mrWhiteGuessTimers.delete(roomCode);
  }
}

function getFinalConfrontationMrWhiteId(gameState: GameState, room: Room): string | null {
  if (gameState.phase !== 'mr_white_guess' || gameState.activePlayers.length !== 3) {
    return null;
  }

  const mrWhitePlayer = room.players.find(
    (player) => player.role === 'mr_white' && gameState.activePlayers.includes(player.id),
  );

  return mrWhitePlayer?.id ?? null;
}

/**
 * Starts a 15s server-side timeout for the self-reveal window.
 * If the Undercover player doesn't guess in time, they are eliminated normally.
 */
export function startSelfRevealTimer(
  roomCode: string,
  targetPlayerId: string,
  io: Server,
): void {
  cancelSelfRevealTimer(roomCode);

  const timer = setTimeout(async () => {
    selfRevealTimers.delete(roomCode);
    try {
      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Only act if still in self_reveal phase
      if (gameState.phase !== 'self_reveal') return;

      const room = await getRoom(roomCode);
      if (!room) return;

      // Clean up side-channel key
      await redis.del(`self_reveal:${roomCode}`);

      const { eliminatePlayer } = await import('../lib/eliminationManager');
      await eliminatePlayer(io, roomCode, gameState, targetPlayerId, room);
    } catch {
      // Silently ignore errors in timer callback
    }
  }, SELF_REVEAL_TIMEOUT_MS);

  selfRevealTimers.set(roomCode, timer);
}

/**
 * Cancels the active self-reveal timer for a room, if any.
 */
export function cancelSelfRevealTimer(roomCode: string): void {
  const existing = selfRevealTimers.get(roomCode);
  if (existing !== undefined) {
    clearTimeout(existing);
    selfRevealTimers.delete(roomCode);
  }
}

/**
 * Strip server-only fields from GameState to produce a PublicGameState
 * safe to broadcast to all room members.
 */
export function toPublicGameState(state: GameState): PublicGameState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { wordPair, votes, ...publicState } = state;
  return publicState;
}

/**
 * Awards XP to all authenticated players in a room after a game ends.
 * Builds an XPOutcome per player and calls awardXP for each.
 *
 * @param io       - Socket.IO server (used to find individual sockets)
 * @param room     - The Room object (contains player list with roles and userIds)
 * @param gameState - Final GameState (contains votes, round, winner)
 */
export async function awardXPForGame(
  io: Server,
  room: Room,
  gameState: GameState,
): Promise<void> {
  const winFaction: WinFaction | null = gameState.winner;

  // Determine which players voted correctly this round (voted for the eliminated player)
  const eliminatedId = gameState.eliminatedThisRound;
  const correctVoterIds = new Set<string>();
  if (eliminatedId) {
    for (const vote of gameState.votes) {
      if (vote.targetId === eliminatedId) {
        correctVoterIds.add(vote.voterId);
      }
    }
  }

  // Check daily bonus: stored in Redis as `daily_bonus:{uid}` with 24h TTL
  const dailyBonusChecks = await Promise.all(
    room.players.map(async (p) => {
      if (!p.userId) return false;
      const key = `daily_bonus:${p.userId}`;
      const existing = await redis.get<string>(key);
      if (!existing) {
        // First game today — set the key with 24h TTL
        await redis.set(key, '1', { ex: 60 * 60 * 24 });
        return true;
      }
      return false;
    }),
  );

  await Promise.all(
    room.players.map(async (player, idx) => {
      // Skip guests and players without a userId
      if (!player.userId || player.role === null) return;

      const isGuest = player.userId === null;
      const outcome: XPOutcome = {
        role: player.role,
        winFaction,
        roundsSurvived: gameState.round,
        correctVotes: correctVoterIds.has(player.id) ? 1 : 0,
        isDailyBonus: dailyBonusChecks[idx] ?? false,
        isGuest,
      };

      // Find the player's socket to emit xp:awarded
      const playerSocket = io.sockets.sockets.get(player.id);
      if (!playerSocket) return;

      try {
        await awardXP(player.userId, outcome, playerSocket);
      } catch {
        // Non-fatal — XP award failure should not crash the game
      }
    }),
  );
}

/**
 * Evaluates and grants achievements for all authenticated players after a game ends.
 * Builds an AchievementContext per player and calls evaluateAchievements for each.
 */
export async function evaluateAchievementsForGame(
  io: Server,
  room: Room,
  gameState: GameState,
): Promise<void> {
  const winFaction: WinFaction | null = gameState.winner;

  // Determine which players voted correctly (voted for the eliminated player)
  const eliminatedId = gameState.eliminatedThisRound;
  const correctVoterIds = new Set<string>();
  if (eliminatedId) {
    for (const vote of gameState.votes) {
      if (vote.targetId === eliminatedId) {
        correctVoterIds.add(vote.voterId);
      }
    }
  }

  // Determine who received votes this game (any round)
  const votedPlayerIds = new Set<string>(gameState.votes.map((v) => v.targetId));

  // Determine sole survivor: the last active civilian/detective when civilians win
  const activeCivilians = room.players.filter(
    (p) =>
      gameState.activePlayers.includes(p.id) &&
      (p.role === 'civilian' || p.role === 'detective'),
  );
  const isSoleSurvivorId =
    winFaction === 'civilian' && activeCivilians.length === 1
      ? activeCivilians[0].id
      : null;

  // Determine if this is a tournament win (last game of tournament)
  let isTournamentWin = false;
  if (room.config.mode === 'tournament') {
    const { isTournamentComplete } = await import('../lib/tournamentManager');
    isTournamentWin = await isTournamentComplete(room.code);
  }

  // Collect all player IDs in this game
  const playerIdsInGame = room.players.map((p) => p.id);

  await Promise.all(
    room.players.map(async (player) => {
      if (!player.userId || player.role === null) return;

      const playerSocket = io.sockets.sockets.get(player.id);
      if (!playerSocket) return;

      // Read lastPlayedDates from Firestore stats for streak calculation
      let lastPlayedDates: string[] = [];
      try {
        const snap = await adminFirestore.collection('users').doc(player.userId).get();
        if (snap.exists) {
          const data = snap.data();
          const lastPlayedAt = data?.stats?.lastPlayedAt as FirebaseFirestore.Timestamp | undefined;
          if (lastPlayedAt) {
            // Build a rough history from the stored lastPlayedAt date
            // The transaction in evaluateAchievements will append today's date
            lastPlayedDates = [lastPlayedAt.toDate().toISOString().slice(0, 10)];
          }
        }
      } catch {
        // Non-fatal — proceed without streak history
      }

      const ctx: AchievementContext = {
        uid: player.userId,
        isGuest: false,
        role: player.role,
        winFaction,
        totalPlayers: room.players.length,
        wasVoted: votedPlayerIds.has(player.id),
        correctVotes: correctVoterIds.has(player.id) ? 1 : 0,
        isSoleSurvivor: isSoleSurvivorId === player.id,
        mrWhiteGuessedCorrectly:
          player.role === 'mr_white' && winFaction === 'mr_white',
        isTournamentWin,
        wordCategory: gameState.wordPair?.category ?? '',
        playerIdsInGame,
        lastPlayedDates,
      };

      try {
        await evaluateAchievements(ctx, playerSocket);
      } catch {
        // Non-fatal — achievement evaluation failure should not crash the game
      }
    }),
  );
}

/**
 * Given a votes map (targetPlayerId → title → count), returns the winning title
 * per player. Ties are broken alphabetically (first title wins).
 */
function computeTitleResults(allVotes: Record<string, Record<string, number>>): Record<string, string> {
  const results: Record<string, string> = {};
  for (const [playerId, titleCounts] of Object.entries(allVotes)) {
    let winningTitle = '';
    let maxCount = 0;
    for (const [title, count] of Object.entries(titleCounts)) {
      if (count > maxCount || (count === maxCount && title < winningTitle)) {
        winningTitle = title;
        maxCount = count;
      }
    }
    if (winningTitle) results[playerId] = winningTitle;
  }
  return results;
}

export function registerGameHandlers(socket: Socket, io: Server): void {
  // game:clue_submit
  socket.on('game:clue_submit', async ({ clue }: { clue: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      // Sanitize: strip HTML tags, trim, enforce length
      const sanitized = String(clue ?? '').replace(/<[^>]*>/g, '').trim().slice(0, 60);
      if (!sanitized) {
        socket.emit('room:error', { message: 'Clue cannot be empty' });
        return;
      }

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Validate phase and turn
      if (gameState.phase !== 'clue') {
        socket.emit('room:error', { message: 'Not in clue phase' });
        return;
      }
      if (gameState.currentTurnPlayerId !== socket.id) {
        socket.emit('room:error', { message: 'Not your turn' });
        return;
      }

      const room = await getRoom(roomCode);
      if (!room) return;

      const player = room.players.find((p) => p.id === socket.id);
      const nickname = player?.nickname ?? socket.id;

      // Append ClueEntry
      const entry: ClueEntry = {
        playerId: socket.id,
        nickname,
        clue: sanitized,
        round: gameState.round,
        timestamp: Date.now(),
      };
      gameState.clueLog.push(entry);

      // Cancel any running turn timer
      cancelTurnTimer(roomCode);

      await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

      // Broadcast the submitted clue
      io.to(roomCode).emit('game:clue_submitted', { entry });

      // Check if all clues submitted → phase transition
      if (allCluesSubmitted(gameState)) {
        const { startDiscussionPhase } = await import('../lib/discussionManager');
        await startDiscussionPhase(io, roomCode, gameState);
        return;
      }

      // Advance to next player
      await advanceTurn(gameState, room, io);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit clue';
      socket.emit('room:error', { message });
    }
  });

  // game:player_ready
  socket.on('game:player_ready', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (rawState) {
        const gs: GameState =
          typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);
        // Only valid in role_reveal phase
        if (gs.phase !== 'role_reveal') {
          socket.emit('room:error', { message: 'Not in role reveal phase' });
          return;
        }
        // Only active players can confirm ready
        if (!gs.activePlayers.includes(socket.id)) {
          socket.emit('room:error', { message: 'You are not an active player' });
          return;
        }
      }

      const readyKey = `ready:${roomCode}`;

      // Add this player to the ready set
      await redis.sadd(readyKey, socket.id);
      await redis.expire(readyKey, GAME_TTL);

      // Load room to get active player count
      const room = await getRoom(roomCode);
      if (!room) return;

      const activePlayers = room.players.filter((p) => p.isActive && p.isConnected);
      const readyCount = await redis.scard(readyKey);

      if (readyCount >= activePlayers.length) {
        // All players ready — load game state and advance to clue phase
        const rawState = await redis.get<string>(`game:${roomCode}`);
        if (!rawState) return;

        const gameState: GameState = typeof rawState === 'string'
          ? JSON.parse(rawState)
          : (rawState as GameState);

        gameState.phase = 'clue';
        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        // Clean up ready set
        await redis.del(readyKey);

        const publicState = toPublicGameState(gameState);
        io.to(roomCode).emit('game:phase_changed', { phase: 'clue', state: publicState });

        // Start the clue phase turn order
        const { startCluePhase } = await import('../lib/clueManager');
        await startCluePhase(gameState, room, io);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process ready';
      socket.emit('room:error', { message });
    }
  });

  // host:extend_discussion
  socket.on('host:extend_discussion', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      // Only the host can extend
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can extend the discussion' });
        return;
      }

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Only valid in discussion phase with an active timer
      if (gameState.phase !== 'discussion' || gameState.phaseEndsAt === null) {
        socket.emit('room:error', { message: 'Cannot extend: not in timed discussion phase' });
        return;
      }

      // Add 30 seconds
      gameState.phaseEndsAt += 30_000;

      // Cancel existing timer and start a new one for the remaining time
      cancelDiscussionTimer(roomCode);
      const remaining = gameState.phaseEndsAt - Date.now();

      const { scheduleDiscussionExpiry } = await import('../lib/discussionManager');
      scheduleDiscussionExpiry(roomCode, remaining, io);

      // Persist updated state
      await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

      // Notify room of new timer value
      io.to(roomCode).emit('game:timer_update', { phaseEndsAt: gameState.phaseEndsAt });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to extend discussion';
      socket.emit('room:error', { message });
    }
  });

  // host:end_discussion
  socket.on('host:end_discussion', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      // Only the host can end discussion
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can end the discussion' });
        return;
      }

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      if (gameState.phase !== 'discussion') {
        socket.emit('room:error', { message: 'Not in discussion phase' });
        return;
      }

      // Cancel any running discussion timer
      cancelDiscussionTimer(roomCode);

      const { startVotePhase } = await import('../lib/voteManager');
      await startVotePhase(io, roomCode, gameState);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to end discussion';
      socket.emit('room:error', { message });
    }
  });

  // game:request_early_vote — any active player can request to skip to voting
  // If majority of active players request it, discussion ends immediately
  socket.on('game:request_early_vote', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      if (gameState.phase !== 'discussion') {
        socket.emit('room:error', { message: 'Not in discussion phase' });
        return;
      }

      if (!gameState.activePlayers.includes(socket.id)) {
        socket.emit('room:error', { message: 'You are not an active player' });
        return;
      }

      // Track early vote requests in Redis
      const earlyVoteKey = `early_vote:${roomCode}:${gameState.round}`;
      await redis.sadd(earlyVoteKey, socket.id);
      await redis.expire(earlyVoteKey, 300); // 5 min TTL

      const requestCount = await redis.scard(earlyVoteKey);
      const majority = Math.ceil(gameState.activePlayers.length / 2);

      // Get full set of requesters so every client knows if they already voted
      const requestedBySet = await redis.smembers(earlyVoteKey) as string[];

      // Broadcast current request count so clients can show progress
      io.to(roomCode).emit('game:early_vote_update', {
        requestCount,
        required: majority,
        requestedBy: requestedBySet,
      });

      if (requestCount >= majority) {
        // Majority reached — cancel timer and go to vote
        cancelDiscussionTimer(roomCode);
        await redis.del(earlyVoteKey);

        const { startVotePhase } = await import('../lib/voteManager');
        await startVotePhase(io, roomCode, gameState);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request early vote';
      socket.emit('room:error', { message });
    }
  });

  // game:vote_cast
  socket.on('game:vote_cast', async ({ targetId }: { targetId: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Must be in vote phase
      if (gameState.phase !== 'vote') {
        socket.emit('room:error', { message: 'Not in vote phase' });
        return;
      }

      // Voter must be an active player
      if (!gameState.activePlayers.includes(socket.id)) {
        socket.emit('room:error', { message: 'You are not an active player' });
        return;
      }

      // Target must be an active player
      if (!gameState.activePlayers.includes(targetId)) {
        socket.emit('room:error', { message: 'Target is not an active player' });
        return;
      }

      // Cannot vote for self
      if (targetId === socket.id) {
        socket.emit('room:error', { message: 'Cannot vote for yourself' });
        return;
      }

      // Cannot vote twice in the same round
      const alreadyVoted = gameState.votes.some(
        (v) => v.voterId === socket.id && v.round === gameState.round,
      );
      if (alreadyVoted) {
        socket.emit('room:error', { message: 'You have already voted this round' });
        return;
      }

      // Record the vote
      const voteRecord: import('@undercover/shared').VoteRecord = {
        voterId: socket.id,
        targetId,
        round: gameState.round,
      };
      gameState.votes.push(voteRecord);

      // Persist to Redis
      await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

      // Broadcast vote (no counts — hidden until reveal)
      io.to(roomCode).emit('game:vote_cast', { voterId: socket.id, targetId });

      // Check if all active players have voted this round
      const roundVotes = gameState.votes.filter((v) => v.round === gameState.round);
      if (roundVotes.length >= gameState.activePlayers.length) {
        cancelVoteTimer(roomCode);
        await revealVotes(roomCode, gameState, io);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cast vote';
      socket.emit('room:error', { message });
    }
  });

  // game:mr_white_guess
  socket.on('game:mr_white_guess', async ({ guess }: { guess: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Must be in mr_white_guess phase
      if (gameState.phase !== 'mr_white_guess') {
        socket.emit('room:error', { message: 'Not in Mr. White guess phase' });
        return;
      }

      const room = await getRoom(roomCode);
      if (!room) return;

      const finalConfrontationMrWhiteId = getFinalConfrontationMrWhiteId(gameState, room);
      const isEliminatedMrWhite = gameState.spectators.includes(socket.id);
      const isFinalConfrontationMrWhite = finalConfrontationMrWhiteId === socket.id;

      if (!isEliminatedMrWhite && !isFinalConfrontationMrWhite) {
        socket.emit('room:error', { message: 'Only Mr. White can submit a guess right now' });
        return;
      }

      const guessingPlayer = room.players.find((p) => p.id === socket.id);
      if (!guessingPlayer || guessingPlayer.role !== 'mr_white') {
        socket.emit('room:error', { message: 'Only Mr. White can submit a guess' });
        return;
      }

      // Civilians know wordA; undercover knows wordB
      const civilianWord = gameState.wordPair?.wordA;
      if (!civilianWord) {
        socket.emit('room:error', { message: 'Word pair not available' });
        return;
      }

      // Cancel the auto-expiry timer
      cancelMrWhiteGuessTimer(roomCode);

      const isCorrect = isWordGuessCorrect(guess, civilianWord);

      if (isCorrect) {
        // Mr. White wins
        gameState.winner = 'mr_white';
        gameState.phase = 'game_over';

        if (room.config.mode === 'tournament') {
          const { awardTournamentPoints } = await import('../lib/tournamentManager');
          const correctVoters = gameState.votes
            .filter((vote) => vote.targetId === gameState.eliminatedThisRound)
            .map((vote) => vote.voterId);
          const tournamentState = await awardTournamentPoints(roomCode, gameState, room, correctVoters);
          if (tournamentState) {
            gameState.tournamentScores = { ...tournamentState.scores };
          }
        }

        const roomLeaderboardScores = await awardRoomLeaderboardPoints(room, gameState);
        if (room.config.mode !== 'tournament') {
          gameState.tournamentScores = roomLeaderboardScores;
        }

        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        const publicState = toPublicGameState(gameState);
        io.to(roomCode).emit('game:winner', { winner: 'mr_white', state: publicState });

        // Award XP and evaluate achievements for all players
        void awardXPForGame(io, room, gameState);
        void evaluateAchievementsForGame(io, room, gameState);
      } else if (isFinalConfrontationMrWhite) {
        // Wrong guess — advance to next round
        const { startVotePhase } = await import('../lib/voteManager');
        await startVotePhase(io, roomCode, gameState);
      } else {
        const { advanceToNextRound } = await import('../lib/eliminationManager');
        await advanceToNextRound(io, roomCode, gameState, room);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process Mr. White guess';
      socket.emit('room:error', { message });
    }
  });

  // game:request_self_reveal
  socket.on('game:request_self_reveal', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Only valid during vote or elimination phase
      if (gameState.phase !== 'vote' && gameState.phase !== 'elimination') {
        socket.emit('room:error', { message: 'Self-reveal only available during vote or elimination phase' });
        return;
      }

      const room = await getRoom(roomCode);
      if (!room) return;

      // Only the Undercover player can request self-reveal for themselves
      const requestingPlayer = room.players.find((p) => p.id === socket.id);
      if (!requestingPlayer || requestingPlayer.role !== 'undercover') {
        socket.emit('room:error', { message: 'Only an Undercover player can request self-reveal' });
        return;
      }

      // Player must still be active
      if (!gameState.activePlayers.includes(socket.id)) {
        socket.emit('room:error', { message: 'You are not an active player' });
        return;
      }

      const selfRevealPlayerId = socket.id;

      // Store the self-reveal player ID in Redis side-channel
      await redis.set(`self_reveal:${roomCode}`, selfRevealPlayerId, { ex: GAME_TTL });

      // Update game state
      gameState.phase = 'self_reveal';
      gameState.phaseEndsAt = Date.now() + SELF_REVEAL_TIMEOUT_MS;

      await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

      // Broadcast phase change
      const publicState = toPublicGameState(gameState);
      io.to(roomCode).emit('game:phase_changed', {
        phase: 'self_reveal',
        selfRevealPlayerId,
        state: publicState,
      });

      // Start the 15s auto-expiry timer
      startSelfRevealTimer(roomCode, selfRevealPlayerId, io);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to request self-reveal';
      socket.emit('room:error', { message });
    }
  });

  // game:self_reveal_guess
  socket.on('game:self_reveal_guess', async ({ guess }: { guess: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Must be in self_reveal phase
      if (gameState.phase !== 'self_reveal') {
        socket.emit('room:error', { message: 'Not in self-reveal phase' });
        return;
      }

      // Verify this socket is the player in the self-reveal window
      const rawSelfRevealId = await redis.get<string>(`self_reveal:${roomCode}`);
      const selfRevealPlayerId =
        typeof rawSelfRevealId === 'string' ? rawSelfRevealId : (rawSelfRevealId as string | null);

      if (selfRevealPlayerId !== socket.id) {
        socket.emit('room:error', { message: 'You are not the player in the self-reveal window' });
        return;
      }

      const room = await getRoom(roomCode);
      if (!room) return;

      // Verify the player is actually Undercover
      const guessingPlayer = room.players.find((p) => p.id === socket.id);
      if (!guessingPlayer || guessingPlayer.role !== 'undercover') {
        socket.emit('room:error', { message: 'Only the Undercover player can submit a self-reveal guess' });
        return;
      }

      const civilianWord = gameState.wordPair?.wordA;
      if (!civilianWord) {
        socket.emit('room:error', { message: 'Word pair not available' });
        return;
      }

      // Cancel the auto-expiry timer
      cancelSelfRevealTimer(roomCode);

      // Clean up side-channel key
      await redis.del(`self_reveal:${roomCode}`);

      const isCorrect = isWordGuessCorrect(guess, civilianWord);

      if (isCorrect) {
        // Undercover wins by correctly naming the civilian word
        gameState.winner = 'undercover';
        gameState.phase = 'game_over';

        if (room.config.mode === 'tournament') {
          const { awardTournamentPoints } = await import('../lib/tournamentManager');
          const correctVoters = gameState.votes
            .filter((vote) => vote.targetId === gameState.eliminatedThisRound)
            .map((vote) => vote.voterId);
          const tournamentState = await awardTournamentPoints(roomCode, gameState, room, correctVoters);
          if (tournamentState) {
            gameState.tournamentScores = { ...tournamentState.scores };
          }
        }

        const roomLeaderboardScores = await awardRoomLeaderboardPoints(room, gameState);
        if (room.config.mode !== 'tournament') {
          gameState.tournamentScores = roomLeaderboardScores;
        }

        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        const publicState = toPublicGameState(gameState);
        io.to(roomCode).emit('game:winner', { winner: 'undercover', state: publicState });

        // Award XP and evaluate achievements for all players
        void awardXPForGame(io, room, gameState);
        void evaluateAchievementsForGame(io, room, gameState);
      } else {
        // Wrong guess — eliminate the player normally
        const { eliminatePlayer } = await import('../lib/eliminationManager');
        await eliminatePlayer(io, roomCode, gameState, socket.id, room);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process self-reveal guess';
      socket.emit('room:error', { message });
    }
  });

  // detective:accuse
  socket.on('detective:accuse', async ({ accusedId }: { accusedId: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Phase must be clue, discussion, or vote
      if (
        gameState.phase !== 'clue' &&
        gameState.phase !== 'discussion' &&
        gameState.phase !== 'vote'
      ) {
        socket.emit('room:error', { message: 'Accusation only allowed during clue, discussion, or vote phase' });
        return;
      }

      const room = await getRoom(roomCode);
      if (!room) return;

      // Socket must be an active player with role 'detective'
      const detectivePlayer = room.players.find((p) => p.id === socket.id);
      if (!detectivePlayer || detectivePlayer.role !== 'detective') {
        socket.emit('room:error', { message: 'Only the Detective can make an accusation' });
        return;
      }
      if (!gameState.activePlayers.includes(socket.id)) {
        socket.emit('room:error', { message: 'You are not an active player' });
        return;
      }

      // accusedId must be an active player
      if (!gameState.activePlayers.includes(accusedId)) {
        socket.emit('room:error', { message: 'Accused player is not active' });
        return;
      }

      // Cannot accuse self
      if (accusedId === socket.id) {
        socket.emit('room:error', { message: 'Cannot accuse yourself' });
        return;
      }

      const accusedPlayer = room.players.find((p) => p.id === accusedId);
      if (!accusedPlayer) return;

      const accusedRole = accusedPlayer.role;

      const { eliminatePlayer } = await import('../lib/eliminationManager');

      if (accusedRole === 'undercover' || accusedRole === 'mr_white') {
        // Correct accusation — eliminate the accused
        await eliminatePlayer(io, roomCode, gameState, accusedId, room);
        io.to(roomCode).emit('detective:accusation_result', {
          correct: true,
          accusedId,
          accusedRole,
        });
      } else {
        // Wrong accusation — eliminate the detective
        await eliminatePlayer(io, roomCode, gameState, socket.id, room);
        io.to(roomCode).emit('detective:accusation_result', {
          correct: false,
          accusedId,
          accusedRole,
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process accusation';
      socket.emit('room:error', { message });
    }
  });

  // host:pause — freeze all active timers
  socket.on('host:pause', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can pause the game' });
        return;
      }

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Already paused
      const alreadyPaused = await redis.get<string>(`pause:${roomCode}`);
      if (alreadyPaused) return;

      const now = Date.now();
      const remainingMs = gameState.phaseEndsAt !== null ? Math.max(0, gameState.phaseEndsAt - now) : null;

      // Cancel all active timers
      cancelTurnTimer(roomCode);
      cancelDiscussionTimer(roomCode);
      cancelVoteTimer(roomCode);
      cancelMrWhiteGuessTimer(roomCode);
      cancelSelfRevealTimer(roomCode);

      // Store pause metadata: remaining time and the phase that was paused
      await redis.set(
        `pause:${roomCode}`,
        JSON.stringify({ remainingMs, phase: gameState.phase }),
        { ex: GAME_TTL },
      );

      io.to(roomCode).emit('game:paused', { pausedAt: now, remainingMs });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to pause game';
      socket.emit('room:error', { message });
    }
  });

  // host:resume — restart timers with remaining time
  socket.on('host:resume', async () => {    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can resume the game' });
        return;
      }

      const rawPause = await redis.get<string>(`pause:${roomCode}`);
      if (!rawPause) {
        socket.emit('room:error', { message: 'Game is not paused' });
        return;
      }

      const { remainingMs, phase } = typeof rawPause === 'string'
        ? JSON.parse(rawPause) as { remainingMs: number | null; phase: string }
        : rawPause as { remainingMs: number | null; phase: string };

      // Remove pause key
      await redis.del(`pause:${roomCode}`);

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (!rawState) return;

      const gameState: GameState =
        typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

      // Restore phaseEndsAt based on remaining time
      if (remainingMs !== null) {
        gameState.phaseEndsAt = Date.now() + remainingMs;
        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        // Restart the appropriate timer
        if (phase === 'clue') {
          startTurnTimer(roomCode, Math.ceil(remainingMs / 1000), io);
        } else if (phase === 'discussion') {
          scheduleDiscussionExpiry(roomCode, remainingMs, io);
        } else if (phase === 'vote') {
          scheduleVoteExpiry(roomCode, remainingMs, io);
        } else if (phase === 'mr_white_guess') {
          startMrWhiteGuessTimer(roomCode, io);
        } else if (phase === 'self_reveal') {
          const rawSelfRevealId = await redis.get<string>(`self_reveal:${roomCode}`);
          const selfRevealPlayerId = typeof rawSelfRevealId === 'string' ? rawSelfRevealId : null;
          if (selfRevealPlayerId) {
            startSelfRevealTimer(roomCode, selfRevealPlayerId, io);
          }
        }
      }

      io.to(roomCode).emit('game:resumed', {
        resumedAt: Date.now(),
        phaseEndsAt: gameState.phaseEndsAt,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to resume game';
      socket.emit('room:error', { message });
    }
  });

  // host:reset_to_lobby — reset game state back to lobby, clear all round data
  socket.on('host:reset_to_lobby', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can reset to lobby' });
        return;
      }

      // Cancel all active timers
      cancelTurnTimer(roomCode);
      cancelDiscussionTimer(roomCode);
      cancelVoteTimer(roomCode);
      cancelMrWhiteGuessTimer(roomCode);
      cancelSelfRevealTimer(roomCode);

      // Clear pause state if any
      await redis.del(`pause:${roomCode}`);
      await redis.del(`self_reveal:${roomCode}`);

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (rawState) {
        const gameState: GameState =
          typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);
        await redis.del(
          `ready:${roomCode}`,
          `early_vote:${roomCode}:${gameState.round}`,
          `revote_restore:${roomCode}`,
          `title_votes:${roomCode}`,
          `title_voters:${roomCode}`,
        );
      }

      // Reset player roles/words and active status
      for (const player of room.players) {
        player.role = null;
        player.word = null;
        player.isActive = true;
        player.strikes = 0;
      }
      room.phase = 'lobby';
      room.lastActivityAt = Date.now();
      await saveRoom(room);

      // Delete game state from Redis
      await redis.del(`game:${roomCode}`);

      io.to(roomCode).emit('game:reset', { phase: 'lobby', players: room.players });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reset to lobby';
      socket.emit('room:error', { message });
    }
  });

  // host:end_game — terminate game immediately, emit game:winner with null faction
  socket.on('host:end_game', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can end the game' });
        return;
      }

      // Cancel all active timers
      cancelTurnTimer(roomCode);
      cancelDiscussionTimer(roomCode);
      cancelVoteTimer(roomCode);
      cancelMrWhiteGuessTimer(roomCode);
      cancelSelfRevealTimer(roomCode);

      const rawState = await redis.get<string>(`game:${roomCode}`);
      if (rawState) {
        const gameState: GameState =
          typeof rawState === 'string' ? JSON.parse(rawState) : (rawState as GameState);

        gameState.phase = 'game_over';
        gameState.winner = null;
        gameState.phaseEndsAt = null;

        await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

        const publicState = toPublicGameState(gameState);
        io.to(roomCode).emit('game:winner', { winner: null, state: publicState });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to end game';
      socket.emit('room:error', { message });
    }
  });

  // title:vote — post-game funny title voting
  socket.on('title:vote', async ({ targetPlayerId, title }: { targetPlayerId: string; title: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      // Only active (non-eliminated) players can vote
      const voter = room.players.find((p) => p.id === socket.id);
      if (!voter) return;

      // Target must be a player in the room
      const target = room.players.find((p) => p.id === targetPlayerId);
      if (!target) {
        socket.emit('room:error', { message: 'Target player not found' });
        return;
      }

      const votesKey = `title_votes:${roomCode}`;
      const TTL_10_MIN = 60 * 10;

      // Load existing votes
      const raw = await redis.get<string>(votesKey);
      const allVotes: Record<string, Record<string, number>> =
        raw ? (typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, Record<string, number>>)) : {};

      // Increment vote count
      if (!allVotes[targetPlayerId]) allVotes[targetPlayerId] = {};
      allVotes[targetPlayerId][title] = (allVotes[targetPlayerId][title] ?? 0) + 1;

      await redis.set(votesKey, JSON.stringify(allVotes), { ex: TTL_10_MIN });

      // Track who has voted using a Redis set
      const voterKey = `title_voters:${roomCode}`;
      await redis.sadd(voterKey, socket.id);
      await redis.expire(voterKey, TTL_10_MIN);

      const voterCount = await redis.scard(voterKey);
      const activePlayers = room.players.filter((p) => p.isActive);

      // If all active players have voted, emit results
      if (voterCount >= activePlayers.length) {
        const results = computeTitleResults(allVotes);
        io.to(roomCode).emit('title:results', results);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to cast title vote';
      socket.emit('room:error', { message });
    }
  });

  // title:finalize — host manually triggers title results
  socket.on('title:finalize', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) return;

      const room = await getRoom(roomCode);
      if (!room) return;

      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can finalize title voting' });
        return;
      }

      const votesKey = `title_votes:${roomCode}`;
      const raw = await redis.get<string>(votesKey);
      const allVotes: Record<string, Record<string, number>> =
        raw ? (typeof raw === 'string' ? JSON.parse(raw) : (raw as Record<string, Record<string, number>>)) : {};

      const results = computeTitleResults(allVotes);
      io.to(roomCode).emit('title:results', results);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to finalize title voting';
      socket.emit('room:error', { message });
    }
  });

  socket.on('game:reaction', async ({ emoji }: { emoji: string }) => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode || !ALLOWED_REACTIONS.has(emoji)) return;

      const now = Date.now();
      const lastSentAt = lastReactionAtBySocket.get(socket.id) ?? 0;
      if (now - lastSentAt < 1200) {
        return;
      }
      lastReactionAtBySocket.set(socket.id, now);

      const room = await getRoom(roomCode);
      if (!room || room.phase === 'lobby') return;

      const player = room.players.find((entry) => entry.id === socket.id);
      if (!player) return;

      io.to(roomCode).emit('game:reaction', {
        id: `${socket.id}:${now}`,
        emoji,
        playerId: player.id,
        nickname: player.nickname,
        avatarUrl: player.avatarUrl ?? null,
        timestamp: now,
      });
    } catch {
      // Ignore reaction failures so they never affect the game loop.
    }
  });

  // game:start
  socket.on('game:start', async () => {
    try {
      const roomCode = socket.data.roomCode as string | undefined;
      if (!roomCode) {
        socket.emit('room:error', { message: 'Not in a room' });
        return;
      }

      // Load room from Redis
      const room = await getRoom(roomCode);
      if (!room) {
        socket.emit('room:error', { message: 'Room not found' });
        return;
      }

      // Validate socket user is the host
      if (room.hostId !== socket.id) {
        socket.emit('room:error', { message: 'Only the host can start the game' });
        return;
      }

      if (room.phase !== 'lobby') {
        socket.emit('room:error', { message: 'Game is not in the lobby state' });
        return;
      }

      // Check minimum player count
      const activePlayers = room.players.filter((p) => p.isActive && p.isConnected);
      if (activePlayers.length < 3) {
        socket.emit('room:error', { message: 'At least 3 players are required to start' });
        return;
      }

      const configurationError = RoleDistributor.validateConfiguration(
        activePlayers.length,
        room.config.mode,
        room.config.detectiveEnabled,
      );
      if (configurationError) {
        socket.emit('room:error', { message: configurationError });
        return;
      }

      // Check entitlement for premium modes
      const hostUserId = socket.data.user?.uid as string | undefined;
      if (hostUserId) {
        const { entitled } = await EntitlementService.checkPremium(hostUserId, room.config.mode);
        if (!entitled) {
          socket.emit('room:error', {
            message: `Game mode "${room.config.mode}" requires a premium subscription`,
          });
          return;
        }
      }

      // Select word pair (custom or from DB)
      let wordPair = room.config.customWordPair;
      if (!wordPair) {
        wordPair = await WordSelector.selectPair({
          categories: room.config.categories,
          difficulty: room.config.difficulty,
          roomCode,
        });
      }

      // Distribute roles
      const playerIds = activePlayers.map((p) => p.id);
      const assignments = RoleDistributor.distribute(
        playerIds,
        room.config.mode,
        room.config.detectiveEnabled,
        wordPair,
      );

      // Build player socket map (playerId → socketId; here player.id IS the socketId)
      const playerSocketMap: Record<string, string> = {};
      for (const player of activePlayers) {
        playerSocketMap[player.id] = player.id;
      }

      // Deliver roles privately
      await deliverRoles(roomCode, assignments, playerSocketMap, io);

      // Update player roles in room (for server-side logic only; never broadcast role/word)
      const assignmentMap = new Map(assignments.map((a) => [a.playerId, a]));
      for (const player of room.players) {
        const assignment = assignmentMap.get(player.id);
        if (assignment) {
          player.role = assignment.role;
          player.word = assignment.word;
        }
      }

      // Initialize GameState in Redis
      const gameState: GameState = {
        roomCode,
        round: 1,
        phase: 'role_reveal',
        activePlayers: playerIds,
        spectators: [],
        clueLog: [],
        votes: [],
        currentTurnPlayerId: null,
        wordPair,
        eliminatedThisRound: null,
        winner: null,
        tournamentScores: null,
        phaseEndsAt: null,
      };

      // For tournament mode, initialise cumulative scores
      if (room.config.mode === 'tournament') {
        const { initTournament } = await import('../lib/tournamentManager');
        const ts = await initTournament(roomCode, playerIds);
        gameState.tournamentScores = { ...ts.scores };
      }

      await redis.set(`game:${roomCode}`, JSON.stringify(gameState), { ex: GAME_TTL });

      // Update room phase
      room.phase = 'role_reveal';
      room.lastActivityAt = Date.now();
      await saveRoom(room);

      // Broadcast phase change with PublicGameState (strips wordPair, votes, player role/word)
      const publicState = toPublicGameState(gameState);
      io.to(roomCode).emit('game:phase_changed', {
        phase: 'role_reveal',
        state: publicState,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      socket.emit('room:error', { message });
    }
  });
}
