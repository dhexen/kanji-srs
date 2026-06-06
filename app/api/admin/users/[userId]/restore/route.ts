export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, restoreUserSnapshot, adminJsonError } from '@/lib/admin-server'

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
    const result = await restoreUserSnapshot(service, params.userId, snapshotId)
    return NextResponse.json(result)
  } catch (e) {
    return adminJsonError(e)
  }
}
