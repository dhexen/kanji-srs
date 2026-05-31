/**
 * POST /api/admin/vocab/reset-all
 *
 * Full vocabulary reset:
 *  1. Deletes ALL rows from vocabulary
 *  2. Deletes all user SRS vocab progress
 *  3. Clears SRS review log and progress snapshots
 *  4. Clears vocab_antonyms, vocab_image_votes, vocab_reports
 *  5. Resets vocab_xp / vocab_level / total_xp / total_level in user_progression
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const CONFIRM_TOKEN = 'RESET_ALL_VOCABULARY'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function del(service: any, table: string, col: string, val: unknown, op: 'neq' | 'gte' | 'gt' = 'neq') {
  const q = service.from(table).delete()
  const filtered = op === 'gte' ? q.gte(col, val) : op === 'gt' ? q.gt(col, val) : q.neq(col, val)
  const { error } = await filtered
  if (error) throw new AdminApiError(`${table}: ${error.message}`, 500)
}

function levelFromXp(xp: number): number {
  const thresholds = [0, 150, 504, 1026, 1697, 2510, 3454, 4519, 5697, 6972]
  let level = 1
  for (let i = 1; i < thresholds.length; i++) {
    if (xp >= thresholds[i]) level = i + 1
    else break
  }
  return level
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.confirm !== CONFIRM_TOKEN) {
      throw new AdminApiError('Falta el token de confirmación.', 400)
    }

    // 1. Vocabulary
    await del(service, 'vocabulary', 'word', '')

    // 2. User SRS vocab progress
    await del(service, 'user_vocab_progress', 'jp', '')

    // 3. SRS review log (ignore errors — append-only policy)
    try { await del(service, 'srs_review_log', 'id', 0, 'gte') } catch { /* ok */ }

    // 4. Progress snapshots
    try { await del(service, 'srs_progress_snapshots', 'id', 0, 'gte') } catch { /* ok */ }

    // 5. Antonym pairs
    try { await del(service, 'vocab_antonyms', 'id', 0, 'gte') } catch { /* ok */ }

    // 6. Image votes
    try { await del(service, 'vocab_image_votes', 'word', '') } catch { /* ok */ }

    // 7. Vocab reports
    try { await del(service, 'vocab_reports', 'id', 0, 'gte') } catch { /* ok */ }

    // 8. Reset user_progression: vocab_xp=0, vocab_level=1, recalculate total from grammar
    const { data: rows, error: fetchErr } = await service
      .from('user_progression')
      .select('user_id, grammar_xp')
    if (fetchErr) throw new AdminApiError(`user_progression fetch: ${fetchErr.message}`, 500)

    let usersReset = 0
    for (const row of (rows ?? []) as Array<{ user_id: string; grammar_xp: number }>) {
      const newTotalXp    = Math.floor((row.grammar_xp ?? 0) * 1.5)
      const newTotalLevel = levelFromXp(newTotalXp)
      const { error } = await service.from('user_progression').update({
        vocab_xp:    0,
        vocab_level: 1,
        total_xp:    newTotalXp,
        total_level: newTotalLevel,
      }).eq('user_id', row.user_id)
      if (error) console.warn('user_progression update:', error.message)
      else usersReset++
    }

    return NextResponse.json({
      ok: true,
      results: { users_reset: usersReset },
      message: `Reset completo. ${usersReset} usuario(s) reseteados. Ya puedes reimportar los CSVs.`,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
