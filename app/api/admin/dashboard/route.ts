export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/dashboard
 *
 * Aggregates everything the admin landing needs in one round-trip:
 *   • kpis:      { registered, active7d }               — user growth / usage
 *   • attention: { feedback, vocab, grammar, total }    — open reports (badge)
 *   • ranking:   [{ user_id, email, count }]            — weekly SRS level-ups (names, admin-only)
 *   • toolRuns:  { [tool_key]: { last_run_at, by } }    — last execution per tool
 *
 * Missing tables degrade gracefully to zeros / empty.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, computeWeeklyRanking } from '@/lib/admin-server'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    // --- users: registered + active in last 7 days ------------------------
    const { data: listData } = await service.auth.admin.listUsers({ perPage: 1000 })
    const users = listData?.users ?? []
    const registered = users.length
    const emailById = new Map(users.map(u => [u.id, u.email ?? '']))

    const { data: roleRows } = await service
      .from('user_roles')
      .select('user_id, last_seen_at')
    const lastSeenById = new Map((roleRows ?? []).map(r => [r.user_id, r.last_seen_at as string | null]))

    const cutoff = Date.now() - WEEK_MS
    const active7d = users.filter(u => {
      const seen = lastSeenById.get(u.id) ?? u.last_sign_in_at ?? null
      return seen ? new Date(seen).getTime() >= cutoff : false
    }).length

    // --- attention: open reports -----------------------------------------
    const [fb, vr, gr] = await Promise.all([
      service.from('feedback_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      service.from('vocab_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      service.from('grammar_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    ])
    const feedback = fb.error ? 0 : (fb.count ?? 0)
    const vocab    = vr.error ? 0 : (vr.count ?? 0)
    const grammar  = gr.error ? 0 : (gr.count ?? 0)

    // --- weekly ranking (with names, admin only) --------------------------
    const rawRanking = await computeWeeklyRanking(service, 7)
    const ranking = rawRanking.slice(0, 10).map(r => ({
      user_id: r.user_id,
      email: emailById.get(r.user_id) ?? '—',
      count: r.count,
    }))

    // --- tool last-run timestamps ----------------------------------------
    const toolRuns: Record<string, { last_run_at: string; by: string | null }> = {}
    const { data: runRows } = await service
      .from('admin_tool_runs')
      .select('tool_key, last_run_at, last_run_by')
    for (const row of runRows ?? []) {
      toolRuns[row.tool_key] = {
        last_run_at: row.last_run_at,
        by: row.last_run_by ? (emailById.get(row.last_run_by) ?? null) : null,
      }
    }

    return NextResponse.json({
      kpis: { registered, active7d },
      attention: { feedback, vocab, grammar, total: feedback + vocab + grammar },
      ranking,
      toolRuns,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
