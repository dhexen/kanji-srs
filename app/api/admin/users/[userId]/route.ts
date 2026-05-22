import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, deleteAdminUser, adminJsonError } from '@/lib/admin-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { adminId, service } = await requireAdmin(request)
    const userId = params.userId
    if (userId === adminId) {
      return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta' }, { status: 400 })
    }
    await deleteAdminUser(service, userId)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
