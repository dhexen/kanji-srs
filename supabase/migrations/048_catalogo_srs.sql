-- Migration 048: SRS del catálogo de gramática.
--
-- Cada gramática del catálogo que el usuario añade a su pool («+») tiene una
-- fila aquí con su nivel SRS (los 9 de siempre: 1-4 aprendiz, 5-6 gurú,
-- 7 maestro, 8 iluminado, 9 quemado) y cuándo toca repasarla (ms Unix).
-- level 0 = recién añadida, pendiente del primer repaso.

create table if not exists public.catalog_srs_progress (
  user_id     uuid not null references auth.users(id) on delete cascade,
  topic_id    uuid not null references public.catalog_topics(id) on delete cascade,
  level       int not null default 0,
  next_review bigint not null default 0,
  updated_at  timestamptz not null default now(),
  primary key (user_id, topic_id)
);

alter table public.catalog_srs_progress enable row level security;

drop policy if exists "Users manage own catalog srs" on public.catalog_srs_progress;
create policy "Users manage own catalog srs"
  on public.catalog_srs_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
