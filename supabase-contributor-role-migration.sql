-- ============================================================
-- Migration: add 'contributor' role + sentence edit policies
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Allow 'contributor' in the user_roles table
-- ─────────────────────────────────────────────
-- Drop the existing check constraint (name may vary — check with:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'user_roles'::regclass;
-- Typical name is "user_roles_role_check")
ALTER TABLE user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

ALTER TABLE user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('admin', 'contributor', 'user'));


-- 2. Allow authenticated users to UPDATE rows in grammar_sentences
-- ─────────────────────────────────────────────────────────────────
-- grammar_sentences is a shared pool; any authenticated user who can
-- read/insert can also update (role enforcement is done in the app layer).
-- If you want stricter control, replace USING (true) with a role check.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'grammar_sentences'
      AND policyname = 'allow_authenticated_update_grammar_sentences'
  ) THEN
    CREATE POLICY allow_authenticated_update_grammar_sentences
      ON grammar_sentences
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END
$$;


-- 3. Allow authenticated users to UPDATE their own rows in user_grammar_examples
-- ──────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'user_grammar_examples'
      AND policyname = 'allow_owner_update_user_grammar_examples'
  ) THEN
    CREATE POLICY allow_owner_update_user_grammar_examples
      ON user_grammar_examples
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END
$$;


-- 4. (Optional) Update the get_my_role() RPC if it has a hard-coded
--    return type of text — no change needed; it will return 'contributor'
--    automatically once the row exists in user_roles.
--
--    If you have an enum type for roles, add 'contributor' to it:
--    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'contributor';
