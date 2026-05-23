'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { GRAMMAR_POINTS as MNN1_POINTS, ROLE_COLORS } from '@/lib/grammar-mnn1'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS as MNN2_POINTS } from '@/lib/grammar-mnn2'
import { fetchKnownGrammar, setGrammarKnown } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import GrammarDetail from './GrammarDetail'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'

type BookKey = 'mnn1' | 'mnn2'
type BookFilter = 'all' | BookKey
type JlptFilter = 'all' | 'N5' | 'N4' | 'N3'
type GrammarPointWithBook = GrammarPoint & { book: BookKey }

const BOOKS: { key: BookKey; label: string; subtitle: string }[] = [
  { key: 'mnn1', label: 'MNN 1', subtitle: 'Minna no Nihongo 1' },
  { key: 'mnn2', label: 'MNN 2', subtitle: 'Minna no Nihongo 2' },
]

const ALL_GRAMMAR_POINTS: GrammarPointWithBook[] = [
  ...MNN1_POINTS.map(p => ({ ...p, book: 'mnn1' as const })),
  ...MNN2_POINTS.map(p => ({ ...p, book: 'mnn2' as const })),
]

function GrammarCard({
  grammar,
  known,
  onToggleKnown,
  onSelect,
  lang,
  showBook,
}: {
  grammar: GrammarPointWithBook
  known: boolean
  onToggleKnown: (id: string, val: boolean) => void
  onSelect: (g: GrammarPointWithBook) => void
  lang: string
  showBook: boolean
}) {
  const name =
    lang === 'ca' ? grammar.name_ca :
    lang === 'en' ? grammar.name_en :
    grammar.name_es

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all group ${
        known
          ? 'bg-emerald-50 border-emerald-200 opacity-70 hover:opacity-90'
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
      }`}
      onClick={() => onSelect(grammar)}
    >
      {/* Number badge */}
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
        known ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
      }`}>
        {grammar.number}
      </div>

      <div className="flex-1 min-w-0">
        {/* JLPT + lesson + book (when showing all) */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            grammar.jlpt === 'N5' ? 'bg-emerald-100 text-emerald-700' :
            grammar.jlpt === 'N4' ? 'bg-blue-100 text-blue-700' :
            'bg-violet-100 text-violet-700'
          }`}>
            {grammar.jlpt}
          </span>
          {showBook && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
              {grammar.book === 'mnn1' ? 'MNN1' : 'MNN2'}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {t(lang as any, 'grammar_lesson').replace('{n}', String(grammar.lesson))}
          </span>
        </div>
        {/* Pattern */}
        <p className="font-bold text-slate-800 text-sm truncate">{grammar.pattern}</p>
        {/* Name */}
        <p className="text-xs text-slate-500 truncate">{name}</p>
        {/* Structure preview */}
        <div className="flex flex-wrap gap-1 mt-1.5">
          {grammar.structure.slice(0, 5).map((p, i) => {
            const c = ROLE_COLORS[p.role]
            return (
              <span key={i} className={`${c.bg} ${c.text} text-[10px] font-medium px-1.5 py-0.5 rounded border ${c.border}`}>
                {p.text}
              </span>
            )
          })}
        </div>
      </div>

      {/* Known toggle */}
      <button
        onClick={e => { e.stopPropagation(); onToggleKnown(grammar.id, !known) }}
        title={known ? t(lang as any, 'grammar_unknown_title') : t(lang as any, 'grammar_known_title')}
        className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
          known
            ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200'
            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-500'
        }`}
      >
        {known ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
    </div>
  )
}

export default function GrammarClient() {
  const { state } = useStore()
  const lang = state.lang

  const [bookFilter, setBookFilter] = useState<BookFilter>('mnn1')
  const [search, setSearch] = useState('')
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>('all')
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [hideKnown, setHideKnown] = useState(false)
  const [selected, setSelected] = useState<GrammarPointWithBook | null>(null)
  const [sessionToken, setSessionToken] = useState('')
  const [loadingKnown, setLoadingKnown] = useState(true)

  useEffect(() => {
    if (!state.user) { setLoadingKnown(false); return }
    fetchKnownGrammar().then(ids => { setKnownIds(ids); setLoadingKnown(false) })
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionToken(session?.access_token ?? '')
    })
  }, [state.user])

  async function toggleKnown(id: string, val: boolean) {
    setKnownIds(prev => {
      const next = new Set(prev)
      val ? next.add(id) : next.delete(id)
      return next
    })
    if (state.user) await setGrammarKnown(id, val)
  }

  // Points for the selected book (for progress bar)
  const bookPoints = useMemo(() => {
    if (bookFilter === 'all') return ALL_GRAMMAR_POINTS
    return ALL_GRAMMAR_POINTS.filter(p => p.book === bookFilter)
  }, [bookFilter])

  const filtered = useMemo(() => {
    let list = bookFilter === 'all'
      ? ALL_GRAMMAR_POINTS
      : ALL_GRAMMAR_POINTS.filter(p => p.book === bookFilter)
    if (jlptFilter !== 'all') list = list.filter(g => g.jlpt === jlptFilter)
    if (hideKnown) list = list.filter(g => !knownIds.has(g.id))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(g =>
        g.pattern.toLowerCase().includes(q) ||
        g.name_es.toLowerCase().includes(q) ||
        g.name_ca.toLowerCase().includes(q) ||
        g.name_en.toLowerCase().includes(q)
      )
    }
    return list
  }, [search, jlptFilter, bookFilter, hideKnown, knownIds])

  // Group by lesson (stable key: book+lesson to avoid collisions if books overlap)
  const byLesson = useMemo(() => {
    const map = new Map<string, { lesson: number; book: BookKey; points: GrammarPointWithBook[] }>()
    for (const g of filtered) {
      const key = `${g.book}-${g.lesson}`
      if (!map.has(key)) map.set(key, { lesson: g.lesson, book: g.book, points: [] })
      map.get(key)!.points.push(g)
    }
    return Array.from(map.values()).sort((a, b) =>
      a.book !== b.book ? (a.book < b.book ? -1 : 1) : a.lesson - b.lesson
    )
  }, [filtered])

  const totalInBook = bookPoints.length
  const totalKnownInBook = bookPoints.filter(p => knownIds.has(p.id)).length

  const activeVocab = state.db.filter(i => i.status === 'active')
  const currentBookInfo = bookFilter !== 'all' ? BOOKS.find(b => b.key === bookFilter) : null

  if (selected) {
    return (
      <GrammarDetail
        grammar={selected}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setSelected(null)}
      />
    )
  }

  const subtitleText = currentBookInfo
    ? `${currentBookInfo.subtitle} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`
    : `${t(lang, 'grammar_all_books')} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`

  return (
    <div className="space-y-4">
      {/* API Key banner */}
      {!state.geminiApiKey && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">🔑 {t(lang, 'api_missing_banner')}</p>
          </div>
          <Link
            href="/stats"
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition"
          >
            {t(lang, 'api_go_settings')}
          </Link>
        </div>
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-800">{t(lang, 'grammar_title')}</h1>
          <SectionHelp section="grammar" lang={lang} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{subtitleText}</p>
      </div>

      {/* Book selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-1">📚 {t(lang, 'grammar_book')}:</span>
        <button
          onClick={() => setBookFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            bookFilter === 'all'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
          }`}
        >
          {t(lang, 'grammar_all')}
        </button>
        {BOOKS.map(b => (
          <button
            key={b.key}
            onClick={() => setBookFilter(b.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              bookFilter === b.key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">{t(lang, 'grammar_progress')}</span>
          <span className="text-sm font-bold text-emerald-600">
            {t(lang, 'grammar_mastered_count')
              .replace('{done}', String(totalKnownInBook))
              .replace('{total}', String(totalInBook))}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: totalInBook > 0 ? `${(totalKnownInBook / totalInBook) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(lang, 'grammar_search_ph')}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'N5', 'N4', 'N3'] as JlptFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setJlptFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                jlptFilter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? t(lang, 'grammar_filter_all') : f}
            </button>
          ))}

          <button
            onClick={() => setHideKnown(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ml-auto ${
              hideKnown
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
            }`}
          >
            {hideKnown ? t(lang, 'grammar_hiding_known') : t(lang, 'grammar_hide_known')}
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400">
        {t(lang, 'grammar_points_count')
          .replace('{n}', String(filtered.length))
          .replace('{done}', String(totalKnownInBook))}
        {loadingKnown && !state.user && t(lang, 'grammar_login_save')}
      </p>

      {/* Grammar list grouped by lesson */}
      {byLesson.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>{t(lang, 'grammar_no_results')}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byLesson.map(({ lesson, book, points }) => (
            <div key={`${book}-${lesson}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  {bookFilter === 'all' ? `${book === 'mnn1' ? 'MNN1' : 'MNN2'} · ` : ''}
                  {t(lang, 'grammar_lesson').replace('{n}', String(lesson))}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400">
                  {points.filter(g => knownIds.has(g.id)).length}/{points.length}
                </span>
              </div>
              <div className="space-y-2">
                {points.map(g => (
                  <GrammarCard
                    key={g.id}
                    grammar={g}
                    known={knownIds.has(g.id)}
                    onToggleKnown={toggleKnown}
                    onSelect={setSelected}
                    lang={lang}
                    showBook={bookFilter === 'all'}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
