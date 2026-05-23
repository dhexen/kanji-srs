-- Add image_url to shared vocabulary table.
-- NULL = not yet processed; '' (empty) = checked, no suitable image; 'https://...' = has image.
ALTER TABLE vocabulary ADD COLUMN IF NOT EXISTS image_url text;
