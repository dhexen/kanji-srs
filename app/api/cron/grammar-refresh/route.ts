export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/grammar-refresh
 *
 * Weekly grammar refresh, spread across the week. Each nightly run adds ~25 new
 * sentences to roughly 1/7 of the grammar points (rotating through a persistent
 * queue), capped at MAX_POOL (oldest trimmed), so every point is renewed about
 * once a week. Time-boxed per invocation; best-effort self-continuation drains
 * the night's slice, and the persistent queue guarantees progress even without
 * chaining. Each run is logged to grammar_refresh_runs (see /admin monitor).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. A `?key=`
 * query param is also accepted for manual runs. Uses the server GEMINI_API_KEY.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/admin-server'
import { runRefreshBatch } from '@/lib/grammar-refresh-core'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    const key = req.nextUrl.searchParams.get('key')
    if (auth !== `Bearer ${secret}` && key !== secret) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY no configurada' }, { status: 500 })

  const service = createServiceClient()
  // Automatic runs keep the nightly ~1/7 cap (spread over the week). Only manual
  // runs ignore it.
  const summary = await runRefreshBatch(service, apiKey, 'cron')

  // Best-effort self-continuation to drain the rest of tonight's slice.
  if (summary.moreTonight && process.env.VERCEL_URL && secret) {
    void fetch(`https://${process.env.VERCEL_URL}/api/cron/grammar-refresh`, {
      headers: { authorization: `Bearer ${secret}` },
    }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    processed_this_call: summary.processed,
    processed_today: summary.processedToday,
    nightly_target: summary.nightlyTarget,
    sentences_added: summary.added,
    remaining_in_cycle: summary.remaining,
    continued: summary.moreTonight,
    stopped: summary.stopped,
    error: summary.error,
  })
}
