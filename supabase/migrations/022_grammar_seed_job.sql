-- Migration 022: Grammar sentence seed job state

CREATE TABLE IF NOT EXISTS public.grammar_seed_job (
  id         SMALLINT PRIMARY KEY DEFAULT 1,
  running    BOOLEAN NOT NULL DEFAULT false,
  started_at TIMESTAMPTZ,
  stopped_at TIMESTAMPTZ
);

INSERT INTO public.grammar_seed_job (id, running)
VALUES (1, false)
ON CONFLICT (id) DO NOTHING;

-- Per-grammar error tracking (clears on success, persists on failure)
CREATE TABLE IF NOT EXISTS public.grammar_seed_errors (
  grammar_id   TEXT PRIMARY KEY,
  error_msg    TEXT NOT NULL,
  is_permanent BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.grammar_seed_job ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grammar_seed_errors ENABLE ROW LEVEL SECURITY;
-- No public policies — only accessible via service role key (admin API routes)
