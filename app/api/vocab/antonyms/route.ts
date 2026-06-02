/**
 * GET /api/vocab/antonyms
 *
 * Public route (no auth required) that fetches all antonym pairs with full
 * vocabulary data for each word. Uses the service-role client to bypass any
 * schema-cache issues that can affect the anon client when the vocab_antonyms
 * table is newly created.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing Supabase env vars')
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function GET() {
  try {
    const service = getServiceClient()

    const { data: pairs, error: pairsErr } = await service
      .from('vocab_antonyms')
      .select('id, word_a, word_b')
      .order('id', { ascending: true })

    if (pairsErr) {
      if ((pairsErr.code === '42P01') || (pairsErr.message ?? '').includes('does not exist')) {
        return NextResponse.json({ pairs: [] })
      }
      return NextResponse.json({ error: pairsErr.message }, { status: 500 })
    }
    if (!pairs || pairs.length === 0) return NextResponse.json({ pairs: [] })

    const allWords = [...new Set([
      ...pairs.map(p => p.word_a as string),
      ...pairs.map(p => p.word_b as string),
    ])]

    const { data: vocabData, error: vocabErr } = await service
      .from('vocabulary')
      .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, word_type, grade')
      .in('word', allWords)

    if (vocabErr) return NextResponse.json({ error: vocabErr.message }, { status: 500 })

    const vocabMap = new Map((vocabData ?? []).map(v => [v.word as string, v]))

    const result = []
    for (const pair of pairs) {
      const a = vocabMap.get(pair.word_a as string)
      const b = vocabMap.get(pair.word_b as string)
      if (!a || !b) continue
      result.push({
        id: pair.id,
        word_a: {
          word:       String(a.word),
          kanji:      String(a.kanji),
          reading:    String(a.reading),
          meaning_es: String(a.meaning_es ?? ''),
          meaning_ca: a.meaning_ca ? String(a.meaning_ca) : null,
          meaning_en: a.meaning_en ? String(a.meaning_en) : null,
          word_type:  a.word_type  ? String(a.word_type)  : null,
          grade:      typeof a.grade === 'number' ? a.grade : null,
        },
        word_b: {
          word:       String(b.word),
          kanji:      String(b.kanji),
          reading:    String(b.reading),
          meaning_es: String(b.meaning_es ?? ''),
          meaning_ca: b.meaning_ca ? String(b.meaning_ca) : null,
          meaning_en: b.meaning_en ? String(b.meaning_en) : null,
          word_type:  b.word_type  ? String(b.word_type)  : null,
          grade:      typeof b.grade === 'number' ? b.grade : null,
        },
      })
    }

    return NextResponse.json({ pairs: result })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error desconocido' },
      { status: 500 },
    )
  }
}
