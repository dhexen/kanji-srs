export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireEditorRole, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * DELETE /api/admin/vocab/antonyms/[id]
 * Remove an antonym pair by ID. Requires admin or contributor role.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const { service } = await requireEditorRole(request)

    const id = parseInt(params.id, 10)
    if (isNaN(id)) throw new AdminApiError('ID inválido', 400)

    const { error } = await service
      .from('vocab_antonyms')
      .delete()
      .eq('id', id)

    if (error) throw new AdminApiError(error.message, 500)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
