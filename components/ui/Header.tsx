'use client'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import { getReviewForecast, getHourlyForecast } from '@/lib/srs'

export default function Header() {
  const { state } = useStore()
  const lang = state.lang
  const localeTag = lang === 'ja' ? 'ja-JP' : lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES'

  const today = new Date().toLocaleDateString(localeTag, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const forecast = useMemo(
    () => getReviewForecast(state.db, lang, 7),
    [state.db, lang],
  )

  const hourlyForecast = useMemo(
    () => getHourlyForecast(state.db),
    [state.db],
  )

  const todayCount = forecast[0]?.newDue ?? 0
  const futureDays = forecast.slice(1)
  const hasActive = state.db.some(i => i.status === 'active')

  if (!hasActive) {
    return (
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-violet-100/80 dark:border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-violet-500/80 text-xs font-medium">{t(lang, 'header_subtitle')}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 capitalize">{today}</p>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-violet-100/80 dark:border-slate-800 px-4 py-3 shadow-[0_2px_12px_rgba(139,92,246,0.05)]">
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-violet-500/80 text-xs font-medium">{t(lang, 'header_subtitle')}</p>
            <p className="text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 capitalize">{today}</p>
          </div>
        </div>

        <div
          data-tutorial-id="header-forecast"
          className="bg-gradient-to-br from-violet-50 via-pink-50/60 to-rose-50/40 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-violet-100/80 dark:border-slate-700 rounded-2xl p-3 sm:p-4 space-y-3"
        >
          {/* Today + hourly breakdown */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-violet-500 text-xs font-semibold uppercase tracking-wide">
                  {t(lang, 'header_today')}
                </p>
                <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-none mt-1 text-violet-700">
                  {todayCount}
                </p>
              </div>
              {todayCount === 0 && (
                <span className="text-violet-500 text-xs bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-xl">
                  {t(lang, 'header_no_reviews')}
                </span>
              )}
            </div>

            {hourlyForecast.length > 0 && (
              <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
                <div className="flex gap-1.5 min-w-max pb-0.5">
                  {hourlyForecast.map(h => (
                    <div
                      key={h.hour}
                      className={`flex flex-col items-center px-2 py-1.5 rounded-xl text-xs min-w-[3rem] transition-all ${
                        h.isCurrent
                          ? 'bg-violet-100 dark:bg-violet-900/30 border border-violet-200/80 dark:border-violet-700/40 shadow-sm'
                          : 'bg-white/60 dark:bg-slate-700/40 border border-violet-100/60 dark:border-slate-600/40'
                      }`}
                    >
                      <span className={`tabular-nums font-medium ${h.isCurrent ? 'text-violet-600' : 'text-slate-400'}`}>
                        {h.label}
                      </span>
                      <span className={`tabular-nums font-bold text-sm mt-0.5 ${h.isCurrent ? 'text-violet-700' : 'text-slate-600'}`}>
                        +{h.due}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-violet-100/80 dark:border-slate-700" />

          {/* Week forecast */}
          <div>
            <p className="text-violet-500 text-xs font-semibold mb-2">{t(lang, 'header_forecast')}</p>
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="flex gap-3 min-w-max">
                {futureDays.map(day => (
                  <div
                    key={day.date.toISOString()}
                    className="flex flex-col items-center min-w-[2.5rem]"
                  >
                    <span className="text-slate-400 text-xs font-medium capitalize">
                      {day.dayLabel}
                    </span>
                    <span className={`text-xs font-bold tabular-nums mt-0.5 ${
                      day.newDue > 0 ? 'text-violet-600' : 'text-slate-300'
                    }`}>
                      {day.newDue > 0 ? `+${day.newDue}` : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
