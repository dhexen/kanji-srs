import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const MAX_TEXT_CHARS = 500
const TTS_VOICE = 'ja-JP-Neural2-B'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  }

  const apiKey = process.env.GOOGLE_TTS_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'TTS no configurado en el servidor.' }, { status: 503 })
  }

  let body: { text?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }
  const { text } = body
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_TEXT_CHARS) {
    return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 })
  }

  let ttsRes: Response
  try {
    ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: 'ja-JP', name: TTS_VOICE },
          audioConfig: { audioEncoding: 'MP3' },
        }),
      }
    )
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error de red'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  if (!ttsRes.ok) {
    const err = await ttsRes.json()
    return NextResponse.json(
      { error: err?.error?.message || `Error Google TTS ${ttsRes.status}` },
      { status: ttsRes.status }
    )
  }

  const data = await ttsRes.json()
  const audioBytes = Buffer.from(data.audioContent as string, 'base64')

  return new NextResponse(audioBytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
