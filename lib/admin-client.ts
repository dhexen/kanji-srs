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
  last_seen_at?: string | null
  login_count?: number | null
}

export interface AdminSnapshotRow {
  id: number
  reason: string
  created_at: string
  word_count: number
}

export async function fetchAdminUsers(filters: { q?: string; role?: string } = {}): Promise<AdminUserRow[]> {
  const params = new URLSearchParams()
  if (filters.q)    params.set('q',    filters.q)
  if (filters.role) params.set('role', filters.role)
  const qs = params.toString()
  const res = await fetch(`/api/admin/users${qs ? `?${qs}` : ''}`, { headers: await adminAuthHeaders() })
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
  action: 'remove' | 'retry' | 'set_url' | 'preview'
  url?: string
  candidateUrl?: string
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

export interface FillFullWordResult {
  updated: number
  with_kanji: number
  fetched: number
  done: boolean
  next_offset: number
}

/** Save (or clear with null) the full real spelling for a word. Editor role. */
export async function saveVocabFullWord(word: string, fullWord: string | null): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/vocab/${encodeURIComponent(word)}`, {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ full_word: fullWord }),
  })
  return parseAdminResponse<{ ok: boolean }>(res)
}

/** Fill the full real spelling (full_word) for a page of vocabulary via Gemini. */
export async function runFillFullWord(opts: { offset?: number; model?: string; geminiApiKey?: string }): Promise<FillFullWordResult> {
  const res = await fetch('/api/admin/vocab/fill-full-word', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<FillFullWordResult>(res)
}

export interface EnrichJlptResult {
  updated: number
  fetched: number
  done: boolean
  next_offset: number
  total: number
}

/** Enrich a page of JLPT grammar points (explanation + examples) via Gemini. */
export async function runEnrichJlpt(opts: { offset?: number; force?: boolean; model?: string; geminiApiKey?: string }): Promise<EnrichJlptResult> {
  const res = await fetch('/api/admin/jlpt/enrich', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<EnrichJlptResult>(res)
}

export interface GenerateSchemesResult {
  updated: number
  fetched: number
  done: boolean
  next_offset: number
  total: number
}

/** Generate conjugation/usage schemes for a page of grammar points (MNN + JLPT). */
export async function runGenerateSchemes(opts: { offset?: number; force?: boolean; model?: string; geminiApiKey?: string }): Promise<GenerateSchemesResult> {
  const res = await fetch('/api/admin/grammar/scheme', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<GenerateSchemesResult>(res)
}

/** Save (or clear with null) the curated per-kanji furigana for a word. */
export async function saveVocabReadingSegments(
  word: string,
  segments: { t: string; f?: string }[] | null,
): Promise<{ ok: boolean }> {
  const res = await fetch(`/api/admin/vocab/${encodeURIComponent(word)}`, {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ reading_segments: segments }),
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
  antonym_todo:   number
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
  model?:        string
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

export interface AutoDetectAntonymsResult {
  candidates_checked: number
  pairs_added: number
  message: string
  fetched?: number
  done?: boolean
  next_offset?: number
  proposed_count?: number
  matched_count?: number
  existing_pairs?: number
  already_existing?: number
  insert_errors?: number
  insert_error?: string | null
  sample?: Array<{ word: string; antonym: string; exists: boolean }>
}

/**
 * Auto-detect antonym pairs from already-classified vocabulary using Gemini.
 * Scans adjectives and verbs in the DB and finds pairs where both words exist.
 */
export async function runAutoDetectAntonyms(opts: {
  wordTypes?:    string[]
  limit?:        number
  offset?:       number
  geminiApiKey?: string
  model?:        string
}): Promise<AutoDetectAntonymsResult> {
  const res = await fetch('/api/admin/vocab/antonyms/auto-detect', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<AutoDetectAntonymsResult>(res)
}

export interface FillAdjectivesResult {
  kanji_checked: number
  added:         number
  dry_run:       boolean
  details:       string[]
  message:       string
}

export async function resetAllVocabulary(): Promise<{ ok: boolean; message: string }> {
  const res = await fetch('/api/admin/vocab/reset-all', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ confirm: 'RESET_ALL_VOCABULARY' }),
  })
  return parseAdminResponse<{ ok: boolean; message: string }>(res)
}

export async function runFillAdjectives(opts: {
  grade?:        number
  dry_run?:      boolean
  debug?:        boolean
  geminiApiKey?: string
}): Promise<FillAdjectivesResult> {
  const res = await fetch('/api/admin/vocab/fill-adjectives', {
    method: 'POST',
    headers: await adminAuthHeaders(),
    body: JSON.stringify(opts),
  })
  return parseAdminResponse<FillAdjectivesResult>(res)
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

export interface VocabReport {
  id: string
  word: string
  user_id: string
  user_email: string
  field: 'reading' | 'meaning' | 'kanji' | 'general'
  description: string | null
  status: 'open' | 'resolved'
  created_at: string
}

export async function fetchVocabReports(): Promise<VocabReport[]> {
  const res = await fetch('/api/admin/vocab-reports', { headers: await adminAuthHeaders() })
  return parseAdminResponse<VocabReport[]>(res)
}

export async function updateVocabReportStatus(id: string, status: 'open' | 'resolved'): Promise<void> {
  const res = await fetch('/api/admin/vocab-reports', {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ id, status }),
  })
  await parseAdminResponse<{ ok: boolean }>(res)
}

export interface FeedbackReport {
  id: string
  user_id: string
  user_email: string
  type: 'bug' | 'mejora'
  section: string
  description: string
  status: 'open' | 'resolved'
  admin_response?: string | null
  created_at: string
}

export async function fetchFeedbackReports(): Promise<FeedbackReport[]> {
  const headers = await adminAuthHeaders()
  const res = await fetch('/api/admin/feedback', { headers })
  return parseAdminResponse<FeedbackReport[]>(res)
}

export interface PendingReportsCount {
  feedback: number
  vocab: number
  grammar: number
  total: number
}

/** Lightweight count of open reports (feedback + vocab) for the admin badge. */
export async function fetchPendingReportsCount(): Promise<PendingReportsCount> {
  const res = await fetch('/api/admin/pending-count', { headers: await adminAuthHeaders() })
  return parseAdminResponse<PendingReportsCount>(res)
}

export async function updateFeedbackStatus(id: string, status: 'open' | 'resolved', adminResponse?: string): Promise<void> {
  const headers = await adminAuthHeaders()
  const res = await fetch('/api/admin/feedback', {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ id, status, admin_response: adminResponse }),
  })
  await parseAdminResponse<{ ok: boolean }>(res)
}

export interface GrammarReport {
  id: string
  grammar_id: string
  grammar_pattern: string
  sentence: string
  user_id: string | null
  user_email: string
  description: string | null
  status: 'open' | 'resolved'
  resolved_at: string | null
  created_at: string
}

export async function fetchGrammarReports(): Promise<GrammarReport[]> {
  const res = await fetch('/api/admin/grammar-reports', { headers: await adminAuthHeaders() })
  return parseAdminResponse<GrammarReport[]>(res)
}

export async function updateGrammarReportStatus(id: string, status: 'open' | 'resolved'): Promise<void> {
  const res = await fetch('/api/admin/grammar-reports', {
    method: 'PATCH',
    headers: await adminAuthHeaders(),
    body: JSON.stringify({ id, status }),
  })
  await parseAdminResponse<{ ok: boolean }>(res)
}
