// Shared server-side grammar-sentence generation, used by both the admin seed
// step route and the weekly cron refresh. Pure generation: no DB access — the
// caller fetches vocab and inserts the returned rows.

import type { GrammarPoint } from '@/lib/grammar-mnn1'
import type { FuriganaSegment } from '@/lib/grammar-srs'
import { answerFitsPattern } from '@/lib/grammar-srs'

export const GENERATE_SIZE = 38
export const QUALITY_MIN = 4
export const TARGET = 25         // sentences kept per point when filling
export const REFRESH_BATCH = 25  // new sentences added per weekly refresh
export const MAX_POOL = 100      // rolling cap; oldest are trimmed beyond this

// Fallback chain for generation: flash-LITE first (cheaper, higher free daily
// quota), then a quality flash as last resort. The loop advances to the next
// model on overload (503) or a retired model (404). Real per-model limits live
// in Google AI Studio (the docs no longer publish fixed numbers).
// Valid model IDs per https://ai.google.dev/gemini-api/docs/rate-limits
// (gemini-3.1-flash-preview was retired by Google → removed).
export const MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-2.5-flash-lite', 'gemini-2.5-flash']

// A higher-quality model used to VERIFY the lite-generated candidates: it
// confirms each sentence is correct/natural, uses the pattern, has accurate
// furigana (it may correct readings) and a good translation.
export const VERIFY_MODEL = 'gemini-2.5-flash'

export interface SentenceRow {
  grammar_id: string
  sentence_before: string
  sentence_before_reading: string
  sentence_before_segments: FuriganaSegment[]
  sentence_before_alts: string[]
  sentence_before_reading_alts: string[]
  sentence_after: string
  sentence_after_reading: string
  sentence_after_segments: FuriganaSegment[]
  answer: string
  answer_alts: string[]
  answer_hint: { w: string; r?: string }[]
  translation_es: string
  translation_ca: string
  translation_en: string
  is_private: boolean
  private_user_id: string | null
}

export type GenResult =
  | { ok: true; rows: SentenceRow[]; usedModel: string }
  | { ok: false; usedModel: string; error: string; permanent: boolean; retryAfterMs: number }

// ── Furigana segment helpers ────────────────────────────────────────────────
function parseSegments(raw: unknown): FuriganaSegment[] | null {
  if (!Array.isArray(raw)) return null
  const segs: FuriganaSegment[] = []
  for (const x of raw) {
    const t = x && typeof (x as { t?: unknown }).t === 'string' ? String((x as { t: string }).t) : ''
    if (!t) continue
    const fRaw = (x as { f?: unknown }).f
    const f = fRaw != null && String(fRaw).trim() ? String(fRaw).trim() : undefined
    // Lenient: a kanji token without a reading is kept WITHOUT furigana (renders
    // plain) instead of discarding the whole sentence. The flash verify pass
    // fills/corrects the missing readings. Avoids zero-yield when the lite model
    // occasionally forgets one reading.
    segs.push(f ? { t, f } : { t })
  }
  return segs.length ? segs : null
}
const segText = (segs: FuriganaSegment[]) => segs.map(s => s.t).join('')
const segReading = (segs: FuriganaSegment[]) => segs.map(s => s.f ?? s.t).join('')
function parseAnswerHint(raw: unknown): { w: string; r?: string }[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter(x => x && typeof (x as { w?: unknown }).w === 'string' && (x as { w: string }).w.trim())
    .map(x => { const o = x as { w: string; r?: unknown }; const r = o.r != null && String(o.r).trim() ? String(o.r).trim() : undefined; return r ? { w: o.w.trim(), r } : { w: o.w.trim() } })
    .slice(0, 4)
}

export function parseRetryAfterMs(errorMsg: string, status: number): number {
  const match = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i)
  if (match) return Math.ceil(parseFloat(match[1]) * 1000) + 2000
  if (status === 503) return 15_000
  return 65_000
}

export function buildSeedPrompt(grammar: GrammarPoint, vocab: { jp: string; reading: string; meaning: string }[]): string {
  const sample = [...vocab]
    .sort(() => Math.random() - 0.5)
    .slice(0, 20)
    .map(w => `${w.jp}(${w.reading}): ${w.meaning}`)
    .join(', ')

  return `Eres un profesor de japonés experto (nivel nativo). Genera exactamente ${GENERATE_SIZE} frases de práctica para el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

El alumno ve la frase con UN HUECO (___) donde falta la gramática, junto con su traducción, y debe completar la frase entera en japonés.

Vocabulario disponible del currículo escolar japonés (primaria y secundaria): ${sample || 'vocabulario básico N5'}

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
{
  "sentences": [
    {
      "before": [{"t":"私","f":"わたし"},{"t":"は"}],
      "answer": "SOLO la gramática en hiragana/katakana, nunca kanji",
      "answer_alts": ["variante hiragana aceptable"],
      "answer_hint": [{"w":"調べる","r":"しらべる"}],
      "after": [{"t":"パン"},{"t":"を"},{"t":"食","f":"た"},{"t":"べます"}],
      "translation_es": "traducción COMPLETA y NATURAL al español",
      "translation_ca": "traducció COMPLETA i NATURAL al català",
      "translation_en": "COMPLETE and NATURAL English translation",
      "quality": 5
    }
  ]
}

⚠️ "before" y "after" son ARRAYS de tokens {"t":texto} con furigana: si el texto lleva kanji añade {"t":kanji,"f":lectura en hiragana de ESE kanji}. Usa los KANJI normales (no dejes en kana lo que se escribe con kanji). Cada token con kanji DEBE llevar "f". La kana va en tokens sin "f". Ej. 食べます → {"t":"食","f":"た"},{"t":"べます"}; 学生 → {"t":"学生","f":"がくせい"}. "f" siempre en hiragana.

⚠️ REGLAS CRÍTICAS sobre la frase japonesa:
1. La frase COMPLETA (before + answer + after) debe tener sentido lógico por sí sola.
2. El sujeto debe ser claro. Usa contextos cotidianos realistas.

⚠️ REGLA CRÍTICA sobre "answer": solo el marcador gramatical (partículas, cópulas, conjugaciones). NUNCA kanji. Para patrones con forma て o conjugaciones, el answer DEBE incluir esa parte completa (la て, ます…), NUNCA solo la raíz del verbo. Ej. patrón てみます → answer "しらべてみます" ✓, NO "しらべ" (sin て) ✗.

⚠️ "answer_hint": si el answer incluye una PALABRA DE CONTENIDO (verbo, sustantivo, adjetivo) que el alumno debe escribir conjugada, ponla aquí en FORMA DE DICCIONARIO (verbos en forma diccionario, no conjugada): {"w":forma de diccionario con kanji, "r":lectura en hiragana}. Solo las palabras de contenido que estén DENTRO del answer (las del before/after ya se ven). Si el answer es solo gramática (partículas/conjugación sin palabra de contenido), devuelve []. Ej. answer "しらべてみます" → [{"w":"調べる","r":"しらべる"}]; answer "てはいけません" → [].

⚠️ REGLAS sobre traducciones: oraciones COMPLETAS y NATURALES en cada idioma.

Campo "quality" 1–5 (estricto): 5=perfecto, 4=bueno, 3=aceptable, 2=deficiente, 1=incorrecto.

Nivel ${grammar.jlpt}. Varía sujetos y contextos. Partículas ortográficas: は (no わ), を (no お), へ (no え).
Genera exactamente ${GENERATE_SIZE} frases distintas.`
}

/**
 * Second pass: a quality model reviews the lite-generated candidates. It drops
 * sentences with real errors (grammar/pattern/translation) and may correct
 * furigana readings. Robust by design: on any failure it returns the input rows
 * unchanged (we keep the unverified candidates rather than lose the work).
 * Corrections are only applied when the corrected segments keep the SAME text
 * (only the reading `f` may change), so the verifier can't rewrite sentences.
 */
async function verifyRows(rows: SentenceRow[], grammar: GrammarPoint, apiKey: string): Promise<SentenceRow[]> {
  if (rows.length === 0) return rows
  const items = rows.map((r, i) => ({ i, before: r.sentence_before_segments, answer: r.answer, after: r.sentence_after_segments, es: r.translation_es }))
  const prompt = `Eres un profesor de japonés MUY estricto. Revisa estas frases candidatas para el patrón "${grammar.pattern}" (${grammar.name_es}). Cada frase es before + answer + after; los segmentos son tokens {"t":texto,"f":lectura en hiragana del kanji}.

Para CADA frase comprueba:
1. La frase completa (before+answer+after) es gramaticalmente correcta y natural.
2. Usa CORRECTAMENTE el patrón "${grammar.pattern}".
3. La lectura "f" de cada kanji es CORRECTA y está PRESENTE (cada token con kanji debe tener su "f").
4. La traducción al español (es) es correcta y natural.

Devuelve SOLO JSON, un objeto por frase con su índice "i":
[{"i":0,"keep":true},{"i":1,"keep":false},{"i":2,"keep":true,"before":[...],"after":[...]}]
Reglas:
- keep=false SOLO si hay un error REAL (gramática incorrecta, mal uso del patrón, sin sentido, traducción muy mala). No rechaces por preferencias de estilo.
- Si alguna LECTURA de furigana está mal O FALTA en un token con kanji, pon keep=true y devuelve "before"/"after" con los MISMOS textos "t" y la "f" correcta en cada kanji (no cambies el texto de la frase).

Frases:
${JSON.stringify(items)}`

  let text = ''
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VERIFY_MODEL}:generateContent?key=${apiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }) },
    )
    if (!res.ok) return rows  // quota/overload/etc → keep unverified candidates
    const data = await res.json()
    text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  } catch { return rows }

  let verdicts: any[]
  try {
    const clean = text.replace(/```json|```/g, '').trim()
    verdicts = JSON.parse(clean.match(/\[[\s\S]*\]/)?.[0] ?? clean)
    if (!Array.isArray(verdicts)) return rows
  } catch { return rows }

  const byIndex = new Map<number, any>(verdicts.filter(v => v && typeof v.i === 'number').map(v => [v.i, v]))
  const out: SentenceRow[] = []
  rows.forEach((row, i) => {
    const v = byIndex.get(i)
    if (!v) { out.push(row); return }            // no verdict → keep (lenient)
    if (v.keep === false) return                 // dropped by the verifier
    // Apply corrected readings only if the text is unchanged.
    const fixed = { ...row }
    const cb = parseSegments(v.before)
    if (cb && cb.length && segText(cb) === row.sentence_before) {
      fixed.sentence_before_segments = cb; fixed.sentence_before_reading = segReading(cb)
    }
    const ca = parseSegments(v.after)
    if (ca && ca.length && segText(ca) === row.sentence_after) {
      fixed.sentence_after_segments = ca; fixed.sentence_after_reading = segReading(ca)
    }
    out.push(fixed)
  })
  // Safety: if the verifier rejected everything, keep the originals rather than
  // produce nothing (avoids an over-strict model emptying the pool).
  return out.length > 0 ? out : rows
}

/**
 * Generate sentences for one grammar point and return up to `keep` valid rows.
 * Tries the models in order, parses, filters by quality + pattern fit, and
 * builds per-token furigana rows (dropping malformed ones). With `verify` (the
 * default for the seed/cron pipeline), a quality model reviews the candidates.
 * No DB access.
 */
export async function generatePointRows(
  grammar: GrammarPoint,
  vocab: { jp: string; reading: string; meaning: string }[],
  apiKey: string,
  keep: number,
  opts?: { verify?: boolean },
): Promise<GenResult> {
  const prompt = buildSeedPrompt(grammar, vocab)
  let res!: Response
  let data: any = null
  let usedModel = ''

  for (const model of MODELS) {
    try {
      res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) },
      )
      data = await res.json()
      usedModel = model
      // Advance to the next model on overload (503) or a retired model (404);
      // otherwise (success or a real error like 429/400) stop here.
      if (res.ok || (res.status !== 503 && res.status !== 404)) break
    } catch (networkErr: any) {
      return { ok: false, usedModel, error: `Network error: ${networkErr.message}`, permanent: false, retryAfterMs: 10_000 }
    }
  }

  if (!res.ok) {
    const errMsg: string = data?.error?.message ?? `HTTP ${res.status}`
    const permanent = res.status === 400 || res.status === 403 || res.status === 404
    return { ok: false, usedModel, error: `[${usedModel}] ${errMsg}`, permanent, retryAfterMs: parseRetryAfterMs(errMsg, res.status) }
  }

  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  let sentences: any[] = []
  try {
    sentences = JSON.parse(rawText.replace(/```json|```/g, '').trim()).sentences ?? []
  } catch {
    return { ok: false, usedModel, error: 'Error al parsear respuesta de Gemini', permanent: false, retryAfterMs: 5_000 }
  }

  const rows = sentences
    .filter(s => (Number(s.quality) || 5) >= QUALITY_MIN)
    .filter(s => answerFitsPattern(String(s.answer ?? ''), grammar.pattern))
    .map((s: any): SentenceRow | null => {
      const before = parseSegments(s.before)
      const after  = parseSegments(s.after)
      if (before === null || after === null) return null
      return {
        grammar_id:                   grammar.id,
        sentence_before:              segText(before),
        sentence_before_reading:      segReading(before),
        sentence_before_segments:     before,
        sentence_before_alts:         [],
        sentence_before_reading_alts: [],
        sentence_after:               segText(after),
        sentence_after_reading:       segReading(after),
        sentence_after_segments:      after,
        answer:                       String(s.answer ?? ''),
        answer_alts:                  Array.isArray(s.answer_alts) ? s.answer_alts.map(String) : [],
        answer_hint:                  parseAnswerHint(s.answer_hint),
        translation_es:               String(s.translation_es ?? ''),
        translation_ca:               String(s.translation_ca ?? ''),
        translation_en:               String(s.translation_en ?? ''),
        is_private:                   false,
        private_user_id:              null,
      }
    })
    .filter((r): r is SentenceRow => r !== null)
    .slice(0, Math.max(0, keep))

  // Optional quality verification pass (lite generates → flash confirms/corrects).
  const verified = (opts?.verify !== false && rows.length > 0)
    ? await verifyRows(rows, grammar, apiKey)
    : rows

  return { ok: true, rows: verified, usedModel }
}
