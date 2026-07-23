-- Migration 036: marca las entradas de vocabulario que NO son una palabra real
-- por sí mismas (un kanji suelto cuya lectura solo existe con okurigana o dentro
-- de un compuesto, p. ej. word 休 / reading やす — la palabra real es 休む).
--
-- Flujo: una herramienta de admin escanea los kanji sueltos con Gemini y marca
-- los sospechosos como 'flagged'; un humano confirma → 'hidden' (el glosario las
-- oculta) o los descarta → 'ok'. 'pending' = aún sin escanear.
ALTER TABLE public.vocabulary
  ADD COLUMN IF NOT EXISTS word_review text NOT NULL DEFAULT 'pending';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vocabulary_word_review_check'
      AND conrelid = 'public.vocabulary'::regclass
  ) THEN
    ALTER TABLE public.vocabulary
      ADD CONSTRAINT vocabulary_word_review_check
      CHECK (word_review IN ('pending', 'flagged', 'ok', 'hidden'));
  END IF;
END $$;

-- Consultas frecuentes: filtrar por estado (ocultas / pendientes de revisar).
CREATE INDEX IF NOT EXISTS idx_vocabulary_word_review
  ON public.vocabulary (word_review);
