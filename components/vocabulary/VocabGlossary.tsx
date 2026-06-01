'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { fetchAllVocabByGrade, fetchAllVocab, searchVocabGlossary, FullVocabEntry } from '@/lib/supabase'
import { deleteVocabWord, updateVocabWord, addVocabWord, runFillAdjectives } from '@/lib/admin-client'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

const GRADES = [
  { value: 1, group: 'primary',   label: { es: '1º Prim.', ca: '1r Prim.', en: '1st', ja: '小1' } },
  { value: 2, group: 'primary',   label: { es: '2º Prim.', ca: '2n Prim.', en: '2nd', ja: '小2' } },
  { value: 3, group: 'primary',   label: { es: '3º Prim.', ca: '3r Prim.', en: '3rd', ja: '小3' } },
  { value: 4, group: 'primary',   label: { es: '4º Prim.', ca: '4t Prim.', en: '4th', ja: '小4' } },
  { value: 5, group: 'primary',   label: { es: '5º Prim.', ca: '5è Prim.', en: '5th', ja: '小5' } },
  { value: 6, group: 'primary',   label: { es: '6º Prim.', ca: '6è Prim.', en: '6th', ja: '小6' } },
  { value: 7, group: 'secondary', label: { es: '1º Sec.',  ca: '1r Sec.',  en: '7th', ja: '中1' } },
  { value: 8, group: 'secondary', label: { es: '2º Sec.',  ca: '2n Sec.',  en: '8th', ja: '中2' } },
  { value: 9, group: 'secondary', label: { es: '3º Sec.',  ca: '3r Sec.',  en: '9th', ja: '中3' } },
]
const PRIMARY_GRADES   = GRADES.filter(g => g.group === 'primary')
const SECONDARY_GRADES = GRADES.filter(g => g.group === 'secondary')

// Regex: CJK Unified Ideographs (main BMP ranges)
const KANJI_RE = /[一-鿿㐀-䶿]/gu

function detectKanji(str: string): string[] {
  return Array.from(new Set(str.match(KANJI_RE) ?? []))
}

export default function VocabGlossary() {
  const { state } = useStore()
  const lang = state.lang
  const isAdmin    = state.role === 'admin'
  const canEdit    = state.role === 'admin' || state.role === 'contributor'

  const [grade, setGrade] = useState(0)  // 0 = all grades
  const [words, setWords] = useState<FullVocabEntry[]>([])
  const [searchResults, setSearchResults] = useState<FullVocabEntry[] | null>(null) // null = not searching
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [filter, setFilter] = useState('')
  const [showUnofficial, setShowUnofficial] = useState(true)

  // Delete state
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Edit state
  const [pendingEdit, setPendingEdit] = useState<FullVocabEntry | null>(null)
  const [editReading,   setEditReading]   = useState('')
  const [editMeaningEs, setEditMeaningEs] = useState('')
  const [editMeaningCa, setEditMeaningCa] = useState('')
  const [editMeaningEn, setEditMeaningEn] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')

  // Add word state
  const [showAddModal, setShowAddModal]       = useState(false)
  const [addWord,       setAddWord]           = useState('')
  const [addReading,    setAddReading]        = useState('')
  const [addMeaningEs,  setAddMeaningEs]      = useState('')
  const [addMeaningCa,  setAddMeaningCa]      = useState('')
  const [addMeaningEn,  setAddMeaningEn]      = useState('')
  const [addSaving,     setAddSaving]         = useState(false)
  const [addError,      setAddError]          = useState('')
  // Pre-selected kanji for the "+" icon inside a kanji section (hint only)
  const [addHintKanji,  setAddHintKanji]      = useState('')

  // Promote/demote state
  const [promotingWord, setPromotingWord] = useState<string | null>(null)

  // Fill adjectives state
  const [fillingAdj, setFillingAdj]     = useState(false)
  const [fillAdjMsg, setFillAdjMsg]     = useState('')

  // Load page data when grade changes
  useEffect(() => {
    setLoading(true)
    setFilter('')
    setSearchResults(null)
    const fetch = grade === 0 ? fetchAllVocab() : fetchAllVocabByGrade(grade)
    fetch
      .then(data => setWords(data))
      .catch(() => { setWords([]); showToast('Error cargando vocabulario', 'error') })
      .finally(() => setLoading(false))
  }, [grade])

  // Server-side search with debounce — runs across ALL rows of the selected grade
  useEffect(() => {
    const q = filter.trim()
    if (!q) { setSearchResults(null); return }
    setSearching(true)
    const timer = setTimeout(() => {
      searchVocabGlossary(q, grade)
        .then(data => setSearchResults(data))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [filter, grade])

  const meaning = (v: FullVocabEntry) =>
    lang === 'ca' && v.meaning_ca ? v.meaning_ca
    : lang === 'en' && v.meaning_en ? v.meaning_en
    : v.meaning_es

  // When searching: use server results filtered by showUnofficial toggle.
  // When browsing: client-side filter on the loaded page (1000 rows per grade).
  const filtered = useMemo(() => {
    const base = searchResults ?? words
    if (!showUnofficial) return base.filter(w => w.is_official)
    return base
  }, [words, searchResults, showUnofficial])

  // Group by kanji, preserving sort order from the DB
  const grouped = useMemo(() => {
    const map: Record<string, FullVocabEntry[]> = {}
    for (const w of filtered) {
      if (!map[w.kanji]) map[w.kanji] = []
      map[w.kanji].push(w)
    }
    return map
  }, [filtered])

  // ── Delete ──────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteVocabWord(pendingDelete)
      setWords(prev => prev.filter(w => w.word !== pendingDelete))
      showToast(t(lang, 'glossary_deleted'), 'success')
    } catch {
      showToast(t(lang, 'glossary_error'), 'error')
    } finally {
      setDeleting(false)
      setPendingDelete(null)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────
  function openEdit(w: FullVocabEntry) {
    setPendingEdit(w)
    setEditReading(w.reading)
    setEditMeaningEs(w.meaning_es)
    setEditMeaningCa(w.meaning_ca ?? '')
    setEditMeaningEn(w.meaning_en ?? '')
    setEditError('')
  }

  async function confirmEdit() {
    if (!pendingEdit) return
    const trimReading = editReading.trim()
    const trimEs      = editMeaningEs.trim()
    if (!trimReading) { setEditError('La lectura no puede estar vacía.'); return }
    if (!trimEs)      { setEditError('El significado en español no puede estar vacío.'); return }

    setEditSaving(true)
    setEditError('')
    try {
      await updateVocabWord(pendingEdit.word, {
        reading:    trimReading,
        meaning_es: trimEs,
        meaning_ca: editMeaningCa.trim() || null,
        meaning_en: editMeaningEn.trim() || null,
      })
      // Update local state so change is immediately visible
      setWords(prev => prev.map(w =>
        w.word !== pendingEdit.word ? w : {
          ...w,
          reading:    trimReading,
          meaning_es: trimEs,
          meaning_ca: editMeaningCa.trim() || null,
          meaning_en: editMeaningEn.trim() || null,
        }
      ))
      showToast(t(lang, 'glossary_saved'), 'success')
      setPendingEdit(null)
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : t(lang, 'glossary_edit_error'))
    } finally {
      setEditSaving(false)
    }
  }

  // ── Add word ──────────────────────────────────────────────────────────────
  function openAddModal(hintKanji = '') {
    setAddWord('')
    setAddReading('')
    setAddMeaningEs('')
    setAddMeaningCa('')
    setAddMeaningEn('')
    setAddError('')
    setAddHintKanji(hintKanji)
    setShowAddModal(true)
  }

  async function confirmAdd() {
    const trimWord    = addWord.trim()
    const trimReading = addReading.trim()
    const trimEs      = addMeaningEs.trim()
    if (!trimWord)    { setAddError('La palabra (kanji) es obligatoria.'); return }
    if (!trimReading) { setAddError('La lectura es obligatoria.'); return }
    if (!trimEs)      { setAddError('El significado en español es obligatorio.'); return }

    setAddSaving(true)
    setAddError('')
    try {
      const result = await addVocabWord({
        word: trimWord, reading: trimReading, meaning_es: trimEs,
        meaning_ca: addMeaningCa.trim() || undefined,
        meaning_en: addMeaningEn.trim() || undefined,
      })
      // Add new entries to local state for the current grade view
      const newEntries: FullVocabEntry[] = result.kanjis
        .filter(k => k.grade === grade)
        .map(k => ({
          word: trimWord,
          kanji: k.kanji,
          reading: trimReading,
          meaning_es: trimEs,
          meaning_ca: addMeaningCa.trim() || null,
          meaning_en: addMeaningEn.trim() || null,
          is_official: false,
          sort_order: 99999,
        }))
      if (newEntries.length > 0) {
        setWords(prev => [...prev, ...newEntries])
      }
      showToast(
        t(lang, 'glossary_add_success').replace('{n}', String(result.count)),
        'success',
      )
      setShowAddModal(false)
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : 'Error añadiendo la palabra')
    } finally {
      setAddSaving(false)
    }
  }

  // ── Promote / demote ──────────────────────────────────────────────────────
  async function toggleOfficial(w: FullVocabEntry) {
    if (promotingWord) return
    setPromotingWord(w.word)
    try {
      await updateVocabWord(w.word, { is_official: !w.is_official })
      setWords(prev => prev.map(v =>
        v.word !== w.word ? v : { ...v, is_official: !w.is_official, sort_order: w.is_official ? 99999 : v.sort_order }
      ))
      showToast(
        w.is_official ? t(lang, 'glossary_demoted') : t(lang, 'glossary_promoted'),
        'success',
      )
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setPromotingWord(null)
    }
  }

  const gradeLabel = (g: typeof GRADES[0]) =>
    g.label[lang as keyof typeof g.label] ?? g.label.es

  const kanjiKeys = Object.keys(grouped)

  async function handleFillAdjectives() {
    setFillingAdj(true)
    setFillAdjMsg('')
    try {
      const result = await runFillAdjectives({
        grade: grade > 0 ? grade : undefined,
        geminiApiKey: state.geminiApiKey || undefined,
        debug: true,
      })
      console.log('[fill-adjectives] result:', result)
      if ((result as any).debug) console.log('[fill-adjectives] debug:', (result as any).debug)
      setFillAdjMsg(result.message)
      if (result.added > 0) {
        const fetch = grade === 0 ? fetchAllVocab() : fetchAllVocabByGrade(grade)
        fetch.then(setWords).catch(() => {})
        showToast(`✓ ${result.added} adjetivos añadidos`, 'success')
      }
    } catch (e: unknown) {
      setFillAdjMsg(e instanceof Error ? e.message : 'Error')
    } finally {
      setFillingAdj(false)
    }
  }

  // Kanji chars detected in the add modal input (for the hint preview)
  const detectedKanjiInInput = detectKanji(addWord)

  return (
    <div className="space-y-4">

      {/* Grade tabs — grouped */}
      <div className="space-y-2">
        {/* All grades button */}
        <button
          onClick={() => setGrade(0)}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
            grade === 0
              ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm'
              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-slate-400 dark:hover:border-slate-400'
          }`}
        >
          {lang === 'en' ? 'All' : lang === 'ja' ? '全て' : lang === 'ca' ? 'Tot' : 'Todo'}
        </button>

        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide self-center pr-1 shrink-0">
            {lang === 'en' ? 'Elem.' : lang === 'ja' ? '小学' : lang === 'ca' ? 'Prim.' : 'Prim.'}
          </span>
          {PRIMARY_GRADES.map(g => (
            <button
              key={g.value}
              onClick={() => setGrade(g.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                grade === g.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-indigo-300 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide self-center pr-1 shrink-0">
            {lang === 'en' ? 'Mid.' : lang === 'ja' ? '中学' : lang === 'ca' ? 'Sec.' : 'Sec.'}
          </span>
          {SECONDARY_GRADES.map(g => (
            <button
              key={g.value}
              onClick={() => setGrade(g.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                grade === g.value
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-600 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              {gradeLabel(g)}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar: search + toggles + add button */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search bar */}
        <div className="flex-1 min-w-[180px] bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-2.5 flex items-center gap-3">
          <span className="text-slate-400 shrink-0">🔍</span>
          <input
            type="text"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            placeholder={t(lang, 'vocab_search_ph')}
            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-100"
          />
          {filter && (
            <button
              onClick={() => setFilter('')}
              className="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0"
            >
              ×
            </button>
          )}
        </div>

        {/* Toggle non-official visibility */}
        <button
          onClick={() => setShowUnofficial(v => !v)}
          title={showUnofficial ? t(lang, 'glossary_hide_unofficial') : t(lang, 'glossary_show_unofficial')}
          className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-all shrink-0 ${
            showUnofficial
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50 text-amber-700 dark:text-amber-400 hover:bg-amber-100'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-amber-300'
          }`}
        >
          {showUnofficial ? '👁 ' : '🚫 '}
          {showUnofficial ? t(lang, 'glossary_hide_unofficial') : t(lang, 'glossary_show_unofficial')}
        </button>

        {/* Fill missing adjectives (admin only) */}
        {isAdmin && (
          <button
            onClick={handleFillAdjectives}
            disabled={fillingAdj || grade === 0}
            title={grade === 0
              ? 'Selecciona un curso específico (el límite de la API no permite procesar todo a la vez)'
              : `Buscar adjetivos faltantes en ${gradeLabel(GRADES[grade - 1])}`}
            className="px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            {fillingAdj
              ? <span className="animate-spin text-sm leading-none">⟳</span>
              : <span className="text-sm leading-none">🔤</span>
            }
            {fillingAdj ? 'Buscando…' : 'Rellenar adj.'}
          </button>
        )}

        {/* Add word button (admin + contributor) */}
        {canEdit && (
          <button
            onClick={() => openAddModal()}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t(lang, 'glossary_add_btn')}
          </button>
        )}
      </div>

      {/* Fill adjectives result */}
      {fillAdjMsg && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl text-sm text-violet-700 dark:text-violet-300">
          <span>🔤</span>
          <span className="flex-1">{fillAdjMsg}</span>
          <button onClick={() => setFillAdjMsg('')} className="text-violet-400 hover:text-violet-600 text-lg leading-none">×</button>
        </div>
      )}

      {/* Summary */}
      {!loading && !searching && (
        <p className="text-xs text-slate-400 px-1">
          {t(lang, 'glossary_words_n').replace('{n}', String(filtered.length))}
          {' · '}
          {kanjiKeys.length} kanjis
          {!showUnofficial && words.some(w => !w.is_official) && (
            <span className="ml-1 text-amber-500">
              · {words.filter(w => !w.is_official).length} ocultas
            </span>
          )}
        </p>
      )}

      {/* Content */}
      {loading || searching ? (
        <div className="text-center text-slate-400 py-16">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">{searching ? '🔍 Buscando…' : t(lang, 'glossary_loading')}</p>
        </div>
      ) : kanjiKeys.length === 0 ? (
        <p className="text-center text-slate-400 py-12 text-sm">
          {filter
            ? t(lang, 'vocab_no_results').replace('{q}', filter)
            : '—'}
        </p>
      ) : (
        <div className="space-y-3">
          {kanjiKeys.map(kanji => {
            const kanjiWords = grouped[kanji]
            return (
              <div key={kanji} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                {/* Kanji header */}
                <div className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
                  <span className="kanji-font text-2xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">{kanji}</span>
                  <span className="text-xs text-indigo-400 dark:text-indigo-500 font-medium flex-1">
                    {kanjiWords.length} {t(lang, 'study_words')}
                  </span>
                  {/* Per-kanji add word button */}
                  {canEdit && (
                    <button
                      onClick={() => openAddModal(kanji)}
                      title={t(lang, 'glossary_add_btn')}
                      className="w-6 h-6 flex items-center justify-center rounded-full
                                 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white
                                 bg-emerald-50 dark:bg-emerald-900/30 transition-all"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>

                {/* Word rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {kanjiWords.map(w => (
                    <div
                      key={w.word}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition group ${
                        !w.is_official ? 'bg-amber-50/30 dark:bg-amber-900/10' : ''
                      }`}
                    >
                      {/* Word */}
                      <span className="kanji-font text-base font-bold text-slate-800 dark:text-slate-100 leading-none min-w-[3.5rem] shrink-0">
                        {w.word}
                      </span>

                      {/* Reading */}
                      <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg font-medium min-w-[4rem] text-center shrink-0">
                        {w.reading}
                      </span>

                      {/* Meaning */}
                      <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 leading-snug min-w-0">
                        {meaning(w)}
                      </span>

                      {/* Unofficial badge + promote button */}
                      {!w.is_official && (
                        <span className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700/50 px-1.5 py-0.5 rounded">
                            {t(lang, 'vocab_unofficial')}
                          </span>
                          {canEdit && (
                            <button
                              onClick={() => toggleOfficial(w)}
                              disabled={promotingWord === w.word}
                              title={t(lang, 'glossary_promote_btn')}
                              className="w-5 h-5 flex items-center justify-center rounded-full
                                         text-emerald-500 hover:text-white hover:bg-emerald-500
                                         bg-emerald-50 dark:bg-emerald-900/30
                                         opacity-0 group-hover:opacity-100 transition-all
                                         disabled:opacity-40"
                            >
                              {promotingWord === w.word
                                ? <span className="text-[8px]">…</span>
                                : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                              }
                            </button>
                          )}
                        </span>
                      )}

                      {/* Demote official → unofficial (admin/contributor) */}
                      {w.is_official && canEdit && (
                        <button
                          onClick={() => toggleOfficial(w)}
                          disabled={promotingWord === w.word}
                          title={t(lang, 'glossary_demote_btn')}
                          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full
                                     text-slate-300 hover:text-amber-600 hover:bg-amber-50
                                     opacity-0 group-hover:opacity-100 transition-all
                                     disabled:opacity-40 hidden"
                          // Hidden by default — only show for non-curriculum words someday
                        >
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* Edit button (admin + contributor) */}
                      {canEdit && (
                        <button
                          onClick={() => openEdit(w)}
                          title={t(lang, 'glossary_edit_btn')}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                                     text-indigo-400 hover:text-white hover:bg-indigo-500
                                     bg-indigo-50 dark:bg-indigo-900/30 opacity-0 group-hover:opacity-100
                                     transition-all"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}

                      {/* Admin delete button */}
                      {isAdmin && (
                        <button
                          onClick={() => setPendingDelete(w.word)}
                          title={t(lang, 'glossary_delete_btn')}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                                     text-rose-400 hover:text-white hover:bg-rose-500
                                     bg-rose-50 dark:bg-rose-900/30 opacity-0 group-hover:opacity-100
                                     transition-all text-sm font-bold leading-none"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Delete confirmation modal ─────────────────────────────────────── */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => !deleting && setPendingDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-2">⚠️ Confirmar</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              {t(lang, 'glossary_confirm_delete').replace('{word}', pendingDelete)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition disabled:opacity-40"
              >
                {t(lang, 'glossary_cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 min-w-[5rem]"
              >
                {deleting ? '...' : t(lang, 'glossary_delete_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {pendingEdit && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="kanji-font text-3xl font-bold text-indigo-600 dark:text-indigo-400 leading-none">
                  {pendingEdit.kanji}
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {t(lang, 'glossary_edit_title')}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{pendingEdit.word}</p>
                </div>
              </div>
              <button
                onClick={() => !editSaving && setPendingEdit(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Note: propagates to all users */}
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              ⚠️{' '}
              {lang === 'en'
                ? 'This change will apply to all users.'
                : lang === 'ca'
                ? "Aquest canvi s'aplicarà a tots els usuaris."
                : 'Este cambio se aplicará a todos los usuarios.'}
            </p>

            {/* Fields */}
            <div className="space-y-3">
              {/* Reading */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {t(lang, 'glossary_edit_reading')}
                </label>
                <input
                  value={editReading}
                  onChange={e => setEditReading(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:border-indigo-400 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium"
                  lang="ja"
                />
              </div>

              {/* Meanings */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  {lang === 'en' ? 'Meanings' : lang === 'ca' ? 'Significats' : 'Significados'}
                </label>
                {([
                  { code: 'ES', val: editMeaningEs, set: setEditMeaningEs, required: true },
                  { code: 'CA', val: editMeaningCa, set: setEditMeaningCa, required: false },
                  { code: 'EN', val: editMeaningEn, set: setEditMeaningEn, required: false },
                ] as const).map(({ code, val, set, required }) => (
                  <div key={code} className="flex items-center gap-2">
                    <span className="w-7 text-[10px] font-bold text-slate-400 shrink-0">{code}</span>
                    <input
                      value={val}
                      onChange={e => set(e.target.value)}
                      placeholder={required ? '' : lang === 'en' ? 'optional' : lang === 'ca' ? 'opcional' : 'opcional'}
                      className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            {editError && (
              <p className="text-xs text-red-600 dark:text-red-400">{editError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setPendingEdit(null)}
                disabled={editSaving}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition disabled:opacity-40"
              >
                {t(lang, 'glossary_cancel')}
              </button>
              <button
                onClick={confirmEdit}
                disabled={editSaving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 min-w-[5rem] flex items-center justify-center gap-1.5"
              >
                {editSaving && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                )}
                {editSaving ? '...' : `💾 ${t(lang, 'glossary_edit_save')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add word modal ────────────────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  ✨ {t(lang, 'glossary_add_title')}
                </h3>
                {addHintKanji && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    Kanji: <span className="kanji-font font-bold text-indigo-500">{addHintKanji}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => !addSaving && setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Note: non-official */}
            <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2">
              📝{' '}
              {lang === 'en'
                ? 'The word will be added as unofficial and will be visible to all users. Admins and contributors can promote it to official.'
                : lang === 'ca'
                ? "La paraula s'afegirà com a no oficial i serà visible per a tots els usuaris. Admins i contribuïdors poden promoure-la a oficial."
                : 'La palabra se añadirá como no oficial y será visible para todos los usuarios. Admins y contribuidores pueden promoverla a oficial.'}
            </p>

            {/* Word input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {lang === 'en' ? 'Word (kanji)' : lang === 'ca' ? 'Paraula (kanji)' : 'Palabra (kanji)'}
              </label>
              <input
                value={addWord}
                onChange={e => setAddWord(e.target.value)}
                placeholder={t(lang, 'glossary_add_word_ph')}
                className="w-full px-3 py-2 text-base border border-slate-200 dark:border-slate-600 rounded-xl focus:border-emerald-400 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 kanji-font font-bold"
                lang="ja"
                autoFocus
              />
              {/* Detected kanjis preview */}
              {addWord.trim() ? (
                detectedKanjiInInput.length > 0 ? (
                  <p className="text-[11px] text-slate-400 pt-0.5">
                    {t(lang, 'glossary_add_detecting')}{' '}
                    {detectedKanjiInInput.map(k => (
                      <span key={k} className="kanji-font font-bold text-indigo-500 mr-1">{k}</span>
                    ))}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-600 pt-0.5">
                    {t(lang, 'glossary_add_no_kanji')}
                  </p>
                )
              ) : null}
            </div>

            {/* Reading */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t(lang, 'glossary_edit_reading')} (hiragana)
              </label>
              <input
                value={addReading}
                onChange={e => setAddReading(e.target.value)}
                placeholder={t(lang, 'glossary_add_reading_ph')}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-xl focus:border-emerald-400 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium"
                lang="ja"
              />
            </div>

            {/* Meanings */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {lang === 'en' ? 'Meanings' : lang === 'ca' ? 'Significats' : 'Significados'}
              </label>
              {([
                { code: 'ES', val: addMeaningEs, set: setAddMeaningEs, required: true,  ph: t(lang, 'glossary_add_meaning_ph') },
                { code: 'CA', val: addMeaningCa, set: setAddMeaningCa, required: false, ph: lang === 'en' ? 'optional' : 'opcional' },
                { code: 'EN', val: addMeaningEn, set: setAddMeaningEn, required: false, ph: lang === 'en' ? 'optional' : 'opcional' },
              ] as const).map(({ code, val, set, required, ph }) => (
                <div key={code} className="flex items-center gap-2">
                  <span className="w-7 text-[10px] font-bold text-slate-400 shrink-0">
                    {code}{required && <span className="text-red-400">*</span>}
                  </span>
                  <input
                    value={val}
                    onChange={e => set(e.target.value)}
                    placeholder={ph}
                    className="flex-1 px-3 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-emerald-400 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
                  />
                </div>
              ))}
            </div>

            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
            )}

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={() => setShowAddModal(false)}
                disabled={addSaving}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold rounded-xl text-sm transition disabled:opacity-40"
              >
                {t(lang, 'glossary_cancel')}
              </button>
              <button
                onClick={confirmAdd}
                disabled={addSaving || detectedKanjiInInput.length === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition disabled:opacity-40 min-w-[7rem] flex items-center justify-center gap-1.5"
              >
                {addSaving && (
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                )}
                {addSaving ? '...' : t(lang, 'glossary_add_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
