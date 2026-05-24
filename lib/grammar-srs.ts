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
  sentence_after: string           // kanji/kana text after the blank
  sentence_after_reading: string   // pure kana reading of the after part
  answer: string                   // correct grammar pattern
  answer_alts: string[]            // other acceptable answers
  translation_es: string
  translation_ca: string
  translation_en: string
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

/**
 * Checks whether the user's full-sentence input matches the correct sentence.
 *
 * "Correct" is evaluated against the kana reading form
 * (sentence_before_reading + answer + sentence_after_reading), which is what
 * romaji → hiragana input will produce. Falls back to the kanji form so that
 * users typing with a Japanese IME can also be accepted.
 *
 * Both sides are normalised before comparison (punctuation stripped, etc.).
 */
export function checkFullSentence(
  userInput: string,
  sentenceBeforeReading: string,
  sentenceBefore: string,
  answer: string,
  sentenceAfterReading: string,
  sentenceAfter: string,
): boolean {
  const norm = normalizeAnswer(userInput)
  if (!norm) return false

  // Primary: kana form — what romaji / hiragana input produces
  const beforeKana = sentenceBeforeReading || sentenceBefore
  const afterKana  = sentenceAfterReading  || sentenceAfter
  const kanaFull   = normalizeAnswer(beforeKana + answer + afterKana)
  if (norm === kanaFull) return true

  // Fallback: kanji form — for users with a Japanese IME
  const kanjiFull = normalizeAnswer(sentenceBefore + answer + sentenceAfter)
  if (norm === kanjiFull) return true

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
