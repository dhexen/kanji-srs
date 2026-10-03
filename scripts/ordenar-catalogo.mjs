// Carga el reparto inicial del catálogo por lecciones de los libros
// (scripts/catalogo-orden.json) en catalog_topics.
//
//   node scripts/ordenar-catalogo.mjs            ← solo comprueba, no escribe
//   node scripts/ordenar-catalogo.mjs --escribir
//
// Antes hay que correr supabase/migrations/047_catalogo_orden.sql.
//
// El JSON sale de los mockups de orden (N5–N4, N3, N2, N1): por cada slug, su
// lección, tipo, orden dentro de la lección, nota, día del 総まとめ y lección de
// grammar-test. Pisa lo que haya, incluidas las correcciones hechas a mano
// desde la ficha: pásalo solo para volver al reparto inicial.
//
// Claves: .env.local (NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY).

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const env = {}
for (const linea of readFileSync(resolve(raiz, '.env.local'), 'utf8').split('\n')) {
  const m = linea.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local')
}
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const escribir = process.argv.includes('--escribir')
const orden = JSON.parse(readFileSync(resolve(raiz, 'scripts/catalogo-orden.json'), 'utf8'))

const { data: topics, error } = await db.from('catalog_topics').select('id, slug')
if (error) throw new Error(`Leyendo catalog_topics: ${error.message}`)

const porSlug = new Map(topics.map(t => [t.slug, t.id]))
const sobran = Object.keys(orden).filter(s => !porSlug.has(s))
const faltan = topics.filter(t => !(t.slug in orden)).map(t => t.slug)
console.log(`${topics.length} gramáticas en la base, ${Object.keys(orden).length} en el JSON`)
if (sobran.length) console.log(`  En el JSON y no en la base (${sobran.length}):`, sobran.slice(0, 10))
if (faltan.length) console.log(`  En la base y no en el JSON (${faltan.length}):`, faltan.slice(0, 10))

if (!escribir) {
  console.log('Solo comprobado. Para escribir: node scripts/ordenar-catalogo.mjs --escribir')
  process.exit(0)
}

let hechas = 0
for (const [slug, o] of Object.entries(orden)) {
  const id = porSlug.get(slug)
  if (!id) continue
  const { error } = await db
    .from('catalog_topics')
    .update({
      leccion: o.leccion,
      leccion_tipo: o.tipo,
      leccion_orden: o.orden,
      leccion_nota: o.nota,
      tambien: o.tambien,
      grammar_test: o.grammar_test,
    })
    .eq('id', id)
  if (error) throw new Error(`Escribiendo ${slug}: ${error.message}`)
  process.stdout.write(`\r  ${++hechas}/${Object.keys(orden).length}`)
}
process.stdout.write('\n')
console.log('Hecho.')
