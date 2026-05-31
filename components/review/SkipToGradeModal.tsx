'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { masterItem, migrateItem, VocabItem, MODE_CONFIG } from '@/lib/srs'
import { getVocabCountBelowGrade, getVocabularyBelowGrade } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

const GRADE_LABEL: Record<number, Record<string, string>> = {
  1: { es: '1º Primaria',  ca: '1r Primària',  en: '1st Grade', ja: '小1' },
  2: { es: '2º Primaria',  ca: '2n Primària',  en: '2nd Grade', ja: '小2' },
  3: { es: '3º Primaria',  ca: '3r Primària',  en: '3rd Grade', ja: '小3' },
  4: { es: '4º Primaria',  ca: '4t Primària',  en: '4th Grade', ja: '小4' },
  5: { es: '5º Primaria',  ca: '5è Primària',  en: '5th Grade', ja: '小5' },
  6: { es: '6º Primaria',  ca: '6è Primària',  en: '6th Grade', ja: '小6' },
  7: { es: '1º Sec.',      ca: '1r Sec.',      en: '7th Grade', ja: '中1' },
  8: { es: '2º Sec.',      ca: '2n Sec.',      en: '8th Grade', ja: '中2' },
  9: { es: '3º Sec.',      ca: '3r Sec.',      en: '9th Grade', ja: '中3' },
}

const L = {
  title:    { es: 'Empezar desde un curso', ca: 'Començar des d\'un curs', en: 'Start from a grade', ja: '学年から開始' },
  subtitle: { es: 'Selecciona el curso desde el que quieres empezar. Todas las palabras de cursos anteriores se marcarán como ya sabidas.', ca: 'Selecciona el curs des del qual vols començar. Totes les paraules de cursos anteriors es marcaran com ja sabudes.', en: 'Select the grade you want to start from. All words from previous grades will be marked as already known.', ja: '開始する学年を選択してください。前の学年の単語はすべて既知としてマークされます。' },
  from:     { es: 'Quiero empezar desde', ca: 'Vull començar des de', en: 'I want to start from', ja: '開始学年' },
  marks:    { es: 'Se marcarán como sabidas', ca: 'Es marcaran com a sabudes', en: 'Will be marked as known', ja: '既知としてマーク' },
  words:    { es: 'palabras', ca: 'paraules', en: 'words', ja: '単語' },
  fromGrades: { es: 'de los cursos anteriores', ca: 'dels cursos anteriors', en: 'from previous grades', ja: '前の学年から' },
  alreadyIn:  { es: 'Las palabras que ya tienes en estudio también se marcarán como sabidas.', ca: 'Les paraules que ja tens en estudi també es marcaran com a sabudes.', en: 'Words already in your study list will also be marked as known.', ja: '既に学習中の単語も既知としてマークされます。' },
  cancel:   { es: 'Cancelar', ca: 'Cancel·lar', en: 'Cancel', ja: 'キャンセル' },
  confirm:  { es: 'Marcar como sabidas', ca: 'Marcar com a sabudes', en: 'Mark as known', ja: '既知としてマーク' },
  loading:  { es: 'Procesando...', ca: 'Processant...', en: 'Processing...', ja: '処理中...' },
  counting: { es: 'Contando...', ca: 'Comptant...', en: 'Counting...', ja: '数えています...' },
  success:  { es: 'palabras marcadas como ya sabidas', ca: 'paraules marcades com a sabudes', en: 'words marked as known', ja: '単語を既知としてマーク' },
  noWords:  { es: 'No hay cursos anteriores para marcar.', ca: 'No hi ha cursos anteriors per marcar.', en: 'No previous grades to mark.', ja: '前の学年はありません。' },
}

function activateMastered(row: { kanji: string; word: string; reading: string; meaning_es: string; meaning_ca: string | null; meaning_en: string | null; image_url: string | null; grade: number; category: string | null; word_type: string | null }): VocabItem {
  const base: VocabItem = {
    kanji: row.kanji,
    jp: row.word,
    reading: row.reading,
    meaning: row.meaning_es,
    ...(row.meaning_ca ? { meaning_ca: row.meaning_ca } : {}),
    ...(row.meaning_en ? { meaning_en: row.meaning_en } : {}),
    srsLevel: 0, due: 0, status: 'active' as const,
    ...(row.image_url ? { image_url: row.image_url } : {}),
    ...(row.grade ? { grade: row.grade } : {}),
    ...(row.category ? { category: row.category } : {}),
    ...(row.word_type ? { word_type: row.word_type } : {}),
  } as VocabItem
  // Initialize all mode fields so migrateItem has something to work with
  Object.values(MODE_CONFIG).forEach(cfg => {
    ;(base as any)[cfg.key + '_level'] = 0
    ;(base as any)[cfg.key + '_due'] = 0
  })
  return masterItem(migrateItem(base))
}

interface Props {
  onClose: () => void
}

export default function SkipToGradeModal({ onClose }: Props) {
  const { state, saveVocabDb } = useStore()
  const lang = state.lang
  const lx = (map: Record<string, string>) => map[lang] ?? map.es

  // Grades 2-9 are valid (grade 1 has no "previous" grades to skip)
  const [selectedGrade, setSelectedGrade] = useState(2)
  const [wordCount, setWordCount] = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    setWordCount(null)
    setCountLoading(true)
    getVocabCountBelowGrade(selectedGrade)
      .then(c => setWordCount(c))
      .catch(() => setWordCount(null))
      .finally(() => setCountLoading(false))
  }, [selectedGrade])

  async function handleConfirm() {
    if (wordCount === 0) { onClose(); return }
    setConfirming(true)
    try {
      const vocab = await getVocabularyBelowGrade(selectedGrade)
      if (vocab.length === 0) {
        showToast(lx(L.noWords), 'info')
        onClose()
        return
      }

      const vocabWords = new Set(vocab.map(v => v.word))
      const existingWords = new Set(state.db.map(i => i.jp))

      const newDb: VocabItem[] = state.db.map(item =>
        vocabWords.has(item.jp) ? masterItem(item) : item
      )

      for (const row of vocab) {
        if (!existingWords.has(row.word)) {
          newDb.push(activateMastered(row))
        }
      }

      await saveVocabDb(newDb)
      showToast(`${vocab.length} ${lx(L.success)}`, 'success')
      onClose()
    } catch {
      showToast('Error al marcar palabras', 'error')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-sm w-full shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{lx(L.title)}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">{lx(L.subtitle)}</p>
            </div>
            <button
              onClick={onClose}
              disabled={confirming}
              className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-lg leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Grade selector */}
          <div>
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
              {lx(L.from)}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {[2, 3, 4, 5, 6, 7, 8, 9].map(g => (
                <button
                  key={g}
                  onClick={() => setSelectedGrade(g)}
                  className={`px-2 py-2 rounded-xl text-xs font-semibold transition-all border-2 ${
                    selectedGrade === g
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-violet-300 dark:hover:border-violet-600'
                  }`}
                >
                  {GRADE_LABEL[g]?.[lang] ?? GRADE_LABEL[g]?.es}
                </button>
              ))}
            </div>
          </div>

          {/* Word count summary */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
              {lx(L.marks)}:&nbsp;
              {countLoading
                ? <span className="text-amber-400">{lx(L.counting)}</span>
                : <span className="text-amber-800 dark:text-amber-300 tabular-nums">{wordCount ?? '—'} {lx(L.words)}</span>
              }
              &nbsp;<span className="font-normal text-amber-600 dark:text-amber-500">{lx(L.fromGrades)}</span>
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-500 mt-1">{lx(L.alreadyIn)}</p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 justify-end">
          <button
            onClick={onClose}
            disabled={confirming}
            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-sm transition disabled:opacity-50"
          >
            {lx(L.cancel)}
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || countLoading || wordCount === 0}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition active:scale-95 flex items-center gap-1.5"
          >
            {confirming
              ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white/60 shrink-0" />{lx(L.loading)}</>
              : lx(L.confirm)
            }
          </button>
        </div>

      </div>
    </div>
  )
}
