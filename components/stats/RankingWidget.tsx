'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface RankingData {
  podium: Array<{ rank: number; count: number }>
  total: number
  you: { rank: number; count: number } | null
}

const MEDALS = ['🥇', '🥈', '🥉']

/**
 * Anonymous weekly ranking for students: podium (counts only, no names) plus
 * their own position. Names are never shown here — only the admin panel sees them.
 */
export default function RankingWidget() {
  const [data, setData] = useState<RankingData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { if (alive) setLoading(false); return }
        const res = await fetch('/api/ranking', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok) { if (alive) setLoading(false); return }
        const json = await res.json() as RankingData
        if (alive) setData(json)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  if (loading) return null
  if (!data || data.total === 0) return null

  const pct = data.you && data.total > 1
    ? Math.round((data.you.rank / data.total) * 100)
    : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 space-y-4">
      <div>
        <h3 className="font-bold text-slate-800 dark:text-slate-100">🏆 Ranking semanal</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Palabras que subieron de nivel SRS en los últimos 7 días · {data.total} participante{data.total === 1 ? '' : 's'}
        </p>
      </div>

      {/* Podium — anonymous, counts only */}
      <ol className="space-y-2">
        {data.podium.map(p => {
          const mine = data.you?.rank === p.rank
          return (
            <li
              key={p.rank}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                mine
                  ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40'
                  : 'bg-slate-50 dark:bg-slate-700/40'
              }`}
            >
              <span className="text-xl w-7 text-center">{MEDALS[p.rank - 1]}</span>
              <span className="flex-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                {mine ? 'Tú' : `Alumno anónimo`}
              </span>
              <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">{p.count}</span>
            </li>
          )
        })}
      </ol>

      {/* Your position (if not already on the podium) */}
      {data.you ? (
        (data.you.rank > 3) && (
          <div className="flex items-center gap-3 rounded-xl px-3 py-2 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40">
            <span className="text-sm w-7 text-center font-bold text-violet-600 dark:text-violet-400">#{data.you.rank}</span>
            <span className="flex-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
              Tu puesto{pct != null ? ` · top ${pct}%` : ''}
            </span>
            <span className="font-bold text-violet-600 dark:text-violet-400 tabular-nums">{data.you.count}</span>
          </div>
        )
      ) : (
        <p className="text-xs text-slate-400 text-center">
          Aún no has subido de nivel ninguna palabra esta semana. ¡Haz repasos para entrar en el ranking!
        </p>
      )}
    </div>
  )
}
