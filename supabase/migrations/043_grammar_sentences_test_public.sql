-- =============================================================================
-- Migration 043: el pool de frases de TEST es COMPARTIDO/PÚBLICO (espejo de prod)
--
-- La 042 dejó grammar_sentences_test con RLS solo-admin PERO scoped por user_id
-- (auth.uid() = user_id), así que cada admin solo veía SUS frases generadas. Eso
-- rompe el espejo con producción: allí las frases sembradas son is_private=false
-- y las ve TODO el mundo (esa es la razón de sembrarlas — que nadie necesite su
-- propia API key). Igualamos el comportamiento: cualquier admin ve todas las
-- frases públicas del pool de test (+ sus propias privadas, si las hubiera),
-- exactamente como la política de grammar_sentences.
--
-- Ejecutar en Supabase → SQL Editor → New query.
-- =============================================================================

DROP POLICY IF EXISTS "grammar_sentences_test_admin" ON public.grammar_sentences_test;

CREATE POLICY "grammar_sentences_test_admin"
  ON public.grammar_sentences_test FOR ALL
  USING      (public.is_admin() AND (is_private = false OR private_user_id = auth.uid()))
  WITH CHECK (public.is_admin());
