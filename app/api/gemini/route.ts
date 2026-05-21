import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { prompt, model = 'gemini-2.5-flash', userApiKey } = await req.json()

  // Use user's own key if provided, else fall back to server key
  const apiKey = userApiKey || process.env.GEMINI_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'No API key' }, { status: 401 })

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    }),
  })
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
  return NextResponse.json({ text })
}
