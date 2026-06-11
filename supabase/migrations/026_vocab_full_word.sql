-- Migration 026: store the word's full real spelling (all kanji) separately from
-- `word`, which only uses the studied kanji (e.g. word = 草はら, full_word = 草原).
-- Shown with furigana in the glossary and on the review answer reveal.
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS full_word TEXT;
