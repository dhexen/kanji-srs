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
  role: 'admin' | 'user'
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

export async function createAdminUser(email: string, password: string, role: 'admin' | 'user') {
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

export async function updateAdminUserRole(userId: string, role: 'admin' | 'user') {
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
// Vocabulary category/word_type classification
// ---------------------------------------------------------------------------

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
