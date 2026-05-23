-- Grammar progress: tracks which grammar points each user has marked as "known"
-- Run this in the Supabase SQL Editor

create table if not exists public.user_grammar_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  grammar_id text not null,
  known      boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, grammar_id)
);

create index if not exists user_grammar_progress_user_idx
  on public.user_grammar_progress (user_id);

alter table public.user_grammar_progress enable row level security;

drop policy if exists "Users manage own grammar progress" on public.user_grammar_progress;
create policy "Users manage own grammar progress"
  on public.user_grammar_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
