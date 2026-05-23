'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { GRAMMAR_POINTS, ROLE_COLORS } from '@/lib/grammar-mnn1'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { fetchKnownGrammar, setGrammarKnown } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import GrammarDetail from './GrammarDetail'
import { t } from '@/lib/i18n'

type JlptFilter = 'all' | 'N5' | 'N4'

function getLessonLabel(lesson: number) {
  return `Lección ${lesson}`
}

function GrammarCard({
  grammar,
  known,
  onToggleKnown,
  onSelect,
  lang,
}: {
  grammar: GrammarPoint
  known: boolean
  onToggleKnown: (id: string, val: boolean) => void
  onSelect: (g: GrammarPoint) => void
  lang: string
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
        {/* JLPT + lesson */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            grammar.jlpt === 'N5' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
          }`}>
            {grammar.jlpt}
          </span>
          <span className="text-[10px] text-slate-400">{getLessonLabel(grammar.lesson)}</span>
        </div>
        {/* Pattern */}
        <p className="font-bold text-slate-800 text-sm truncate">{grammar.pattern}</p>
        {/* Name */}
        <p className="text-xs text-slate-500 truncate">{name}</p>
        {/* Structure preview (first 4 parts) */}
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
        title={known ? 'Marcar como no conocida' : 'Marcar como ya me la sé'}
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

  const [search, setSearch] = useState('')
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>('all')
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set())
  const [hideKnown, setHideKnown] = useState(false)
  const [selected, setSelected] = useState<GrammarPoint | null>(null)
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

  const filtered = useMemo(() => {
    let list = GRAMMAR_POINTS
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
  }, [search, jlptFilter, hideKnown, knownIds])

  // Group by lesson
  const byLesson = useMemo(() => {
    const map = new Map<number, GrammarPoint[]>()
    for (const g of filtered) {
      if (!map.has(g.lesson)) map.set(g.lesson, [])
      map.get(g.lesson)!.push(g)
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0])
  }, [filtered])

  const totalKnown = knownIds.size
  const total = GRAMMAR_POINTS.length

  const activeVocab = state.db.filter(i => i.status === 'active')

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

  return (
    <div className="space-y-4">
      {/* API Key banner (only for AI explanation feature) */}
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
        <h1 className="text-2xl font-bold text-slate-800">📖 Gramática</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Minna no Nihongo 1 · {total} puntos gramaticales
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-slate-600">Progreso</span>
          <span className="text-sm font-bold text-emerald-600">{totalKnown} / {total} dominadas</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: total > 0 ? `${(totalKnown / total) * 100}%` : '0%' }}
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
            placeholder="Buscar gramática..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              ✕
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {(['all', 'N5', 'N4'] as JlptFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setJlptFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                jlptFilter === f
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {f === 'all' ? 'Todo' : f}
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
            {hideKnown ? '✓ Ocultando dominadas' : 'Ocultar dominadas'}
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-400">
        {filtered.length} puntos · {totalKnown} dominados
        {loadingKnown && !state.user && ' · Inicia sesión para guardar progreso'}
      </p>

      {/* Grammar list grouped by lesson */}
      {byLesson.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-2">🔍</p>
          <p>No se encontró ninguna gramática con ese filtro.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {byLesson.map(([lesson, points]) => (
            <div key={lesson}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                  Lección {lesson}
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
