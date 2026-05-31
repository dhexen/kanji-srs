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

    // 8. Reset vocab XP — keep grammar XP
    //    total_xp = floor(grammar_xp * 1.5) since grammar contributes 1.5x
    const { error: progErr, count: progCount } = await service
      .from('user_progression')
      .update({ vocab_xp: 0, vocab_level: 1 })
      .gte('vocab_xp', 0)
      .select()
    if (progErr) throw new AdminApiError(`user_progression: ${progErr.message}`, 500)
    results.user_progression_reset = progCount ?? 0

    return NextResponse.json({
      ok: true,
      results,
      message: 'Reset completo realizado. Ya puedes reimportar los CSVs.',
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
