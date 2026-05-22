-- Normalized SRS progress (run in Supabase SQL Editor)

-- ---------------------------------------------------------------------------
-- Per-word progress (one row per user + jp)
-- ---------------------------------------------------------------------------
create table if not exists public.user_vocab_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  jp text not null,
  kanji text not null,
  reading text not null,
  meaning text not null,
  status text not null default 'locked' check (status in ('locked', 'active')),
  srs_level smallint not null default 0,
  due bigint not null default 0,
  srs_multi_level smallint,
  srs_multi_due bigint,
  srs_meaning_level smallint,
  srs_meaning_due bigint,
  srs_kanji_level smallint,
  srs_kanji_due bigint,
  srs_reading_level smallint,
  srs_reading_due bigint,
  srs_reverse_level smallint,
  srs_reverse_due bigint,
  updated_at timestamptz not null default now(),
  primary key (user_id, jp)
);

create index if not exists user_vocab_progress_user_idx
  on public.user_vocab_progress (user_id);

create index if not exists user_vocab_progress_user_multi_due_idx
  on public.user_vocab_progress (user_id, srs_multi_due)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- Account settings (separate from progress)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gemini_api_key text,
  context_texts jsonb not null default '[]',
  language text not null default 'es',
  reviews_since_snapshot int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Review audit log (one row per SRS answer)
-- ---------------------------------------------------------------------------
create table if not exists public.srs_review_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  jp text not null,
  mode text not null,
  is_correct boolean not null,
  level_before smallint,
  level_after smallint,
  due_after bigint,
  created_at timestamptz not null default now()
);

create index if not exists srs_review_log_user_created_idx
  on public.srs_review_log (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Full-state snapshots for recovery (keep last 10 per user)
-- ---------------------------------------------------------------------------
create table if not exists public.srs_progress_snapshots (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot jsonb not null,
  reason text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists srs_progress_snapshots_user_created_idx
  on public.srs_progress_snapshots (user_id, created_at desc);

create or replace function public.prune_user_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.srs_progress_snapshots
  where id in (
    select id
    from public.srs_progress_snapshots
    where user_id = new.user_id
    order by created_at desc
    offset 10
  );
  return new;
end;
$$;

drop trigger if exists prune_snapshots_after_insert on public.srs_progress_snapshots;
create trigger prune_snapshots_after_insert
  after insert on public.srs_progress_snapshots
  for each row execute function public.prune_user_snapshots();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.user_vocab_progress enable row level security;
alter table public.user_settings enable row level security;
alter table public.srs_review_log enable row level security;
alter table public.srs_progress_snapshots enable row level security;

drop policy if exists "Users manage own vocab progress" on public.user_vocab_progress;
create policy "Users manage own vocab progress"
  on public.user_vocab_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Admins read all vocab progress" on public.user_vocab_progress;
create policy "Admins read all vocab progress"
  on public.user_vocab_progress for select
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid() and user_roles.role = 'admin'
    )
  );

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings"
  on public.user_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own review log" on public.srs_review_log;
create policy "Users manage own review log"
  on public.srs_review_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own snapshots" on public.srs_progress_snapshots;
create policy "Users manage own snapshots"
  on public.srs_progress_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Migrate legacy srs_progress.vocab_db → user_vocab_progress (one-time per user)
-- ---------------------------------------------------------------------------
-- Run from the app on login when user_vocab_progress is empty.
