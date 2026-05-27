import { supabase } from './supabase'

async function adminAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('No autenticado')
  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function parseAdminResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data as T
}

export interface AdminUserRow {
  user_id: string
  email: string
  role: 'admin' | 'contributor' | 'user'
  created_at: string
  wordCount: number
  last_sign_in?: string | null
}

export interface AdminSnapshotRow {
  id: number
  reason: string
  created_at: string
  word_count: number
}

export async function fetchAdminUsers(): Promise<AdminUserRow[]> {
  const res = await fetch('/api/admin/users', { headers: await adminAuthHeaders() })
  const data = await parseAdminResponse<{ users: AdminUserRow[] }>(res)
  return data.users
}

export async function createAdminUser(email: string, password: string, role: 'admin' | 'contributor' | 'user') {
  const res = await fetch('/api/admin/users', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ email, password, role }),
  })
  return parseAdminResponse<{ user_id: string; email: string }>(res)
}

export async function deleteAdminUser(userId: string) {
  const res = await fetch(`/api/admin/users/${userId}`, {
    method: 'DELETE',
    headers: await adminAuthHeaders(),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

export async function updateAdminUserRole(userId: string, role: 'admin' | 'contributor' | 'user') {
  const res = await fetch(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ role }),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

export async function fetchUserSnapshots(userId: string): Promise<AdminSnapshotRow[]> {
  const res = await fetch(`/api/admin/users/${userId}/snapshots`, {
    headers: await adminAuthHeaders(),
  })
  const data = await parseAdminResponse<{ snapshots: AdminSnapshotRow[] }>(res)
  return data.snapshots
}

export async function restoreUserSnapshot(userId: string, snapshotId: number) {
  const res = await fetch(`/api/admin/users/${userId}/restore`, {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ snapshotId }),
  })
  return parseAdminResponse<{ word_count: number }>(res)
}

// ---------------------------------------------------------------------------
// App config (SRS intervals etc.)
// ---------------------------------------------------------------------------

export async function fetchAdminConfig(): Promise<Record<string, unknown>> {
  const res = await fetch('/api/admin/config', { headers: await adminAuthHeaders() })
  const data = await parseAdminResponse<{ config: Record<string, unknown> }>(res)
  return data.config
}

export async function saveAdminSrsIntervals(intervals: number[]): Promise<void> {
  const res = await fetch('/api/admin/config', {
    method: 'PUT',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ srs_intervals: intervals }),
  })
  await parseAdminResponse<{ ok: boolean }>(res)
}

// ---------------------------------------------------------------------------
// Vocabulary image processing
// ---------------------------------------------------------------------------

export interface ImageStats {
  total: number
  with_image: number
  checked: number
  pending: number
}

export interface ImageBatchResult {
  processed: number
  new_images: number
  not_imageable: number
  no_source_image: number
  message?: string
}

export async function fetchImageStats(): Promise<ImageStats> {
  const res = await fetch('/api/admin/process-images', { headers: await adminAuthHeaders() })
  return parseAdminResponse<ImageStats>(res)
}

export async function processImageBatch(opts: {
  limit?: number
  geminiApiKey?: string
  pexelsApiKey?: string
}): Promise<ImageBatchResult> {
  const res = await fetch('/api/admin/process-images', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<ImageBatchResult>(res)
}

export async function resetCheckedNoImage(): Promise<{ reset: number }> {
  const res = await fetch('/api/admin/process-images/reset', {
    method: 'POST',
    headers: await adminAuthHeaders(),
  })
  return parseAdminResponse<{ reset: number }>(res)
}

// ---------------------------------------------------------------------------
// Image vote reports
// ---------------------------------------------------------------------------

export interface ImageReport {
  word: string
  image_url: string
  meaning_es: string
  image_search_term: string | null
  upvotes: number
  downvotes: number
}

export async function fetchImageReports(): Promise<ImageReport[]> {
  const res = await fetch('/api/admin/image-reports', { headers: await adminAuthHeaders() })
  const data = await parseAdminResponse<{ reports: ImageReport[] }>(res)
  return data.reports
}

export async function updateImageReport(opts: {
  word: string
  action: 'remove' | 'retry' | 'set_url'
  url?: string
  pexelsApiKey?: string
}): Promise<{ image_url: string }> {
  const res = await fetch('/api/admin/image-reports', {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<{ ok: boolean; image_url: string }>(res)
}

// ---------------------------------------------------------------------------
// Vocabulary global management
// ---------------------------------------------------------------------------

/**
 * Update editable fields of a shared vocabulary entry (reading, meanings, is_official).
 * Requires admin or contributor role. Change propagates to all users.
 *
 * When is_official is set to true the server recalculates sort_order so the word
 * appears right after the official curriculum for each of its kanjis.
 */
export async function updateVocabWord(
  word: string,
  patch: {
    reading?: string
    meaning_es?: string
    meaning_ca?: string | null
    meaning_en?: string | null
    is_official?: boolean
  },
): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/vocab/${encodeURIComponent(word)}`, {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(patch),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

export interface AddVocabResult {
  ok: boolean
  kanjis: Array<{ kanji: string; grade: number }>
  count: number
}

/**
 * Add a new unofficial vocabulary word to the shared vocabulary table.
 * The server auto-detects which kanjis (that already exist in the DB) the word
 * contains and inserts one row per matching kanji.
 * Requires admin or contributor role.
 */
export async function addVocabWord(entry: {
  word: string
  reading: string
  meaning_es: string
  meaning_ca?: string
  meaning_en?: string
}): Promise<AddVocabResult> {
  const res = await fetch('/api/admin/vocab', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(entry),
  })
  return parseAdminResponse<AddVocabResult>(res)
}

/**
 * Delete a word from the shared vocabulary table for everyone.
 * Admin only — server validates AAL2 + admin role.
 */
export async function deleteVocabWord(word: string): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/vocab/${encodeURIComponent(word)}`, {
    method: 'DELETE',
    headers: await adminAuthHeaders(),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

/**
 * Delete ALL words of a given grade (1-6) from vocabulary.
 */
export async function deleteVocabByGrade(grade: number): Promise<{ ok: boolean; deleted: number }> {
  const res = await fetch(`/api/admin/vocab?grade=${grade}`, {
    method: 'DELETE',
    headers: await adminAuthHeaders(),
  })
  return parseAdminResponse<{ ok: boolean; deleted: number }>(res)
}

export interface VocabImportRow {
  word: string
  kanji: string
  reading: string
  meaning_es: string
  grade: number
  meaning_ca?: string
  meaning_en?: string
  sort_order?: number
  category?: string
  word_type?: string
}

export interface VocabImportResult {
  ok: boolean
  inserted: number
  skipped: number
  skipped_in_file?: number   // duplicates within the CSV itself
  skipped_in_db?: number     // words that already existed in the DB
  total: number
  errors?: string[]
}

/**
 * Bulk import vocabulary rows. Returns counts of inserted/skipped.
 */
export async function importVocabBatch(
  rows: VocabImportRow[],
  is_official = true,
): Promise<VocabImportResult> {
  const res = await fetch('/api/admin/vocab/import', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ rows, is_official }),
  })
  return parseAdminResponse<VocabImportResult>(res)
}

// ---------------------------------------------------------------------------
// Vocabulary category/word_type classification
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Unified full classification (word_type + category + image + antonyms)
// ---------------------------------------------------------------------------

export interface FullClassifyStats {
  total:          number
  with_type:      number
  with_category:  number
  with_image:     number
  antonym_pairs:  number
  pending:        number
}

export interface FullClassifyResult {
  processed:           number
  updated_vocab:       number
  new_images:          number
  not_imageable:       number
  no_source_image:     number
  antonym_pairs_added: number
  message?:            string
}

export async function fetchFullClassifyStats(): Promise<FullClassifyStats> {
  const res = await fetch('/api/admin/classify-vocab-full', { headers: await adminAuthHeaders() })
  return parseAdminResponse<FullClassifyStats>(res)
}

export async function runFullClassifyBatch(opts: {
  limit?:        number
  geminiApiKey?: string
  pexelsApiKey?: string
}): Promise<FullClassifyResult> {
  const res = await fetch('/api/admin/classify-vocab-full', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<FullClassifyResult>(res)
}

// ---------------------------------------------------------------------------
// Antonym pairs management
// ---------------------------------------------------------------------------

/**
 * Add an antonym pair. Requires admin or contributor role.
 */
export async function addAntonymPair(wordA: string, wordB: string): Promise<{ ok: boolean }> {
  const res = await fetch('/api/admin/vocab/antonyms', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ word_a: wordA, word_b: wordB }),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

/**
 * Delete an antonym pair by ID. Requires admin or contributor role.
 */
export async function deleteAntonymPair(id: number): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/vocab/antonyms/${id}`, {
    method: 'DELETE',
    headers: await adminAuthHeaders(),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

export interface ClassifyStats {
  total: number
  with_type: number
  with_category: number
  pending: number
}

export interface ClassifyBatchResult {
  processed: number
  updated: number
  message?: string
}

export async function fetchClassifyStats(): Promise<ClassifyStats> {
  const res = await fetch('/api/admin/classify-vocab', { headers: await adminAuthHeaders() })
  return parseAdminResponse<ClassifyStats>(res)
}

export async function classifyVocabBatch(opts: {
  limit?: number
  geminiApiKey?: string
}): Promise<ClassifyBatchResult> {
  const res = await fetch('/api/admin/classify-vocab', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<ClassifyBatchResult>(res)
}
