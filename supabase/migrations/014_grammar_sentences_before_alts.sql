-- Add up-to-4 alternative "before blank" segments per sentence.
-- Admins/contributors can fill these to accept honorific variants,
-- pronoun alternatives, or other equally correct phrasings.
ALTER TABLE grammar_sentences
  ADD COLUMN IF NOT EXISTS sentence_before_alts          text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sentence_before_reading_alts  text[] NOT NULL DEFAULT '{}';
