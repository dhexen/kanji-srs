export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, restoreUserGrammar, adminJsonError } from '@/lib/admin-server'

// Restaura las 3 tablas de gramática desde un snapshot de grammar_progress_snapshots.
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const { snapshotId: rawId } = await request.json()
    const snapshotId = Number(rawId)
    if (!Number.isFinite(snapshotId)) {
      return NextResponse.json({ error: 'snapshotId es obligatorio' }, { status: 400 })
    }
    const result = await restoreUserGrammar(service, params.userId, snapshotId)
    return NextResponse.json(result)
  } catch (e) {
    return adminJsonError(e)
  }
}
