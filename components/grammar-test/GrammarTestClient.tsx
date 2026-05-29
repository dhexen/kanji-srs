'use client'
import { useState, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { BUNPRO_GRAMMAR, BUNPRO_JLPT_LEVELS, type BunproGrammarPoint } from '@/lib/grammar-bunpro'

const LEVEL_COLORS: Record<BunproGrammarPoint['jlpt'], string> = {
  N5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  N4: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400 border-sky-200 dark:border-sky-800',
  N3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  N2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  N1: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-rose-200 dark:border-rose-800',
}

const LEVEL_HEADER_COLORS: Record<BunproGrammarPoint['jlpt'], string> = {
  N5: 'bg-emerald-500',
  N4: 'bg-sky-500',
  N3: 'bg-violet-500',
  N2: 'bg-amber-500',
  N1: 'bg-rose-500',
}

function GrammarCard({ point, onClick }: { point: BunproGrammarPoint; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors">
          {point.pattern}
        </span>
        <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border ${LEVEL_COLORS[point.jlpt]}`}>
          {point.jlpt}
        </span>
      </div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">{point.name_es}</p>
      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">{point.meaning_es}</p>
    </button>
  )
}

function GrammarDetail({ point, onClose }: { point: BunproGrammarPoint; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`${LEVEL_HEADER_COLORS[point.jlpt]} px-5 py-4`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white/80 text-xs font-semibold mb-0.5">{point.jlpt}</div>
              <h2 className="text-2xl font-bold text-white">{point.pattern}</h2>
              <p className="text-white/90 text-sm mt-0.5">{point.name_es}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* English name */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-0.5">English</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{point.name_en}</p>
          </div>

          {/* Structure */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Estructura</p>
            <code className="inline-block px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono text-violet-700 dark:text-violet-400">
              {point.structure}
            </code>
          </div>

          {/* Meaning ES */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Explicación (ES)</p>
            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{point.meaning_es}</p>
          </div>

          {/* Meaning EN */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Explanation (EN)</p>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{point.meaning_en}</p>
          </div>

          {/* Example */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">Ejemplo</p>
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-3 border border-slate-200 dark:border-slate-700 space-y-1">
              <p className="text-base font-medium text-slate-800 dark:text-slate-100">{point.example_jp}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{point.example_es}</p>
            </div>
          </div>

          {/* Notes */}
          {point.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3">
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">Nota</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">{point.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GrammarTestClient() {
  const { state } = useStore()
  const router = useRouter()
  const effectiveRole = state.simulatedRole ?? state.role
  const [selectedLevel, setSelectedLevel] = useState<BunproGrammarPoint['jlpt'] | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<BunproGrammarPoint | null>(null)

  // Redirect non-admins
  if (state.loaded && effectiveRole !== 'admin') {
    router.replace('/review')
    return null
  }

  const filtered = useMemo(() => {
    let list = BUNPRO_GRAMMAR
    if (selectedLevel !== 'ALL') list = list.filter(g => g.jlpt === selectedLevel)
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
  }, [selectedLevel, search])

  const countByLevel = useMemo(() =>
    Object.fromEntries(BUNPRO_JLPT_LEVELS.map(l => [l, BUNPRO_GRAMMAR.filter(g => g.jlpt === l).length])),
  [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm px-4 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              🧪 Gramática Test
            </h1>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              ADMIN
            </span>
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              {filtered.length} puntos
            </span>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setSelectedLevel('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                selectedLevel === 'ALL'
                  ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400'
              }`}
            >
              Todos ({BUNPRO_GRAMMAR.length})
            </button>
            {BUNPRO_JLPT_LEVELS.map(level => (
              <button
                key={level}
                type="button"
                onClick={() => setSelectedLevel(level)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedLevel === level
                    ? `${LEVEL_HEADER_COLORS[level]} text-white border-transparent`
                    : `bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-400`
                }`}
              >
                {level} ({countByLevel[level]})
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar patrón o explicación…"
              className="ml-auto w-52 px-3 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-400 dark:focus:ring-violet-600"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {selectedLevel === 'ALL' ? (
          // Grouped by level
          BUNPRO_JLPT_LEVELS.map(level => {
            const items = filtered.filter(g => g.jlpt === level)
            if (items.length === 0) return null
            return (
              <section key={level} className="mb-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${LEVEL_HEADER_COLORS[level]}`} />
                  <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                    {level}
                  </h2>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {items.length} puntos
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map(g => (
                    <GrammarCard key={g.id} point={g} onClick={() => setSelected(g)} />
                  ))}
                </div>
              </section>
            )
          })
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(g => (
              <GrammarCard key={g.id} point={g} onClick={() => setSelected(g)} />
            ))}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-500">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-sm">No se encontraron puntos gramaticales.</p>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {selected && <GrammarDetail point={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
