import { createClient } from '@supabase/supabase-js'
import type { VocabItem, ReviewMode } from './srs'
import { DEFAULT_SRS_INTERVALS } from './srs'
import {
  vocabItemToRow,
  rowToVocabItem,
  UPSERT_CHUNK_SIZE,
  SNAPSHOT_EVERY_N_REVIEWS,
  type ContextText,
} from './progress'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Supabase client con timeout de 45s en cada fetch.
// Los proyectos free tier de Supabase pueden tardar 20-30s en "despertar"
// cuando han estado inactivos, por lo que necesitamos un timeout generoso.
// El timeout de 15s en store.tsx desbloquea la UI antes de que esto expire.
export const supabase = createClient(url, key, {
  global: {
    fetch: (input, init) => {
      const controller = new AbortController()
      const id = setTimeout(() => controller.abort(), 45000)
      return fetch(input, { ...init, signal: controller.signal })
        .finally(() => clearTimeout(id))
    },
  },
})

/** True after we detect user_vocab_progress is unavailable (migration not applied). */
let legacyVocabMode = false

export function isLegacyVocabMode() {
  return legacyVocabMode
}

function isSchemaUnavailable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = (error.message ?? '').toLowerCase()
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || msg.includes('does not exist')
    || msg.includes('schema cache')
    || msg.includes('user_vocab_progress')
    || msg.includes('user_settings')
  )
}

// getSession() usa el token cacheado en localStorage — no hace round-trip al servidor.
// getUser() siempre valida con el servidor (lento). Usamos getSession() para todas
// las operaciones de BD donde solo necesitamos el user_id.
async function requireUser() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) throw new Error('No autenticado')
  return session.user
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------------------
// Legacy srs_progress (fallback when normalized tables are missing)
// ---------------------------------------------------------------------------

interface LegacyProgress {
  vocab_db?: VocabItem[]
  gemini_api_key?: string
  context_texts?: ContextText[]
  language?: string
}

export async function fetchLegacyProgress(): Promise<LegacyProgress | null> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('srs_progress')
    .select('vocab_db, gemini_api_key, context_texts, language')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) { console.error('legacy progress:', error); return null }
  return data ?? null
}

async function uploadLegacyVocab(vocabDb: VocabItem[]): Promise<void> {
  const user = await requireUser()
  const legacy = await fetchLegacyProgress()
  const { error } = await supabase.from('srs_progress').upsert({
    user_id: user.id,
    vocab_db: vocabDb,
    gemini_api_key: legacy?.gemini_api_key ?? null,
    context_texts: legacy?.context_texts ?? [],
    language: legacy?.language ?? 'es',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Vocabulary progress
// ---------------------------------------------------------------------------

export async function fetchUserVocab(): Promise<VocabItem[]> {
  if (legacyVocabMode) {
    const legacy = await fetchLegacyProgress()
    return Array.isArray(legacy?.vocab_db) ? legacy.vocab_db : []
  }

  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('jp')

  if (error) {
    if (isSchemaUnavailable(error)) {
      legacyVocabMode = true
      return fetchUserVocab()
    }
    throw error
  }
  const items = (data || []).map(rowToVocabItem)

  // Merge all canonical fields from the shared vocabulary table.
  // This ensures admin corrections to reading/meaning propagate to every user
  // on their next load, without needing to update individual user rows.
  const words = items.map(i => i.jp)
  if (words.length > 0) {
    type VocabMeta = {
      word: string
      kanji?: string | null
      reading?: string | null
      meaning_es?: string | null
      meaning_ca?: string | null
      meaning_en?: string | null
      image_url?: string | null
      grade?: number | null
      category?: string | null
      word_type?: string | null
    }
    // Deduplicate: vocabulary may have multiple rows per word (one per kanji entry).
    // We only need one row per word for the metadata merge.
    let vocabMeta: VocabMeta[] | null = null
    try {
      const { data, error } = await supabase
        .from('vocabulary')
        .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, image_url, grade, category, word_type')
        .in('word', words)
      if (!error && data) {
        // Keep first row per word
        const seen = new Set<string>()
        vocabMeta = data.filter((d: VocabMeta) => {
          if (seen.has(d.word)) return false
          seen.add(d.word)
          return true
        })
      }
    } catch { /* network error — use stored values */ }

    if (vocabMeta && vocabMeta.length > 0) {
      const sharedMap = new Map(vocabMeta.map(d => [d.word, d]))
      return items.map(i => {
        const shared = sharedMap.get(i.jp)
        if (!shared) return i
        return {
          ...i,
          // Canonical fields — always prefer shared vocabulary over stale user copy
          kanji:      shared.kanji      || i.kanji,
          reading:    shared.reading    || i.reading,
          meaning:    shared.meaning_es || i.meaning,
          meaning_ca: shared.meaning_ca ?? i.meaning_ca,
          meaning_en: shared.meaning_en ?? i.meaning_en,
          // Enrichment fields
          ...(shared.image_url  ? { image_url:  shared.image_url  } : {}),
          ...(shared.grade      ? { grade:      shared.grade      } : {}),
          ...(shared.category   ? { category:   shared.category as typeof i.category  } : {}),
          ...(shared.word_type  ? { word_type:  shared.word_type  as typeof i.word_type } : {}),
        }
      })
    }
  }
  return items
}

export async function upsertVocabItem(item: VocabItem, fullDb?: VocabItem[]): Promise<void> {
  if (legacyVocabMode) {
    const db = fullDb ?? (await fetchUserVocab())
    const merged = db.some(i => i.jp === item.jp)
      ? db.map(i => i.jp === item.jp ? item : i)
      : [...db, item]
    await uploadLegacyVocab(merged)
    return
  }

  const user = await requireUser()
  const { error } = await supabase
    .from('user_vocab_progress')
    .upsert(vocabItemToRow(user.id, item), { onConflict: 'user_id,jp' })

  if (error) {
    if (isSchemaUnavailable(error)) {
      legacyVocabMode = true
      await upsertVocabItem(item, fullDb)
      return
    }
    throw error
  }
}

export async function upsertVocabItems(items: VocabItem[], fullDb?: VocabItem[]): Promise<void> {
  if (items.length === 0 && !fullDb?.length) return

  if (legacyVocabMode) {
    const db = fullDb ?? await fetchUserVocab()
    const byJp = new Map(db.map(i => [i.jp, i]))
    for (const item of items) byJp.set(item.jp, item)
    await uploadLegacyVocab(Array.from(byJp.values()))
    return
  }

  const user = await requireUser()
  const rows = items.map(i => vocabItemToRow(user.id, i))
  try {
    for (const part of chunk(rows, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from('user_vocab_progress')
        .upsert(part, { onConflict: 'user_id,jp' })
      if (error) throw error
    }
  } catch (error) {
    if (isSchemaUnavailable(error as { code?: string; message?: string })) {
      legacyVocabMode = true
      await upsertVocabItems(items, fullDb)
      return
    }
    throw error
  }
}

export async function deleteAllUserVocab(): Promise<void> {
  const user = await requireUser()
  if (!legacyVocabMode) {
    const { error } = await supabase
      .from('user_vocab_progress')
      .delete()
      .eq('user_id', user.id)
    if (error && !isSchemaUnavailable(error)) throw error
  }
  const legacy = await fetchLegacyProgress()
  await supabase.from('srs_progress').upsert({
    user_id: user.id,
    vocab_db: [],
    gemini_api_key: legacy?.gemini_api_key ?? null,
    context_texts: legacy?.context_texts ?? [],
    language: legacy?.language ?? 'es',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function countUserVocab(userId?: string): Promise<number> {
  if (legacyVocabMode) {
    const legacy = await fetchLegacyProgress()
    return Array.isArray(legacy?.vocab_db) ? legacy.vocab_db.length : 0
  }

  const id = userId ?? (await requireUser()).id
  const { count, error } = await supabase
    .from('user_vocab_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)

  if (error) {
    if (isSchemaUnavailable(error)) {
      legacyVocabMode = true
      return countUserVocab(userId)
    }
    throw error
  }
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function fetchUserSettings(): Promise<{
  gemini_api_key: string
  pexels_api_key: string
  wanikani_api_key: string
  wanikani_min_srs_stage: number
  show_shared_sentences: boolean
  context_texts: ContextText[]
  language: string
} | null> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_settings')
    .select('gemini_api_key, pexels_api_key, wanikani_api_key, wanikani_min_srs_stage, show_shared_sentences, context_texts, language')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (isSchemaUnavailable(error)) {
      const legacy = await fetchLegacyProgress()
      if (!legacy) return null
      return {
        gemini_api_key: legacy.gemini_api_key ?? '',
        pexels_api_key: '',
        wanikani_api_key: '',
        wanikani_min_srs_stage: 5,
        show_shared_sentences: true,
        context_texts: (legacy.context_texts as ContextText[]) ?? [],
        language: legacy.language ?? 'es',
      }
    }
    console.error('fetchUserSettings:', error)
    return null
  }
  if (!data) return null
  return {
    gemini_api_key: data.gemini_api_key ?? '',
    pexels_api_key: data.pexels_api_key ?? '',
    wanikani_api_key: data.wanikani_api_key ?? '',
    wanikani_min_srs_stage: data.wanikani_min_srs_stage ?? 5,
    show_shared_sentences: data.show_shared_sentences ?? true,
    context_texts: (data.context_texts as ContextText[]) ?? [],
    language: data.language ?? 'es',
  }
}

async function ensureUserSettingsRow(): Promise<string> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error && isSchemaUnavailable(error)) return user.id

  if (!data) {
    const { error: insertErr } = await supabase.from('user_settings').insert({ user_id: user.id })
    if (insertErr && !isSchemaUnavailable(insertErr)) throw insertErr
  }
  return user.id
}

async function upsertLegacySettings(patch: Partial<LegacyProgress>) {
  const user = await requireUser()
  const legacy = await fetchLegacyProgress()
  const { error } = await supabase.from('srs_progress').upsert({
    user_id: user.id,
    vocab_db: legacy?.vocab_db ?? [],
    gemini_api_key: patch.gemini_api_key ?? legacy?.gemini_api_key ?? null,
    context_texts: patch.context_texts ?? legacy?.context_texts ?? [],
    language: patch.language ?? legacy?.language ?? 'es',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveGeminiKey(key: string) {
  try {
    const userId = await ensureUserSettingsRow()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, gemini_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) {
      await upsertLegacySettings({ gemini_api_key: key })
      return
    }
    throw e
  }
}

export async function savePexelsKey(key: string) {
  const userId = await ensureUserSettingsRow()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, pexels_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export async function saveWaniKaniKey(key: string) {
  const userId = await ensureUserSettingsRow()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, wanikani_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}

export async function saveWaniKaniMinSrsStage(stage: number) {
  try {
    const userId = await ensureUserSettingsRow()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, wanikani_min_srs_stage: stage, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) return
    throw e
  }
}

export async function saveShowSharedSentences(show: boolean) {
  try {
    const userId = await ensureUserSettingsRow()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, show_shared_sentences: show, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) return
    throw e
  }
}

// ---------------------------------------------------------------------------
// WaniKani vocabulary
// ---------------------------------------------------------------------------

export interface WaniKaniVocabItem {
  wanikani_id: number
  word: string
  reading: string
  meaning_en: string
  meaning_es: string | null
  meaning_ca: string | null
  level: number
  srs_stage: number
}

export async function fetchWaniKaniVocabSample(limit = 40): Promise<WaniKaniVocabItem[]> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('wanikani_user_vocab')
    .select('wanikani_id, word, reading, meaning_en, meaning_es, meaning_ca, level, srs_stage')
    .eq('user_id', user.id)
    .order('srs_stage', { ascending: false })
    .limit(limit * 3) // fetch extra to allow random sampling

  if (error) {
    if (isSchemaUnavailable(error)) return []
    console.error('fetchWaniKaniVocabSample:', error)
    return []
  }
  if (!data?.length) return []
  // Random sample
  return [...data].sort(() => Math.random() - 0.5).slice(0, limit)
}

export async function upsertWaniKaniVocab(
  items: Omit<WaniKaniVocabItem, never>[],
): Promise<void> {
  const user = await requireUser()
  const rows = items.map(i => ({ ...i, user_id: user.id, synced_at: new Date().toISOString() }))
  for (const batch of chunk(rows, 200)) {
    const { error } = await supabase
      .from('wanikani_user_vocab')
      .upsert(batch, { onConflict: 'user_id,wanikani_id' })
    if (error) throw error
  }
}

export async function getWaniKaniSyncStatus(): Promise<{ count: number; synced_at: string | null }> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('wanikani_user_vocab')
    .select('wanikani_id, synced_at')
    .eq('user_id', user.id)
    .order('synced_at', { ascending: false })
    .limit(1)

  if (error || !data) return { count: 0, synced_at: null }

  const { count: cnt } = await supabase
    .from('wanikani_user_vocab')
    .select('wanikani_id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return { count: cnt ?? 0, synced_at: data[0]?.synced_at ?? null }
}

// ---------------------------------------------------------------------------
// User-shared grammar sentences
// ---------------------------------------------------------------------------

export interface UserSharedSentence {
  id: string
  grammar_id: string
  sentence_before: string
  sentence_before_reading: string
  sentence_before_alts: string[]
  sentence_before_reading_alts: string[]
  sentence_after: string
  sentence_after_reading: string
  answer: string
  answer_alts: string[]
  translation_es: string
  translation_ca: string
  translation_en: string
  grammar_jlpt: string
  vocab_words: string[]
  topic: string | null
  shared_at: string
}

export async function shareGrammarSentence(params: {
  grammar_id: string
  sentence_before: string
  sentence_before_reading: string
  sentence_before_alts: string[]
  sentence_before_reading_alts: string[]
  sentence_after: string
  sentence_after_reading: string
  answer: string
  answer_alts: string[]
  translation_es: string
  translation_ca: string
  translation_en: string
  grammar_jlpt: string
  vocab_words: string[]
  topic: string | null
}): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase.from('user_shared_sentences').insert({
    ...params,
    shared_by: user.id,
  })
  if (error) throw error
}

export async function fetchUserSharedSentences(grammarId: string): Promise<UserSharedSentence[]> {
  const { data, error } = await supabase
    .from('user_shared_sentences')
    .select('id, grammar_id, sentence_before, sentence_before_reading, sentence_before_alts, sentence_before_reading_alts, sentence_after, sentence_after_reading, answer, answer_alts, translation_es, translation_ca, translation_en, grammar_jlpt, vocab_words, topic, shared_at')
    .eq('grammar_id', grammarId)
    .order('shared_at', { ascending: false })
    .limit(50)

  if (error) {
    if (isSchemaUnavailable(error)) return []
    console.error('fetchUserSharedSentences:', error)
    return []
  }
  return (data ?? []) as UserSharedSentence[]
}

export async function saveContextTexts(texts: ContextText[]) {
  try {
    const userId = await ensureUserSettingsRow()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, context_texts: texts.slice(0, 10), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) {
      await upsertLegacySettings({ context_texts: texts.slice(0, 10) })
      return
    }
    throw e
  }
}

export async function saveLanguage(lang: string) {
  try {
    const userId = await ensureUserSettingsRow()
    const { error } = await supabase
      .from('user_settings')
      .upsert({ user_id: userId, language: lang, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    if (error) throw error
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) {
      await upsertLegacySettings({ language: lang })
      return
    }
    throw e
  }
}

// ---------------------------------------------------------------------------
// Per-review persist + audit + snapshots
// ---------------------------------------------------------------------------

export async function saveReviewResult(
  item: VocabItem,
  meta: { jp: string; mode: ReviewMode; isCorrect: boolean; levelBefore: number; levelAfter: number; dueAfter: number },
  fullDb: VocabItem[],
): Promise<void> {
  const user = await requireUser()
  await upsertVocabItem(item, fullDb)

  if (!legacyVocabMode) {
    const { error: logError } = await supabase.from('srs_review_log').insert({
      user_id: user.id,
      jp: meta.jp,
      mode: meta.mode,
      is_correct: meta.isCorrect,
      level_before: meta.levelBefore,
      level_after: meta.levelAfter,
      due_after: meta.dueAfter,
    })
    if (logError && !isSchemaUnavailable(logError)) console.error('srs_review_log:', logError)
    await maybeCreateSnapshot(user.id)
  }
}

async function maybeCreateSnapshot(userId: string): Promise<void> {
  if (legacyVocabMode) return

  const { data: settings, error: readErr } = await supabase
    .from('user_settings')
    .select('reviews_since_snapshot')
    .eq('user_id', userId)
    .maybeSingle()
  if (readErr) {
    if (isSchemaUnavailable(readErr)) return
    console.error('snapshot counter read:', readErr)
    return
  }

  const prev = settings?.reviews_since_snapshot ?? 0
  const next = prev + 1

  if (next < SNAPSHOT_EVERY_N_REVIEWS) {
    await supabase
      .from('user_settings')
      .upsert({ user_id: userId, reviews_since_snapshot: next, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
    return
  }

  const { data: rows, error: vocabErr } = await supabase
    .from('user_vocab_progress')
    .select('*')
    .eq('user_id', userId)
  if (vocabErr) { console.error('snapshot vocab fetch:', vocabErr); return }

  const snapshot = (rows || []).map(rowToVocabItem)
  const { error: snapErr } = await supabase.from('srs_progress_snapshots').insert({
    user_id: userId,
    snapshot,
    reason: 'scheduled',
  })
  if (snapErr && !isSchemaUnavailable(snapErr)) console.error('snapshot insert:', snapErr)

  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, reviews_since_snapshot: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

export async function createManualSnapshot(vocab: VocabItem[], reason = 'manual'): Promise<void> {
  if (legacyVocabMode) return
  const user = await requireUser()
  const { error } = await supabase.from('srs_progress_snapshots').insert({
    user_id: user.id,
    snapshot: vocab,
    reason,
  })
  if (error && !isSchemaUnavailable(error)) throw error
}

export async function migrateLegacyProgressIfNeeded(): Promise<boolean> {
  if (legacyVocabMode) return false

  try {
    const user = await requireUser()
    const count = await countUserVocab(user.id)
    if (count > 0) return false

    const legacy = await fetchLegacyProgress()
    if (!legacy) return false

    const vocab = legacy.vocab_db
    if (Array.isArray(vocab) && vocab.length > 0) {
      await upsertVocabItems(vocab, vocab)
      try { await createManualSnapshot(vocab, 'legacy_migration') } catch { /* optional */ }
    }

    const hasSettings = legacy.gemini_api_key || legacy.context_texts?.length || legacy.language
    if (hasSettings && !legacyVocabMode) {
      await supabase.from('user_settings').upsert({
        user_id: user.id,
        gemini_api_key: legacy.gemini_api_key ?? null,
        context_texts: legacy.context_texts ?? [],
        language: legacy.language ?? 'es',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }

    return true
  } catch (e) {
    if (isSchemaUnavailable(e as { code?: string; message?: string })) {
      legacyVocabMode = true
    }
    return false
  }
}

/** Load vocab + settings; never throws — falls back to srs_progress. */
export async function downloadAccountData(): Promise<{
  vocab: VocabItem[]
  gemini_api_key: string
  pexels_api_key: string
  wanikani_api_key: string
  wanikani_min_srs_stage: number
  show_shared_sentences: boolean
  context_texts: ContextText[]
  language: string
} | null> {
  // Usar getSession() (caché) en lugar de getUser() (red) — mucho más rápido
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  try {
    await migrateLegacyProgressIfNeeded()
  } catch (e) {
    console.error('migrate:', e)
  }

  let vocab: VocabItem[] = []
  try {
    vocab = await fetchUserVocab()
  } catch (e) {
    console.error('fetchUserVocab:', e)
    legacyVocabMode = true
    const legacy = await fetchLegacyProgress()
    vocab = Array.isArray(legacy?.vocab_db) ? legacy.vocab_db : []
  }

  const settings = await fetchUserSettings()
  if (settings) {
    return { vocab, ...settings }
  }

  const legacy = await fetchLegacyProgress()
  return {
    vocab,
    gemini_api_key: legacy?.gemini_api_key ?? '',
    pexels_api_key: '',
    wanikani_api_key: '',
    wanikani_min_srs_stage: 5,
    show_shared_sentences: true,
    context_texts: (legacy?.context_texts as ContextText[]) ?? [],
    language: legacy?.language ?? 'es',
  }
}

/** @deprecated */
export async function downloadProgress() {
  const data = await downloadAccountData()
  if (!data) return null
  return {
    vocab_db: data.vocab,
    gemini_api_key: data.gemini_api_key,
    context_texts: data.context_texts,
    language: data.language,
  }
}

/** @deprecated */
export async function uploadProgress(vocabDb: VocabItem[]) {
  await upsertVocabItems(vocabDb, vocabDb)
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

/**
 * Resolve user role with multiple fallbacks:
 * 1. RPC get_my_role() — security definer, bypasses RLS (preferred)
 * 2. Direct SELECT on user_roles table (legacy / if RPC missing)
 * 3. NEXT_PUBLIC_ADMIN_EMAILS env var (emergency fallback)
 */
export async function getUserRole(userId: string): Promise<'admin' | 'contributor' | 'user'> {
  // 1. Try RPC (bypasses RLS — most reliable)
  try {
    const { data, error } = await supabase.rpc('get_my_role')
    if (!error && typeof data === 'string') {
      console.log('[getUserRole] RPC hit:', userId, '→', data)
      return data as 'admin' | 'contributor' | 'user'
    }
    if (error) console.warn('[getUserRole] RPC error:', error.code, error.message)
  } catch (e) {
    console.warn('[getUserRole] RPC exception:', e)
  }

  // 2. Fallback: direct table query (may be blocked by RLS)
  try {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
    if (!error && data) {
      console.log('[getUserRole] DB hit:', userId, '→', data.role)
      return data.role as 'admin' | 'contributor' | 'user'
    }
    if (error) console.warn('[getUserRole] DB error:', error.code, error.message)
    else console.warn('[getUserRole] No row in user_roles for', userId)
  } catch (e) {
    console.warn('[getUserRole] DB exception:', e)
  }

  return 'user'
}

export async function setUserRole(userId: string, role: 'admin' | 'contributor' | 'user') {
  const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function fetchVocabCountsByUser(): Promise<Record<string, number>> {
  if (legacyVocabMode) {
    const { data, error } = await supabase.from('srs_progress').select('user_id, vocab_db')
    if (error) throw error
    const map: Record<string, number> = {}
    for (const row of data || []) {
      map[row.user_id] = Array.isArray(row.vocab_db) ? row.vocab_db.length : 0
    }
    return map
  }

  const { data, error } = await supabase.from('user_vocab_progress').select('user_id')
  if (error) {
    if (isSchemaUnavailable(error)) {
      legacyVocabMode = true
      return fetchVocabCountsByUser()
    }
    throw error
  }
  const map: Record<string, number> = {}
  for (const row of data || []) {
    map[row.user_id] = (map[row.user_id] || 0) + 1
  }
  return map
}

// ---------------------------------------------------------------------------
// Vocabulary glossary — full list for a grade
// ---------------------------------------------------------------------------

export interface FullVocabEntry {
  word: string
  kanji: string
  reading: string
  meaning_es: string
  meaning_ca: string | null
  meaning_en: string | null
  is_official: boolean
  sort_order: number
}

/**
 * Fetch all vocabulary entries for a grade, sorted by kanji then sort_order.
 * Used by the Glossary view to show the full vocabulary list per grade.
 */
export async function fetchAllVocabByGrade(grade: number): Promise<FullVocabEntry[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, is_official, sort_order')
    .eq('grade', grade)
    .order('kanji', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(10000)
  if (error) throw error
  return (data ?? []).map(d => ({
    word: d.word,
    kanji: d.kanji,
    reading: d.reading,
    meaning_es: d.meaning_es ?? '',
    meaning_ca: d.meaning_ca ?? null,
    meaning_en: d.meaning_en ?? null,
    is_official: d.is_official ?? true,
    sort_order: d.sort_order ?? 0,
  }))
}

/** Returns word count per kanji for a set of kanjis in a grade. Used by QuickAddPanel. */
export async function getVocabWordCountsByKanjis(
  kanjis: string[],
  grade: number,
  includeUnofficial = false,
): Promise<Record<string, number>> {
  if (kanjis.length === 0) return {}
  let query = supabase
    .from('vocabulary')
    .select('kanji')
    .in('kanji', kanjis)
    .eq('grade', grade)
  if (!includeUnofficial) query = query.eq('is_official', true)
  const { data, error } = await query
  if (error) return {}
  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { kanji: string }[]) {
    counts[row.kanji] = (counts[row.kanji] ?? 0) + 1
  }
  return counts
}

/** Fetch all vocabulary entries across all grades. Used by the Glossary "All" view. */
export async function fetchAllVocab(): Promise<FullVocabEntry[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, is_official, sort_order')
    .order('kanji', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(10000)
  if (error) throw error
  return (data ?? []).map(d => ({
    word: d.word,
    kanji: d.kanji,
    reading: d.reading,
    meaning_es: d.meaning_es ?? '',
    meaning_ca: d.meaning_ca ?? null,
    meaning_en: d.meaning_en ?? null,
    is_official: d.is_official ?? true,
    sort_order: d.sort_order ?? 0,
  }))
}

/**
 * Server-side vocabulary search — searches across ALL rows regardless of PostgREST row limits.
 * Matches word, kanji, reading, meaning_es, meaning_ca, meaning_en with case-insensitive ILIKE.
 * Pass grade=0 to search across all grades.
 */
export async function searchVocabGlossary(
  query: string,
  grade: number,
): Promise<FullVocabEntry[]> {
  const q = query.trim()
  if (!q) return []
  const like = `%${q}%`
  let base = supabase
    .from('vocabulary')
    .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, is_official, sort_order')
    .or(`word.ilike.${like},kanji.ilike.${like},reading.ilike.${like},meaning_es.ilike.${like},meaning_ca.ilike.${like},meaning_en.ilike.${like}`)
    .order('kanji', { ascending: true })
    .order('sort_order', { ascending: true })
    .limit(500)
  if (grade > 0) base = base.eq('grade', grade)
  const { data, error } = await base
  if (error) throw error
  return (data ?? []).map(d => ({
    word: d.word,
    kanji: d.kanji,
    reading: d.reading,
    meaning_es: d.meaning_es ?? '',
    meaning_ca: d.meaning_ca ?? null,
    meaning_en: d.meaning_en ?? null,
    is_official: d.is_official ?? true,
    sort_order: d.sort_order ?? 0,
  }))
}

/** Returns word+kanji+is_official for all rows of a grade — used for stats.
 *  Falls back to a query without is_official if the column doesn't exist yet. */
export async function getVocabGradeWords(grade: number): Promise<Array<{ word: string; kanji: string; is_official: boolean }>> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('word, kanji, is_official')
    .eq('grade', grade)
  if (error) {
    // is_official column not yet added — fall back to basic query
    const { data: fallback, error: fallbackErr } = await supabase
      .from('vocabulary')
      .select('word, kanji')
      .eq('grade', grade)
    if (fallbackErr) throw fallbackErr
    return (fallback ?? []).map(d => ({ word: d.word, kanji: d.kanji, is_official: true }))
  }
  return (data ?? []).map(d => ({ word: d.word, kanji: d.kanji, is_official: d.is_official ?? true }))
}

/** Full-text search across kanji, word, reading and meanings. */
export async function searchVocabulary(query: string): Promise<any[]> {
  const q = query.trim()
  if (!q || q.length > 100) return []
  // Strip characters that have special meaning in PostgREST filter strings
  // to prevent filter injection via the raw .or() string.
  const safe = q.replace(/[(),."\\]/g, '')
  if (!safe) return []
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .or(
      `kanji.ilike.%${safe}%,word.ilike.%${safe}%,reading.ilike.%${safe}%,` +
      `meaning_es.ilike.%${safe}%,meaning_ca.ilike.%${safe}%,meaning_en.ilike.%${safe}%`
    )
    .order('sort_order', { ascending: true })
    .limit(40)
  if (error) throw error
  return data ?? []
}

/** Looks up the grade of a kanji in the vocabulary table. Returns null if not found. */
export async function getKanjiGrade(kanji: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('grade')
    .eq('kanji', kanji)
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data?.grade ?? null
}

/** Inserts a user-submitted word into the shared vocabulary table as unofficial.
 *  Client-side limits mirror the DB RLS policy — the DB is the authoritative check. */
export async function insertUnofficialVocab(entry: {
  kanji: string
  word: string
  reading: string
  meaning_es: string
  grade: number
}): Promise<void> {
  const { kanji, word, reading, meaning_es } = entry
  if (!kanji || kanji.trim().length < 1 || kanji.trim().length > 5)
    throw new Error('El kanji debe tener entre 1 y 5 caracteres.')
  if (!word || word.trim().length < 1 || word.trim().length > 20)
    throw new Error('La palabra debe tener entre 1 y 20 caracteres.')
  if (!reading || reading.trim().length < 1 || reading.trim().length > 50)
    throw new Error('La lectura debe tener entre 1 y 50 caracteres.')
  if (!meaning_es || meaning_es.trim().length < 1 || meaning_es.trim().length > 300)
    throw new Error('El significado debe tener entre 1 y 300 caracteres.')

  const { error } = await supabase.from('vocabulary').insert({
    kanji: kanji.trim(),
    word: word.trim(),
    reading: reading.trim(),
    meaning_es: meaning_es.trim(),
    grade: entry.grade,
    is_official: false,
    sort_order: 99999,
    // added_by y created_at los pone el trigger del servidor — no los enviamos desde el cliente
  })
  if (error?.code === '23505') return           // duplicado: ya existe, no es un error
  if (error?.message?.includes('check_vocab_insert_rate'))
    throw new Error('Has alcanzado el límite de 20 palabras nuevas en 24 horas. Inténtalo mañana.')
  if (error) throw error
}

export interface VocabMeta {
  image_url?: string
  grade?: number
}

/**
 * Fetch vocabulary metadata (image_url, grade) for a list of words directly from the
 * vocabulary table. Used as a reliable fallback when state.db items don't have these
 * fields populated (e.g. store merge failed on login, or images added after last sync).
 */
export async function fetchVocabMeta(words: string[]): Promise<Map<string, VocabMeta>> {
  if (words.length === 0) return new Map()
  try {
    const { data } = await supabase
      .from('vocabulary')
      .select('word, image_url, grade')
      .in('word', words)
    if (!data) return new Map()
    return new Map(
      (data as { word: string; image_url?: string | null; grade?: number | null }[]).map(d => [
        d.word,
        {
          ...(d.image_url ? { image_url: d.image_url } : {}),
          ...(d.grade ? { grade: d.grade } : {}),
        },
      ])
    )
  } catch {
    return new Map()
  }
}

/** @deprecated Use fetchVocabMeta instead */
export async function fetchVocabImageUrls(words: string[]): Promise<Map<string, string>> {
  const meta = await fetchVocabMeta(words)
  const result = new Map<string, string>()
  meta.forEach((v, k) => { if (v.image_url) result.set(k, v.image_url) })
  return result
}

/**
 * Fetch all vocabulary words for the given kanjis and grade.
 * @param includeNonOfficial – if false (default) only official words are returned.
 *   Pass true to also include community-added unofficial words.
 */
export async function getVocabularyByKanjis(
  kanjis: string[],
  grade = 1,
  includeNonOfficial = false,
) {
  let query = supabase
    .from('vocabulary')
    .select('*')
    .in('kanji', kanjis)
    .eq('grade', grade)
    .order('kanji', { ascending: true })
    .order('sort_order', { ascending: true })

  if (!includeNonOfficial) {
    query = query.eq('is_official', true)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getRandomKanjis(_count: number, grade = 1) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('kanji')
    .eq('grade', grade)
    .order('sort_order', { ascending: true })
  if (error) throw error
  // Deduplicate preserving sort_order (Set keeps insertion order)
  return Array.from(new Set((data || []).map((d: { kanji: string }) => d.kanji))) as string[]
}

/**
 * Fetch the next N kanjis (across all grades, ordered grade ASC then sort_order ASC)
 * that the user hasn't imported yet, along with their vocabulary words.
 *
 * Strategy: fetch all vocab once, filter to words NOT in the user's DB, then pick
 * the first N unique kanjis from that filtered set (preserving grade/sort_order).
 * This correctly skips kanjis that have already been fully imported.
 *
 * @param n - Number of kanjis to fetch (typically 3, 5, or 15)
 * @param existingJpWords - Set of word JP values already in the user's DB
 * @returns Array of vocabulary rows ready to be imported as active items
 */
export async function getNextNewVocab(
  n: number,
  existingJpWords: Set<string>,
): Promise<Array<{
  kanji: string; word: string; reading: string;
  meaning_es: string; meaning_ca: string | null; meaning_en: string | null;
  image_url: string | null; grade: number; category: string | null; word_type: string | null;
  sort_order: number;
}>> {
  // Fetch all vocab ordered by grade then sort_order (single query)
  const { data: allVocab, error } = await supabase
    .from('vocabulary')
    .select('kanji, word, reading, meaning_es, meaning_ca, meaning_en, image_url, grade, category, word_type, sort_order')
    .order('grade', { ascending: true })
    .order('kanji', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error

  // Keep only words NOT already in user's DB
  const newWords = (allVocab ?? []).filter(v => !existingJpWords.has(v.word))

  // Walk through new words in order, collecting unique kanjis until we have N
  const selectedKanjis = new Set<string>()
  for (const row of newWords) {
    if (selectedKanjis.size >= n) break
    selectedKanjis.add(row.kanji)
  }

  if (selectedKanjis.size === 0) return []

  // Return all new words that belong to those N kanjis
  return newWords
    .filter(v => selectedKanjis.has(v.kanji))
    .map(v => ({
      kanji: v.kanji,
      word: v.word,
      reading: v.reading,
      meaning_es: v.meaning_es ?? '',
      meaning_ca: v.meaning_ca ?? null,
      meaning_en: v.meaning_en ?? null,
      image_url: v.image_url ?? null,
      grade: v.grade ?? 1,
      category: v.category ?? null,
      word_type: v.word_type ?? null,
      sort_order: v.sort_order ?? 0,
    }))
}

// ---------------------------------------------------------------------------
// Skip-to-grade: bulk fetch vocabulary below a given grade
// ---------------------------------------------------------------------------

export async function getVocabCountBelowGrade(maxGrade: number): Promise<number> {
  const { count, error } = await supabase
    .from('vocabulary')
    .select('*', { count: 'exact', head: true })
    .lt('grade', maxGrade)
    .eq('is_official', true)
  if (error) throw error
  return count ?? 0
}

export async function getVocabularyBelowGrade(maxGrade: number): Promise<Array<{
  kanji: string; word: string; reading: string;
  meaning_es: string; meaning_ca: string | null; meaning_en: string | null;
  image_url: string | null; grade: number; category: string | null; word_type: string | null;
  sort_order: number;
}>> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('kanji, word, reading, meaning_es, meaning_ca, meaning_en, image_url, grade, category, word_type, sort_order')
    .lt('grade', maxGrade)
    .eq('is_official', true)
    .order('grade', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []).map(v => ({
    kanji: v.kanji,
    word: v.word,
    reading: v.reading,
    meaning_es: v.meaning_es ?? '',
    meaning_ca: v.meaning_ca ?? null,
    meaning_en: v.meaning_en ?? null,
    image_url: v.image_url ?? null,
    grade: v.grade ?? 1,
    category: v.category ?? null,
    word_type: v.word_type ?? null,
    sort_order: v.sort_order ?? 0,
  }))
}

// ---------------------------------------------------------------------------
// App config (global settings — e.g. SRS intervals)
// ---------------------------------------------------------------------------

export async function fetchAppConfig<T = unknown>(key: string): Promise<T | null> {
  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  if (error) {
    // Table might not exist yet
    if (isSchemaUnavailable(error) || (error.message ?? '').toLowerCase().includes('app_config')) return null
    console.error('fetchAppConfig:', error)
    return null
  }
  return data?.value as T ?? null
}

export async function fetchSrsIntervalsConfig(): Promise<number[] | null> {
  const val = await fetchAppConfig<number[]>('srs_intervals')
  if (!Array.isArray(val) || val.length !== 8) return null
  return val
}

// ---------------------------------------------------------------------------
// MFA helpers
// ---------------------------------------------------------------------------

export async function getMfaFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) return { totp: [] as { id: string; status: string; friendly_name?: string }[] }
  return { totp: (data?.totp ?? []) as { id: string; status: string; friendly_name?: string }[] }
}

export async function getCurrentAal(): Promise<'aal1' | 'aal2'> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  return (data?.currentLevel as 'aal1' | 'aal2') ?? 'aal1'
}

// ---------------------------------------------------------------------------
// Grammar progress
// ---------------------------------------------------------------------------

export async function fetchKnownGrammar(): Promise<Set<string>> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('user_grammar_progress')
      .select('grammar_id')
      .eq('user_id', user.id)
      .eq('known', true)
    if (error) { console.warn('grammar progress:', error); return new Set() }
    return new Set((data ?? []).map((r: { grammar_id: string }) => r.grammar_id))
  } catch {
    return new Set()
  }
}

export async function submitImageVote(word: string, vote: 1 | -1): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase
    .from('vocab_image_votes')
    .upsert({ word, user_id: user.id, vote }, { onConflict: 'word,user_id' })
  if (error) throw error
}

export async function setGrammarKnown(grammarId: string, known: boolean): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase
    .from('user_grammar_progress')
    .upsert({ user_id: user.id, grammar_id: grammarId, known, updated_at: new Date().toISOString() })
  if (error) console.error('setGrammarKnown:', error)
}

// ---------------------------------------------------------------------------
// Grammar SRS — sentences pool
// ---------------------------------------------------------------------------

import type { GrammarSentence, GrammarSrsStat } from './grammar-srs'

/**
 * Fetch all cached sentences for a grammar point.
 * Returns [] if the table doesn't exist yet.
 */
export async function fetchGrammarSentences(grammarId: string): Promise<GrammarSentence[]> {
  try {
    const { data, error } = await supabase
      .from('grammar_sentences')
      .select('*')
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
    if (error) { console.warn('fetchGrammarSentences:', error.message); return [] }
    // Filter out legacy sentences where the answer contains kanji —
    // these were generated before the prompt fix and have content words in the answer.
    const KANJI_RE = /[一-鿿㐀-䶿]/
    return (data ?? [])
      .map(r => ({
        id: r.id,
        grammar_id: r.grammar_id,
        sentence_before: r.sentence_before ?? '',
        sentence_before_reading: r.sentence_before_reading ?? '',
        sentence_before_alts: Array.isArray(r.sentence_before_alts) ? r.sentence_before_alts : [],
        sentence_before_reading_alts: Array.isArray(r.sentence_before_reading_alts) ? r.sentence_before_reading_alts : [],
        sentence_after: r.sentence_after ?? '',
        sentence_after_reading: r.sentence_after_reading ?? '',
        answer: r.answer ?? '',
        answer_alts: Array.isArray(r.answer_alts) ? r.answer_alts : [],
        translation_es: r.translation_es ?? '',
        translation_ca: r.translation_ca ?? '',
        translation_en: r.translation_en ?? '',
        validated: r.validated ?? false,
        validated_by: r.validated_by ?? undefined,
      }))
      .filter(s => !KANJI_RE.test(s.answer))
      // Validated sentences float to the top
      .sort((a, b) => (b.validated ? 1 : 0) - (a.validated ? 1 : 0))
  } catch {
    return []
  }
}

/**
 * Batch-insert new sentences into the shared pool.
 * Silently ignores errors if the table doesn't exist yet.
 */
export async function saveGrammarSentences(
  grammarId: string,
  sentences: Omit<GrammarSentence, 'id'>[],
): Promise<void> {
  if (sentences.length === 0) return
  try {
    const rows = sentences.map(s => ({
      grammar_id: grammarId,
      sentence_before: s.sentence_before,
      sentence_before_reading: s.sentence_before_reading,
      sentence_before_alts: s.sentence_before_alts ?? [],
      sentence_before_reading_alts: s.sentence_before_reading_alts ?? [],
      sentence_after: s.sentence_after,
      sentence_after_reading: s.sentence_after_reading,
      answer: s.answer,
      answer_alts: s.answer_alts,
      translation_es: s.translation_es,
      translation_ca: s.translation_ca,
      translation_en: s.translation_en,
    }))
    const { error } = await supabase.from('grammar_sentences').insert(rows)
    if (error) console.warn('saveGrammarSentences:', error.message)
  } catch (e) {
    console.warn('saveGrammarSentences exception:', e)
  }
}

/**
 * Delete all cached sentences for a grammar point.
 * Used to purge an outdated pool before regenerating with the new prompt.
 */
export async function deleteGrammarSentences(grammarId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('grammar_sentences')
      .delete()
      .eq('grammar_id', grammarId)
    if (error) console.warn('deleteGrammarSentences:', error.message)
  } catch (e) {
    console.warn('deleteGrammarSentences exception:', e)
  }
}

/**
 * Trim the shared sentence pool for a grammar point to at most `maxSize` rows,
 * deleting the oldest sentences (by created_at) when the pool exceeds the limit.
 *
 * This is called automatically after each generation batch so that the pool stays
 * within bounds while always keeping the freshest sentences.
 *
 * Returns the number of sentences actually deleted (0 if no trim was needed).
 */
export async function trimGrammarSentencesPool(
  grammarId: string,
  maxSize: number,
): Promise<number> {
  try {
    // 1. Count how many sentences currently exist for this grammar point
    const { count, error: countErr } = await supabase
      .from('grammar_sentences')
      .select('*', { count: 'exact', head: true })
      .eq('grammar_id', grammarId)

    if (countErr || count === null || count <= maxSize) return 0

    const excess = count - maxSize

    // 2. Fetch the IDs of the oldest `excess` sentences
    const { data, error: fetchErr } = await supabase
      .from('grammar_sentences')
      .select('id')
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
      .limit(excess)

    if (fetchErr || !data?.length) return 0

    const ids = data.map(r => r.id as string)

    // 3. Delete them
    const { error: deleteErr } = await supabase
      .from('grammar_sentences')
      .delete()
      .in('id', ids)

    if (deleteErr) { console.warn('trimGrammarSentencesPool:', deleteErr.message); return 0 }

    return ids.length
  } catch (e) {
    console.warn('trimGrammarSentencesPool exception:', e)
    return 0
  }
}

// ---------------------------------------------------------------------------
// Grammar SRS — per-user progress
// ---------------------------------------------------------------------------

/**
 * Fetch SRS stat for a single grammar point.
 * Returns null (level 0, never reviewed) if not found.
 */
export async function fetchGrammarSrsStat(grammarId: string): Promise<GrammarSrsStat | null> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('grammar_srs_progress')
      .select('grammar_id, level, next_review')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .maybeSingle()
    if (error) { console.warn('fetchGrammarSrsStat:', error.message); return null }
    if (!data) return null
    return { grammar_id: data.grammar_id, level: data.level, next_review: data.next_review }
  } catch {
    return null
  }
}

/**
 * Fetch SRS stats for ALL grammar points of the current user.
 * Used to show the "N due today" badge in GrammarClient.
 */
export async function fetchAllGrammarSrsStats(): Promise<GrammarSrsStat[]> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('grammar_srs_progress')
      .select('grammar_id, level, next_review')
      .eq('user_id', user.id)
    if (error) { console.warn('fetchAllGrammarSrsStats:', error.message); return [] }
    return (data ?? []).map(r => ({
      grammar_id: r.grammar_id,
      level: r.level,
      next_review: r.next_review,
    }))
  } catch {
    return []
  }
}

/**
 * Fetch a random sample of vocabulary from the Japanese school curriculum.
 * Grade 1–6 = primaria (primary), Grade 7–9 = secundaria (secondary).
 * Used to provide vocabulary hints when generating AI grammar sentences,
 * so that practice sentences use common, learner-appropriate words.
 */
export async function fetchSchoolVocabSample(
  sampleSize: number = 30,
): Promise<{ jp: string; reading: string; meaning_es: string; meaning_ca: string | null; meaning_en: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('vocabulary')
      .select('word, reading, meaning_es, meaning_ca, meaning_en')
      .lte('grade', 9)
      .limit(400)
    if (error) { console.warn('fetchSchoolVocabSample:', error); return [] }
    return [...(data ?? [])]
      .sort(() => Math.random() - 0.5)
      .slice(0, sampleSize)
      .map(d => ({
        jp: String(d.word ?? ''),
        reading: String(d.reading ?? ''),
        meaning_es: String(d.meaning_es ?? ''),
        meaning_ca: d.meaning_ca ? String(d.meaning_ca) : null,
        meaning_en: d.meaning_en ? String(d.meaning_en) : null,
      }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Contrarios (antonym pairs)
// ---------------------------------------------------------------------------

export interface AntonymEntry {
  word:       string
  kanji:      string
  reading:    string
  meaning_es: string
  meaning_ca: string | null
  meaning_en: string | null
  word_type:  string | null
  grade:      number | null
}

export interface AntonymPair {
  id:     number
  word_a: AntonymEntry
  word_b: AntonymEntry
}

// ---------------------------------------------------------------------------
// Transitivity — verbs by type
// ---------------------------------------------------------------------------

export interface VerbEntry {
  word:       string
  kanji:      string
  reading:    string
  meaning_es: string
  meaning_ca: string | null
  meaning_en: string | null
  word_type:  'verb_transitive' | 'verb_intransitive' | 'verb'
  grade:      number | null
}

export async function fetchVerbsByTransitivity(): Promise<VerbEntry[]> {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('word, kanji, reading, meaning_es, meaning_ca, meaning_en, word_type, grade')
    .in('word_type', ['verb_transitive', 'verb_intransitive', 'verb'])
    .order('grade', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('fetchVerbsByTransitivity error:', error)
    return []
  }
  return (data ?? []) as unknown as VerbEntry[]
}

/**
 * Fetch all antonym pairs via the server-side API route.
 * Using a server route avoids PostgREST schema-cache issues that can
 * affect the anon client when vocab_antonyms was recently created.
 */
export async function fetchAntonymPairs(): Promise<AntonymPair[]> {
  try {
    const res = await fetch('/api/vocab/antonyms', { cache: 'no-store' })
    if (!res.ok) return []
    const { pairs } = await res.json()
    return (pairs ?? []) as AntonymPair[]
  } catch (e) {
    console.warn('fetchAntonymPairs exception:', e)
    return []
  }
}

/**
 * Upsert the SRS result for a grammar point after a practice session.
 */
export async function saveGrammarSrsResult(
  grammarId: string,
  newLevel: number,
  nextReview: number,
): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('grammar_srs_progress')
      .upsert(
        { user_id: user.id, grammar_id: grammarId, level: newLevel, next_review: nextReview },
        { onConflict: 'user_id,grammar_id' },
      )
    if (error) console.error('saveGrammarSrsResult:', error.message)
  } catch (e) {
    console.error('saveGrammarSrsResult exception:', e)
  }
}

/**
 * Mark a grammar point as "studying" (level 0, immediately due) if it has
 * no existing SRS entry. Safe to call multiple times — won't downgrade progress.
 * Returns the new stat if a row was inserted, null if it already existed.
 */
export async function markGrammarAsStudying(grammarId: string): Promise<{ grammar_id: string; level: number; next_review: number } | null> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('grammar_srs_progress')
      .insert({ user_id: user.id, grammar_id: grammarId, level: 1, next_review: 0 })
    if (error) {
      // 23505 = unique violation = already has an entry, that's fine
      if (error.code !== '23505') console.warn('markGrammarAsStudying:', error.message)
      return null
    }
    return { grammar_id: grammarId, level: 1, next_review: 0 }
  } catch (e) {
    console.warn('markGrammarAsStudying exception:', e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// User grammar examples — personal AI example pool (5 generated, 10 max)
// ─────────────────────────────────────────────────────────────────────────────

export interface UserGrammarExample {
  id: string
  grammar_id: string
  /** AiToken[] serialised as JSONB */
  jp: unknown[]
  /** AiToken[] serialised as JSONB */
  translation: unknown[]
}

const USER_GRAMMAR_EXAMPLES_MAX = 10

/**
 * Returns all saved example sentences for the current user and grammar point,
 * ordered oldest → newest.  Returns [] if the table doesn't exist yet.
 */
export async function fetchUserGrammarExamples(
  grammarId: string,
): Promise<UserGrammarExample[]> {
  try {
    const user = await requireUser()
    const { data, error } = await supabase
      .from('user_grammar_examples')
      .select('id, grammar_id, jp, translation')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
    if (error) { console.warn('fetchUserGrammarExamples:', error.message); return [] }
    return (data ?? []) as UserGrammarExample[]
  } catch (e) {
    console.warn('fetchUserGrammarExamples exception:', e)
    return []
  }
}

/**
 * Update the jp and translation arrays of a single user grammar example.
 * Only the owner can update their own row (RLS enforced by user_id).
 */
export async function updateUserGrammarExample(
  id: string,
  jp: unknown[],
  translation: unknown[],
): Promise<void> {
  try {
    const user = await requireUser()
    const { error } = await supabase
      .from('user_grammar_examples')
      .update({ jp, translation })
      .eq('id', id)
      .eq('user_id', user.id)
    if (error) console.warn('updateUserGrammarExample:', error.message)
  } catch (e) {
    console.warn('updateUserGrammarExample exception:', e)
  }
}

/**
 * Update selected fields of a shared grammar practice sentence.
 * The grammar_sentences table is a shared pool (no user_id). Admin/contributor
 * roles can fix AI-generated sentences for all users.
 */
export async function updateGrammarSentence(
  id: string,
  patch: Partial<Omit<GrammarSentence, 'id' | 'grammar_id'>>,
): Promise<void> {
  try {
    const { error } = await supabase
      .from('grammar_sentences')
      .update(patch)
      .eq('id', id)
    if (error) console.warn('updateGrammarSentence:', error.message)
  } catch (e) {
    console.warn('updateGrammarSentence exception:', e)
  }
}

/**
 * Delete a single grammar sentence from the shared pool by its UUID.
 * Used by admins / contributors to permanently remove nonsensical AI sentences.
 */
export async function deleteGrammarSentenceById(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('grammar_sentences')
      .delete()
      .eq('id', id)
    if (error) console.warn('deleteGrammarSentenceById:', error.message)
  } catch (e) {
    console.warn('deleteGrammarSentenceById exception:', e)
  }
}

/**
 * Mark (or unmark) a shared grammar sentence as validated by the current user.
 * Only admins / contributors should call this — the role check is done in the UI.
 */
export async function validateGrammarSentence(id: string, validated: boolean): Promise<void> {
  try {
    const user = await requireUser()
    const patch = validated
      ? { validated: true, validated_by: user.id }
      : { validated: false, validated_by: null }
    const { error } = await supabase
      .from('grammar_sentences')
      .update(patch)
      .eq('id', id)
    if (error) console.warn('validateGrammarSentence:', error.message)
  } catch (e) {
    console.warn('validateGrammarSentence exception:', e)
  }
}

/**
 * Inserts new example sentences for the current user, then trims the pool to
 * at most USER_GRAMMAR_EXAMPLES_MAX (10) by deleting the oldest rows.
 */
export async function saveUserGrammarExamples(
  grammarId: string,
  sentences: { jp: unknown[]; translation: unknown[] }[],
): Promise<void> {
  if (!sentences.length) return
  try {
    const user = await requireUser()

    // 1. Insert new rows
    const rows = sentences.map(s => ({
      user_id:    user.id,
      grammar_id: grammarId,
      jp:         s.jp,
      translation: s.translation,
    }))
    const { error: insertErr } = await supabase
      .from('user_grammar_examples')
      .insert(rows)
    if (insertErr) { console.warn('saveUserGrammarExamples insert:', insertErr.message); return }

    // 2. Count total
    const { count, error: countErr } = await supabase
      .from('user_grammar_examples')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
    if (countErr || count === null || count <= USER_GRAMMAR_EXAMPLES_MAX) return

    // 3. Delete oldest to keep within cap
    const excess = count - USER_GRAMMAR_EXAMPLES_MAX
    const { data: oldest, error: fetchErr } = await supabase
      .from('user_grammar_examples')
      .select('id')
      .eq('user_id', user.id)
      .eq('grammar_id', grammarId)
      .order('created_at', { ascending: true })
      .limit(excess)
    if (fetchErr || !oldest?.length) return
    const ids = oldest.map(r => r.id as string)
    const { error: deleteErr } = await supabase
      .from('user_grammar_examples')
      .delete()
      .in('id', ids)
    if (deleteErr) console.warn('saveUserGrammarExamples trim:', deleteErr.message)
  } catch (e) {
    console.warn('saveUserGrammarExamples exception:', e)
  }
}

export async function submitVocabReport(payload: {
  word: string
  field: 'reading' | 'meaning' | 'kanji' | 'general'
  description?: string
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('vocab_reports').insert({
    word: payload.word,
    user_id: user.id,
    user_email: user.email ?? '',
    field: payload.field,
    description: payload.description ?? '',
  })
  if (error) throw new Error(error.message)
}

export async function submitFeedbackReport(payload: {
  type: 'bug' | 'mejora'
  section: string
  description: string
}): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase.from('feedback_reports').insert({
    user_id: user.id,
    user_email: user.email ?? '',
    type: payload.type,
    section: payload.section,
    description: payload.description,
  })
  if (error) throw new Error(error.message)
}

// ── Progression (XP / levels) ──────────────────────────────────────────────────
import type { UserProgression } from './progression'

export async function fetchUserProgression(userId: string): Promise<UserProgression | null> {
  const { data, error } = await supabase
    .from('user_progression')
    .select('vocab_xp, grammar_xp, total_xp, vocab_level, grammar_level, total_level, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) { console.error('fetchUserProgression:', error.message); return null }
  return data as UserProgression | null
}

export async function upsertUserProgression(prog: UserProgression, userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_progression')
    .upsert({
      user_id: userId,
      vocab_xp: prog.vocab_xp,
      grammar_xp: prog.grammar_xp,
      total_xp: prog.total_xp,
      vocab_level: prog.vocab_level,
      grammar_level: prog.grammar_level,
      total_level: prog.total_level,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  if (error) throw new Error(`upsertUserProgression: ${error.message}`)
}
