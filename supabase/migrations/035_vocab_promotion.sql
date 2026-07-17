-- Palabras propuestas por alumnos: distinguir pendiente / oficial / rechazada / personal,
-- restringir de verdad la visibilidad de lo no-oficial, y auditar quién promueve.

ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS promotion_status text NOT NULL DEFAULT 'promoted'
    CHECK (promotion_status IN ('personal', 'pending', 'promoted', 'rejected')),
  ADD COLUMN IF NOT EXISTS promoted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz;

-- Las filas no-oficiales que ya existieran antes de esta feature no deben
-- inundar retroactivamente la cola de pendientes.
UPDATE vocabulary SET promotion_status = 'personal'
  WHERE is_official = false AND promotion_status = 'promoted';

-- Reemplaza la policy de INSERT de la migración 006: mismas comprobaciones +
-- exige que el estado de promoción sea uno de los que puede fijar un usuario normal.
DROP POLICY IF EXISTS "Authenticated users insert unofficial vocab" ON vocabulary;
CREATE POLICY "Authenticated users insert unofficial vocab"
  ON vocabulary FOR INSERT
  TO authenticated
  WITH CHECK (
    is_official = false
    AND promotion_status IN ('personal', 'pending')
    AND LENGTH(TRIM(COALESCE(word,       ''))) BETWEEN 1 AND 20
    AND LENGTH(TRIM(COALESCE(kanji,      ''))) BETWEEN 1 AND 5
    AND LENGTH(TRIM(COALESCE(reading,    ''))) BETWEEN 1 AND 50
    AND LENGTH(TRIM(COALESCE(meaning_es, ''))) BETWEEN 1 AND 300
    AND public.check_vocab_insert_rate()
  );

-- Restringe la LECTURA sin tocar ni adivinar el nombre de la policy permisiva
-- existente (la tabla se creó fuera de las migraciones): una policy RESTRICTIVE
-- se combina en AND con las permisivas, así que sí limita el acceso aunque ya
-- exista un "allow all authenticated" de fondo.
DROP POLICY IF EXISTS "Vocab visible solo si es oficial, propia, o eres staff" ON vocabulary;
CREATE POLICY "Vocab visible solo si es oficial, propia, o eres staff"
  ON vocabulary AS RESTRICTIVE FOR SELECT
  TO authenticated
  USING (
    promotion_status = 'promoted'
    OR added_by = auth.uid()
    OR public.get_my_role() IN ('admin', 'contributor')
  );
