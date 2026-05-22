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
