import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase PostgreSQL — word_pairs table schema:
 *
 *   id          UUID PRIMARY KEY
 *   word_a      TEXT NOT NULL
 *   word_b      TEXT NOT NULL
 *   category    TEXT NOT NULL
 *   difficulty  TEXT NOT NULL  ('easy' | 'medium' | 'hard')
 *   language    TEXT NOT NULL  (default 'en')
 *   region      TEXT NOT NULL  (default 'global')
 *   age_group   TEXT NOT NULL  (default 'all')
 *   is_custom   BOOLEAN        (false for base library)
 *   owner_uid   TEXT           (null for base library)
 *   created_at  TIMESTAMPTZ
 */

let _supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

/** @deprecated Use getSupabaseClient() instead */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseClient() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
