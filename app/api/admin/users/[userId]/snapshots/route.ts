export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, listUserSnapshots, adminJsonError } from '@/lib/admin-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const snapshots = await listUserSnapshots(service, params.userId)
    return NextResponse.json({ snapshots })
  } catch (e) {
    return adminJsonError(e)
  }
}
