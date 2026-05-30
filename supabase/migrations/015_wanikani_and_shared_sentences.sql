-- Migration 015: WaniKani vocabulary integration + user-shared grammar sentences

-- ── 1. New columns in user_settings ──────────────────────────────────────────
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS wanikani_api_key TEXT,
  ADD COLUMN IF NOT EXISTS wanikani_min_srs_stage INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS show_shared_sentences BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 2. WaniKani user vocabulary ───────────────────────────────────────────────
-- Stores the user's WaniKani vocabulary items (fetched via WaniKani API v2).
-- Completely separate from the shared school curriculum vocabulary table.
CREATE TABLE IF NOT EXISTS public.wanikani_user_vocab (
  user_id        UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wanikani_id    INTEGER NOT NULL,
  word           TEXT    NOT NULL,
  reading        TEXT    NOT NULL,
  meaning_en     TEXT    NOT NULL,
  meaning_es     TEXT,
  meaning_ca     TEXT,
  level          INTEGER NOT NULL,
  srs_stage      INTEGER NOT NULL DEFAULT 0,
  synced_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, wanikani_id)
);

ALTER TABLE public.wanikani_user_vocab ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wanikani_vocab_own" ON public.wanikani_user_vocab
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── 3. User-shared grammar sentences ─────────────────────────────────────────
-- Sentences that users choose to share with the community. These are separate
-- from the auto-generated pool in grammar_sentences and persist indefinitely.
CREATE TABLE IF NOT EXISTS public.user_shared_sentences (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  grammar_id                  TEXT        NOT NULL,
  shared_by                   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  sentence_before             TEXT        NOT NULL,
  sentence_before_reading     TEXT        NOT NULL DEFAULT '',
  sentence_before_alts        TEXT[]      NOT NULL DEFAULT '{}',
  sentence_before_reading_alts TEXT[]     NOT NULL DEFAULT '{}',
  sentence_after              TEXT        NOT NULL DEFAULT '',
  sentence_after_reading      TEXT        NOT NULL DEFAULT '',
  answer                      TEXT        NOT NULL,
  answer_alts                 TEXT[]      NOT NULL DEFAULT '{}',
  translation_es              TEXT        NOT NULL,
  translation_ca              TEXT        NOT NULL DEFAULT '',
  translation_en              TEXT        NOT NULL DEFAULT '',
  grammar_jlpt                TEXT        NOT NULL DEFAULT '',
  vocab_words                 TEXT[]      NOT NULL DEFAULT '{}',
  topic                       TEXT,
  shared_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_shared_sentences ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read shared sentences
CREATE POLICY "shared_sentences_read" ON public.user_shared_sentences
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Authenticated users can insert their own shared sentences
CREATE POLICY "shared_sentences_insert" ON public.user_shared_sentences
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND shared_by = auth.uid());

-- Index for fast lookups by grammar point
CREATE INDEX IF NOT EXISTS idx_user_shared_sentences_grammar_id
  ON public.user_shared_sentences (grammar_id);
