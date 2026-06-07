export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'
import type { GrammarPoint } from '@/lib/grammar-mnn1'

const ALL_GRAMMAR: GrammarPoint[] = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]

const TARGET      = 25
const GENERATE_SIZE = 38
const QUALITY_MIN = 4

function buildPrompt(grammar: GrammarPoint, vocab: { jp: string; reading: string; meaning: string }[]): string {
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
      "before_jp": "texto antes del hueco (usa kanji donde corresponda)",
      "before_reading": "lectura completa del before en kana puro, sin kanji",
      "answer": "SOLO la gramática en hiragana/katakana, nunca kanji",
      "answer_alts": ["variante hiragana aceptable"],
      "after_jp": "texto después del hueco",
      "after_reading": "lectura completa del after en kana puro, sin kanji",
      "translation_es": "traducción COMPLETA y NATURAL al español",
      "translation_ca": "traducció COMPLETA i NATURAL al català",
      "translation_en": "COMPLETE and NATURAL English translation",
      "quality": 5
    }
  ]
}

⚠️ REGLAS CRÍTICAS sobre la frase japonesa:
1. La frase COMPLETA (before + answer + after) debe tener sentido lógico por sí sola.
2. El sujeto debe ser claro. Usa contextos cotidianos realistas.

⚠️ REGLA CRÍTICA sobre "answer": solo el marcador gramatical (partículas, cópulas, conjugaciones). NUNCA kanji.

⚠️ REGLAS sobre traducciones: oraciones COMPLETAS y NATURALES en cada idioma.

Campo "quality" 1–5 (estricto): 5=perfecto, 4=bueno, 3=aceptable, 2=deficiente, 1=incorrecto.

Nivel ${grammar.jlpt}. Varía sujetos y contextos. Partículas ortográficas: は (no わ), を (no お), へ (no え).
Genera exactamente ${GENERATE_SIZE} frases distintas.`
}

function parseRetryAfterMs(errorMsg: string): number {
  const match = errorMsg.match(/retry in (\d+(?:\.\d+)?)s/i)
  return match ? Math.ceil(parseFloat(match[1]) * 1000) + 2000 : 65_000
}

export async function POST(req: NextRequest) {
  try {
    const { adminId, service } = await requireAdmin(req)

    // 1. Check if job is still running
    const { data: job } = await service
      .from('grammar_seed_job')
      .select('running')
      .eq('id', 1)
      .single()

    if (!job?.running) {
      return NextResponse.json({ status: 'stopped' })
    }

    // 2. Get sentence counts (paginated to handle large tables)
    const countMap = new Map<string, number>()
    let from = 0
    while (true) {
      const { data } = await service
        .from('grammar_sentences')
        .select('grammar_id')
        .eq('is_private', false)
        .range(from, from + 999)
      if (!data?.length) break
      for (const row of data) {
        countMap.set(row.grammar_id, (countMap.get(row.grammar_id) ?? 0) + 1)
      }
      if (data.length < 1000) break
      from += 1000
    }

    // 3. Get permanently failed grammars (skip these)
    const { data: permErrors } = await service
      .from('grammar_seed_errors')
      .select('grammar_id')
      .eq('is_permanent', true)
    const permanentSet = new Set(permErrors?.map(e => e.grammar_id) ?? [])

    // 4. Find the next grammar point that still needs sentences
    const next = ALL_GRAMMAR.find(g =>
      (countMap.get(g.id) ?? 0) < TARGET && !permanentSet.has(g.id)
    )

    if (!next) {
      await service
        .from('grammar_seed_job')
        .update({ running: false, stopped_at: new Date().toISOString() })
        .eq('id', 1)
      return NextResponse.json({ status: 'all_done' })
    }

    // 5. Get admin's Gemini API key from their settings
    const { data: progress } = await service
      .from('srs_progress')
      .select('gemini_api_key')
      .eq('user_id', adminId)
      .maybeSingle()

    const apiKey = progress?.gemini_api_key || process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        grammar_id: next.id,
        error: 'No hay clave de Gemini configurada. Añádela en Configuración.',
      }, { status: 500 })
    }

    // 6. Get vocab sample for prompt
    const { data: vocabRows } = await service
      .from('vocabulary')
      .select('word, reading, meaning_es')
      .lte('grade', 6)
      .limit(200)
    const vocab = (vocabRows ?? []).map((d: any) => ({
      jp: d.word, reading: d.reading, meaning: d.meaning_es ?? '',
    }))

    // 7. Call Gemini directly (server-side — no EU restriction)
    const prompt = buildPrompt(next, vocab)
    let geminiRes: Response
    try {
      geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      )
    } catch (networkErr: any) {
      await upsertError(service, next.id, `Network error: ${networkErr.message}`, false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: networkErr.message, retry_after_ms: 10_000 })
    }

    const geminiData = await geminiRes.json()

    if (!geminiRes.ok) {
      const errMsg: string = geminiData?.error?.message ?? `HTTP ${geminiRes.status}`
      // 400/404 = bad request (permanent), 429 = quota (retry), 5xx = transient (retry)
      const isPermanent = geminiRes.status === 400 || geminiRes.status === 404
      const retryAfterMs = parseRetryAfterMs(errMsg)

      await upsertError(service, next.id, errMsg, isPermanent)
      return NextResponse.json({
        status: isPermanent ? 'skip' : 'retry',
        grammar_id: next.id,
        error: errMsg,
        retry_after_ms: retryAfterMs,
      })
    }

    // 8. Parse Gemini response
    const rawText: string = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    let sentences: any[] = []
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)
      sentences = parsed.sentences ?? []
    } catch {
      await upsertError(service, next.id, 'Error al parsear respuesta de Gemini', false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: 'Parse error', retry_after_ms: 5_000 })
    }

    // 9. Filter by quality and limit to what's still needed
    const currentCount = countMap.get(next.id) ?? 0
    const needed = TARGET - currentCount
    const passing = sentences
      .filter(s => (Number(s.quality) || 5) >= QUALITY_MIN)
      .slice(0, needed)

    if (passing.length === 0) {
      await upsertError(service, next.id, 'Ninguna frase pasó el filtro de calidad', false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: 'Quality filter rejected all sentences', retry_after_ms: 5_000 })
    }

    // 10. Insert into Supabase
    const rows = passing.map((s: any) => ({
      grammar_id:                   next.id,
      sentence_before:              String(s.before_jp        ?? ''),
      sentence_before_reading:      String(s.before_reading   ?? ''),
      sentence_before_alts:         [],
      sentence_before_reading_alts: [],
      sentence_after:               String(s.after_jp         ?? ''),
      sentence_after_reading:       String(s.after_reading    ?? ''),
      answer:                       String(s.answer           ?? ''),
      answer_alts:                  Array.isArray(s.answer_alts) ? s.answer_alts.map(String) : [],
      translation_es:               String(s.translation_es   ?? ''),
      translation_ca:               String(s.translation_ca   ?? ''),
      translation_en:               String(s.translation_en   ?? ''),
      is_private:                   false,
      private_user_id:              null,
    }))

    const { error: insertError } = await service.from('grammar_sentences').insert(rows)
    if (insertError) {
      await upsertError(service, next.id, `Insert error: ${insertError.message}`, false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: insertError.message, retry_after_ms: 5_000 })
    }

    // 11. Clear error on success
    await service.from('grammar_seed_errors').delete().eq('grammar_id', next.id)

    return NextResponse.json({
      status: 'done',
      grammar_id: next.id,
      sentences_added: rows.length,
      new_count: currentCount + rows.length,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}

async function upsertError(service: any, grammarId: string, msg: string, isPermanent: boolean) {
  await service.from('grammar_seed_errors').upsert(
    { grammar_id: grammarId, error_msg: msg, is_permanent: isPermanent, updated_at: new Date().toISOString() },
    { onConflict: 'grammar_id' },
  )
}
