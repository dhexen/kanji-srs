'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { fetchAllVocabByGrade, FullVocabEntry } from '@/lib/supabase'
import { deleteVocabWord, updateVocabWord } from '@/lib/admin-client'
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

export default function VocabGlossary() {
  const { state } = useStore()
  const lang = state.lang
  const isAdmin    = state.role === 'admin'
  const canEdit    = state.role === 'admin' || state.role === 'contributor'

  const [grade, setGrade] = useState(1)
  const [words, setWords] = useState<FullVocabEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

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

  useEffect(() => {
    setLoading(true)
    setFilter('')
    fetchAllVocabByGrade(grade)
      .then(data => setWords(data))
      .catch(() => { setWords([]); showToast('Error cargando vocabulario', 'error') })
      .finally(() => setLoading(false))
  }, [grade])

  const meaning = (v: FullVocabEntry) =>
    lang === 'ca' && v.meaning_ca ? v.meaning_ca
    : lang === 'en' && v.meaning_en ? v.meaning_en
    : v.meaning_es

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return words
    return words.filter(w =>
      w.word.includes(filter.trim()) ||
      w.kanji.includes(filter.trim()) ||
      w.reading.toLowerCase().includes(q) ||
      w.meaning_es.toLowerCase().includes(q) ||
      (w.meaning_en?.toLowerCase().includes(q)) ||
      (w.meaning_ca?.toLowerCase().includes(q))
    )
  }, [words, filter])

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

  const gradeLabel = (g: typeof GRADES[0]) =>
    g.label[lang as keyof typeof g.label] ?? g.label.es

  const kanjiKeys = Object.keys(grouped)

  return (
    <div className="space-y-4">

      {/* Grade tabs — grouped */}
      <div className="space-y-2">
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

      {/* Search bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm px-4 py-2.5 flex items-center gap-3">
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

      {/* Summary */}
      {!loading && (
        <p className="text-xs text-slate-400 px-1">
          {t(lang, 'glossary_words_n').replace('{n}', String(filtered.length))}
          {' · '}
          {kanjiKeys.length} kanjis
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="text-center text-slate-400 py-16">
          <div className="text-3xl mb-2">⏳</div>
          <p className="text-sm">{t(lang, 'glossary_loading')}</p>
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
                  <span className="text-xs text-indigo-400 dark:text-indigo-500 font-medium">
                    {kanjiWords.length} {t(lang, 'study_words')}
                  </span>
                </div>

                {/* Word rows */}
                <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {kanjiWords.map(w => (
                    <div
                      key={w.word}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-700/50 transition group ${
                        !w.is_official ? 'bg-red-50/40 dark:bg-red-900/10' : ''
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

                      {/* Unofficial badge */}
                      {!w.is_official && (
                        <span className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 px-1.5 py-0.5 rounded shrink-0">
                          {t(lang, 'vocab_unofficial')}
                        </span>
                      )}

                      {/* Edit button (admin + contributor) */}
                      {canEdit && (
                        <button
                          onClick={() => openEdit(w)}
                          title={t(lang, 'glossary_edit_btn')}
                          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full
                                     text-indigo-400 hover:text-white hover:bg-indigo-500
                                     bg-indigo-50 opacity-0 group-hover:opacity-100
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
                                     bg-rose-50 opacity-0 group-hover:opacity-100
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
                ? 'Aquest canvi s\'aplicarà a tots els usuaris.'
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
    </div>
  )
}
