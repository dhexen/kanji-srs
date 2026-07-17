-- Migration 030: per-token furigana segments for grammar sentences.
-- Each segment is { "t": text, "f"?: reading } so furigana is placed exactly
-- over each kanji group instead of being aligned by a heuristic.

alter table public.grammar_sentences
  add column if not exists sentence_before_segments jsonb not null default '[]'::jsonb,
  add column if not exists sentence_after_segments  jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
