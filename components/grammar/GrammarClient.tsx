'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { GRAMMAR_POINTS as MNN1_POINTS, ROLE_COLORS } from '@/lib/grammar-mnn1'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS as MNN2_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS as MNNC1_POINTS } from '@/lib/grammar-mnnc1'
import { fetchKnownGrammar, setGrammarKnown, fetchAllGrammarSrsStats } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import GrammarDetail from './GrammarDetail'
import GrammarPractice from './GrammarPractice'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'
import { type GrammarSrsStat, getGrammarForecast } from '@/lib/grammar-srs'

type BookKey = 'mnn1' | 'mnn2' | 'mnnc1'
type BookFilter = 'all' | BookKey
type JlptFilter = 'all' | 'N5' | 'N4' | 'N3'
type GrammarPointWithBook = GrammarPoint & { book: BookKey }

// Which "view" the user is in
type View =
  | { kind: 'list' }
  | { kind: 'detail'; grammar: GrammarPointWithBook }
  | { kind: 'practice'; grammar: GrammarPointWithBook }   // direct SRS review entry
  | { kind: 'srs_queue'; queue: GrammarPointWithBook[] }  // multi-grammar review queue

const BOOKS: { key: BookKey; label: string; subtitle: string }[] = [
  { key: 'mnn1', label: 'MNN 1', subtitle: 'Minna no Nihongo 1' },
  { key: 'mnn2', label: 'MNN 2', subtitle: 'Minna no Nihongo 2' },
  { key: 'mnnc1', label: 'MNN Ch.I', subtitle: 'Minna no Nihongo Chūkyū I' },
]

const ALL_GRAMMAR_POINTS: GrammarPointWithBook[] = [
  ...MNN1_POINTS.map(p => ({ ...p, book: 'mnn1' as const })),
  ...MNN2_POINTS.map(p => ({ ...p, book: 'mnn2' as const })),
  ...MNNC1_POINTS.map(p => ({ ...p, book: 'mnnc1' as const })),
]

// ─────────────────────────────────────────────────────────────────────────────
// GrammarCard
// ─────────────────────────────────────────────────────────────────────────────

function GrammarCard({
  grammar,
  known,
  srsStat,
  onToggleKnown,
  onSelect,
  lang,
  showBook,
}: {
  grammar: GrammarPointWithBook
  known: boolean
  srsStat?: GrammarSrsStat
  onToggleKnown: (id: string, val: boolean) => void
  onSelect: (g: GrammarPointWithBook) => void
  lang: string
  showBook: boolean
}) {
  const name =
    lang === 'ca' ? grammar.name_ca :
    lang === 'en' ? grammar.name_en :
    grammar.name_es

  const isDue = srsStat && srsStat.next_review <= Date.now()
  const hasStarted = !!srsStat

  const cardBg = known
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 opacity-70 hover:opacity-90'
    : hasStarted
      ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-sm'
      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:shadow-sm'

  const badgeBg = known
    ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400'
    : hasStarted
      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
      : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500'

  return (
    <div
      className={`relative flex items-center gap-3 rounded-xl border p-3.5 cursor-pointer transition-all group ${cardBg}`}
      onClick={() => onSelect(grammar)}
    >
      {/* Number badge */}
      <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${badgeBg}`}>
        {grammar.number}
      </div>

      <div className="flex-1 min-w-0">
        {/* JLPT + lesson + book */}
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            grammar.jlpt === 'N5' ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-400' :
            grammar.jlpt === 'N4' ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400' :
            'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400'
          }`}>
            {grammar.jlpt}
          </span>
          {showBook && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
              {grammar.book === 'mnn1' ? 'MNN1' : 'MNN2'}
            </span>
          )}
          <span className="text-[10px] text-slate-400">
            {t(lang as any, 'grammar_lesson').replace('{n}', String(grammar.lesson))}
          </span>
          {/* SRS state badges */}
          {isDue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 animate-pulse">
              ⏰ {t(lang as any, 'gp_due')}
            </span>
          )}
          {hasStarted && !isDue && !known && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              {t(lang as any, 'grammar_studying')}
            </span>
          )}
        </div>

        {/* Pattern */}
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">{grammar.pattern}</p>
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
            ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-500'
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

// ─────────────────────────────────────────────────────────────────────────────
// SRS Queue: one sentence per grammar point, loops through the due list
// ─────────────────────────────────────────────────────────────────────────────

function GrammarSrsQueue({
  queue,
  lang,
  geminiKey,
  sessionToken,
  activeVocab,
  onBack,
  canEdit,
}: {
  queue: GrammarPointWithBook[]
  lang: string
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  onBack: () => void
  canEdit?: boolean
}) {
  const [idx, setIdx] = useState(0)

  if (queue.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t(lang as any, 'gp_back')}
        </button>
        <div className="text-center py-12">
          <p className="text-4xl mb-3">✅</p>
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{t(lang as any, 'gp_no_due')}</p>
          <p className="text-sm text-slate-500 mt-1">{t(lang as any, 'gp_no_due_sub')}</p>
        </div>
      </div>
    )
  }

  if (idx >= queue.length) {
    return (
      <div className="space-y-5">
        <div className="text-center py-10 space-y-3">
          <p className="text-5xl">🎉</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{t(lang as any, 'gp_srs_queue_done')}</p>
          <p className="text-sm text-slate-500">
            {t(lang as any, 'gp_srs_queue_reviewed').replace('{n}', String(queue.length))}
          </p>
        </div>
        <button
          onClick={onBack}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
        >
          ← {t(lang as any, 'gp_back')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Queue progress */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold">
          {t(lang as any, 'gp_reviewing_queue').replace('{i}', String(idx + 1)).replace('{n}', String(queue.length))}
        </span>
        <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition">
          {t(lang as any, 'gp_quit')} ✕
        </button>
      </div>
      <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all"
          style={{ width: `${(idx / queue.length) * 100}%` }}
        />
      </div>

      <GrammarPractice
        grammar={queue[idx]}
        lang={lang as any}
        geminiKey={geminiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setIdx(i => i + 1)}   // "back" in queue mode = advance to next
        canEdit={canEdit}
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main GrammarClient
// ─────────────────────────────────────────────────────────────────────────────

export default function GrammarClient() {
  const { state } = useStore()
  const lang = state.lang

  const [bookFilter, setBookFilter] = useState<BookFilter>('mnn1')
  const [search, setSearch] = useState('')
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>('all')
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [hideKnown, setHideKnown] = useState(true)
  const [view, setView] = useState<View>({ kind: 'list' })
  const [sessionToken, setSessionToken] = useState('')
  const [loadingKnown, setLoadingKnown] = useState(true)
  const [srsStats, setSrsStats] = useState<Map<string, GrammarSrsStat>>(new Map())

  useEffect(() => {
    if (!state.user) { setLoadingKnown(false); return }

    fetchKnownGrammar().then(ids => { setKnownIds(ids); setLoadingKnown(false) })
    fetchAllGrammarSrsStats().then(stats => {
      setSrsStats(new Map(stats.map(s => [s.grammar_id, s])))
    })
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
    // Auto-hide known items when the user marks one as mastered
    if (val) setHideKnown(true)
    if (state.user) await setGrammarKnown(id, val)
  }

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

  // Grammar points with SRS due today
  const dueGrammarPoints = useMemo(() => {
    const now = Date.now()
    return ALL_GRAMMAR_POINTS.filter(g => {
      const stat = srsStats.get(g.id)
      return stat && stat.next_review <= now
    })
  }, [srsStats])

  // Grammar forecast for next 7 days
  const grammarForecast = useMemo(() => getGrammarForecast(srsStats, lang, 7), [srsStats, lang])

  const totalInBook    = bookPoints.length
  const totalKnownInBook = bookPoints.filter(p => knownIds.has(p.id)).length

  const activeVocab = state.db.filter(i => i.status === 'active')
  const currentBookInfo = bookFilter !== 'all' ? BOOKS.find(b => b.key === bookFilter) : null
  const effectiveRole = state.simulatedRole ?? state.role
  const canEdit = effectiveRole === 'admin' || effectiveRole === 'contributor'

  // ── Sub-views ────────────────────────────────────────────────────────────

  if (view.kind === 'detail') {
    return (
      <GrammarDetail
        grammar={view.grammar}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setView({ kind: 'list' })}
        canEdit={canEdit}
      />
    )
  }

  if (view.kind === 'practice') {
    return (
      <GrammarPractice
        grammar={view.grammar}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setView({ kind: 'list' })}
        canEdit={canEdit}
      />
    )
  }

  if (view.kind === 'srs_queue') {
    return (
      <GrammarSrsQueue
        queue={view.queue}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setView({ kind: 'list' })}
        canEdit={canEdit}
      />
    )
  }

  // ── Main list view ────────────────────────────────────────────────────────

  const subtitleText = currentBookInfo
    ? `${currentBookInfo.subtitle} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`
    : `${t(lang, 'grammar_all_books')} · ${t(lang, 'grammar_n_points').replace('{n}', String(totalInBook))}`

  return (
    <div className="space-y-4">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* API Key banner */}
      {!state.geminiApiKey && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">🔑 {t(lang, 'api_missing_banner')}</p>
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
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{t(lang, 'grammar_title')}</h1>
          <SectionHelp section="grammar" lang={lang} />
        </div>
        <p className="text-sm text-slate-500 mt-0.5">{subtitleText}</p>
      </div>

      {/* ── Grammar SRS Review banner ─────────────────────────────────────── */}
      {state.user && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          dueGrammarPoints.length > 0
            ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800'
            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}>
          <div className="text-2xl shrink-0">
            {dueGrammarPoints.length > 0 ? '⏰' : '🏋️'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {t(lang, 'gp_srs_review_title')}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              {dueGrammarPoints.length > 0
                ? t(lang, 'gp_srs_due_count').replace('{n}', String(dueGrammarPoints.length))
                : t(lang, 'gp_srs_all_clear')}
            </p>
          </div>
          <button
            disabled={dueGrammarPoints.length === 0}
            onClick={() => setView({ kind: 'srs_queue', queue: dueGrammarPoints })}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition ${
              dueGrammarPoints.length > 0
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-sm'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
            }`}
          >
            {dueGrammarPoints.length > 0
              ? `▶ ${t(lang, 'gp_start_review')}`
              : t(lang, 'gp_up_to_date')}
          </button>
        </div>
      )}

      {/* Grammar Forecast */}
      {state.user && srsStats.size > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50/50 to-yellow-50/30 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border border-amber-100 dark:border-slate-700 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              📅 {t(lang, 'grammar_forecast_title')}
            </p>
            <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300 leading-none">
              {grammarForecast[0]?.cumulative ?? 0}
            </span>
          </div>
          <div className="flex gap-3 flex-wrap">
            {grammarForecast.slice(1).map(day => {
              const isEmpty = day.cumulative === 0
              return (
                <div key={day.date.toISOString()} className="flex flex-col items-center min-w-[2.5rem]">
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] font-medium capitalize">{day.dayLabel}</span>
                  <span className="text-xs font-bold tabular-nums mt-0.5">
                    {isEmpty
                      ? <span className="text-slate-300 dark:text-slate-600">—</span>
                      : <span className="text-amber-600 dark:text-amber-400">+{day.newDue}</span>
                    }
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Book selector */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-1">📚 {t(lang, 'grammar_book')}:</span>
        <button
          onClick={() => setBookFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
            bookFilter === 'all'
              ? 'bg-slate-700 text-white border-slate-700'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
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
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{t(lang, 'grammar_progress')}</span>
          <span className="text-sm font-bold text-emerald-600">
            {t(lang, 'grammar_mastered_count')
              .replace('{done}', String(totalKnownInBook))
              .replace('{total}', String(totalInBook))}
          </span>
        </div>
        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
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
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? t(lang, 'grammar_filter_all') : f}
            </button>
          ))}

          <button
            onClick={() => setHideKnown(v => !v)}
            disabled={knownIds.size === 0}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ml-auto ${
              hideKnown && knownIds.size > 0
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed'
            }`}
          >
            {hideKnown && knownIds.size > 0 ? t(lang, 'grammar_hiding_known') : t(lang, 'grammar_hide_known')}
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
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
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
                    srsStat={srsStats.get(g.id)}
                    onToggleKnown={toggleKnown}
                    onSelect={g => setView({ kind: 'detail', grammar: g })}
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
