// Helper server-side para llamar a Gemini con FALLBACK automático de modelos.
// Recorre una cadena de modelos (por defecto GEMINI_FALLBACK_CHAIN, con los más
// nuevos delante) y salta al siguiente si el actual no está disponible, no da
// acceso o está saturado. Así una sola configuración vale para todos los sitios
// que generan cualquier cosa con IA.

import { buildGeminiChain, GEMINI_FALLBACK_CHAIN } from './gemini-models'

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

// Estados que hacen AVANZAR al siguiente modelo (recuperables / propios del
// modelo concreto): sin acceso, retirado, cuota, saturación, errores 5xx.
// Un 400 (petición mal formada) o 401 (clave inválida) NO se reintentan con
// otro modelo — fallarían igual y solo gastarían llamadas.
const FALLOVER_STATUS = new Set([403, 404, 429, 500, 502, 503, 504])

export interface GeminiCallResult {
  ok: boolean
  text?: string
  model?: string    // modelo que respondió (ok) o el último intentado (error)
  status?: number   // último HTTP status en caso de error
  error?: string
}

export interface GeminiCallOpts {
  apiKey: string
  /** Prompt de texto. Ignorado si se pasan `parts` (p.ej. para visión). */
  prompt?: string
  /** Partes crudas del contenido (texto + inlineData de imágenes, etc.). */
  parts?: unknown[]
  /** Cadena explícita de modelos. Si se omite, se usa `preferred` + la estándar. */
  models?: string[]
  /** Modelo preferido que lidera la cadena estándar (p.ej. el elegido por el usuario). */
  preferred?: string | null
  temperature?: number
  generationConfig?: Record<string, unknown>
  systemInstruction?: Record<string, unknown>
}

export async function callGeminiText(opts: GeminiCallOpts): Promise<GeminiCallResult> {
  const chain = opts.models?.length
    ? opts.models
    : (opts.preferred ? buildGeminiChain(opts.preferred) : GEMINI_FALLBACK_CHAIN)

  const parts = opts.parts ?? [{ text: opts.prompt ?? '' }]
  const generationConfig = opts.generationConfig
    ?? (opts.temperature != null ? { temperature: opts.temperature } : undefined)

  let last: GeminiCallResult = { ok: false, error: 'No se intentó ningún modelo' }

  for (const model of chain) {
    const url = `${BASE}/models/${model}:generateContent?key=${opts.apiKey}`
    const payload: Record<string, unknown> = { contents: [{ parts }] }
    if (generationConfig) payload.generationConfig = generationConfig
    if (opts.systemInstruction) payload.systemInstruction = opts.systemInstruction

    let res: Response
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (e: unknown) {
      // Error de red → probar el siguiente modelo.
      last = { ok: false, model, error: `Error de red: ${e instanceof Error ? e.message : String(e)}` }
      continue
    }

    const data = await res.json().catch(() => ({} as any))

    if (res.ok) {
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
      if (typeof text === 'string' && text.length > 0) {
        return { ok: true, text, model }
      }
      // 200 pero vacío (bloqueo de seguridad / finishReason) → probar el siguiente.
      last = { ok: false, model, status: 200, error: `Sin contenido (motivo: ${data?.candidates?.[0]?.finishReason ?? 'desconocido'})` }
      continue
    }

    const msg = data?.error?.message ?? `Error ${res.status}`
    last = { ok: false, model, status: res.status, error: msg }
    if (FALLOVER_STATUS.has(res.status)) continue
    // Error no recuperable (400/401…) → abortar sin gastar más llamadas.
    return last
  }

  return last
}
