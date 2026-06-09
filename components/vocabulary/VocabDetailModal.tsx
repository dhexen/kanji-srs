'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { t, getStageName, type Lang } from '@/lib/i18n'
import {
  VocabItem, MODE_CONFIG, ALL_REVIEW_MODES, getModeLevelAndDue, SRS_MAX_LEVEL, migrateItem,
} from '@/lib/srs'
import { fetchVocabReadingSegments, type FullVocabEntry } from '@/lib/supabase'
import { buildFurigana, hasKanji, type FuriSegment } from '@/lib/furigana'
import { upgradeVocabImage } from '@/lib/image'
import KanjiStrokeOrder from '@/components/review/KanjiStrokeOrder'

interface Props {
  entry: FullVocabEntry
  userItem: VocabItem | null
  lang: Lang
  onClose: () => void
}

function ui(lang: string, es: string, ca: string, en: string) {
  return lang === 'ca' ? ca : lang === 'en' ? en : es
}

export default function VocabDetailModal({ entry, userItem, lang, onClose }: Props) {
  const { addVocabItems } = useStore()
  const [shown, setShown] = useState(false)   // for the zoom-in transition
  const [adding, setAdding] = useState(false)
  const [added, setAdded] = useState(false)
  const [segments, setSegments] = useState<FuriSegment[] | null>(entry.reading_segments)

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Load curated per-kanji furigana on open (preferred over the heuristic).
  useEffect(() => {
    let cancelled = false
    fetchVocabReadingSegments(entry.word)
      .then(segs => { if (!cancelled && segs) setSegments(segs) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [entry.word])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const meaning =
    lang === 'ca' ? (entry.meaning_ca || entry.meaning_es) :
    lang === 'en' ? (entry.meaning_en || entry.meaning_es) :
    entry.meaning_es

  const { tokens, perKanjiReliable } = buildFurigana(entry.word, entry.reading, segments)
  const wordHasKanji = hasKanji(entry.word)
  const imgUrl = entry.image_url ? upgradeVocabImage(entry.image_url) : ''

  async function handleAdd() {
    setAdding(true)
    try {
      const now = Date.now()
      const base: VocabItem = {
        kanji: entry.kanji, jp: entry.word, reading: entry.reading,
        meaning: entry.meaning_es,
        ...(entry.meaning_ca ? { meaning_ca: entry.meaning_ca } : {}),
        ...(entry.meaning_en ? { meaning_en: entry.meaning_en } : {}),
        srsLevel: 1, due: now, status: 'active',
        ...(entry.image_url ? { image_url: entry.image_url } : {}),
        ...(entry.grade ? { grade: entry.grade } : {}),
        ...(entry.category ? { category: entry.category as VocabItem['category'] } : {}),
        ...(entry.word_type ? { word_type: entry.word_type as VocabItem['word_type'] } : {}),
      } as VocabItem
      await addVocabItems([migrateItem(base)])
      setAdded(true)
      showToast(ui(lang, 'Añadida a tus repasos', 'Afegida als teus repassos', 'Added to your reviews'), 'success')
    } catch {
      /* addVocabItems already toasts on error */
    } finally {
      setAdding(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className={`bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-lg max-h-[90vh] overflow-y-auto custom-scroll transition-all duration-200 ease-out ${
          shown ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {/* Header image (if any) */}
        {imgUrl && (
          <div className="w-full flex justify-center bg-slate-50 dark:bg-slate-900/40 pt-5 rounded-t-3xl">
            <img src={imgUrl} alt={meaning} className="h-40 sm:h-48 w-auto max-w-[80%] object-contain rounded-xl" />
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Close */}
          <div className="flex justify-end -mt-2 -mr-2">
            <button onClick={onClose} aria-label="Cerrar" className="text-slate-300 dark:text-slate-600 hover:text-rose-400 dark:hover:text-rose-400 font-bold text-2xl leading-none transition">✕</button>
          </div>

          {/* Word with furigana */}
          <div className="text-center">
            <div className="kanji-font text-5xl sm:text-6xl font-bold text-slate-900 dark:text-slate-50 leading-tight">
              {tokens.map((tk, i) => tk.ruby
                ? <ruby key={i}>{tk.text}<rt className="text-base font-normal text-indigo-400 tracking-tight">{tk.ruby}</rt></ruby>
                : <span key={i}>{tk.text}</span>)}
            </div>
            {/* Whole-word reading — always correct */}
            {wordHasKanji && (
              <p className="mt-2 text-lg text-slate-500 dark:text-slate-400 tracking-wider">{entry.reading}</p>
            )}
            {wordHasKanji && !perKanjiReliable && (
              <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-500">
                ⚠️ {ui(lang,
                  'Furigana por kanji aproximado (lectura completa correcta arriba)',
                  'Furigana per kanji aproximat (lectura completa correcta a dalt)',
                  'Per-kanji furigana approximate (full reading above is correct)')}
              </p>
            )}
          </div>

          {/* Meaning */}
          <p className="text-center text-lg text-slate-700 dark:text-slate-200 font-medium">{meaning}</p>

          {/* Badges: type / category / grade */}
          <div className="flex flex-wrap justify-center gap-1.5">
            {entry.word_type && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
                {t(lang, `wt_${entry.word_type}`)}
              </span>
            )}
            {entry.category && (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                {t(lang, `cat_${entry.category}`)}
              </span>
            )}
            {entry.grade ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
                📚 {lang === 'ja' ? `${entry.grade}年` : lang === 'en' ? `Grade ${entry.grade}` : lang === 'ca' ? `Curs ${entry.grade}` : `Curso ${entry.grade}`}
              </span>
            ) : null}
          </div>

          {/* Stroke order for each kanji */}
          {wordHasKanji && (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 text-center">
                {ui(lang, 'Orden de trazos', 'Ordre de traços', 'Stroke order')}
              </p>
              <div className="flex justify-center">
                <KanjiStrokeOrder kanji={entry.word} />
              </div>
            </div>
          )}

          {/* Per-mode SRS levels (if the user is studying this word) */}
          {userItem ? (
            <div className="pt-1">
              <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2 text-center">
                {ui(lang, 'Tu progreso', 'El teu progrés', 'Your progress')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {ALL_REVIEW_MODES.map(mode => {
                  const { level } = getModeLevelAndDue(userItem, mode)
                  const burned = level >= SRS_MAX_LEVEL
                  return (
                    <div key={mode} className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-700/50">
                      <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{t(lang, MODE_CONFIG[mode].label_key)}</span>
                      <span className={`text-xs font-bold shrink-0 ${burned ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {getStageName(level, lang)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <button
              onClick={handleAdd}
              disabled={adding || added}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-sm"
            >
              {added
                ? `✓ ${ui(lang, 'Añadida', 'Afegida', 'Added')}`
                : adding
                ? '⏳…'
                : `📚 ${ui(lang, 'Añadir a mis repasos', 'Afegir als meus repassos', 'Add to my reviews')}`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
