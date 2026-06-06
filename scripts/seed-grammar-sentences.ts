#!/usr/bin/env npx tsx
/**
 * Seed shared grammar sentences for all grammar points.
 *
 * - Skips grammar points that already have >= TARGET sentences shared (is_private = false).
 * - Routes Gemini calls through the Vercel app (avoids EU free-tier restrictions).
 * - Uses the Supabase service role key to write sentences (bypasses RLS).
 * - Handles 429 / quota errors: rotates keys, waits QUOTA_WAIT_MS before retrying.
 * - Handles transient errors: exponential backoff up to MAX_ATTEMPTS retries.
 * - Fully resumable: re-running picks up from where it left off.
 *
 * Usage:
 *   npx tsx scripts/seed-grammar-sentences.ts
 *   npx tsx scripts/seed-grammar-sentences.ts --dry-run
 *
 * Required env vars (add to .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SEED_SECRET           — must match SEED_SECRET in Vercel env vars
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { GRAMMAR_POINTS } from '../lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '../lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '../lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '../lib/grammar-bunpro'
import type { GrammarPoint } from '../lib/grammar-mnn1'

// ─── Config ───────────────────────────────────────────────────────────────────
const TARGET        = 25     // desired shared sentences per grammar point
const GENERATE_SIZE = 38     // ask Gemini for more so filtering still leaves TARGET
const QUALITY_MIN   = 4      // minimum quality score (1–5) to keep a sentence
const DELAY_MS      = 5_000  // ms between successful calls (~12/min, under 15 RPM)
const QUOTA_WAIT_MS = 65_000 // ms to wait after a 429 (server key RPM reset)
const MAX_ATTEMPTS  = 5      // max retries per grammar point
const APP_URL       = 'https://kanji-srs-one.vercel.app'

// ─── Load .env.local ──────────────────────────────────────────────────────────
const envFile = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
    const m = line.match(/^([^#=\s][^=]*)=(.*)$/)
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[m[1].trim()]) process.env[m[1].trim()] = val
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY!
const SEED_SECRET  = process.env.SEED_SECRET!
const GEMINI_KEY   = process.env.GEMINI_API_KEY!
const DRY_RUN      = process.argv.includes('--dry-run')

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}
if (!DRY_RUN && (!SEED_SECRET || !GEMINI_KEY)) {
  console.error('❌ Missing SEED_SECRET or GEMINI_API_KEY in .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

function fmt(ms: number) {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`
}



// ─── All grammar points ───────────────────────────────────────────────────────
const ALL_GRAMMAR: GrammarPoint[] = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]

// ─── Count existing shared sentences ─────────────────────────────────────────
async function getSharedCounts(): Promise<Map<string, number>> {
  console.log('🔍 Fetching existing shared sentence counts…')
  const counts = new Map<string, number>()
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await supabase
      .from('grammar_sentences')
      .select('grammar_id')
      .eq('is_private', false)
      .range(from, from + PAGE - 1)
    if (error) { console.error('Supabase error:', error.message); break }
    if (!data?.length) break
    for (const row of data) {
      counts.set(row.grammar_id, (counts.get(row.grammar_id) ?? 0) + 1)
    }
    if (data.length < PAGE) break
    from += PAGE
  }
  return counts
}

// ─── Fetch school vocab sample ────────────────────────────────────────────────
async function fetchSchoolVocab(): Promise<{ jp: string; reading: string; meaning: string }[]> {
  const { data } = await supabase
    .from('vocabulary')
    .select('word, reading, meaning_es')
    .lte('grade', 9)
    .limit(500)
  return (data ?? []).map((d: any) => ({ jp: d.word, reading: d.reading, meaning: d.meaning_es ?? '' }))
}

// ─── Build prompt ─────────────────────────────────────────────────────────────
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
      "topic": "uno de: casa, escuela, trabajo, familia, comida, clima, deporte, transporte, ciudad, naturaleza, salud, cotidiano",
      "vocab_used": ["palabras_del_vocabulario_disponible_que_aparecen_en_la_frase"],
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

// ─── Call Gemini via Vercel app ───────────────────────────────────────────────
async function callGeminiViaApp(prompt: string): Promise<any[]> {
  const res = await fetch(`${APP_URL}/api/gemini`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Seed-Secret': SEED_SECRET,
    },
    body: JSON.stringify({ prompt, model: 'gemini-2.5-flash', userApiKey: GEMINI_KEY }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg: string = data?.error ?? `HTTP ${res.status}`
    console.log(`\n  [${res.status}] ${msg}`)
    if (res.status === 429) {
      console.log(`\n  ⏸  Rate limited. Waiting ${fmt(QUOTA_WAIT_MS)}…`)
      await sleep(QUOTA_WAIT_MS)
      throw Object.assign(new Error(msg), { kind: 'quota' })
    }
    if (res.status === 401) throw Object.assign(new Error('check SEED_SECRET matches Vercel env'), { kind: 'auth' })
    if (res.status >= 500 || res.status === 408) throw Object.assign(new Error(msg), { kind: 'transient' })
    throw Object.assign(new Error(msg), { kind: 'permanent' })
  }

  const data = await res.json()
  const text: string = data.text ?? ''
  if (!text) throw Object.assign(new Error('empty response'), { kind: 'transient' })
  const clean = text.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(clean)
  if (!parsed.sentences?.length) throw Object.assign(new Error('no sentences'), { kind: 'transient' })
  return parsed.sentences as any[]
}

// ─── Save sentences to Supabase ───────────────────────────────────────────────
async function saveSentences(grammarId: string, sentences: any[]): Promise<number> {
  const passing = sentences
    .filter(s => (Number(s.quality) || 5) >= QUALITY_MIN)
    .slice(0, TARGET)
  if (passing.length === 0) return 0

  const rows = passing.map((s: any) => ({
    grammar_id:                   grammarId,
    sentence_before:              String(s.before_jp       ?? ''),
    sentence_before_reading:      String(s.before_reading  ?? ''),
    sentence_before_alts:         [],
    sentence_before_reading_alts: [],
    sentence_after:               String(s.after_jp        ?? ''),
    sentence_after_reading:       String(s.after_reading   ?? ''),
    answer:                       String(s.answer          ?? ''),
    answer_alts:                  Array.isArray(s.answer_alts) ? s.answer_alts.map(String) : [],
    translation_es:               String(s.translation_es  ?? ''),
    translation_ca:               String(s.translation_ca  ?? ''),
    translation_en:               String(s.translation_en  ?? ''),
    is_private:                   false,
    private_user_id:              null,
  }))

  const { error } = await supabase.from('grammar_sentences').insert(rows)
  if (error) throw new Error(`Supabase insert error: ${error.message}`)
  return rows.length
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`📚 Total grammar points: ${ALL_GRAMMAR.length}`)
  if (!DRY_RUN) console.log(`🔑 Using user Gemini key …${GEMINI_KEY.slice(-6)} via ${APP_URL}`)

  const counts = await getSharedCounts()
  const pending = ALL_GRAMMAR.filter(g => (counts.get(g.id) ?? 0) < TARGET)
  const already = ALL_GRAMMAR.length - pending.length

  console.log(`✅ Already complete (>= ${TARGET} sentences): ${already}`)
  console.log(`⏳ Pending: ${pending.length}`)

  if (DRY_RUN) {
    console.log('\n--- Pending grammar points ---')
    for (const g of pending) {
      console.log(`  ${g.id.padEnd(20)} [${counts.get(g.id) ?? 0}/${TARGET}]  ${g.pattern}`)
    }
    return
  }

  if (pending.length === 0) {
    console.log('🎉 All grammar points already have enough sentences!')
    return
  }

  const schoolVocab = await fetchSchoolVocab()
  console.log(`📖 Loaded ${schoolVocab.length} school vocab entries`)
  console.log(`🌐 Routing through ${APP_URL}\n`)

  let done = 0
  let skipped = 0
  const startTime = Date.now()

  for (const grammar of pending) {
    const existing = counts.get(grammar.id) ?? 0
    const idx    = done + skipped + 1
    const prefix = `[${idx}/${pending.length}]`

    process.stdout.write(`${prefix} ${grammar.id} "${grammar.pattern}" (has ${existing})… `)

    let attempt = 0
    let succeeded = false

    while (attempt < MAX_ATTEMPTS) {
      attempt++
      try {
        const prompt    = buildPrompt(grammar, schoolVocab)
        const sentences = await callGeminiViaApp(prompt)
        const kept      = await saveSentences(grammar.id, sentences)
        console.log(`✓ saved ${kept} sentences (attempt ${attempt})`)
        done++
        succeeded = true
        break
      } catch (e: any) {
        const kind: string = e.kind ?? 'transient'

        if (kind === 'quota') {
          // Already slept QUOTA_WAIT_MS inside callGeminiViaApp — retry immediately
          attempt--
          continue
        }

        if (kind === 'auth') {
          // SEED_SECRET-based auth shouldn't expire; skip and log
          console.log(`\n  ❌ Auth error: ${e.message} — check SEED_SECRET matches Vercel env`)
          skipped++
          break
        }

        if (kind === 'permanent') {
          console.log(`\n  ❌ Permanent error: ${e.message} — skipping`)
          skipped++
          break
        }

        // transient
        if (attempt < MAX_ATTEMPTS) {
          const wait = Math.min(3000 * attempt, 15_000)
          console.log(`\n  ⚠️  Transient error (attempt ${attempt}/${MAX_ATTEMPTS}): ${e.message} — retry in ${fmt(wait)}`)
          await sleep(wait)
        } else {
          console.log(`\n  ❌ Failed after ${MAX_ATTEMPTS} attempts: ${e.message} — skipping`)
          skipped++
        }
      }
    }

    if (succeeded && done < pending.length - skipped) {
      await sleep(DELAY_MS)
    }
  }

  const elapsed = Date.now() - startTime
  console.log(`\n🏁 Done in ${fmt(elapsed)}. Generated: ${done}, Skipped: ${skipped}, Already complete: ${already}`)
}

main().catch(e => { console.error('Fatal:', e); process.exit(1) })
