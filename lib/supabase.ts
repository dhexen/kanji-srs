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
export const supabase = createClient(url, key)

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
  return (data || []).map(rowToVocabItem)
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
  context_texts: ContextText[]
  language: string
} | null> {
  const user = await requireUser()
  const { data, error } = await supabase
    .from('user_settings')
    .select('gemini_api_key, context_texts, language')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    if (isSchemaUnavailable(error)) {
      const legacy = await fetchLegacyProgress()
      if (!legacy) return null
      return {
        gemini_api_key: legacy.gemini_api_key ?? '',
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
  context_texts: ContextText[]
  language: string
} | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
export async function getUserRole(userId: string): Promise<'admin' | 'user'> {
  // 1. Try RPC (bypasses RLS — most reliable)
  try {
    const { data, error } = await supabase.rpc('get_my_role')
    if (!error && typeof data === 'string') {
      console.log('[getUserRole] RPC hit:', userId, '→', data)
      return data as 'admin' | 'user'
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
      return data.role as 'admin' | 'user'
    }
    if (error) console.warn('[getUserRole] DB error:', error.code, error.message)
    else console.warn('[getUserRole] No row in user_roles for', userId)
  } catch (e) {
    console.warn('[getUserRole] DB exception:', e)
  }

  return 'user'
}

export async function setUserRole(userId: string, role: 'admin' | 'user') {
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

export async function getVocabularyByKanjis(kanjis: string[], grade = 1) {
  const { data, error } = await supabase
    .from('vocabulary')
    .select('*')
    .in('kanji', kanjis)
    .eq('grade', grade)
    .order('sort_order', { ascending: true })
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
