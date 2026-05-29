'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { fetchKnownGrammar, setGrammarKnown, fetchAllGrammarSrsStats } from '@/lib/supabase'
import {
  BUNPRO_GRAMMAR,
  BUNPRO_JLPT_LEVELS,
  bunproToGrammarPoint,
  type BunproGrammarPoint,
} from '@/lib/grammar-bunpro'
import { type GrammarSrsStat } from '@/lib/grammar-srs'
import { ROLE_COLORS } from '@/lib/grammar-mnn1'
import GrammarClient from '@/components/grammar/GrammarClient'
import GrammarDetail from '@/components/grammar/GrammarDetail'
import GrammarPractice from '@/components/grammar/GrammarPractice'

// ── JLPT level badge colors ───────────────────────────────────────────────────
const LEVEL_PILL: Record<BunproGrammarPoint['jlpt'], string> = {
  N5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  N4: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  N3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  N2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  N1: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

// ── JLPT view states ──────────────────────────────────────────────────────────
type JlptView =
  | { kind: 'list' }
  | { kind: 'detail'; point: BunproGrammarPoint }
  | { kind: 'practice'; point: BunproGrammarPoint }

// ── Single grammar card for the JLPT tab ─────────────────────────────────────
function JlptCard({
  point,
  known,
  srsStat,
  onToggleKnown,
  onSelect,
}: {
  point: BunproGrammarPoint
  known: boolean
  srsStat?: GrammarSrsStat
  onToggleKnown: (id: string, val: boolean) => void
  onSelect: (p: BunproGrammarPoint) => void
}) {
  const isDue     = srsStat && srsStat.next_review <= Date.now()
  const hasStarted = !!srsStat

  const cardBg = known
    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 opacity-70 hover:opacity-90'
    : hasStarted
      ? 'bg-amber-50 dark:bg-amber-900/15 border-amber-200 dark:border-amber-800/60 hover:border-amber-300 dark:hover:border-amber-600'
      : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm'

  return (
    <div
      className={`relative flex items-start gap-3 rounded-xl border p-3.5 cursor-pointer transition-all group ${cardBg}`}
      onClick={() => onSelect(point)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${LEVEL_PILL[point.jlpt]}`}>
            {point.jlpt}
          </span>
          {isDue && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 animate-pulse">
              ⏰ Pendiente
            </span>
          )}
          {hasStarted && !isDue && !known && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
              Estudiando
            </span>
          )}
        </div>
        <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">{point.pattern}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{point.name_es}</p>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{point.meaning_es}</p>
      </div>

      {/* Known toggle */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggleKnown(point.id, !known) }}
        title={known ? 'Marcar como no conocido' : 'Marcar como conocido'}
        className={`shrink-0 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-base transition-all ${
          known
            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200'
            : 'bg-slate-100 dark:bg-slate-700 text-slate-300 dark:text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
        }`}
      >
        {known ? '✓' : '○'}
      </button>
    </div>
  )
}

// ── JLPT detail panel ─────────────────────────────────────────────────────────
function JlptDetailPanel({
  point,
  lang,
  geminiKey,
  sessionToken,
  activeVocab,
  canEdit,
  onBack,
  onPractice,
}: {
  point: BunproGrammarPoint
  lang: string
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  canEdit: boolean
  onBack: () => void
  onPractice: () => void
}) {
  return (
    <div className="space-y-5">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${LEVEL_PILL[point.jlpt]}`}>
              {point.jlpt}
            </span>
          </div>
          <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100">{point.pattern}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{point.name_es}</p>
        </div>
        <button
          type="button"
          onClick={onPractice}
          className="shrink-0 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition shadow-sm"
        >
          🏋️ Practicar
        </button>
      </div>

      {/* Structure */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Estructura</p>
        <div className="flex flex-wrap gap-1.5">
          {point.structure.split(/\s+/).map((part, i) => {
            const c = ROLE_COLORS['key']
            return (
              <span key={i} className={`${c.bg} ${c.text} border ${c.border} text-sm font-bold rounded-md px-2 py-0.5`}>
                {part}
              </span>
            )
          })}
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-3">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Explicación (ES)</p>
          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{point.meaning_es}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Explanation (EN)</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{point.meaning_en}</p>
        </div>
      </div>

      {/* Example */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Ejemplo</p>
        <p className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">{point.example_jp}</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">{point.example_es}</p>
      </div>

      {/* Notes */}
      {point.notes && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Nota</p>
          <p className="text-sm text-amber-700 dark:text-amber-300">{point.notes}</p>
        </div>
      )}
    </div>
  )
}

// ── JLPT tab full view ────────────────────────────────────────────────────────
function JlptView() {
  const { state } = useStore()
  const lang           = state.lang
  const effectiveRole  = state.simulatedRole ?? state.role
  const canEdit        = effectiveRole === 'admin' || effectiveRole === 'contributor'

  const [view, setView]             = useState<JlptView>({ kind: 'list' })
  const [levelFilter, setLevelFilter] = useState<BunproGrammarPoint['jlpt'] | 'all'>('all')
  const [search, setSearch]         = useState('')
  const [knownIds, setKnownIds]     = useState<Set<string>>(new Set())
  const [hideKnown, setHideKnown]   = useState(false)
  const [srsStats, setSrsStats]     = useState<Map<string, GrammarSrsStat>>(new Map())
  const [sessionToken, setSessionToken] = useState('')

  useEffect(() => {
    if (!state.user) return
    fetchKnownGrammar().then(ids => setKnownIds(ids))
    fetchAllGrammarSrsStats().then(stats => setSrsStats(new Map(stats.map(s => [s.grammar_id, s]))))
    supabase.auth.getSession().then(({ data: { session } }) => setSessionToken(session?.access_token ?? ''))
  }, [state.user])

  const filtered = useMemo(() => {
    let list = BUNPRO_GRAMMAR
    if (levelFilter !== 'all') list = list.filter(g => g.jlpt === levelFilter)
    if (hideKnown) list = list.filter(g => !knownIds.has(g.id))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(g =>
        g.pattern.toLowerCase().includes(q) ||
        g.name_es.toLowerCase().includes(q) ||
        g.name_en.toLowerCase().includes(q) ||
        g.meaning_es.toLowerCase().includes(q)
      )
    }
    return list
  }, [levelFilter, search, hideKnown, knownIds])

  const dueCount = useMemo(() => {
    const now = Date.now()
    return BUNPRO_GRAMMAR.filter(g => !knownIds.has(g.id) && (srsStats.get(g.id)?.next_review ?? Infinity) <= now).length
  }, [srsStats, knownIds])

  const countByLevel = useMemo(() =>
    Object.fromEntries(BUNPRO_JLPT_LEVELS.map(l => [l, BUNPRO_GRAMMAR.filter(g => g.jlpt === l).length])),
  [])

  const activeVocab = state.db.filter(i => i.status === 'active')

  async function toggleKnown(id: string, val: boolean) {
    setKnownIds(prev => { const n = new Set(prev); val ? n.add(id) : n.delete(id); return n })
    if (state.user) await setGrammarKnown(id, val)
  }

  // ── Sub-views ────────────────────────────────────────────────────────────

  if (view.kind === 'practice') {
    return (
      <GrammarPractice
        grammar={bunproToGrammarPoint(view.point)}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        onBack={() => setView({ kind: 'detail', point: view.point })}
        canEdit={canEdit}
      />
    )
  }

  if (view.kind === 'detail') {
    return (
      <JlptDetailPanel
        point={view.point}
        lang={lang}
        geminiKey={state.geminiApiKey}
        sessionToken={sessionToken}
        activeVocab={activeVocab}
        canEdit={canEdit}
        onBack={() => setView({ kind: 'list' })}
        onPractice={() => setView({ kind: 'practice', point: view.point })}
      />
    )
  }

  // ── List view ─────────────────────────────────────────────────────────────

  const knownCount = knownIds.size

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
        <span>{filtered.length} puntos</span>
        <span className="text-slate-200 dark:text-slate-700">|</span>
        <span className="text-emerald-600 dark:text-emerald-400">{knownCount} conocidos</span>
        {dueCount > 0 && (
          <>
            <span className="text-slate-200 dark:text-slate-700">|</span>
            <span className="text-rose-500 font-semibold animate-pulse">{dueCount} pendientes ⏰</span>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Level filter */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setLevelFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              levelFilter === 'all'
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
            }`}
          >
            Todos
          </button>
          {BUNPRO_JLPT_LEVELS.map(level => (
            <button
              key={level}
              onClick={() => setLevelFilter(level)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                levelFilter === level
                  ? `${LEVEL_PILL[level]} border-transparent`
                  : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              {level} <span className="opacity-60">({countByLevel[level]})</span>
            </button>
          ))}
        </div>

        {/* Hide known toggle */}
        <button
          onClick={() => setHideKnown(h => !h)}
          className={`ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
            hideKnown
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
              : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          }`}
        >
          {hideKnown ? '✓' : ''} Ocultar conocidos
        </button>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar…"
          className="w-44 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      {/* Grid grouped by JLPT level */}
      {levelFilter === 'all'
        ? BUNPRO_JLPT_LEVELS.map(level => {
            const items = filtered.filter(g => g.jlpt === level)
            if (items.length === 0) return null
            return (
              <section key={level}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LEVEL_PILL[level]}`}>{level}</span>
                  <span className="text-xs text-slate-400">{items.length} puntos</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {items.map(g => (
                    <JlptCard
                      key={g.id}
                      point={g}
                      known={knownIds.has(g.id)}
                      srsStat={srsStats.get(g.id)}
                      onToggleKnown={toggleKnown}
                      onSelect={p => setView({ kind: 'detail', point: p })}
                    />
                  ))}
                </div>
              </section>
            )
          })
        : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {filtered.map(g => (
              <JlptCard
                key={g.id}
                point={g}
                known={knownIds.has(g.id)}
                srsStat={srsStats.get(g.id)}
                onToggleKnown={toggleKnown}
                onSelect={p => setView({ kind: 'detail', point: p })}
              />
            ))}
          </div>
        )
      }

      {filtered.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-sm">No se encontraron puntos gramaticales.</p>
        </div>
      )}
    </div>
  )
}

// ── Main GrammarTestClient ────────────────────────────────────────────────────
export default function GrammarTestClient() {
  const { state } = useStore()
  const router = useRouter()
  const effectiveRole = state.simulatedRole ?? state.role
  const [source, setSource] = useState<'mnn' | 'jlpt'>('mnn')

  if (state.loaded && effectiveRole !== 'admin') {
    router.replace('/review')
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Source selector header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center gap-3">
          <h1 className="text-sm font-bold text-slate-700 dark:text-slate-300 shrink-0">🧪 Gramática Test</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
            ADMIN
          </span>

          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1 ml-auto">
            <button
              type="button"
              onClick={() => setSource('mnn')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                source === 'mnn'
                  ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              📗 Minna no Nihongo
            </button>
            <button
              type="button"
              onClick={() => setSource('jlpt')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                source === 'jlpt'
                  ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              🗾 JLPT (BunPro)
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {source === 'mnn'
          ? <GrammarClient />
          : <JlptView />
        }
      </div>
    </div>
  )
}
