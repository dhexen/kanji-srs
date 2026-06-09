export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WK_BASE = 'https://api.wanikani.com/v2'
const WK_REVISION = '20170710'

interface WkSubject {
  id: number
  data: {
    slug: string
    characters: string | null
    readings: { reading: string; primary: boolean; accepted_answer: boolean }[]
    meanings: { meaning: string; primary: boolean }[]
    level: number
  }
}

interface WkAssignment {
  data: {
    subject_id: number
    srs_stage: number
  }
}

async function wkFetchAll<T>(url: string, wkKey: string): Promise<T[]> {
  const results: T[] = []
  let nextUrl: string | null = url
  while (nextUrl) {
    const res: Response = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${wkKey}`,
        'Wanikani-Revision': WK_REVISION,
      },
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      throw new Error(err?.error ?? `WaniKani API error ${res.status}`)
    }
    const json = await res.json() as { data?: T[]; pages?: { next_url?: string | null } }
    results.push(...(json.data ?? []))
    nextUrl = json.pages?.next_url ?? null
  }
  return results
}

const VALID_WORD_TYPES = new Set([
  'noun', 'verb_transitive', 'verb_intransitive', 'verb',
  'adj_i', 'adj_na', 'adverb', 'particle', 'expression',
])
const VALID_CATEGORIES = new Set([
  'animals', 'nature', 'colors', 'weather', 'time', 'food', 'transport',
  'family', 'body', 'school', 'home', 'work', 'places', 'numbers',
  'emotions', 'actions', 'sports', 'culture', 'other',
])

interface EnrichResult {
  es: string
  ca: string
  category: string | null
  word_type: string | null
}

// One Gemini call per batch both translates the meaning (ES/CA) and classifies
// the word (semantic category + grammatical type), so the user's WaniKani vocab
// gets the same taxonomy as the page vocabulary at no extra request cost.
async function enrichBatch(
  items: { id: number; word: string; reading: string; meaning_en: string }[],
  geminiKey: string,
  model: string,
): Promise<Map<number, EnrichResult>> {
  const result = new Map<number, EnrichResult>()
  if (!items.length) return result

  const BATCH = 60
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH)
    const wordList = batch.map(w => `${w.id}: ${w.word} (${w.reading}) = ${w.meaning_en}`).join('\n')
    const prompt = `For each Japanese vocabulary word, translate the English meaning to Spanish and Catalan AND classify it.

WORD_TYPE — pick exactly one:
  noun, verb_transitive (他動詞, takes direct object), verb_intransitive (自動詞, no direct object),
  verb (when trans/intrans is ambiguous), adj_i (い形), adj_na (な形), adverb, particle, expression

CATEGORY — pick exactly one:
  animals, nature, colors, weather, time, food, transport, family, body,
  school, home, work, places, numbers, emotions, actions, sports, culture, other

Return ONLY valid JSON, no backticks, no extra text:
{"words":[{"id":123,"es":"...","ca":"...","word_type":"noun","category":"food"},...]}

Words:
${wordList}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
      },
    )
    if (!res.ok) continue
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      for (const t of (parsed.words ?? parsed.translations ?? [])) {
        if (!t.id || !t.es) continue
        const wt = typeof t.word_type === 'string' && VALID_WORD_TYPES.has(t.word_type) ? t.word_type : null
        const cat = typeof t.category === 'string' && VALID_CATEGORIES.has(t.category) ? t.category : null
        result.set(t.id, { es: String(t.es), ca: String(t.ca ?? t.es), category: cat, word_type: wt })
      }
    } catch {
      // Skip failed batch — fields will remain null
    }
  }
  return result
}

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 })
  }

  // Fetch user settings for WaniKani key + min SRS stage + Gemini key
  const { data: settings } = await anonClient
    .from('user_settings')
    .select('wanikani_api_key, wanikani_min_srs_stage, gemini_api_key, gemini_model')
    .eq('user_id', user.id)
    .maybeSingle()

  const wkKey = settings?.wanikani_api_key?.trim()
  if (!wkKey) {
    return NextResponse.json({ error: 'API Key de WaniKani no configurada.' }, { status: 400 })
  }
  const minStage: number = settings?.wanikani_min_srs_stage ?? 5
  const geminiKey: string = settings?.gemini_api_key?.trim() || process.env.GEMINI_API_KEY || ''
  const geminiModel: string = (settings?.gemini_model as string)?.trim() || 'gemini-2.5-flash'

  try {
    // Fetch subjects (vocabulary only)
    const subjects = await wkFetchAll<WkSubject>(
      `${WK_BASE}/subjects?types=vocabulary`,
      wkKey,
    )

    // Fetch assignments (vocabulary only) — filter by min SRS stage
    const allAssignments = await wkFetchAll<WkAssignment>(
      `${WK_BASE}/assignments?subject_types=vocabulary`,
      wkKey,
    )
    const stageMap = new Map<number, number>()
    for (const a of allAssignments) {
      stageMap.set(a.data.subject_id, a.data.srs_stage)
    }

    // Build vocab list filtered by min SRS stage
    const eligible: Array<{
      wanikani_id: number
      word: string
      reading: string
      meaning_en: string
      level: number
      srs_stage: number
    }> = []

    for (const s of subjects) {
      const stage = stageMap.get(s.id) ?? 0
      if (stage < minStage) continue

      const word = s.data.characters ?? s.data.slug
      const primaryReading = s.data.readings.find(r => r.primary)?.reading
        ?? s.data.readings[0]?.reading
        ?? s.data.slug
      const primaryMeaning = s.data.meanings.find(m => m.primary)?.meaning
        ?? s.data.meanings[0]?.meaning
        ?? ''

      eligible.push({
        wanikani_id: s.id,
        word,
        reading: primaryReading,
        meaning_en: primaryMeaning,
        level: s.data.level,
        srs_stage: stage,
      })
    }

    if (!eligible.length) {
      return NextResponse.json({ count: 0, message: 'No hay vocabulario que cumpla el nivel SRS mínimo.' })
    }

    // Translate to ES + CA and classify (category + word_type) using Gemini
    let enriched = new Map<number, EnrichResult>()
    if (geminiKey) {
      const toEnrich = eligible.map(e => ({
        id: e.wanikani_id, word: e.word, reading: e.reading, meaning_en: e.meaning_en,
      }))
      enriched = await enrichBatch(toEnrich, geminiKey, geminiModel)
    }

    // Build rows for upsert
    const rows = eligible.map(e => {
      const t = enriched.get(e.wanikani_id)
      return {
        user_id: user.id,
        wanikani_id: e.wanikani_id,
        word: e.word,
        reading: e.reading,
        meaning_en: e.meaning_en,
        meaning_es: t?.es ?? null,
        meaning_ca: t?.ca ?? null,
        category: t?.category ?? null,
        word_type: t?.word_type ?? null,
        level: e.level,
        srs_stage: e.srs_stage,
        synced_at: new Date().toISOString(),
      }
    })

    // Upsert in batches of 200
    const BATCH = 200
    for (let i = 0; i < rows.length; i += BATCH) {
      const { error } = await anonClient
        .from('wanikani_user_vocab')
        .upsert(rows.slice(i, i + BATCH), { onConflict: 'user_id,wanikani_id' })
      if (error) throw new Error(error.message || error.code || JSON.stringify(error))
    }

    return NextResponse.json({ count: rows.length })
  } catch (e: unknown) {
    const msg = e instanceof Error
      ? e.message
      : (e && typeof e === 'object' && 'message' in e)
        ? String((e as { message: unknown }).message)
        : JSON.stringify(e) || 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
