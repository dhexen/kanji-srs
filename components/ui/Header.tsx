'use client'
import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import { getReviewForecast } from '@/lib/srs'

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

  const todayCount = forecast[0]?.newDue ?? 0
  const hasActive = state.db.some(i => i.status === 'active')

  // Don't render the forecast banner if no active words
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

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl p-3 sm:p-4 space-y-3">
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

          <div>
            <p className="text-indigo-100 text-xs font-medium mb-2">{t(lang, 'header_forecast')}</p>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-xs sm:text-sm border-collapse min-w-[320px]">
                <thead>
                  <tr className="text-indigo-200/90">
                    <th className="pb-1.5 pr-2 text-left font-semibold" />
                    {forecast.map(day => (
                      <th
                        key={day.date.toISOString()}
                        className={`pb-1.5 px-1 text-center font-semibold capitalize min-w-[2.75rem] ${
                          day.isToday ? 'text-white' : ''
                        }`}
                      >
                        {day.dayLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1 pr-2 text-indigo-200/80 font-medium whitespace-nowrap">+</td>
                    {forecast.map(day => (
                      <td
                        key={`n-${day.date.toISOString()}`}
                        className={`py-1 px-1 text-center tabular-nums font-semibold ${
                          day.isToday ? 'text-amber-200' : 'text-white'
                        }`}
                      >
                        {day.newDue > 0 ? `+${day.newDue}` : '—'}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-1 pr-2 text-indigo-200/80 font-medium whitespace-nowrap">
                      ({t(lang, 'header_forecast_total')})
                    </td>
                    {forecast.map(day => (
                      <td
                        key={`c-${day.date.toISOString()}`}
                        className={`py-1 px-1 text-center tabular-nums ${
                          day.isToday ? 'text-white font-bold' : 'text-indigo-100'
                        }`}
                      >
                        ({day.cumulative})
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
