export const dynamic = 'force-dynamic'

/**
 * Revisa las entradas de vocabulario formadas por un ÚNICO kanji y detecta las
 * que NO son una palabra real por sí mismas (la lectura solo existe con
 * okurigana o dentro de un compuesto, p. ej. word 休 / reading やす → la palabra
 * real es 休む). Usa Gemini como diccionario.
 *
 * POST  → escanea una página. Los kanji sueltos pendientes van a Gemini y se
 *         marcan word_review = 'flagged' (sospechosa) u 'ok' (palabra válida).
 *         Body: { limit?, offset?, geminiApiKey?, model? }
 * GET    → lista las entradas 'flagged' (cola de revisión humana).
 * PATCH  → fija el estado de una entrada. Body: { word, kanji, status }
 *          status ∈ 'hidden' (ocultar) | 'ok' (es válida) | 'flagged' | 'pending'
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError, AdminApiError, recordToolRun } from '@/lib/admin-server'
import { normalizeGeminiModel } from '@/lib/gemini-models'

const DEFAULT_LIMIT = 100
const GEMINI_BATCH = 40
const REVIEW_STATES = ['pending', 'flagged', 'ok', 'hidden'] as const
type ReviewState = (typeof REVIEW_STATES)[number]

/** True si la palabra es exactamente un carácter kanji (ideograma CJK). */
function isSingleKanji(word: string): boolean {
  const chars = [...word]
  return chars.length === 1 && /[㐀-鿿豈-﫿]/.test(chars[0])
}

interface WordVerdict { word: string; real: boolean }

async function geminiJudge(
  rows: Array<{ word: string; reading: string; meaning: string }>,
  apiKey: string,
  model: string,
): Promise<WordVerdict[]> {
  const wordList = rows.map(r => `${r.word} (${r.reading}) = ${r.meaning}`).join('\n')
  const prompt = `You are a Japanese dictionary. Each item below is a SINGLE kanji together with a reading and meaning. Decide, for the given reading, whether it is a REAL standalone Japanese word — something that appears as a dictionary headword and can be used on its own.

Mark real = false when the kanji on its own is NOT a usable word with that reading, typically because the reading is a kun-reading that only exists with okurigana (e.g. 休 / やす → the real word is 休む) or only appears inside compounds. Judge the SPECIFIC reading given: the same kanji can be a real word with another reading (e.g. 休 / きゅう "rest" is real, 休 / やす is not).

Mark real = true only if a native speaker would accept the kanji written alone, read that way, as a complete word.

Return ONLY valid JSON, no markdown, one object per input word:
[{"word":"休","real":false},{"word":"本","real":true}]

Words:
${wordList}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const MAX_ATTEMPTS = 4
  let text = ''
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0 } }),
      })
    } catch (e) {
      if (attempt === MAX_ATTEMPTS) throw e
      await new Promise(r => setTimeout(r, 2000 * attempt)); continue
    }
    if (res.ok) {
      const data = await res.json()
      text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
      break
    }
    const data = await res.json().catch(() => ({}))
    const msg = (data as { error?: { message?: string } })?.error?.message ?? res.statusText
    const transient = res.status === 429 || res.status >= 500
    if (!transient || attempt === MAX_ATTEMPTS) throw new Error(`Gemini ${res.status}: ${msg}`)
    await new Promise(r => setTimeout(r, (res.status === 429 ? 15000 : 3000) * attempt))
  }
  if (!text) return []
  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(clean) as WordVerdict[]
  } catch {
    const m = clean.match(/\[[\s\S]*\]/)
    return m ? (JSON.parse(m[0]) as WordVerdict[]) : []
  }
}

// ── POST: escanear una página ────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { service, adminId } = await requireAdmin(request)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const limit = Math.min(Math.max(1, Number(body.limit) || DEFAULT_LIMIT), 300)
    const offset = Math.max(0, Number(body.offset) || 0)
    if (offset === 0) void recordToolRun(service, 'vocab-scan-non-words', adminId)
    const geminiApiKey = (typeof body.geminiApiKey === 'string' && body.geminiApiKey.trim())
      ? body.geminiApiKey.trim()
      : process.env.GEMINI_API_KEY
    if (!geminiApiKey) throw new AdminApiError('Falta la Gemini API Key.', 400)
    const model = normalizeGeminiModel(typeof body.model === 'string' ? body.model : undefined)

    const { data: rows, error: fetchErr } = await service
      .from('vocabulary')
      .select('word, kanji, reading, meaning_es, word_review')
      .order('grade', { ascending: true })
      .order('sort_order', { ascending: true })
      .range(offset, offset + limit - 1)
    if (fetchErr) throw new AdminApiError(fetchErr.message, 500)

    const all = (rows ?? []) as { word: string; kanji: string; reading: string; meaning_es: string; word_review: string | null }[]
    const fetched = all.length
    const done = fetched < limit

    // Solo kanji sueltos aún sin decidir.
    const candidates = all
      .filter(r => (r.word_review ?? 'pending') === 'pending' && isSingleKanji(r.word))
      .map(r => ({ word: r.word, kanji: r.kanji, reading: r.reading, meaning: r.meaning_es || '' }))

    if (candidates.length === 0) {
      return NextResponse.json({ scanned: 0, flagged: 0, ok: 0, fetched, done, next_offset: offset + fetched })
    }

    let verdicts: WordVerdict[] = []
    for (let i = 0; i < candidates.length; i += GEMINI_BATCH) {
      try {
        verdicts.push(...await geminiJudge(candidates.slice(i, i + GEMINI_BATCH), geminiApiKey, model))
      } catch (e) {
        if (verdicts.length === 0) throw new AdminApiError(`Error de Gemini: ${e instanceof Error ? e.message : String(e)}`, 502)
        break
      }
    }

    const byWord = new Map(verdicts.filter(v => v && typeof v.word === 'string').map(v => [v.word, v]))
    let hidden = 0
    let okCount = 0
    let scanned = 0
    for (const c of candidates) {
      const v = byWord.get(c.word)
      if (!v || typeof v.real !== 'boolean') continue  // sin veredicto → se reintenta en otra pasada
      // Los que NO son palabra real se ocultan directamente, sin revisión humana.
      const status: ReviewState = v.real ? 'ok' : 'hidden'
      const { error: upErr } = await service
        .from('vocabulary')
        .update({ word_review: status })
        .eq('word', c.word)
        .eq('kanji', c.kanji)
      if (upErr) continue
      scanned++
      if (status === 'hidden') {
        hidden++
        // Sacar también la palabra del pool SRS de todos los usuarios.
        await service.from('user_vocab_progress').delete().eq('jp', c.word)
      } else {
        okCount++
      }
    }

    return NextResponse.json({ scanned, hidden, ok: okCount, fetched, done, next_offset: offset + fetched })
  } catch (e) {
    return adminJsonError(e)
  }
}

// ── GET: kanji sueltos ocultados por la IA (para auditar / restaurar) ─────────
export async function GET(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const { data, error } = await service
      .from('vocabulary')
      .select('word, kanji, reading, meaning_es, grade')
      .eq('word_review', 'hidden')
      .order('grade', { ascending: true })
      .order('word', { ascending: true })
      .limit(1000)
    if (error) throw new AdminApiError(error.message, 500)
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    return adminJsonError(e)
  }
}

// ── PATCH: fijar estado de una entrada ───────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const { service } = await requireAdmin(request)
    const body = await request.json().catch(() => ({})) as Record<string, unknown>
    const word = typeof body.word === 'string' ? body.word : ''
    const kanji = typeof body.kanji === 'string' ? body.kanji : ''
    const status = body.status as ReviewState
    if (!word || !kanji) throw new AdminApiError('word y kanji son obligatorios', 400)
    if (!REVIEW_STATES.includes(status)) throw new AdminApiError('Estado no válido', 400)

    const { error } = await service
      .from('vocabulary')
      .update({ word_review: status })
      .eq('word', word)
      .eq('kanji', kanji)
    if (error) throw new AdminApiError(error.message, 500)

    // Al ocultar, sacar también la palabra del pool SRS de todos los usuarios
    // (mismo comportamiento que el borrado de admin). No es recuperable: si más
    // tarde se marca como válida, el progreso perdido no se restaura.
    if (status === 'hidden') {
      const { error: progressErr } = await service
        .from('user_vocab_progress')
        .delete()
        .eq('jp', word)
      if (progressErr) throw new AdminApiError(progressErr.message, 500)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
