// Generates a fake-but-plausible hiragana reading by mutating one mora of a
// real reading — used as a last-resort multiple-choice distractor when there
// aren't enough real alternate-kanji-reading candidates to fill the options.
// Deliberately NOT a kanji reading dictionary: it doesn't claim the result is
// a real reading of anything, just a phonetically-close wrong answer.

const SMALL_YOON = new Set(['ゃ', 'ゅ', 'ょ'])

function tokenizeMora(s: string): string[] {
  const chars = Array.from(s)
  const tokens: string[] = []
  for (let i = 0; i < chars.length; i++) {
    if (i > 0 && SMALL_YOON.has(chars[i]) && tokens.length > 0) {
      tokens[tokens.length - 1] += chars[i]
    } else {
      tokens.push(chars[i])
    }
  }
  return tokens
}

// Same consonant row, different vowel — e.g. か/き/く/け/こ.
const ROWS: string[][] = [
  ['あ', 'い', 'う', 'え', 'お'],
  ['か', 'き', 'く', 'け', 'こ'],
  ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
  ['さ', 'し', 'す', 'せ', 'そ'],
  ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
  ['た', 'ち', 'つ', 'て', 'と'],
  ['だ', 'ぢ', 'づ', 'で', 'ど'],
  ['な', 'に', 'ぬ', 'ね', 'の'],
  ['は', 'ひ', 'ふ', 'へ', 'ほ'],
  ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ'],
  ['ま', 'み', 'む', 'め', 'も'],
  ['ら', 'り', 'る', 'れ', 'ろ'],
]

// Voicing/semi-voicing siblings — e.g. か/が, は/ば/ぱ.
const DAKUTEN_GROUPS: string[][] = [
  ['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'],
  ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'],
  ['た', 'だ'], ['ち', 'ぢ'], ['つ', 'づ'], ['て', 'で'], ['と', 'ど'],
  ['は', 'ば', 'ぱ'], ['ひ', 'び', 'ぴ'], ['ふ', 'ぶ', 'ぷ'], ['へ', 'べ', 'ぺ'], ['ほ', 'ぼ', 'ぽ'],
]

// Hand-picked pairs that learners commonly confuse despite not being in the
// same row or dakuten group (similar sound or shape).
const EXTRA_CONFUSABLE: Record<string, string[]> = {
  'し': ['ち'], 'ち': ['し'],
  'す': ['つ'], 'つ': ['す', 'っ'],
  'っ': ['つ'],
  'ん': ['む'], 'む': ['ん'],
  'ゆ': ['よ'], 'よ': ['ゆ'],
  'り': ['い'], 'い': ['り'],
  'め': ['ぬ'], 'ぬ': ['め'],
  'わ': ['は'], 'は': ['わ'],
  'を': ['お'], 'お': ['を'],
}

function rowNeighbors(ch: string): string[] {
  for (const row of ROWS) if (row.includes(ch)) return row.filter(c => c !== ch)
  return []
}
function dakutenSiblings(ch: string): string[] {
  for (const g of DAKUTEN_GROUPS) if (g.includes(ch)) return g.filter(c => c !== ch)
  return []
}
function confusablesFor(ch: string): string[] {
  const set = new Set<string>([...rowNeighbors(ch), ...dakutenSiblings(ch), ...(EXTRA_CONFUSABLE[ch] ?? [])])
  set.delete(ch)
  return [...set]
}

/**
 * Mutates one mora of `reading` into a phonetically-confusable one. Retries a
 * few times to avoid colliding with the real reading or `avoid` (other
 * options already picked); falls back to a small deterministic tweak if no
 * mutation is possible (e.g. a reading with no matching hiragana, like a
 * pure katakana loanword).
 */
/** Number of mora (kana beats) in a reading — small yōon count as one. */
export function moraCount(reading: string): number {
  return tokenizeMora(reading).length
}

/**
 * A slice of a reading, flagged as `mutable` (a kanji's reading, safe to alter)
 * or fixed (visible okurigana / kana the learner can already read on screen).
 * The concatenation of every `text` must equal the full correct reading.
 */
export interface ReadingSegment { text: string; mutable: boolean }

/**
 * Like `generateFakeReading`, but only mutates mora inside `mutable` segments,
 * leaving the visible okurigana untouched. For a word like 目つき (めつき) this
 * keeps つき fixed and varies only め → みつき / もつき, so the wrong options are
 * the same length and share the on-screen kana — a real test, not one the
 * learner can eliminate at a glance. Falls back to whole-word mutation when the
 * template has no mutable region.
 */
export function generateFakeReadingSegmented(segments: ReadingSegment[], avoid: Set<string> = new Set()): string {
  const full = segments.map(s => s.text).join('')
  const segTokens = segments.map(s => ({ tokens: tokenizeMora(s.text), mutable: s.mutable }))
  const mutablePos: Array<[number, number]> = []
  segTokens.forEach((seg, si) => { if (seg.mutable) seg.tokens.forEach((_, mi) => mutablePos.push([si, mi])) })
  if (mutablePos.length === 0) return generateFakeReading(full, avoid)

  for (let attempt = 0; attempt < 16; attempt++) {
    const [si, mi] = mutablePos[Math.floor(Math.random() * mutablePos.length)]
    const token = segTokens[si].tokens[mi]
    const base = token[0]
    const suffix = token.slice(1)
    const options = confusablesFor(base)
    if (options.length === 0) continue
    const replacement = options[Math.floor(Math.random() * options.length)]
    const candidate = segTokens
      .map((seg, si2) => seg.tokens.map((tk, mi2) => (si2 === si && mi2 === mi) ? replacement + suffix : tk).join(''))
      .join('')
    if (candidate !== full && !avoid.has(candidate)) return candidate
  }
  // Couldn't find a distinct in-region mutation → fall back to whole-word.
  return generateFakeReading(full, avoid)
}

export function generateFakeReading(reading: string, avoid: Set<string> = new Set()): string {
  const tokens = tokenizeMora(reading)
  if (tokens.length === 0) return reading

  function tryMutate(): string | null {
    const idx = Math.floor(Math.random() * tokens.length)
    const token = tokens[idx]
    const base = token[0]
    const suffix = token.slice(1)
    const options = confusablesFor(base)
    if (options.length === 0) return null
    const replacement = options[Math.floor(Math.random() * options.length)]
    const mutated = [...tokens]
    mutated[idx] = replacement + suffix
    return mutated.join('')
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = tryMutate()
    if (candidate && candidate !== reading && !avoid.has(candidate)) return candidate
  }

  // Deterministic fallback: flip the vowel of the last mora.
  const lastIdx = tokens.length - 1
  const lastBase = tokens[lastIdx][0]
  const rowNb = rowNeighbors(lastBase)
  if (rowNb.length > 0) {
    const mutated = [...tokens]
    mutated[lastIdx] = rowNb[0] + tokens[lastIdx].slice(1)
    const candidate = mutated.join('')
    if (candidate !== reading && !avoid.has(candidate)) return candidate
  }

  // Absolute last resort: guaranteed different from the original reading.
  return reading + (tokens[lastIdx]?.[0] ?? 'つ')
}
