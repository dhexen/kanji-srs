/**
 * POST /api/admin/vocab/reset-all
 *
 * Full vocabulary reset:
 *  1. Deletes ALL rows from vocabulary
 *  2. Deletes all user SRS vocab progress
 *  3. Clears SRS review log and progress snapshots
 *  4. Clears vocab_antonyms, vocab_image_votes, vocab_reports
 *  5. Resets vocab_xp / vocab_level in user_progression (keeps grammar XP)
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const CONFIRM_TOKEN = 'RESET_ALL_VOCABULARY'

async function deleteAll(
  service: any,
  table: string,
  filter: { col: string; op: 'gte' | 'neq' | 'gt'; val: unknown },
): Promise<number> {
  let q = service.from(table).delete()
  if (filter.op === 'gte')      q = q.gte(filter.col, filter.val)
  else if (filter.op === 'gt')  q = q.gt(filter.col, filter.val)
  else                          q = q.neq(filter.col, filter.val)

  const { error, count } = await q.select()
  if (error) throw new AdminApiError(`Error borrando ${table}: ${error.message}`, 500)
  return count ?? 0
}

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.confirm !== CONFIRM_TOKEN) {
      throw new AdminApiError(`Falta el token de confirmación.`, 400)
    }

    const results: Record<string, number | string> = {}

    // 1. Vocabulary (delete all rows)
    const { error: vocabErr, count: vocabCount } = await service
      .from('vocabulary').delete().neq('word', '').select()
    if (vocabErr) throw new AdminApiError(`vocabulary: ${vocabErr.message}`, 500)
    results.vocabulary = vocabCount ?? 0

    // 2. User SRS vocab progress
    const { error: uvpErr, count: uvpCount } = await service
      .from('user_vocab_progress').delete().neq('jp', '').select()
    if (uvpErr) throw new AdminApiError(`user_vocab_progress: ${uvpErr.message}`, 500)
    results.user_vocab_progress = uvpCount ?? 0

    // 3. SRS review log
    const { error: logErr, count: logCount } = await service
      .from('srs_review_log').delete().gte('id', 1).select()
    if (logErr) console.warn('srs_review_log:', logErr.message)
    else results.srs_review_log = logCount ?? 0

    // 4. Progress snapshots
    const { error: snapsErr, count: snapsCount } = await service
      .from('srs_progress_snapshots').delete().gte('id', 1).select()
    if (snapsErr) console.warn('srs_progress_snapshots:', snapsErr.message)
    else results.srs_progress_snapshots = snapsCount ?? 0

    // 5. Antonym pairs
    const { error: antErr, count: antCount } = await service
      .from('vocab_antonyms').delete().gte('id', 1).select()
    if (antErr) console.warn('vocab_antonyms:', antErr.message)
    else results.vocab_antonyms = antCount ?? 0

    // 6. Image votes
    const { error: votesErr, count: votesCount } = await service
      .from('vocab_image_votes').delete().neq('word', '\x00').select()
    if (votesErr) console.warn('vocab_image_votes:', votesErr.message)
    else results.vocab_image_votes = votesCount ?? 0

    // 7. Vocab reports
    const { error: repErr, count: repCount } = await service
      .from('vocab_reports').delete().gte('id', 1).select()
    if (repErr) console.warn('vocab_reports:', repErr.message)
    else results.vocab_reports = repCount ?? 0

    // 8. Reset vocab XP — keep grammar XP, recalculate total
    // Fetch all rows first to compute new total_xp and total_level per user
    const { data: progressRows, error: fetchProgErr } = await service
      .from('user_progression')
      .select('user_id, grammar_xp, grammar_level')
    if (fetchProgErr) throw new AdminApiError(`user_progression fetch: ${fetchProgErr.message}`, 500)

    // xpForLevel(n) = floor(150 * (n-1)^1.75)
    // Thresholds: L1=0, L2=150, L3=504, L4=1026, L5=1697, L6=2510, L7=3454, L8=4519
    function levelFromXp(xp: number): number {
      const thresholds = [0, 150, 504, 1026, 1697, 2510, 3454, 4519, 5697, 6972]
      let level = 1
      for (let i = 1; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) level = i + 1
        else break
      }
      return level
    }

    let progCount = 0
    for (const row of progressRows ?? []) {
      const newTotalXp = Math.floor((row.grammar_xp ?? 0) * 1.5)
      const newTotalLevel = levelFromXp(newTotalXp)
      const { error: updateErr } = await service
        .from('user_progression')
        .update({
          vocab_xp:    0,
          vocab_level: 1,
          total_xp:    newTotalXp,
          total_level: newTotalLevel,
        })
        .eq('user_id', row.user_id)
      if (updateErr) console.warn(`user_progression update ${row.user_id}:`, updateErr.message)
      else progCount++
    }
    results.user_progression_reset = progCount

    return NextResponse.json({
      ok: true,
      results,
      message: 'Reset completo realizado. Ya puedes reimportar los CSVs.',
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
