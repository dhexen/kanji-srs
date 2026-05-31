/**
 * POST /api/admin/vocab/fill-adjectives
 *
 * Strategy: ONE Gemini call per request.
 *
 * 1. Build the list of [kanji]+"い" forms that don't exist in the vocabulary.
 * 2. Ask Gemini in a single call: "which of these are valid Japanese i-adjectives?"
 * 3. Insert the confirmed ones.
 *
 * This is 1 API call regardless of how many kanjis there are, avoiding rate limits.
 *
 * Body params:
 *   grade?:        number   — limit to a specific school grade (default: all)
 *   dry_run?:      boolean  — preview without inserting
 *   debug?:        boolean  — include raw Gemini response in result
 *   geminiApiKey?: string
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

interface VocabRow {
  word:       string
  kanji:      string
  grade:      number
  sort_order: number
}

interface GeminiAdj {
  kanji:      string
  word:       string
  reading:    string
  meaning_es: string
  meaning_ca: string
  meaning_en: string
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

function parseJson<T>(text: string): T[] {
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(clean) as T[] }
  catch {
    const m = clean.match(/\[[\s\S]*\]/)
    if (m) { try { return JSON.parse(m[0]) as T[] } catch { return [] } }
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
      .select('word, kanji, grade, sort_order')
      .order('kanji').order('sort_order')
    if (gradeFilter) q = q.eq('grade', gradeFilter)

    const { data: vocab, error } = await q
    if (error) throw new AdminApiError(error.message, 500)
    if (!vocab?.length) return NextResponse.json({ added: 0, message: 'No hay vocabulario.' })

    const rows = vocab as VocabRow[]
    const existingWords = new Set(rows.map(r => r.word))

    // 2. Build kanji map
    const kanjiMap = new Map<string, { grade: number; maxSort: number }>()
    for (const row of rows) {
      if (!kanjiMap.has(row.kanji)) kanjiMap.set(row.kanji, { grade: row.grade, maxSort: 0 })
      const e = kanjiMap.get(row.kanji)!
      if (row.sort_order > e.maxSort) e.maxSort = row.sort_order
    }

    // 3. Find candidates: kanjis where [kanji]+"い" does NOT exist in vocabulary
    const candidates = Array.from(kanjiMap.entries())
      .map(([kanji, v]) => ({ kanji, candidate: kanji + 'い', ...v }))
      .filter(c => !existingWords.has(c.candidate))

    if (candidates.length === 0) {
      return NextResponse.json({ added: 0, message: 'Todos los kanjis ya tienen su forma い registrada.' })
    }

    // 4. Single Gemini call — validate which [kanji]い forms are real adjectives
    const candidateList = candidates.map(c => c.candidate).join('、')

    const prompt = `Eres un experto en japonés. De la siguiente lista de formas candidatas, dime cuáles son adjetivos い (i-adjectives) REALES y comunes del vocabulario escolar japonés.

Lista de candidatos:
${candidateList}

IMPORTANTE:
- Incluye solo las que son adjetivos い REALES y de uso común
- Si una forma no existe como adjetivo (ej: 万い no existe), NO la incluyas
- Ejemplos correctos: 長い (largo), 高い (alto), 低い (bajo), 古い (antiguo), 新しい (nuevo)...
  aunque 新しい no termine en [kanji]い directo, si existe como adjetivo inclúyela con el kanji correcto
- Para adjetivos compuestos como 大きい (kanji: 大), inclúyelos con su kanji principal

Responde ÚNICAMENTE con JSON (sin backticks):
[
  {"kanji":"長","word":"長い","reading":"ながい","meaning_es":"largo","meaning_ca":"llarg","meaning_en":"long"},
  {"kanji":"高","word":"高い","reading":"たかい","meaning_es":"alto","meaning_ca":"alt","meaning_en":"tall/expensive"}
]

Si ningún candidato es adjetivo válido, devuelve [].`

    let rawText = ''
    try { rawText = await callGemini(prompt, geminiApiKey) }
    catch (e) {
      return NextResponse.json({
        added: 0,
        candidates_checked: candidates.length,
        message: `Error Gemini: ${e instanceof Error ? e.message : String(e)}`,
        ...(debug ? { debugPrompt: prompt } : {}),
      })
    }

    const adjectives = parseJson<GeminiAdj>(rawText)

    // 5. Insert valid adjectives
    let totalAdded = 0
    const addedDetails: string[] = []

    for (const adj of adjectives) {
      if (!adj.word || !adj.reading || !adj.meaning_es || !adj.kanji) continue
      if (existingWords.has(adj.word)) continue
      if (!adj.word.includes(adj.kanji)) continue

      const kanjiData = kanjiMap.get(adj.kanji)
      if (!kanjiData) continue

      kanjiData.maxSort += 10

      if (!dryRun) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: insErr } = await (service as any).from('vocabulary').insert({
          word:        adj.word,
          kanji:       adj.kanji,
          grade:       kanjiData.grade,
          reading:     adj.reading,
          meaning_es:  adj.meaning_es,
          meaning_ca:  adj.meaning_ca || null,
          meaning_en:  adj.meaning_en || null,
          word_type:   'adj_i',
          is_official: true,
          sort_order:  kanjiData.maxSort,
        })
        if (insErr) {
          if (insErr.code !== '23505') console.error(`fill-adj insert ${adj.word}:`, insErr.message)
          continue
        }
      }

      existingWords.add(adj.word)
      totalAdded++
      addedDetails.push(`${adj.kanji} → ${adj.word} (${adj.reading})`)
    }

    return NextResponse.json({
      candidates_checked: candidates.length,
      added: totalAdded,
      dry_run: dryRun,
      details: addedDetails,
      ...(debug ? { raw: rawText, candidates: candidates.map(c => c.candidate) } : {}),
      message: totalAdded > 0
        ? `${dryRun ? '[DRY RUN] ' : ''}Se añadieron ${totalAdded} adjetivos い (de ${candidates.length} candidatos revisados).`
        : `Se revisaron ${candidates.length} candidatos pero Gemini no confirmó ningún adjetivo válido.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
