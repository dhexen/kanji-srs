-- Migration 018: track which help sections each user has already seen,
-- so the contextual help drawer only auto-opens once per user (not per browser).

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS help_seen TEXT[] NOT NULL DEFAULT '{}';
