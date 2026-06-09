'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useStore } from '@/lib/store'
import { fetchAntonymPairs, searchVocabulary, type AntonymPair } from '@/lib/supabase'
import { addAntonymPair, deleteAntonymPair, runAutoDetectAntonyms } from '@/lib/admin-client'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

// Word-type grouping for filters
const VERB_TYPES   = new Set(['verb', 'verb_transitive', 'verb_intransitive'])
const ADJ_TYPES    = new Set(['adj_i', 'adj_na'])

type FilterType = 'all' | 'verb' | 'adj'

function wordTypeLabel(wt: string | null, lang: string): string {
  if (!wt) return ''
  const key = `wt_${wt}` as Parameters<typeof t>[1]
  return t(lang as Parameters<typeof t>[0], key) || wt
}

function meaning(entry: AntonymPair['word_a'], lang: string): string {
  if (lang === 'ca' && entry.meaning_ca) return entry.meaning_ca
  if (lang === 'en' && entry.meaning_en) return entry.meaning_en
  return entry.meaning_es
}

// ─── Pair card ───────────────────────────────────────────────────────────────

function AntonymCard({
  pair,
  lang,
  canEdit,
  onDelete,
}: {
  pair:     AntonymPair
  lang:     string
  canEdit:  boolean
  onDelete: (id: number) => void
}) {
  const { word_a: a, word_b: b } = pair
  const wt = a.word_type ?? b.word_type
  const grade = Math.min(a.grade ?? 99, b.grade ?? 99)

  const gradeBadge = grade <= 6
    ? { label: `${grade}º`, color: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' }
    : grade <= 9
    ? { label: `Sec ${grade - 6}º`, color: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400' }
    : null

  return (
    <div className="group relative bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Top bar: grade + word type */}
      <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
        {gradeBadge && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${gradeBadge.color}`}>
            {gradeBadge.label}
          </span>
        )}
        {wt && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            {wordTypeLabel(wt, lang)}
          </span>
        )}
        {!gradeBadge && <span />}
      </div>

      {/* Pair row */}
      <div className="flex items-stretch gap-0 px-4 pb-4 pt-1">
        {/* Word A */}
        <div className="flex-1 text-center space-y-0.5 pr-3">
          <p className="kanji-font text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {a.word}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{a.reading}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug mt-1">
            {meaning(a, lang)}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center justify-center shrink-0 w-8">
          <span className="text-xl text-slate-300 dark:text-slate-600 select-none">⇄</span>
        </div>

        {/* Word B */}
        <div className="flex-1 text-center space-y-0.5 pl-3">
          <p className="kanji-font text-2xl font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {b.word}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">{b.reading}</p>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-snug mt-1">
            {meaning(b, lang)}
          </p>
        </div>
      </div>

      {/* Admin delete button */}
      {canEdit && (
        <button
          onClick={() => onDelete(pair.id)}
          title={t(lang as Parameters<typeof t>[0], 'antonyms_delete_pair')}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full
                     text-rose-400 hover:text-white hover:bg-rose-500
                     bg-rose-50 dark:bg-rose-900/20
                     opacity-0 group-hover:opacity-100 transition-all text-sm font-bold leading-none"
        >
          ×
        </button>
      )}
    </div>
  )
}

// ─── Word search for the "add pair" modal ───────────────────────────────────

function WordSearchInput({
  label,
  value,
  onSelect,
}: {
  label:    string
  value:    string
  onSelect: (word: string) => void
}) {
  const [query, setQuery]       = useState(value)
  const [results, setResults]   = useState<{ word: string; reading: string; meaning_es: string }[]>([])
  const [loading, setLoading]   = useState(false)
  const [open, setOpen]         = useState(false)
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wrapperRef              = useRef<HTMLDivElement>(null)

  // Keep query in sync when parent resets value
  useEffect(() => { if (!value) setQuery('') }, [value])

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleChange(q: string) {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); setOpen(false); return }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchVocabulary(q)
        setResults(data.slice(0, 8).map((d: { word: string; reading: string; meaning_es: string }) => ({
          word: d.word, reading: d.reading, meaning_es: d.meaning_es
        })))
        setOpen(true)
      } finally {
        setLoading(false)
      }
    }, 300)
  }

  function pick(word: string) {
    setQuery(word)
    setOpen(false)
    onSelect(word)
  }

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
        {label}
      </label>
      <input
        value={query}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="kanji, palabra..."
        className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl
                   focus:border-indigo-400 focus:outline-none
                   bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
        lang="ja"
      />
      {loading && (
        <span className="absolute right-3 top-8 text-slate-400 text-xs">...</span>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600
                        rounded-xl shadow-lg overflow-hidden">
          {results.map(r => (
            <button
              key={r.word}
              onMouseDown={() => pick(r.word)}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-900/20
                         text-left transition-colors"
            >
              <span className="kanji-font font-bold text-slate-800 dark:text-slate-100 shrink-0">{r.word}</span>
              <span className="text-slate-400 dark:text-slate-500 text-xs shrink-0">{r.reading}</span>
              <span className="text-slate-600 dark:text-slate-300 text-xs truncate">{r.meaning_es}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function VocabAntonyms() {
  const { state } = useStore()
  const lang    = state.lang
  const canEdit = state.role === 'admin' || state.role === 'contributor'

  const [pairs,   setPairs]   = useState<AntonymPair[]>([])
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<FilterType>('all')
  const [search,  setSearch]  = useState('')

  // Add pair modal
  const [showAdd,  setShowAdd]  = useState(false)
  const [wordA,    setWordA]    = useState('')
  const [wordB,    setWordB]    = useState('')
  const [adding,   setAdding]   = useState(false)
  const [addError, setAddError] = useState('')

  // Delete confirmation
  const [pendingDelete, setPendingDelete] = useState<number | null>(null)
  const [deleting,      setDeleting]      = useState(false)

  // Auto-detect antonyms
  const [autoDetecting,  setAutoDetecting]  = useState(false)
  const [autoDetectMsg,  setAutoDetectMsg]  = useState('')

  useEffect(() => {
    setLoading(true)
    fetchAntonymPairs()
      .then(setPairs)
      .catch(() => showToast(t(lang as Parameters<typeof t>[0], 'antonyms_load_error'), 'error'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    let result = pairs

    // Word-type filter
    if (filter === 'verb') {
      result = result.filter(p =>
        VERB_TYPES.has(p.word_a.word_type ?? '') || VERB_TYPES.has(p.word_b.word_type ?? '')
      )
    } else if (filter === 'adj') {
      result = result.filter(p =>
        ADJ_TYPES.has(p.word_a.word_type ?? '') || ADJ_TYPES.has(p.word_b.word_type ?? '')
      )
    }

    // Text search
    const q = search.trim().toLowerCase()
    if (q) {
      result = result.filter(p =>
        p.word_a.word.includes(search.trim())     ||
        p.word_b.word.includes(search.trim())     ||
        p.word_a.kanji.includes(search.trim())    ||
        p.word_b.kanji.includes(search.trim())    ||
        p.word_a.reading.toLowerCase().includes(q) ||
        p.word_b.reading.toLowerCase().includes(q) ||
        p.word_a.meaning_es.toLowerCase().includes(q) ||
        p.word_b.meaning_es.toLowerCase().includes(q) ||
        (p.word_a.meaning_en ?? '').toLowerCase().includes(q) ||
        (p.word_b.meaning_en ?? '').toLowerCase().includes(q)
      )
    }

    return result
  }, [pairs, filter, search])

  async function handleAdd() {
    if (!wordA.trim() || !wordB.trim()) {
      setAddError(t(lang as Parameters<typeof t>[0], 'antonyms_add_both_required'))
      return
    }
    if (wordA.trim() === wordB.trim()) {
      setAddError(t(lang as Parameters<typeof t>[0], 'antonyms_add_different'))
      return
    }
    setAdding(true)
    setAddError('')
    try {
      const result = await addAntonymPair(wordA.trim(), wordB.trim())
      if ((result as { already_exists?: boolean }).already_exists) {
        setAddError(t(lang as Parameters<typeof t>[0], 'antonyms_already_exists'))
        return
      }
      // Refresh list
      const updated = await fetchAntonymPairs()
      setPairs(updated)
      showToast(t(lang as Parameters<typeof t>[0], 'antonyms_added'), 'success')
      setWordA('')
      setWordB('')
      setShowAdd(false)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : t(lang as Parameters<typeof t>[0], 'antonyms_add_error'))
    } finally {
      setAdding(false)
    }
  }

  async function handleDelete() {
    if (pendingDelete === null) return
    setDeleting(true)
    try {
      await deleteAntonymPair(pendingDelete)
      setPairs(prev => prev.filter(p => p.id !== pendingDelete))
      showToast(t(lang as Parameters<typeof t>[0], 'antonyms_deleted'), 'success')
    } catch {
      showToast(t(lang as Parameters<typeof t>[0], 'antonyms_delete_error'), 'error')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  async function handleAutoDetect() {
    setAutoDetecting(true)
    setAutoDetectMsg('Revisando vocabulario…')
    try {
      let offset = 0
      let totalAdded = 0
      let scanned = 0
      let totalProposed = 0
      let totalMatched = 0
      // Page through the whole vocabulary; each page asks Gemini for the antonym
      // of every word and pairs it if that antonym exists in the dictionary.
      for (let page = 0; page < 200; page++) {
        const result = await runAutoDetectAntonyms({
          offset,
          geminiApiKey: state.geminiApiKey || undefined,
          model: state.geminiModel,
        })
        totalAdded += result.pairs_added
        scanned += result.fetched ?? 0
        totalProposed += result.proposed_count ?? 0
        totalMatched += result.matched_count ?? 0
        setAutoDetectMsg(`Revisando… ${scanned} palabras · ${totalAdded} pares · (IA propuso ${totalProposed}, existen ${totalMatched})`)
        if (result.pairs_added > 0) {
          const updated = await fetchAntonymPairs()
          setPairs(updated)
        }
        if (result.done || result.fetched == null) break
        offset = result.next_offset ?? offset + (result.fetched ?? 0)
        // Gentle pacing to stay under Gemini's per-minute limit.
        await new Promise(r => setTimeout(r, 1200))
      }
      setAutoDetectMsg(`✓ Completado · ${totalAdded} pares añadidos · ${scanned} palabras revisadas · IA propuso ${totalProposed} antónimos, ${totalMatched} existían en el vocabulario`)
      if (totalAdded > 0) showToast(`✓ ${totalAdded} pares de contrarios añadidos`, 'success')
    } catch (e: unknown) {
      setAutoDetectMsg(e instanceof Error ? e.message : 'Error en la detección automática')
    } finally {
      setAutoDetecting(false)
    }
  }

  const tl = (key: string) => t(lang as Parameters<typeof t>[0], key as Parameters<typeof t>[1])

  const FILTER_TABS: { key: FilterType; label: string }[] = [
    { key: 'all',  label: tl('antonyms_filter_all')  },
    { key: 'verb', label: tl('antonyms_filter_verbs') },
    { key: 'adj',  label: tl('antonyms_filter_adj')   },
  ]

  return (
    <div className="space-y-4">

      {/* Header + action buttons */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-slate-400 mt-0.5">
            {loading ? tl('antonyms_loading') : tl('antonyms_n_pairs').replace('{n}', String(pairs.length))}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Auto-detect button */}
            <button
              onClick={handleAutoDetect}
              disabled={autoDetecting}
              title="Detectar automáticamente pares de antónimos con Gemini"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700
                         disabled:opacity-50 disabled:cursor-not-allowed
                         text-white text-sm font-semibold rounded-xl transition shadow-sm shrink-0"
            >
              {autoDetecting
                ? <span className="animate-spin text-base leading-none">⟳</span>
                : <span className="text-base leading-none">🤖</span>
              }
              {autoDetecting ? 'Detectando…' : 'Auto-detectar'}
            </button>
            {/* Manual add button */}
            <button
              onClick={() => { setShowAdd(true); setAddError(''); setWordA(''); setWordB('') }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700
                         text-white text-sm font-semibold rounded-xl transition shadow-sm shrink-0"
            >
              <span className="text-base leading-none">＋</span>
              {tl('antonyms_add_pair')}
            </button>
          </div>
        )}
      </div>

      {/* Auto-detect result message */}
      {autoDetectMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl text-sm text-violet-700 dark:text-violet-300">
          <span>🤖</span>
          <span>{autoDetectMsg}</span>
          <button
            onClick={() => setAutoDetectMsg('')}
            className="ml-auto text-violet-400 hover:text-violet-600 text-lg leading-none"
          >×</button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
              filter === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-2.5 flex items-center gap-3">
        <span className="text-slate-400 shrink-0">🔍</span>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tl('antonyms_search_ph')}
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0"
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center text-slate-400 py-16">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">{tl('antonyms_loading')}</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-4xl">⇄</div>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {search || filter !== 'all'
              ? tl('antonyms_no_results')
              : tl('antonyms_empty')}
          </p>
          {!search && filter === 'all' && canEdit && (
            <p className="text-xs text-slate-400">
              {tl('antonyms_empty_hint')}
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map(pair => (
            <AntonymCard
              key={pair.id}
              pair={pair}
              lang={lang}
              canEdit={canEdit}
              onDelete={id => setPendingDelete(id)}
            />
          ))}
        </div>
      )}

      {/* ── Add pair modal ───────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                ⇄ {tl('antonyms_add_pair')}
              </h3>
              <button
                onClick={() => !adding && setShowAdd(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Two word inputs */}
            <div className="flex items-start gap-3">
              <WordSearchInput
                label={tl('antonyms_word_a')}
                value={wordA}
                onSelect={setWordA}
              />

              <div className="flex items-end pb-2 shrink-0 self-end">
                <span className="text-2xl text-slate-300 dark:text-slate-600">⇄</span>
              </div>

              <WordSearchInput
                label={tl('antonyms_word_b')}
                value={wordB}
                onSelect={setWordB}
              />
            </div>

            {/* Preview when both selected */}
            {wordA && wordB && (
              <div className="flex items-center justify-center gap-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl px-4 py-2">
                <span className="kanji-font text-xl font-bold text-indigo-700 dark:text-indigo-300">{wordA}</span>
                <span className="text-slate-400">⇄</span>
                <span className="kanji-font text-xl font-bold text-indigo-700 dark:text-indigo-300">{wordB}</span>
              </div>
            )}

            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setShowAdd(false)}
                disabled={adding}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition disabled:opacity-40"
              >
                {tl('glossary_cancel')}
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || !wordA || !wordB}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 min-w-[6rem] flex items-center justify-center gap-1.5"
              >
                {adding
                  ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                    </svg>
                  : null}
                {tl('antonyms_add_confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {pendingDelete !== null && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">⚠️ Confirmar</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {tl('antonyms_confirm_delete')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition disabled:opacity-40"
              >
                {tl('glossary_cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 min-w-[5rem]"
              >
                {deleting ? '...' : tl('glossary_delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
