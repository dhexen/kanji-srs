/**
 * POST /api/admin/vocab/fill-adjectives
 *
 * Finds kanji in the vocabulary table that have no adjectives (adj_i / adj_na)
 * and uses Gemini to suggest the missing ones, then inserts them.
 *
 * Body params:
 *   grade?:        number   — limit to a specific school grade (default: all)
 *   dry_run?:      boolean  — preview without inserting
 *   geminiApiKey?: string
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const BATCH_SIZE = 20   // kanji per Gemini call

function normalizeWordType(raw: string): 'adj_i' | 'adj_na' | null {
  const s = (raw ?? '').toLowerCase().replace(/[-_\s]/g, '')
  if (s === 'adji' || s === 'i' || s === 'iadj' || s === 'iadjective' || s === 'iadjective') return 'adj_i'
  if (s === 'adjな' || s === 'adjna' || s === 'naadj' || s === 'na' || s === 'naadj' || s === 'nadjective') return 'adj_na'
  return null
}

interface VocabRow {
  word:      string
  kanji:     string
  grade:     number
  reading:   string
  word_type: string | null
  sort_order: number
}

interface NewAdjective {
  word:       string
  reading:    string
  meaning_es: string
  meaning_ca: string
  meaning_en: string
  word_type:  'adj_i' | 'adj_na'
}

interface GeminiKanjiResult {
  kanji:      string
  adjectives: NewAdjective[]
}

async function askGeminiForAdjectives(
  batch: Array<{ kanji: string; grade: number; existing: string[] }>,
  apiKey: string,
): Promise<GeminiKanjiResult[]> {
  const kanjiLines = batch.map(k =>
    `${k.kanji} (grado ${k.grade}): ya tiene → [${k.existing.join(', ') || 'ninguna'}]`
  ).join('\n')

  const prompt = `Eres un experto en vocabulario japonés escolar. Para cada kanji de la lista, indica qué adjetivos comunes (い-adjetivos y な-adjetivos) usan ese kanji y NO están ya en la lista "ya tiene".

Solo incluye adjetivos que:
- Formen parte del vocabulario estándar de primaria/secundaria japonesa
- Contengan el kanji indicado
- NO estén ya en la lista "ya tiene"
- Sean adjetivos reales (い-adj o な-adj), no sustantivos ni verbos

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
[
  {
    "kanji": "長",
    "adjectives": [
      {
        "word": "長い",
        "reading": "ながい",
        "meaning_es": "largo",
        "meaning_ca": "llarg",
        "meaning_en": "long",
        "word_type": "adj_i"
      }
    ]
  }
]

Si un kanji no tiene adjetivos que falten, devuelve "adjectives": [].

Kanji a revisar:
${kanjiLines}`

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
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return []

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(clean) as GeminiKanjiResult[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as GeminiKanjiResult[]
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const gradeFilter = typeof body.grade === 'number' ? body.grade : null
    const dryRun     = body.dry_run === true

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)

    // 1. Fetch all vocabulary rows
    let query = service
      .from('vocabulary')
      .select('word, kanji, grade, reading, word_type, sort_order')
      .order('kanji')
      .order('sort_order')

    if (gradeFilter) query = query.eq('grade', gradeFilter)

    const { data: vocab, error } = await query
    if (error) throw new AdminApiError(error.message, 500)
    if (!vocab || vocab.length === 0) {
      return NextResponse.json({ added: 0, message: 'No hay vocabulario.' })
    }

    const rows = vocab as VocabRow[]

    // 2. Group by kanji — collect existing words and whether any adj exists
    const kanjiMap = new Map<string, {
      grade:    number
      existing: string[]
      maxSort:  number
    }>()

    for (const row of rows) {
      const k = row.kanji
      if (!kanjiMap.has(k)) {
        kanjiMap.set(k, { grade: row.grade, existing: [], maxSort: 0 })
      }
      const entry = kanjiMap.get(k)!
      entry.existing.push(row.word)
      if (row.sort_order > entry.maxSort) entry.maxSort = row.sort_order
    }

    // 3. All kanji are candidates — existingWords prevents inserting duplicates
    const candidates = Array.from(kanjiMap.entries())
      .map(([kanji, v]) => ({ kanji, ...v }))

    if (candidates.length === 0) {
      return NextResponse.json({ added: 0, message: 'No hay vocabulario para revisar.' })
    }

    // 4. Process in batches
    const existingWords = new Set(rows.map(r => r.word))
    let totalAdded = 0
    const addedDetails: string[] = []

    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)

      let results: GeminiKanjiResult[]
      try {
        results = await askGeminiForAdjectives(
          batch.map(c => ({ kanji: c.kanji, grade: c.grade, existing: c.existing })),
          geminiApiKey,
        )
      } catch (e) {
        console.error('fill-adjectives Gemini error:', e)
        continue
      }

      for (const result of results) {
        const kanjiData = kanjiMap.get(result.kanji)
        if (!kanjiData) continue

        let sortOrder = kanjiData.maxSort

        for (const adj of result.adjectives ?? []) {
          if (!adj.word || !adj.reading || !adj.meaning_es) continue
          if (existingWords.has(adj.word)) continue
          if (!adj.word.includes(result.kanji)) continue   // safety: must contain the kanji
          const wordType = normalizeWordType(adj.word_type) ?? (adj.word.endsWith('い') ? 'adj_i' : null)
          if (!wordType) continue

          sortOrder += 10

          if (!dryRun) {
            const { error: insErr } = await service.from('vocabulary').insert({
              word:       adj.word,
              kanji:      result.kanji,
              grade:      kanjiData.grade,
              reading:    adj.reading,
              meaning_es: adj.meaning_es,
              meaning_ca: adj.meaning_ca || null,
              meaning_en: adj.meaning_en || null,
              word_type:  wordType,
              is_official: true,
              sort_order: sortOrder,
            })

            if (insErr && insErr.code !== '23505') {
              console.error(`fill-adjectives insert ${adj.word}:`, insErr.message)
              continue
            }
          }

          existingWords.add(adj.word)
          kanjiData.maxSort = sortOrder
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
      message: totalAdded > 0
        ? `${dryRun ? '[DRY RUN] ' : ''}Se añadieron ${totalAdded} adjetivos en ${candidates.length} kanji.`
        : `Se revisaron ${candidates.length} kanji sin adjetivos pero Gemini no encontró ninguno que añadir.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
