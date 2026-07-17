export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'
import { GRAMMAR_POINTS } from '@/lib/grammar-mnn1'
import { MNN2_GRAMMAR_POINTS } from '@/lib/grammar-mnn2'
import { MNN_C1_GRAMMAR_POINTS } from '@/lib/grammar-mnnc1'
import { BUNPRO_GRAMMAR, bunproToGrammarPoint } from '@/lib/grammar-bunpro'

const ALL_GRAMMAR = [
  ...GRAMMAR_POINTS,
  ...MNN2_GRAMMAR_POINTS,
  ...MNN_C1_GRAMMAR_POINTS,
  ...BUNPRO_GRAMMAR.map(bunproToGrammarPoint),
]

const TARGET = 25

export async function GET(req: NextRequest) {
  try {
    const { adminId, service } = await requireAdmin(req)

    const [jobRes, errorRes, progressRes] = await Promise.all([
      service.from('grammar_seed_job').select('running, started_at, stopped_at').eq('id', 1).single(),
      service.from('grammar_seed_errors').select('grammar_id, error_msg, is_permanent, updated_at'),
      service.from('user_settings').select('gemini_api_key').eq('user_id', adminId).maybeSingle(),
    ])

    // user_settings is the primary store; srs_progress is legacy fallback
    let userKey: string = progressRes.data?.gemini_api_key ?? ''
    if (!userKey) {
      const { data: legacy } = await service.from('srs_progress').select('gemini_api_key').eq('user_id', adminId).maybeSingle()
      userKey = legacy?.gemini_api_key ?? ''
    }
    const serverKey: string = process.env.GEMINI_API_KEY ?? ''
    const activeKey = userKey || serverKey
    const keyHint = activeKey
      ? (userKey ? `perfil …${userKey.slice(-6)}` : `vercel …${serverKey.slice(-6)}`)
      : 'sin clave'

    // Paginate to handle tables with >1000 rows (Supabase default limit)
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

    const errorMap = new Map((errorRes.data ?? []).map(e => [e.grammar_id, e]))

    const grammars = ALL_GRAMMAR.map(g => ({
      id: g.id,
      title: g.pattern,
      jlpt: g.jlpt,
      count: countMap.get(g.id) ?? 0,
      error: errorMap.get(g.id)?.error_msg ?? null,
      is_permanent: errorMap.get(g.id)?.is_permanent ?? false,
      error_at: errorMap.get(g.id)?.updated_at ?? null,
    }))

    return NextResponse.json({
      running: jobRes.data?.running ?? false,
      started_at: jobRes.data?.started_at ?? null,
      key_hint: keyHint,
      grammars,
      total: ALL_GRAMMAR.length,
      done: grammars.filter(g => g.count >= TARGET).length,
      pending: grammars.filter(g => g.count < TARGET && !(errorMap.get(g.id)?.is_permanent)).length,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { service } = await requireAdmin(req)
    const { action } = await req.json()

    if (action === 'start') {
      await service.from('grammar_seed_job').upsert(
        { id: 1, running: true, started_at: new Date().toISOString(), stopped_at: null },
        { onConflict: 'id' },
      )
    } else if (action === 'stop') {
      await service.from('grammar_seed_job').update(
        { running: false, stopped_at: new Date().toISOString() },
      ).eq('id', 1)
    } else if (action === 'clear_errors') {
      await service.from('grammar_seed_errors').delete().eq('is_permanent', false)
    } else if (action === 'clear_permanent_errors') {
      await service.from('grammar_seed_errors').delete().eq('is_permanent', true)
    } else if (action === 'clear_all_errors') {
      await service.from('grammar_seed_errors').delete().neq('grammar_id', '')
    } else if (action === 'wipe_sentences') {
      // Regenerate the pool from scratch, but NEVER delete teacher-validated
      // sentences — those are permanent (only unvalidated ones are wiped).
      await service.from('grammar_sentences').delete().eq('validated', false)
      await service.from('grammar_seed_errors').delete().neq('grammar_id', '')
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return adminJsonError(e)
  }
}
