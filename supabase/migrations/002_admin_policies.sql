-- Admin helpers and RLS (run after 001)

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

-- user_roles: admins can manage all rows
alter table public.user_roles enable row level security;

drop policy if exists "Users read own role" on public.user_roles;
drop policy if exists "Admins manage all roles" on public.user_roles;

create policy "Users read own role"
  on public.user_roles for select
  using (auth.uid() = user_id or public.is_admin());

create policy "Admins manage all roles"
  on public.user_roles for all
  using (public.is_admin())
  with check (public.is_admin());

-- Snapshots: admins can read any user's backups
drop policy if exists "Admins read all snapshots" on public.srs_progress_snapshots;
create policy "Admins read all snapshots"
  on public.srs_progress_snapshots for select
  using (auth.uid() = user_id or public.is_admin());

-- Vocab progress: admins can restore another user
drop policy if exists "Admins manage all vocab progress" on public.user_vocab_progress;
create policy "Admins manage all vocab progress"
  on public.user_vocab_progress for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- Settings: admins can read/update for support
drop policy if exists "Admins manage all settings" on public.user_settings;
create policy "Admins manage all settings"
  on public.user_settings for all
  using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());
