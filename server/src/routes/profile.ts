import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { adminFirestore } from '../lib/firebase';
import { requireAuth } from '../middleware/auth';

export const profileRouter = Router();

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(12).optional(),
  preferences: z
    .object({
      language: z.string().optional(),
      notifications: z.boolean().optional(),
    })
    .optional(),
});

profileRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: { message: 'Validation failed', details: parsed.error.flatten() },
    });
    return;
  }

  const { displayName, preferences } = parsed.data;
  const uid = req.user!.uid;

  const updates: Record<string, unknown> = {};
  if (displayName !== undefined) updates.displayName = displayName;
  if (preferences !== undefined) {
    if (preferences.language !== undefined) updates['preferences.language'] = preferences.language;
    if (preferences.notifications !== undefined)
      updates['preferences.notifications'] = preferences.notifications;
  }

  try {
    const userRef = adminFirestore.collection('users').doc(uid);
    await userRef.set(updates, { merge: true });

    const snap = await userRef.get();
    const data = snap.data() ?? {};

    res.json({
      data: {
        uid,
        displayName: (data.displayName as string | null) ?? null,
        preferences: (data.preferences as Record<string, unknown>) ?? {},
      },
      error: null,
    });
  } catch {
    res.status(500).json({ data: null, error: { message: 'Failed to update profile' } });
  }
});

import { supabase } from '../lib/supabase';

const customWordSchema = z.object({
  wordA: z.string().min(1).max(100),
  wordB: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  language: z.string().min(2).max(10).default('en'),
  region: z.string().min(1).max(50).default('global'),
  ageGroup: z.enum(['all', 'teen', 'adult']).default('all'),
});

/** POST /api/v1/profile/me/words — save a custom word pair */
profileRouter.post('/me/words', requireAuth, async (req: Request, res: Response) => {
  const parsed = customWordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      data: null,
      error: { message: 'Validation failed', details: parsed.error.flatten() },
    });
    return;
  }

  const { wordA, wordB, category, difficulty, language, region, ageGroup } = parsed.data;
  const uid = req.user!.uid;

  const { data, error } = await supabase
    .from('word_pairs')
    .insert({
      word_a: wordA,
      word_b: wordB,
      category,
      difficulty,
      language,
      region,
      age_group: ageGroup,
      is_custom: true,
      owner_uid: uid,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ data: null, error: { message: 'Failed to save word pair' } });
    return;
  }

  res.status(201).json({
    data: {
      id: data.id,
      wordA: data.word_a,
      wordB: data.word_b,
      category: data.category,
      difficulty: data.difficulty,
      language: data.language,
      region: data.region,
      ageGroup: data.age_group,
    },
    error: null,
  });
});

/** GET /api/v1/profile/me/words — list custom word pairs for the authenticated user */
profileRouter.get('/me/words', requireAuth, async (req: Request, res: Response) => {
  const uid = req.user!.uid;

  const { data, error } = await supabase
    .from('word_pairs')
    .select('*')
    .eq('is_custom', true)
    .eq('owner_uid', uid)
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ data: null, error: { message: 'Failed to fetch word pairs' } });
    return;
  }

  const pairs = (data ?? []).map((row) => ({
    id: row.id,
    wordA: row.word_a,
    wordB: row.word_b,
    category: row.category,
    difficulty: row.difficulty,
    language: row.language,
    region: row.region,
    ageGroup: row.age_group,
  }));

  res.json({ data: pairs, error: null });
});

/** DELETE /api/v1/profile/me/words/:id — delete a custom word pair */
profileRouter.delete('/me/words/:id', requireAuth, async (req: Request, res: Response) => {
  const uid = req.user!.uid;
  const { id } = req.params;

  const { error } = await supabase
    .from('word_pairs')
    .delete()
    .eq('id', id)
    .eq('is_custom', true)
    .eq('owner_uid', uid);

  if (error) {
    res.status(500).json({ data: null, error: { message: 'Failed to delete word pair' } });
    return;
  }

  res.json({ data: { deleted: true }, error: null });
});
