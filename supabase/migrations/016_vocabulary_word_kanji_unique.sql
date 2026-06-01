-- Allow the same word to exist with different kanji representations.
-- Previously UNIQUE(word) meant homophonic words (e.g. はな=花/鼻) could not
-- coexist. Changing to UNIQUE(word, kanji) lets them be separate entries.
--
-- The vocabulary table was created outside migrations (via Supabase dashboard),
-- so we drop any existing word-only unique constraint via a DO block and then
-- add the composite one. Safe to run more than once (IF NOT EXISTS guards).

DO $$
BEGIN
  -- Drop word-only unique constraint if it exists (common Supabase auto-name)
  BEGIN
    ALTER TABLE public.vocabulary DROP CONSTRAINT vocabulary_word_key;
  EXCEPTION WHEN undefined_object THEN NULL;
  END;

  -- Add composite unique constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vocabulary_word_kanji_unique'
      AND conrelid = 'public.vocabulary'::regclass
  ) THEN
    ALTER TABLE public.vocabulary
      ADD CONSTRAINT vocabulary_word_kanji_unique UNIQUE (word, kanji);
  END IF;
END $$;
