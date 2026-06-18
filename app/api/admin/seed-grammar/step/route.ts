export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import { TARGET, generatePointRows } from '@/lib/grammar-seed-core'

const ALL_GRAMMAR: GrammarPoint[] = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]

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

    // 5. Get admin's Gemini API key (user_settings is primary, srs_progress is legacy fallback)
    const { data: settings } = await service
      .from('user_settings')
      .select('gemini_api_key')
      .eq('user_id', adminId)
      .maybeSingle()

    let apiKey = settings?.gemini_api_key || ''
    if (!apiKey) {
      const { data: legacy } = await service.from('srs_progress').select('gemini_api_key').eq('user_id', adminId).maybeSingle()
      apiKey = legacy?.gemini_api_key || ''
    }
    apiKey = apiKey || process.env.GEMINI_API_KEY || ''
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

    // 7. Generate sentences (shared core: Gemini + parse + per-token furigana)
    const currentCount = countMap.get(next.id) ?? 0
    const result = await generatePointRows(next, vocab, apiKey, TARGET - currentCount)

    if (!result.ok) {
      await upsertError(service, next.id, result.error, result.permanent)
      return NextResponse.json({
        status: result.permanent ? 'skip' : 'retry',
        grammar_id: next.id,
        error: result.error,
        retry_after_ms: result.retryAfterMs,
        model_used: result.usedModel,
      })
    }

    if (result.rows.length === 0) {
      await upsertError(service, next.id, 'Ninguna frase pasó los filtros (calidad/furigana)', false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: 'No valid sentences', retry_after_ms: 5_000 })
    }

    // 8. Insert and clear any prior error
    const { error: insertError } = await service.from('grammar_sentences').insert(result.rows)
    if (insertError) {
      await upsertError(service, next.id, `Insert error: ${insertError.message}`, false)
      return NextResponse.json({ status: 'retry', grammar_id: next.id, error: insertError.message, retry_after_ms: 5_000 })
    }

    await service.from('grammar_seed_errors').delete().eq('grammar_id', next.id)

    return NextResponse.json({
      status: 'done',
      grammar_id: next.id,
      sentences_added: result.rows.length,
      new_count: currentCount + result.rows.length,
      model_used: result.usedModel,
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
