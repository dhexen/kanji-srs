// Shared furigana rendering helpers for grammar sentences.

type RubyToken = { base: string; ruby?: string }

/** Returns true for kanji (CJK unified ideographs). */
export function isKanjiChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff)   // CJK unified
      || (cp >= 0x3400 && cp <= 0x4dbf)   // CJK extension A
}

/**
 * Grammatical particles whose orthographic writing differs from their phonetic
 * reading. AI-generated reading fields sometimes use the phonetic form
 * (e.g. "わ" for は). Accepting both prevents the entire remaining reading
 * from being wrongly assigned to the preceding kanji block.
 */
export const RUBY_PARTICLE_PHONETIC: Record<string, string> = { 'は': 'わ', 'を': 'お', 'へ': 'え' }

/**
 * Splits `text` (kanji/kana mixed) into tokens, each carrying a ruby reading
 * extracted from the flat `reading` string.
 *
 * Algorithm: walk through `text`; when encountering a kana character it must
 * match the same position in `reading` (advance both). Kanji sequences are
 * assigned the reading characters up to the position of the next kana anchor.
 * For grammatical particles (は/を/へ) the phonetic alternative is also
 * accepted as anchor (は→わ, を→お, へ→え) in case the AI stored the
 * phonetic form in the reading field.
 */
export function buildRubyTokens(text: string, reading: string): RubyToken[] {
  if (!text) return []
  if (!reading) return [{ base: text }]

  const tokens: RubyToken[] = []
  let ti = 0  // index into text
  let ri = 0  // index into reading

  while (ti < text.length) {
    const ch = text[ti]

    if (!isKanjiChar(ch)) {
      // Kana / punctuation / ASCII — output as plain span, advance reading by 1
      tokens.push({ base: ch })
      ri++
      ti++
    } else {
      // Kanji sequence: collect consecutive kanji
      let kanjiEnd = ti + 1
      while (kanjiEnd < text.length && isKanjiChar(text[kanjiEnd])) kanjiEnd++

      // Find the reading for this kanji block:
      // the reading ends where the next text character (after the kanji block)
      // appears in the reading string. Also accept the phonetic alternative
      // for particles (は/わ, を/お, へ/え) to handle AI-generated readings.
      let readingEnd: number
      if (kanjiEnd >= text.length) {
        // Last group — consume the rest of reading
        readingEnd = reading.length
      } else {
        const nextCh = text[kanjiEnd]
        const phoneticAlt = RUBY_PARTICLE_PHONETIC[nextCh]
        // Prefer orthographic anchor over phonetic to avoid false early matches
        // (e.g. 川 reads かわ — the わ must not be mistaken for は's phonetic form).
        let searchPos = ri + 1
        while (searchPos < reading.length && reading[searchPos] !== nextCh) searchPos++
        if (searchPos >= reading.length && phoneticAlt) {
          searchPos = ri + 1
          while (searchPos < reading.length && reading[searchPos] !== phoneticAlt) searchPos++
        }
        readingEnd = searchPos
      }

      tokens.push({
        base: text.slice(ti, kanjiEnd),
        ruby: reading.slice(ri, readingEnd) || undefined,
      })
      ti = kanjiEnd
      ri = readingEnd
    }
  }

  return tokens
}

/**
 * Renders a Japanese string with ruby furigana above kanji.
 *
 * When `segments` (per-token `{ t, f? }` from the generator) are provided, they
 * are rendered directly — furigana sits exactly over each kanji group, with no
 * alignment guesswork. Otherwise it falls back to the `buildRubyTokens`
 * heuristic over the flat `reading` (legacy sentences).
 */
export function RubyText(
  { text, reading, segments }: { text: string; reading: string; segments?: { t: string; f?: string }[] },
) {
  const tokens: RubyToken[] = (segments && segments.length > 0)
    ? segments.map(s => ({ base: s.t, ruby: s.f }))
    : buildRubyTokens(text, reading)
  return (
    <>
      {tokens.map((tok, i) =>
        tok.ruby ? (
          <ruby key={i}>
            {tok.base}
            <rt className="text-xs font-normal text-slate-400 tracking-tight">{tok.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{tok.base}</span>
        )
      )}
    </>
  )
}
