// User-selectable Gemini models. Keep the `value`s in sync with the server-side
// ALLOWED_MODELS allowlist in app/api/gemini/route.ts. Offering a choice lets a
// user switch models if one runs out of quota.
//
// Orden = prioridad. Los modelos nuevos van DELANTE: es el orden que usa la
// cadena de fallback (GEMINI_FALLBACK_CHAIN) — si un modelo no está disponible
// o da error, se pasa al siguiente. IDs verificados contra la API (2026-07):
// los nuevos son sin sufijo (-preview no aplica); gemini-2.5-flash-lite quedó
// retirado ("no longer available to new users") y se ha eliminado.
export const GEMINI_MODELS = [
  { value: 'gemini-3.6-flash',              label: 'Gemini 3.6 Flash' },
  { value: 'gemini-3.5-flash',              label: 'Gemini 3.5 Flash' },
  { value: 'gemini-3.5-flash-lite',         label: 'Gemini 3.5 Flash Lite' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
  { value: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash' },
] as const

export type GeminiModel = typeof GEMINI_MODELS[number]['value']

export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-3.6-flash'

// Cadena de fallback (server): se recorre en orden hasta que un modelo responde.
// Es exactamente el orden de GEMINI_MODELS.
export const GEMINI_FALLBACK_CHAIN: string[] = GEMINI_MODELS.map(m => m.value)

/** Normalize an arbitrary string to a valid model value, falling back to the default. */
export function normalizeGeminiModel(model: string | null | undefined): GeminiModel {
  return GEMINI_MODELS.some(m => m.value === model) ? (model as GeminiModel) : DEFAULT_GEMINI_MODEL
}

/**
 * Construye la cadena de fallback liderada por un modelo preferido (p.ej. el que
 * el usuario eligió en Configuración): [preferido, ...resto sin duplicar]. Si no
 * hay preferido válido, devuelve la cadena estándar.
 */
export function buildGeminiChain(preferred?: string | null): string[] {
  const p = preferred?.trim()
  if (p) return [p, ...GEMINI_FALLBACK_CHAIN.filter(m => m !== p)]
  return [...GEMINI_FALLBACK_CHAIN]
}
