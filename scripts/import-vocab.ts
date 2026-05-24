#!/usr/bin/env node
/**
 * Import kanji vocabulary from a structured txt file.
 *
 * File format expected:
 *   「KANJI」
 *     WORD（READING）: ENGLISH_MEANING
 *     WORD（READING）: ENGLISH_MEANING
 *
 * Usage:
 *   npx tsx scripts/import-vocab.ts kanji_grade3_vocabulary.txt --grade 3
 *
 * Required in .env.local:
 *   SUPABASE_SERVICE_ROLE_KEY=...
 *   GEMINI_API_KEY=...  (optional — without it, English is used as fallback for es/ca)
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Load .env.local manually (Next.js env files are not auto-loaded in scripts)
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx < 0) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim()
    if (!(key in process.env)) process.env[key] = value
  }
}
loadEnv()

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface VocabEntry {
  kanji: string
  word: string
  reading: string
  meaning_en: string
}

interface TranslatedEntry extends VocabEntry {
  meaning_es: string
  meaning_ca: string
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------
const args = process.argv.slice(2)
const filePath = args.find(a => !a.startsWith('--')) ?? 'kanji_vocabulary.txt'
const gradeArg = args.find(a => a.startsWith('--grade='))?.split('=')[1]
            ?? args[args.indexOf('--grade') + 1]
const GRADE = gradeArg ? parseInt(gradeArg, 10) : 3
const GEMINI_MODEL = 'gemini-2.5-flash'
const TRANSLATE_BATCH = 40  // words per Gemini call

// ---------------------------------------------------------------------------
// File parser
// ---------------------------------------------------------------------------
function parseVocabFile(content: string): VocabEntry[] {
  const lines = content.split('\n')
  const entries: VocabEntry[] = []
  let currentKanji = ''

  for (const raw of lines) {
    const line = raw.trimEnd()

    // Group header: 【KANJI】 or 「KANJI」
    const headerMatch = line.match(/^[「【](.+?)[」】]\s*$/)
    if (headerMatch) {
      currentKanji = headerMatch[1].trim()
      continue
    }

    // Vocabulary entry (indented): WORD（READING）: MEANING
    const entryMatch = line.match(/^\s+(.+?)（(.+?)）\s*:\s*(.+)$/)
    if (entryMatch && currentKanji) {
      entries.push({
        kanji: currentKanji,
        word: entryMatch[1].trim(),
        reading: entryMatch[2].trim(),
        meaning_en: entryMatch[3].trim(),
      })
    }
  }

  return entries
}

// ---------------------------------------------------------------------------
// Gemini translation (es + ca)
// ---------------------------------------------------------------------------
async function translateBatch(entries: VocabEntry[], apiKey: string): Promise<TranslatedEntry[]> {
  const wordList = entries
    .map(e => `${e.word}（${e.reading}）: ${e.meaning_en}`)
    .join('\n')

  const prompt = `Translate these Japanese vocabulary words into Spanish (es) and Catalan (ca).
Each entry: WORD（READING）: ENGLISH_MEANING

Rules:
- Keep translations brief and natural (1–5 words, like a dictionary entry)
- Match the style of the English meaning
- For words with multiple meanings, use a comma-separated list like in the original
- Do NOT include particles or grammar notes unless the original does

Respond ONLY with a valid JSON array, no markdown, no extra text:
[{"word":"犬","es":"perro","ca":"gos"},{"word":"愛","es":"amor","ca":"amor"}]

Words:
${wordList}`

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.1 },
    }),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(`Gemini ${res.status}: ${(data as any)?.error?.message ?? res.statusText}`)
  }

  const data = await res.json()
  const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  if (!text) throw new Error('Gemini devolvió respuesta vacía')

  const clean = text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '')

  let translations: Array<{ word: string; es: string; ca: string }>
  try {
    translations = JSON.parse(clean)
  } catch {
    const match = clean.match(/\[[\s\S]*\]/)
    if (match) translations = JSON.parse(match[0])
    else throw new Error('No se pudo parsear la respuesta de Gemini como JSON')
  }

  const tMap = new Map(translations.map(t => [t.word, t]))

  return entries.map(entry => {
    const t = tMap.get(entry.word)
    return {
      ...entry,
      meaning_es: t?.es ?? entry.meaning_en,
      meaning_ca: t?.ca ?? entry.meaning_en,
    }
  })
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  const geminiKey   = process.env.GEMINI_API_KEY

  // Validate env
  if (!supabaseUrl || !serviceKey) {
    console.error('\n❌  Faltan variables en .env.local:')
    if (!supabaseUrl) console.error('    NEXT_PUBLIC_SUPABASE_URL')
    if (!serviceKey)  console.error('    SUPABASE_SERVICE_ROLE_KEY  ← obtén en Supabase → Settings → API')
    process.exit(1)
  }

  // Validate file
  if (!fs.existsSync(filePath)) {
    console.error(`\n❌  Archivo no encontrado: ${filePath}`)
    console.error(`    Pon el archivo en la raíz del proyecto y ejecútalo como:`)
    console.error(`    npx tsx scripts/import-vocab.ts ARCHIVO.txt --grade ${GRADE}`)
    process.exit(1)
  }

  console.log(`\n📖  Leyendo: ${filePath}  (grade ${GRADE})`)

  // Parse
  const content = fs.readFileSync(filePath, 'utf-8')
  const allEntries = parseVocabFile(content)
  if (allEntries.length === 0) {
    console.error('❌  No se parseó ninguna entrada. Comprueba el formato del archivo.')
    process.exit(1)
  }
  console.log(`    ${allEntries.length} palabras leídas`)

  // Connect
  const supabase = createClient(supabaseUrl, serviceKey)

  // Check what already exists — query in chunks to avoid URL length limits
  const words = allEntries.map(e => e.word)
  const CHUNK = 150
  const existingSet = new Set<string>()

  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK)
    const { data, error: existErr } = await supabase
      .from('vocabulary')
      .select('word')
      .in('word', chunk)

    if (existErr) {
      console.error('❌  Error consultando la BD:', existErr.message)
      process.exit(1)
    }
    for (const row of data ?? []) existingSet.add(row.word as string)
  }
  const newEntries  = allEntries.filter(e => !existingSet.has(e.word))
  const skipped     = allEntries.length - newEntries.length

  console.log(`\n📊  Total leídas:    ${allEntries.length}`)
  console.log(`    Ya en la BD:    ${skipped}  (se saltarán)`)
  console.log(`    Nuevas a subir: ${newEntries.length}`)

  if (newEntries.length === 0) {
    console.log('\n✨  Todas las palabras ya están en la base de datos. Nada que hacer.')
    return
  }

  // Translate
  let translated: TranslatedEntry[]
  if (geminiKey) {
    console.log(`\n🌐  Traduciendo con Gemini en lotes de ${TRANSLATE_BATCH}...`)
    translated = []
    const totalBatches = Math.ceil(newEntries.length / TRANSLATE_BATCH)
    for (let i = 0; i < newEntries.length; i += TRANSLATE_BATCH) {
      const batch     = newEntries.slice(i, i + TRANSLATE_BATCH)
      const batchNum  = Math.floor(i / TRANSLATE_BATCH) + 1
      process.stdout.write(`    Lote ${batchNum}/${totalBatches} (${batch.length} palabras)... `)
      try {
        const result = await translateBatch(batch, geminiKey)
        translated.push(...result)
        console.log('✓')
      } catch (e) {
        console.error(`\n❌  Error en lote ${batchNum}:`, e instanceof Error ? e.message : String(e))
        process.exit(1)
      }
      // Small delay to avoid rate limits
      if (i + TRANSLATE_BATCH < newEntries.length) {
        await new Promise(r => setTimeout(r, 600))
      }
    }
  } else {
    console.warn('\n⚠️   GEMINI_API_KEY no encontrada → se usa el inglés como es/ca temporalmente')
    translated = newEntries.map(e => ({ ...e, meaning_es: e.meaning_en, meaning_ca: e.meaning_en }))
  }

  // Get current max sort_order for this grade
  const { data: maxRow } = await supabase
    .from('vocabulary')
    .select('sort_order')
    .eq('grade', GRADE)
    .order('sort_order', { ascending: false })
    .limit(1)

  const sortBase = Math.max(
    GRADE * 1000,
    ((maxRow?.[0]?.sort_order as number | undefined) ?? 0) + 1,
  )

  // Build rows
  const rows = translated.map((entry, i) => ({
    word:       entry.word,
    kanji:      entry.kanji,
    reading:    entry.reading,
    meaning_es: entry.meaning_es,
    meaning_ca: entry.meaning_ca,
    meaning_en: entry.meaning_en,
    grade:      GRADE,
    is_official: true,
    sort_order: sortBase + i,
  }))

  // Insert in chunks of 100
  console.log(`\n💾  Insertando ${rows.length} palabras...`)
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100)
    const { error: insertErr } = await supabase
      .from('vocabulary')
      .insert(chunk)
    if (insertErr) {
      console.error(`❌  Error al insertar filas ${i}–${i + chunk.length}:`, insertErr.message)
      process.exit(1)
    }
    process.stdout.write('.')
  }

  console.log(`\n\n✅  Importación completada:`)
  console.log(`    ${newEntries.length} palabras nuevas insertadas (grade ${GRADE})`)
  console.log(`    ${skipped} palabras ya existían y se saltaron`)
  if (!geminiKey) {
    console.log(`\n⚠️   Recuerda: las traducciones es/ca son en inglés porque faltaba GEMINI_API_KEY.`)
    console.log(`    Añade la clave y vuelve a ejecutar el script para reemplazarlas.`)
  }
}

main().catch(err => {
  console.error('\n❌  Error fatal:', err instanceof Error ? err.message : err)
  process.exit(1)
})
