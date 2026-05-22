'use client'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode } from '@/lib/srs'
import { t } from '@/lib/i18n'

interface Props {
  selectedModes: ReviewMode[]
  onToggle: (m: ReviewMode) => void
  pendingCount: number
  onStart: (practice: boolean) => void
  hasWords: boolean
}

export default function ModeSelector({ selectedModes, onToggle, pendingCount, onStart, hasWords }: Props) {
  const { state } = useStore()
  const lang = state.lang

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h3 className="font-bold text-slate-800 mb-1">{t(lang, 'review_title')}</h3>
        <p className="text-slate-400 text-xs mb-4">{t(lang, 'review_subtitle')}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
          {(Object.entries(MODE_CONFIG) as [ReviewMode, typeof MODE_CONFIG[ReviewMode]][]).map(([id, cfg]) => {
            const active = selectedModes.includes(id)
            return (
              <button key={id} onClick={() => onToggle(id)}
                className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${active ? cfg.colorOn : cfg.colorOff}`}>
                <span>{cfg.label}</span>
                <span className="text-xs font-normal opacity-70">{cfg.desc}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
          <button onClick={() => onStart(false)} disabled={!hasWords}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition shadow-sm">
            {t(lang, 'review_start')}
            <span className="ml-2 opacity-70 font-normal">
              {pendingCount > 0 ? `(${pendingCount} ${t(lang, 'review_pending')})` : `(${t(lang, 'review_uptodate')})`}
            </span>
          </button>
          <button onClick={() => onStart(true)} disabled={!hasWords}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-600 font-bold rounded-xl text-sm transition">
            {t(lang, 'review_free')}
          </button>
        </div>
        {!hasWords && (
          <p className="mt-3 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {t(lang, 'review_no_words')}
          </p>
        )}
      </div>
    </div>
  )
}
