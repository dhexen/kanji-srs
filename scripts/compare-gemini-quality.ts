#!/usr/bin/env npx tsx
/**
 * Comparativa de calidad de generación FLASH vs FLASH-LITE.
 * Genera 5 frases para 5 puntos de gramática con cada modelo usando el MISMO
 * prompt de producción (buildSeedPrompt) y el parser tolerante. Sin verificación
 * (para aislar la calidad de GENERACIÓN cruda de cada modelo).
 *
 * Uso: npx tsx scripts/compare-gemini-quality.ts <API_KEY>
 */
import { ALL_GRAMMAR } from '@/lib/grammar-refresh-core'
import { buildSeedPrompt, parseGeminiSentences } from '@/lib/grammar-seed-core'

const API_KEY = process.argv[2] || process.env.GEMINI_API_KEY || ''
if (!API_KEY) { console.error('Falta API key: npx tsx scripts/compare-gemini-quality.ts <KEY>'); process.exit(1) }

const FLASH = 'gemini-3.6-flash'
const LITE = 'gemini-3.5-flash-lite'
const POINT_IDS = ['mnn1-01-1', 'mnn1-02-5', 'mnn1-03-9', 'mnn1-14-47', 'mnn1-16-1']

// Vocab mínimo para el prompt (buildSeedPrompt muestrea 20).
const VOCAB = [
  { jp: '学生', reading: 'がくせい', meaning: 'estudiante' },
  { jp: '先生', reading: 'せんせい', meaning: 'profesor' },
  { jp: '本', reading: 'ほん', meaning: 'libro' },
  { jp: '水', reading: 'みず', meaning: 'agua' },
  { jp: '食べる', reading: 'たべる', meaning: 'comer' },
  { jp: '飲む', reading: 'のむ', meaning: 'beber' },
  { jp: '学校', reading: 'がっこう', meaning: 'escuela' },
  { jp: '友達', reading: 'ともだち', meaning: 'amigo' },
  { jp: '家', reading: 'いえ', meaning: 'casa' },
  { jp: '車', reading: 'くるま', meaning: 'coche' },
  { jp: '犬', reading: 'いぬ', meaning: 'perro' },
  { jp: '手紙', reading: 'てがみ', meaning: 'carta' },
  { jp: '写真', reading: 'しゃしん', meaning: 'foto' },
  { jp: '駅', reading: 'えき', meaning: 'estación' },
  { jp: '花', reading: 'はな', meaning: 'flor' },
  { jp: '名前', reading: 'なまえ', meaning: 'nombre' },
  { jp: '日本語', reading: 'にほんご', meaning: 'japonés' },
  { jp: '会社', reading: 'かいしゃ', meaning: 'empresa' },
  { jp: '電車', reading: 'でんしゃ', meaning: 'tren' },
  { jp: '時間', reading: 'じかん', meaning: 'tiempo' },
]

const segText = (arr: any): string => Array.isArray(arr) ? arr.map((x: any) => x?.t ?? '').join('') : ''

async function genOne(model: string, prompt: string): Promise<any[] | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 32768 },
    }) },
  )
  const data: any = await res.json()
  if (!res.ok) { console.log(`   ⚠️ HTTP ${res.status}: ${data?.error?.message ?? ''}`); return null }
  const raw: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  return parseGeminiSentences(raw)
}

async function main() {
  for (const id of POINT_IDS) {
    const g = ALL_GRAMMAR.find(p => p.id === id)
    if (!g) { console.log(`\n### ${id} — NO ENCONTRADO`); continue }
    const prompt = buildSeedPrompt(g as any, VOCAB)
    console.log(`\n\n══════════════════════════════════════════════════════════`)
    console.log(`### ${id} · ${g.pattern} — ${g.name_es}`)
    console.log(`══════════════════════════════════════════════════════════`)

    for (const [tag, model] of [['FLASH    ', FLASH], ['FLASH-LITE', LITE]] as const) {
      const sents = await genOne(model, prompt)
      console.log(`\n── ${tag} (${model}) ──`)
      if (!sents) { console.log('   (sin frases)'); continue }
      sents.slice(0, 5).forEach((s: any, i: number) => {
        const full = segText(s.before) + '【' + (s.answer ?? '?') + '】' + segText(s.after)
        console.log(`  ${i + 1}. q${s.quality ?? '?'} ${full}`)
        console.log(`      → ${s.translation_es ?? ''}`)
      })
    }
  }
}
main().catch(e => { console.error(e); process.exit(1) })
