-- Migration 040: añade a user_settings la columna reviews_since_snapshot, que
-- faltaba en la tabla real (creada a mano). La usa el contador de snapshots
-- automáticos (maybeCreateSnapshot). Sin ella, la lectura devolvía 400.
-- Definición tomada de 001_vocab_progress_schema.sql.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS reviews_since_snapshot int NOT NULL DEFAULT 0;
