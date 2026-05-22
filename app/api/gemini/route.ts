import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, model = 'gemini-2.5-flash', userApiKey } = await req.json()

  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No hay API Key configurada. Añade tu clave de Gemini en la sección de Contexto.' }, { status: 401 })

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
