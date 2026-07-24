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
// Pool de frases de repaso PERSISTENTE y COMPARTIDO → grammar_sentences_test
// (migraciones 042/043). Espeja grammar_sentences: las frases sembradas son
// públicas (is_private=false) y TODOS los admins las ven — igual que en prod, para
// que nadie necesite su propia API key. La RLS (043) restringe a públicas + las
// privadas propias, así que las queries del pool NO filtran por user_id. El
// generador admin (service role, ruta /step) las inserta con is_private=false.
// ─────────────────────────────────────────────────────────────────────────────
const KANJI_RE = /[一-鿿㐀-䶿]/
const parseSegs = (v: unknown) => Array.isArray(v)
  ? (v as unknown[]).filter(x => x && typeof (x as { t?: unknown }).t === 'string')
      .map(x => { const o = x as { t: string; f?: unknown }; return o.f ? { t: o.t, f: String(o.f) } : { t: o.t } })
  : []

export async function fetchGrammarSentences(grammarId: string): Promise<GrammarSentence[]> {
  try {
    await requireUser()
    const { data, error } = await supabase
      .from('grammar_sentences_test')
      .select('*')
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
    if (error) { console.warn('[test] fetchGrammarSentences:', error.message); return [] }
    return (data ?? [])
      .map(r => ({
        id: r.id,
        grammar_id: r.grammar_id,
        sentence_before: r.sentence_before ?? '',
        sentence_before_reading: r.sentence_before_reading ?? '',
        sentence_before_segments: parseSegs(r.sentence_before_segments),
        sentence_before_alts: Array.isArray(r.sentence_before_alts) ? r.sentence_before_alts : [],
        sentence_before_reading_alts: Array.isArray(r.sentence_before_reading_alts) ? r.sentence_before_reading_alts : [],
        sentence_after: r.sentence_after ?? '',
        sentence_after_reading: r.sentence_after_reading ?? '',
        sentence_after_segments: parseSegs(r.sentence_after_segments),
        answer: r.answer ?? '',
        answer_hint: Array.isArray(r.answer_hint)
          ? (r.answer_hint as unknown[]).filter(x => x && typeof (x as { w?: unknown }).w === 'string')
              .map(x => { const o = x as { w: string; r?: unknown }; return o.r ? { w: o.w, r: String(o.r) } : { w: o.w } })
          : [],
        answer_alts: Array.isArray(r.answer_alts) ? r.answer_alts : [],
        translation_es: r.translation_es ?? '',
        translation_ca: r.translation_ca ?? '',
        translation_en: r.translation_en ?? '',
        validated: r.validated ?? false,
        validated_by: r.validated_by ?? undefined,
        is_private: r.is_private ?? false,
      }))
      .filter(s => !KANJI_RE.test(s.answer))
      .sort((a, b) => (b.validated ? 1 : 0) - (a.validated ? 1 : 0))
  } catch { return [] }
}

export async function saveGrammarSentences(
  grammarId: string,
  sentences: Omit<GrammarSentence, 'id'>[],
  _opts?: { isPrivate?: boolean; userId?: string },
): Promise<void> {
  if (sentences.length === 0) return
  try {
    const user = await requireUser()
    const rows = sentences.map(s => ({
      user_id: user.id,
      grammar_id: grammarId,
      sentence_before: s.sentence_before,
      sentence_before_reading: s.sentence_before_reading,
      sentence_before_segments: s.sentence_before_segments ?? [],
      sentence_before_alts: s.sentence_before_alts ?? [],
      sentence_before_reading_alts: s.sentence_before_reading_alts ?? [],
      sentence_after: s.sentence_after,
      sentence_after_reading: s.sentence_after_reading,
      sentence_after_segments: s.sentence_after_segments ?? [],
      answer: s.answer,
      answer_alts: s.answer_alts,
      answer_hint: s.answer_hint ?? [],
      translation_es: s.translation_es,
      translation_ca: s.translation_ca,
      translation_en: s.translation_en,
    }))
    const { error } = await supabase.from('grammar_sentences_test').insert(rows)
    if (error) console.warn('[test] saveGrammarSentences:', error.message)
  } catch (e) { console.warn('[test] saveGrammarSentences:', e) }
}

export async function deleteGrammarSentences(grammarId: string): Promise<void> {
  try {
    await requireUser()
    const { error } = await supabase
      .from('grammar_sentences_test')
      .delete()
      .eq('grammar_id', grammarId)
    if (error) console.warn('[test] deleteGrammarSentences:', error.message)
  } catch (e) { console.warn('[test] deleteGrammarSentences:', e) }
}

export async function trimGrammarSentencesPool(grammarId: string, maxSize: number): Promise<void> {
  try {
    await requireUser()
    const { count, error: countErr } = await supabase
      .from('grammar_sentences_test')
      .select('*', { count: 'exact', head: true })
      .eq('grammar_id', grammarId)
    if (countErr || count === null || count <= maxSize) return
    const excess = count - maxSize
    const { data, error: fetchErr } = await supabase
      .from('grammar_sentences_test')
      .select('id')
      .eq('grammar_id', grammarId)
      .eq('validated', false)
      .order('created_at', { ascending: true })
      .limit(excess)
    if (fetchErr || !data?.length) return
    await supabase.from('grammar_sentences_test').delete().in('id', data.map(r => r.id as string))
  } catch (e) { console.warn('[test] trimGrammarSentencesPool:', e) }
}

export async function fetchGrammarSentenceCounts(ids: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (ids.length === 0) return out
  try {
    await requireUser()
    const { data, error } = await supabase
      .from('grammar_sentences_test')
      .select('grammar_id')
      .in('grammar_id', ids)
    if (error) { console.warn('[test] fetchGrammarSentenceCounts:', error.message); return out }
    for (const row of data ?? []) {
      const id = String((row as { grammar_id: string }).grammar_id)
      out.set(id, (out.get(id) ?? 0) + 1)
    }
  } catch { /* tabla puede no existir aún */ }
  return out
}

export async function updateGrammarSentence(
  id: string,
  patch: Partial<Omit<GrammarSentence, 'id' | 'grammar_id'>>,
): Promise<void> {
  try {
    await requireUser()
    const { error } = await supabase
      .from('grammar_sentences_test')
      .update(patch)
      .eq('id', id)
    if (error) console.warn('[test] updateGrammarSentence:', error.message)
  } catch (e) { console.warn('[test] updateGrammarSentence:', e) }
}

export async function deleteGrammarSentenceById(id: string): Promise<void> {
  try {
    await requireUser()
    const { error } = await supabase
      .from('grammar_sentences_test')
      .delete()
      .eq('id', id)
    if (error) console.warn('[test] deleteGrammarSentenceById:', error.message)
  } catch (e) { console.warn('[test] deleteGrammarSentenceById:', e) }
}

export async function validateGrammarSentence(id: string, validated: boolean): Promise<void> {
  try {
    const user = await requireUser()
    const patch = validated
      ? { validated: true, validated_by: user.id }
      : { validated: false, validated_by: null }
    const { error } = await supabase
      .from('grammar_sentences_test')
      .update(patch)
      .eq('id', id)
    if (error) console.warn('[test] validateGrammarSentence:', error.message)
  } catch (e) { console.warn('[test] validateGrammarSentence:', e) }
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

export async function deleteUserGrammarExample(id: string): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('user_grammar_examples_test')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) console.warn('[test] deleteUserGrammarExample:', error.message)
  } catch (e) { console.warn('[test] deleteUserGrammarExample:', e) }
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
