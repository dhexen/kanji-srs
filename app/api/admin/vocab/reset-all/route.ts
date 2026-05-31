/**
 * POST /api/admin/vocab/reset-all
 *
 * Full vocabulary reset:
 *  1. Deletes ALL rows from the shared vocabulary table
 *  2. Deletes all user SRS vocab progress (user_vocab_progress)
 *  3. Clears SRS review log and progress snapshots
 *  4. Clears vocab_antonyms
 *  5. Resets vocab_xp / vocab_level in user_progression (keeps grammar XP)
 *
 * Admin-only. Requires confirmation token in body.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError } from '@/lib/admin-server'

const CONFIRM_TOKEN = 'RESET_ALL_VOCABULARY'

export async function POST(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)

    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    if (body.confirm !== CONFIRM_TOKEN) {
      throw new AdminApiError(`Falta el token de confirmación. Envía { "confirm": "${CONFIRM_TOKEN}" }`, 400)
    }

    // 1. Delete all vocabulary
    const { error: vocabErr } = await service.from('vocabulary').delete().neq('word', '__never__')
    if (vocabErr) throw new AdminApiError(`vocabulary: ${vocabErr.message}`, 500)

    // 2. Delete all user SRS vocab progress
    const { error: progressErr } = await service.from('user_vocab_progress').delete().neq('jp', '__never__')
    if (progressErr) throw new AdminApiError(`user_vocab_progress: ${progressErr.message}`, 500)

    // 3. Clear SRS review log
    const { error: logErr } = await service.from('srs_review_log').delete().neq('id', -1)
    if (logErr) console.warn('srs_review_log delete:', logErr.message)

    // 4. Clear progress snapshots
    const { error: snapsErr } = await service.from('srs_progress_snapshots').delete().neq('id', -1)
    if (snapsErr) console.warn('srs_progress_snapshots delete:', snapsErr.message)

    // 5. Clear antonym pairs
    const { error: antErr } = await service.from('vocab_antonyms').delete().neq('id', -1)
    if (antErr) console.warn('vocab_antonyms delete:', antErr.message)

    // 6. Clear image votes
    const { error: votesErr } = await service.from('vocab_image_votes').delete().neq('word', '__never__')
    if (votesErr) console.warn('vocab_image_votes delete:', votesErr.message)

    // 7. Clear vocab reports
    const { error: reportsErr } = await service.from('vocab_reports').delete().neq('id', '__never__')
    if (reportsErr) console.warn('vocab_reports delete:', reportsErr.message)

    // 9. Reset vocab XP — keep grammar XP, recalculate total
    //    total_xp = floor(grammar_xp * 1.5)  (grammar contributes 1.5x to total)
    //    total_level derived from new total_xp using the app's XP curve:
    //    xpForLevel(n) = floor(150 * (n-1)^1.75)
    //    L2=150, L3=504, L4=1025, L5=1697, L6=2510, L7=3454, L8=4519, L9=5697...
    const { error: progErr } = await service.rpc('reset_vocab_progression')

    if (progErr) {
      // Fallback: direct UPDATE if the RPC doesn't exist
      const { error: updateErr } = await service.from('user_progression').update({
        vocab_xp:    0,
        vocab_level: 1,
      }).neq('user_id', '00000000-0000-0000-0000-000000000000')

      if (updateErr) console.warn('user_progression reset:', updateErr.message)
    }

    return NextResponse.json({
      ok: true,
      message: 'Reset completo: vocabulario, progreso SRS, contrarios y XP de vocab eliminados.',
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
