-- Add last_seen_at to user_roles to track when users last used the app.
-- Supabase's built-in last_sign_in_at only updates on explicit logins,
-- not when a session is restored from localStorage.

ALTER TABLE public.user_roles
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- RPC called on app load to update last_seen_at (throttled: at most once per hour).
-- Uses UPSERT so users without a row yet get one created automatically.
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.user_roles (user_id, role, last_seen_at)
  VALUES (auth.uid(), 'user', now())
  ON CONFLICT (user_id) DO UPDATE
    SET last_seen_at = now()
    WHERE user_roles.last_seen_at IS NULL
       OR user_roles.last_seen_at < now() - interval '1 hour';
$$;

GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;
