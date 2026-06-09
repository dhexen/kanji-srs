// Furigana helper for the vocabulary glossary.
//
// We only store the whole-word reading, so per-kanji furigana is derived with a
// heuristic that aligns kana anchors. It is reliable per-kanji only when every
// kanji can be matched to its own reading slice; adjacent kanji with no kana
// between them (先生, 大空…) or jukujikun (大人=おとな) can't be split this way.
// In those cases `perKanjiReliable` is false → the UI shows an "approximate"
// notice and the word can be flagged for an admin to set per-kanji readings.

export interface FuriToken { text: string; ruby?: string }
export interface FuriResult { tokens: FuriToken[]; perKanjiReliable: boolean }

/** Curated per-kanji furigana segment stored in `vocabulary.reading_segments`. */
export interface FuriSegment { t: string; f?: string }

function isKanjiChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff)   // CJK unified
      || (cp >= 0x3400 && cp <= 0x4dbf)   // extension A
      || (cp >= 0xf900 && cp <= 0xfaff)   // compatibility
}

const PARTICLE_PHONETIC: Record<string, string> = { 'は': 'わ', 'を': 'お', 'へ': 'え' }

export function hasKanji(s: string): boolean {
  return Array.from(s).some(isKanjiChar)
}

export function buildFurigana(word: string, reading: string, segments?: FuriSegment[] | null): FuriResult {
  // Admin-curated segments are authoritative → always reliable.
  if (segments && segments.length > 0) {
    return {
      tokens: segments.map(s => ({ text: s.t, ruby: s.f || undefined })),
      perKanjiReliable: true,
    }
  }
  if (!word) return { tokens: [], perKanjiReliable: true }
  if (!reading) return { tokens: [{ text: word }], perKanjiReliable: !hasKanji(word) }

  const tokens: FuriToken[] = []
  let ti = 0
  let ri = 0
  let reliable = true

  while (ti < word.length) {
    const ch = word[ti]
    if (!isKanjiChar(ch)) {
      tokens.push({ text: ch })
      ri++
      ti++
      continue
    }
    // Collect a run of consecutive kanji
    let end = ti + 1
    while (end < word.length && isKanjiChar(word[end])) end++
    const block = word.slice(ti, end)

    let readingEnd: number
    if (end >= word.length) {
      readingEnd = reading.length
    } else {
      const nextCh = word[end]
      const phonetic = PARTICLE_PHONETIC[nextCh]
      let pos = ri + 1
      while (pos < reading.length && reading[pos] !== nextCh) pos++
      if (pos >= reading.length && phonetic) {
        pos = ri + 1
        while (pos < reading.length && reading[pos] !== phonetic) pos++
      }
      readingEnd = pos
    }
    const ruby = reading.slice(ri, readingEnd)
    // Per-kanji reliability: a block must be a single kanji with a non-empty reading.
    if (Array.from(block).length > 1 || !ruby) reliable = false
    tokens.push({ text: block, ruby: ruby || undefined })
    ti = end
    ri = readingEnd
  }

  // Leftover reading we couldn't place → alignment was off
  if (ri < reading.length) reliable = false

  return { tokens, perKanjiReliable: reliable }
}
