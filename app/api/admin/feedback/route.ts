import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { data, error } = await service
      .from('feedback_reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new AdminApiError(error.message, 500)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return adminJsonError(e)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { id, status, admin_response } = await request.json()
    if (!id || !status) throw new AdminApiError('Faltan campos', 400)

    const patch: Record<string, unknown> = { status }
    if (typeof admin_response === 'string') patch.admin_response = admin_response.trim() || null
    patch.resolved_at = status === 'resolved' ? new Date().toISOString() : null

    const { error } = await service
      .from('feedback_reports')
      .update(patch)
      .eq('id', id)
    if (error) throw new AdminApiError(error.message, 500)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
