// Shared logic for the weekly grammar-sentence refresh, used by the cron route
// and the admin "run now" / status endpoint.

import type { SupabaseClient } from '@supabase/supabase-js'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { generatePointRows, REFRESH_BATCH, MAX_POOL } from '@/lib/grammar-seed-core'

export const ALL_GRAMMAR: GrammarPoint[] = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]
export const BY_ID = new Map(ALL_GRAMMAR.map(g => [g.id, g]))
export const NIGHTLY_TARGET = Math.ceil(ALL_GRAMMAR.length / 7)  // ~1/7 per night → weekly cycle

const BUDGET_MS = 50_000   // leave headroom under the route's maxDuration
const MAX_PER_CALL = 30    // safety cap per invocation

export interface RefreshSummary {
  processed: number       // points processed this run
  added: number           // sentences inserted this run
  remaining: number       // points left in the cycle
  processedToday: number
  nightlyTarget: number
  stopped: string
  error: string | null
  durationMs: number
  moreTonight: boolean    // whether there's more to do for tonight's quota
}

/** Trim a point's pool to MAX_POOL, deleting the oldest rows. */
async function trim(service: SupabaseClient, grammarId: string) {
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

/**
 * Process one batch of the refresh cycle: generate +REFRESH_BATCH sentences for
 * points from the persistent queue (capped to the night's target and a time
 * budget), trim each pool to MAX_POOL, persist state, and log the run.
 */
export async function runRefreshBatch(
  service: SupabaseClient,
  apiKey: string,
  trigger: 'cron' | 'manual' = 'cron',
): Promise<RefreshSummary> {
  const start = Date.now()

  const { data: row } = await service.from('grammar_refresh').select('*').eq('id', 1).maybeSingle()
  const today = new Date().toISOString().slice(0, 10)
  let queue: string[] = Array.isArray(row?.queue) ? (row!.queue as string[]) : []
  let processedToday = row?.run_date === today ? (row?.processed_today ?? 0) : 0
  if (queue.length === 0) queue = ALL_GRAMMAR.map(g => g.id)

  const { data: vocabRows } = await service
    .from('vocabulary').select('word, reading, meaning_es').lte('grade', 6).limit(200)
  const vocab = (vocabRows ?? []).map((d: any) => ({ jp: d.word, reading: d.reading, meaning: d.meaning_es ?? '' }))

  let added = 0, processed = 0
  let stopped = 'target_reached'
  let error: string | null = null

  while (queue.length > 0 && processedToday < NIGHTLY_TARGET && processed < MAX_PER_CALL) {
    if (Date.now() - start >= BUDGET_MS) { stopped = 'time_budget'; break }
    if (processed >= MAX_PER_CALL) { stopped = 'max_per_call'; break }

    const id = queue[0]
    const grammar = BY_ID.get(id)
    if (!grammar) { queue.shift(); continue }

    const result = await generatePointRows(grammar, vocab, apiKey, REFRESH_BATCH)
    if (!result.ok) {
      if (!result.permanent) { stopped = 'gemini_throttled'; error = result.error; break }
      // permanent → record per-point and skip
      await service.from('grammar_seed_errors').upsert(
        { grammar_id: id, error_msg: result.error, is_permanent: true, updated_at: new Date().toISOString() },
        { onConflict: 'grammar_id' },
      )
      error = result.error
      queue.shift(); processedToday++; processed++
      continue
    }
    if (result.rows.length > 0) {
      const { error: insErr } = await service.from('grammar_sentences').insert(result.rows)
      if (insErr) { error = insErr.message } else { added += result.rows.length; await trim(service, id) }
    }
    queue.shift(); processedToday++; processed++
    if (queue.length === 0 && processedToday < NIGHTLY_TARGET) queue = ALL_GRAMMAR.map(g => g.id)
  }

  if (queue.length === 0) stopped = 'cycle_complete'

  await service.from('grammar_refresh').upsert({
    id: 1, queue, processed_today: processedToday, run_date: today, updated_at: new Date().toISOString(),
  })

  const durationMs = Date.now() - start
  const moreTonight = queue.length > 0 && processedToday < NIGHTLY_TARGET && stopped !== 'gemini_throttled'

  await service.from('grammar_refresh_runs').insert({
    trigger, processed, added, remaining: queue.length, stopped, error, duration_ms: durationMs,
  })
  // Keep the run log bounded (latest ~300 rows).
  const { data: old } = await service
    .from('grammar_refresh_runs').select('id').order('ran_at', { ascending: false }).range(300, 800)
  const oldIds = (old ?? []).map(r => r.id as number)
  if (oldIds.length) await service.from('grammar_refresh_runs').delete().in('id', oldIds)

  return { processed, added, remaining: queue.length, processedToday, nightlyTarget: NIGHTLY_TARGET, stopped, error, durationMs, moreTonight }
}
