export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/pending-count
 *
 * Lightweight count of open reports for the admin badge:
 *   • feedback_reports with status 'open' (bugs / improvement suggestions)
 *   • vocab_reports    with status 'open' (word errors reported by users)
 *   • grammar_reports  with status 'open' (grammar sentence errors)
 *
 * Returns { feedback, vocab, grammar, total }. Missing tables count as 0.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const [fb, vr, gr] = await Promise.all([
      service.from('feedback_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      service.from('vocab_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      service.from('grammar_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ])

    const feedback = fb.error ? 0 : (fb.count ?? 0)
    const vocab    = vr.error ? 0 : (vr.count ?? 0)
    const grammar  = gr.error ? 0 : (gr.count ?? 0)

    return NextResponse.json({ feedback, vocab, grammar, total: feedback + vocab + grammar })
  } catch (e) {
    return adminJsonError(e)
  }
}
