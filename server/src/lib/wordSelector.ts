import type { WordPair, Difficulty } from '@undercover/shared';
import { supabase } from './supabase';
import { redis } from './redis';
import { WordParser } from './wordParser';

const USED_WORDS_TTL = 60 * 60 * 24; // 24 hours in seconds

export interface SelectOptions {
  categories: string[];
  difficulty: Difficulty;
  language?: string;
  roomCode: string;
}

export class WordSelector {
  /**
   * Query Supabase by category+difficulty+language, apply anti-repeat via
   * Redis SET (`used_words:{roomCode}`), and return a WordPair.
   *
   * Throws if no eligible pairs are found.
   */
  static async selectPair(options: SelectOptions): Promise<WordPair> {
    const { categories, difficulty, language = 'en', roomCode } = options;

    const redisKey = `used_words:${roomCode}`;

    // Fetch used word IDs from Redis
    const usedIds = await redis.smembers(redisKey);
    const usedSet = new Set<string>(usedIds as string[]);

    // Query Supabase for matching pairs
    let query = supabase
      .from('word_pairs')
      .select('*')
      .in('category', categories)
      .eq('difficulty', difficulty)
      .eq('language', language)
      .eq('is_custom', false);

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to query word pairs: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(
        `No word pairs found for categories="${categories.join(',')}", difficulty="${difficulty}", language="${language}"`,
      );
    }

    // Filter out already-used pairs
    const eligible = data.filter((row) => !usedSet.has(String(row.id)));

    // If all pairs have been used, reset and use the full set
    const pool = eligible.length > 0 ? eligible : data;

    // Pick a random pair from the pool
    const raw = pool[Math.floor(Math.random() * pool.length)];

    const result = WordParser.parse(raw);
    if (!result.ok) {
      throw new Error(`Invalid word pair record: ${result.error}`);
    }

    const pair = result.value;

    // Mark as used in Redis (SADD + set TTL if key is new)
    await redis.sadd(redisKey, pair.id);
    await redis.expire(redisKey, USED_WORDS_TTL);

    return pair;
  }
}
