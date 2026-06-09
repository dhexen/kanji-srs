export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, requireEditorRole, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * DELETE /api/admin/vocab/[word]
 * Removes a word from the shared vocabulary table AND from every user's
 * SRS progress so it disappears completely from all profiles.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { word: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const word = decodeURIComponent(params.word)
    if (!word) throw new AdminApiError('Palabra requerida', 400)

    // 1. Delete from shared vocabulary
    const { error: vocabErr } = await service
      .from('vocabulary')
      .delete()
      .eq('word', word)
    if (vocabErr) throw new AdminApiError(vocabErr.message, 500)

    // 2. Delete from every user's SRS progress (modern table)
    const { error: progressErr } = await service
      .from('user_vocab_progress')
      .delete()
      .eq('jp', word)
    if (progressErr) throw new AdminApiError(progressErr.message, 500)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}

/**
 * PATCH /api/admin/vocab/[word]
 * Updates editable fields of a vocabulary entry (reading, meanings, is_official).
 * Requires admin or contributor role (no AAL2 / 2FA needed).
 *
 * When is_official is set to true, the word's sort_order is recalculated so it
 * appears after the existing official curriculum for each of its kanjis
 * (sort_order = max_official_sort_order_for_that_kanji + 1000), keeping it out
 * of the main curriculum but still ordered before non-official (99999).
 * When set to false, sort_order is reset to 99999.
 *
 * The change propagates to all users because it edits the shared vocabulary table.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { word: string } },
) {
  try {
    const { service } = await requireEditorRole(request)
    const word = decodeURIComponent(params.word)
    if (!word) throw new AdminApiError('Palabra requerida', 400)

    const body = await request.json()

    // ── Handle is_official promotion/demotion separately (needs per-kanji logic) ──
    if (typeof body.is_official === 'boolean') {
      if (body.is_official === true) {
        // Promote: find the kanji rows for this word, recalculate sort_order per kanji
        const { data: wordRows, error: rowsErr } = await service
          .from('vocabulary')
          .select('kanji')
          .eq('word', word)
        if (rowsErr) throw new AdminApiError(rowsErr.message, 500)

        for (const row of wordRows ?? []) {
          // Max sort_order among OFFICIAL words for this kanji (excluding the word being promoted)
          const { data: maxRow } = await service
            .from('vocabulary')
            .select('sort_order')
            .eq('kanji', row.kanji)
            .eq('is_official', true)
            .neq('word', word)
            .order('sort_order', { ascending: false })
            .limit(1)
            .maybeSingle()

          // Place after curriculum but well before 99999 (non-official)
          const baseOrder = (maxRow?.sort_order ?? 0) < 90000
            ? (maxRow?.sort_order ?? 0)
            : 0
          const newOrder = baseOrder + 1000

          const { error: upErr } = await service
            .from('vocabulary')
            .update({ is_official: true, sort_order: newOrder })
            .eq('word', word)
            .eq('kanji', row.kanji)
          if (upErr) throw new AdminApiError(upErr.message, 500)
        }
        return NextResponse.json({ ok: true })
      } else {
        // Demote back to non-official
        const { error } = await service
          .from('vocabulary')
          .update({ is_official: false, sort_order: 99999 })
          .eq('word', word)
        if (error) throw new AdminApiError(error.message, 500)
        return NextResponse.json({ ok: true })
      }
    }

    // ── Normal field edit (reading + meanings + curated furigana) ──
    const patch: Record<string, unknown> = {}

    // Curated per-kanji furigana: array of { t: string, f?: string } or null to clear.
    if ('reading_segments' in body) {
      const segs = body.reading_segments
      patch.reading_segments = Array.isArray(segs) && segs.length
        ? segs
            .filter((s: unknown): s is { t: string; f?: string } => !!s && typeof (s as { t?: unknown }).t === 'string')
            .map((s: { t: string; f?: string }) => ({ t: String(s.t), ...(s.f ? { f: String(s.f) } : {}) }))
        : null
    }

    if (typeof body.reading === 'string') {
      const v = body.reading.trim()
      if (!v) throw new AdminApiError('La lectura no puede estar vacía', 400)
      patch.reading = v
    }
    if (typeof body.meaning_es === 'string') {
      const v = body.meaning_es.trim()
      if (!v) throw new AdminApiError('El significado en español no puede estar vacío', 400)
      patch.meaning_es = v
    }
    if ('meaning_ca' in body) {
      patch.meaning_ca = body.meaning_ca ? String(body.meaning_ca).trim() || null : null
    }
    if ('meaning_en' in body) {
      patch.meaning_en = body.meaning_en ? String(body.meaning_en).trim() || null : null
    }

    if (Object.keys(patch).length === 0) {
      throw new AdminApiError('No hay campos para actualizar', 400)
    }

    const { error } = await service
      .from('vocabulary')
      .update(patch)
      .eq('word', word)
    if (error) throw new AdminApiError(error.message, 500)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
