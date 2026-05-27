'use client'
import { useState, useEffect, useMemo } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

// Replicated from VocabularyClient — activates all per-mode levels
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

const PACK_ICON: Record<number, string> = { 3: '🚀', 5: '📖', 15: '🏋️' }

interface Props {
  /** Called with the newly activated items — parent starts review with them */
  onAdded: (items: VocabItem[]) => void
}

export default function QuickAddPanel({ onAdded }: Props) {
  const { state, addVocabItems } = useStore()
  const [loading, setLoading] = useState<number | null>(null)
  const [nextGrade, setNextGrade] = useState<number | null>(null)
  const [nextKanjis, setNextKanjis] = useState<string[]>([])
  const [detecting, setDetecting] = useState(true)
  const lang = state.lang

  // All kanji chars currently in the user's DB
  const activeKanjis = useMemo(
    () => new Set(state.db.map(i => i.kanji).filter(Boolean) as string[]),
    [state.db],
  )

  // Detect next grade: scan grades 1-9, take first with unlearned kanjis
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
        // All grades complete
        if (!cancelled) { setNextGrade(null); setNextKanjis([]) }
      } catch { /* silencioso — el panel simplemente no aparece */ } finally {
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
      const vocab = await getVocabularyByKanjis(kanjisToAdd, nextGrade)
      const now = Date.now()
      const existingWords = new Set(state.db.map(i => i.jp))
      const newWords = ((vocab ?? []) as any[]).filter(v => !existingWords.has(v.word))

      if (newWords.length === 0) {
        showToast(t(lang, 'vocab_none_selected'), 'info')
        return
      }

      const newItems: VocabItem[] = newWords.map((v: any) => {
        const base: VocabItem = {
          kanji: v.kanji,
          jp: v.word,
          reading: v.reading,
          meaning: v.meaning_es,
          ...(v.meaning_ca ? { meaning_ca: v.meaning_ca } : {}),
          ...(v.meaning_en ? { meaning_en: v.meaning_en } : {}),
          srsLevel: 1,
          due: now,
          status: 'active',
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

  // Don't render if not logged in
  if (!state.user) return null

  const PACKS = [
    { count: 3,  label: t(lang, 'vocab_k3')  },
    { count: 5,  label: t(lang, 'vocab_k5')  },
    { count: 15, label: t(lang, 'vocab_k15') },
  ]

  const gradeLabel = nextGrade
    ? (GRADE_LABEL[nextGrade]?.[lang] ?? GRADE_LABEL[nextGrade]?.es ?? '')
    : ''

  const previewKanjis = nextKanjis.slice(0, 14)

  const addLabel: Record<string, string> = {
    es: 'Añadir nuevos kanjis',
    ca: 'Afegir nous kanjis',
    en: 'Add new kanji',
    ja: '新しい漢字を追加',
  }
  const searchingLabel: Record<string, string> = {
    es: 'Buscando siguientes kanjis...',
    ca: 'Cercant els kanjis següents...',
    en: 'Finding next kanji...',
    ja: '次の漢字を検索中...',
  }
  const completeLabel: Record<string, string> = {
    es: '¡Has completado todos los kanjis disponibles!',
    ca: 'Has completat tots els kanjis disponibles!',
    en: 'All available kanji completed!',
    ja: '全漢字完了！',
  }
  const availableLabel: Record<string, string> = {
    es: 'kanjis disponibles',
    ca: 'kanjis disponibles',
    en: 'available',
    ja: '個利用可能',
  }
  const footerLabel: Record<string, string> = {
    es: 'Se añaden al SRS · el repaso empieza ahora mismo',
    ca: "S'afegeixen al SRS · el repàs comença ara",
    en: 'Added to SRS · review starts right away',
    ja: 'SRSに追加 · すぐに学習開始',
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-4 shadow-sm space-y-3">

      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-base">📥</span>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {addLabel[lang] ?? addLabel.es}
        </p>
      </div>

      {/* States */}
      {detecting ? (
        <div className="flex items-center gap-2 py-1">
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-violet-400" />
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {searchingLabel[lang] ?? searchingLabel.es}
          </span>
        </div>
      ) : !nextGrade ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold py-1">
          🎉 {completeLabel[lang] ?? completeLabel.es}
        </p>
      ) : (
        <>
          {/* Grade name + remaining count */}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {gradeLabel} · {nextKanjis.length} {availableLabel[lang] ?? availableLabel.es}
          </p>

          {/* Kanji character preview */}
          <div className="flex flex-wrap gap-1">
            {previewKanjis.map(k => (
              <span
                key={k}
                className="kanji-font text-sm font-bold px-1.5 py-0.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded border border-slate-200 dark:border-slate-600 leading-tight"
              >
                {k}
              </span>
            ))}
            {nextKanjis.length > 14 && (
              <span className="text-xs text-slate-400 dark:text-slate-500 self-center pl-1">
                +{nextKanjis.length - 14}
              </span>
            )}
          </div>

          {/* Pack buttons */}
          <div className="flex gap-2">
            {PACKS.map(p => {
              const actual = Math.min(p.count, nextKanjis.length)
              return (
                <button
                  key={p.count}
                  onClick={() => handleAdd(p.count)}
                  disabled={loading !== null}
                  className="flex-1 py-2.5 text-sm font-bold rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 disabled:opacity-40 transition active:scale-95 flex flex-col items-center justify-center gap-0.5"
                >
                  {loading === p.count
                    ? <span className="text-base">⏳</span>
                    : <>
                        <span>{`+${actual}`}</span>
                        <span className="text-[11px] font-normal opacity-60">{PACK_ICON[p.count]}</span>
                      </>
                  }
                </button>
              )
            })}
          </div>

          {/* Footer hint */}
          <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center">
            {footerLabel[lang] ?? footerLabel.es}
          </p>
        </>
      )}
    </div>
  )
}
