-- Migration: 001_create_word_pairs
-- Creates the word_pairs table with all required columns and indexes.

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
  owner_uid   TEXT,           -- NULL for base library; set for custom pairs
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for the primary query path: category + difficulty filter
CREATE INDEX IF NOT EXISTS idx_word_pairs_category_difficulty
  ON word_pairs (category, difficulty);

-- Index for language-preference filtering
CREATE INDEX IF NOT EXISTS idx_word_pairs_language
  ON word_pairs (language);

-- Index for custom word lookup by owner
CREATE INDEX IF NOT EXISTS idx_word_pairs_owner_uid
  ON word_pairs (owner_uid)
  WHERE owner_uid IS NOT NULL;
