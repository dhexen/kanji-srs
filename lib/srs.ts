// lib/srs.ts

// WaniKani-style 9-level SRS (index = level; index 0 unused; index 9 = Burned = ∞)
export const DEFAULT_SRS_INTERVALS = [
  0,                              // 0: unused
  4  * 60 * 60 * 1000,           // 1: Apprentice 1 — 4h
  8  * 60 * 60 * 1000,           // 2: Apprentice 2 — 8h
  24 * 60 * 60 * 1000,           // 3: Apprentice 3 — 1d
  2  * 24 * 60 * 60 * 1000,      // 4: Apprentice 4 — 2d
  7  * 24 * 60 * 60 * 1000,      // 5: Guru 1 — 1w
  14 * 24 * 60 * 60 * 1000,      // 6: Guru 2 — 2w
  30 * 24 * 60 * 60 * 1000,      // 7: Master — 1 month
  120 * 24 * 60 * 60 * 1000,     // 8: Enlightened — 4 months
  Number.MAX_SAFE_INTEGER,        // 9: Burned — no more reviews
]

export const SRS_MAX_LEVEL = 9

/** Runtime SRS intervals — can be overridden by admin config */
let _srsIntervals = [...DEFAULT_SRS_INTERVALS]

export function getSrsIntervals(): number[] {
  return _srsIntervals
}

export function setSrsIntervals(intervals: number[]) {
  if (intervals.length === 10) {
    _srsIntervals = [...intervals]
  } else if (intervals.length === 8) {
    // Migrate old 8-entry admin config: append Enlightened + Burned defaults
    _srsIntervals = [...intervals, DEFAULT_SRS_INTERVALS[8], DEFAULT_SRS_INTERVALS[9]]
  }
}

/** @deprecated Use getSrsIntervals() — kept for backward compat in imports */
export const SRS_INTERVALS = new Proxy(DEFAULT_SRS_INTERVALS, {
  get(target, prop) {
    const idx = typeof prop === 'string' ? Number(prop) : NaN
    if (!isNaN(idx) && idx >= 0 && idx < 10) return _srsIntervals[idx]
    if (prop === 'length') return _srsIntervals.length
    if (prop === Symbol.iterator) return () => _srsIntervals[Symbol.iterator]()
    if (prop === 'map') return _srsIntervals.map.bind(_srsIntervals)
    if (prop === 'forEach') return _srsIntervals.forEach.bind(_srsIntervals)
    return (target as any)[prop]
  },
})

export const STAGE_NAMES = [
  'Sin estudiar',
  'Aprendiz 1', 'Aprendiz 2', 'Aprendiz 3', 'Aprendiz 4',
  'Gurú 1', 'Gurú 2', 'Maestro', 'Iluminado', 'Quemado',
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
  grade?: number        // Japanese school grade (1-9)
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
    // Only set if null/undefined (not if 0, which is a valid "never reviewed" state).
    // New words (srsLevel ≤ 1) start at level 0 so their first correct answer → level 1.
    // Words migrated from the old single-level system (srsLevel > 1) keep their level.
    if (result[lvlKey] == null) (result as any)[lvlKey] = item.srsLevel > 1 ? item.srsLevel : 0
    if (!result[dueKey]) (result as any)[dueKey] = item.due || Date.now()
  })
  return result
}

export function getModeLevelAndDue(item: VocabItem, mode: ReviewMode) {
  const cfg = MODE_CONFIG[mode]
  // Use ?? (not ||) so level 0 ("never reviewed") is kept as 0, not overridden to 1.
  // Fall back to 1 only for truly missing data (undefined/null = old data before per-mode SRS).
  const rawLevel = (item as any)[cfg.key + '_level'] as number | undefined | null
  return {
    level: rawLevel ?? 1,
    due: (item as any)[cfg.key + '_due'] as number || 0,
  }
}

// Level 0 = never successfully reviewed (show immediately every session).
// wrongCount=0 AND cur>0 → correct first try → +1 level
// wrongCount>0 AND cur>0 → failed N times → −N levels (min Apprentice 1)
// cur===0 (any wrongCount) → first ever correct → Apprentice 1 (level 1)
export function applyResult(item: VocabItem, mode: ReviewMode, wrongCount: number): VocabItem {
  const cfg = MODE_CONFIG[mode]
  const lvlKey = cfg.key + '_level'
  const dueKey = cfg.key + '_due'
  const rawCur = (item as any)[lvlKey] as number | undefined | null
  const cur = rawCur ?? 1
  const newLevel = cur === 0
    ? 1  // first ever correct review → Apprentice 1, regardless of failures in same session
    : wrongCount === 0
      ? Math.min(cur + 1, SRS_MAX_LEVEL)
      : Math.max(cur - wrongCount, 1)
  const newDue = newLevel >= SRS_MAX_LEVEL
    ? Number.MAX_SAFE_INTEGER
    : Date.now() + getSrsIntervals()[newLevel]
  return {
    ...item,
    [lvlKey]: newLevel,
    [dueKey]: newDue,
  }
}

export function getSrsClass(level: number, status: string, _due?: number) {
  if (status === 'locked') return 'bg-slate-100 text-slate-400 border border-slate-200'
  if (level >= SRS_MAX_LEVEL) return 'bg-slate-700 text-slate-200 border border-slate-600'    // Burned
  if (level >= 8) return 'bg-violet-100 text-violet-800 border border-violet-200'             // Enlightened
  if (level >= 7) return 'bg-emerald-100 text-emerald-800 border border-emerald-200'          // Master
  if (level >= 5) return 'bg-indigo-50 text-indigo-700 border border-indigo-100'             // Guru
  if (level >= 3) return 'bg-amber-50 text-amber-700 border border-amber-100'                // Apprentice 3-4
  return 'bg-rose-50 text-rose-700 border border-rose-100'                                    // Apprentice 1-2
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
      const { level, due } = getModeLevelAndDue(item, mode)
      if (level >= SRS_MAX_LEVEL) return  // Burned: no more reviews
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
      // Only count truly upcoming items — already-due items are shown in pendingCount
      if (due > nowMs && due <= todayEndMs) {
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

/**
 * Overall level of a word = the highest level reached across any mode.
 * A freshly-added word (all modes at 1) → 1. As soon as the user answers any
 * mode correctly, it rises. Used to decide what is "new / level 1".
 * (srsLevel is NOT reliable: applyResult only updates the per-mode levels.)
 */
export function getOverallLevel(item: VocabItem): number {
  let max = 0
  for (const mode of ALL_REVIEW_MODES) {
    const lvl = getModeLevelAndDue(item, mode).level
    if (lvl > max) max = lvl
  }
  return max || (item.srsLevel ?? 1)
}

/** "Ya me la sé" (full): sets ALL mode levels to 8 (Enlightened). Used when skipping a whole grade. */
export function masterItem(item: VocabItem): VocabItem {
  const enlightenedDue = Date.now() + DEFAULT_SRS_INTERVALS[8]
  const result = { ...item, srsLevel: 8, due: enlightenedDue, status: 'active' as const }
  Object.values(MODE_CONFIG).forEach(cfg => {
    ;(result as any)[cfg.key + '_level'] = 8
    ;(result as any)[cfg.key + '_due'] = enlightenedDue
  })
  return result
}

/** "Ya me la sé" for a single mode: sets only that mode to level 8 (Enlightened). */
export function masterItemMode(item: VocabItem, mode: ReviewMode): VocabItem {
  const cfg = MODE_CONFIG[mode]
  const enlightenedDue = Date.now() + DEFAULT_SRS_INTERVALS[8]
  return {
    ...item,
    status: 'active' as const,
    [cfg.key + '_level']: 8,
    [cfg.key + '_due']: enlightenedDue,
  }
}
