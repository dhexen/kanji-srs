-- Migration 039: añade a user_vocab_progress las columnas que la app escribe
-- pero que faltaban en la tabla real (creada a mano, solo tenía multi + meaning).
--
-- Sin ellas, el upsert de cada repaso devolvía 400 → saveReviewResult fallaba
-- antes de insertar en srs_review_log → ranking semanal vacío.
-- Definiciones tomadas de 001_vocab_progress_schema.sql.

ALTER TABLE public.user_vocab_progress
  ADD COLUMN IF NOT EXISTS srs_level         smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS due               bigint   NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS srs_kanji_level   smallint,
  ADD COLUMN IF NOT EXISTS srs_kanji_due     bigint,
  ADD COLUMN IF NOT EXISTS srs_reading_level smallint,
  ADD COLUMN IF NOT EXISTS srs_reading_due   bigint,
  ADD COLUMN IF NOT EXISTS srs_reverse_level smallint,
  ADD COLUMN IF NOT EXISTS srs_reverse_due   bigint;

-- Índice de repasos pendientes por modo multi (existía en 001; idempotente).
CREATE INDEX IF NOT EXISTS user_vocab_progress_user_multi_due_idx
  ON public.user_vocab_progress (user_id, srs_multi_due)
  WHERE status = 'active';
