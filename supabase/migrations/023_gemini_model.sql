-- Migration 023: let users pick which Gemini model to use (so they can switch
-- to a different model if one runs out of quota).
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS gemini_model TEXT NOT NULL DEFAULT 'gemini-2.5-flash';
