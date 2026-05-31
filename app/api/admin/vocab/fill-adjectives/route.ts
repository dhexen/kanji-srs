/**
 * POST /api/admin/vocab/fill-adjectives
 *
 * Two-phase approach:
 *  Phase 1 — Direct candidates: for every kanji K, check if K+"い" exists.
 *             If not, ask Gemini specifically "is K+'い' a real adjective?".
 *             This catches obvious cases like 長→長い that generic prompts miss.
 *  Phase 2 — General scan: ask Gemini for any OTHER missing adjectives per kanji.
 *
 * Body params:
 *   grade?:        number   — limit to a specific school grade (default: all)
 *   dry_run?:      boolean  — preview without inserting
 *   geminiApiKey?: string
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const BATCH_SIZE = 20

function normalizeWordType(raw: string): 'adj_i' | 'adj_na' | null {
  const s = (raw ?? '').toLowerCase().replace(/[-_\s]/g, '')
  if (['adji', 'i', 'iadj', 'iadjective', 'adjective_i'].includes(s)) return 'adj_i'
  if (['adjna', 'na', 'naadj', 'nadjective', 'adjective_na', 'adjな'].includes(s)) return 'adj_na'
  return null
}

interface VocabRow {
  word:       string
  kanji:      string
  grade:      number
  reading:    string
  word_type:  string | null
  sort_order: number
}

interface NewAdjective {
  word:       string
  reading:    string
  meaning_es: string
  meaning_ca: string
  meaning_en: string
  word_type:  string
}

interface GeminiKanjiResult {
  kanji:      string
  adjectives: NewAdjective[]
}

// ── Phase 1: validate explicit [kanji]い candidates ──────────────────────────

interface DirectCandidate {
  kanji:     string
  candidate: string   // kanji + "い"
  grade:     number
}

interface DirectValidation {
  word:       string
  valid:      boolean
  reading:    string
  meaning_es: string
  meaning_ca: string
  meaning_en: string
}

async function validateDirectCandidates(
  candidates: DirectCandidate[],
  apiKey: string,
): Promise<DirectValidation[]> {
  if (candidates.length === 0) return []

  const lines = candidates.map(c => `${c.candidate} (kanji: ${c.kanji})`).join('\n')

  const prompt = `Eres un experto en japonés. Para cada palabra de la lista, dime si es un adjetivo い (i-adjective) válido y común del vocabulario escolar japonés.

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
[
  {
    "word": "長い",
    "valid": true,
    "reading": "ながい",
    "meaning_es": "largo",
    "meaning_ca": "llarg",
    "meaning_en": "long"
  }
]

Si la palabra NO es un adjetivo válido, pon "valid": false y deja reading/meanings vacíos.

Palabras a validar:
${lines}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    }),
  })
  if (!res.ok) throw new Error(`Gemini ${res.status}`)

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return []

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(clean) as DirectValidation[] }
  catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? JSON.parse(m[0]) as DirectValidation[] : []
  }
}

// ── Phase 2: general missing-adjective scan ──────────────────────────────────

async function askGeminiForAdjectives(
  batch: Array<{ kanji: string; grade: number; existing: string[] }>,
  apiKey: string,
): Promise<GeminiKanjiResult[]> {
  const kanjiLines = batch.map(k => {
    // Exclude the bare kanji character itself from "existing" to avoid confusion
    const existing = k.existing.filter(w => w !== k.kanji)
    return `${k.kanji} (grado ${k.grade}): ya tiene → [${existing.join(', ') || 'ninguna'}]`
  }).join('\n')

  const prompt = `Eres un experto en vocabulario japonés escolar. Para cada kanji, sugiere adjetivos (い-adj o な-adj) que NO estén en la lista "ya tiene".

IMPORTANTE:
- El kanji solo como carácter (ej: 長) es un sustantivo/prefijo, NO un adjetivo. Si aparece en "ya tiene", ignóralo.
- Busca adjetivos DERIVADOS del kanji: ej. 長→長い (ながい), 大→大きい (おおきい), 新→新しい (あたらしい)
- Solo vocabulario estándar de primaria/secundaria japonesa
- La palabra DEBE contener el kanji indicado

Responde ÚNICAMENTE con este JSON:
[{"kanji":"長","adjectives":[{"word":"長い","reading":"ながい","meaning_es":"largo","meaning_ca":"llarg","meaning_en":"long","word_type":"adj_i"}]}]

Si no hay adjetivos que añadir, devuelve "adjectives": [].

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
  if (!res.ok) throw new Error(`Gemini ${res.status}`)

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) return []

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try { return JSON.parse(clean) as GeminiKanjiResult[] }
  catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? JSON.parse(m[0]) as GeminiKanjiResult[] : []
  }
}

// ── Insert helper ─────────────────────────────────────────────────────────────

async function insertAdj(
  service: ReturnType<typeof import('@supabase/supabase-js').createClient>,
  word: string, kanji: string, grade: number, reading: string,
  meaning_es: string, meaning_ca: string | null, meaning_en: string | null,
  wordType: 'adj_i' | 'adj_na', sortOrder: number,
  dryRun: boolean,
): Promise<boolean> {
  if (dryRun) return true
  const { error } = await service.from('vocabulary').insert({
    word, kanji, grade, reading, meaning_es,
    meaning_ca: meaning_ca || null,
    meaning_en: meaning_en || null,
    word_type: wordType,
    is_official: true,
    sort_order: sortOrder,
  })
  return !error || error.code === '23505'
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const gradeFilter = typeof body.grade === 'number' ? body.grade : null
    const dryRun      = body.dry_run === true
    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)

    // 1. Fetch all vocabulary
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
    const existingWords = new Set(rows.map(r => r.word))

    // 2. Build kanji map
    const kanjiMap = new Map<string, { grade: number; existing: string[]; maxSort: number }>()
    for (const row of rows) {
      if (!kanjiMap.has(row.kanji)) kanjiMap.set(row.kanji, { grade: row.grade, existing: [], maxSort: 0 })
      const e = kanjiMap.get(row.kanji)!
      e.existing.push(row.word)
      if (row.sort_order > e.maxSort) e.maxSort = row.sort_order
    }

    const candidates = Array.from(kanjiMap.entries()).map(([kanji, v]) => ({ kanji, ...v }))
    if (candidates.length === 0) {
      return NextResponse.json({ added: 0, message: 'No hay vocabulario para revisar.' })
    }

    let totalAdded = 0
    const addedDetails: string[] = []

    // ── PHASE 1: direct [kanji]い candidates ─────────────────────────────────
    const directCandidates: DirectCandidate[] = candidates
      .map(c => ({ kanji: c.kanji, candidate: c.kanji + 'い', grade: c.grade }))
      .filter(c => !existingWords.has(c.candidate))

    for (let i = 0; i < directCandidates.length; i += BATCH_SIZE) {
      const batch = directCandidates.slice(i, i + BATCH_SIZE)
      let validations: DirectValidation[]
      try { validations = await validateDirectCandidates(batch, geminiApiKey) }
      catch (e) { console.error('Phase 1 Gemini error:', e); continue }

      for (const v of validations) {
        if (!v.valid || !v.word || !v.reading || !v.meaning_es) continue
        if (existingWords.has(v.word)) continue

        const kanjiChar = batch.find(c => c.candidate === v.word)?.kanji
        if (!kanjiChar) continue
        if (!v.word.includes(kanjiChar)) continue

        const kanjiData = kanjiMap.get(kanjiChar)!
        kanjiData.maxSort += 10

        const ok = await insertAdj(service, v.word, kanjiChar, kanjiData.grade,
          v.reading, v.meaning_es, v.meaning_ca, v.meaning_en,
          'adj_i', kanjiData.maxSort, dryRun)

        if (ok) {
          existingWords.add(v.word)
          totalAdded++
          addedDetails.push(`[P1] ${kanjiChar} → ${v.word} (${v.reading})`)
        }
      }
    }

    // ── PHASE 2: general scan for other adjectives ────────────────────────────
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE)
      let results: GeminiKanjiResult[]
      try {
        results = await askGeminiForAdjectives(
          batch.map(c => ({ kanji: c.kanji, grade: c.grade, existing: c.existing })),
          geminiApiKey,
        )
      } catch (e) { console.error('Phase 2 Gemini error:', e); continue }

      for (const result of results) {
        const kanjiData = kanjiMap.get(result.kanji)
        if (!kanjiData) continue

        for (const adj of result.adjectives ?? []) {
          if (!adj.word || !adj.reading || !adj.meaning_es) continue
          if (existingWords.has(adj.word)) continue
          if (!adj.word.includes(result.kanji)) continue

          const wordType = normalizeWordType(adj.word_type)
            ?? (adj.word.endsWith('い') ? 'adj_i' : null)
          if (!wordType) continue

          kanjiData.maxSort += 10
          const ok = await insertAdj(service, adj.word, result.kanji, kanjiData.grade,
            adj.reading, adj.meaning_es, adj.meaning_ca, adj.meaning_en,
            wordType, kanjiData.maxSort, dryRun)

          if (ok) {
            existingWords.add(adj.word)
            totalAdded++
            addedDetails.push(`[P2] ${result.kanji} → ${adj.word} (${adj.reading})`)
          }
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
        : `Se revisaron ${candidates.length} kanji pero no se encontraron nuevos adjetivos.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
