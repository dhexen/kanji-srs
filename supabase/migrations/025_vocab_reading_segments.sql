-- Migration 025: curated per-kanji furigana for vocabulary words.
-- Array of { t: string, f?: string } tokens (t = text/kanji block, f = reading).
-- When present, the glossary uses it instead of the heuristic furigana split.
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS reading_segments JSONB;
