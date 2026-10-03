// El SRS del catálogo de gramática: las gramáticas que añades a tu pool («+»)
// con los 9 niveles de siempre (los de grammar-test). Cada repaso saca una de
// sus frases de ejemplo para montarla por piezas o escribirla entera.

import { supabase } from './supabase'
import { GRAMMAR_SRS_MAX_LEVEL, applyGrammarResult } from './grammar-test-srs'
import type { CatalogExample } from './catalogo'

export type CatalogoSrs = { topic_id: string; level: number; next_review: number }
export type Estado = 'repasar' | 'estudio' | 'estudiada' | 'quemada'

export const QUEMADA = GRAMMAR_SRS_MAX_LEVEL
/** Desde gurú (5) se da por estudiada; antes está en estudio. */
export const ESTUDIADA = 5

export function estadoDe(s: CatalogoSrs | undefined, ahora = Date.now()): Estado | null {
  if (!s) return null
  if (s.level >= QUEMADA) return 'quemada'
  if (s.next_review <= ahora) return 'repasar'
  return s.level >= ESTUDIADA ? 'estudiada' : 'estudio'
}

async function userId() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('No autenticado')
  return session.user.id
}

export async function fetchCatalogoSrs(): Promise<CatalogoSrs[]> {
  const uid = await userId()
  const { data, error } = await supabase
    .from('catalog_srs_progress')
    .select('topic_id, level, next_review')
    .eq('user_id', uid)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({ ...r, next_review: Number(r.next_review) }))
}

export async function saveCatalogoSrs(s: CatalogoSrs) {
  const uid = await userId()
  const { error } = await supabase
    .from('catalog_srs_progress')
    .upsert({ user_id: uid, ...s, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function deleteCatalogoSrs(topicId: string) {
  const uid = await userId()
  const { error } = await supabase
    .from('catalog_srs_progress')
    .delete()
    .eq('user_id', uid)
    .eq('topic_id', topicId)
  if (error) throw new Error(error.message)
}

/** Recién añadida: toca repasarla ya. */
export const nueva = (topic_id: string): CatalogoSrs => ({ topic_id, level: 0, next_review: 0 })
/** Aprendida a mano: quemada, no vuelve a salir. */
export const quemada = (topic_id: string): CatalogoSrs => ({
  topic_id, level: QUEMADA, next_review: Number.MAX_SAFE_INTEGER,
})

/** El resultado de un repaso: sube un nivel si salió a la primera, si no baja. */
export function tras(s: CatalogoSrs, fallos: number): CatalogoSrs {
  const { newLevel, nextReview } = applyGrammarResult(s.level, fallos)
  return { topic_id: s.topic_id, level: newLevel, next_review: nextReview }
}

/** Las frases de ejemplo de varias gramáticas, por gramática. */
export async function fetchFrasesDe(ids: string[]): Promise<Record<string, CatalogExample[]>> {
  const out: Record<string, CatalogExample[]> = {}
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await supabase
      .from('catalog_examples')
      .select('id, topic_id, position, text_ja, kana, romaji, text_es, origen, piezas')
      .in('topic_id', ids.slice(i, i + 100))
    if (error) throw new Error(error.message)
    for (const f of data ?? []) (out[f.topic_id] ??= []).push(f as CatalogExample)
  }
  return out
}
