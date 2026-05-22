// lib/srs.ts

export const SRS_INTERVALS = [
  0,
  4 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
  12 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
]

export const STAGE_NAMES = [
  'Sin estudiar', 'Aprendiz I', 'Aprendiz II',
  'Intermedio I', 'Intermedio II', 'Competente', 'Gurú', 'Maestro',
]

export type ReviewMode = 'multi' | 'meaning' | 'kanji' | 'reading' | 'reverse'

export const MODE_CONFIG: Record<ReviewMode, {
  key: string
  label: string
  desc: string
  colorOn: string
  colorOff: string
  badge: string
}> = {
  multi: {
    key: 'srs_multi',
    label: '🔤 Opción múltiple',
    desc: 'Kanji → elige la lectura correcta entre 3 opciones',
    colorOn: 'bg-indigo-600 text-white border-indigo-600',
    colorOff: 'bg-white text-indigo-600 border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  meaning: {
    key: 'srs_meaning',
    label: '🧠 Significado',
    desc: 'Kanji → elige el significado correcto entre 4 opciones',
    colorOn: 'bg-purple-600 text-white border-purple-600',
    colorOff: 'bg-white text-purple-600 border-purple-300',
    badge: 'bg-purple-100 text-purple-700',
  },
  kanji: {
    key: 'srs_kanji',
    label: '✍️ Escritura kanji',
    desc: 'Lectura + significado → escribe el kanji en papel',
    colorOn: 'bg-amber-500 text-white border-amber-500',
    colorOff: 'bg-white text-amber-600 border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
  },
  reading: {
    key: 'srs_reading',
    label: '🔊 Lectura hiragana',
    desc: 'Kanji + significado → escribe la lectura en papel',
    colorOn: 'bg-emerald-600 text-white border-emerald-600',
    colorOff: 'bg-white text-emerald-600 border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  reverse: {
    key: 'srs_reverse',
    label: '🔁 Reverso',
    desc: 'Significado en español → escribe el kanji en papel',
    colorOn: 'bg-rose-600 text-white border-rose-600',
    colorOff: 'bg-white text-rose-600 border-rose-300',
    badge: 'bg-rose-100 text-rose-700',
  },
}

export interface VocabItem {
  kanji: string
  jp: string
  reading: string
  meaning: string
  srsLevel: number
  due: number
  status: 'locked' | 'active'
  // Per-mode SRS
  srs_multi_level?: number
  srs_multi_due?: number
  srs_meaning_level?: number
  srs_meaning_due?: number
  srs_kanji_level?: number
  srs_kanji_due?: number
  srs_reading_level?: number
  srs_reading_due?: number
  srs_reverse_level?: number
  srs_reverse_due?: number
}

export function migrateItem(item: VocabItem): VocabItem {
  if (item.status !== 'active') return item
  const result = { ...item }
  Object.values(MODE_CONFIG).forEach(cfg => {
    const lvlKey = cfg.key + '_level' as keyof VocabItem
    const dueKey = cfg.key + '_due' as keyof VocabItem
    if (!result[lvlKey]) (result as any)[lvlKey] = item.srsLevel || 1
    if (!result[dueKey]) (result as any)[dueKey] = item.due || Date.now()
  })
  return result
}

export function getModeLevelAndDue(item: VocabItem, mode: ReviewMode) {
  const cfg = MODE_CONFIG[mode]
  return {
    level: (item as any)[cfg.key + '_level'] as number || 1,
    due: (item as any)[cfg.key + '_due'] as number || 0,
  }
}

export function applyResult(item: VocabItem, mode: ReviewMode, isCorrect: boolean): VocabItem {
  const cfg = MODE_CONFIG[mode]
  const lvlKey = cfg.key + '_level'
  const dueKey = cfg.key + '_due'
  const cur = (item as any)[lvlKey] as number || 1
  const newLevel = isCorrect ? Math.min(cur + 1, 7) : Math.max(cur - 1, 1)
  return {
    ...item,
    [lvlKey]: newLevel,
    [dueKey]: Date.now() + SRS_INTERVALS[newLevel],
  }
}

export function getSrsClass(level: number, status: string, due: number) {
  if (status === 'locked') return 'bg-slate-100 text-slate-400 border border-slate-200'
  if (due - Date.now() > 365 * 5 * 24 * 60 * 60 * 1000) return 'bg-indigo-100 text-indigo-800 border border-indigo-200'
  if (level <= 2) return 'bg-rose-50 text-rose-700 border border-rose-100'
  if (level <= 4) return 'bg-amber-50 text-amber-700 border border-amber-100'
  if (level <= 6) return 'bg-indigo-50 text-indigo-700 border border-indigo-100'
  return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
}

export function getPendingCount(items: VocabItem[], modes: ReviewMode[]) {
  const now = Date.now()
  let count = 0
  items.filter(i => i.status === 'active').forEach(item => {
    modes.forEach(mode => {
      const { due } = getModeLevelAndDue(item, mode)
      if (due <= now) count++
    })
  })
  return count
}

// Returns meaning in the correct language for display
export function getMeaningForLang(item: VocabItem, lang: string): string {
  if (lang === 'ca' && (item as any).meaning_ca) return (item as any).meaning_ca
  if (lang === 'en' && (item as any).meaning_en) return (item as any).meaning_en
  return item.meaning
}
