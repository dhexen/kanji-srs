-- Add is_official flag to vocabulary table
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS is_official boolean NOT NULL DEFAULT true;

-- Allow any authenticated user to insert unofficial vocabulary
-- (existing SELECT policy already covers reads)
DROP POLICY IF EXISTS "Authenticated users insert unofficial vocab" ON vocabulary;
CREATE POLICY "Authenticated users insert unofficial vocab"
  ON vocabulary FOR INSERT
  TO authenticated
  WITH CHECK (is_official = false);
