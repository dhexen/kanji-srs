-- ============================================================
-- Migration: vocab_antonyms — tabla de pares de contrarios
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Crear la tabla de pares contrarios
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS vocab_antonyms (
  id          bigserial PRIMARY KEY,
  word_a      text NOT NULL,
  word_b      text NOT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT unique_antonym_pair UNIQUE (word_a, word_b),
  CONSTRAINT unique_antonym_pair_reverse UNIQUE (word_b, word_a),
  CONSTRAINT no_self_antonym CHECK (word_a <> word_b)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_vocab_antonyms_word_a ON vocab_antonyms(word_a);
CREATE INDEX IF NOT EXISTS idx_vocab_antonyms_word_b ON vocab_antonyms(word_b);

-- 2. Habilitar RLS
-- ─────────────────
ALTER TABLE vocab_antonyms ENABLE ROW LEVEL SECURITY;

-- 3. Cualquiera puede leer los pares (sección pública)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vocab_antonyms' AND policyname = 'vocab_antonyms_select'
  ) THEN
    CREATE POLICY vocab_antonyms_select
      ON vocab_antonyms FOR SELECT
      USING (true);
  END IF;
END
$$;

-- 4. Solo admin/contributor puede insertar pares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vocab_antonyms' AND policyname = 'vocab_antonyms_insert'
  ) THEN
    CREATE POLICY vocab_antonyms_insert
      ON vocab_antonyms FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'contributor')
        )
      );
  END IF;
END
$$;

-- 5. Solo admin/contributor puede eliminar pares
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'vocab_antonyms' AND policyname = 'vocab_antonyms_delete'
  ) THEN
    CREATE POLICY vocab_antonyms_delete
      ON vocab_antonyms FOR DELETE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM user_roles
          WHERE user_id = auth.uid()
            AND role IN ('admin', 'contributor')
        )
      );
  END IF;
END
$$;

-- ============================================================
-- Verificación
-- ============================================================
-- Para comprobar que la tabla y las políticas se crearon bien:
--   SELECT * FROM pg_policies WHERE tablename = 'vocab_antonyms';
--   SELECT COUNT(*) FROM vocab_antonyms;
