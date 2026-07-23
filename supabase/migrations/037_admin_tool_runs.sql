-- Migration 037: last-execution timestamp per admin tool, for the admin
-- dashboard. One row per tool (upserted on each run) — we only care about the
-- most recent execution, not full history.

create table if not exists public.admin_tool_runs (
  tool_key    text primary key,          -- stable id of the tool, e.g. 'vocab-scan-non-words'
  last_run_at timestamptz not null default now(),
  last_run_by uuid references auth.users(id) on delete set null
);

alter table public.admin_tool_runs enable row level security;
-- No public policies — only the service role (admin routes) reads/writes this.
