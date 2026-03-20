import * as admin from 'firebase-admin';
import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { adminAuth, adminFirestore } from '../lib/firebase';
import { env } from '../env';

export const authRouter = Router();

const googleBodySchema = z.object({
  idToken: z.string().min(1),
});

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_S = 30 * 24 * 60 * 60;

authRouter.post('/google', async (req: Request, res: Response) => {
  const parsed = googleBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: { message: 'idToken is required', details: parsed.error.flatten() },
    });
    return;
  }

  const { idToken } = parsed.data;

  let decodedToken: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decodedToken = await adminAuth.verifyIdToken(idToken);
  } catch {
    res.status(401).json({ data: null, error: { message: 'Invalid or expired Firebase ID token' } });
    return;
  }

  const { uid, email, name: displayName, picture: photoURL } = decodedToken;

  // Upsert Firestore user document
  const userRef = adminFirestore.collection('users').doc(uid);
  const userSnap = await userRef.get();

  if (!userSnap.exists) {
    const initialLevel = 'rookie';
    await userRef.set({
      uid,
      email: email ?? null,
      displayName: displayName ?? null,
      photoURL: photoURL ?? null,
      isGuest: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
      level: initialLevel,
      xp: 0,
      achievements: [],
      stats: { gamesPlayed: 0, wins: 0, losses: 0 },
      preferences: { language: 'en', notifications: true },
    });
  } else {
    await userRef.set(
      { lastSeenAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  const payload = {
    uid,
    email: email ?? null,
    displayName: displayName ?? null,
    photoURL: photoURL ?? null,
    isGuest: false,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: THIRTY_DAYS_S });

  res.cookie('session', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  });

  res.json({ data: { uid, email: email ?? null, displayName: displayName ?? null, photoURL: photoURL ?? null }, error: null });
});

const GUEST_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateGuestNickname(): string {
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += GUEST_CHARS[Math.floor(Math.random() * GUEST_CHARS.length)];
  }
  return `Guest_${suffix}`;
}

authRouter.post('/guest', (_req: Request, res: Response) => {
  const uid = `guest_${randomUUID()}`;
  const displayName = generateGuestNickname();

  const payload = {
    uid,
    email: null,
    displayName,
    photoURL: null,
    isGuest: true,
  };

  const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: THIRTY_DAYS_S });

  res.cookie('session', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: THIRTY_DAYS_MS,
    path: '/',
  });

  res.json({ data: { uid, displayName }, error: null });
});

authRouter.post('/logout', (_req: Request, res: Response) => {
  res.clearCookie('session', { path: '/' });
  res.json({ data: { success: true }, error: null });
});

authRouter.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.session as string | undefined;
  if (!token) {
    res.status(401).json({ data: null, error: { message: 'No session cookie' } });
    return;
  }

  let payload: { uid: string; email: string | null; displayName: string | null; photoURL: string | null; isGuest: boolean };
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as typeof payload;
  } catch {
    res.status(401).json({ data: null, error: { message: 'Invalid or expired session' } });
    return;
  }

  const { uid, email, displayName, photoURL, isGuest } = payload;

  try {
    const docSnap = await adminFirestore.collection('users').doc(uid).get();
    if (!docSnap.exists) {
      // Guest or user not yet in Firestore — return JWT payload data directly
      res.json({ data: { uid, email, displayName, photoURL, isGuest }, error: null });
      return;
    }

    const firestoreData = docSnap.data() ?? {};
    res.json({ data: { uid, email, displayName, photoURL, isGuest, ...firestoreData }, error: null });
  } catch {
    res.status(500).json({ data: null, error: { message: 'Failed to fetch user profile' } });
  }
});
