export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/grammar/scheme
 *
 * Generates a conjugation/usage scheme for grammar points (Minna no Nihongo +
 * JLPT) with Gemini and stores it in `grammar_schemes` (one row per point_id).
 * The scheme has two parts — formation (how it attaches to each part of speech)
 * and conjugations (its inflected forms) — with labels in es/ca/en.
 *
 * Paginated over the combined static list; the client loops offsets.
 * Already-done points are skipped unless `force` is true.
 * Body: { limit?, offset?, force?, geminiApiKey?, model? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'
import { normalizeGeminiModel } from '@/lib/gemini-models'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'

const DEFAULT_LIMIT = 12
const GEMINI_BATCH = 6

const ALL_POINTS = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]

interface SchemeResult {
  id: string
  formation?: { type?: { es?: string; ca?: string; en?: string }; pattern?: string; example?: string }[]
  conjugations?: { form?: { es?: string; ca?: string; en?: string }; pattern?: string; reading?: string }[]
}

async function geminiSchemes(
  points: { id: string; pattern: string; name_es: string }[],
  apiKey: string,
  model: string,
): Promise<SchemeResult[]> {
  const list = points.map(p => `id: ${p.id}\npatrón: ${p.pattern}\nnombre: ${p.name_es}`).join('\n---\n')

  const prompt = `Eres profesor de japonés (JLPT). Para cada punto gramatical crea un ESQUEMA de uso y conjugación, como las tablas de jlptsensei.com.

Para cada punto devuelve:
- "formation": a qué tipos de palabra se une y el patrón resultante. 1 a 4 filas. Cada fila:
    - "type": el tipo de palabra, traducido { "es": "...", "ca": "...", "en": "..." } (p. ej. es:"Verbo (forma diccionario)", "Adjetivo い (~い)", "Adjetivo な", "Sustantivo").
    - "pattern": el patrón resultante en japonés (p. ej. "なAdj ＋ がる").
    - "example": (opcional) un ejemplo corto en japonés.
- "conjugations": las formas principales del patrón. 0 a 5 filas (déjalo [] si el punto es una partícula u otra forma que no se conjuga). Cada fila:
    - "form": el nombre de la forma, traducido { "es": "...", "ca": "...", "en": "..." } (p. ej. es:"No pasado", "Negativo", "Pasado", "Forma て", "Progresivo").
    - "pattern": esa forma en japonés (p. ej. "がっている").
    - "reading": (opcional) su lectura en hiragana si lleva kanji.

Reglas: japonés natural y correcto; nada de markdown; traduce SIEMPRE type y form a los tres idiomas.

Devuelve SOLO JSON válido con esta forma:
[{"id":"n4-01","formation":[{"type":{"es":"Adjetivo な","ca":"Adjectiu な","en":"な-adjective"},"pattern":"なAdj ＋ がる","example":"残念がる"}],"conjugations":[{"form":{"es":"No pasado","ca":"No passat","en":"Non-past"},"pattern":"がる","reading":"がる"}]}]

Puntos:
${list}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const MAX_ATTEMPTS = 4
  let text = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3 } }),
      })
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw e
      await new Promise(r => setTimeout(r, 2000 * attempt)); continue
    }
    if (res.ok) {
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      break
    }
    const data = await res.json().catch(() => ({}))
    const msg = (data as { error?: { message?: string } })?.error?.message ?? res.statusText
    const transient = res.status === 429 || res.status >= 500
    if (!transient || attempt === MAX_ATTEMPTS) throw new Error(`Gemini ${res.status}: ${msg}`)
    await new Promise(r => setTimeout(r, (res.status === 429 ? 15000 : 3000) * attempt))
  }
  if (!text) return []
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(clean) as SchemeResult[]
  } catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? (JSON.parse(m[0]) as SchemeResult[]) : []
  }
}

function cleanLabel(l: { es?: string; ca?: string; en?: string } | undefined) {
  const es = (l?.es ?? '').trim()
  return { es, ca: (l?.ca ?? '').trim() || es, en: (l?.en ?? '').trim() || es }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), 60)
    const offset = Math.max(0, Number(body.offset) || 0)
    const force = body.force === true
    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)
    const model = normalizeGeminiModel(typeof body.model === 'string' ? body.model : undefined)

    const slice = ALL_POINTS.slice(offset, offset + limit)
    const fetched = slice.length
    const done = offset + fetched >= ALL_POINTS.length

    let candidates = slice
    if (!force && slice.length) {
      const ids = slice.map(p => p.id)
      const { data: existing } = await service
        .from('grammar_schemes')
        .select('point_id')
        .in('point_id', ids)
      const have = new Set((existing ?? []).map((r: { point_id: string }) => r.point_id))
      candidates = slice.filter(p => !have.has(p.id))
    }

    if (candidates.length === 0) {
      return NextResponse.json({ updated: 0, fetched, done, next_offset: offset + fetched, total: ALL_POINTS.length })
    }

    let results: SchemeResult[] = []
    for (let i = 0; i < candidates.length; i += GEMINI_BATCH) {
      const batch = candidates.slice(i, i + GEMINI_BATCH).map(p => ({ id: p.id, pattern: p.pattern, name_es: p.name_es }))
      try {
        results.push(...await geminiSchemes(batch, geminiApiKey, model))
      } catch (e) {
        if (results.length === 0) throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
        break
      }
    }

    const byId = new Map(results.filter(r => r && typeof r.id === 'string').map(r => [r.id, r]))
    let updated = 0
    for (const c of candidates) {
      const r = byId.get(c.id)
      if (!r) continue
      const formation = Array.isArray(r.formation)
        ? r.formation.filter(f => f && typeof f.pattern === 'string' && f.pattern.trim())
            .map(f => ({ type: cleanLabel(f.type), pattern: f.pattern!.trim(), ...(f.example ? { example: String(f.example).trim() } : {}) }))
        : []
      const conjugations = Array.isArray(r.conjugations)
        ? r.conjugations.filter(f => f && typeof f.pattern === 'string' && f.pattern.trim())
            .map(f => ({ form: cleanLabel(f.form), pattern: f.pattern!.trim(), ...(f.reading ? { reading: String(f.reading).trim() } : {}) }))
        : []
      if (formation.length === 0 && conjugations.length === 0) continue
      const { error: upErr } = await service.from('grammar_schemes').upsert({
        point_id: c.id,
        scheme: { formation, conjugations },
        updated_at: new Date().toISOString(),
      })
      if (!upErr) updated++
    }

    return NextResponse.json({
      updated,
      fetched,
      done,
      next_offset: offset + fetched,
      total: ALL_POINTS.length,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
