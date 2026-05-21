'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { supabase, setUserRole } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'

interface UserRow {
  user_id: string
  role: 'admin' | 'user'
  created_at: string
  email?: string
}

export default function AdminClient() {
  const { state } = useStore()
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)

  const isAdmin = state.role === 'admin'

  useEffect(() => {
    if (isAdmin) loadUsers()
  }, [isAdmin])

  async function loadUsers() {
    setLoading(true)
    try {
      // Get all user roles
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Get progress count per user
      const { data: progress } = await supabase
        .from('srs_progress')
        .select('user_id, vocab_db')

      const progressMap: Record<string, number> = {}
      progress?.forEach((p: any) => {
        progressMap[p.user_id] = Array.isArray(p.vocab_db) ? p.vocab_db.length : 0
      })

      setUsers((roles || []).map((r: any) => ({
        ...r,
        wordCount: progressMap[r.user_id] || 0,
      })))
    } catch (e) {
      showToast('Error cargando usuarios', 'error')
    } finally {
      setLoading(false)
    }
  }

  async function toggleRole(userId: string, currentRole: 'admin' | 'user') {
    const newRole = currentRole === 'admin' ? 'user' : 'admin'
    try {
      await setUserRole(userId, newRole)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u))
      showToast(`Rol cambiado a ${newRole}`, 'success')
    } catch (e) {
      showToast('Error cambiando rol', 'error')
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold mb-1">🔧 Panel de Administración</h2>
        <p className="text-amber-100 text-sm">Gestiona usuarios, roles y vocabulario del sistema.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-amber-600">{users.length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Usuarios registrados</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-indigo-600">{users.filter(u => u.role === 'admin').length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Administradores</div>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
          <div className="text-3xl font-bold text-emerald-600">{users.filter(u => u.role === 'user').length}</div>
          <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Usuarios normales</div>
        </div>
      </div>

      {/* Users table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Usuarios registrados</h3>
          <button onClick={loadUsers} className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold">
            🔄 Actualizar
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Cargando usuarios...</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400">No hay usuarios registrados aún.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">User ID</th>
                  <th className="py-3 px-4">Palabras</th>
                  <th className="py-3 px-4">Registrado</th>
                  <th className="py-3 px-4">Rol</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((user: any) => {
                  const isMe = user.user_id === state.user?.id
                  return (
                    <tr key={user.user_id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-xs text-slate-500">
                        {user.user_id.substring(0, 8)}...
                        {isMe && <span className="ml-2 text-indigo-500 font-bold font-sans">(tú)</span>}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">
                        {(user as any).wordCount ?? 0}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-xs">
                        {new Date(user.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                          user.role === 'admin'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' ? '👑 Admin' : '👤 Usuario'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!isMe && (
                          <button
                            onClick={() => toggleRole(user.user_id, user.role)}
                            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition ${
                              user.role === 'admin'
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                                : 'bg-amber-100 hover:bg-amber-200 text-amber-700'
                            }`}>
                            {user.role === 'admin' ? '↓ Quitar admin' : '↑ Hacer admin'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vocabulary stats */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-3">📚 Vocabulario en la base de datos</h3>
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <div className="text-4xl font-bold text-indigo-600">240</div>
          <div>
            <p className="font-semibold text-slate-700">Palabras de 1º Primaria</p>
            <p className="text-sm text-slate-400">80 kanjis × 3 palabras cada uno</p>
          </div>
        </div>
      </div>
    </div>
  )
}
