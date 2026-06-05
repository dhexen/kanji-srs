-- Migration 019: turn feedback/vocab reports into a basic ticketing tool.
--   • Let users read THEIR OWN reports (so they can see status in their profile)
--   • Add an admin_response + resolved_at to feedback_reports (the "message" the
--     admin sends back when resolving)

-- ── feedback_reports ──────────────────────────────────────────────────────────
ALTER TABLE public.feedback_reports
  ADD COLUMN IF NOT EXISTS admin_response TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at    TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feedback_reports' AND policyname = 'Users read own feedback'
  ) THEN
    CREATE POLICY "Users read own feedback"
      ON public.feedback_reports FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- ── vocab_reports ─────────────────────────────────────────────────────────────
ALTER TABLE public.vocab_reports
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vocab_reports' AND policyname = 'Users read own vocab reports'
  ) THEN
    CREATE POLICY "Users read own vocab reports"
      ON public.vocab_reports FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
END $$;
