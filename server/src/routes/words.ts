import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { WordParser } from '../lib/wordParser';

export const wordsRouter = Router();

/**
 * GET /api/v1/words/categories
 * Returns all distinct categories in the word_pairs table.
 */
wordsRouter.get('/categories', async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from('word_pairs')
    .select('category')
    .eq('is_custom', false);

  if (error) {
    res.status(500).json({ data: null, error: { message: 'Failed to fetch categories' } });
    return;
  }

  const categories = [...new Set((data ?? []).map((r) => r.category as string))].sort();
  res.json({ data: categories, error: null });
});

/**
 * GET /api/v1/words/pairs?category=&difficulty=&lang=
 * Returns word pairs filtered by optional category, difficulty, and language.
 * Used for PWA cache warm.
 */
wordsRouter.get('/pairs', async (req: Request, res: Response) => {
  const { category, difficulty, lang } = req.query;

  let query = supabase.from('word_pairs').select('*').eq('is_custom', false);

  if (category && typeof category === 'string') {
    query = query.eq('category', category);
  }
  if (difficulty && typeof difficulty === 'string') {
    query = query.eq('difficulty', difficulty);
  }
  if (lang && typeof lang === 'string') {
    query = query.eq('language', lang);
  }

  const { data, error } = await query;

  if (error) {
    res.status(500).json({ data: null, error: { message: 'Failed to fetch word pairs' } });
    return;
  }

  const pairs = [];
  const errors = [];

  for (const row of data ?? []) {
    const result = WordParser.parse(row);
    if (result.ok) {
      pairs.push(result.value);
    } else {
      errors.push(result.error);
    }
  }

  res.json({ data: pairs, error: errors.length > 0 ? { skipped: errors } : null });
});
