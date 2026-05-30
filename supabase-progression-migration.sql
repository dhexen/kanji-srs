-- ── user_progression table ─────────────────────────────────────────────────────
-- Stores XP and level data for the gamification system.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS public.user_progression (
  user_id      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  vocab_xp     bigint NOT NULL DEFAULT 0,
  grammar_xp   bigint NOT NULL DEFAULT 0,
  total_xp     bigint NOT NULL DEFAULT 0,
  vocab_level  integer NOT NULL DEFAULT 1,
  grammar_level integer NOT NULL DEFAULT 1,
  total_level  integer NOT NULL DEFAULT 1,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Row-Level Security
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own progression" ON public.user_progression;
DROP POLICY IF EXISTS "Users can insert own progression" ON public.user_progression;
DROP POLICY IF EXISTS "Users can update own progression" ON public.user_progression;

CREATE POLICY "Users manage own progression"
  ON public.user_progression FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all progression (uses is_admin() SECURITY DEFINER to avoid RLS recursion)
DROP POLICY IF EXISTS "Admins can read all progression" ON public.user_progression;
CREATE POLICY "Admins can read all progression"
  ON public.user_progression FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin());

-- Index for ordered queries (e.g. future leaderboard)
CREATE INDEX IF NOT EXISTS idx_user_progression_total_level
  ON public.user_progression (total_level DESC, total_xp DESC);
