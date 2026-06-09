export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/vocab/antonyms/auto-detect
 *
 * For each candidate word, asks Gemini for its standard antonym (a Japanese
 * word), then pairs it ONLY if that antonym already exists somewhere in the
 * vocabulary table. This works regardless of whether both words land in the
 * same batch (the old approach only paired words present in the same sample,
 * so it almost never found anything in a large vocabulary).
 *
 * Body params:
 *   limit?:      number   — max candidate words to consider per run (default 150)
 *   geminiApiKey?: string
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'
import { normalizeGeminiModel } from '@/lib/gemini-models'

// One Gemini call per request (page) keeps each request short so it never hits
// the serverless timeout; the client pages through the whole vocabulary.
const DEFAULT_LIMIT = 50
const GEMINI_BATCH = 50

interface AntonymGuess { word: string; antonym: string | null }

async function geminiAntonyms(
  words: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
  model: string,
): Promise<AntonymGuess[]> {
  const wordLines = words.map(w => `${w.word} (${w.reading}) = ${w.meaning}`).join('\n')
  const prompt = `For each Japanese word below, give its single most standard, common antonym (opposite) as ONE Japanese word in dictionary form, or null if it has no clear common antonym.

Rules:
- The antonym must be a real, common Japanese word (dictionary form). Examples: 高い→低い, 大きい→小さい, 新しい→古い, 入る→出る, 上げる→下げる, 朝→夜, 男→女, 多い→少ない.
- Use null for words without a clear opposite (most nouns, names, etc.).
- Return ONLY a valid JSON array, no markdown:
[{"word":"高い","antonym":"低い"},{"word":"犬","antonym":null}]

Words:
${wordLines}`

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
    return JSON.parse(clean) as AntonymGuess[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    return match ? (JSON.parse(match[0]) as AntonymGuess[]) : []
  }
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), 1000)
    const offset = Math.max(0, Number(body.offset) || 0)

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY

    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)

    // Respect the user's selected Gemini model (e.g. 3.1 Flash Lite has separate quota).
    const model = normalizeGeminiModel(typeof body.model === 'string' ? body.model : undefined)

    // 1. Existing pairs — to dedupe and skip already-paired words.
    const { data: existingPairs } = await service
      .from('vocab_antonyms')
      .select('word_a, word_b')
    const existingKeys = new Set(
      (existingPairs ?? []).map((p: { word_a: string; word_b: string }) => [p.word_a, p.word_b].sort().join('||')),
    )
    const wordsWithPairs = new Set(
      (existingPairs ?? []).flatMap((p: { word_a: string; word_b: string }) => [p.word_a, p.word_b]),
    )

    // 2. One page of words (curriculum order). Paginated via offset so repeated
    //    runs advance through the whole vocabulary instead of re-checking the start.
    const { data: vocab, error: fetchErr } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es')
      .order('grade', { ascending: true })
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1)
    if (fetchErr) throw new AdminApiError(fetchErr.message, 500)

    const rows = (vocab ?? []) as { word: string; reading: string; meaning_es: string }[]
    const fetched = rows.length
    const done = fetched < limit  // reached the end of the vocabulary

    const seen = new Set<string>()
    const candidates: Array<{ word: string; reading: string; meaning: string }> = []
    for (const v of rows) {
      if (wordsWithPairs.has(v.word) || seen.has(v.word)) continue
      seen.add(v.word)
      candidates.push({ word: v.word, reading: v.reading, meaning: v.meaning_es || '' })
    }

    if (candidates.length === 0) {
      return NextResponse.json({
        pairs_added: 0, candidates_checked: 0, fetched, done, next_offset: offset + fetched,
        message: done ? 'Revisión completada.' : 'En esta página ya estaban todas emparejadas; sigue.',
      })
    }

    // 3. Ask Gemini for each candidate's antonym, in batches.
    const guesses: AntonymGuess[] = []
    let geminiError: string | null = null
    for (let i = 0; i < candidates.length; i += GEMINI_BATCH) {
      try {
        const batch = await geminiAntonyms(candidates.slice(i, i + GEMINI_BATCH), geminiApiKey, model)
        guesses.push(...batch)
      } catch (e) {
        geminiError = e instanceof Error ? e.message : String(e)
        console.error('auto-detect antonyms Gemini error:', e)
        break
      }
    }
    // Surface a Gemini failure instead of silently reporting "0 pairs".
    if (geminiError && guesses.length === 0) {
      throw new AdminApiError(`Error de Gemini: ${geminiError}`, 502)
    }

    // 4. Keep only antonyms that actually exist in the vocabulary table.
    const proposed = guesses
      .filter(g => g && typeof g.word === 'string' && typeof g.antonym === 'string' && g.word !== g.antonym)
      .map(g => ({ word: g.word, antonym: (g.antonym as string).trim() }))
      .filter(g => g.antonym.length > 0)

    const antonymWords = [...new Set(proposed.map(g => g.antonym))]
    const existsSet = new Set<string>()
    for (let i = 0; i < antonymWords.length; i += 300) {
      const { data: found } = await service
        .from('vocabulary')
        .select('word')
        .in('word', antonymWords.slice(i, i + 300))
      for (const r of (found ?? []) as { word: string }[]) existsSet.add(r.word)
    }

    // 5. Insert new pairs.
    let pairsAdded = 0
    const insertedKeys = new Set(existingKeys)
    for (const { word, antonym } of proposed) {
      if (!existsSet.has(antonym)) continue
      const key = [word, antonym].sort().join('||')
      if (insertedKeys.has(key)) continue
      insertedKeys.add(key)  // mark before insert so symmetric guesses don't duplicate
      const { error: insErr } = await service
        .from('vocab_antonyms')
        .insert({ word_a: word, word_b: antonym })
      if (insErr) {
        if (insErr.code !== '23505') console.error(`insert ${word}↔${antonym}:`, insErr.message)
      } else {
        pairsAdded++
      }
    }

    // Debug sample so we can see what Gemini proposed vs what matched the dictionary.
    const sample = proposed.slice(0, 8).map(p => ({ ...p, exists: existsSet.has(p.antonym) }))

    return NextResponse.json({
      candidates_checked: candidates.length,
      pairs_added: pairsAdded,
      fetched,
      done,
      next_offset: offset + fetched,
      proposed_count: proposed.length,
      matched_count: proposed.filter(p => existsSet.has(p.antonym)).length,
      sample,
      message: pairsAdded > 0
        ? `Se encontraron ${pairsAdded} nuevos pares de contrarios.`
        : `Sin pares: Gemini propuso ${proposed.length} antónimos, ${proposed.filter(p => existsSet.has(p.antonym)).length} existen en el vocabulario.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
