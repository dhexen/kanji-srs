-- Migration 024: classify the user's WaniKani vocabulary by semantic category
-- and grammatical word type (same taxonomy as the page vocabulary), so Lecturas
-- IA can prioritize words that match the chosen topic.
ALTER TABLE public.wanikani_user_vocab
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS word_type TEXT;
