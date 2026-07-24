export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import {
  requireAdmin, listUserSnapshots, getLegacyVocabBackup, listGrammarSnapshots, adminJsonError,
} from '@/lib/admin-server'

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } },
) {
  try {
    const { service } = await requireAdmin(request)
    const [snapshots, legacyVocab, grammarSnapshots] = await Promise.all([
      listUserSnapshots(service, params.userId),
      getLegacyVocabBackup(service, params.userId),
      listGrammarSnapshots(service, params.userId),
    ])
    return NextResponse.json({ snapshots, legacyVocab, grammarSnapshots })
  } catch (e) {
    return adminJsonError(e)
  }
}
