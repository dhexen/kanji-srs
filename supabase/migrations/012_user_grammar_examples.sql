-- =============================================================================
-- Migration 012: user_grammar_examples
--
-- Stores the AI-generated colour-coded example sentences (the 5 cards shown
-- in GrammarExamples) per user per grammar point.
--
-- Unlike grammar_sentences (shared fill-in-the-blank pool), these examples
-- are personal: each student keeps their own pool of up to 10 sentences and
-- can regenerate them independently. The client trims the pool automatically
-- after each generation batch.
--
-- Run this in Supabase → SQL Editor → New query.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_grammar_examples (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id  TEXT        NOT NULL,
  jp          JSONB       NOT NULL DEFAULT '[]',
  translation JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index covers: fetch by (user, grammar), ordered by age for FIFO trim
CREATE INDEX IF NOT EXISTS user_grammar_examples_user_grammar_idx
  ON user_grammar_examples (user_id, grammar_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- RLS — each user sees and manages only their own rows
-- ---------------------------------------------------------------------------
ALTER TABLE user_grammar_examples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_grammar_examples_all" ON user_grammar_examples;
CREATE POLICY "user_grammar_examples_all"
  ON user_grammar_examples FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
