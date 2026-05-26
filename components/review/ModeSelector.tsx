'use client'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode } from '@/lib/srs'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'

interface Props {
  selectedModes: ReviewMode[]
  onToggle: (m: ReviewMode) => void
  pendingCount: number
  onStart: (practice: boolean) => void
  hasWords: boolean
}

// Pastel accent per mode (replaces the hard colorOn/colorOff from MODE_CONFIG for the bento grid)
const MODE_PASTEL: Record<ReviewMode, { bg: string; bgActive: string; text: string; textActive: string; ring: string; dot: string }> = {
  multi:   { bg: 'bg-white',          bgActive: 'bg-violet-100',  text: 'text-slate-500', textActive: 'text-violet-700', ring: 'ring-violet-200',  dot: 'bg-violet-400' },
  meaning: { bg: 'bg-white',          bgActive: 'bg-purple-100',  text: 'text-slate-500', textActive: 'text-purple-700', ring: 'ring-purple-200',  dot: 'bg-purple-400' },
  kanji:   { bg: 'bg-white',          bgActive: 'bg-amber-100',   text: 'text-slate-500', textActive: 'text-amber-700',  ring: 'ring-amber-200',   dot: 'bg-amber-400'  },
  reading: { bg: 'bg-white',          bgActive: 'bg-pink-100',    text: 'text-slate-500', textActive: 'text-pink-700',   ring: 'ring-pink-200',    dot: 'bg-pink-400'   },
  reverse: { bg: 'bg-white',          bgActive: 'bg-emerald-100', text: 'text-slate-500', textActive: 'text-emerald-700',ring: 'ring-emerald-200', dot: 'bg-emerald-400'},
}

export default function ModeSelector({ selectedModes, onToggle, pendingCount, onStart, hasWords }: Props) {
  const { state } = useStore()
  const lang = state.lang
  const modes = Object.entries(MODE_CONFIG) as [ReviewMode, typeof MODE_CONFIG[ReviewMode]][]
  const noModesSelected = selectedModes.length === 0

  return (
    <div data-tutorial-id="review-mode-selector" className="space-y-3">

      {/* ── Bento grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">

        {/* ── Hero card: pending count + start CTA (spans 2 cols on md+) ── */}
        <div className="col-span-2 md:col-span-2 bg-gradient-to-br from-violet-100 via-pink-50 to-rose-50 rounded-2xl p-5 border border-violet-100/80 shadow-sm flex flex-col justify-between min-h-[140px]">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <h3 className="font-bold text-violet-700 text-base">{t(lang, 'review_title')}</h3>
                <SectionHelp section="review" lang={lang} />
              </div>
              <p className="text-slate-500 text-xs">{t(lang, 'review_subtitle')}</p>
            </div>
          </div>

          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-[11px] font-semibold text-violet-500 uppercase tracking-wide mb-0.5">
                {pendingCount > 0 ? t(lang, 'review_pending') : t(lang, 'review_uptodate')}
              </p>
              <p className="text-4xl font-bold tabular-nums text-violet-700 leading-none">
                {pendingCount}
              </p>
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button
                onClick={() => onStart(false)}
                disabled={!hasWords || noModesSelected}
                title={noModesSelected ? t(lang, 'review_no_modes_selected') : undefined}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition shadow-sm shadow-violet-200 active:scale-95"
              >
                {t(lang, 'review_start')}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* ── Practice card (1 col) ── */}
        <div className="col-span-2 md:col-span-1 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between min-h-[100px] md:min-h-[140px]">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">🎯 {t(lang, 'review_free')}</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Practica sin penalización en el SRS
            </p>
          </div>
          <button
            onClick={() => onStart(true)}
            disabled={!hasWords || noModesSelected}
            title={noModesSelected ? t(lang, 'review_no_modes_selected') : undefined}
            className="mt-3 w-full py-2 bg-slate-50 hover:bg-violet-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 hover:text-violet-600 font-semibold rounded-xl text-sm transition border border-slate-200 hover:border-violet-200 active:scale-95"
          >
            {t(lang, 'review_free')}
          </button>
        </div>

        {/* ── Mode toggle cards (5 modes, flowing grid) ── */}
        {modes.map(([id, cfg]) => {
          const active = selectedModes.includes(id)
          const p = MODE_PASTEL[id]
          return (
            <button
              key={id}
              onClick={() => onToggle(id)}
              className={[
                'relative rounded-2xl p-4 text-left transition-all border-2 active:scale-95',
                'flex flex-col gap-1',
                active
                  ? `${p.bgActive} ${p.textActive} border-transparent ring-2 ${p.ring} shadow-sm`
                  : `${p.bg} ${p.text} border-slate-100 hover:border-violet-100 hover:${p.bgActive}`,
              ].join(' ')}
            >
              {/* Active indicator dot */}
              <span
                className={`absolute top-3 right-3 w-2 h-2 rounded-full transition-all ${
                  active ? `${p.dot} scale-100` : 'bg-slate-200 scale-75'
                }`}
              />
              <span className="text-lg">{cfg.label}</span>
              <span className="text-sm font-semibold leading-tight">{t(lang, cfg.label_key)}</span>
              <span className="text-xs opacity-70 leading-relaxed">{t(lang, cfg.desc_key)}</span>
            </button>
          )
        })}
      </div>

      {/* ── No modes selected warning ── */}
      {noModesSelected && (
        <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 flex items-center gap-2">
          <span>⚠️</span>
          {t(lang, 'review_no_modes_selected')}
        </p>
      )}

      {/* ── No words warning ── */}
      {!hasWords && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
          {t(lang, 'review_no_words')}
        </p>
      )}
    </div>
  )
}
