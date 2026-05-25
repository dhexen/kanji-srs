import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * DELETE /api/admin/vocab?grade=1
 * Removes ALL words of a given grade from the shared vocabulary table AND
 * from every user's SRS progress so they disappear from all profiles.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const grade = Number(request.nextUrl.searchParams.get('grade'))
    if (!grade || grade < 1 || grade > 6) throw new AdminApiError('Grado inválido (1-6)', 400)

    // 1. Delete from shared vocabulary — capture the words that were deleted
    const { data: deleted, error: vocabErr } = await service
      .from('vocabulary')
      .delete()
      .eq('grade', grade)
      .select('word')
    if (vocabErr) throw new AdminApiError(vocabErr.message, 500)

    const deletedWords = (deleted ?? []).map(r => r.word as string)

    // 2. Delete from every user's SRS progress in chunks (avoids URL limits)
    if (deletedWords.length > 0) {
      const CHUNK = 150
      for (let i = 0; i < deletedWords.length; i += CHUNK) {
        const chunk = deletedWords.slice(i, i + CHUNK)
        const { error: progressErr } = await service
          .from('user_vocab_progress')
          .delete()
          .in('jp', chunk)
        if (progressErr) throw new AdminApiError(progressErr.message, 500)
      }
    }

    return NextResponse.json({ ok: true, deleted: deletedWords.length })
  } catch (e) {
    return adminJsonError(e)
  }
}
