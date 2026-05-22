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

  return (
    <>
      <div className="bg-slate-900 text-slate-300 text-xs py-2 px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${state.user ? 'bg-emerald-400' : 'bg-amber-500 animate-pulse'}`} />
          <span className="truncate">
            {state.user ? `${t(lang, 'header_connected')} ${state.user.email}` : t(lang, 'header_local')}
          </span>
          {state.user && (
            <span className="ml-2 text-xs text-slate-200/80 bg-slate-700/40 px-2 py-0.5 rounded-full">
              {state.role}
            </span>
          )}
        </div>
        {state.syncing && (
          <span className="text-indigo-400 animate-pulse text-xs shrink-0">{t(lang, 'header_syncing')}</span>
        )}
      </div>

      <header className="bg-gradient-to-r from-indigo-600 to-indigo-800 text-white shadow-md px-4 py-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-wide flex items-center gap-2">
              🌸 小学校漢字 SRS
            </h1>
            <p className="text-indigo-100/90 text-xs mt-0.5">{t(lang, 'header_subtitle')}</p>
            <p className="text-indigo-200/80 text-xs mt-1 capitalize">{today}</p>
          </div>

          {hasActive && (
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
          )}
        </div>
      </header>
    </>
  )
}
