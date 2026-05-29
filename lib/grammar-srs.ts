// lib/grammar-srs.ts
// SRS utilities for grammar practice (BunPro-style fill-in-the-blank)

// SRS intervals: level 0=new, 1=4h, 2=12h, 3=1d, 4=3d, 5=1w, 6=2w, 7=1month
export const GRAMMAR_SRS_INTERVALS = [
  0,
  4  * 60 * 60 * 1000,
  12 * 60 * 60 * 1000,
  1  * 24 * 60 * 60 * 1000,
  3  * 24 * 60 * 60 * 1000,
  7  * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
]

export interface GrammarSrsStat {
  grammar_id: string
  level: number        // 0–7
  next_review: number  // Unix ms timestamp
}

export interface GrammarSentence {
  id?: string
  grammar_id: string
  sentence_before: string          // kanji/kana text before the blank
  sentence_before_reading: string  // pure kana reading of the before part
  sentence_before_alts: string[]   // up to 4 alternative before-blank texts (jp)
  sentence_before_reading_alts: string[] // readings for each alternative
  sentence_after: string           // kanji/kana text after the blank
  sentence_after_reading: string   // pure kana reading of the after part
  answer: string                   // correct grammar pattern
  answer_alts: string[]            // other acceptable answers
  translation_es: string
  translation_ca: string
  translation_en: string
  validated?: boolean              // true when validated by admin/contributor
  validated_by?: string           // user_id of the validator
}

// ─────────────────────────────────────────────────────────────────────────────
// Grammar SRS forecast
// ─────────────────────────────────────────────────────────────────────────────

export interface GrammarDayForecast {
  date: Date
  dayLabel: string
  newDue: number
  cumulative: number
  isToday: boolean
}

/**
 * Computes a day-by-day grammar SRS review forecast for the next `dayCount` days.
 * Each grammar point has a single next_review timestamp (unlike vocab which has one per mode).
 */
export function getGrammarForecast(
  stats: Map<string, GrammarSrsStat>,
  locale: string,
  dayCount = 7,
): GrammarDayForecast[] {
  const now = Date.now()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayStartMs = todayStart.getTime()
  const DAY_MS = 24 * 60 * 60 * 1000
  const localeTag = locale === 'ja' ? 'ja-JP' : locale === 'ca' ? 'ca-ES' : locale === 'en' ? 'en-GB' : 'es-ES'

  const newDue = Array(dayCount).fill(0)

  for (const stat of stats.values()) {
    const due = stat.next_review
    if (due <= now) {
      newDue[0]++
      continue
    }
    for (let d = 0; d < dayCount; d++) {
      const start = todayStartMs + d * DAY_MS
      const end = start + DAY_MS
      if (due >= start && due < end) {
        newDue[d]++
        break
      }
    }
  }

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

// ─────────────────────────────────────────────────────────────────────────────
// SRS logic
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Given the current level and whether the session was "passed",
 * returns the new level and next review timestamp.
 *
 * A session is considered "passed" when the caller decides so
 * (e.g. ≥60% correct answers in that session).
 */
export function applyGrammarResult(
  level: number,
  isCorrect: boolean,
): { newLevel: number; nextReview: number } {
  const newLevel = isCorrect
    ? Math.min(level + 1, 7)
    : Math.max(level - 1, 0)
  const interval = GRAMMAR_SRS_INTERVALS[newLevel] ?? 0
  return { newLevel, nextReview: Date.now() + interval }
}

// ─────────────────────────────────────────────────────────────────────────────
// Answer checking
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a Japanese or romaji string for loose comparison. */
export function normalizeAnswer(s: string): string {
  return s
    .trim()
    .toLowerCase()
    // katakana → hiragana
    .replace(/[ァ-ヶ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0x60))
    // strip common punctuation
    .replace(/[。、！？…・「」『』（）]/g, '')
    // collapse whitespace
    .replace(/\s+/g, '')
}

/**
 * Returns true if the user's input matches the correct answer or
 * any of the acceptable alternatives (after normalisation).
 */
export function checkAnswer(
  userInput: string,
  correct: string,
  alts: string[] = [],
): boolean {
  const norm = normalizeAnswer(userInput)
  if (!norm) return false
  return [correct, ...alts].map(normalizeAnswer).includes(norm)
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatNextReview(ms: number, lang = 'es'): string {
  const diff = ms - Date.now()
  if (diff <= 0) return lang === 'en' ? 'now' : lang === 'ca' ? 'ara' : 'ahora'
  const minutes = Math.floor(diff / 60_000)
  const hours   = Math.floor(diff / (60 * 60_000))
  const days    = Math.floor(diff / (24 * 60 * 60_000))
  if (days >= 1) {
    if (lang === 'en') return `in ${days} day${days > 1 ? 's' : ''}`
    if (lang === 'ca') return `en ${days} dia${days > 1 ? 's' : ''}`
    return `en ${days} día${days > 1 ? 's' : ''}`
  }
  if (hours >= 1) {
    if (lang === 'en') return `in ${hours} hour${hours > 1 ? 's' : ''}`
    if (lang === 'ca') return `en ${hours} hora${hours > 1 ? 'es' : ''}`
    return `en ${hours} hora${hours > 1 ? 's' : ''}`
  }
  if (lang === 'en') return `in ${minutes} min`
  if (lang === 'ca') return `en ${minutes} min`
  return `en ${minutes} min`
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-form answer matching helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns true if `ch` is a CJK kanji character. */
function isKanji(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff)   // CJK unified ideographs
      || (cp >= 0x3400 && cp <= 0x4dbf)   // CJK extension A
}

/**
 * Grammatical particles whose orthographic form differs from their phonetic
 * reading. The AI sometimes stores the phonetic form in reading fields
 * (e.g. "わ" for the particle は). We accept both when searching for the
 * anchor character that delimits a kanji block's reading.
 *
 *   は (topic / subject-marker) → pronounced わ
 *   を (object marker)          → pronounced お
 *   へ (direction marker)       → pronounced え
 */
const PARTICLE_PHONETIC: Record<string, string> = { 'は': 'わ', 'を': 'お', 'へ': 'え' }

/**
 * Splits a mixed kanji+kana `text` into tokens, pairing each consecutive
 * kanji block with its kana reading extracted from `reading` (a flat kana
 * string). Non-kanji characters (kana, ASCII, punctuation) are single-char
 * tokens with no kana alternative.
 *
 * Uses the same heuristic as the furigana renderer in GrammarPractice:
 * the kana reading for a kanji block ends where the next non-kanji character
 * of `text` appears in `reading`. When that character is a particle whose
 * reading may be stored in phonetic form (は→わ, を→お, へ→え), both the
 * orthographic and phonetic forms are accepted as anchors.
 */
function buildKanaTokens(
  text: string,
  reading: string,
): { base: string; kana?: string }[] {
  if (!text) return []
  if (!reading || reading === text) return [{ base: text }]

  const tokens: { base: string; kana?: string }[] = []
  let ti = 0  // cursor in `text`
  let ri = 0  // cursor in `reading`

  while (ti < text.length) {
    const ch = text[ti]

    if (!isKanji(ch)) {
      // Kana / punctuation / ASCII — emit as plain token, advance both cursors
      tokens.push({ base: ch })
      ri++
      ti++
    } else {
      // Kanji block: collect consecutive kanji characters
      let kanjiEnd = ti + 1
      while (kanjiEnd < text.length && isKanji(text[kanjiEnd])) kanjiEnd++

      // The kana reading for this block ends where the next non-kanji char
      // of `text` first appears in `reading` starting from `ri`.
      // Also accept the phonetic alternative for particles (は/わ, を/お, へ/え).
      let readingEnd: number
      if (kanjiEnd >= text.length) {
        // Last block — consume the rest of `reading`
        readingEnd = reading.length
      } else {
        const nextCh = text[kanjiEnd]
        const phoneticAlt = PARTICLE_PHONETIC[nextCh]  // may be undefined
        // Start at ri+1: a kanji block must consume at least one reading
        // character, so the anchor can never be at position ri itself.
        // This prevents a false match when the phonetic alt (e.g. 'わ')
        // appears as the very first character of the reading — which would
        // happen if the AI stored 'わたしわ…' and we searched for は/わ from
        // position 0, incorrectly assigning an empty reading to the kanji block.
        let s = ri + 1
        while (
          s < reading.length &&
          reading[s] !== nextCh &&
          reading[s] !== phoneticAlt
        ) s++
        readingEnd = s
      }

      const kana = reading.slice(ri, readingEnd)
      tokens.push({ base: text.slice(ti, kanjiEnd), kana: kana || undefined })
      ti = kanjiEnd
      ri = readingEnd
    }
  }

  return tokens
}

/**
 * Given a kanji string and its flat kana reading, generates EVERY valid
 * rendition where each kanji block is written EITHER fully as kanji OR
 * fully as kana — but never mixed within a single block.
 *
 * Example — '私は学生' + 'わたしはがくせい':
 *   → ['私は学生', 'わたしは学生', '私はがくせい', 'わたしはがくせい']
 *
 * A mixed form like '学せい' is NOT among the outputs, so it will not match.
 */
function generateAllValidForms(text: string, reading: string): string[] {
  if (!text) return ['']

  const tokens = buildKanaTokens(text, reading)

  // Indices of tokens that have a kana alternative (i.e., kanji blocks)
  const altIdx = tokens.reduce<number[]>((acc, t, i) => {
    if (t.kana) acc.push(i)
    return acc
  }, [])

  // No kanji → only one valid form
  if (altIdx.length === 0) return [text]

  // 2^N combinations where N = number of kanji blocks (typically 1–5 per segment)
  const n = altIdx.length
  const forms: string[] = []

  for (let mask = 0; mask < (1 << n); mask++) {
    const parts = tokens.map((tok, tokIdx) => {
      const pos = altIdx.indexOf(tokIdx)
      if (pos === -1 || !tok.kana) return tok.base
      // bit set → use kana reading; bit unset → keep kanji
      return (mask & (1 << pos)) !== 0 ? tok.kana : tok.base
    })
    forms.push(parts.join(''))
  }

  return forms
}

/**
 * Checks whether the user's full-sentence input matches the correct sentence.
 *
 * Accepts any rendition where each kanji block in the before/after segments
 * is written EITHER fully as kanji OR fully as its kana reading.
 * Writing a single block with a mix of kanji and kana (e.g. 学せい) is
 * treated as incorrect.
 *
 * The grammar answer token is always kana and is compared verbatim.
 * All comparisons are performed after normalisation (punctuation stripped,
 * katakana → hiragana, whitespace collapsed).
 *
 * `beforeAlts` — alternative before-blank segments (e.g. with/without honorifics,
 *   different pronouns). Each element is { jp, reading }.
 * `answerAlts` — alternative acceptable grammar patterns (e.g. だ vs です).
 */
export function checkFullSentence(
  userInput: string,
  sentenceBeforeReading: string,
  sentenceBefore: string,
  answer: string,
  sentenceAfterReading: string,
  sentenceAfter: string,
  options?: {
    beforeAlts?: Array<{ jp: string; reading: string }>
    answerAlts?: string[]
  },
): boolean {
  const norm = normalizeAnswer(userInput)
  if (!norm) return false

  // Build all candidate before segments (main + alternatives)
  const beforeCandidates: Array<{ jp: string; reading: string }> = [
    { jp: sentenceBefore, reading: sentenceBeforeReading },
    ...(options?.beforeAlts ?? []).filter(a => a.jp),
  ]

  // All acceptable answer forms (main + alts)
  const answerForms = [answer, ...(options?.answerAlts ?? [])].filter(Boolean)

  // Generate all valid forms for the after segment
  const afterForms = generateAllValidForms(
    sentenceAfter,
    sentenceAfterReading || sentenceAfter,
  )

  for (const { jp, reading } of beforeCandidates) {
    const beforeForms = generateAllValidForms(jp, reading || jp)
    for (const bf of beforeForms) {
      for (const ans of answerForms) {
        for (const af of afterForms) {
          if (norm === normalizeAnswer(bf + ans + af)) return true
        }
      }
    }
  }

  return false
}

export function getSrsLevelLabel(level: number, lang = 'es'): string {
  const labels: Record<string, string[]> = {
    es: ['Nuevo', 'Aprendiz I', 'Aprendiz II', 'Intermedio I', 'Intermedio II', 'Competente', 'Gurú', 'Maestro'],
    ca: ['Nou',   'Aprenent I', 'Aprenent II', 'Intermedi I',  'Intermedi II',  'Competent',  'Gurú', 'Mestre'],
    en: ['New',   'Apprentice I', 'Apprentice II', 'Intermediate I', 'Intermediate II', 'Proficient', 'Guru', 'Master'],
    ja: ['新規',  '修業生 I',   '修業生 II',   '中級 I',       '中級 II',       '熟練者',     '玄人', '師範'],
  }
  return (labels[lang] ?? labels.es)[Math.min(level, 7)]
}
