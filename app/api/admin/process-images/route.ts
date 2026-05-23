import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const DEFAULT_BATCH = 40
const WIKI_THUMB_PX = 300

interface GeminiClassification {
  jp: string
  imageable: boolean
  title?: string
}

async function classifyWithGemini(
  words: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
): Promise<GeminiClassification[]> {
  const wordList = words.map(w => `${w.word} (${w.reading}) = ${w.meaning}`).join('\n')

  const prompt = `Classify these Japanese vocabulary words. Determine if each can be effectively shown as a concrete, recognizable image (photo of a real object, animal, food, plant, body part, building type, vehicle, tool, clothing, geographical feature like mountain or river).

IMAGEABLE: objects (car, house, apple), animals (dog, cat, fish), foods (rice, sushi, bread), body parts (hand, eye, nose), nature (mountain, river, flower, tree), tools, clothing, vehicles, buildings (school, hospital, temple), furniture, musical instruments.

NOT imageable: abstract nouns (love, peace, idea, freedom, effort), verbs without clear visual referent (run, think, become, exist), adjectives without shape (big, sad, easy, fast), particles, pronouns, time expressions (now, tomorrow, yesterday, always), numbers alone, counters, colors used abstractly.

For each imageable word, provide the exact English Wikipedia article title that shows that thing (e.g. "Dog" not "dog", "Cherry blossom" not "sakura").

Respond ONLY with a valid JSON array, no markdown fences, no extra text:
[{"jp":"犬","imageable":true,"title":"Dog"},{"jp":"愛","imageable":false}]

Words to classify:
${wordList}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`
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
    return JSON.parse(clean) as GeminiClassification[]
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) return JSON.parse(match[0]) as GeminiClassification[]
    throw new Error('No se pudo parsear la respuesta de Gemini como JSON')
  }
}

async function fetchWikipediaThumb(title: string): Promise<string | null> {
  const url =
    `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
    `&prop=pageimages&format=json&pithumbsize=${WIKI_THUMB_PX}&redirects=1`

  const res = await fetch(url, {
    headers: { 'User-Agent': 'KanjiSRS/1.0 (educational SRS app; contact via github)' },
  })
  if (!res.ok) return null

  const data = await res.json()
  const pages = data?.query?.pages
  if (!pages) return null
  const page = Object.values(pages)[0] as Record<string, any>
  return (page?.thumbnail?.source as string) ?? null
}

// GET — stats about image coverage
export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const [{ count: total }, { count: withImage }, { count: checked }] = await Promise.all([
      service.from('vocabulary').select('*', { count: 'exact', head: true }),
      service
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('image_url', 'is', null)
        .neq('image_url', ''),
      service
        .from('vocabulary')
        .select('*', { count: 'exact', head: true })
        .not('image_url', 'is', null),
    ])

    return NextResponse.json({
      total: total ?? 0,
      with_image: withImage ?? 0,
      checked: checked ?? 0,
      pending: (total ?? 0) - (checked ?? 0),
    })
  } catch (e) {
    return adminJsonError(e)
  }
}

// POST — process a batch of words
export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_BATCH), 100)
    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY

    if (!geminiApiKey) {
      throw new AdminApiError(
        'No hay GEMINI_API_KEY en el servidor. Pasa "geminiApiKey" en el body.',
        400,
      )
    }

    // Fetch words not yet checked (image_url IS NULL)
    const { data: vocab, error } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es')
      .is('image_url', null)
      .limit(limit)

    if (error) throw new AdminApiError(error.message, 500)
    if (!vocab || vocab.length === 0) {
      return NextResponse.json({ processed: 0, new_images: 0, message: 'No quedan palabras pendientes' })
    }

    const words = vocab.map(v => ({
      word: v.word as string,
      reading: v.reading as string,
      meaning: (v.meaning_es as string) || '',
    }))

    // Classify with Gemini
    let classifications: GeminiClassification[]
    try {
      classifications = await classifyWithGemini(words, geminiApiKey)
    } catch (e) {
      throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
    }

    const classMap = new Map(classifications.map(c => [c.jp, c]))

    // Fetch Wikipedia thumbnails in parallel for imageable words
    const imageableWords = classifications.filter(c => c.imageable && c.title)
    const wikiResults = await Promise.allSettled(
      imageableWords.map(async c => ({
        word: c.jp,
        imageUrl: await fetchWikipediaThumb(c.title!),
      })),
    )

    const imageMap = new Map<string, string>()
    for (const result of wikiResults) {
      if (result.status === 'fulfilled' && result.value.imageUrl) {
        imageMap.set(result.value.word, result.value.imageUrl)
      }
    }

    // Update each word in the vocabulary table
    let newImages = 0
    const updatePromises = words.map(async w => {
      const imageUrl = imageMap.get(w.word) ?? ''
      if (imageUrl) newImages++
      const { error: updErr } = await service
        .from('vocabulary')
        .update({ image_url: imageUrl })
        .eq('word', w.word)
        .is('image_url', null)
      if (updErr) console.error(`image update error for ${w.word}:`, updErr.message)
    })
    await Promise.allSettled(updatePromises)

    const notImageable = words.filter(w => {
      const cls = classMap.get(w.word)
      return !cls || !cls.imageable
    }).length
    const noWikiImage = imageableWords.length - newImages

    return NextResponse.json({
      processed: words.length,
      new_images: newImages,
      not_imageable: notImageable,
      no_wiki_image: noWikiImage,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
