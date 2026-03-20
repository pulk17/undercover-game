import type { Socket } from 'socket.io';
import type { Role, WinFaction } from '@undercover/shared';
import { adminFirestore } from './firebase';
import * as admin from 'firebase-admin';

export interface AchievementContext {
  uid: string;
  isGuest: boolean;
  role: Role;
  winFaction: WinFaction | null;
  totalPlayers: number;
  wasVoted: boolean;           // did this player receive any votes this game?
  correctVotes: number;        // how many correct votes this player cast
  isSoleSurvivor: boolean;     // last civilian standing?
  mrWhiteGuessedCorrectly: boolean;
  isTournamentWin: boolean;
  wordCategory: string;
  playerIdsInGame: string[];   // all player IDs in this game
  lastPlayedDates: string[];   // ISO date strings of previous play dates (from Firestore stats)
}

interface UserStats {
  correctVotes: number;
  categoriesPlayed: string[];
  uniquePlayerIds: string[];
  lastPlayedAt: FirebaseFirestore.Timestamp | null;
}

interface UserDoc {
  achievements: string[];
  stats: Partial<UserStats>;
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for a given Date.
 */
function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Checks whether the given sorted array of ISO date strings contains
 * 7 consecutive calendar days ending on (or including) today.
 */
function hasSevenDayStreak(dates: string[]): boolean {
  if (dates.length < 7) return false;

  // Deduplicate and sort
  const unique = Array.from(new Set(dates)).sort();
  if (unique.length < 7) return false;

  // Slide a window looking for 7 consecutive days
  for (let i = 0; i <= unique.length - 7; i++) {
    let consecutive = true;
    for (let j = 1; j < 7; j++) {
      const prev = new Date(unique[i + j - 1]);
      const curr = new Date(unique[i + j]);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays !== 1) {
        consecutive = false;
        break;
      }
    }
    if (consecutive) return true;
  }
  return false;
}

/**
 * Evaluates all 10 achievement criteria for a player after a game ends.
 * Skips entirely for guests. Grants each achievement at most once.
 * Emits `achievement:unlocked` for each newly granted achievement.
 * Persists all updates to Firestore in a single transaction.
 */
export async function evaluateAchievements(
  ctx: AchievementContext,
  socket: Socket,
): Promise<void> {
  if (ctx.isGuest) return;

  const userRef = adminFirestore.collection('users').doc(ctx.uid);

  await adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists ? (snap.data() as Partial<UserDoc>) : {};

    const currentAchievements: string[] = data.achievements ?? [];
    const stats = data.stats ?? {};

    const alreadyUnlocked = new Set(currentAchievements);
    const newlyUnlocked: string[] = [];

    // ── Cumulative stats (read current values, compute updated values) ──────

    const prevCorrectVotes: number = stats.correctVotes ?? 0;
    const newCorrectVotes = prevCorrectVotes + ctx.correctVotes;

    const prevCategories: string[] = stats.categoriesPlayed ?? [];
    const newCategories = prevCategories.includes(ctx.wordCategory)
      ? prevCategories
      : [...prevCategories, ctx.wordCategory];

    const prevUniquePlayers: string[] = stats.uniquePlayerIds ?? [];
    const incomingNew = ctx.playerIdsInGame.filter(
      (id) => id !== ctx.uid && !prevUniquePlayers.includes(id),
    );
    const newUniquePlayers = [...prevUniquePlayers, ...incomingNew];

    // Build the full list of played dates including today for streak check
    const todayStr = toDateString(new Date());
    const allPlayedDates = [...ctx.lastPlayedDates, todayStr];

    // ── Evaluate each achievement ────────────────────────────────────────────

    // 1. first_spy — win first game as Undercover
    if (
      !alreadyUnlocked.has('first_spy') &&
      ctx.role === 'undercover' &&
      ctx.winFaction === 'undercover'
    ) {
      newlyUnlocked.push('first_spy');
    }

    // 2. ghost — survive a full game without being voted
    if (!alreadyUnlocked.has('ghost') && !ctx.wasVoted) {
      newlyUnlocked.push('ghost');
    }

    // 3. sharpshooter — correctly vote the Undercover 3 times (cumulative)
    if (!alreadyUnlocked.has('sharpshooter') && newCorrectVotes >= 3) {
      newlyUnlocked.push('sharpshooter');
    }

    // 4. mind_reader — correctly guess civilian word as Mr. White
    if (
      !alreadyUnlocked.has('mind_reader') &&
      ctx.role === 'mr_white' &&
      ctx.mrWhiteGuessedCorrectly
    ) {
      newlyUnlocked.push('mind_reader');
    }

    // 5. last_standing — win as the sole surviving Civilian
    if (
      !alreadyUnlocked.has('last_standing') &&
      (ctx.role === 'civilian' || ctx.role === 'detective') &&
      ctx.winFaction === 'civilian' &&
      ctx.isSoleSurvivor
    ) {
      newlyUnlocked.push('last_standing');
    }

    // 6. silver_tongue — win as Undercover with 8+ players
    if (
      !alreadyUnlocked.has('silver_tongue') &&
      ctx.role === 'undercover' &&
      ctx.winFaction === 'undercover' &&
      ctx.totalPlayers >= 8
    ) {
      newlyUnlocked.push('silver_tongue');
    }

    // 7. seven_day_streak — play on 7 consecutive days
    if (!alreadyUnlocked.has('seven_day_streak') && hasSevenDayStreak(allPlayedDates)) {
      newlyUnlocked.push('seven_day_streak');
    }

    // 8. globetrotter — play in 5 different word categories (cumulative)
    if (!alreadyUnlocked.has('globetrotter') && newCategories.length >= 5) {
      newlyUnlocked.push('globetrotter');
    }

    // 9. champion — win a Tournament Mode
    if (!alreadyUnlocked.has('champion') && ctx.isTournamentWin) {
      newlyUnlocked.push('champion');
    }

    // 10. social_butterfly — play with 10 unique players (cumulative)
    if (!alreadyUnlocked.has('social_butterfly') && newUniquePlayers.length >= 10) {
      newlyUnlocked.push('social_butterfly');
    }

    // ── Persist updates ──────────────────────────────────────────────────────

    if (newlyUnlocked.length > 0 || incomingNew.length > 0 || ctx.correctVotes > 0) {
      const updates: Record<string, unknown> = {
        'stats.correctVotes': newCorrectVotes,
        'stats.categoriesPlayed': newCategories,
        'stats.uniquePlayerIds': newUniquePlayers,
        'stats.lastPlayedAt': admin.firestore.FieldValue.serverTimestamp(),
      };

      if (newlyUnlocked.length > 0) {
        updates['achievements'] = admin.firestore.FieldValue.arrayUnion(...newlyUnlocked);
      }

      tx.set(userRef, updates, { merge: true });
    } else {
      // Always update lastPlayedAt and cumulative stats even if no new achievements
      tx.set(
        userRef,
        {
          'stats.correctVotes': newCorrectVotes,
          'stats.categoriesPlayed': newCategories,
          'stats.uniquePlayerIds': newUniquePlayers,
          'stats.lastPlayedAt': admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    // Emit outside transaction (after commit) — we'll collect and emit after
    // Store on the context object for post-transaction emission
    (ctx as AchievementContext & { _newlyUnlocked?: string[] })._newlyUnlocked = newlyUnlocked;
  });

  // Emit achievement:unlocked for each newly granted achievement
  const newlyUnlocked =
    (ctx as AchievementContext & { _newlyUnlocked?: string[] })._newlyUnlocked ?? [];
  for (const achievement of newlyUnlocked) {
    socket.emit('achievement:unlocked', { achievement });
  }
}
