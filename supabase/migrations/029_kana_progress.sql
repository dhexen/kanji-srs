-- Migration 029: per-user kana progress (which hiragana/katakana characters
-- the user has learned). One row per learned character.

create table if not exists public.user_kana_progress (
  user_id    uuid not null references auth.users(id) on delete cascade,
  kana       text not null,
  script     text not null check (script in ('hiragana', 'katakana')),
  learned_at timestamptz not null default now(),
  primary key (user_id, kana)
);

create index if not exists user_kana_progress_user_idx
  on public.user_kana_progress (user_id);

alter table public.user_kana_progress enable row level security;

drop policy if exists "Users manage own kana progress" on public.user_kana_progress;
create policy "Users manage own kana progress"
  on public.user_kana_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
