-- Migration 046: dashboard personalizable.
--
-- Cada usuario puede montar su dashboard en filas de 1 a 4 columnas, con las
-- tarjetas que elija. Se guarda como JSON en user_settings:
--   { "v": 1, "rows": [ { "cols": 3, "cards": ["today", "forecast", null] }, … ] }
-- null = hueco vacío. Sin valor (o columna sin crear) = el diseño por defecto.
--
-- user_settings ya tiene RLS «Users manage own settings», así que no hacen
-- falta políticas nuevas.

alter table public.user_settings
  add column if not exists dashboard_layout jsonb;
