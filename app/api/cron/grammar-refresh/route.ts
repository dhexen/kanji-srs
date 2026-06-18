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
 * chaining (the next night continues where it left off).
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. A `?key=`
 * query param is also accepted for manual runs.
 * Uses the server `GEMINI_API_KEY` env var.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/admin-server'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { generatePointRows, REFRESH_BATCH, MAX_POOL } from '@/lib/grammar-seed-core'

const ALL_GRAMMAR: GrammarPoint[] = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]
const BY_ID = new Map(ALL_GRAMMAR.map(g => [g.id, g]))
const NIGHTLY_TARGET = Math.ceil(ALL_GRAMMAR.length / 7)  // ~1/7 per night → weekly cycle

const BUDGET_MS = 50_000   // leave headroom under maxDuration
const MAX_PER_CALL = 30    // safety cap per invocation

type ServiceClient = ReturnType<typeof createServiceClient>

/** Trim a point's pool to MAX_POOL, deleting the oldest rows. */
async function trim(service: ServiceClient, grammarId: string) {
  const { count } = await service
    .from('grammar_sentences')
    .select('*', { count: 'exact', head: true })
    .eq('grammar_id', grammarId)
    .eq('is_private', false)
  if (count === null || count <= MAX_POOL) return
  const { data } = await service
    .from('grammar_sentences')
    .select('id')
    .eq('grammar_id', grammarId)
    .eq('is_private', false)
    .order('created_at', { ascending: true })
    .limit(count - MAX_POOL)
  const ids = (data ?? []).map(r => r.id as string)
  if (ids.length) await service.from('grammar_sentences').delete().in('id', ids)
}

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
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
  const start = Date.now()

  // ── Load / init refresh state ───────────────────────────────────────────────
  const { data: row } = await service.from('grammar_refresh').select('*').eq('id', 1).maybeSingle()
  const today = new Date().toISOString().slice(0, 10)
  let queue: string[] = Array.isArray(row?.queue) ? (row!.queue as string[]) : []
  let processedToday = row?.run_date === today ? (row?.processed_today ?? 0) : 0

  // Start (or continue) a cycle: refill the queue when empty.
  if (queue.length === 0) queue = ALL_GRAMMAR.map(g => g.id)

  // ── Vocab sample (once per invocation) ──────────────────────────────────────
  const { data: vocabRows } = await service
    .from('vocabulary').select('word, reading, meaning_es').lte('grade', 6).limit(200)
  const vocab = (vocabRows ?? []).map((d: any) => ({ jp: d.word, reading: d.reading, meaning: d.meaning_es ?? '' }))

  // ── Process points until the night's target / time budget is reached ────────
  let added = 0, processedThisCall = 0
  let stoppedReason = 'target_reached'
  while (
    queue.length > 0 &&
    processedToday < NIGHTLY_TARGET &&
    processedThisCall < MAX_PER_CALL &&
    Date.now() - start < BUDGET_MS
  ) {
    const id = queue[0]
    const grammar = BY_ID.get(id)
    if (!grammar) { queue.shift(); continue }

    const result = await generatePointRows(grammar, vocab, apiKey, REFRESH_BATCH)
    if (!result.ok) {
      // Transient (rate limit / overload): stop this run, keep the point queued.
      if (!result.permanent) { stoppedReason = 'gemini_throttled'; break }
      queue.shift(); processedToday++; processedThisCall++   // permanent → skip it
      continue
    }
    if (result.rows.length > 0) {
      const { error } = await service.from('grammar_sentences').insert(result.rows)
      if (!error) { added += result.rows.length; await trim(service, id) }
    }
    queue.shift(); processedToday++; processedThisCall++
    // Refill mid-night if the cycle finished but tonight's quota isn't met.
    if (queue.length === 0 && processedToday < NIGHTLY_TARGET) queue = ALL_GRAMMAR.map(g => g.id)
  }

  // ── Persist state ───────────────────────────────────────────────────────────
  await service.from('grammar_refresh').upsert({
    id: 1, queue, processed_today: processedToday, run_date: today, updated_at: new Date().toISOString(),
  })

  // ── Best-effort self-continuation to drain the rest of tonight's slice ──────
  const moreTonight = queue.length > 0 && processedToday < NIGHTLY_TARGET && stoppedReason !== 'gemini_throttled'
  if (moreTonight && process.env.VERCEL_URL && secret) {
    void fetch(`https://${process.env.VERCEL_URL}/api/cron/grammar-refresh`, {
      headers: { authorization: `Bearer ${secret}` },
    }).catch(() => {})
  }

  return NextResponse.json({
    ok: true,
    processed_this_call: processedThisCall,
    processed_today: processedToday,
    nightly_target: NIGHTLY_TARGET,
    sentences_added: added,
    remaining_in_cycle: queue.length,
    continued: moreTonight,
    stopped: stoppedReason,
  })
}
