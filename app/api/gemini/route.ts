import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
])
const MAX_PROMPT_CHARS = 10_000

export async function POST(req: NextRequest) {
  // 1. Verificar sesión activa — cualquier petición sin sesión se rechaza
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Debes iniciar sesión para usar esta función.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Sesión inválida o expirada.' }, { status: 401 })
  }

  // 2. Validar body
  let body: { prompt?: unknown; model?: unknown; userApiKey?: unknown }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }
  const { prompt, model = 'gemini-2.5-flash', userApiKey } = body

  if (typeof prompt !== 'string' || prompt.length === 0 || prompt.length > MAX_PROMPT_CHARS) {
    return NextResponse.json({ error: `El prompt debe tener entre 1 y ${MAX_PROMPT_CHARS} caracteres.` }, { status: 400 })
  }
  if (typeof model !== 'string' || !ALLOWED_MODELS.has(model)) {
    return NextResponse.json({ error: 'Modelo no permitido.' }, { status: 400 })
  }

  // 3. Resolver API key (la del usuario tiene prioridad; si no, la del servidor)
  const apiKey = (typeof userApiKey === 'string' && userApiKey.trim())
    ? userApiKey.trim()
    : process.env.GEMINI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'No hay API Key configurada. Añade tu clave de Gemini en la sección de Contexto.' }, { status: 401 })
  }

  // 4. Llamada a Gemini
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    })
  } catch (e: any) {
    return NextResponse.json({ error: `Error de red: ${e.message}` }, { status: 500 })
  }

  const data = await res.json()
  if (!res.ok) {
    const msg = data?.error?.message || `Error ${res.status} de la API de Gemini`
    return NextResponse.json({ error: msg }, { status: res.status })
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || 'desconocido'
    return NextResponse.json({ error: `Gemini no generó contenido (motivo: ${reason}). Inténtalo de nuevo.` }, { status: 500 })
  }

  return NextResponse.json({ text })
}
