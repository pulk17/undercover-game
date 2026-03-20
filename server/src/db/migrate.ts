/**
 * Run this script once to create the word_pairs table in Supabase.
 * Usage: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx ts-node src/db/migrate.ts
 *
 * Alternatively, run the SQL in server/src/db/migrations/001_create_word_pairs.sql
 * via the Supabase SQL Editor.
 */

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const SQL = `
CREATE TABLE IF NOT EXISTS word_pairs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word_a      TEXT NOT NULL,
  word_b      TEXT NOT NULL,
  category    TEXT NOT NULL,
  difficulty  TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  language    TEXT NOT NULL DEFAULT 'en',
  region      TEXT NOT NULL DEFAULT 'global',
  age_group   TEXT NOT NULL DEFAULT 'all' CHECK (age_group IN ('all', 'teen', 'adult')),
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  owner_uid   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_pairs_category_difficulty
  ON word_pairs (category, difficulty);

CREATE INDEX IF NOT EXISTS idx_word_pairs_language
  ON word_pairs (language);

CREATE INDEX IF NOT EXISTS idx_word_pairs_owner_uid
  ON word_pairs (owner_uid)
  WHERE owner_uid IS NOT NULL;
`;

async function migrate(): Promise<void> {
  console.log('Running migration: create word_pairs table...');

  // Use Supabase's pg REST endpoint to run raw SQL
  const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    method: 'HEAD',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  console.log('Supabase connection status:', response.status);

  // Execute DDL via the SQL API endpoint
  const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sql: SQL }),
  });

  if (!sqlResponse.ok) {
    const body = await sqlResponse.text();
    console.log('exec_sql RPC not available (expected). Status:', sqlResponse.status, body);
    console.log('\nPlease run the following SQL in the Supabase SQL Editor:');
    console.log('https://supabase.com/dashboard/project/hsahapdolvhcuelejvum/sql/new');
    console.log('\n--- SQL ---');
    console.log(SQL);
    console.log('--- END SQL ---');
  } else {
    console.log('✓ Migration executed successfully via RPC.');
  }
}

migrate().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
