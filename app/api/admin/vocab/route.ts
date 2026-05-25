import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

/**
 * DELETE /api/admin/vocab?grade=1
 * Removes ALL words of a given grade from the shared vocabulary table.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const grade = Number(request.nextUrl.searchParams.get('grade'))
    if (!grade || grade < 1 || grade > 6) throw new AdminApiError('Grado inválido (1-6)', 400)

    const { data, error } = await service
      .from('vocabulary')
      .delete()
      .eq('grade', grade)
      .select('word')

    if (error) throw new AdminApiError(error.message, 500)

    return NextResponse.json({ ok: true, deleted: data?.length ?? 0 })
  } catch (e) {
    return adminJsonError(e)
  }
}
