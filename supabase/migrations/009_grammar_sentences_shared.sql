-- =============================================================================
-- Migration 009: grammar_sentences — shared pool with size cap
--
-- Changes:
--   1. Ensure grammar_sentences table exists (idempotent — safe to re-run).
--   2. SELECT: public (all visitors can read).
--   3. INSERT: any authenticated user can add sentences.
--   4. DELETE: any authenticated user can delete (needed for the automatic
--      pool-trimming that runs after each generation batch, keeping the pool
--      at most 100 sentences by removing the oldest ones).
--      The "regenerate all" button has been removed from the UI so bulk
--      deletions are no longer triggered from the client; the only delete
--      path is the targeted trim-by-ID operation.
--
-- Run this in Supabase → SQL Editor → New query.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Ensure the table exists (in case the previous migration was never run).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grammar_sentences (
  id                      UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  grammar_id              TEXT        NOT NULL,
  sentence_before         TEXT        NOT NULL DEFAULT '',
  sentence_before_reading TEXT        NOT NULL DEFAULT '',
  sentence_after          TEXT        NOT NULL DEFAULT '',
  sentence_after_reading  TEXT        NOT NULL DEFAULT '',
  answer                  TEXT        NOT NULL DEFAULT '',
  answer_alts             JSONB       NOT NULL DEFAULT '[]',
  translation_es          TEXT        NOT NULL DEFAULT '',
  translation_ca          TEXT        NOT NULL DEFAULT '',
  translation_en          TEXT        NOT NULL DEFAULT '',
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grammar_sentences_grammar_id_idx
  ON grammar_sentences (grammar_id);

-- Index on created_at makes ORDER BY created_at ASC efficient during trimming
CREATE INDEX IF NOT EXISTS grammar_sentences_created_at_idx
  ON grammar_sentences (grammar_id, created_at ASC);

-- ---------------------------------------------------------------------------
-- 2. Enable RLS (idempotent).
-- ---------------------------------------------------------------------------
ALTER TABLE grammar_sentences ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. Public SELECT — all visitors can read the shared pool.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "grammar_sentences_select" ON grammar_sentences;
CREATE POLICY "grammar_sentences_select"
  ON grammar_sentences FOR SELECT
  USING (true);

-- ---------------------------------------------------------------------------
-- 4. Authenticated INSERT — any logged-in user can contribute new sentences.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "grammar_sentences_insert" ON grammar_sentences;
CREATE POLICY "grammar_sentences_insert"
  ON grammar_sentences FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 5. Authenticated DELETE — needed for the automatic pool-trimming logic.
--    After each generation the client calls trimGrammarSentencesPool() which
--    deletes specific row IDs (oldest first) to keep the pool at ≤ 100 rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "grammar_sentences_delete" ON grammar_sentences;
CREATE POLICY "grammar_sentences_delete"
  ON grammar_sentences FOR DELETE
  USING (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- 6. Ensure grammar_srs_progress table also exists (idempotent).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grammar_srs_progress (
  user_id     UUID    NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id  TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 0,
  next_review BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, grammar_id)
);

ALTER TABLE grammar_srs_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grammar_srs_progress_all" ON grammar_srs_progress;
CREATE POLICY "grammar_srs_progress_all"
  ON grammar_srs_progress FOR ALL
  USING      (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
