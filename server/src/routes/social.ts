import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { adminFirestore } from '../lib/firebase';
import { FieldValue } from 'firebase-admin/firestore';

export const socialRouter = Router();

// All routes require auth
socialRouter.use(requireAuth);

// GET /search?q= — search players by nickname (case-insensitive prefix)
socialRouter.get('/search', async (req: Request, res: Response) => {
  const q = (req.query.q as string | undefined)?.trim().toLowerCase() ?? '';

  if (!q) {
    res.json({ data: [], error: null });
    return;
  }

  try {
    const snapshot = await adminFirestore
      .collection('users')
      .where('nicknameLower', '>=', q)
      .where('nicknameLower', '<=', q + '\uf8ff')
      .limit(10)
      .get();

    const results = snapshot.docs
      .filter((doc) => doc.id !== req.user!.uid)
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          nickname: data.nickname ?? '',
          avatarUrl: data.avatarUrl ?? null,
        };
      });

    res.json({ data: results, error: null });
  } catch (err) {
    console.error('social/search error', err);
    res.status(500).json({ data: null, error: { message: 'Internal server error' } });
  }
});

// POST /friends/:uid — send friend request
socialRouter.post('/friends/:uid', async (req: Request, res: Response) => {
  const fromUid = req.user!.uid;
  const toUid = req.params.uid as string;

  if (fromUid === toUid) {
    res.status(400).json({ data: null, error: { message: 'Cannot send friend request to yourself' } });
    return;
  }

  try {
    const targetDoc = await adminFirestore.collection('users').doc(toUid).get();
    if (!targetDoc.exists) {
      res.status(404).json({ data: null, error: { message: 'User not found' } });
      return;
    }

    const requestRef = adminFirestore
      .collection('users')
      .doc(toUid)
      .collection('friendRequests')
      .doc(fromUid);

    const existing = await requestRef.get();
    if (existing.exists) {
      res.status(409).json({ data: null, error: { message: 'Friend request already sent' } });
      return;
    }

    await requestRef.set({
      status: 'pending',
      fromUid,
      toUid,
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ data: { message: 'Friend request sent' }, error: null });
  } catch (err) {
    console.error('social/friends POST error', err);
    res.status(500).json({ data: null, error: { message: 'Internal server error' } });
  }
});

// PATCH /friends/:uid — accept or decline incoming friend request
const patchSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

socialRouter.patch('/friends/:uid', async (req: Request, res: Response) => {
  const currentUid = req.user!.uid;
  const fromUid = req.params.uid as string;

  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ data: null, error: { message: 'action must be "accept" or "decline"' } });
    return;
  }

  const { action } = parsed.data;

  try {
    const requestRef = adminFirestore
      .collection('users')
      .doc(currentUid)
      .collection('friendRequests')
      .doc(fromUid);

    const requestDoc = await requestRef.get();
    if (!requestDoc.exists || requestDoc.data()?.status !== 'pending') {
      res.status(404).json({ data: null, error: { message: 'Pending friend request not found' } });
      return;
    }

    if (action === 'accept') {
      const batch = adminFirestore.batch();

      // Add each uid to the other's friends array
      batch.update(adminFirestore.collection('users').doc(currentUid), {
        friends: FieldValue.arrayUnion(fromUid),
      });
      batch.update(adminFirestore.collection('users').doc(fromUid), {
        friends: FieldValue.arrayUnion(currentUid),
      });

      // Delete the request
      batch.delete(requestRef);

      await batch.commit();
      res.json({ data: { message: 'Friend request accepted' }, error: null });
    } else {
      // decline — just delete the request
      await requestRef.delete();
      res.json({ data: { message: 'Friend request declined' }, error: null });
    }
  } catch (err) {
    console.error('social/friends PATCH error', err);
    res.status(500).json({ data: null, error: { message: 'Internal server error' } });
  }
});

// DELETE /friends/:uid — remove friend
socialRouter.delete('/friends/:uid', async (req: Request, res: Response) => {
  const currentUid = req.user!.uid;
  const targetUid = req.params.uid as string;

  try {
    const batch = adminFirestore.batch();

    batch.update(adminFirestore.collection('users').doc(currentUid), {
      friends: FieldValue.arrayRemove(targetUid),
    });
    batch.update(adminFirestore.collection('users').doc(targetUid), {
      friends: FieldValue.arrayRemove(currentUid),
    });

    await batch.commit();
    res.status(204).send();
  } catch (err) {
    console.error('social/friends DELETE error', err);
    res.status(500).json({ data: null, error: { message: 'Internal server error' } });
  }
});
