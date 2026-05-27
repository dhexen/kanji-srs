-- ============================================================
-- Migration: función para contar logins por usuario
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================
--
-- Lee auth.audit_log_entries (tabla interna de GoTrue/Supabase Auth)
-- con SECURITY DEFINER para que el rol de la API pública pueda llamarla.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_login_counts()
RETURNS TABLE(user_id uuid, login_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (payload->>'actor_id')::uuid AS user_id,
    COUNT(*)                      AS login_count
  FROM auth.audit_log_entries
  WHERE payload->>'action' = 'login'
    AND payload->>'actor_id' IS NOT NULL
  GROUP BY payload->>'actor_id'
$$;

-- Permitir al rol de servicio (service_role) y al rol autenticado llamarla
-- (el admin panel la llama con service_role, pero por si acaso):
GRANT EXECUTE ON FUNCTION public.get_user_login_counts() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_login_counts() TO authenticated;
