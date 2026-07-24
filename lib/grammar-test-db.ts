// =============================================================================
// grammar-test-db — capa de persistencia AISLADA para la sección "Gramàtica TEST"
//
// Espeja la API de @/lib/supabase que usan los componentes de gramática, pero:
//   • El estado SRS / "conocidos" / ejemplos propios va a las tablas *_test
//     (RLS solo-admin, migración 041) → nunca toca el progreso real.
//   • El pool de frases vive SOLO en memoria de la sesión (memPool) → generar
//     no contamina grammar_sentences y se pierde al recargar.
//   • Acciones sobre el pool compartido (share, report, validate global) son
//     no-ops o actúan sobre el pool en memoria.
//   • Las lecturas inocuas (esquemas, muestras de vocabulario) se reexportan
//     tal cual del módulo real.
//
// Los componentes copiados en components/grammar-test/ importan de aquí en vez
// de @/lib/supabase; así el sandbox queda garantizado sin efectos en usuarios.
// =============================================================================
import { supabase } from '@/lib/supabase'
import type { GrammarSentence, GrammarSrsStat } from '@/lib/grammar-test-srs'
import type { UserGrammarExample, UserSharedSentence } from '@/lib/supabase'

// Lecturas inocuas / cliente crudo: reutilizamos las reales sin cambios.
export { supabase } from '@/lib/supabase'
export { fetchGrammarScheme, fetchSchoolVocabSample, fetchWaniKaniVocabSample } from '@/lib/supabase'
export type { UserGrammarExample } from '@/lib/supabase'

async function requireUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('No autenticado')
  return session.user
}

// ─────────────────────────────────────────────────────────────────────────────
// Pool de frases EN MEMORIA (por grammar_id). Vacío al cargar; se pierde al recargar.
// ─────────────────────────────────────────────────────────────────────────────
const memPool = new Map<string, GrammarSentence[]>()

export async function fetchGrammarSentences(grammarId: string): Promise<GrammarSentence[]> {
  return (memPool.get(grammarId) ?? []).map(s => ({ ...s }))
}

export async function saveGrammarSentences(
  grammarId: string,
  sentences: Omit<GrammarSentence, 'id'>[],
  _opts?: { isPrivate?: boolean; userId?: string },
): Promise<void> {
  if (sentences.length === 0) return
  const list = memPool.get(grammarId) ?? []
  for (const s of sentences) {
    list.push({ ...(s as GrammarSentence), id: crypto.randomUUID(), grammar_id: grammarId })
  }
  memPool.set(grammarId, list)
}

export async function deleteGrammarSentences(grammarId: string): Promise<void> {
  memPool.delete(grammarId)
}

export async function trimGrammarSentencesPool(grammarId: string, max: number): Promise<void> {
  const list = memPool.get(grammarId)
  if (list && list.length > max) memPool.set(grammarId, list.slice(list.length - max))
}

export async function fetchGrammarSentenceCounts(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  for (const id of ids) out.set(id, (memPool.get(id) ?? []).length)
  return out
}

export async function updateGrammarSentence(
  id: string,
  patch: Partial<Omit<GrammarSentence, 'id' | 'grammar_id'>>,
): Promise<void> {
  for (const list of memPool.values()) {
    const s = list.find(x => x.id === id)
    if (s) { Object.assign(s, patch); return }
  }
}

export async function deleteGrammarSentenceById(id: string): Promise<void> {
  for (const [gid, list] of memPool.entries()) {
    const next = list.filter(x => x.id !== id)
    if (next.length !== list.length) { memPool.set(gid, next); return }
  }
}

export async function validateGrammarSentence(id: string, validated: boolean): Promise<void> {
  await updateGrammarSentence(id, { validated })
}

// Comunidad / reportes: sin sentido en el sandbox → no-op.
export async function fetchUserSharedSentences(_grammarId: string): Promise<UserSharedSentence[]> {
  return []
}
export async function shareGrammarSentence(_params: unknown): Promise<void> { /* no-op */ }
export async function submitGrammarReport(_payload: unknown): Promise<void> { /* no-op */ }

// ─────────────────────────────────────────────────────────────────────────────
// Estado SRS de test → grammar_srs_progress_test
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchGrammarSrsStat(grammarId: string): Promise<GrammarSrsStat | null> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('grammar_srs_progress_test')
      .select('grammar_id, level, next_review')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .maybeSingle()
    if (error || !data) return null
    return { grammar_id: data.grammar_id, level: data.level, next_review: data.next_review }
  } catch { return null }
}

export async function fetchAllGrammarSrsStats(): Promise<GrammarSrsStat[]> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('grammar_srs_progress_test')
      .select('grammar_id, level, next_review')
      .eq('user_id', user.id)
    if (error) return []
    return (data ?? []).map(r => ({ grammar_id: r.grammar_id, level: r.level, next_review: r.next_review }))
  } catch { return [] }
}

export async function saveGrammarSrsResult(grammarId: string, newLevel: number, nextReview: number): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('grammar_srs_progress_test')
      .upsert(
        { user_id: user.id, grammar_id: grammarId, level: newLevel, next_review: nextReview },
        { onConflict: 'user_id,grammar_id' },
      )
    if (error) console.error('[test] saveGrammarSrsResult:', error.message)
  } catch (e) { console.error('[test] saveGrammarSrsResult:', e) }
}

export async function markGrammarAsStudying(
  grammarId: string,
): Promise<{ grammar_id: string; level: number; next_review: number } | null> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('grammar_srs_progress_test')
      .insert({ user_id: user.id, grammar_id: grammarId, level: 0, next_review: 0 })
    if (error) {
      if (error.code !== '23505') console.warn('[test] markGrammarAsStudying:', error.message)
      return null
    }
    return { grammar_id: grammarId, level: 0, next_review: 0 }
  } catch (e) { console.warn('[test] markGrammarAsStudying:', e); return null }
}

export async function removeGrammarFromSrs(grammarId: string): Promise<void> {
  try {
    const user = await requireUser()
    await supabase.from('grammar_srs_progress_test').delete().eq('user_id', user.id).eq('grammar_id', grammarId)
  } catch (e) { console.warn('[test] removeGrammarFromSrs:', e) }
}

// ─────────────────────────────────────────────────────────────────────────────
// "Conocidos" de test → user_grammar_progress_test
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchKnownGrammar(): Promise<Set<string>> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('user_grammar_progress_test')
      .select('grammar_id')
      .eq('user_id', user.id)
      .eq('known', true)
    if (error) return new Set()
    return new Set((data ?? []).map((r: { grammar_id: string }) => r.grammar_id))
  } catch { return new Set() }
}

export async function setGrammarKnown(grammarId: string, known: boolean): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('user_grammar_progress_test')
      .upsert({ user_id: user.id, grammar_id: grammarId, known, updated_at: new Date().toISOString() })
    if (error) console.error('[test] setGrammarKnown:', error.message)
  } catch (e) { console.error('[test] setGrammarKnown:', e) }
}

// ─────────────────────────────────────────────────────────────────────────────
// Ejemplos propios de test → user_grammar_examples_test
// ─────────────────────────────────────────────────────────────────────────────
const USER_GRAMMAR_EXAMPLES_MAX = 10

export async function fetchUserGrammarExamples(grammarId: string): Promise<UserGrammarExample[]> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('user_grammar_examples_test')
      .select('id, grammar_id, jp, translation')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
    if (error) return []
    return (data ?? []) as UserGrammarExample[]
  } catch { return [] }
}

export async function updateUserGrammarExample(id: string, jp: unknown[], translation: unknown[]): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('user_grammar_examples_test')
      .update({ jp, translation })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) console.warn('[test] updateUserGrammarExample:', error.message)
  } catch (e) { console.warn('[test] updateUserGrammarExample:', e) }
}

export async function saveUserGrammarExamples(
  grammarId: string,
  sentences: { jp: unknown[]; translation: unknown[] }[],
): Promise<void> {
  if (!sentences.length) return
  try {
    const user = await requireUser()
    const rows = sentences.map(s => ({ user_id: user.id, grammar_id: grammarId, jp: s.jp, translation: s.translation }))
    const { error: insertErr } = await supabase.from('user_grammar_examples_test').insert(rows)
    if (insertErr) { console.warn('[test] saveUserGrammarExamples insert:', insertErr.message); return }
    const { count, error: countErr } = await supabase
      .from('user_grammar_examples_test')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
    if (countErr || count === null || count <= USER_GRAMMAR_EXAMPLES_MAX) return
    const excess = count - USER_GRAMMAR_EXAMPLES_MAX
    const { data: oldest } = await supabase
      .from('user_grammar_examples_test')
      .select('id')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
      .limit(excess)
    if (!oldest?.length) return
    await supabase.from('user_grammar_examples_test').delete().in('id', oldest.map(r => r.id as string))
  } catch (e) { console.warn('[test] saveUserGrammarExamples:', e) }
}
