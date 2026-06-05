import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { data, error } = await service
      .from('grammar_reports')
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
    const { id, status } = await request.json()
    if (!id || !status) throw new AdminApiError('Faltan campos', 400)
    const { error } = await service
      .from('grammar_reports')
      .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) throw new AdminApiError(error.message, 500)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
