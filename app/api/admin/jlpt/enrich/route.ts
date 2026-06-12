export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/jlpt/enrich
 *
 * The JLPT grammar points (lib/grammar-bunpro.ts) ship with a very short
 * explanation and a single example. This asks Gemini for a fuller explanation
 * (usage, nuance) plus several example sentences, and stores them in
 * `jlpt_grammar_details` (read at runtime by the JLPT section).
 *
 * Paginated over the static BUNPRO_GRAMMAR array; the client loops offsets.
 * Already-enriched points are skipped unless `force` is true.
 * Body: { limit?, offset?, force?, geminiApiKey?, model? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'
import { normalizeGeminiModel } from '@/lib/gemini-models'
import { BUNPRO_GRAMMAR, type BunproGrammarPoint } from '@/lib/grammar-bunpro'

const DEFAULT_LIMIT = 12
const GEMINI_BATCH = 6

interface EnrichResult {
  id: string
  explanation_es: string
  examples: { jp: string; es: string; reading: string }[]
}

async function geminiEnrich(
  points: BunproGrammarPoint[],
  apiKey: string,
  model: string,
): Promise<EnrichResult[]> {
  const list = points.map(p =>
    `id: ${p.id}\npatrón: ${p.pattern}\nnombre: ${p.name_es}\nestructura: ${p.structure}\nsignificado actual: ${p.meaning_es}`,
  ).join('\n---\n')

  const prompt = `Eres profesor de japonés (JLPT). Para cada punto gramatical te doy un significado MUY breve. Amplíalo en ESPAÑOL para un estudiante hispanohablante.

Para cada punto devuelve:
- "explanation_es": explicación clara de 2 a 4 frases: cuándo y cómo se usa, matices, y diferencias con formas parecidas si las hay. Nada de markdown.
- "examples": 3 frases de ejemplo NUEVAS y naturales que usen el patrón. Cada una con:
    - "jp": la frase en japonés (kanji + kana normales),
    - "reading": la lectura completa de la frase en hiragana,
    - "es": la traducción al español.

Devuelve SOLO JSON válido, sin markdown, con esta forma exacta:
[{"id":"n5-01","explanation_es":"...","examples":[{"jp":"...","reading":"...","es":"..."}]}]

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
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4 } }),
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
    return JSON.parse(clean) as EnrichResult[]
  } catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? (JSON.parse(m[0]) as EnrichResult[]) : []
  }
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

    const slice = BUNPRO_GRAMMAR.slice(offset, offset + limit)
    const fetched = slice.length
    const done = offset + fetched >= BUNPRO_GRAMMAR.length

    let candidates = slice
    if (!force && slice.length) {
      const ids = slice.map(p => p.id)
      const { data: existing } = await service
        .from('jlpt_grammar_details')
        .select('point_id')
        .in('point_id', ids)
      const have = new Set((existing ?? []).map((r: { point_id: string }) => r.point_id))
      candidates = slice.filter(p => !have.has(p.id))
    }

    if (candidates.length === 0) {
      return NextResponse.json({ updated: 0, fetched, done, next_offset: offset + fetched, total: BUNPRO_GRAMMAR.length })
    }

    let results: EnrichResult[] = []
    for (let i = 0; i < candidates.length; i += GEMINI_BATCH) {
      try {
        results.push(...await geminiEnrich(candidates.slice(i, i + GEMINI_BATCH), geminiApiKey, model))
      } catch (e) {
        if (results.length === 0) throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
        break
      }
    }

    const byId = new Map(results.filter(r => r && typeof r.id === 'string').map(r => [r.id, r]))
    let updated = 0
    for (const c of candidates) {
      const r = byId.get(c.id)
      if (!r || !r.explanation_es) continue
      const examples = Array.isArray(r.examples)
        ? r.examples
            .filter(ex => ex && typeof ex.jp === 'string' && typeof ex.es === 'string')
            .map(ex => ({ jp: ex.jp, es: ex.es, reading: typeof ex.reading === 'string' ? ex.reading : '' }))
        : []
      const { error: upErr } = await service.from('jlpt_grammar_details').upsert({
        point_id: c.id,
        explanation_es: r.explanation_es,
        examples,
        updated_at: new Date().toISOString(),
      })
      if (!upErr) updated++
    }

    return NextResponse.json({
      updated,
      fetched,
      done,
      next_offset: offset + fetched,
      total: BUNPRO_GRAMMAR.length,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
