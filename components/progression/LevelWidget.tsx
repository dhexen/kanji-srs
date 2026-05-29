'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { xpProgressInLevel, estimateJlpt, JLPT_COLORS } from '@/lib/progression'

export default function LevelWidget() {
  const { state } = useStore()
  const { progression, db } = state

  const masteredVocab = db.filter(i => i.status === 'active' && (i.srsLevel ?? 0) >= 4).length
  // knownGrammar is tracked elsewhere; use 0 as fallback (widget still useful)
  const jlpt = estimateJlpt(masteredVocab, 0)
  const { current, needed, pct } = xpProgressInLevel(progression.total_xp)

  return (
    <Link
      href="/stats?tab=stats"
      className="mx-3 mb-2 block px-3 py-2.5 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-700 transition-colors group"
    >
      {/* Level row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-black text-violet-700 dark:text-violet-300 tabular-nums">
            Lv.{progression.total_level}
          </span>
          {jlpt && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${JLPT_COLORS[jlpt]}`}>
              ~{jlpt}
            </span>
          )}
        </div>
        <span className="text-[10px] text-violet-400 dark:text-violet-500 tabular-nums">
          {current}/{needed} XP
        </span>
      </div>

      {/* XP bar */}
      <div className="h-1.5 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Sub-levels */}
      <div className="flex items-center justify-between mt-1.5">
        <span className="text-[9px] text-slate-400 dark:text-slate-500">
          📚 Vocab Lv.{progression.vocab_level}
        </span>
        <span className="text-[9px] text-slate-400 dark:text-slate-500">
          📖 Gram. Lv.{progression.grammar_level}
        </span>
      </div>
    </Link>
  )
}
