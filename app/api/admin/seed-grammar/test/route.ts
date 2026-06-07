export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'

export async function POST(req: NextRequest) {
  try {
    const { adminId, service } = await requireAdmin(req)

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
      return NextResponse.json({ ok: false, error: 'No hay clave configurada', status: null })
    }

    const model = 'gemini-3.1-flash-lite-preview'
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Di "ok" en una palabra.' }] }] }),
      },
    )

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? null
    const errMsg = data.error?.message ?? null

    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      model,
      key_hint: `…${apiKey.slice(-8)}`,
      response_text: text,
      error: errMsg,
      raw: res.ok ? undefined : data,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
