-- Migration 027: JLPT grammar section (independent from the SRS / calendar).
-- Two tables:
--   1. jlpt_grammar_details  - AI-enriched explanation + examples per JLPT point
--                              (reference content, filled by an admin tool).
--   2. user_jlpt_progress    - per-user "seen / known" status, kept SEPARATE from
--                              user_grammar_progress / grammar_srs so it never
--                              touches the real SRS, calendar or stats.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Enriched content (public reference; written only via service role)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.jlpt_grammar_details (
  point_id        text primary key,
  explanation_es  text,
  explanation_en  text,
  examples        jsonb not null default '[]'::jsonb,
  updated_at      timestamptz not null default now()
);

alter table public.jlpt_grammar_details enable row level security;

drop policy if exists "Anyone reads jlpt details" on public.jlpt_grammar_details;
create policy "Anyone reads jlpt details"
  on public.jlpt_grammar_details for select
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Per-user progress (NOT linked to the calendar / SRS)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.user_jlpt_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  point_id   text not null,
  status     text not null default 'studying' check (status in ('studying', 'known')),
  updated_at timestamptz not null default now(),
  primary key (user_id, point_id)
);

create index if not exists user_jlpt_progress_user_idx
  on public.user_jlpt_progress (user_id);

alter table public.user_jlpt_progress enable row level security;

drop policy if exists "Users manage own jlpt progress" on public.user_jlpt_progress;
create policy "Users manage own jlpt progress"
  on public.user_jlpt_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
