-- Global app configuration (admin-managed key-value store)

create table if not exists public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Seed with default SRS intervals (in ms)
insert into public.app_config (key, value) values (
  'srs_intervals',
  '[0, 14400000, 43200000, 86400000, 172800000, 432000000, 1036800000, 2592000000]'::jsonb
) on conflict (key) do nothing;

-- RLS: everyone can read, only admins can write
alter table public.app_config enable row level security;

drop policy if exists "Anyone can read app_config" on public.app_config;
create policy "Anyone can read app_config"
  on public.app_config for select
  using (true);

drop policy if exists "Admins can manage app_config" on public.app_config;
create policy "Admins can manage app_config"
  on public.app_config for all
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );
