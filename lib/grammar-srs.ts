// lib/grammar-srs.ts
// SRS utilities for grammar practice (BunPro-style fill-in-the-blank)

// WaniKani-style 9-level SRS (index = level; index 0 unused; level 9 = Burned = ∞)
export const GRAMMAR_SRS_INTERVALS = [
  0,                              // 0: unused
  4  * 60 * 60 * 1000,           // 1: Apprentice 1 — 4h
  8  * 60 * 60 * 1000,           // 2: Apprentice 2 — 8h
  24 * 60 * 60 * 1000,           // 3: Apprentice 3 — 1d
  2  * 24 * 60 * 60 * 1000,      // 4: Apprentice 4 — 2d
  7  * 24 * 60 * 60 * 1000,      // 5: Guru 1 — 1w
  14 * 24 * 60 * 60 * 1000,      // 6: Guru 2 — 2w
  30 * 24 * 60 * 60 * 1000,      // 7: Master — 1 month
  120 * 24 * 60 * 60 * 1000,     // 8: Enlightened — 4 months
]

export const GRAMMAR_SRS_MAX_LEVEL = 9  // Burned — no more reviews

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
  validated?: boolean
  validated_by?: string
  topic?: string        // detected topic, present on newly-generated sentences
  vocab_used?: string[] // vocab words that appear in the sentence
  grammar_jlpt?: string // JLPT level of the grammar point (for shared sentences)
  is_shared?: boolean   // true when loaded from user_shared_sentences
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
    if (stat.level >= GRAMMAR_SRS_MAX_LEVEL) continue  // Burned: no more reviews
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
 * WaniKani-style SRS progression.
 * level 0 = never reviewed → first correct practice (any wrongCount) → level 1.
 * wrongCount = 0 → advance 1 level (max 9 = Burned).
 * wrongCount > 0 → subtract wrongCount levels (min 1 = Apprentice 1).
 */
export function applyGrammarResult(
  level: number,
  wrongCount: number,
): { newLevel: number; nextReview: number } {
  if (level === 0) {
    // First ever completed practice → Apprentice 1 regardless of failures
    return { newLevel: 1, nextReview: Date.now() + GRAMMAR_SRS_INTERVALS[1] }
  }
  const safeLevel = Math.max(level, 1)
  const newLevel = wrongCount === 0
    ? Math.min(safeLevel + 1, GRAMMAR_SRS_MAX_LEVEL)
    : Math.max(safeLevel - wrongCount, 1)
  if (newLevel >= GRAMMAR_SRS_MAX_LEVEL) {
    return { newLevel: GRAMMAR_SRS_MAX_LEVEL, nextReview: Number.MAX_SAFE_INTEGER }
  }
  const interval = GRAMMAR_SRS_INTERVALS[newLevel] ?? GRAMMAR_SRS_INTERVALS[1]
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
 * Strip trailing polite copula / question markers so the plain and polite
 * forms of the same pattern compare equal (e.g. てもいい ≡ てもいいです ≡
 * てもいいですか). Only removes additive politeness suffixes — it does NOT
 * conjugate, so ます-verbs (持っていきます vs 持っていく) are left untouched.
 */
function plainCore(s: string): string {
  let x = s
  for (let i = 0; i < 4; i++) {
    const stripped = x
      .replace(/(でしょうか|でしょう|ですか|でした|です)$/, '')
      .replace(/か$/, '')
    if (stripped === x) break
    x = stripped
  }
  return x
}

/** True if the normalised input equals a candidate, allowing register variants. */
function matchesCandidate(norm: string, candidates: string[]): boolean {
  if (candidates.includes(norm)) return true
  const core = plainCore(norm)
  return !!core && candidates.some(c => { const cc = plainCore(c); return !!cc && cc === core })
}

/**
 * Returns true if the user's input matches the correct answer or any of the
 * acceptable alternatives (after normalisation). Two tolerances apply:
 *  - register: a plain answer passes where a polite one is expected and vice
 *    versa, as long as they share the same plain core (丁寧 ⇄ 普通).
 *  - boundary: when `before` is given, the student may re-type the trailing
 *    characters of the text before the blank that belong to the conjugation
 *    (e.g. before ends 飼っ and they type ってはいけません for てはいけません).
 */
export function checkAnswer(
  userInput: string,
  correct: string,
  alts: string[] = [],
  before = '',
): boolean {
  const norm = normalizeAnswer(userInput)
  if (!norm) return false
  const candidates = [correct, ...alts].map(normalizeAnswer)
  if (matchesCandidate(norm, candidates)) return true
  // Boundary-tolerant: strip a prefix of the answer that repeats the tail of
  // `before`, then re-check. Accepts re-typed context without accepting any
  // other extra characters.
  if (before) {
    const b = normalizeAnswer(before)
    for (let k = 1; k <= Math.min(b.length, norm.length - 1); k++) {
      if (norm.slice(0, k) !== b.slice(b.length - k)) continue
      if (matchesCandidate(norm.slice(k), candidates)) return true
    }
  }
  return false
}

/**
 * Detects whether the expected answer is in polite (formal) register, so the
 * UI can show a "formal" hint. Returns null when there is no clear register
 * (e.g. a bare particle), to avoid mislabelling.
 */
export function getAnswerRegister(answer: string): 'formal' | null {
  return /(です|ます|ました|ません|でした|でしょう)/.test(answer) ? 'formal' : null
}

/** Hiragana characters of a string (katakana folded to hiragana via normalise). */
function hiraganaChars(s: string): string[] {
  return [...normalizeAnswer(s)].filter(ch => ch >= 'ぁ' && ch <= 'ゖ')
}

/**
 * Sanity check that the fill-in `answer` actually belongs to the grammar
 * `pattern`: it must share at least one kana with the pattern's kana core.
 * Catches malformed sentences where a content word was put in the blank
 * (e.g. answer しらべ for the pattern "V てみます", which drops the て and
 * leaves a broken sentence). When the pattern has no kana (only placeholders /
 * kanji) or the answer has no kana, it can't judge and returns true.
 */
export function answerFitsPattern(answer: string, pattern: string): boolean {
  const pat = hiraganaChars(pattern)
  if (pat.length === 0) return true
  const ans = hiraganaChars(answer)
  if (ans.length === 0) return true
  const pset = new Set(pat)
  return ans.some(ch => pset.has(ch))
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatNextReview(ms: number, lang = 'es'): string {
  if (ms >= Number.MAX_SAFE_INTEGER / 2) return lang === 'en' ? '∞ Burned' : lang === 'ca' ? '∞ Cremat' : '∞ Quemado'
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
        // Prefer the orthographic anchor (nextCh) over the phonetic one.
        // Only fall back to phoneticAlt when nextCh is not found in the
        // remaining reading — this prevents a false early match when the
        // kanji's own reading happens to end in the phonetic form of the
        // next particle (e.g. 川 reads as かわ and the next char is は,
        // whose phonetic alt is わ — we must NOT stop at the わ inside かわ).
        // Start at ri+1: a kanji block must consume at least one kana char.
        let s = ri + 1
        while (s < reading.length && reading[s] !== nextCh) s++
        if (s >= reading.length && phoneticAlt) {
          // Orthographic form not found — retry with phonetic alternative
          s = ri + 1
          while (s < reading.length && reading[s] !== phoneticAlt) s++
        }
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
    es: ['',          'Aprendiz 1', 'Aprendiz 2', 'Aprendiz 3', 'Aprendiz 4', 'Gurú 1', 'Gurú 2', 'Maestro', 'Iluminado', 'Quemado'],
    ca: ['',          'Aprenent 1', 'Aprenent 2', 'Aprenent 3', 'Aprenent 4', 'Gurú 1', 'Gurú 2', 'Mestre',  'Il·luminat','Cremat'],
    en: ['',          'Apprentice 1', 'Apprentice 2', 'Apprentice 3', 'Apprentice 4', 'Guru 1', 'Guru 2', 'Master', 'Enlightened', 'Burned'],
    ja: ['', '修業生 1', '修業生 2', '修業生 3', '修業生 4', '玄人 1', '玄人 2', '師範', '悟り', '卒業'],
  }
  return (labels[lang] ?? labels.es)[Math.min(Math.max(level, 1), GRAMMAR_SRS_MAX_LEVEL)] ?? ''
}
