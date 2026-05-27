import { createClient, SupabaseClient } from '@supabase/supabase-js'
import type { VocabItem } from './srs'
import { vocabItemToRow, UPSERT_CHUNK_SIZE } from './progress'

export class AdminApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new AdminApiError('Falta SUPABASE_SERVICE_ROLE_KEY en el servidor', 500)
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function requireAdmin(request: Request): Promise<{
  adminId: string
  service: SupabaseClient
}> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AdminApiError('No autenticado', 401)
  }
  const token = authHeader.slice(7)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error } = await userClient.auth.getUser(token)
  if (error || !user) throw new AdminApiError('Sesión inválida', 401)

    const service = createServiceClient()
  const { data: roleRow } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const isDbAdmin = roleRow?.role === 'admin'

  // Fallback: check env-based admin list (server-only env var — never exposed to client bundle)
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  const isEnvAdmin = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()))

  if (!isDbAdmin && !isEnvAdmin) {
    throw new AdminApiError('Se requiere rol de administrador', 403)
  }

  // Verificar AAL2 — el JWT debe contener aal: 'aal2' (sesión con 2FA completado)
  try {
    const jwtPayload = JSON.parse(
      Buffer.from(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
    )
    if (jwtPayload.aal !== 'aal2') {
      throw new AdminApiError('Se requiere verificación de dos factores (2FA) para acceder al panel de administración.', 403)
    }
  } catch (e) {
    if (e instanceof AdminApiError) throw e
    throw new AdminApiError('Token inválido', 401)
  }

    // Bootstrap DB row if matched via env but missing in DB
  if (isEnvAdmin && !isDbAdmin) {
    try {
      await service.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id' })
    } catch { /* best-effort */ }
  }

  return { adminId: user.id, service }
}

/**
 * Lighter auth check for content editors (admin + contributor).
 * Does NOT require AAL2 (2FA) — suitable for vocabulary/sentence editing.
 */
export async function requireEditorRole(request: Request): Promise<{
  userId: string
  role: 'admin' | 'contributor'
  service: SupabaseClient
}> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AdminApiError('No autenticado', 401)
  }
  const token = authHeader.slice(7)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const userClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error } = await userClient.auth.getUser(token)
  if (error || !user) throw new AdminApiError('Sesión inválida', 401)

  const service = createServiceClient()
  const { data: roleRow } = await service
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .maybeSingle()

  const dbRole = roleRow?.role

  // Fallback: env-based admin list
  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)
  const isEnvAdmin = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()))

  if (dbRole !== 'admin' && dbRole !== 'contributor' && !isEnvAdmin) {
    throw new AdminApiError('Se requiere rol de editor (admin o contributor)', 403)
  }

  const effectiveRole: 'admin' | 'contributor' =
    dbRole === 'contributor' ? 'contributor' : 'admin'

  return { userId: user.id, role: effectiveRole, service }
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export async function listAdminUsers(service: SupabaseClient) {
  const { data: listData, error: listError } = await service.auth.admin.listUsers({ perPage: 1000 })
  if (listError) throw new AdminApiError(listError.message, 500)

  const { data: roles, error: rolesError } = await service.from('user_roles').select('user_id, role, created_at')
  if (rolesError) throw new AdminApiError(rolesError.message, 500)

  const roleMap = new Map((roles || []).map(r => [r.user_id, r]))

  // Count words from the normalized table (new schema)
  const wordCounts: Record<string, number> = {}
  const { data: vocabRows } = await service.from('user_vocab_progress').select('user_id')
  for (const row of vocabRows || []) {
    wordCounts[row.user_id] = (wordCounts[row.user_id] || 0) + 1
  }

  // Fallback: for users still in legacy mode, count from srs_progress.vocab_db JSON
  const { data: legacyRows } = await service.from('srs_progress').select('user_id, vocab_db')
  for (const row of legacyRows || []) {
    if (!wordCounts[row.user_id] && Array.isArray(row.vocab_db)) {
      wordCounts[row.user_id] = row.vocab_db.length
    }
  }

  // Best-effort: total login count per user via the public.get_user_login_counts() RPC.
  // Requires running supabase-login-stats-migration.sql in the Supabase SQL Editor first.
  const loginCounts: Record<string, number> = {}
  try {
    const { data: rpcRows } = await service.rpc('get_user_login_counts')
    for (const row of (rpcRows as Array<{ user_id: string; login_count: number }> | null) ?? []) {
      if (row.user_id) loginCounts[row.user_id] = Number(row.login_count)
    }
  } catch {
    // Function not yet created — login_count will be null for all users.
  }

  return (listData.users || []).map(u => {
    const roleRow = roleMap.get(u.id)
    return {
      user_id: u.id,
      email: u.email ?? '',
      role: (roleRow?.role as 'admin' | 'contributor' | 'user') ?? 'user',
      created_at: roleRow?.created_at ?? u.created_at,
      wordCount: wordCounts[u.id] ?? 0,
      last_sign_in: u.last_sign_in_at ?? null,
      login_count: loginCounts[u.id] ?? null,
    }
  }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export async function createAdminUser(
  service: SupabaseClient,
  email: string,
  password: string,
  role: 'admin' | 'contributor' | 'user',
) {
  const { data, error } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new AdminApiError(error.message, 400)
  if (!data.user) throw new AdminApiError('No se creó el usuario', 500)

  const { error: roleError } = await service.from('user_roles').upsert({
    user_id: data.user.id,
    role,
  }, { onConflict: 'user_id' })
  if (roleError) throw new AdminApiError(roleError.message, 500)

  return { user_id: data.user.id, email: data.user.email }
}

export async function deleteAdminUser(service: SupabaseClient, userId: string) {
  const { error } = await service.auth.admin.deleteUser(userId)
  if (error) throw new AdminApiError(error.message, 400)
}

export async function setAdminUserRole(service: SupabaseClient, userId: string, role: 'admin' | 'contributor' | 'user') {
  const { error } = await service.from('user_roles').upsert({ user_id: userId, role }, { onConflict: 'user_id' })
  if (error) throw new AdminApiError(error.message, 500)
}

export async function listUserSnapshots(service: SupabaseClient, userId: string) {
  const { data, error } = await service
    .from('srs_progress_snapshots')
    .select('id, reason, created_at, snapshot')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) throw new AdminApiError(error.message, 500)

  return (data || []).map(s => ({
    id: s.id,
    reason: s.reason,
    created_at: s.created_at,
    word_count: Array.isArray(s.snapshot) ? s.snapshot.length : 0,
  }))
}

export async function restoreUserSnapshot(
  service: SupabaseClient,
  userId: string,
  snapshotId: number,
) {
  const { data: snap, error: snapError } = await service
    .from('srs_progress_snapshots')
    .select('snapshot')
    .eq('id', snapshotId)
    .eq('user_id', userId)
    .maybeSingle()

  if (snapError) throw new AdminApiError(snapError.message, 500)
  if (!snap?.snapshot || !Array.isArray(snap.snapshot)) {
    throw new AdminApiError('Backup no encontrado', 404)
  }

  const vocab = snap.snapshot as VocabItem[]

  const { error: delError } = await service.from('user_vocab_progress').delete().eq('user_id', userId)
  if (delError) throw new AdminApiError(delError.message, 500)

  const rows = vocab.map(item => vocabItemToRow(userId, item))
  for (const part of chunk(rows, UPSERT_CHUNK_SIZE)) {
    const { error: upError } = await service
      .from('user_vocab_progress')
      .upsert(part, { onConflict: 'user_id,jp' })
    if (upError) throw new AdminApiError(upError.message, 500)
  }

  const { data: legacy } = await service
    .from('srs_progress')
    .select('gemini_api_key, context_texts, language')
    .eq('user_id', userId)
    .maybeSingle()

  await service.from('srs_progress').upsert({
    user_id: userId,
    vocab_db: vocab,
    gemini_api_key: legacy?.gemini_api_key ?? null,
    context_texts: legacy?.context_texts ?? [],
    language: legacy?.language ?? 'es',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })

  await service.from('srs_progress_snapshots').insert({
    user_id: userId,
    snapshot: vocab,
    reason: 'admin_restore',
  })

  return { word_count: vocab.length }
}

export function adminJsonError(e: unknown) {
  if (e instanceof AdminApiError) {
    return Response.json({ error: e.message }, { status: e.status })
  }
  console.error('admin api:', e)
  return Response.json({ error: 'Error interno del servidor' }, { status: 500 })
}
