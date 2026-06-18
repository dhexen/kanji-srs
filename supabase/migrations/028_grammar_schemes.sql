-- Migration 028: conjugation/usage schemes for grammar points (MNN + JLPT).
-- One row per grammar point_id (works for both 'mnn1-…' and 'n4-…' ids).
-- Reference content, written only via the service role (admin tool); public read.

create table if not exists public.grammar_schemes (
  point_id   text primary key,
  scheme     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.grammar_schemes enable row level security;

drop policy if exists "Anyone reads grammar schemes" on public.grammar_schemes;
create policy "Anyone reads grammar schemes"
  on public.grammar_schemes for select
  using (true);

notify pgrst, 'reload schema';
