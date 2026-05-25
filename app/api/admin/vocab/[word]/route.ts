import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

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
