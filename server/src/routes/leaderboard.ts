import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { adminFirestore } from '../lib/firebase';
import { getRoom } from '../managers/RoomManager';
import { getParticipantKey, getRoomLeaderboardScores } from '../lib/roomLeaderboardService';

export const leaderboardRouter = Router();

leaderboardRouter.use(requireAuth);

const scopeSchema = z.object({
  scope: z.enum(['global', 'friends', 'country', 'room']).default('global'),
  code: z.string().trim().min(4).max(8).optional(),
});

interface LeaderboardEntry {
  rank: number;
  uid: string;
  nickname: string;
  avatarUrl: string | null;
  xp: number;
  level: string;
}

function toEntry(uid: string, data: FirebaseFirestore.DocumentData): Omit<LeaderboardEntry, 'rank'> {
  return {
    uid,
    nickname: data.nickname ?? '',
    avatarUrl: data.avatarUrl ?? null,
    xp: data.xp ?? 0,
    level: data.level ?? 'rookie',
  };
}

leaderboardRouter.get('/', async (req: Request, res: Response) => {
  const parsed = scopeSchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { message: 'Invalid scope parameter' } });
    return;
  }

  const { scope, code } = parsed.data;
  const currentUid = req.user!.uid;

  try {
    let entries: Omit<LeaderboardEntry, 'rank'>[] = [];

    if (scope === 'global') {
      const snapshot = await adminFirestore
        .collection('users')
        .orderBy('xp', 'desc')
        .limit(50)
        .get();

      entries = snapshot.docs.map((doc) => toEntry(doc.id, doc.data()));
    } else if (scope === 'friends') {
      const currentDoc = await adminFirestore.collection('users').doc(currentUid).get();
      if (!currentDoc.exists) {
        res.status(404).json({ data: null, error: { message: 'User not found' } });
        return;
      }

      const friends: string[] = currentDoc.data()?.friends ?? [];
      const uids = [currentUid, ...friends];

      // Fetch all docs in parallel (batches of 30 for Firestore 'in' limit)
      const batches: Promise<FirebaseFirestore.QuerySnapshot>[] = [];
      for (let i = 0; i < uids.length; i += 30) {
        batches.push(
          adminFirestore
            .collection('users')
            .where('__name__', 'in', uids.slice(i, i + 30))
            .get()
        );
      }

      const snapshots = await Promise.all(batches);
      const docs = snapshots.flatMap((s) => s.docs);
      entries = docs.map((doc) => toEntry(doc.id, doc.data()));
      entries.sort((a, b) => b.xp - a.xp);
    } else if (scope === 'country') {
      // country scope — use language as proxy
      const currentDoc = await adminFirestore.collection('users').doc(currentUid).get();
      if (!currentDoc.exists) {
        res.status(404).json({ data: null, error: { message: 'User not found' } });
        return;
      }

      const language: string = currentDoc.data()?.preferences?.language ?? 'en';

      const snapshot = await adminFirestore
        .collection('users')
        .where('preferences.language', '==', language)
        .orderBy('xp', 'desc')
        .limit(50)
        .get();

      entries = snapshot.docs.map((doc) => toEntry(doc.id, doc.data()));
    } else {
      if (!code) {
        res.status(400).json({ data: null, error: { message: 'Room code is required for room leaderboard' } });
        return;
      }

      const room = await getRoom(code.toUpperCase());
      if (!room) {
        res.status(404).json({ data: null, error: { message: 'Room not found' } });
        return;
      }

      const scores = await getRoomLeaderboardScores(room);
      entries = room.players
        .map((player) => ({
          uid: player.userId ?? getParticipantKey(player),
          nickname: player.nickname,
          avatarUrl: player.avatarUrl,
          xp: scores[player.id] ?? 0,
          level: 'rookie',
        }))
        .sort((a, b) => b.xp - a.xp);
    }

    const ranked: LeaderboardEntry[] = entries.map((entry, i) => ({
      rank: i + 1,
      ...entry,
    }));

    res.json({ data: ranked, error: null });
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ data: null, error: { message: 'Internal server error' } });
  }
});
