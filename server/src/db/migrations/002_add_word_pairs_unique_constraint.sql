-- Migration: 002_add_word_pairs_unique_constraint
-- Adds a unique constraint on (word_a, word_b, category) to support idempotent upserts.

ALTER TABLE word_pairs
  ADD CONSTRAINT uq_word_pairs_a_b_category UNIQUE (word_a, word_b, category);
