export const dynamic = 'force-dynamic'

// Classify the CURRENT user's already-imported WaniKani vocabulary that is still
// missing a category/word_type — without re-downloading from WaniKani. Processes
// one batch per request; the client loops until `pending` reaches 0.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const VALID_WORD_TYPES = new Set([
  'noun', 'verb_transitive', 'verb_intransitive', 'verb',
  'adj_i', 'adj_na', 'adverb', 'particle', 'expression',
])
const VALID_CATEGORIES = new Set([
  'animals', 'nature', 'colors', 'weather', 'time', 'food', 'transport',
  'family', 'body', 'school', 'home', 'work', 'places', 'numbers',
  'emotions', 'actions', 'sports', 'culture', 'other',
])

interface Row {
  wanikani_id: number
  word: string
  reading: string
  meaning_en: string
  meaning_es: string | null
}

async function classifyWithGemini(
  rows: Row[],
  apiKey: string,
  model: string,
): Promise<Map<number, { category: string | null; word_type: string | null }>> {
  const result = new Map<number, { category: string | null; word_type: string | null }>()
  if (!rows.length) return result

  const wordList = rows
    .map(r => `${r.wanikani_id}: ${r.word} (${r.reading}) = ${r.meaning_es || r.meaning_en}`)
    .join('\n')

  const prompt = `Classify each Japanese vocabulary word.

WORD_TYPE — pick exactly one:
  noun, verb_transitive (他動詞, takes direct object), verb_intransitive (自動詞, no direct object),
  verb (when trans/intrans is ambiguous), adj_i (い形), adj_na (な形), adverb, particle, expression

CATEGORY — pick exactly one:
  animals, nature, colors, weather, time, food, transport, family, body,
  school, home, work, places, numbers, emotions, actions, sports, culture, other

Return ONLY valid JSON, no backticks, no extra text:
{"words":[{"id":123,"word_type":"noun","category":"food"},...]}

Words:
${wordList}`

  // Retry transient failures (network errors, 429/5xx) a few times before giving
  // up; permanent errors (bad key, quota) fail fast.
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const MAX_ATTEMPTS = 3
  let text = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
      })
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw e
      await new Promise(r => setTimeout(r, 800 * attempt))
      continue
    }
    if (res.ok) {
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      break
    }
    const data = await res.json().catch(() => ({})) as { error?: { message?: string } }
    const msg = data?.error?.message ?? `Gemini API error ${res.status}`
    const transient = res.status === 429 || res.status >= 500
    if (!transient || attempt === MAX_ATTEMPTS) throw new Error(msg)
    await new Promise(r => setTimeout(r, 800 * attempt))
  }

  try {
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    for (const w of (parsed.words ?? [])) {
      if (!w.id) continue
      const wt = typeof w.word_type === 'string' && VALID_WORD_TYPES.has(w.word_type) ? w.word_type : null
      const cat = typeof w.category === 'string' && VALID_CATEGORIES.has(w.category) ? w.category : null
      result.set(Number(w.id), { category: cat, word_type: wt })
    }
  } catch {
    // Leave unclassified — the client will stop when nothing gets updated.
  }
  return result
}

export async function POST(req: NextRequest) {
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

  let limit = 60
  try {
    const body = await req.json()
    if (typeof body?.limit === 'number' && body.limit > 0) limit = Math.min(body.limit, 100)
  } catch { /* use default */ }

  // Resolve Gemini key + model from settings (fallback to server key)
  const { data: settings } = await anonClient
    .from('user_settings')
    .select('gemini_api_key, gemini_model')
    .eq('user_id', user.id)
    .maybeSingle()
  const apiKey = settings?.gemini_api_key?.trim() || process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No hay API Key de Gemini configurada.' }, { status: 400 })
  }
  const model = (settings?.gemini_model as string)?.trim() || 'gemini-2.5-flash'

  try {
    // How many still need classification (for progress reporting)
    const { count: pendingBefore } = await anonClient
      .from('wanikani_user_vocab')
      .select('wanikani_id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('category', null)

    if (!pendingBefore) {
      return NextResponse.json({ processed: 0, updated: 0, pending: 0 })
    }

    // Fetch one batch of unclassified rows
    const { data: rows, error: fetchErr } = await anonClient
      .from('wanikani_user_vocab')
      .select('wanikani_id, word, reading, meaning_en, meaning_es')
      .eq('user_id', user.id)
      .is('category', null)
      .limit(limit)
    if (fetchErr) throw new Error(fetchErr.message)

    const batch = (rows ?? []) as Row[]
    if (!batch.length) {
      return NextResponse.json({ processed: 0, updated: 0, pending: 0 })
    }

    const classified = await classifyWithGemini(batch, apiKey, model)

    let updated = 0
    for (const r of batch) {
      const c = classified.get(r.wanikani_id)
      if (!c || (!c.category && !c.word_type)) continue
      const { error: updErr } = await anonClient
        .from('wanikani_user_vocab')
        .update({ category: c.category, word_type: c.word_type })
        .eq('user_id', user.id)
        .eq('wanikani_id', r.wanikani_id)
      if (!updErr) updated++
    }

    return NextResponse.json({
      processed: batch.length,
      updated,
      pending: Math.max(0, (pendingBefore ?? 0) - updated),
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
