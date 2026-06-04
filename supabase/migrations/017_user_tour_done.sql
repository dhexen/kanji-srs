-- Migration 017: track per-user tour completion so tours don't repeat on different browsers

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS tour_v3_done BOOLEAN NOT NULL DEFAULT FALSE;
