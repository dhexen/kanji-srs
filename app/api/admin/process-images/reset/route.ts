export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

// POST — resets all vocabulary rows that were checked but got no image (image_url = ''),
// setting them back to NULL so they will be retried on the next batch run.
export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const { data, error } = await service
      .from('vocabulary')
      .update({ image_url: null })
      .eq('image_url', '')
      .select('word')

    if (error) throw new AdminApiError(error.message, 500)

    return NextResponse.json({ reset: (data ?? []).length })
  } catch (e) {
    return adminJsonError(e)
  }
}
