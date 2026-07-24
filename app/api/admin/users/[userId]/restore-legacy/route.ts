export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, restoreUserVocabLegacy, adminJsonError } from '@/lib/admin-server'

// Reconstruye el pool de vocabulario desde la copia legacy srs_progress.vocab_db.
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const result = await restoreUserVocabLegacy(service, params.userId)
    return NextResponse.json(result)
  } catch (e) {
    return adminJsonError(e)
  }
}
