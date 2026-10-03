-- Migration 047: el orden del catálogo según los libros.
--
-- Cada gramática del catálogo dice en qué lección del libro se estudia, para
-- poder recorrer un nivel en el orden de un curso de verdad y no en el de la
-- web de donde salieron las fichas:
--
--   leccion  '8'       → lección 8 de Minna no Nihongo Shokyū (1–50)
--            'C10'     → lección 10 de Minna no Nihongo Chūkyū (1–24)
--            'S2-3-3'  → 日本語総まとめ N2, semana 3, día 3 (y S1, S3 igual)
--            'W'       → no es gramática: se aprende como vocabulario
--            'X'       → no sale en ningún libro
--   leccion_tipo  p = es un punto de esa lección
--                 v = sale en el vocabulario de esa lección
--                 f = no sale, va junto a lo más parecido
--                 w = vocabulario (adverbios, conjunciones…)
--                 x = sin referencia
--   leccion_orden  su sitio dentro de la lección (1, 2, 3…), por nivel.
--   leccion_nota   por qué está ahí, si no es obvio.
--   tambien        si además es un punto de un 総まとめ, qué día.
--   grammar_test   la lección donde está en /grammar-test ('8' Shokyū, 'C12'
--                  Chūkyū), solo de referencia.
--
-- El primer reparto lo carga scripts/ordenar-catalogo.mjs. Después se corrige
-- desde la propia ficha (lo puede hacer el admin), así que el script solo se
-- vuelve a pasar si se quiere volver al reparto inicial.

alter table public.catalog_topics
  add column if not exists leccion       text,
  add column if not exists leccion_tipo  text check (leccion_tipo in ('p','v','f','w','x')),
  add column if not exists leccion_orden int,
  add column if not exists leccion_nota  text,
  add column if not exists tambien       text,
  add column if not exists grammar_test  text;

create index if not exists idx_catalog_topics_leccion
  on public.catalog_topics(jlpt, leccion, leccion_orden);

-- Recolocar se hace desde el navegador, como admin.
drop policy if exists "Admins update catalog topics" on public.catalog_topics;
create policy "Admins update catalog topics"
  on public.catalog_topics for update
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
