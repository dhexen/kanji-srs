-- RPC function to get the current user's role.
-- Uses SECURITY DEFINER to bypass RLS on user_roles.
-- This avoids any chicken-and-egg issues with RLS policies.

create or replace function public.get_my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_roles where user_id = auth.uid()),
    'user'
  );
$$;
