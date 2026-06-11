export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/vocab/fill-full-word
 *
 * For vocabulary words whose `word` writes some parts in kana even though they
 * are normally kanji (e.g. 草はら for 草原), asks Gemini for the standard
 * full-kanji spelling and stores it in `full_word`. Words that are already full
 * (or normally kana) get full_word = word, so they aren't re-processed and the
 * UI knows there's nothing extra to show.
 *
 * Paginated: processes one page per request (the client loops through offsets).
 * Body: { limit?, offset?, geminiApiKey?, model? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'
import { normalizeGeminiModel } from '@/lib/gemini-models'

const DEFAULT_LIMIT = 50
const GEMINI_BATCH = 50

interface FullGuess { word: string; full: string | null }

async function geminiFullSpellings(
  rows: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
  model: string,
): Promise<FullGuess[]> {
  const wordList = rows.map(r => `${r.word} (${r.reading}) = ${r.meaning}`).join('\n')
  const prompt = `These Japanese vocabulary words sometimes write part of the word in kana even though it is normally written with kanji (because only one kanji is being taught). For each word, give its STANDARD full spelling with all the usual kanji (jōyō), keeping the EXACT same reading and meaning.

Rules:
- If the word is already fully in kanji, or is normally written in kana, return it unchanged.
- Do NOT change the reading or meaning. Only restore the kanji that are normally used.
- Return ONLY valid JSON, no markdown:
[{"word":"草はら","full":"草原"},{"word":"いぬ","full":"いぬ"},{"word":"学校","full":"学校"}]

Words:
${wordList}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const MAX_ATTEMPTS = 4
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
    return JSON.parse(clean) as FullGuess[]
  } catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? (JSON.parse(m[0]) as FullGuess[]) : []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), 200)
    const offset = Math.max(0, Number(body.offset) || 0)
    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)
    const model = normalizeGeminiModel(typeof body.model === 'string' ? body.model : undefined)

    const { data: rows, error: fetchErr } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es, full_word')
      .order('grade', { ascending: true })
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1)
    if (fetchErr) throw new AdminApiError(fetchErr.message, 500)

    const all = (rows ?? []) as { word: string; reading: string; meaning_es: string; full_word: string | null }[]
    const fetched = all.length
    const done = fetched < limit

    // Only words not yet processed (full_word is null).
    const candidates = all.filter(r => !r.full_word).map(r => ({
      word: r.word, reading: r.reading, meaning: r.meaning_es || '',
    }))

    if (candidates.length === 0) {
      return NextResponse.json({ updated: 0, with_kanji: 0, fetched, done, next_offset: offset + fetched })
    }

    let guesses: FullGuess[] = []
    for (let i = 0; i < candidates.length; i += GEMINI_BATCH) {
      try {
        guesses.push(...await geminiFullSpellings(candidates.slice(i, i + GEMINI_BATCH), geminiApiKey, model))
      } catch (e) {
        if (guesses.length === 0) throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
        break
      }
    }

    const byWord = new Map(guesses.filter(g => g && typeof g.word === 'string').map(g => [g.word, g]))
    let updated = 0
    let withKanji = 0
    for (const c of candidates) {
      const g = byWord.get(c.word)
      // Default to the word itself (marks it processed) if the model gave nothing.
      const full = (g && typeof g.full === 'string' && g.full.trim()) ? g.full.trim() : c.word
      const { error: upErr } = await service.from('vocabulary').update({ full_word: full }).eq('word', c.word)
      if (!upErr) {
        updated++
        if (full !== c.word) withKanji++
      }
    }

    return NextResponse.json({
      updated,
      with_kanji: withKanji,
      fetched,
      done,
      next_offset: offset + fetched,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
