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
 * Updates editable fields of a vocabulary entry (reading + meanings).
 * Requires admin or contributor role (no AAL2 / 2FA needed).
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
    const patch: Record<string, string | null> = {}

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
