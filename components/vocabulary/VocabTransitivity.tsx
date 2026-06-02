'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { fetchVerbsByTransitivity, type VerbEntry } from '@/lib/supabase'
import { t } from '@/lib/i18n'

type FilterType = 'all' | 'transitive' | 'intransitive' | 'both'

function meaning(entry: VerbEntry, lang: string): string {
  if (lang === 'ca' && entry.meaning_ca) return entry.meaning_ca
  if (lang === 'en' && entry.meaning_en) return entry.meaning_en
  return entry.meaning_es
}

function VerbCard({ verb, lang }: { verb: VerbEntry; lang: string }) {
  const isTransitive    = verb.word_type === 'verb_transitive'
  const isIntransitive  = verb.word_type === 'verb_intransitive'
  const grade = verb.grade

  const typeBadge = isTransitive
    ? { label: '他動詞', color: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' }
    : isIntransitive
    ? { label: '自動詞', color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' }
    : { label: '動詞', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300' }

  const gradeBadge = grade
    ? grade <= 6
      ? { label: `${grade}º`, color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' }
      : { label: `Sec ${grade - 6}º`, color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' }
    : null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="kanji-font text-xl font-bold text-slate-800 dark:text-slate-100 shrink-0">
            {verb.word}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 shrink-0">{verb.reading}</span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5 truncate">
          {meaning(verb, lang)}
        </p>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${typeBadge.color}`}>
          {typeBadge.label}
        </span>
        {gradeBadge && (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${gradeBadge.color}`}>
            {gradeBadge.label}
          </span>
        )}
      </div>
    </div>
  )
}

export default function VocabTransitivity() {
  const { state } = useStore()
  const lang = state.lang

  const [verbs,   setVerbs]   = useState<VerbEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterType>('all')
  const [search,  setSearch]  = useState('')

  const tl = (key: string) => t(lang as Parameters<typeof t>[0], key as Parameters<typeof t>[1])

  useEffect(() => {
    fetchVerbsByTransitivity()
      .then(setVerbs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = verbs
    if (filter === 'transitive')   result = result.filter(v => v.word_type === 'verb_transitive')
    if (filter === 'intransitive') result = result.filter(v => v.word_type === 'verb_intransitive')
    if (filter === 'both')         result = result.filter(v => v.word_type === 'verb')

    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(v =>
        v.word.includes(search.trim()) ||
        v.kanji.includes(search.trim()) ||
        v.reading.toLowerCase().includes(q) ||
        v.meaning_es.toLowerCase().includes(q) ||
        (v.meaning_ca ?? '').toLowerCase().includes(q) ||
        (v.meaning_en ?? '').toLowerCase().includes(q)
      )
    }
    return result
  }, [verbs, filter, search])

  const counts = useMemo(() => ({
    transitive:   verbs.filter(v => v.word_type === 'verb_transitive').length,
    intransitive: verbs.filter(v => v.word_type === 'verb_intransitive').length,
    both:         verbs.filter(v => v.word_type === 'verb').length,
  }), [verbs])

  const FILTER_TABS: { key: FilterType; label: string; badge: number; badgeColor: string }[] = [
    { key: 'all',         label: tl('antonyms_filter_all'), badge: verbs.length,        badgeColor: 'bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300' },
    { key: 'transitive',  label: '他動詞',                   badge: counts.transitive,   badgeColor: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' },
    { key: 'intransitive',label: '自動詞',                   badge: counts.intransitive, badgeColor: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' },
    { key: 'both',        label: '動詞',                     badge: counts.both,         badgeColor: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' },
  ]

  return (
    <div className="space-y-4">

      {/* Summary badges */}
      {!loading && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-sky-50 dark:bg-sky-900/20 rounded-xl p-3 text-center border border-sky-100 dark:border-sky-800">
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">{counts.transitive}</p>
            <p className="text-xs text-sky-600 dark:text-sky-400 mt-0.5 font-medium">他動詞</p>
            <p className="text-[10px] text-sky-500 dark:text-sky-500">Transitivos</p>
          </div>
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{counts.intransitive}</p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">自動詞</p>
            <p className="text-[10px] text-emerald-500 dark:text-emerald-500">Intransitivos</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-center border border-slate-100 dark:border-slate-700">
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{counts.both}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">動詞</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">Sin clasificar</p>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-white/20 text-white' : tab.badgeColor
            }`}>
              {tab.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-2.5 flex items-center gap-3">
        <span className="text-slate-400 shrink-0">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tl('transitivity_search_ph')}
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0"
          >×</button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-slate-400 py-16">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">{tl('transitivity_loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <div className="text-4xl">動</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {verbs.length === 0 ? tl('transitivity_empty') : tl('antonyms_no_results')}
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {tl('transitivity_n_verbs').replace('{n}', String(filtered.length))}
          </p>
          <div className="space-y-2">
            {filtered.map(verb => (
              <VerbCard
                key={`${verb.word}-${verb.word_type}`}
                verb={verb}
                lang={lang}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
