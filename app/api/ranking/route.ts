export const dynamic = 'force-dynamic'

/**
 * GET /api/ranking
 *
 * Anonymous weekly ranking every logged-in student may see:
 *   • podium: top 3 by words that raised SRS level this week — counts only, NO names
 *   • total:  number of students who leveled up at least one word this week
 *   • you:    the caller's own { rank, count } (null if they leveled up nothing)
 *
 * Names are never exposed here (admin-only). Uses the service role internally to
 * read across all users, but only after verifying the caller is authenticated.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuthUser, adminJsonError, computeWeeklyRanking } from '@/lib/admin-server'

export async function GET(request: NextRequest) {
  try {
    const { userId, service } = await requireAuthUser(request)
    const ranking = await computeWeeklyRanking(service, 7)

    const podium = ranking.slice(0, 3).map((r, i) => ({ rank: i + 1, count: r.count }))
    const meIndex = ranking.findIndex(r => r.user_id === userId)
    const you = meIndex >= 0
      ? { rank: meIndex + 1, count: ranking[meIndex].count }
      : null

    return NextResponse.json({ podium, total: ranking.length, you })
  } catch (e) {
    return adminJsonError(e)
  }
}
