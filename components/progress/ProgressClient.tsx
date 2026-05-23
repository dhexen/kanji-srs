'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import {
  ReviewMode,
  ALL_REVIEW_MODES,
  MODE_CONFIG,
  STAGE_NAMES,
  SRS_INTERVALS,
  getModeLevelAndDue,
  getSrsClass,
} from '@/lib/srs'
import { t, getMeaning, getStageName, type Lang } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'

type SortKey = 'word' | 'level' | 'due'
type SortDir = 'asc' | 'desc'

function formatDue(due: number, lang: Lang): { text: string; color: string } {
  const now = Date.now()
  if (due <= now) return { text: t(lang, 'prog_overdue'), color: 'text-rose-600 font-bold' }

  const diff = due - now
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  const prefix = lang === 'ja' ? '' : `${t(lang, 'prog_in')} `

  if (days > 0) return { text: `${prefix}${days}${t(lang, 'prog_days')}`, color: days <= 1 ? 'text-amber-600' : 'text-slate-500' }
  if (hours > 0) return { text: `${prefix}${hours}${t(lang, 'prog_hours')}`, color: 'text-amber-600' }
  return { text: `${prefix}${minutes}${t(lang, 'prog_minutes')}`, color: 'text-amber-600' }
}

function formatDueDate(due: number, lang: Lang): string {
  const localeTag = lang === 'ja' ? 'ja-JP' : lang === 'ca' ? 'ca-ES' : lang === 'en' ? 'en-GB' : 'es-ES'
  return new Date(due).toLocaleDateString(localeTag, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ProgressClient() {
  const { state } = useStore()
  const lang = state.lang
  const [selectedMode, setSelectedMode] = useState<ReviewMode | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('due')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const activeWords = useMemo(
    () => state.db.filter(i => i.status === 'active'),
    [state.db],
  )

  const now = Date.now()
  const pendingCount = useMemo(() => {
    let count = 0
    const modes = selectedMode === 'all' ? ALL_REVIEW_MODES : [selectedMode]
    activeWords.forEach(item => {
      modes.forEach(mode => {
        const { due } = getModeLevelAndDue(item, mode)
        if (due <= now) count++
      })
    })
    return count
  }, [activeWords, selectedMode, now])

  const masteredCount = useMemo(() => {
    const modes = selectedMode === 'all' ? ALL_REVIEW_MODES : [selectedMode]
    let count = 0
    activeWords.forEach(item => {
      const allMastered = modes.every(mode => {
        const { level } = getModeLevelAndDue(item, mode)
        return level >= 6
      })
      if (allMastered) count++
    })
    return count
  }, [activeWords, selectedMode])

  // Build rows with the relevant mode info
  const rows = useMemo(() => {
    const modes = selectedMode === 'all' ? ALL_REVIEW_MODES : [selectedMode]
    const q = search.toLowerCase()

    return activeWords
      .filter(item => {
        if (!q) return true
        return (
          item.jp.includes(q) ||
          item.kanji.includes(q) ||
          item.reading.includes(q) ||
          item.meaning.toLowerCase().includes(q)
        )
      })
      .map(item => {
        // For sorting, use the earliest due and lowest level across selected modes
        let earliestDue = Infinity
        let lowestLevel = Infinity
        const modeDetails = modes.map(mode => {
          const { level, due } = getModeLevelAndDue(item, mode)
          if (due < earliestDue) earliestDue = due
          if (level < lowestLevel) lowestLevel = level
          return { mode, level, due }
        })
        return { item, modeDetails, earliestDue, lowestLevel }
      })
      .sort((a, b) => {
        let cmp = 0
        switch (sortKey) {
          case 'word':
            cmp = a.item.jp.localeCompare(b.item.jp, 'ja')
            break
          case 'level':
            cmp = a.lowestLevel - b.lowestLevel
            break
          case 'due':
            cmp = a.earliestDue - b.earliestDue
            break
        }
        return sortDir === 'asc' ? cmp : -cmp
      })
  }, [activeWords, selectedMode, search, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  const summaryText = t(lang, 'prog_summary')
    .replace('{active}', String(activeWords.length))
    .replace('{pending}', String(pendingCount))
    .replace('{mastered}', String(masteredCount))

  if (activeWords.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center">
        <p className="text-slate-400 text-lg mb-1">{t(lang, 'prog_no_words')}</p>
        <p className="text-slate-300 text-sm">{t(lang, 'prog_no_words_sub')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-slate-800">{t(lang, 'prog_title')}</h3>
          <SectionHelp section="progress" lang={lang} />
        </div>
        <p className="text-slate-400 text-xs mb-4">{t(lang, 'prog_sub')}</p>

        {/* Mode selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setSelectedMode('all')}
            className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
              selectedMode === 'all'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t(lang, 'prog_all_modes')}
          </button>
          {(Object.entries(MODE_CONFIG) as [ReviewMode, typeof MODE_CONFIG[ReviewMode]][]).map(
            ([id, cfg]) => (
              <button
                key={id}
                onClick={() => setSelectedMode(id)}
                className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-all ${
                  selectedMode === id ? cfg.colorOn : cfg.colorOff
                }`}
              >
                {cfg.label}
              </button>
            ),
          )}
        </div>

        {/* Summary + search */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <p className="text-xs text-slate-500">{summaryText}</p>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(lang, 'prog_filter')}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      {/* SRS legend */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{t(lang, 'prog_stage')}</p>
        <div className="flex flex-wrap gap-2">
          {STAGE_NAMES.map((_name, i) => {
            if (i === 0) return null
            const interval = SRS_INTERVALS[i]
            const hours = Math.round(interval / 3600000)
            const label = hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`
            return (
              <div
                key={i}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${getSrsClass(i, 'active', Date.now() + 999999999)}`}
              >
                <span>{i}/7</span>
                <span className="opacity-60">{getStageName(i, lang)}</span>
                <span className="opacity-40">({label})</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-3">{t(lang, 'th_kanji')}</th>
                <th
                  className="py-3 px-3 cursor-pointer hover:text-slate-700 select-none"
                  onClick={() => toggleSort('word')}
                >
                  {t(lang, 'th_word')}{sortIcon('word')}
                </th>
                <th className="py-3 px-3">{t(lang, 'th_reading')}</th>
                <th className="py-3 px-3 hidden md:table-cell">{t(lang, 'th_meaning')}</th>
                {selectedMode === 'all' ? (
                  (Object.keys(MODE_CONFIG) as ReviewMode[]).map(m => (
                    <th key={m} className="py-3 px-3 text-center whitespace-nowrap">
                      {MODE_CONFIG[m].label.split(' ')[0]}
                    </th>
                  ))
                ) : (
                  <>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-700 select-none"
                      onClick={() => toggleSort('level')}
                    >
                      {t(lang, 'prog_sort_level')}{sortIcon('level')}
                    </th>
                    <th
                      className="py-3 px-3 text-center cursor-pointer hover:text-slate-700 select-none"
                      onClick={() => toggleSort('due')}
                    >
                      {t(lang, 'prog_next_review')}{sortIcon('due')}
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(({ item, modeDetails }) => {
                const meaning = getMeaning(item, lang)
                return (
                  <tr
                    key={item.jp}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-3 font-bold text-slate-400 text-lg">{item.kanji}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{item.jp}</td>
                    <td className="py-3 px-3 text-indigo-600 font-semibold text-sm">{item.reading}</td>
                    <td className="py-3 px-3 text-slate-500 text-sm hidden md:table-cell">{meaning}</td>
                    {selectedMode === 'all' ? (
                      modeDetails.map(({ mode, level, due }) => {
                        const isPending = due <= Date.now()
                        return (
                          <td key={mode} className="py-3 px-3 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className={`px-1.5 py-0.5 rounded text-xs font-bold ${getSrsClass(level, 'active', due)}`}
                                title={getStageName(level, lang)}
                              >
                                {level}<span className="opacity-40">/7</span>
                              </span>
                              {isPending ? (
                                <span className="text-[10px] text-rose-500 font-semibold">!</span>
                              ) : (
                                <span className="text-[10px] text-slate-400" title={formatDueDate(due, lang)}>
                                  {formatDue(due, lang).text}
                                </span>
                              )}
                            </div>
                          </td>
                        )
                      })
                    ) : (
                      <>
                        {modeDetails.map(({ mode, level, due }) => {
                          const dueInfo = formatDue(due, lang)
                          const isPending = due <= Date.now()
                          return (
                            <td key={`${mode}-level`} className="py-3 px-3 text-center" colSpan={1}>
                              <span
                                className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${getSrsClass(level, 'active', due)}`}
                                title={getStageName(level, lang)}
                              >
                                {level}/7 — {getStageName(level, lang)}
                              </span>
                            </td>
                          )
                        })}
                        {modeDetails.map(({ mode, due }) => {
                          const isPending = due <= Date.now()
                          const dueInfo = formatDue(due, lang)
                          return (
                            <td key={`${mode}-due`} className="py-3 px-3 text-center">
                              <div className="flex flex-col items-center">
                                <span className={`text-xs font-semibold ${dueInfo.color}`}>
                                  {isPending ? '!' : ''} {dueInfo.text}
                                </span>
                                <span className="text-[10px] text-slate-300 mt-0.5">
                                  {formatDueDate(due, lang)}
                                </span>
                              </div>
                            </td>
                          )
                        })}
                      </>
                    )}
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={20}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    {search ? t(lang, 'prog_no_search_results').replace('{q}', search) : t(lang, 'prog_no_words')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
