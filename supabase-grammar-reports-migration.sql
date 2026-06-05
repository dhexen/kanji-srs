-- Migration: grammar_reports
-- Reports submitted by users when a grammar practice sentence seems incorrect.

CREATE TABLE IF NOT EXISTS public.grammar_reports (
  id              uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  grammar_id      text        NOT NULL,
  grammar_pattern text        NOT NULL,
  sentence        text        NOT NULL,
  user_id         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email      text        NOT NULL DEFAULT '',
  description     text,
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'resolved')),
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.grammar_reports ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own reports
CREATE POLICY "grammar_reports_insert" ON public.grammar_reports
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins read/update via service role (no policy needed for service role)
