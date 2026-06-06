export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

export interface ImageReport {
  word: string
  image_url: string
  meaning_es: string
  image_search_term: string | null
  upvotes: number
  downvotes: number
}

// GET — words whose images have more downvotes than upvotes
export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const [{ data: votes }, { data: vocab }] = await Promise.all([
      service.from('vocab_image_votes').select('word, vote'),
      service
        .from('vocabulary')
        .select('word, image_url, meaning_es, image_search_term')
        .not('image_url', 'is', null)
        .neq('image_url', ''),
    ])

    // Aggregate votes per word
    const voteMap = new Map<string, { up: number; down: number }>()
    for (const v of votes ?? []) {
      const entry = voteMap.get(v.word) ?? { up: 0, down: 0 }
      if (v.vote === 1) entry.up++
      else entry.down++
      voteMap.set(v.word, entry)
    }

    // Index vocab by word
    const vocabMap = new Map((vocab ?? []).map(v => [v.word, v]))

    // Keep only words with net negative votes that still have an image
    const reports: ImageReport[] = []
    for (const [word, counts] of voteMap) {
      if (counts.down <= counts.up) continue
      const v = vocabMap.get(word)
      if (!v) continue
      reports.push({
        word,
        image_url: v.image_url as string,
        meaning_es: (v.meaning_es as string) ?? '',
        image_search_term: (v.image_search_term as string) ?? null,
        upvotes: counts.up,
        downvotes: counts.down,
      })
    }

    reports.sort((a, b) => (a.upvotes - a.downvotes) - (b.upvotes - b.downvotes))

    return NextResponse.json({ reports })
  } catch (e) {
    return adminJsonError(e)
  }
}

async function fetchPexelsImage(searchTerm: string, apiKey: string): Promise<string | null> {
  // Use page 2 on retry to get a different image
  const url =
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(searchTerm)}&per_page=3&page=2&orientation=square`
  const res = await fetch(url, { headers: { Authorization: apiKey } })
  if (!res.ok) return null
  const data = await res.json()
  // Pick a random result from the page to increase variety
  const hits = (data.photos as any[]) ?? []
  const hit = hits[Math.floor(Math.random() * Math.max(hits.length, 1))]
  return (hit?.src?.small as string) ?? null
}

// PATCH — act on a flagged word's image
// Body: { word, action: 'remove' | 'retry' | 'set_url' | 'preview', url?: string, candidateUrl?: string, pexelsApiKey?: string }
export async function PATCH(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json() as {
      word: string
      action: 'remove' | 'retry' | 'set_url' | 'preview'
      url?: string
      candidateUrl?: string
      pexelsApiKey?: string
    }
    const { word, action } = body
    if (!word || !action) throw new AdminApiError('word y action son obligatorios', 400)

    // preview: search Pexels and return candidate WITHOUT saving to DB
    if (action === 'preview') {
      const pexelsKey = body.pexelsApiKey?.trim() ?? process.env.PEXELS_API_KEY
      if (!pexelsKey) throw new AdminApiError('Falta la Pexels API Key', 400)
      const { data: vocabRow } = await service
        .from('vocabulary')
        .select('image_search_term')
        .eq('word', word)
        .maybeSingle()
      const searchTerm = (vocabRow?.image_search_term as string) ?? word
      const found = await fetchPexelsImage(searchTerm, pexelsKey)
      return NextResponse.json({ ok: true, image_url: found ?? '' })
    }

    let newImageUrl: string

    if (action === 'remove') {
      newImageUrl = ''
    } else if (action === 'set_url') {
      if (!body.url?.startsWith('http')) throw new AdminApiError('URL inválida', 400)
      newImageUrl = body.url
    } else if (action === 'retry') {
      if (body.candidateUrl) {
        // Accept a pre-fetched candidate image
        newImageUrl = body.candidateUrl
      } else {
        const pexelsKey = body.pexelsApiKey?.trim() ?? process.env.PEXELS_API_KEY
        if (!pexelsKey) throw new AdminApiError('Falta la Pexels API Key', 400)
        const { data: vocabRow } = await service
          .from('vocabulary')
          .select('image_search_term')
          .eq('word', word)
          .maybeSingle()
        const searchTerm = (vocabRow?.image_search_term as string) ?? word
        const found = await fetchPexelsImage(searchTerm, pexelsKey)
        newImageUrl = found ?? ''
      }
    } else {
      throw new AdminApiError('action desconocida', 400)
    }

    // Update image and clear votes (fresh start for the new image)
    const [{ error: imgErr }, { error: voteErr }] = await Promise.all([
      service.from('vocabulary').update({ image_url: newImageUrl }).eq('word', word),
      service.from('vocab_image_votes').delete().eq('word', word),
    ])

    if (imgErr) throw new AdminApiError(imgErr.message, 500)
    if (voteErr) console.warn('vote clear error:', voteErr.message)

    return NextResponse.json({ ok: true, image_url: newImageUrl })
  } catch (e) {
    return adminJsonError(e)
  }
}
