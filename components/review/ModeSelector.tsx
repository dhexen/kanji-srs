'use client'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode } from '@/lib/srs'
import { t } from '@/lib/i18n'

interface Props {
  selectedModes: ReviewMode[]
  onToggle: (m: ReviewMode) => void
  pendingCount: number
  onStart: () => void
  hasWords: boolean
  isStarting?: boolean
}

const MODE_PASTEL: Record<ReviewMode, {
  bgInactive: string; bgActive: string;
  text: string; textActive: string;
  ring: string; dot: string; dotInactive: string;
}> = {
  multi:   { bgInactive: 'bg-slate-50 dark:bg-slate-700/60',          bgActive: 'bg-violet-100 dark:bg-violet-900/40',  text: 'text-slate-500 dark:text-slate-400', textActive: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-200 dark:ring-violet-700',  dot: 'bg-violet-400',  dotInactive: 'bg-slate-300 dark:bg-slate-500' },
  meaning: { bgInactive: 'bg-slate-50 dark:bg-slate-700/60',          bgActive: 'bg-purple-100 dark:bg-purple-900/40',  text: 'text-slate-500 dark:text-slate-400', textActive: 'text-purple-700 dark:text-purple-300', ring: 'ring-purple-200 dark:ring-purple-700',  dot: 'bg-purple-400', dotInactive: 'bg-slate-300 dark:bg-slate-500' },
  kanji:   { bgInactive: 'bg-slate-50 dark:bg-slate-700/60',          bgActive: 'bg-amber-100 dark:bg-amber-900/40',   text: 'text-slate-500 dark:text-slate-400', textActive: 'text-amber-700 dark:text-amber-300',  ring: 'ring-amber-200 dark:ring-amber-700',   dot: 'bg-amber-400',  dotInactive: 'bg-slate-300 dark:bg-slate-500' },
  reading: { bgInactive: 'bg-slate-50 dark:bg-slate-700/60',          bgActive: 'bg-pink-100 dark:bg-pink-900/40',     text: 'text-slate-500 dark:text-slate-400', textActive: 'text-pink-700 dark:text-pink-300',   ring: 'ring-pink-200 dark:ring-pink-700',    dot: 'bg-pink-400',   dotInactive: 'bg-slate-300 dark:bg-slate-500' },
  reverse: { bgInactive: 'bg-slate-50 dark:bg-slate-700/60',          bgActive: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-slate-500 dark:text-slate-400', textActive: 'text-emerald-700 dark:text-emerald-300', ring: 'ring-emerald-200 dark:ring-emerald-700', dot: 'bg-emerald-400', dotInactive: 'bg-slate-300 dark:bg-slate-500' },
}

export default function ModeSelector({
  selectedModes, onToggle, pendingCount, onStart, hasWords, isStarting = false,
}: Props) {
  const { state } = useStore()
  const lang = state.lang
  const modes = Object.entries(MODE_CONFIG) as [ReviewMode, typeof MODE_CONFIG[ReviewMode]][]
  const noModesSelected = selectedModes.length === 0
  const startDisabled = !hasWords || noModesSelected || isStarting

  return (
    <div data-tutorial-id="review-mode-selector" className="space-y-3">

      {/* ── Single unified card ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-violet-100/80 dark:border-slate-700 shadow-sm overflow-hidden">

        {/* Top gradient area: title + counter + start button */}
        <div className="bg-gradient-to-br from-violet-100 via-pink-50/60 to-rose-50/40 dark:from-violet-900/40 dark:via-slate-800 dark:to-slate-800 p-5">
          {/* Title row */}
          <div className="flex items-center gap-1.5 mb-3">
            <h3 className="font-bold text-violet-700 dark:text-violet-300 text-base">
              {t(lang, 'review_title')}
            </h3>
          </div>

          {/* Pending count + Start */}
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold text-violet-500 dark:text-violet-400 uppercase tracking-wide mb-0.5">
                {pendingCount > 0 ? t(lang, 'review_pending') : t(lang, 'review_uptodate')}
              </p>
              <p className="text-4xl font-bold tabular-nums text-violet-700 dark:text-violet-300 leading-none">
                {pendingCount}
              </p>
            </div>
            <button
              onClick={onStart}
              disabled={startDisabled}
              title={noModesSelected ? t(lang, 'review_no_modes_selected') : undefined}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition shadow-sm active:scale-95"
            >
              {isStarting ? '⏳' : t(lang, 'review_start')}
              {!isStarting && (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Bottom white area: mode toggles */}
        <div className="bg-white dark:bg-slate-800 border-t border-violet-100/60 dark:border-slate-700 p-3">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 px-1">
            {t(lang, 'review_subtitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {modes.map(([id, cfg]) => {
              const active = selectedModes.includes(id)
              const p = MODE_PASTEL[id]
              return (
                <button
                  key={id}
                  onClick={() => onToggle(id)}
                  className={[
                    'relative rounded-xl p-2.5 text-left transition-all border-2 active:scale-95 flex flex-col gap-0.5',
                    active
                      ? `${p.bgActive} ${p.textActive} border-transparent ring-2 ${p.ring} shadow-sm`
                      : `${p.bgInactive} ${p.text} border-transparent hover:border-violet-100 dark:hover:border-violet-800`,
                  ].join(' ')}
                >
                  <span className={`absolute top-2 right-2 w-1.5 h-1.5 rounded-full transition-all ${
                    active ? `${p.dot} scale-100` : `${p.dotInactive} scale-90`
                  }`} />
                  <span className="text-xs font-semibold leading-tight">{t(lang, cfg.label_key)}</span>
                  <span className="text-[10px] opacity-60 leading-snug">{t(lang, cfg.desc_key)}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {noModesSelected && (
        <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/30 rounded-xl px-4 py-3 flex items-center gap-2">
          <span>⚠️</span>
          {t(lang, 'review_no_modes_selected')}
        </p>
      )}
      {!hasWords && (
        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl px-4 py-3">
          {t(lang, 'review_no_words')}
        </p>
      )}
    </div>
  )
}
