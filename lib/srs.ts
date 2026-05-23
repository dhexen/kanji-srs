// lib/srs.ts

export const DEFAULT_SRS_INTERVALS = [
  0,
  4 * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  24 * 60 * 60 * 1000,
  2 * 24 * 60 * 60 * 1000,
  5 * 24 * 60 * 60 * 1000,
  12 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
]

/** Runtime SRS intervals — can be overridden by admin config */
let _srsIntervals = [...DEFAULT_SRS_INTERVALS]

export function getSrsIntervals(): number[] {
  return _srsIntervals
}

export function setSrsIntervals(intervals: number[]) {
  if (intervals.length === 8) _srsIntervals = [...intervals]
}

/** @deprecated Use getSrsIntervals() — kept for backward compat in imports */
export const SRS_INTERVALS = new Proxy(DEFAULT_SRS_INTERVALS, {
  get(target, prop) {
    const idx = typeof prop === 'string' ? Number(prop) : NaN
    if (!isNaN(idx) && idx >= 0 && idx < 8) return _srsIntervals[idx]
    if (prop === 'length') return _srsIntervals.length
    if (prop === Symbol.iterator) return () => _srsIntervals[Symbol.iterator]()
    if (prop === 'map') return _srsIntervals.map.bind(_srsIntervals)
    if (prop === 'forEach') return _srsIntervals.forEach.bind(_srsIntervals)
    return (target as any)[prop]
  },
})

export const STAGE_NAMES = [
  'Sin estudiar', 'Aprendiz I', 'Aprendiz II',
  'Intermedio I', 'Intermedio II', 'Competente', 'Gurú', 'Maestro',
]

export type ReviewMode = 'multi' | 'meaning' | 'kanji' | 'reading' | 'reverse'

export type InputScript = 'hiragana' | 'latin' | 'none'

export const MODE_CONFIG: Record<ReviewMode, {
  key: string
  label_key: string
  desc_key: string
  /** @deprecated Use t(lang, label_key) for display — kept for legacy badge splits */
  label: string
  colorOn: string
  colorOff: string
  badge: string
  inputScript: InputScript
}> = {
  multi: {
    key: 'srs_multi',
    label_key: 'mode_multi',
    desc_key: 'mode_multi_desc',
    label: '🔤',
    colorOn: 'bg-indigo-600 text-white border-indigo-600',
    colorOff: 'bg-white text-indigo-600 border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-700',
    inputScript: 'none',
  },
  meaning: {
    key: 'srs_meaning',
    label_key: 'mode_meaning',
    desc_key: 'mode_meaning_desc',
    label: '🧠',
    colorOn: 'bg-purple-600 text-white border-purple-600',
    colorOff: 'bg-white text-purple-600 border-purple-300',
    badge: 'bg-purple-100 text-purple-700',
    inputScript: 'none',
  },
  kanji: {
    key: 'srs_kanji',
    label_key: 'mode_kanji',
    desc_key: 'mode_kanji_desc',
    label: '✍️',
    colorOn: 'bg-amber-500 text-white border-amber-500',
    colorOff: 'bg-white text-amber-600 border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
    inputScript: 'none',
  },
  reading: {
    key: 'srs_reading',
    label_key: 'mode_reading',
    desc_key: 'mode_reading_desc',
    label: '🔊',
    colorOn: 'bg-emerald-600 text-white border-emerald-600',
    colorOff: 'bg-white text-emerald-600 border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
    inputScript: 'hiragana',
  },
  reverse: {
    key: 'srs_reverse',
    label_key: 'mode_reverse',
    desc_key: 'mode_reverse_desc',
    label: '🔁',
    colorOn: 'bg-rose-600 text-white border-rose-600',
    colorOff: 'bg-white text-rose-600 border-rose-300',
    badge: 'bg-rose-100 text-rose-700',
    inputScript: 'none',
  },
}

export type VocabCategory =
  | 'animals' | 'nature' | 'colors' | 'weather' | 'time' | 'food'
  | 'transport' | 'family' | 'body' | 'school' | 'home' | 'work'
  | 'places' | 'numbers' | 'emotions' | 'actions' | 'sports' | 'culture' | 'other'

export type VocabWordType =
  | 'noun' | 'verb_transitive' | 'verb_intransitive' | 'verb'
  | 'adj_i' | 'adj_na' | 'adverb' | 'particle' | 'expression'

export interface VocabItem {
  kanji: string
  jp: string
  reading: string
  meaning: string       // primary meaning (Spanish / fallback)
  meaning_ca?: string   // Catalan meaning
  meaning_en?: string   // English meaning
  srsLevel: number
  due: number
  status: 'locked' | 'active'
  image_url?: string
  category?: VocabCategory
  word_type?: VocabWordType
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
    [dueKey]: Date.now() + getSrsIntervals()[newLevel],
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

export const ALL_REVIEW_MODES: ReviewMode[] = ['multi', 'meaning', 'kanji', 'reading', 'reverse']

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

export interface DayForecast {
  date: Date
  dayLabel: string
  newDue: number
  cumulative: number
  isToday: boolean
}

/** Repasos (palabra × modo) previstos por día; el acumulado suma los “+N” de cada día. */
export function getReviewForecast(items: VocabItem[], locale: string, dayCount = 7): DayForecast[] {
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartMs = todayStart.getTime()
  const DAY_MS = 24 * 60 * 60 * 1000
  const localeTag = locale === 'ja' ? 'ja-JP' : locale === 'ca' ? 'ca-ES' : locale === 'en' ? 'en-GB' : 'es-ES'

  const newDue = Array(dayCount).fill(0)

  items.filter(i => i.status === 'active').forEach(item => {
    ALL_REVIEW_MODES.forEach(mode => {
      const { due } = getModeLevelAndDue(item, mode)
      if (due <= now) {
        newDue[0]++
        return
      }
      for (let d = 0; d < dayCount; d++) {
        const start = todayStartMs + d * DAY_MS
        const end = start + DAY_MS
        if (due >= start && due < end) {
          newDue[d]++
          break
        }
      }
    })
  })

  let cumulative = 0
  return newDue.map((n, d) => {
    cumulative += n
    const date = new Date(todayStartMs + d * DAY_MS)
    return {
      date,
      dayLabel: date.toLocaleDateString(localeTag, { weekday: 'short' }),
      newDue: n,
      cumulative,
      isToday: d === 0,
    }
  })
}

export interface HourForecast {
  hour: number
  label: string
  due: number
  isCurrent: boolean
}

export function getHourlyForecast(items: VocabItem[]): HourForecast[] {
  const now = new Date()
  const nowMs = now.getTime()
  const currentHour = now.getHours()
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)
  const todayEndMs = todayEnd.getTime()

  const hourCounts = Array(24).fill(0)

  items.filter(i => i.status === 'active').forEach(item => {
    ALL_REVIEW_MODES.forEach(mode => {
      const { due } = getModeLevelAndDue(item, mode)
      if (due <= nowMs) {
        hourCounts[currentHour]++
      } else if (due <= todayEndMs) {
        hourCounts[new Date(due).getHours()]++
      }
    })
  })

  return hourCounts
    .map((due, hour) => ({
      hour,
      label: `${hour.toString().padStart(2, '0')}:00`,
      due,
      isCurrent: hour === currentHour,
    }))
    .filter(h => h.due > 0)
}

// Returns meaning in the correct language for display
export function getMeaningForLang(item: VocabItem, lang: string): string {
  if (lang === 'ca' && item.meaning_ca) return item.meaning_ca
  if (lang === 'en' && item.meaning_en) return item.meaning_en
  return item.meaning
}
