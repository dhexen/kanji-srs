-- Migration 029: Catálogo JLPT (sección /catalogo, de momento solo admin).
--
-- Copia del catálogo del proyecto Hellotalk: todas las gramáticas del JLPT
-- (N5→N1, 676 fichas sacadas de guiadejapones) con sus frases de ejemplo.
-- Los datos se copian con scripts/copiar-catalogo.mjs, que va con service_role.
--
-- Es independiente de todo lo demás: no toca grammar_*, ni jlpt_grammar_*, ni
-- el SRS, ni el calendario. Borrar estas tres tablas deja la app como estaba.
--
-- RLS: solo lee el admin, porque la sección está oculta para el resto de roles.
-- Cuando se abra a más gente, basta con cambiar las políticas de lectura.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Un punto de gramática
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.catalog_topics (
  id               uuid primary key default gen_random_uuid(),
  jlpt             text not null check (jlpt in ('N1','N2','N3','N4','N5')),
  -- El trozo final de la URL de su ficha original: identifica la gramática
  -- (el nombre japonés se repite y la posición puede cambiar).
  slug             text not null unique,
  name             text not null,            -- la forma japonesa: 〜ている
  romaji           text,
  gloss_es         text,                     -- el significado corto, de una línea
  explicacion_html text,                     -- el cuerpo de la ficha, ya limpio
  uso              jsonb,                    -- el «Cómo se usa», ya troceado
  source_url       text not null,
  position         int  not null default 0,  -- su nº en la lista del nivel
  fetched_at       timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists idx_catalog_topics_jlpt on public.catalog_topics(jlpt, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Las frases de ejemplo de cada gramática
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.catalog_examples (
  id         uuid not null default gen_random_uuid() primary key,
  topic_id   uuid not null references public.catalog_topics(id) on delete cascade,
  position   int  not null,
  text_ja    text not null,
  kana       text,
  romaji     text,
  text_es    text,
  -- 'web' = la ficha ya traía el español; 'traducido' = venía en inglés y lo
  -- tradujo Gemini.
  origen     text not null default 'web' check (origen in ('web','traducido')),
  -- La frase troceada para el ejercicio de piezas (ES → JA). null = no se pudo.
  piezas     text[],
  created_at timestamptz not null default now(),
  unique (topic_id, position)
);

create index if not exists idx_catalog_examples_topic on public.catalog_examples(topic_id, position);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Explicaciones generadas con Gemini
-- ─────────────────────────────────────────────────────────────────────────────
-- 240 de las 676 fichas no traen explicación propia (solo el reclamo de la web).
-- Para esas, la ficha ofrece generar una con Gemini y se guarda aquí, una sola
-- vez por gramática, para no volver a pedirla.
create table if not exists public.catalog_explanations (
  topic_id       uuid primary key references public.catalog_topics(id) on delete cascade,
  explanation_es text not null,
  model          text,
  updated_at     timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.catalog_topics       enable row level security;
alter table public.catalog_examples     enable row level security;
alter table public.catalog_explanations enable row level security;

drop policy if exists "Admins read catalog topics"        on public.catalog_topics;
drop policy if exists "Admins read catalog examples"      on public.catalog_examples;
drop policy if exists "Admins manage catalog explanations" on public.catalog_explanations;

-- Topics y ejemplos: solo lectura desde el navegador. Escribe el script de
-- copia, con service_role, que se salta RLS.
create policy "Admins read catalog topics"
  on public.catalog_topics for select
  using (public.is_admin());

create policy "Admins read catalog examples"
  on public.catalog_examples for select
  using (public.is_admin());

-- Las explicaciones las genera el admin desde la propia ficha.
create policy "Admins manage catalog explanations"
  on public.catalog_explanations for all
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
