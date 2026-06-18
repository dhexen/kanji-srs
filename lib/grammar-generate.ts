// Reusable grammar-sentence generation. Extracted from GrammarPractice so both
// the single-grammar practice view and the SRS review selection screen can
// generate sentences without duplicating the (large) prompt.

import type { GrammarPoint } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { getMeaning } from '@/lib/i18n'
import type { GrammarSentence, FuriganaSegment } from '@/lib/grammar-srs'
import { answerFitsPattern } from '@/lib/grammar-srs'

// ── Furigana segment helpers ────────────────────────────────────────────────
function isKanji(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)
}
function hasKanji(s: string): boolean { return [...s].some(isKanji) }

/**
 * Parse the AI's segment array into clean `{t,f?}` tokens. Returns null when
 * malformed (a kanji token without a reading), so such sentences are dropped
 * rather than shown with wrong/missing furigana.
 */
function parseSegments(raw: unknown): FuriganaSegment[] | null {
  if (!Array.isArray(raw)) return null
  const segs: FuriganaSegment[] = []
  for (const x of raw) {
    const t = x && typeof (x as { t?: unknown }).t === 'string' ? String((x as { t: string }).t) : ''
    if (!t) continue
    const fRaw = (x as { f?: unknown }).f
    const f = fRaw != null && String(fRaw).trim() ? String(fRaw).trim() : undefined
    if (hasKanji(t) && !f) return null   // kanji must carry its reading
    segs.push(f ? { t, f } : { t })
  }
  return segs
}
const segText = (segs: FuriganaSegment[]) => segs.map(s => s.t).join('')
const segReading = (segs: FuriganaSegment[]) => segs.map(s => s.f ?? s.t).join('')
import {
  supabase,
  saveGrammarSentences,
  trimGrammarSentencesPool,
  fetchSchoolVocabSample,
  fetchWaniKaniVocabSample,
} from '@/lib/supabase'

// Target pool size to save after filtering
export const TARGET_POOL = 25
// How many to ask Gemini for (extra buffer so filtering still leaves us with TARGET_POOL)
export const GENERATE_SIZE = 38
// Minimum quality score (1–5) to keep a sentence — Gemini self-rates each sentence
export const QUALITY_THRESHOLD = 4
// Maximum number of sentences in the shared pool per grammar point.
export const MAX_POOL = 100

type SimpleVocab = { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }

// Default number of attempts when the API is temporarily unavailable/overloaded.
export const DEFAULT_GEN_MAX_ATTEMPTS = 5

/** Why a generation failed. Drives retry behaviour and the UI message. */
export type GenerateErrorKind =
  | 'transient'  // timeout / overload / 5xx / network → retryable
  | 'quota'      // out of quota / rate limited → permanent for now (don't retry)
  | 'auth'       // bad key / forbidden / bad request → permanent
  | 'exhausted'  // retried the max number of times and still failing
  | 'no_sentences' // API replied but produced nothing usable

export class GrammarGenerateError extends Error {
  kind: GenerateErrorKind
  constructor(message: string, kind: GenerateErrorKind) {
    super(message)
    this.name = 'GrammarGenerateError'
    this.kind = kind
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Classify an /api/gemini error response into transient vs permanent. */
function classifyGeminiError(status: number, message: string): GrammarGenerateError {
  const m = (message || '').toLowerCase()
  const isQuota = m.includes('quota') || m.includes('resource_exhausted') || m.includes('exceeded') || m.includes('límite de solicitudes') || m.includes('limit')
  if (status === 429) return new GrammarGenerateError(message || 'Límite de la API alcanzado', isQuota ? 'quota' : 'transient')
  if (status === 401 || status === 403 || status === 400) return new GrammarGenerateError(message || 'Error de autenticación con la API', 'auth')
  if (status >= 500 || status === 408) return new GrammarGenerateError(message || `La API está saturada (${status})`, 'transient')
  return new GrammarGenerateError(message || `Error ${status}`, 'transient')
}

export interface GenerateGrammarOptions {
  grammar: GrammarPoint
  lang: Lang
  geminiKey: string
  sessionToken: string
  /** Gemini model to use (defaults to gemini-2.5-flash on the server if omitted). */
  model?: string
  /** Fallback vocabulary (the user's active words) if the school sample is empty. */
  activeVocab: SimpleVocab[]
  /** Include the student's WaniKani vocabulary in the prompt (sentences become private). */
  useWkVocab: boolean
  /** Max attempts for transient failures (timeouts/overload). Defaults to DEFAULT_GEN_MAX_ATTEMPTS. */
  maxAttempts?: number
  /** Called before each attempt so the UI can show progress (e.g. "attempt 2/5"). */
  onAttempt?: (attempt: number, maxAttempts: number) => void
}

export interface GenerateGrammarResult {
  generated: number
  kept: number
  attempts: number
}

/**
 * Generate practice sentences for a grammar point with Gemini, quality-filter
 * them, and persist to the pool. Sentences generated with WaniKani vocab are
 * stored as private (only visible to their owner). Throws on API/parse errors.
 */
export async function generateGrammarSentences(opts: GenerateGrammarOptions): Promise<GenerateGrammarResult> {
  const { grammar, lang, geminiKey, sessionToken, model, activeVocab, useWkVocab } = opts

  // Fetch vocabulary samples internally
  const [schoolSampleRaw, wkSampleRaw] = await Promise.all([
    fetchSchoolVocabSample(40).catch(() => []),
    useWkVocab ? fetchWaniKaniVocabSample(40).catch(() => []) : Promise.resolve([]),
  ])

  const schoolBase: { jp: string; reading: string; meaning: string }[] =
    schoolSampleRaw.length > 0
      ? schoolSampleRaw.map(w => ({
          jp: w.jp,
          reading: w.reading,
          meaning:
            lang === 'ca' ? (w.meaning_ca ?? w.meaning_es) :
            lang === 'en' ? (w.meaning_en ?? w.meaning_es) :
            w.meaning_es,
        }))
      : activeVocab.map(w => ({ jp: w.jp, reading: w.reading, meaning: getMeaning(w, lang) }))

  const wkVocab = wkSampleRaw.map(w => ({
    jp: w.word,
    reading: w.reading,
    meaning:
      lang === 'ca' ? (w.meaning_ca ?? w.meaning_en) :
      lang === 'en' ? w.meaning_en :
      (w.meaning_es ?? w.meaning_en),
  }))

  const schoolSample = [...schoolBase]
    .sort(() => Math.random() - 0.5)
    .slice(0, useWkVocab && wkVocab.length > 0 ? 15 : 20)
    .map(w => `${w.jp}(${w.reading}): ${w.meaning}`)
    .join(', ')

  const wkSample = useWkVocab && wkVocab.length > 0
    ? [...wkVocab].sort(() => Math.random() - 0.5).slice(0, 10).map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
    : ''

  const vocabSection = wkSample
    ? `Vocabulario disponible:\n- Del currículo escolar japonés (primaria y secundaria): ${schoolSample}\n- Vocabulario WaniKani del alumno (ya adquirido): ${wkSample}`
    : `Vocabulario disponible del currículo escolar japonés (primaria y secundaria): ${schoolSample || 'vocabulario básico N5'}`

  const prompt = `Eres un profesor de japonés experto (nivel nativo). Genera exactamente ${GENERATE_SIZE} frases de práctica para el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

El alumno ve la frase con UN HUECO (___) donde falta la gramática, junto con su traducción, y debe completar la frase entera en japonés.

${vocabSection}

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
{
  "sentences": [
    {
      "before": [{"t":"私","f":"わたし"},{"t":"は"}],
      "answer": "SOLO la gramática en hiragana/katakana, nunca kanji",
      "answer_alts": ["variante hiragana aceptable"],
      "after": [{"t":"パン"},{"t":"を"},{"t":"食","f":"た"},{"t":"べます"}],
      "translation_es": "traducción COMPLETA y NATURAL al español",
      "translation_ca": "traducció COMPLETA i NATURAL al català",
      "translation_en": "COMPLETE and NATURAL English translation",
      "topic": "uno de: casa, escuela, trabajo, familia, comida, clima, deporte, transporte, ciudad, naturaleza, salud, cotidiano",
      "vocab_used": ["palabras_del_vocabulario_disponible_que_aparecen_en_la_frase"],
      "quality": 5
    }
  ]
}

⚠️ REGLAS CRÍTICAS sobre "before" y "after" (la frase troceada con furigana):
- "before" y "after" son ARRAYS de tokens. Cada token es {"t": texto} y, SOLO si el texto lleva kanji, también {"t": kanji, "f": lectura en hiragana de ESE kanji o grupo de kanji}.
- Escribe las palabras con sus KANJI normales (no las dejes en kana si normalmente se escriben con kanji). Cada token con kanji DEBE llevar su "f" con la lectura EXACTA.
- Separa en tokens de forma natural: un grupo de kanji con su lectura conjunta en un token, y la kana que le sigue en otro token sin "f". Ej. 食べます → {"t":"食","f":"た"},{"t":"べます"}; 学生 → {"t":"学生","f":"がくせい"}.
- La kana (hiragana/katakana, partículas, okurigana) va en tokens SIN "f".
- "f" debe ser SIEMPRE hiragana (la lectura), nunca romaji ni katakana.
- Las partículas en su forma ORTOGRÁFICA: は (no わ), を (no お), へ (no え).

⚠️ REGLAS CRÍTICAS sobre la frase japonesa:
1. La frase COMPLETA (before + answer + after) debe tener sentido lógico por sí sola. NUNCA generes frases incompletas.
2. El sujeto debe ser claro. Ejemplos de frases INCORRECTAS: "La manzana es una" (incompleta), "Ayer es mañana" (sin sentido), "El teléfono come" (ilógica).
3. Usa contextos cotidianos realistas: casa, escuela, trabajo, tiendas, familia, clima, tiempo libre.

⚠️ REGLA CRÍTICA sobre el campo "answer":
- Debe contener ÚNICAMENTE el marcador gramatical: partículas (は、が、を、に、で…), cópulas (です、だ), conjugaciones (ます、ました、て…), patrones fijos (〜てください、〜ている…)
- NUNCA incluyas sustantivos, verbos de contenido, adjetivos ni números en el answer
- NUNCA uses kanji en el answer — solo hiragana o katakana
- El "answer" debe contener la gramática del patrón "${grammar.pattern}". Para patrones con forma て o conjugaciones, el answer DEBE incluir esa parte conjugada completa (la て, ます, etc.), NUNCA solo la raíz del verbo.
- Ejemplo CORRECTO → before:"私は学生", answer:"です", after:"。"  → frase: "私は学生です。" = "Soy estudiante."
- Ejemplo CORRECTO (patrón てみます) → before:"話を疑って", answer:"しらべてみます", after:"。" → frase: "話を疑ってしらべてみます。" (el answer lleva la て)
- Ejemplo INCORRECTO (patrón てみます) → before:"話を疑って", answer:"しらべ", after:"みます。" ← MAL: falta la て y el answer es solo el verbo, la frase queda rota "しらべみます"
- Ejemplo INCORRECTO → before:"今月", answer:"は七月です" ← MAL: incluye vocabulario con kanji
- Ejemplo INCORRECTO → before:"りんご", answer:"は", after:"" ← MAL: la frase queda incompleta "りんごは"

⚠️ REGLAS CRÍTICAS sobre las traducciones:
- Cada traducción debe ser una oración COMPLETA y NATURAL en el idioma destino
- NUNCA termines en "es una", "es el", "tiene un", "de la" o cualquier fragmento incompleto
- La traducción en español, català e inglés debe poder leerse sola y tener pleno sentido
- Si la frase japonesa dice "私はりんごが好きです", la traducción ES "Me gustan las manzanas" NO "Yo la manzana es una"

Campo "quality" — puntuación de coherencia del 1 al 5 (sé MUY ESTRICTO):
- 5: Frase perfecta — japonés natural, sentido completo, contexto realista, traducción exacta
- 4: Buena — uso correcto, algún detalle mejorable pero todo tiene sentido
- 3: Aceptable — uso algo forzado o contexto poco natural pero gramaticalmente correcta
- 2: Deficiente — frase incompleta, contexto irreal, traducción inexacta o incompleta
- 1: Incorrecta — errores gramaticales graves, frase sin sentido lógico o traducción imposible
SIEMPRE asigna calidad 1 a: frases incompletas, traducciones fragmentadas, mezcla de idiomas, información factualmente errónea.
Sé HONESTO: no todas las frases pueden ser 4-5.

Otras reglas:
- Frases naturales y correctas, nivel ${grammar.jlpt}
- Varía sujetos, contextos y vocabulario; usa el vocabulario disponible cuando encaje
- answer_alts: variantes aceptables en hiragana (p.ej. forma informal) o array vacío []
- Genera exactamente ${GENERATE_SIZE} frases distintas con sujetos y vocabulario variados`

  // ── Retry loop: transient failures (timeouts / overload / 5xx) are retried
  // with exponential-ish backoff; permanent failures (quota, auth) stop immediately.
  const maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_GEN_MAX_ATTEMPTS)
  let lastTransient: GrammarGenerateError | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    opts.onAttempt?.(attempt, maxAttempts)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ prompt, ...(model ? { model } : {}), userApiKey: geminiKey }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw classifyGeminiError(res.status, err?.error ?? '')
      }
      const data  = await res.json()
      const clean = String(data.text ?? '').replace(/```json|```/g, '').trim()
      let parsed: any
      try { parsed = JSON.parse(clean) } catch { throw new GrammarGenerateError('La API devolvió una respuesta inválida', 'transient') }
      if (!parsed.sentences?.length) throw new GrammarGenerateError('no_sentences', 'no_sentences')

      const allRaw  = parsed.sentences as any[]
      const passing = allRaw
        .filter(s => (Number(s.quality) || 5) >= QUALITY_THRESHOLD)
        // Drop sentences whose blank doesn't actually contain the grammar (e.g. a
        // content verb stuffed into the answer for a て-form pattern), which would
        // produce a broken sentence and a misleading correction.
        .filter(s => answerFitsPattern(String(s.answer ?? ''), grammar.pattern))

      const newSentences: Omit<GrammarSentence, 'id'>[] = passing
        .map(s => {
          const before = parseSegments(s.before)
          const after  = parseSegments(s.after)
          // Drop sentences whose furigana is malformed (kanji without reading).
          if (before === null || after === null) return null
          return {
            grammar_id:                     grammar.id,
            sentence_before:                segText(before),
            sentence_before_reading:        segReading(before),
            sentence_before_segments:       before,
            sentence_before_alts:           [],
            sentence_before_reading_alts:   [],
            sentence_after:                 segText(after),
            sentence_after_reading:         segReading(after),
            sentence_after_segments:        after,
            answer:                         String(s.answer             ?? grammar.pattern),
            answer_alts:                    Array.isArray(s.answer_alts) ? (s.answer_alts as unknown[]).map(String) : [],
            translation_es:                 String(s.translation_es     ?? ''),
            translation_ca:                 String(s.translation_ca     ?? ''),
            translation_en:                 String(s.translation_en     ?? ''),
            topic:                          typeof s.topic === 'string' ? s.topic : undefined,
            vocab_used:                     Array.isArray(s.vocab_used) ? (s.vocab_used as unknown[]).map(String) : [],
          } as Omit<GrammarSentence, 'id'>
        })
        .filter((x): x is Omit<GrammarSentence, 'id'> => x !== null)
        .slice(0, TARGET_POOL)

      // Sentences generated with WaniKani vocab are private — not visible in the community pool
      const isPrivate = useWkVocab && wkVocab.length > 0
      const userId = isPrivate ? (await supabase.auth.getUser()).data.user?.id : undefined
      await saveGrammarSentences(grammar.id, newSentences, isPrivate ? { isPrivate: true, userId } : undefined)
      await trimGrammarSentencesPool(grammar.id, MAX_POOL)

      return { generated: allRaw.length, kept: newSentences.length, attempts: attempt }
    } catch (e) {
      const ge = e instanceof GrammarGenerateError
        ? e
        : new GrammarGenerateError(e instanceof Error ? e.message : 'Error de red', 'transient')
      // Permanent errors stop the loop immediately.
      if (ge.kind === 'quota' || ge.kind === 'auth' || ge.kind === 'no_sentences') throw ge
      // Transient: back off and retry if attempts remain.
      lastTransient = ge
      if (attempt < maxAttempts) {
        await sleep(Math.min(3000 * attempt, 15000))
        continue
      }
    }
  }

  throw new GrammarGenerateError(lastTransient?.message || 'La API está saturada', 'exhausted')
}
