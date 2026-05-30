'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { xpProgressInLevel, estimateJlpt, JLPT_COLORS } from '@/lib/progression'

export default function LevelWidget() {
  const { state } = useStore()
  const { progression, db } = state
  const pathname = usePathname()

  const isGrammar = pathname?.startsWith('/grammar')
  const isVocab   = pathname?.startsWith('/vocabulary') || pathname?.startsWith('/review')

  const masteredVocab = db.filter(i => i.status === 'active' && (i.srsLevel ?? 0) >= 4).length
  const jlpt = estimateJlpt(masteredVocab, 0)

  const activeXp    = isGrammar ? progression.grammar_xp : isVocab ? progression.vocab_xp : progression.total_xp
  const activeLevel = isGrammar ? progression.grammar_level : isVocab ? progression.vocab_level : progression.total_level
  const { current, needed, pct } = xpProgressInLevel(activeXp)

  const barColor = isGrammar
    ? 'from-emerald-500 to-teal-500'
    : isVocab
      ? 'from-amber-500 to-orange-500'
      : 'from-violet-500 to-indigo-500'

  const bgColor = isGrammar
    ? 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-100 dark:border-emerald-800/40 hover:border-emerald-300 dark:hover:border-emerald-700'
    : isVocab
      ? 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-100 dark:border-amber-800/40 hover:border-amber-300 dark:hover:border-amber-700'
      : 'from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border-violet-100 dark:border-violet-800/40 hover:border-violet-300 dark:hover:border-violet-700'

  const levelColor = isGrammar
    ? 'text-emerald-700 dark:text-emerald-300'
    : isVocab
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-violet-700 dark:text-violet-300'

  const xpColor = isGrammar
    ? 'text-emerald-400 dark:text-emerald-500'
    : isVocab
      ? 'text-amber-400 dark:text-amber-500'
      : 'text-violet-400 dark:text-violet-500'

  const label = isGrammar ? '📖 Gram.' : isVocab ? '📚 Vocab' : '⭐ Total'

  return (
    <Link
      href="/stats?tab=stats"
      className={`mx-3 mb-2 block px-3 py-2.5 rounded-xl bg-gradient-to-br border transition-colors group ${bgColor}`}
    >
      {/* Level row */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className={`text-[9px] font-semibold ${xpColor}`}>{label}</span>
          <span className={`text-xs font-black tabular-nums ${levelColor}`}>
            Lv.{activeLevel}
          </span>
          {!isGrammar && !isVocab && jlpt && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${JLPT_COLORS[jlpt]}`}>
              ~{jlpt}
            </span>
          )}
        </div>
        <span className={`text-[10px] tabular-nums ${xpColor}`}>
          {current}/{needed} XP
        </span>
      </div>

      {/* XP bar */}
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700`}
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
