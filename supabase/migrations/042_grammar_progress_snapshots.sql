-- =============================================================================
-- Migration 042: snapshots de progreso de gramática (recuperación)
--
-- El progreso de gramática vive en TRES tablas (user_grammar_progress "conocidos",
-- grammar_srs_progress estado SRS, user_jlpt_progress estado JLPT) y hasta ahora
-- no tenía ninguna copia de seguridad. Esta tabla guarda un snapshot JSON con el
-- estado de las tres, para poder restaurarlo desde el panel de admin.
--
-- Se crea un snapshot 'daily' al abrir la sección de gramática (máximo uno al
-- día) y uno 'admin_restore' justo antes de sobrescribir en una restauración.
-- Se conservan los últimos 10 por usuario (trigger de poda).
--
-- Ejecutar en Supabase → SQL Editor → New query.
-- =============================================================================

create table if not exists public.grammar_progress_snapshots (
  id         bigserial primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  snapshot   jsonb not null,
  reason     text not null default 'daily',
  created_at timestamptz not null default now()
);

create index if not exists grammar_progress_snapshots_user_created_idx
  on public.grammar_progress_snapshots (user_id, created_at desc);

alter table public.grammar_progress_snapshots enable row level security;

-- Cada usuario gestiona sus propios snapshots (el snapshot diario lo crea el
-- cliente). El admin restaura con el service role, que salta RLS.
drop policy if exists "grammar_snapshots_own" on public.grammar_progress_snapshots;
create policy "grammar_snapshots_own"
  on public.grammar_progress_snapshots for all
  using      (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Poda: conservar solo los 10 snapshots más recientes por usuario.
create or replace function public.prune_grammar_snapshots()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.grammar_progress_snapshots
  where id in (
    select id
    from public.grammar_progress_snapshots
    where user_id = new.user_id
    order by created_at desc
    offset 10
  );
  return new;
end;
$$;

drop trigger if exists prune_grammar_snapshots_trg on public.grammar_progress_snapshots;
create trigger prune_grammar_snapshots_trg
  after insert on public.grammar_progress_snapshots
  for each row execute function public.prune_grammar_snapshots();
