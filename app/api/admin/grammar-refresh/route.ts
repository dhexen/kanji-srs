export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Admin monitor for the grammar refresh cron.
 *  GET  → current cycle state, recent run log, what's pending, errors, totals.
 *  POST { action: 'run' }    → run one refresh batch manually.
 *  POST { action: 'restart' } → reset the cycle (clear queue + today's counter).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'
import { runRefreshBatch, ALL_GRAMMAR, BY_ID, NIGHTLY_TARGET } from '@/lib/grammar-refresh-core'

export async function GET(req: NextRequest) {
  try {
    const { service } = await requireAdmin(req)

    const [stateRes, runsRes, errorsRes, countRes] = await Promise.all([
      service.from('grammar_refresh').select('*').eq('id', 1).maybeSingle(),
      service.from('grammar_refresh_runs').select('*').order('ran_at', { ascending: false }).limit(50),
      service.from('grammar_seed_errors').select('*').order('updated_at', { ascending: false }).limit(100),
      service.from('grammar_sentences').select('*', { count: 'exact', head: true }).eq('is_private', false),
    ])

    const state = stateRes.data
    const queue: string[] = Array.isArray(state?.queue) ? (state!.queue as string[]) : []
    const nameOf = (id: string) => { const g = BY_ID.get(id); return g ? { id, name: g.name_es, jlpt: g.jlpt, pattern: g.pattern } : { id, name: id, jlpt: '', pattern: '' } }

    const errors = (errorsRes.data ?? []).map((e: any) => ({ ...nameOf(e.grammar_id), error_msg: e.error_msg, is_permanent: e.is_permanent, updated_at: e.updated_at }))

    return NextResponse.json({
      total_points: ALL_GRAMMAR.length,
      nightly_target: NIGHTLY_TARGET,
      total_sentences: countRes.count ?? 0,
      state: {
        processed_today: state?.processed_today ?? 0,
        run_date: state?.run_date ?? null,
        remaining_in_cycle: queue.length,
        processed_in_cycle: ALL_GRAMMAR.length - queue.length,
        updated_at: state?.updated_at ?? null,
      },
      next_up: queue.slice(0, 40).map(nameOf),
      runs: runsRes.data ?? [],
      errors,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { adminId, service } = await requireAdmin(req)
    const { action } = await req.json().catch(() => ({})) as { action?: string }

    if (action === 'restart') {
      await service.from('grammar_refresh').upsert({ id: 1, queue: [], processed_today: 0, run_date: null, updated_at: new Date().toISOString() })
      return NextResponse.json({ ok: true })
    }

    if (action === 'run') {
      // Admin's Gemini key (settings → legacy → env), same resolution as the seed.
      const { data: settings } = await service.from('user_settings').select('gemini_api_key').eq('user_id', adminId).maybeSingle()
      let apiKey = settings?.gemini_api_key || ''
      if (!apiKey) {
        const { data: legacy } = await service.from('srs_progress').select('gemini_api_key').eq('user_id', adminId).maybeSingle()
        apiKey = legacy?.gemini_api_key || ''
      }
      apiKey = apiKey || process.env.GEMINI_API_KEY || ''
      if (!apiKey) return NextResponse.json({ error: 'No hay clave de Gemini configurada.' }, { status: 400 })

      const summary = await runRefreshBatch(service, apiKey, 'manual')
      return NextResponse.json({ ok: true, summary })
    }

    return NextResponse.json({ error: 'acción desconocida' }, { status: 400 })
  } catch (e) {
    return adminJsonError(e)
  }
}
