export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, adminJsonError } from '@/lib/admin-server'
import { callGeminiText } from '@/lib/gemini-fetch'

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

    // Recorre la cadena de fallback (nuevos primero) y reporta el que responde.
    const result = await callGeminiText({ apiKey, prompt: 'Di "ok" en una palabra.' })

    return NextResponse.json({
      ok: result.ok,
      status: result.status ?? (result.ok ? 200 : null),
      model: result.model ?? null,
      key_hint: `…${apiKey.slice(-8)}`,
      response_text: result.ok ? result.text : null,
      error: result.ok ? null : result.error,
    })
  } catch (e) {
    return adminJsonError(e)
  }
}
