export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError, recordToolRun } from '@/lib/admin-server'

const DEFAULT_BATCH = 50

interface GeminiVocabClassification {
  jp: string
  word_type: string
  category: string
}

async function classifyVocabWithGemini(
  words: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
): Promise<GeminiVocabClassification[]> {
  const wordList = words.map(w => `${w.word} (${w.reading}) = ${w.meaning}`).join('\n')

  const prompt = `Classify these Japanese vocabulary words with their grammatical type and semantic category.

WORD TYPES (use exactly one):
- noun: nouns and noun-like words (名詞)
- verb_transitive: transitive verbs (他動詞) — take a direct object
- verb_intransitive: intransitive verbs (自動詞) — no direct object
- verb: verb when transitive/intransitive is ambiguous
- adj_i: i-adjectives ending in い (い形容詞)
- adj_na: na-adjectives (な形容詞)
- adverb: adverbs (副詞)
- particle: particles (助詞)
- expression: set expressions/phrases (表現)

CATEGORIES (use exactly one):
- animals: animals and insects
- nature: nature, plants, geography, weather phenomena
- colors: colors and shades
- weather: weather and climate
- time: time expressions, dates, seasons, days
- food: food, drinks, cooking
- transport: vehicles and transportation
- family: family members and relationships
- body: body parts and physical health
- school: school, education, studying
- home: home, furniture, household items
- work: work, jobs, professions
- places: places, buildings, locations
- numbers: numbers, counters, quantities
- emotions: emotions, feelings, personality
- actions: daily actions and general verbs
- sports: sports, games, physical activities
- culture: culture, art, entertainment, traditions
- other: anything that doesn't fit above

Respond ONLY with a valid JSON array, no markdown, no extra text:
[{"jp":"犬","word_type":"noun","category":"animals"},{"jp":"走る","word_type":"verb_intransitive","category":"actions"}]

Words:
${wordList}`

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
    const data = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${(data as any)?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini devolvió respuesta vacía')

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(clean) as GeminiVocabClassification[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as GeminiVocabClassification[]
    throw new Error('No se pudo parsear la respuesta de Gemini como JSON')
  }
}

const VALID_WORD_TYPES = new Set([
  'noun','verb_transitive','verb_intransitive','verb','adj_i','adj_na','adverb','particle','expression',
])
const VALID_CATEGORIES = new Set([
  'animals','nature','colors','weather','time','food','transport','family',
  'body','school','home','work','places','numbers','emotions','actions','sports','culture','other',
])

// GET — stats about classification coverage
export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const [{ count: total }, { count: withType }, { count: withCategory }] = await Promise.all([
      service.from('vocabulary').select('*', { count: 'exact', head: true }),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).not('word_type', 'is', null),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).not('category', 'is', null),
    ])

    return NextResponse.json({
      total: total ?? 0,
      with_type: withType ?? 0,
      with_category: withCategory ?? 0,
      pending: (total ?? 0) - Math.min(withType ?? 0, withCategory ?? 0),
    })
  } catch (e) {
    return adminJsonError(e)
  }
}

// POST — classify a batch of unclassified words
export async function POST(request: NextRequest) {
  try {
    const { service, adminId } = await requireAdmin(request)
    void recordToolRun(service, 'vocab-classify', adminId)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_BATCH), 200)

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      throw new AdminApiError('Falta la Gemini API Key (env GEMINI_API_KEY o parámetro geminiApiKey).', 400)
    }

    // Fetch words missing either category or word_type
    const { data: vocab, error } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es')
      .or('category.is.null,word_type.is.null')
      .limit(limit)

    if (error) throw new AdminApiError(error.message, 500)
    if (!vocab || vocab.length === 0) {
      return NextResponse.json({ processed: 0, message: 'No quedan palabras sin clasificar' })
    }

    const words = vocab.map(v => ({
      word: v.word as string,
      reading: v.reading as string,
      meaning: (v.meaning_es as string) || '',
    }))

    let classifications: GeminiVocabClassification[]
    try {
      classifications = await classifyVocabWithGemini(words, geminiApiKey)
    } catch (e) {
      throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
    }

    const classMap = new Map(classifications.map(c => [c.jp, c]))

    let updated = 0
    const updatePromises = words.map(async w => {
      const cls = classMap.get(w.word)
      if (!cls) return
      const wordType = VALID_WORD_TYPES.has(cls.word_type) ? cls.word_type : null
      const category = VALID_CATEGORIES.has(cls.category) ? cls.category : null
      if (!wordType && !category) return
      const { error: updErr } = await service
        .from('vocabulary')
        .update({
          ...(wordType ? { word_type: wordType } : {}),
          ...(category ? { category } : {}),
        })
        .eq('word', w.word)
      if (updErr) console.error(`classify update error for ${w.word}:`, updErr.message)
      else updated++
    })
    await Promise.allSettled(updatePromises)

    return NextResponse.json({ processed: words.length, updated })
  } catch (e) {
    return adminJsonError(e)
  }
}
