/**
 * /api/admin/classify-vocab-full
 *
 * Unified vocabulary enrichment: ONE Gemini call per batch does:
 *   1. word_type   — grammatical type
 *   2. category    — semantic category
 *   3. imageable   — whether a concrete image can illustrate the word
 *   4. image_search_term — English search term for Pexels
 *   5. antonym     — Japanese antonym word (if it exists in school vocab)
 *
 * Then, in the same request:
 *   • Updates vocabulary.word_type + category
 *   • Fetches Pexels photo for imageable words → updates vocabulary.image_url
 *   • Inserts vocab_antonyms pairs when both words exist in the DB
 *
 * GET  → combined stats (type/category/image coverage + antonym pair count)
 * POST → process one batch (default 35 words)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const DEFAULT_BATCH = 35

// ─── Types ───────────────────────────────────────────────────────────────────

interface GeminiFullResult {
  jp:               string
  word_type:        string
  category:         string
  imageable:        boolean
  image_search_term?: string | null
  antonym?:         string | null
}

export interface FullClassifyStats {
  total:           number
  with_type:       number
  with_category:   number
  with_image:      number
  antonym_pairs:   number
  antonym_todo:    number   // verbs/adjs without any antonym pair yet
  pending:         number   // missing word_type OR category OR image check OR antonym
}

export interface FullClassifyResult {
  processed:           number
  updated_vocab:       number   // words that got word_type or category updated
  new_images:          number
  not_imageable:       number
  no_source_image:     number
  antonym_pairs_added: number
  message?:            string
}

// ─── Valid values ─────────────────────────────────────────────────────────────

const VALID_WORD_TYPES = new Set([
  'noun', 'verb_transitive', 'verb_intransitive', 'verb',
  'adj_i', 'adj_na', 'adverb', 'particle', 'expression',
])

// Types that can have antonyms
const ANTONYM_WORD_TYPES = new Set([
  'verb_transitive', 'verb_intransitive', 'verb', 'adj_i', 'adj_na',
])
const VALID_CATEGORIES = new Set([
  'animals', 'nature', 'colors', 'weather', 'time', 'food', 'transport',
  'family', 'body', 'school', 'home', 'work', 'places', 'numbers',
  'emotions', 'actions', 'sports', 'culture', 'other',
])

// ─── Gemini helper ────────────────────────────────────────────────────────────

async function classifyWithGemini(
  words: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
): Promise<GeminiFullResult[]> {
  const wordList = words.map(w => `${w.word} (${w.reading}) = ${w.meaning}`).join('\n')

  const prompt = `You are classifying Japanese vocabulary words from the official school curriculum (grades 1-9).
For each word provide ALL of the following fields in one JSON object:

WORD_TYPE — pick exactly one:
  noun, verb_transitive (他動詞, takes direct object), verb_intransitive (自動詞, no direct object),
  verb (when trans/intrans is ambiguous), adj_i (い形), adj_na (な形),
  adverb, particle, expression

CATEGORY — pick exactly one:
  animals, nature, colors, weather, time, food, transport, family, body,
  school, home, work, places, numbers, emotions, actions, sports, culture, other

IMAGEABLE — true if the word can be illustrated with a concrete, recognizable photo
  (objects, animals, food, body parts, buildings, vehicles, tools, clothing, nature features).
  false for abstract nouns, pure actions, adjectives, particles, time expressions.

IMAGE_SEARCH_TERM — short English search term (1–3 words) for Pexels, only when imageable=true, else null.

ANTONYM — the Japanese antonym word that would appear in school vocabulary (opposite meaning).
  Examples: 開く→閉める, 高い→低い, 入る→出る, 新しい→古い.
  Use the dictionary form. Write null if no clear antonym exists or is not school-level vocabulary.
  ⚠️ Only provide an antonym if you are confident it is a standard, common opposite taught at school level.

Respond ONLY with a valid JSON array, no markdown, no extra text:
[{"jp":"犬","word_type":"noun","category":"animals","imageable":true,"image_search_term":"dog","antonym":null},
 {"jp":"高い","word_type":"adj_i","category":"other","imageable":false,"image_search_term":null,"antonym":"低い"}]

Words to classify:
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
    throw new Error(`Gemini ${res.status}: ${(data as { error?: { message?: string } })?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini devolvió respuesta vacía')

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(clean) as GeminiFullResult[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as GeminiFullResult[]
    throw new Error('No se pudo parsear la respuesta de Gemini como JSON')
  }
}

// ─── Pexels helper ────────────────────────────────────────────────────────────

async function fetchPexelsImage(searchTerm: string, apiKey: string): Promise<string | null> {
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=1&orientation=square`
  const res = await fetch(url, { headers: { Authorization: apiKey } })
  if (!res.ok) return null
  const data = await res.json()
  return (data.photos?.[0]?.src?.small as string) ?? null
}

// ─── GET — combined stats ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const [
      { count: total },
      { count: withType },
      { count: withCategory },
      { count: withImage },
      { count: classificationPending },
    ] = await Promise.all([
      service.from('vocabulary').select('*', { count: 'exact', head: true }),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).not('word_type', 'is', null),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).not('category', 'is', null),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).not('image_url', 'is', null),
      service.from('vocabulary').select('*', { count: 'exact', head: true }).or('word_type.is.null,category.is.null,image_url.is.null'),
    ])

    // Count antonym pairs and compute verbs/adjs without antonyms
    const [{ data: antonymRows }, { data: verbAdjRows }] = await Promise.all([
      service.from('vocab_antonyms').select('word_a, word_b'),
      service.from('vocabulary').select('word').in('word_type', [...ANTONYM_WORD_TYPES]),
    ])

    const antonymPairs = (antonymRows ?? []).length
    const antonymParticipants = new Set([
      ...(antonymRows ?? []).map((p: { word_a: string }) => p.word_a),
      ...(antonymRows ?? []).map((p: { word_b: string }) => p.word_b),
    ])
    const antonymTodo = (verbAdjRows ?? []).filter(
      (v: { word: string }) => !antonymParticipants.has(v.word),
    ).length

    const pending = (classificationPending ?? 0) + antonymTodo

    return NextResponse.json({
      total:          total          ?? 0,
      with_type:      withType       ?? 0,
      with_category:  withCategory   ?? 0,
      with_image:     withImage      ?? 0,
      antonym_pairs:  antonymPairs,
      antonym_todo:   antonymTodo,
      pending,
    } satisfies FullClassifyStats)
  } catch (e) {
    return adminJsonError(e)
  }
}

// ─── POST — process one batch ─────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_BATCH), 100)

    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY

    const pexelsApiKey = (typeof body.pexelsApiKey === 'string' && body.pexelsApiKey.trim())
      ? body.pexelsApiKey.trim()
      : process.env.PEXELS_API_KEY

    if (!geminiApiKey) {
      throw new AdminApiError('Falta la Gemini API Key.', 400)
    }
    if (!pexelsApiKey) {
      throw new AdminApiError('Falta la Pexels API Key (pexels.com/api, gratuita).', 400)
    }

    // Fetch words pending any classification
    const { data: pendingVocab, error: fetchErr } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es, word_type, category, image_url')
      .or('word_type.is.null,category.is.null,image_url.is.null')
      .limit(limit)

    if (fetchErr) throw new AdminApiError(fetchErr.message, 500)

    // Also fetch verbs/adjectives that have no antonym pair yet
    const { data: antonymRows } = await service
      .from('vocab_antonyms')
      .select('word_a, word_b')

    const antonymParticipants = new Set([
      ...(antonymRows ?? []).map((p: { word_a: string }) => p.word_a),
      ...(antonymRows ?? []).map((p: { word_b: string }) => p.word_b),
    ])

    const pendingWords = new Set((pendingVocab ?? []).map((v: { word: string }) => v.word))
    const antonymGap = limit - pendingWords.size

    let antonymVocab: typeof pendingVocab = []
    if (antonymGap > 0) {
      const { data: verbAdjFull } = await service
        .from('vocabulary')
        .select('word, reading, meaning_es, word_type, category, image_url')
        .in('word_type', [...ANTONYM_WORD_TYPES])
        .limit(limit * 3) // fetch more so we can filter
      antonymVocab = (verbAdjFull ?? [])
        .filter((v: { word: string }) => !antonymParticipants.has(v.word) && !pendingWords.has(v.word))
        .slice(0, antonymGap)
    }

    const vocab = [...(pendingVocab ?? []), ...(antonymVocab ?? [])]

    if (vocab.length === 0) {
      return NextResponse.json({
        processed: 0, updated_vocab: 0, new_images: 0,
        not_imageable: 0, no_source_image: 0, antonym_pairs_added: 0,
        message: 'No quedan palabras pendientes de clasificar ni antónimos por detectar',
      } satisfies FullClassifyResult)
    }

    const words = vocab.map(v => ({
      word:    v.word    as string,
      reading: v.reading as string,
      meaning: (v.meaning_es as string) || '',
    }))

    // ── Single Gemini call ────────────────────────────────────────────────────
    let classifications: GeminiFullResult[]
    try {
      classifications = await classifyWithGemini(words, geminiApiKey)
    } catch (e) {
      throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
    }

    const classMap = new Map(classifications.map(c => [c.jp, c]))

    // ── Fetch Pexels images in parallel for imageable words ───────────────────
    const toFetchImage = classifications.filter(c => c.imageable && c.image_search_term)
    const pexelsResults = await Promise.allSettled(
      toFetchImage.map(async c => ({
        word:     c.jp,
        imageUrl: await fetchPexelsImage(c.image_search_term!, pexelsApiKey),
      }))
    )
    const imageMap = new Map<string, string>()
    for (const r of pexelsResults) {
      if (r.status === 'fulfilled' && r.value.imageUrl) {
        imageMap.set(r.value.word, r.value.imageUrl)
      }
    }

    // ── Verify antonym suggestions against the vocabulary table ──────────────
    const suggestedAntonyms = classifications
      .map(c => c.antonym)
      .filter((a): a is string => typeof a === 'string' && a.trim() !== '')

    let validAntonymWords = new Set<string>()
    if (suggestedAntonyms.length > 0) {
      const { data: existingWords } = await service
        .from('vocabulary')
        .select('word')
        .in('word', [...new Set(suggestedAntonyms)])
      validAntonymWords = new Set((existingWords ?? []).map((r: { word: string }) => r.word))
    }

    // ── Build existing pair set to prevent re-insertions ─────────────────────
    // antonymRows was fetched above; build a pair set from it
    const existingPairSet = new Set(
      (antonymRows ?? []).map((p: { word_a: string; word_b: string }) =>
        [p.word_a, p.word_b].sort().join('||')
      )
    )

    // ── Apply updates ─────────────────────────────────────────────────────────
    let updatedVocab   = 0
    let newImages      = 0
    let notImageable   = 0
    let noSourceImage  = 0
    let antonymPairsAdded = 0

    const updatePromises = words.map(async w => {
      const cls = classMap.get(w.word)
      if (!cls) return

      const row = vocab.find(v => v.word === w.word)

      // Build vocabulary patch
      const patch: Record<string, string | null> = {}

      const wt = VALID_WORD_TYPES.has(cls.word_type) ? cls.word_type : null
      const cat = VALID_CATEGORIES.has(cls.category) ? cls.category : null

      // Only patch fields that are currently null (don't overwrite existing data)
      if (!row?.word_type && wt)  patch.word_type = wt
      if (!row?.category  && cat) patch.category  = cat

      // Image: only process if image_url is currently null (not yet checked)
      if (row?.image_url === null) {
        const imageUrl = imageMap.get(w.word) ?? ''
        patch.image_url        = imageUrl
        patch.image_search_term = cls.image_search_term ?? null
        if (imageUrl) {
          newImages++
        } else if (!cls.imageable) {
          notImageable++
        } else {
          noSourceImage++
        }
      }

      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await service
          .from('vocabulary')
          .update(patch)
          .eq('word', w.word)
        if (updErr) console.error(`full-classify update error for ${w.word}:`, updErr.message)
        else if (patch.word_type || patch.category) updatedVocab++
      }

      // Antonym pair
      const antonym = cls.antonym?.trim() || null
      if (antonym && validAntonymWords.has(antonym)) {
        const pairKey = [w.word, antonym].sort().join('||')
        if (!existingPairSet.has(pairKey)) {
          const { error: antErr } = await service
            .from('vocab_antonyms')
            .insert({ word_a: w.word, word_b: antonym })
          if (antErr) {
            // code 23505 = duplicate (race condition) — not an error
            if (antErr.code !== '23505') {
              console.error(`antonym insert error for ${w.word}↔${antonym}:`, antErr.message)
            }
          } else {
            antonymPairsAdded++
            existingPairSet.add(pairKey) // prevent double insert within same batch
          }
        }
      }
    })

    await Promise.allSettled(updatePromises)

    return NextResponse.json({
      processed:           words.length,
      updated_vocab:       updatedVocab,
      new_images:          newImages,
      not_imageable:       notImageable,
      no_source_image:     noSourceImage,
      antonym_pairs_added: antonymPairsAdded,
    } satisfies FullClassifyResult)
  } catch (e) {
    return adminJsonError(e)
  }
}
