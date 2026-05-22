import { createClient } from '@supabase/supabase-js'
import type { VocabItem, ReviewMode } from './srs'
import {
  vocabItemToRow,
  rowToVocabItem,
  UPSERT_CHUNK_SIZE,
  SNAPSHOT_EVERY_N_REVIEWS,
  type ContextText,
} from './progress'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const supabase = createClient(url, key)

async function requireUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return user
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ---------------------------------------------------------------------------
// Vocabulary progress (normalized)
// ---------------------------------------------------------------------------

export async function fetchUserVocab(): Promise<VocabItem[]> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_vocab_progress')
    .select('*')
    .eq('user_id', user.id)
    .order('jp')
  if (error) throw error
  return (data || []).map(rowToVocabItem)
}

export async function upsertVocabItem(item: VocabItem): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase
    .from('user_vocab_progress')
    .upsert(vocabItemToRow(user.id, item), { onConflict: 'user_id,jp' })
  if (error) throw error
}

export async function upsertVocabItems(items: VocabItem[]): Promise<void> {
  if (items.length === 0) return
  const user = await requireUser()
  const rows = items.map(i => vocabItemToRow(user.id, i))
  for (const part of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error } = await supabase
      .from('user_vocab_progress')
      .upsert(part, { onConflict: 'user_id,jp' })
    if (error) throw error
  }
}

export async function deleteAllUserVocab(): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase
    .from('user_vocab_progress')
    .delete()
    .eq('user_id', user.id)
  if (error) throw error
}

export async function countUserVocab(userId?: string): Promise<number> {
  const id = userId ?? (await requireUser()).id
  const { count, error } = await supabase
    .from('user_vocab_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', id)
  if (error) throw error
  return count ?? 0
}

// ---------------------------------------------------------------------------
// Settings (separate from progress)
// ---------------------------------------------------------------------------

export async function fetchUserSettings(): Promise<{
  gemini_api_key: string
  context_texts: ContextText[]
  language: string
} | null> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_settings')
    .select('gemini_api_key, context_texts, language')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error) { console.error('fetchUserSettings:', error); return null }
  if (!data) return null
  return {
    gemini_api_key: data.gemini_api_key ?? '',
    context_texts: (data.context_texts as ContextText[]) ?? [],
    language: data.language ?? 'es',
  }
}

async function ensureUserSettingsRow(): Promise<string> {
  const user = await requireUser()
  const { data } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()
  if (!data) {
    const { error } = await supabase.from('user_settings').insert({ user_id: user.id })
    if (error) throw error
  }
  return user.id
}

export async function saveGeminiKey(key: string) {
  const userId = await ensureUserSettingsRow()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, gemini_api_key: key, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveContextTexts(texts: ContextText[]) {
  const userId = await ensureUserSettingsRow()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, context_texts: texts.slice(0, 10), updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function saveLanguage(lang: string) {
  const userId = await ensureUserSettingsRow()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, language: lang, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Per-review persist + audit + snapshots
// ---------------------------------------------------------------------------

export async function saveReviewResult(
  item: VocabItem,
  meta: { jp: string; mode: ReviewMode; isCorrect: boolean; levelBefore: number; levelAfter: number; dueAfter: number },
): Promise<void> {
  const user = await requireUser()
  await upsertVocabItem(item)

  const { error: logError } = await supabase.from('srs_review_log').insert({
    user_id: user.id,
    jp: meta.jp,
    mode: meta.mode,
    is_correct: meta.isCorrect,
    level_before: meta.levelBefore,
    level_after: meta.levelAfter,
    due_after: meta.dueAfter,
  })
  if (logError) console.error('srs_review_log:', logError)

  await maybeCreateSnapshot(user.id)
}

async function maybeCreateSnapshot(userId: string): Promise<void> {
  const { data: settings, error: readErr } = await supabase
    .from('user_settings')
    .select('reviews_since_snapshot')
    .eq('user_id', userId)
    .maybeSingle()
  if (readErr) { console.error('snapshot counter read:', readErr); return }

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
  if (snapErr) console.error('snapshot insert:', snapErr)

  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, reviews_since_snapshot: 0, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
}

export async function createManualSnapshot(vocab: VocabItem[], reason = 'manual'): Promise<void> {
  const user = await requireUser()
  const { error } = await supabase.from('srs_progress_snapshots').insert({
    user_id: user.id,
    snapshot: vocab,
    reason,
  })
  if (error) throw error
}

// ---------------------------------------------------------------------------
// Legacy srs_progress migration
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

export async function migrateLegacyProgressIfNeeded(): Promise<boolean> {
  const user = await requireUser()
  const count = await countUserVocab(user.id)
  if (count > 0) return false

  const legacy = await fetchLegacyProgress()
  if (!legacy) return false

  const vocab = legacy.vocab_db
  if (Array.isArray(vocab) && vocab.length > 0) {
    await upsertVocabItems(vocab)
    await createManualSnapshot(vocab, 'legacy_migration')
  }

  const hasSettings = legacy.gemini_api_key || legacy.context_texts?.length || legacy.language
  if (hasSettings) {
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      gemini_api_key: legacy.gemini_api_key ?? null,
      context_texts: legacy.context_texts ?? [],
      language: legacy.language ?? 'es',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
  }

  return true
}

/** Load vocab + settings; migrates from srs_progress when needed. */
export async function downloadAccountData(): Promise<{
  vocab: VocabItem[]
  gemini_api_key: string
  context_texts: ContextText[]
  language: string
} | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  await migrateLegacyProgressIfNeeded()

  const [vocab, settings] = await Promise.all([
    fetchUserVocab(),
    fetchUserSettings(),
  ])

  if (!settings) {
    const legacy = await fetchLegacyProgress()
    return {
      vocab,
      gemini_api_key: legacy?.gemini_api_key ?? '',
      context_texts: legacy?.context_texts ?? [],
      language: legacy?.language ?? 'es',
    }
  }

  return {
    vocab,
    gemini_api_key: settings.gemini_api_key,
    context_texts: settings.context_texts,
    language: settings.language,
  }
}

/** @deprecated Use downloadAccountData */
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

/** @deprecated Use upsertVocabItems */
export async function uploadProgress(vocabDb: VocabItem[]) {
  await upsertVocabItems(vocabDb)
  await createManualSnapshot(vocabDb, 'bulk_upload')
}

// ---------------------------------------------------------------------------
// Admin helpers
// ---------------------------------------------------------------------------

export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
  if (error || !data) return 'user'
  return data.role as 'admin' | 'user'
}

export async function setUserRole(userId: string, role: 'admin' | 'user') {
  const { error } = await supabase.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function fetchVocabCountsByUser(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from('user_vocab_progress').select('user_id')
  if (error) throw error
  const map: Record<string, number> = {}
  for (const row of data || []) {
    map[row.user_id] = (map[row.user_id] || 0) + 1
  }
  return map
}

export async function getVocabularyByKanjis(kanjis: string[]) {
  const { data, error } = await supabase.from('vocabulary').select('*').in('kanji', kanjis).eq('grade', 1)
  if (error) throw error
  return data
}

export async function getRandomKanjis(count: number, grade = 1) {
  const { data, error } = await supabase.from('vocabulary').select('kanji').eq('grade', grade)
  if (error) throw error
  const unique = Array.from(new Set((data || []).map((d: { kanji: string }) => d.kanji))) as string[]
  return unique.sort(() => Math.random() - 0.5).slice(0, count)
}
