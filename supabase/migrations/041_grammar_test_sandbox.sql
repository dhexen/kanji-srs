-- =============================================================================
-- Migration 041: sandbox de gramática (sección "Gramàtica TEST", solo admin)
--
-- Tablas espejo de las de gramática para que un admin pueda probar cambios en
-- la práctica/repasos sin tocar el progreso real de ningún usuario. Idénticas
-- en forma a grammar_srs_progress / user_grammar_progress / user_grammar_examples,
-- pero con RLS que exige ser admin (public.is_admin()) ADEMÁS de ser el dueño de
-- la fila. Así ningún usuario normal puede leer ni escribir aquí, y lo que el
-- admin haga en el sandbox queda aislado de las tablas de producción.
--
-- Las frases generadas en el sandbox NO se persisten (viven solo en memoria de
-- la sesión), por eso no hay tabla grammar_sentences_test.
--
-- Ejecutar en Supabase → SQL Editor → New query.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Estado SRS de test (nivel + próximo repaso por punto)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grammar_srs_progress_test (
  user_id     UUID    NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id  TEXT    NOT NULL,
  level       INTEGER NOT NULL DEFAULT 0,
  next_review BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, grammar_id)
);

ALTER TABLE public.grammar_srs_progress_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grammar_srs_progress_test_admin" ON public.grammar_srs_progress_test;
CREATE POLICY "grammar_srs_progress_test_admin"
  ON public.grammar_srs_progress_test FOR ALL
  USING      (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Puntos "conocidos" de test
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_grammar_progress_test (
  user_id    UUID    NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id TEXT    NOT NULL,
  known      BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, grammar_id)
);

CREATE INDEX IF NOT EXISTS user_grammar_progress_test_user_idx
  ON public.user_grammar_progress_test (user_id);

ALTER TABLE public.user_grammar_progress_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_grammar_progress_test_admin" ON public.user_grammar_progress_test;
CREATE POLICY "user_grammar_progress_test_admin"
  ON public.user_grammar_progress_test FOR ALL
  USING      (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. Ejemplos propios de test (pool personal de frases coloreadas)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_grammar_examples_test (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id  TEXT        NOT NULL,
  jp          JSONB       NOT NULL DEFAULT '[]',
  translation JSONB       NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_grammar_examples_test_user_grammar_idx
  ON public.user_grammar_examples_test (user_id, grammar_id, created_at ASC);

ALTER TABLE public.user_grammar_examples_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_grammar_examples_test_admin" ON public.user_grammar_examples_test;
CREATE POLICY "user_grammar_examples_test_admin"
  ON public.user_grammar_examples_test FOR ALL
  USING      (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());
