import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * DELETE /api/admin/vocab/[word]
 * Removes a word from the shared vocabulary table (admin only).
 * The word is URL-encoded since it can contain Japanese characters.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { word: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const word = decodeURIComponent(params.word)
    if (!word) throw new AdminApiError('Palabra requerida', 400)

    const { error } = await service
      .from('vocabulary')
      .delete()
      .eq('word', word)

    if (error) throw new AdminApiError(error.message, 500)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
