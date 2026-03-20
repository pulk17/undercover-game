import type { Socket } from 'socket.io';
import type { Role, WinFaction, Level } from '@undercover/shared';
import { adminFirestore } from './firebase';

export interface XPOutcome {
  role: Role;
  winFaction: WinFaction | null;
  roundsSurvived: number;
  correctVotes: number;
  isDailyBonus: boolean;
  isGuest: boolean;
}

/**
 * Pure function — sums applicable XP schedule entries for a game outcome.
 * Returns 0 for guests.
 */
export function computeXP(outcome: XPOutcome): number {
  if (outcome.isGuest) return 0;

  let xp = 0;

  // Play any game: +10
  xp += 10;

  // Win bonuses
  if (outcome.winFaction !== null) {
    if (outcome.winFaction === 'civilian' && (outcome.role === 'civilian' || outcome.role === 'detective')) {
      // Win as Civilian: +20
      xp += 20;
    } else if (outcome.winFaction === 'undercover' && outcome.role === 'undercover') {
      // Win as Undercover: +40
      xp += 40;
    } else if (outcome.winFaction === 'mr_white' && outcome.role === 'mr_white') {
      // Win as Mr. White via correct guess: +60
      xp += 60;
    }
  }

  // Survive 3+ rounds: +15
  if (outcome.roundsSurvived >= 3) {
    xp += 15;
  }

  // Correct votes: +10 per correct vote
  xp += outcome.correctVotes * 10;

  // Daily play bonus: +25
  if (outcome.isDailyBonus) {
    xp += 25;
  }

  return xp;
}

/**
 * Pure function — maps a total XP value to the corresponding Level.
 *
 * Tiers:
 *   Rookie:      1–5 XP
 *   Agent:       6–15 XP
 *   Operative:   16–30 XP
 *   Infiltrator: 31–50 XP
 *   Mastermind:  51–80 XP
 *   Phantom:     81+ XP
 */
export function computeLevel(totalXP: number): Level {
  if (totalXP >= 81) return 'phantom';
  if (totalXP >= 51) return 'mastermind';
  if (totalXP >= 31) return 'infiltrator';
  if (totalXP >= 16) return 'operative';
  if (totalXP >= 6) return 'agent';
  return 'rookie';
}

/**
 * Awards XP to a user after a game:
 *  1. Computes earned XP from the outcome (0 for guests)
 *  2. Reads current XP from Firestore `users/{uid}`
 *  3. Adds earned XP and writes back with updated level
 *  4. Emits `xp:awarded` to the player's socket with { amount, total, level }
 */
export async function awardXP(
  uid: string,
  outcome: XPOutcome,
  socket: Socket,
): Promise<void> {
  if (outcome.isGuest) return;

  const amount = computeXP(outcome);
  if (amount === 0) return;

  const userRef = adminFirestore.collection('users').doc(uid);

  await adminFirestore.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    const currentXP: number = snap.exists ? ((snap.data()?.xp as number) ?? 0) : 0;
    const total = currentXP + amount;
    const level = computeLevel(total);

    tx.set(userRef, { xp: total, level }, { merge: true });

    socket.emit('xp:awarded', { amount, total, level });
  });
}
