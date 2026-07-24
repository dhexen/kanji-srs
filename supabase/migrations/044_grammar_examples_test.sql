-- =============================================================================
-- Migration 044: pool COMPARTIDO de frases de ejemplo (con colores) para TEST
--
-- Hasta ahora las "frases de ejemplo con IA" (frases enteras con colores por
-- función gramatical, sin hueco) vivían en user_grammar_examples_test: por
-- usuario y generadas con la API key de cada uno. Para que el sandbox sea espejo
-- de la idea de producción — el admin genera y TODOS lo ven sin clave — creamos
-- un pool compartido/público, con la misma política que grammar_sentences_test
-- (migración 043): cualquier admin ve las públicas.
--
-- El generador masivo de admin siembra aquí 5 ejemplos por punto en la misma
-- tirada que el pool de práctica.
--
-- Ejecutar en Supabase → SQL Editor → New query.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.grammar_examples_test (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id       TEXT        NOT NULL,
  jp               JSONB       NOT NULL DEFAULT '[]',  -- tokens {text, furigana?, role}
  translation      JSONB       NOT NULL DEFAULT '[]',  -- tokens {text, role}
  validated        BOOLEAN     NOT NULL DEFAULT false,
  validated_by     TEXT,
  is_private       BOOLEAN     NOT NULL DEFAULT false,
  private_user_id  UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grammar_examples_test_grammar_idx
  ON public.grammar_examples_test (grammar_id, created_at ASC);

ALTER TABLE public.grammar_examples_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grammar_examples_test_admin" ON public.grammar_examples_test;
CREATE POLICY "grammar_examples_test_admin"
  ON public.grammar_examples_test FOR ALL
  USING      (public.is_admin() AND (is_private = false OR private_user_id = auth.uid()))
  WITH CHECK (public.is_admin());
