-- Add pexels_api_key column to user_settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS pexels_api_key text;
