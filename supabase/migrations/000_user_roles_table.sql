-- Create user_roles table (must run BEFORE 002_admin_policies.sql)
-- This table was referenced by policies and app code but never explicitly created.

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

-- Grant access so Supabase client can query it
alter table public.user_roles enable row level security;

-- Basic policy: users can read their own role
drop policy if exists "Users read own role" on public.user_roles;
create policy "Users read own role"
  on public.user_roles for select
  using (auth.uid() = user_id);
