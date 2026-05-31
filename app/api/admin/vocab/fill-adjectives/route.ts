/**
 * POST /api/admin/vocab/fill-adjectives
 *
 * For each kanji in the vocabulary table, asks Gemini for missing adjectives.
 * Processes in batches of BATCH_SIZE kanjis per Gemini call.
 *
 * Body params:
 *   grade?:        number   — limit to a specific school grade (default: all)
 *   dry_run?:      boolean  — preview without inserting
 *   geminiApiKey?: string
 *   debug?:        boolean  — return raw Gemini responses for inspection
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const BATCH_SIZE  = 80     // Gemini 2.5 Flash has 1M token context — 80 kanjis per call is fine
const RATE_DELAY  = 3500   // ms between Gemini calls (free tier: 20 RPM)

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

interface VocabRow {
  word:       string
  kanji:      string
  grade:      number
  word_type:  string | null
  sort_order: number
}

interface GeminiAdj {
  word:       string
  reading:    string
  meaning_es: string
  meaning_ca: string
  meaning_en: string
  word_type:  string
}

interface GeminiResult {
  kanji:      string
  adjectives: GeminiAdj[]
}

function normalizeWordType(raw: string, word: string): 'adj_i' | 'adj_na' | null {
  const s = (raw ?? '').toLowerCase().replace(/[-_\s]/g, '')
  if (['adji', 'iadj', 'iadjective', 'adjective_i', 'i'].includes(s)) return 'adj_i'
  if (['adjna', 'naadj', 'nadjective', 'adjective_na', 'na'].includes(s)) return 'adj_na'
  // Fallback heuristic for い-adjectives
  if (word.endsWith('い') || word.endsWith('しい') || word.endsWith('ない')) return 'adj_i'
  return null
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    }),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${(d as any)?.error?.message ?? res.statusText}`)
  }
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function parseGeminiJson(text: string): GeminiResult[] {
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(clean) as GeminiResult[] }
  catch {
    const m = clean.match(/\[[\s\S]*\]/)
    if (m) {
      try { return JSON.parse(m[0]) as GeminiResult[] } catch { return [] }
    }
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const gradeFilter = typeof body.grade === 'number' ? body.grade : null
    const dryRun      = body.dry_run === true
    const debug       = body.debug === true

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)

    // 1. Fetch vocabulary
    let q = service
      .from('vocabulary')
      .select('word, kanji, grade, word_type, sort_order')
      .order('kanji').order('sort_order')
    if (gradeFilter) q = q.eq('grade', gradeFilter)

    const { data: vocab, error } = await q
    if (error) throw new AdminApiError(error.message, 500)
    if (!vocab?.length) return NextResponse.json({ added: 0, message: 'No hay vocabulario.' })

    const rows = vocab as VocabRow[]
    const existingWords = new Set(rows.map(r => r.word))

    // 2. Build kanji map
    const kanjiMap = new Map<string, { grade: number; words: string[]; maxSort: number }>()
    for (const row of rows) {
      if (!kanjiMap.has(row.kanji)) kanjiMap.set(row.kanji, { grade: row.grade, words: [], maxSort: 0 })
      const e = kanjiMap.get(row.kanji)!
      e.words.push(row.word)
      if (row.sort_order > e.maxSort) e.maxSort = row.sort_order
    }

    const candidates = Array.from(kanjiMap.entries()).map(([kanji, v]) => ({ kanji, ...v }))

    let totalAdded = 0
    const addedDetails: string[] = []
    const debugInfo: unknown[] = []

    // 3. Process in batches
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)

      // Build existing list per kanji — exclude the bare kanji character itself
      // to avoid Gemini thinking "長 already exists so 長い is redundant"
      const kanjiLines = batch.map(c => {
        const filtered = c.words.filter(w => w !== c.kanji)
        const existingStr = filtered.length > 0 ? filtered.join('、') : 'ninguna'
        // Also tell Gemini what we're specifically looking for
        const directForm = c.kanji + 'い'
        const hint = !existingWords.has(directForm)
          ? ` [verificar si "${directForm}" es adjetivo válido]`
          : ''
        return `• ${c.kanji} (grado ${c.grade})${hint}: ya tiene [${existingStr}]`
      }).join('\n')

      const prompt = `Eres un experto en japonés. Para cada kanji de la lista, identifica adjetivos (い-adj o な-adj) que faltan.

REGLAS CRÍTICAS:
1. Si el propio kanji aparece en la lista "ya tiene" (ej: 長 en ya tiene=[長,校長]), IGNÓRALO — el kanji solo es sustantivo, NO adjetivo.
2. Si ves "[verificar si Xい es adjetivo válido]", comprueba si esa palabra es un adjetivo real y si lo es, INCLÚYELA.
3. Incluye solo vocabulario del currículo escolar japonés (primaria/secundaria).
4. La palabra DEBE contener el kanji indicado.
5. NO incluyas sustantivos ni verbos.

EJEMPLOS CORRECTOS:
- 長 → 長い (ながい) = largo [adj_i] ← aunque "長" exista como sustantivo
- 大 → 大きい (おおきい) = grande [adj_i]
- 新 → 新しい (あたらしい) = nuevo [adj_i]
- 好 → 好きな (すきな) = que gusta [adj_na]

Responde ÚNICAMENTE con JSON (sin backticks):
[{"kanji":"長","adjectives":[{"word":"長い","reading":"ながい","meaning_es":"largo","meaning_ca":"llarg","meaning_en":"long","word_type":"adj_i"}]}]

Si un kanji no tiene adjetivos que añadir, devuelve "adjectives":[].

Kanji a revisar:
${kanjiLines}`

      if (i > 0) await sleep(RATE_DELAY)   // respect Gemini free-tier rate limit

      let text = ''
      try { text = await callGemini(prompt, geminiApiKey) }
      catch (e) {
        console.error(`fill-adjectives batch ${i}-${i + BATCH_SIZE} error:`, e)
        if (debug) debugInfo.push({ batch: i, error: String(e) })
        continue
      }

      if (debug) debugInfo.push({ batch: i, kanjis: batch.map(c => c.kanji), raw: text })

      const results = parseGeminiJson(text)

      for (const result of results) {
        const kanjiData = kanjiMap.get(result.kanji)
        if (!kanjiData) continue

        for (const adj of result.adjectives ?? []) {
          if (!adj.word || !adj.reading || !adj.meaning_es) continue
          if (existingWords.has(adj.word)) continue
          if (!adj.word.includes(result.kanji)) continue

          const wordType = normalizeWordType(adj.word_type, adj.word)
          if (!wordType) continue

          kanjiData.maxSort += 10

          if (!dryRun) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: insErr } = await (service as any).from('vocabulary').insert({
              word:        adj.word,
              kanji:       result.kanji,
              grade:       kanjiData.grade,
              reading:     adj.reading,
              meaning_es:  adj.meaning_es,
              meaning_ca:  adj.meaning_ca || null,
              meaning_en:  adj.meaning_en || null,
              word_type:   wordType,
              is_official: true,
              sort_order:  kanjiData.maxSort,
            })
            if (insErr) {
              if (insErr.code === '23505') {
                existingWords.add(adj.word)
              } else {
                console.error(`fill-adj insert ${adj.word}:`, insErr.message)
              }
              continue
            }
          }

          existingWords.add(adj.word)
          totalAdded++
          addedDetails.push(`${result.kanji} → ${adj.word} (${adj.reading})`)
        }
      }
    }

    return NextResponse.json({
      kanji_checked: candidates.length,
      added: totalAdded,
      dry_run: dryRun,
      details: addedDetails,
      ...(debug ? { debug: debugInfo } : {}),
      message: totalAdded > 0
        ? `${dryRun ? '[DRY RUN] ' : ''}Se añadieron ${totalAdded} adjetivos en ${candidates.length} kanji.`
        : `Se revisaron ${candidates.length} kanji pero no se encontraron nuevos adjetivos.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
