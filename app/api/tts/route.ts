export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleAuth } from 'google-auth-library'
import { createHash } from 'crypto'

const MAX_TEXT_CHARS = 500
const TTS_VOICE = 'ja-JP-Neural2-B'
const BUCKET = 'grammar-audio'

const STORAGE_BASE =
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}`

let _auth: GoogleAuth | null = null

function getGoogleAuth(): GoogleAuth {
  if (_auth) return _auth
  const raw = process.env.GOOGLE_SA_KEY
  if (!raw) throw new Error('GOOGLE_SA_KEY not set')
  _auth = new GoogleAuth({
    credentials: JSON.parse(raw),
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  })
  return _auth
}

function textHash(text: string): string {
  return createHash('sha256').update(text).digest('hex').slice(0, 32)
}

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'No autenticado.' }, { status: 401 })
  }
  const userToken = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(userToken)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida.' }, { status: 401 })
  }

  // ── Body ───────────────────────────────────────────────────────────────────
  let body: { text?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }
  const { text } = body
  if (typeof text !== 'string' || text.length === 0 || text.length > MAX_TEXT_CHARS) {
    return NextResponse.json({ error: 'Texto inválido.' }, { status: 400 })
  }

  // ── Cache check ────────────────────────────────────────────────────────────
  const filename  = `${textHash(text)}.mp3`
  const publicUrl = `${STORAGE_BASE}/${filename}`

  const cached = await fetch(publicUrl, { method: 'HEAD' }).catch(() => null)
  if (cached?.ok) {
    return NextResponse.redirect(publicUrl, 302)
  }

  // ── Google TTS ─────────────────────────────────────────────────────────────
  let accessToken: string
  try {
    const client = await getGoogleAuth().getClient()
    accessToken = (await client.getAccessToken()).token!
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error de credenciales'
    return NextResponse.json({ error: `TTS no configurado: ${msg}` }, { status: 503 })
  }

  let ttsRes: Response
  try {
    ttsRes = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: 'ja-JP', name: TTS_VOICE },
        audioConfig: { audioEncoding: 'MP3' },
      }),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error de red' }, { status: 500 })
  }

  if (!ttsRes.ok) {
    const err = await ttsRes.json()
    return NextResponse.json(
      { error: err?.error?.message || `Error Google TTS ${ttsRes.status}` },
      { status: ttsRes.status },
    )
  }

  const data       = await ttsRes.json()
  const audioBytes = Buffer.from(data.audioContent as string, 'base64')

  // ── Upload to Supabase Storage ─────────────────────────────────────────────
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  await serviceClient.storage.from(BUCKET).upload(filename, audioBytes, {
    contentType: 'audio/mpeg',
    upsert: false,
    cacheControl: '31536000',
  }).catch(() => { /* ignore if already exists */ })

  return new NextResponse(audioBytes, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
