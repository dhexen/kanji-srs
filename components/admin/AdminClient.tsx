'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import {
  fetchAdminUsers,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserRole,
  fetchUserSnapshots,
  restoreUserSnapshot,
  type AdminUserRow,
  type AdminSnapshotRow,
} from '@/lib/admin-client'

export default function AdminClient() {
  const { state } = useStore()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' as 'admin' | 'user' })
  const [restoreUserId, setRestoreUserId] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<AdminSnapshotRow[]>([])
  const [snapshotsLoading, setSnapshotsLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<number | null>(null)

  const isAdmin = state.role === 'admin'

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    try {
      setUsers(await fetchAdminUsers())
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error cargando usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    if (!newUser.email || !newUser.password) {
      showToast('Email y contraseña obligatorios', 'error')
      return
    }
    setCreating(true)
    try {
      await createAdminUser(newUser.email, newUser.password, newUser.role)
      showToast('Usuario creado', 'success')
      setNewUser({ email: '', password: '', role: 'user' })
      await loadUsers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error creando usuario', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function toggleRole(user: AdminUserRow) {
    const newRole = user.role === 'admin' ? 'user' : 'admin'
    try {
      await updateAdminUserRole(user.user_id, newRole)
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u))
      showToast(`Rol: ${newRole}`, 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    }
  }

  async function handleDelete(user: AdminUserRow) {
    if (!confirm(`¿Eliminar la cuenta ${user.email}? Se borrará todo su progreso.`)) return
    try {
      await deleteAdminUser(user.user_id)
      showToast('Usuario eliminado', 'success')
      if (restoreUserId === user.user_id) setRestoreUserId(null)
      await loadUsers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error eliminando', 'error')
    }
  }

  async function openRestore(userId: string) {
    setRestoreUserId(userId)
    setSnapshots([])
    setSnapshotsLoading(true)
    try {
      setSnapshots(await fetchUserSnapshots(userId))
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error cargando backups', 'error')
      setRestoreUserId(null)
    } finally {
      setSnapshotsLoading(false)
    }
  }

  async function handleRestore(userId: string, snapshotId: number, label: string) {
    if (!confirm(`¿Restaurar el progreso a este backup?\n\n${label}\n\nSe reemplazará todo el vocabulario actual del usuario.`)) return
    setRestoringId(snapshotId)
    try {
      const { word_count } = await restoreUserSnapshot(userId, snapshotId)
      showToast(`Restaurado: ${word_count} palabras`, 'success')
      setRestoreUserId(null)
      await loadUsers()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Error restaurando', 'error')
    } finally {
      setRestoringId(null)
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  if (!isAdmin) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-5xl mb-3">🚫</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Acceso restringido</h2>
        <p className="text-slate-500 text-sm">Solo los administradores pueden acceder a este panel.</p>
      </div>
    )
  }

  const restoreTarget = users.find(u => u.user_id === restoreUserId)

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold mb-1">🔧 Administración</h2>
        <p className="text-amber-100 text-sm">Usuarios, roles y restauración de backups SRS.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-amber-600">{users.length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Usuarios</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-indigo-600">{users.filter(u => u.role === 'admin').length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Admins</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center col-span-2 md:col-span-1">
          <div className="text-3xl font-bold text-emerald-600">
            {users.reduce((s, u) => s + u.wordCount, 0)}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Palabras totales</div>
        </div>
      </div>

      {/* Crear usuario */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <h3 className="font-bold text-slate-800 mb-4">➕ Crear usuario</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            autoComplete="off"
          />
          <input
            type="password"
            placeholder="Contraseña (mín. 6)"
            value={newUser.password}
            onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            autoComplete="new-password"
          />
          <select
            value={newUser.role}
            onChange={e => setNewUser(u => ({ ...u, role: e.target.value as 'admin' | 'user' }))}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white"
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
          <button
            type="button"
            disabled={creating}
            onClick={handleCreate}
            className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
          >
            {creating ? 'Creando…' : 'Crear cuenta'}
          </button>
        </div>
      </div>

      {/* Tabla usuarios */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Usuarios</h3>
          <button type="button" onClick={loadUsers} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
            🔄 Actualizar
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay usuarios.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[720px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Palabras</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4">Registro</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map(user => {
                  const isMe = user.user_id === state.user?.id
                  return (
                    <tr key={user.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">{user.email || '—'}</span>
                        {isMe && <span className="ml-2 text-indigo-500 text-xs font-bold">(tú)</span>}
                        <p className="font-mono text-[10px] text-slate-400 mt-0.5">{user.user_id.slice(0, 8)}…</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{user.wordCount}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          user.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">
                        {user.created_at ? formatDate(user.created_at) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => toggleRole(user)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            >
                              {user.role === 'admin' ? '↓ Usuario' : '↑ Admin'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openRestore(user.user_id)}
                            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700"
                          >
                            💾 Backup
                          </button>
                          {!isMe && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal restaurar backup */}
      {restoreUserId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Restaurar backup</h3>
                <p className="text-sm text-slate-500 mt-1">{restoreTarget?.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 10 snapshots automáticos</p>
              </div>
              <button
                type="button"
                onClick={() => setRestoreUserId(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {snapshotsLoading ? (
                <p className="text-slate-400 text-sm text-center py-6">Cargando backups…</p>
              ) : snapshots.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-6 bg-slate-50 rounded-xl">
                  Este usuario no tiene backups guardados aún.
                </p>
              ) : (
                snapshots.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50/80"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{formatDate(s.created_at)}</p>
                      <p className="text-xs text-slate-500">
                        {s.word_count} palabras · {s.reason}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={restoringId !== null}
                      onClick={() => handleRestore(restoreUserId, s.id, formatDate(s.created_at))}
                      className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                    >
                      {restoringId === s.id ? '…' : 'Restaurar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-400 text-center px-4">
        Crear/eliminar usuarios requiere{' '}
        <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en el servidor (Vercel / .env.local).
      </p>
    </div>
  )
}
