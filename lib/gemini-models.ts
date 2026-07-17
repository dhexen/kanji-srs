// User-selectable Gemini models. Keep the `value`s in sync with the server-side
// ALLOWED_MODELS allowlist in app/api/gemini/route.ts. Offering a choice lets a
// user switch models if one runs out of quota.
export const GEMINI_MODELS = [
  { value: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash' },
  { value: 'gemini-2.5-flash-lite',         label: 'Gemini 2.5 Flash Lite' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
] as const

export type GeminiModel = typeof GEMINI_MODELS[number]['value']

export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-2.5-flash'

/** Normalize an arbitrary string to a valid model value, falling back to the default. */
export function normalizeGeminiModel(model: string | null | undefined): GeminiModel {
  return GEMINI_MODELS.some(m => m.value === model) ? (model as GeminiModel) : DEFAULT_GEMINI_MODEL
}
