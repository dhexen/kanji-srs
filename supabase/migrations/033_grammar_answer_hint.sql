-- Migration 033: dictionary-form hint for content words inside the answer.
-- When the blank/answer requires a content word (e.g. しらべてみます needs the
-- verb 調べる), this stores its dictionary form so the UI can show it next to
-- the translation — the student still has to conjugate it to fit the grammar.
-- Array of { "w": dictionary form (kanji), "r": reading (hiragana) }; [] if none.

alter table public.grammar_sentences
  add column if not exists answer_hint jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
