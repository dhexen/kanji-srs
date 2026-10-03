// El catálogo del JLPT: todas las gramáticas que existen, por nivel.
//
// Copiado del proyecto Hellotalk (sección «Catálogo»). Es de solo mirar y
// practicar: no entra en el SRS, ni en el calendario, ni en las estadísticas.
// Los datos viven en catalog_topics / catalog_examples (migración 045) y se
// copian con scripts/copiar-catalogo.mjs. De momento solo lo ve el admin.

import { supabase } from './supabase'
import type { TipoLeccion } from './catalogo-libros'

export const NIVELES = ['N5', 'N4', 'N3', 'N2', 'N1'] as const
export type Jlpt = (typeof NIVELES)[number]

// Los mismos colores por nivel que la sección JLPT de /grammar.
export const NIVEL_PILL: Record<Jlpt, string> = {
  N5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  N4: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  N3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  N2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  N1: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}
export const NIVEL_RAYA: Record<Jlpt, string> = {
  N5: 'bg-emerald-400',
  N4: 'bg-sky-400',
  N3: 'bg-violet-400',
  N2: 'bg-amber-400',
  N1: 'bg-rose-400',
}

// ── El «Cómo se usa» ────────────────────────────────────────────────────────
// La estructura que pide la gramática, ya troceada (la trocea el script de
// Hellotalk que baja las fichas).

/** Un tramo de texto. `ja` = es japonés; `s` = la web lo traía tachado. */
export type UsoSeg = { ja: boolean; txt: string; s?: boolean }

/**
 * Una celda de la tabla, con sus alternativas.
 *   nucleo = la gramática, japonés. NO se puede partir por la mitad.
 *   lado   = el hueco donde metes tu palabra («Sustantivo»). Sí se puede.
 *   mixto  = las dos cosas («Sustantivo / Adjetivo-な + であれ»).
 */
export type UsoTrozo = { t: 'nucleo' | 'lado' | 'mixto'; alts: UsoSeg[][] }

/** Un trozo, o las alternativas que la web apilaba con rowspan. */
export type UsoCelda = UsoTrozo | UsoTrozo[]

/** Una fila: o es una fórmula, o es un comentario suelto. */
export type UsoFila = { nota: string } | { celdas: UsoCelda[] }

export type Uso = UsoFila[]

export const esNota = (f: UsoFila): f is { nota: string } => 'nota' in f

export type CatalogTopic = {
  id: string
  jlpt: Jlpt
  slug: string
  name: string
  romaji: string | null
  gloss_es: string | null
  explicacion_html: string | null
  uso: Uso | null
  source_url: string
  position: number
}

/**
 * Dónde se estudia en los libros (migración 047; ver lib/catalogo-libros.ts).
 * Todo null si la migración no se ha corrido o la ficha aún no está colocada.
 */
export type CatalogoLeccion = {
  leccion: string | null
  leccion_tipo: TipoLeccion | null
  leccion_orden: number | null
  leccion_nota: string | null
  tambien: string | null
  grammar_test: string | null
}

export type CatalogExample = {
  id: string
  position: number
  text_ja: string
  kana: string | null
  romaji: string | null
  text_es: string | null
  /** 'traducido' = la ficha la traía en inglés y la pasó Gemini. */
  origen: string
  /** La frase troceada, para montarla pieza a pieza en el modo ES → JA. */
  piezas: string[] | null
}

/** La ficha en la lista de la izquierda: lo justo para pintarla y buscarla. */
export type CatalogoItem = {
  id: string
  jlpt: Jlpt
  slug: string
  name: string
  romaji: string | null
  gloss_es: string | null
  position: number
} & CatalogoLeccion

const LIST_COLUMNS = 'id, jlpt, slug, name, romaji, gloss_es, position'
const LECCION_COLUMNS = 'leccion, leccion_tipo, leccion_orden, leccion_nota, tambien, grammar_test'
const SIN_LECCION: CatalogoLeccion = {
  leccion: null, leccion_tipo: null, leccion_orden: null, leccion_nota: null, tambien: null, grammar_test: null,
}
const TOPIC_COLUMNS = 'id, jlpt, slug, name, romaji, gloss_es, explicacion_html, uso, source_url, position'
const EXAMPLE_COLUMNS = 'id, position, text_ja, kana, romaji, text_es, origen, piezas'

/** El tope de filas por petición de Supabase. */
const PAGINA = 1000

// En la URL el nivel va en minúsculas (/catalogo/n5); en la base, en mayúsculas.
export function nivelDeUrl(x: string): Jlpt | null {
  const n = x.toUpperCase()
  return (NIVELES as readonly string[]).includes(n) ? (n as Jlpt) : null
}

export function urlDeFicha(x: { jlpt: Jlpt; slug: string }) {
  return `/catalogo/${x.jlpt.toLowerCase()}/${encodeURIComponent(x.slug)}`
}

// ── ¿Esta ficha explica algo, o solo se anuncia? ─────────────────────────────
//
// Casi todas las fichas empiezan por el mismo reclamo de guiadejapones
// («Aprende gramática del idioma Japonés: X (romaji). Significado: Y»), que
// repite el nombre y la glosa. Quitándolo, 240 de las 676 se quedan sin nada:
// para esas se ofrece generar la explicación con Gemini.
//
// Devuelve el HTML ya sin el reclamo, o null si lo que queda no da para nada.
const RECLAMO = /^\s*<p>\s*Aprende\s+gram[\s\S]*?<\/p>/i
const MINIMO = 40

export function explicacionPropia(html: string | null | undefined): string | null {
  if (!html) return null
  const resto = html.replace(RECLAMO, '').trim()
  const pelado = resto.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return pelado.length >= MINIMO ? resto : null
}

// ── Enlaces a otras fichas ───────────────────────────────────────────────────
//
// La web original enlazaba otras lecciones («ve la lección sobre がる (garu)»),
// pero al bajar las fichas los enlaces se perdieron y solo queda el texto. Se
// rehacen al pintar: cada «japonés (romaji)» que coincide con otra ficha del
// catálogo, por las dos cosas, pasa a ser un enlace a ella.

const soloJa = (s: string) => s.replace(/[^\u3040-\u30ff\u3400-\u9fff]/g, '')
const soloLatin = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '')

/** Las formas en que se puede nombrar una ficha: «ては / では» → ては, では, ては/では. */
function variantes(x: string | null, quitar: RegExp, limpia: (s: string) => string): string[] {
  if (!x) return []
  const base = x.replace(quitar, '')
  return [base, ...base.split(/[・/／;；,、&＆]| - /)].map(limpia).filter(v => v.length > 0)
}

const REFERENCIA =
  /([\u3040-\u30ff\u3400-\u9fff][\u3040-\u30ff\u3400-\u9fff～〜~・ー「」/／]*)\s*[(（]\s*([A-Za-z][A-Za-z~～\s/・'’.-]*?)\s*[)）]/g

/**
 * Devuelve el HTML con las referencias a otras fichas convertidas en
 * <a data-ficha href="/catalogo/…">. Solo toca el texto, nunca dentro de una
 * etiqueta, y no enlaza la propia ficha. Si una referencia encaja con varias
 * fichas, se queda con la del nivel JLPT que se cite justo antes; si no hay,
 * no la enlaza.
 */
export function enlazaFichas(html: string, lista: CatalogoItem[], actualId: string): string {
  const fichas = lista
    .filter(f => f.id !== actualId)
    .map(f => ({
      f,
      ja: variantes(f.name, /[（(][^）)]*[）)]/g, soloJa),
      ro: variantes(f.romaji, /[（(][^）)]*[）)]/g, soloLatin),
    }))

  return html
    .split(/(<[^>]+>)/)
    .map(trozo => {
      if (trozo.startsWith('<')) return trozo
      return trozo.replace(REFERENCIA, (todo, ja: string, ro: string, pos: number) => {
        const j = soloJa(ja)
        const r = soloLatin(ro)
        if (!j || !r) return todo
        let cand = fichas.filter(x => x.ja.includes(j) && x.ro.some(v => v === r || v.startsWith(r)))
        if (cand.length > 1) {
          const nivel = trozo.slice(Math.max(0, pos - 40), pos).match(/N[1-5]/g)?.pop()
          const delNivel = nivel ? cand.filter(x => x.f.jlpt === nivel) : []
          cand = delNivel.length ? delNivel : cand.filter(x => x.ro.includes(r))
        }
        if (cand.length !== 1) return todo
        const f = cand[0].f
        return `<a data-ficha href="${urlDeFicha(f)}" title="${f.jlpt} · ${f.name}">${todo}</a>`
      })
    })
    .join('')
}

// ── Lecturas ─────────────────────────────────────────────────────────────────

/** El catálogo entero (los cinco niveles), para la lista y su buscador. */
export async function fetchCatalogoLista(): Promise<CatalogoItem[]> {
  try {
    return await listaCon(`${LIST_COLUMNS}, ${LECCION_COLUMNS}`)
  } catch (e) {
    // Sin la migración 047 no hay columnas de lección: la lista sale igual,
    // solo que sin colocar en los libros.
    if (!(e instanceof Error) || !/leccion|tambien|grammar_test/.test(e.message)) throw e
    return (await listaCon(LIST_COLUMNS)).map(x => ({ ...x, ...SIN_LECCION }))
  }
}

async function listaCon(columnas: string): Promise<CatalogoItem[]> {
  const out: CatalogoItem[] = []
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('catalog_topics')
      .select(columnas)
      .order('position', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    out.push(...((data ?? []) as unknown as CatalogoItem[]))
    if (!data || data.length < PAGINA) break
  }
  return out
}

/** Guarda dónde va cada ficha que ha cambiado al recolocar (solo el admin). */
export async function saveCatalogoLecciones(cambios: ({ id: string } & CatalogoLeccion)[]) {
  for (const { id, ...leccion } of cambios) {
    const { error } = await supabase.from('catalog_topics').update(leccion).eq('id', id)
    if (error) throw new Error(error.message)
  }
}

/** Una ficha con sus frases, o null si no existe. */
export async function fetchCatalogoFicha(
  jlpt: Jlpt,
  slug: string,
): Promise<{ topic: CatalogTopic; frases: CatalogExample[] } | null> {
  const { data: topic, error } = await supabase
    .from('catalog_topics')
    .select(TOPIC_COLUMNS)
    .eq('jlpt', jlpt)
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!topic) return null

  const { data: frases, error: e2 } = await supabase
    .from('catalog_examples')
    .select(EXAMPLE_COLUMNS)
    .eq('topic_id', topic.id)
    .order('position', { ascending: true })
  if (e2) throw new Error(e2.message)

  return { topic: topic as CatalogTopic, frases: (frases ?? []) as CatalogExample[] }
}

/**
 * Las frases de ejemplo de todas las fichas, por id de ficha, para buscar
 * dentro de ellas. Cada frase son sus versiones en el orden en que se enseñan:
 * [japonés, español, romaji]. Son unas 5.000 (un mega), por eso no vienen con
 * la lista y se piden solo cuando se escribe algo en el buscador.
 */
export type Frases = Record<string, string[][]>

export async function fetchCatalogoFrases(): Promise<Frases> {
  const frases: Frases = {}
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from('catalog_examples')
      .select('topic_id, text_ja, text_es, romaji')
      .order('topic_id', { ascending: true })
      .order('position', { ascending: true })
      .range(desde, desde + PAGINA - 1)
    if (error) throw new Error(error.message)
    const filas = (data ?? []) as { topic_id: string; text_ja: string | null; text_es: string | null; romaji: string | null }[]
    for (const f of filas) {
      const versiones = [f.text_ja, f.text_es, f.romaji].filter((x): x is string => !!x)
      if (versiones.length) (frases[f.topic_id] ??= []).push(versiones)
    }
    if (filas.length < PAGINA) break
  }
  return frases
}

// ── Explicaciones de Gemini ──────────────────────────────────────────────────

export type ExplicacionIA = { explanation_es: string; model: string | null; updated_at: string }

export async function fetchCatalogoExplicacion(topicId: string): Promise<ExplicacionIA | null> {
  const { data, error } = await supabase
    .from('catalog_explanations')
    .select('explanation_es, model, updated_at')
    .eq('topic_id', topicId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ExplicacionIA | null) ?? null
}

export async function saveCatalogoExplicacion(topicId: string, explanationEs: string, model: string | null) {
  const { error } = await supabase.from('catalog_explanations').upsert(
    { topic_id: topicId, explanation_es: explanationEs, model, updated_at: new Date().toISOString() },
    { onConflict: 'topic_id' },
  )
  if (error) throw new Error(error.message)
}

/** El prompt de la explicación: el mismo formato que usa Hellotalk. */
export function promptExplicacion(t: Pick<CatalogTopic, 'name' | 'romaji' | 'gloss_es' | 'jlpt'>) {
  const pistas = [t.romaji && `romaji: ${t.romaji}`, t.gloss_es && `significado: ${t.gloss_es}`, `nivel ${t.jlpt}`]
    .filter(Boolean)
    .join('; ')
  return `Eres un profesor experto de gramática japonesa para hispanohablantes.

Explica el siguiente punto de gramática japonesa: «${t.name}» (${pistas})

Escribe las explicaciones SOLO en español. La ÚNICA parte en japonés es la sección
ESTRUCTURA, que muestra el/los patrón(es) gramaticales en japonés (sin traducir).
NO incluyas frases de ejemplo. SÉ conciso.

Responde EXCLUSIVAMENTE con este formato de texto plano (sin markdown, sin asteriscos):

QUÉ EXPRESA
[Explicación en español.]

ESTRUCTURA
[Patrón 1 en japonés, ej. "V辞書形 + ほど + 否定形"]
[Patrón 2 en japonés si existe]

NOTAS
[Matices en español. Si no hay nada relevante escribe "—"]`
}

export const SECCIONES_IA = ['QUÉ EXPRESA', 'ESTRUCTURA', 'NOTAS']

/** Parte el texto plano de Gemini en secciones tituladas. */
export function parseSecciones(text: string, headers = SECCIONES_IA): { title: string; body: string }[] {
  const out: { title: string; body: string }[] = []
  let actual: { title: string; body: string } | null = null
  for (const linea of (text ?? '').split('\n')) {
    const limpia = linea.trim().replace(/^\*+|\*+$/g, '').replace(/:$/, '').trim()
    if (headers.includes(limpia.toUpperCase())) {
      if (actual) out.push(actual)
      actual = { title: limpia.toUpperCase(), body: '' }
    } else if (actual) {
      actual.body += (actual.body ? '\n' : '') + linea
    }
  }
  if (actual) out.push(actual)
  return out.map(s => ({ ...s, body: s.body.trim() })).filter(s => s.body.length > 0)
}
