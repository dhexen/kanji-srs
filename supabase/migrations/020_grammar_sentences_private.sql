-- Migration 020: mark grammar sentences generated with WaniKani vocab as private.
-- Private sentences are only visible to their owner; public sentences are shared.

ALTER TABLE public.grammar_sentences
  ADD COLUMN IF NOT EXISTS is_private      BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS private_user_id UUID    REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace the existing SELECT policy with one that also allows users
-- to see their own private sentences.
DROP POLICY IF EXISTS "Allow authenticated read"  ON public.grammar_sentences;
DROP POLICY IF EXISTS "Allow public read"         ON public.grammar_sentences;
DROP POLICY IF EXISTS "Authenticated select"      ON public.grammar_sentences;
DROP POLICY IF EXISTS "grammar_sentences_select"  ON public.grammar_sentences;

CREATE POLICY "grammar_sentences_select" ON public.grammar_sentences
  FOR SELECT TO authenticated
  USING (is_private = false OR private_user_id = auth.uid());
