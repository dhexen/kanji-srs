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
      <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-indigo-100/90 text-xs">{t(lang, 'header_subtitle')}</p>
            <p className="text-indigo-200/70 text-[11px] mt-0.5 capitalize">{today}</p>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-sm px-4 py-3">
      <div className="max-w-5xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-100/90 text-xs">{t(lang, 'header_subtitle')}</p>
            <p className="text-indigo-200/70 text-[11px] mt-0.5 capitalize">{today}</p>
          </div>
        </div>

        <div data-tutorial-id="header-forecast" className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 space-y-3">

          {/* Sección de hoy con desglose por horas */}
          <div className="space-y-2">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-indigo-100 text-xs font-medium uppercase tracking-wide">
                  {t(lang, 'header_today')}
                </p>
                <p className="text-3xl sm:text-4xl font-bold tabular-nums leading-none mt-1">
                  {todayCount}
                </p>
              </div>
              {todayCount === 0 && (
                <span className="text-indigo-100 text-xs bg-white/10 px-2 py-1 rounded-lg">
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
                      className={`flex flex-col items-center px-2 py-1.5 rounded-lg text-xs min-w-[3rem] ${
                        h.isCurrent
                          ? 'bg-amber-400/30 border border-amber-300/50'
                          : 'bg-white/10 border border-white/10'
                      }`}
                    >
                      <span className={`tabular-nums font-medium ${h.isCurrent ? 'text-amber-200' : 'text-indigo-200'}`}>
                        {h.label}
                      </span>
                      <span className={`tabular-nums font-bold text-sm mt-0.5 ${h.isCurrent ? 'text-amber-100' : 'text-white'}`}>
                        +{h.due}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/15" />

          {/* Resto de la semana */}
          <div>
            <p className="text-indigo-100 text-xs font-medium mb-2">{t(lang, 'header_forecast')}</p>
            <div className="overflow-x-auto no-scrollbar -mx-1 px-1">
              <div className="flex gap-3 min-w-max">
                {futureDays.map(day => (
                  <div
                    key={day.date.toISOString()}
                    className="flex flex-col items-center min-w-[2.5rem]"
                  >
                    <span className="text-indigo-200/90 text-xs font-medium capitalize">
                      {day.dayLabel}
                    </span>
                    <span className={`text-xs font-bold tabular-nums mt-0.5 ${
                      day.newDue > 0 ? 'text-white' : 'text-indigo-300/40'
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
