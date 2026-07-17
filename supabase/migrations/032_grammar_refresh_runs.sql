-- Migration 032: run log for the grammar refresh cron, so it can be monitored
-- from an admin screen (one row per invocation).

create table if not exists public.grammar_refresh_runs (
  id          bigserial primary key,
  ran_at      timestamptz not null default now(),
  trigger     text not null default 'cron',   -- 'cron' | 'manual'
  processed   int not null default 0,         -- points processed this run
  added       int not null default 0,         -- sentences inserted this run
  remaining   int not null default 0,         -- points left in the cycle after this run
  stopped     text,                           -- why the run ended
  error       text,                           -- last error message, if any
  duration_ms int not null default 0
);

create index if not exists grammar_refresh_runs_ran_at_idx
  on public.grammar_refresh_runs (ran_at desc);

alter table public.grammar_refresh_runs enable row level security;
-- No public policies — only the service role (cron + admin routes) touches this.
