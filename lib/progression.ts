export interface UserProgression {
  vocab_xp: number
  grammar_xp: number
  total_xp: number
  vocab_level: number
  grammar_level: number
  total_level: number
  updated_at?: string
}

export interface XpGain {
  vocabXp?: number
  grammarXp?: number
}

export interface AddXpResult {
  prev: UserProgression
  next: UserProgression
  vocabLevelUp: boolean
  grammarLevelUp: boolean
  totalLevelUp: boolean
}

// ── Level curve ────────────────────────────────────────────────────────────────
// XP needed to REACH level n (cumulative from 0)
// Uses 150 × n^1.75. Level 1 = 0 XP (everyone starts at 1).
const BASE = 150
const EXP  = 1.75

export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.floor(BASE * Math.pow(level - 1, EXP))
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  return level
}

export function xpProgressInLevel(xp: number): { current: number; needed: number; pct: number } {
  const level  = levelFromXp(xp)
  const start  = xpForLevel(level)
  const next   = xpForLevel(level + 1)
  const needed = next - start
  const current = xp - start
  return { current, needed, pct: Math.round((current / needed) * 100) }
}

// ── XP rewards ─────────────────────────────────────────────────────────────────
// Vocab: gain scales with SRS level; loss is fixed small penalty
export function vocabXpForResult(srsLevel: number, isCorrect: boolean): number {
  if (isCorrect) return 10 + srsLevel * 5   // 10-45 XP (levels 0–7)
  return -5
}

// Grammar: per-session at the end, based on # correct and # wrong answers
export function grammarXpForSession(correct: number, wrong: number, passed: boolean): number {
  const gain    = correct * 15
  const penalty = wrong * 5
  const bonus   = passed ? 20 : 0
  return Math.max(gain - penalty + bonus, 0)
}

// ── Apply XP ───────────────────────────────────────────────────────────────────
export function applyXp(prev: UserProgression, gain: XpGain): AddXpResult {
  const vocabXp   = Math.max(0, prev.vocab_xp + (gain.vocabXp ?? 0))
  const grammarXp = Math.max(0, prev.grammar_xp + (gain.grammarXp ?? 0))
  const totalXp   = Math.max(0, prev.total_xp + (gain.vocabXp ?? 0) + (gain.grammarXp ?? 0) * 1.5 | 0)

  const vocabLevel   = levelFromXp(vocabXp)
  const grammarLevel = levelFromXp(grammarXp)
  const totalLevel   = levelFromXp(totalXp)

  const next: UserProgression = {
    vocab_xp: vocabXp,
    grammar_xp: grammarXp,
    total_xp: totalXp,
    vocab_level: vocabLevel,
    grammar_level: grammarLevel,
    total_level: totalLevel,
  }

  return {
    prev,
    next,
    vocabLevelUp:   vocabLevel > prev.vocab_level,
    grammarLevelUp: grammarLevel > prev.grammar_level,
    totalLevelUp:   totalLevel > prev.total_level,
  }
}

// ── JLPT estimation ────────────────────────────────────────────────────────────
// Estimates JLPT level from active vocab count (SRS ≥ 4) and known grammar count
export type JlptEstimate = 'N5' | 'N4' | 'N3' | 'N2' | 'N1' | null

export function estimateJlpt(masteredVocab: number, knownGrammar: number): JlptEstimate {
  if (masteredVocab >= 2000 && knownGrammar >= 150) return 'N1'
  if (masteredVocab >= 1000 && knownGrammar >= 100) return 'N2'
  if (masteredVocab >= 500  && knownGrammar >= 70)  return 'N3'
  if (masteredVocab >= 200  && knownGrammar >= 40)  return 'N4'
  if (masteredVocab >= 50   && knownGrammar >= 10)  return 'N5'
  return null
}

export const JLPT_COLORS: Record<NonNullable<JlptEstimate>, string> = {
  N5: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  N4: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  N3: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  N2: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  N1: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
}

export const DEFAULT_PROGRESSION: UserProgression = {
  vocab_xp: 0,
  grammar_xp: 0,
  total_xp: 0,
  vocab_level: 1,
  grammar_level: 1,
  total_level: 1,
}
