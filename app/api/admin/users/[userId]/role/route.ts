import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, setAdminUserRole, adminJsonError } from '@/lib/admin-server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { adminId, service } = await requireAdmin(request)
    const { role } = await request.json()
    if (role !== 'admin' && role !== 'user') {
      return NextResponse.json({ error: 'Rol inválido' }, { status: 400 })
    }
    if (params.userId === adminId && role !== 'admin') {
      return NextResponse.json({ error: 'No puedes quitarte el rol de admin a ti mismo' }, { status: 400 })
    }
    await setAdminUserRole(service, params.userId, role)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
