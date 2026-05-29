/**
 * POST /api/admin/vocab/antonyms/auto-detect
 *
 * Scans the vocabulary table for words that could have antonym pairs but
 * don't yet. Sends them to Gemini in batches and stores confirmed pairs.
 *
 * Strategy:
 *  1. Fetch all adjectives (adj_i, adj_na) and optionally verbs from vocab.
 *  2. Remove words that already have an antonym pair registered.
 *  3. Send the remaining words to Gemini: "from this list, identify antonym pairs".
 *     Gemini only returns pairs where BOTH words exist in the provided list.
 *  4. Insert new pairs into vocab_antonyms.
 *
 * Body params:
 *   word_types?: string[]   — default ['adj_i','adj_na','verb','verb_transitive','verb_intransitive']
 *   limit?:      number     — max words to consider per run (default 200)
 *   geminiApiKey?: string
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const DEFAULT_LIMIT  = 200
const BATCH_SIZE     = 60   // words per Gemini call

const DEFAULT_WORD_TYPES = ['adj_i', 'adj_na', 'verb', 'verb_transitive', 'verb_intransitive']

interface GeminiPair {
  word_a: string
  word_b: string
}

async function detectAntonymsWithGemini(
  words: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
): Promise<GeminiPair[]> {
  const wordSet   = new Set(words.map(w => w.word))
  const wordLines = words.map(w => `${w.word} (${w.reading}) = ${w.meaning}`).join('\n')

  const prompt = `You are given a list of Japanese words. Your task is to identify antonym pairs where BOTH words appear in the list.

Rules:
- Only return pairs where BOTH words are from the provided list (exact match).
- Each word appears in at most one pair.
- Focus on clear, standard opposites: 高い↔低い, 大きい↔小さい, 古い↔新しい, 入る↔出る, 上げる↔下げる, etc.
- Do NOT create pairs for words without a clear antonym in the list.
- Return ONLY a valid JSON array of objects with "word_a" and "word_b" keys.
- If no pairs exist, return an empty array [].

Example output: [{"word_a":"高い","word_b":"低い"},{"word_a":"古い","word_b":"新しい"}]

Word list:
${wordLines}

JSON pairs:`

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
    throw new Error(`Gemini ${res.status}: ${(data as { error?: { message?: string } })?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini devolvió respuesta vacía')

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  let pairs: GeminiPair[]
  try {
    pairs = JSON.parse(clean) as GeminiPair[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) pairs = JSON.parse(match[0]) as GeminiPair[]
    else return []
  }

  // Safety: only keep pairs where both words are in the original list
  return pairs.filter(
    p => typeof p.word_a === 'string' && typeof p.word_b === 'string' &&
         wordSet.has(p.word_a) && wordSet.has(p.word_b) &&
         p.word_a !== p.word_b,
  )
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit      = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), 500)
    const wordTypes  = Array.isArray(body.word_types) ? body.word_types as string[] : DEFAULT_WORD_TYPES

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY

    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)

    // 1. Fetch candidate words
    const { data: vocab, error: fetchErr } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es')
      .in('word_type', wordTypes)
      .limit(limit)

    if (fetchErr) throw new AdminApiError(fetchErr.message, 500)
    if (!vocab || vocab.length === 0) {
      return NextResponse.json({ pairs_added: 0, message: 'No se encontraron palabras con los tipos indicados.' })
    }

    // 2. Fetch existing antonym pairs to avoid duplicates
    const allWords = vocab.map((v: { word: string }) => v.word)

    const { data: existingPairs } = await service
      .from('vocab_antonyms')
      .select('word_a, word_b')

    const existingSet = new Set(
      (existingPairs ?? []).map((p: { word_a: string; word_b: string }) =>
        [p.word_a, p.word_b].sort().join('||'),
      ),
    )

    // Remove words that already participate in any antonym pair
    const wordsWithPairs = new Set(
      (existingPairs ?? []).flatMap((p: { word_a: string; word_b: string }) => [p.word_a, p.word_b]),
    )
    const candidates = (vocab as { word: string; reading: string; meaning_es: string }[])
      .filter(v => !wordsWithPairs.has(v.word))

    if (candidates.length === 0) {
      return NextResponse.json({
        pairs_added: 0,
        message: 'Todas las palabras ya tienen un par de contrarios registrado.',
      })
    }

    // 3. Process in batches
    const words = candidates.map(v => ({
      word:    v.word,
      reading: v.reading as string,
      meaning: (v.meaning_es as string) || '',
    }))

    let pairsAdded = 0
    const insertedKeys = new Set(existingSet)

    for (let i = 0; i < words.length; i += BATCH_SIZE) {
      const batch = words.slice(i, i + BATCH_SIZE)

      let geminipairs: GeminiPair[]
      try {
        geminipairs = await detectAntonymsWithGemini(batch, geminiApiKey)
      } catch (e) {
        console.error('auto-detect antonyms Gemini error:', e)
        continue
      }

      for (const pair of geminipairs) {
        const key = [pair.word_a, pair.word_b].sort().join('||')
        if (insertedKeys.has(key)) continue

        const { error: insErr } = await service
          .from('vocab_antonyms')
          .insert({ word_a: pair.word_a, word_b: pair.word_b })

        if (insErr) {
          if (insErr.code !== '23505') {
            console.error(`auto-detect insert error ${pair.word_a}↔${pair.word_b}:`, insErr.message)
          }
        } else {
          pairsAdded++
          insertedKeys.add(key)
        }
      }
    }

    return NextResponse.json({
      candidates_checked: candidates.length,
      pairs_added: pairsAdded,
      message: pairsAdded > 0
        ? `Se encontraron ${pairsAdded} nuevos pares de contrarios.`
        : 'No se encontraron nuevos pares de contrarios.',
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
