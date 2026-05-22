-- Tracking columns (quién añadió y cuándo)
ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS added_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Trigger: sobreescribe added_by con auth.uid() en el servidor — el cliente no puede falsificarlo
CREATE OR REPLACE FUNCTION public.set_unofficial_vocab_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_official = false THEN
    NEW.added_by  := auth.uid();
    NEW.created_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_unofficial_vocab_metadata ON vocabulary;
CREATE TRIGGER set_unofficial_vocab_metadata
  BEFORE INSERT ON vocabulary
  FOR EACH ROW EXECUTE FUNCTION public.set_unofficial_vocab_metadata();

-- Rate limit: máx 20 palabras no oficiales por usuario en 24 h
CREATE OR REPLACE FUNCTION public.check_vocab_insert_rate()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*) < 20
  FROM public.vocabulary
  WHERE added_by  = auth.uid()
    AND is_official = false
    AND created_at > now() - INTERVAL '24 hours';
$$;

-- Policy estricta: longitudes + rate limit (reemplaza la anterior)
DROP POLICY IF EXISTS "Authenticated users insert unofficial vocab" ON vocabulary;
CREATE POLICY "Authenticated users insert unofficial vocab"
  ON vocabulary FOR INSERT
  TO authenticated
  WITH CHECK (
    is_official = false
    AND LENGTH(TRIM(COALESCE(word,       ''))) BETWEEN 1 AND 20
    AND LENGTH(TRIM(COALESCE(kanji,      ''))) BETWEEN 1 AND 5
    AND LENGTH(TRIM(COALESCE(reading,    ''))) BETWEEN 1 AND 50
    AND LENGTH(TRIM(COALESCE(meaning_es, ''))) BETWEEN 1 AND 300
    AND public.check_vocab_insert_rate()
  );
