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

// 3.1-flash-lite: 500 RPD, 3.1-flash: 500 RPD, 2.5-flash: 20 RPD (last resort)
export const MODELS = ['gemini-3.1-flash-lite-preview', 'gemini-3.1-flash-preview', 'gemini-2.5-flash']

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
function hasKanji(s: string): boolean {
  return [...s].some(ch => {
    const cp = ch.codePointAt(0) ?? 0
    return (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf)
  })
}
function parseSegments(raw: unknown): FuriganaSegment[] | null {
  if (!Array.isArray(raw)) return null
  const segs: FuriganaSegment[] = []
  for (const x of raw) {
    const t = x && typeof (x as { t?: unknown }).t === 'string' ? String((x as { t: string }).t) : ''
    if (!t) continue
    const fRaw = (x as { f?: unknown }).f
    const f = fRaw != null && String(fRaw).trim() ? String(fRaw).trim() : undefined
    if (hasKanji(t) && !f) return null
    segs.push(f ? { t, f } : { t })
  }
  return segs
}
const segText = (segs: FuriganaSegment[]) => segs.map(s => s.t).join('')
const segReading = (segs: FuriganaSegment[]) => segs.map(s => s.f ?? s.t).join('')

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

⚠️ REGLAS sobre traducciones: oraciones COMPLETAS y NATURALES en cada idioma.

Campo "quality" 1–5 (estricto): 5=perfecto, 4=bueno, 3=aceptable, 2=deficiente, 1=incorrecto.

Nivel ${grammar.jlpt}. Varía sujetos y contextos. Partículas ortográficas: は (no わ), を (no お), へ (no え).
Genera exactamente ${GENERATE_SIZE} frases distintas.`
}

/**
 * Generate sentences for one grammar point and return up to `keep` valid rows.
 * Tries the models in order, parses, filters by quality + pattern fit, and
 * builds per-token furigana rows (dropping malformed ones). No DB access.
 */
export async function generatePointRows(
  grammar: GrammarPoint,
  vocab: { jp: string; reading: string; meaning: string }[],
  apiKey: string,
  keep: number,
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
      if (res.status !== 503) break
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
        translation_es:               String(s.translation_es ?? ''),
        translation_ca:               String(s.translation_ca ?? ''),
        translation_en:               String(s.translation_en ?? ''),
        is_private:                   false,
        private_user_id:              null,
      }
    })
    .filter((r): r is SentenceRow => r !== null)
    .slice(0, Math.max(0, keep))

  return { ok: true, rows, usedModel }
}
