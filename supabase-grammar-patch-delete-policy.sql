-- =============================================================================
-- Patch: add DELETE policy to grammar_sentences
-- Run this in Supabase SQL Editor if you already applied the original migration.
-- =============================================================================

DROP POLICY IF EXISTS "grammar_sentences_delete" ON grammar_sentences;
CREATE POLICY "grammar_sentences_delete"
  ON grammar_sentences FOR DELETE
  USING (auth.role() = 'authenticated');
