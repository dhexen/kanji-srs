-- =============================================================================
-- Migration 042: pool de frases de repaso persistente para el sandbox de test
--
-- Hasta ahora las frases de repaso del sandbox ("Gramàtica TEST") vivían solo en
-- memoria de sesión. Para que test sea un espejo COMPLETO de producción (con la
-- idea de reemplazar producción por test cuando esté validado), persistimos el
-- pool en grammar_sentences_test, con las MISMAS columnas que grammar_sentences
-- (todas las añadidas por migraciones posteriores incluidas), pero:
--   • con user_id (dueño = el admin que genera) y RLS solo-admin, igual que el
--     resto de tablas *_test de la migración 041.
--   • el generador admin (service role) escribe aquí con user_id = id del admin.
--
-- Además añade el flag `enabled` a grammar_refresh para poder apagar el cron
-- nocturno desde el panel admin sin tocar vercel.json.
--
-- Ejecutar en Supabase → SQL Editor → New query.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pool de frases de repaso de test (espejo de grammar_sentences + user_id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.grammar_sentences_test (
  id                            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                       UUID        NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  grammar_id                    TEXT        NOT NULL,
  sentence_before               TEXT        NOT NULL DEFAULT '',
  sentence_before_reading       TEXT,
  sentence_before_segments      JSONB,
  sentence_before_alts          JSONB,
  sentence_before_reading_alts  JSONB,
  sentence_after                TEXT        NOT NULL DEFAULT '',
  sentence_after_reading        TEXT,
  sentence_after_segments       JSONB,
  answer                        TEXT        NOT NULL DEFAULT '',
  answer_alts                   JSONB,
  answer_hint                   JSONB,
  translation_es                TEXT,
  translation_ca                TEXT,
  translation_en                TEXT,
  validated                     BOOLEAN     NOT NULL DEFAULT false,
  validated_by                  TEXT,
  topic                         TEXT,
  vocab_used                    JSONB       NOT NULL DEFAULT '[]',
  is_private                    BOOLEAN     NOT NULL DEFAULT false,
  private_user_id               UUID,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS grammar_sentences_test_user_grammar_idx
  ON public.grammar_sentences_test (user_id, grammar_id, created_at ASC);

ALTER TABLE public.grammar_sentences_test ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "grammar_sentences_test_admin" ON public.grammar_sentences_test;
CREATE POLICY "grammar_sentences_test_admin"
  ON public.grammar_sentences_test FOR ALL
  USING      (auth.uid() = user_id AND public.is_admin())
  WITH CHECK (auth.uid() = user_id AND public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. Interruptor del cron nocturno de refresco de frases
-- ---------------------------------------------------------------------------
ALTER TABLE public.grammar_refresh
  ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT true;
