-- Migration 031: state for the weekly (daily-rotating) grammar refresh cron.
-- The cron adds new sentences to ~1/7 of the grammar points each night so that
-- over a week every point is refreshed (capped at 100, oldest trimmed).

create table if not exists public.grammar_refresh (
  id              smallint primary key default 1,
  queue           text[] not null default '{}',   -- remaining point ids in the current cycle
  processed_today int not null default 0,
  run_date        date,
  updated_at      timestamptz not null default now()
);

insert into public.grammar_refresh (id) values (1) on conflict (id) do nothing;

alter table public.grammar_refresh enable row level security;
-- No public policies — only the service role (cron route) touches this table.
