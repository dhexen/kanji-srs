// Copia el catálogo JLPT (catalog_topics + catalog_examples) desde la base de
// Supabase de Hellotalk a la de kanji-srs.
//
//   node scripts/copiar-catalogo.mjs
//
// Antes hay que correr supabase/migrations/029_catalogo.sql en kanji-srs.
//
// De dónde saca las claves:
//   · Origen  (Hellotalk): ../Hellotalk/.env  — o la ruta de HELLOTALK_ENV.
//   · Destino (kanji-srs): .env.local          — NEXT_PUBLIC_SUPABASE_URL y
//                                                SUPABASE_SERVICE_ROLE_KEY.
//
// Va con service_role en los dos lados (se salta RLS). Conserva los ids, así
// que se puede volver a pasar cuando cambie el catálogo de Hellotalk: lo que ya
// está se actualiza y lo nuevo se añade. No borra nada del destino.

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function leeEnv(ruta) {
  if (!existsSync(ruta)) throw new Error(`No existe ${ruta}`)
  const env = {}
  for (const linea of readFileSync(ruta, 'utf8').split('\n')) {
    const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return env
}

function cliente(env, quien) {
  const url = env.NEXT_PUBLIC_SUPABASE_URL
  const key = env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error(`Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ${quien}`)
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const rutaOrigen = process.env.HELLOTALK_ENV ?? resolve(raiz, '../Hellotalk/.env')
const rutaDestino = resolve(raiz, '.env.local')
const envOrigen = leeEnv(rutaOrigen)
const envDestino = leeEnv(rutaDestino)

if (envOrigen.NEXT_PUBLIC_SUPABASE_URL === envDestino.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Origen y destino son la misma base: revisa los .env')
}

const origen = cliente(envOrigen, rutaOrigen)
const destino = cliente(envDestino, rutaDestino)

const TOPIC_COLS = 'id, jlpt, slug, name, romaji, gloss_es, explicacion_html, uso, source_url, position, fetched_at, created_at'
const EXAMPLE_COLS = 'id, topic_id, position, text_ja, kana, romaji, text_es, origen, piezas, created_at'

/** Toda la tabla, en páginas de 1000 (el tope por petición de Supabase). */
async function todo(tabla, cols) {
  const filas = []
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await origen
      .from(tabla)
      .select(cols)
      .order('id', { ascending: true })
      .range(desde, desde + 999)
    if (error) throw new Error(`Leyendo ${tabla}: ${error.message}`)
    filas.push(...data)
    if (data.length < 1000) break
  }
  return filas
}

async function escribe(tabla, filas) {
  for (let i = 0; i < filas.length; i += 500) {
    const trozo = filas.slice(i, i + 500)
    const { error } = await destino.from(tabla).upsert(trozo, { onConflict: 'id' })
    if (error) throw new Error(`Escribiendo ${tabla}: ${error.message}`)
    process.stdout.write(`\r  ${tabla}: ${Math.min(i + 500, filas.length)}/${filas.length}`)
  }
  process.stdout.write('\n')
}

async function cuenta(cliente, tabla) {
  const { count, error } = await cliente.from(tabla).select('id', { count: 'exact', head: true })
  if (error) throw new Error(`Contando ${tabla}: ${error.message}`)
  return count
}

console.log('Leyendo el catálogo de Hellotalk…')
const topics = await todo('catalog_topics', TOPIC_COLS)
const examples = await todo('catalog_examples', EXAMPLE_COLS)
console.log(`  ${topics.length} gramáticas, ${examples.length} frases`)

// Los slugs son únicos: si en el destino hubiera una ficha con el mismo slug y
// otro id (no debería), el upsert por id fallaría. Mejor avisar claro.
console.log('Copiando a kanji-srs…')
await escribe('catalog_topics', topics)
await escribe('catalog_examples', examples)

const [t, e] = await Promise.all([cuenta(destino, 'catalog_topics'), cuenta(destino, 'catalog_examples')])
console.log(`Hecho. En kanji-srs hay ahora ${t} gramáticas y ${e} frases.`)
