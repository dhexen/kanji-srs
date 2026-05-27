import { NextRequest, NextResponse } from 'next/server'
import { requireEditorRole, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * POST /api/admin/vocab/antonyms
 * Add a new antonym pair. Requires admin or contributor role.
 * Body: { word_a: string, word_b: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { service } = await requireEditorRole(request)

    const body = await request.json()
    const wordA = (body.word_a ?? '').toString().trim()
    const wordB = (body.word_b ?? '').toString().trim()

    if (!wordA || !wordB) throw new AdminApiError('Se requieren word_a y word_b', 400)
    if (wordA === wordB) throw new AdminApiError('Una palabra no puede ser contraria de sí misma', 400)

    // Verify both words exist in vocabulary
    const { data: vocab, error: vocabErr } = await service
      .from('vocabulary')
      .select('word')
      .in('word', [wordA, wordB])

    if (vocabErr) throw new AdminApiError(vocabErr.message, 500)

    const found = new Set((vocab ?? []).map((r: { word: string }) => r.word))
    if (!found.has(wordA)) throw new AdminApiError(`La palabra "${wordA}" no existe en el vocabulario`, 404)
    if (!found.has(wordB)) throw new AdminApiError(`La palabra "${wordB}" no existe en el vocabulario`, 404)

    // Insert pair (try both orientations to avoid duplicate)
    const { data, error } = await service
      .from('vocab_antonyms')
      .insert({ word_a: wordA, word_b: wordB })
      .select('id')
      .single()

    if (error) {
      if (error.code === '23505') {
        // Already exists — not an error, return current id
        const { data: existing } = await service
          .from('vocab_antonyms')
          .select('id')
          .or(`and(word_a.eq.${wordA},word_b.eq.${wordB}),and(word_a.eq.${wordB},word_b.eq.${wordA})`)
          .maybeSingle()
        return NextResponse.json({ ok: true, id: existing?.id ?? null, already_exists: true })
      }
      throw new AdminApiError(error.message, 500)
    }

    return NextResponse.json({ ok: true, id: data.id })
  } catch (e) {
    return adminJsonError(e)
  }
}
