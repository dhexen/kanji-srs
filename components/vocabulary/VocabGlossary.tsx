'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { fetchAllVocabByGrade, FullVocabEntry } from '@/lib/supabase'
import { deleteVocabWord } from '@/lib/admin-client'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

const GRADES = [
  { value: 1, label: { es: '1º Primaria', ca: '1r Primària', en: '1st Grade', ja: '小1' } },
  { value: 2, label: { es: '2º Primaria', ca: '2n Primària', en: '2nd Grade', ja: '小2' } },
  { value: 3, label: { es: '3º Primaria', ca: '3r Primària', en: '3rd Grade', ja: '小3' } },
]

export default function VocabGlossary() {
  const { state } = useStore()
  const lang = state.lang
  const isAdmin = state.role === 'admin'

  const [grade, setGrade] = useState(1)
  const [words, setWords] = useState<FullVocabEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const gradeLabel = (g: typeof GRADES[0]) =>
    g.label[lang as keyof typeof g.label] ?? g.label.es

  const kanjiKeys = Object.keys(grouped)

  return (
    <div className="space-y-4">

      {/* Grade tabs */}
      <div className="flex gap-2 flex-wrap">
        {GRADES.map(g => (
          <button
            key={g.value}
            onClick={() => setGrade(g.value)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              grade === g.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
            }`}
          >
            🏫 {gradeLabel(g)}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-2.5 flex items-center gap-3">
        <span className="text-slate-400 shrink-0">🔍</span>
        <input
          type="text"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder={t(lang, 'vocab_search_ph')}
          className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
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
              <div key={kanji} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Kanji header */}
                <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-3">
                  <span className="kanji-font text-2xl font-bold text-indigo-600 leading-none">{kanji}</span>
                  <span className="text-xs text-indigo-400 font-medium">
                    {kanjiWords.length} {t(lang, 'study_words')}
                  </span>
                </div>

                {/* Word rows */}
                <div className="divide-y divide-slate-50">
                  {kanjiWords.map(w => (
                    <div
                      key={w.word}
                      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition group ${
                        !w.is_official ? 'bg-red-50/40' : ''
                      }`}
                    >
                      {/* Word */}
                      <span className="kanji-font text-base font-bold text-slate-800 leading-none min-w-[3.5rem] shrink-0">
                        {w.word}
                      </span>

                      {/* Reading */}
                      <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg font-medium min-w-[4rem] text-center shrink-0">
                        {w.reading}
                      </span>

                      {/* Meaning */}
                      <span className="flex-1 text-sm text-slate-600 leading-snug min-w-0">
                        {meaning(w)}
                      </span>

                      {/* Unofficial badge */}
                      {!w.is_official && (
                        <span className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 px-1.5 py-0.5 rounded shrink-0">
                          {t(lang, 'vocab_unofficial')}
                        </span>
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

      {/* Delete confirmation modal */}
      {pendingDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100">
            <button
              onClick={() => !deleting && setPendingDelete(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-xl leading-none"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-2">⚠️ Confirmar</h3>
            <p className="text-sm text-slate-500 mb-6">
              {t(lang, 'glossary_confirm_delete').replace('{word}', pendingDelete)}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setPendingDelete(null)}
                disabled={deleting}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition disabled:opacity-40"
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
    </div>
  )
}
