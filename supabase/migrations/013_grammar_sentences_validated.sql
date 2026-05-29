-- =============================================================================
-- Migration 013: grammar_sentences — add validated / validated_by columns
--
-- Changes:
--   1. Add `validated` boolean column (default false).
--   2. Add `validated_by` UUID column referencing auth.users.
--   3. Allow UPDATE on grammar_sentences for authenticated users so that
--      admins/contributors can validate or edit sentences from the UI.
--
-- Run in Supabase → SQL Editor → New query.
-- =============================================================================

ALTER TABLE grammar_sentences
  ADD COLUMN IF NOT EXISTS validated    BOOLEAN  NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validated_by UUID     REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS grammar_sentences_validated_idx
  ON grammar_sentences (grammar_id, validated)
  WHERE validated = TRUE;

-- Allow authenticated users to update sentences.
-- Role checks (admin / contributor) are enforced at the application layer.
DROP POLICY IF EXISTS "grammar_sentences_update" ON grammar_sentences;
CREATE POLICY "grammar_sentences_update"
  ON grammar_sentences FOR UPDATE
  USING      (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
