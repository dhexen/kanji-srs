'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

function activateItem(item: VocabItem, level: number, due: number): VocabItem {
  const upd: VocabItem = { ...item, status: 'active', srsLevel: level, due }
  Object.values(MODE_CONFIG).forEach(cfg => {
    ;(upd as unknown as Record<string, number>)[`${cfg.key}_level`] = level
    ;(upd as unknown as Record<string, number>)[`${cfg.key}_due`] = due
  })
  return migrateItem(upd)
}

const GRADE_LABEL: Record<number, Record<string, string>> = {
  1: { es: '1º Primaria',   ca: '1r Primària',   en: '1st Grade', ja: '小1' },
  2: { es: '2º Primaria',   ca: '2n Primària',   en: '2nd Grade', ja: '小2' },
  3: { es: '3º Primaria',   ca: '3r Primària',   en: '3rd Grade', ja: '小3' },
  4: { es: '4º Primaria',   ca: '4t Primària',   en: '4th Grade', ja: '小4' },
  5: { es: '5º Primaria',   ca: '5è Primària',   en: '5th Grade', ja: '小5' },
  6: { es: '6º Primaria',   ca: '6è Primària',   en: '6th Grade', ja: '小6' },
  7: { es: '1º Sec.',       ca: '1r Sec.',       en: '7th Grade', ja: '中1' },
  8: { es: '2º Sec.',       ca: '2n Sec.',       en: '8th Grade', ja: '中2' },
  9: { es: '3º Sec.',       ca: '3r Sec.',       en: '9th Grade', ja: '中3' },
}

// Per-language labels
const L = {
  title:       { es: 'Nuevos kanjis',             ca: 'Nous kanjis',              en: 'New kanji',          ja: '新しい漢字' },
  searching:   { es: 'Buscando...',               ca: 'Cercant...',               en: 'Searching...',       ja: '検索中...' },
  complete:    { es: '¡Todos los kanjis completados! 🎉', ca: 'Tots els kanjis completats! 🎉', en: 'All kanji completed! 🎉', ja: '全漢字完了！🎉' },
  available:   { es: 'disponibles',               ca: 'disponibles',              en: 'available',          ja: '個利用可能' },
  words:       { es: 'palabras',                  ca: 'paraules',                 en: 'words',              ja: '語' },
  rhythm: {
    3:  { es: 'Ritmo normal',         ca: 'Ritme normal',         en: 'Normal pace',    ja: '通常ペース' },
    5:  { es: 'Ritmo rápido',         ca: 'Ritme ràpid',          en: 'Fast pace',      ja: '速いペース' },
    15: { es: 'Ritmo súper rápido',   ca: 'Ritme molt ràpid',     en: 'Super fast',     ja: '超速ペース' },
  } as Record<number, Record<string, string>>,
}

// Approximate word count per pack (3 words per kanji on average)
const WORD_COUNTS: Record<number, number> = { 3: 9, 5: 15, 15: 45 }

interface Props {
  onAdded: (items: VocabItem[]) => void
}

export default function QuickAddPanel({ onAdded }: Props) {
  const { state, addVocabItems } = useStore()
  const [loading, setLoading] = useState<number | null>(null)
  const [nextGrade, setNextGrade] = useState<number | null>(null)
  const [nextKanjis, setNextKanjis] = useState<string[]>([])
  const [detecting, setDetecting] = useState(true)
  const [includeUnofficial, setIncludeUnofficial] = useState(false)
  const lang = state.lang

  const activeKanjis = useMemo(
    () => new Set(state.db.map(i => i.kanji).filter(Boolean) as string[]),
    [state.db],
  )

  useEffect(() => {
    if (!state.user || !state.loaded) { setDetecting(false); return }

    let cancelled = false
    setDetecting(true)

    async function detect() {
      try {
        for (let g = 1; g <= 9; g++) {
          const all = (await getRandomKanjis(0, g)) as string[]
          const remaining = all.filter(k => !activeKanjis.has(k))
          if (remaining.length > 0) {
            if (!cancelled) { setNextGrade(g); setNextKanjis(remaining) }
            return
          }
        }
        if (!cancelled) { setNextGrade(null); setNextKanjis([]) }
      } catch { /* silencioso */ } finally {
        if (!cancelled) setDetecting(false)
      }
    }

    detect()
    return () => { cancelled = true }
  }, [activeKanjis, state.user, state.loaded])

  async function handleAdd(packSize: number) {
    if (!nextGrade || loading !== null) return
    setLoading(packSize)
    try {
      const kanjisToAdd = nextKanjis.slice(0, packSize)
      const vocab = await getVocabularyByKanjis(kanjisToAdd, nextGrade, includeUnofficial)
      const now = Date.now()
      const existingWords = new Set(state.db.map(i => i.jp))
      const newWords = ((vocab ?? []) as any[]).filter(v => !existingWords.has(v.word))

      if (newWords.length === 0) {
        showToast(t(lang, 'vocab_none_selected'), 'info')
        return
      }

      const newItems: VocabItem[] = newWords.map((v: any) => {
        const base: VocabItem = {
          kanji: v.kanji, jp: v.word, reading: v.reading,
          meaning: v.meaning_es,
          ...(v.meaning_ca ? { meaning_ca: v.meaning_ca } : {}),
          ...(v.meaning_en ? { meaning_en: v.meaning_en } : {}),
          srsLevel: 1, due: now, status: 'active',
          ...(v.image_url  ? { image_url:  v.image_url  } : {}),
          ...(v.grade      ? { grade:      v.grade      } : {}),
          ...(v.category   ? { category:   v.category   } : {}),
          ...(v.word_type  ? { word_type:  v.word_type  } : {}),
        } as VocabItem
        return activateItem(base, 1, now)
      })

      await addVocabItems(newItems)
      showToast(`${newItems.length} ${t(lang, 'vocab_added_srs')}`, 'success')
      onAdded(newItems)
    } catch {
      showToast('Error cargando kanjis', 'error')
    } finally {
      setLoading(null)
    }
  }

  if (!state.user) return null

  const lx = (map: Record<string, string>) => map[lang] ?? map.es
  const gradeLabel = nextGrade ? (GRADE_LABEL[nextGrade]?.[lang] ?? GRADE_LABEL[nextGrade]?.es ?? '') : ''
  const previewKanjis = nextKanjis.slice(0, 12)

  const PACKS = [3, 5, 15]

  return (
    <div className="rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden h-full flex flex-col">

      {/* Header */}
      <div className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 px-4 py-3">
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
          {lx(L.title)}
        </p>
        {nextGrade && !detecting && (
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
            {gradeLabel} · {nextKanjis.length} {lx(L.available)}
          </p>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 bg-white dark:bg-slate-800 p-3 flex flex-col gap-2">

        {detecting ? (
          <div className="flex items-center gap-2 py-3">
            <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-violet-400 shrink-0" />
            <span className="text-xs text-slate-400 dark:text-slate-500">{lx(L.searching)}</span>
          </div>
        ) : !nextGrade ? (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold py-2 text-center">
            {lx(L.complete)}
          </p>
        ) : (
          <>
            {/* Non-official toggle */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeUnofficial}
                onChange={e => setIncludeUnofficial(e.target.checked)}
                className="w-3.5 h-3.5 rounded accent-amber-500"
              />
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {t(lang, 'quickadd_include_unofficial')}
              </span>
            </label>

            {/* Kanji preview chips */}
            <div className="flex flex-wrap gap-1 pb-1">
              {previewKanjis.map(k => (
                <span
                  key={k}
                  className="kanji-font text-sm font-bold px-1.5 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 leading-tight"
                >
                  {k}
                </span>
              ))}
              {nextKanjis.length > 12 && (
                <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center pl-0.5">
                  +{nextKanjis.length - 12}
                </span>
              )}
            </div>

            {/* Pack buttons — vertical list */}
            <div className="flex flex-col gap-2">
              {PACKS.map(count => {
                const actual = Math.min(count, nextKanjis.length)
                const wordCount = WORD_COUNTS[count]
                const busy = loading === count

                return (
                  <button
                    key={count}
                    onClick={() => handleAdd(count)}
                    disabled={loading !== null}
                    className="w-full px-3.5 py-2.5 rounded-xl text-left transition-all active:scale-[0.98] border-2 border-indigo-100 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 hover:border-indigo-200 dark:hover:border-indigo-700 disabled:opacity-40"
                  >
                    {busy ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-indigo-500 shrink-0" />
                        <span className="text-sm font-bold text-indigo-600 dark:text-indigo-300">
                          {lx(L.searching)}
                        </span>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300 leading-snug">
                          +{actual} kanjis
                          <span className="font-normal text-indigo-400 dark:text-indigo-500 ml-1.5 text-xs">
                            ({wordCount} {lx(L.words)})
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                          {lx(L.rhythm[count])}
                        </p>
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
