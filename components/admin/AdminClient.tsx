'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import AdminMfaGate from '@/components/ui/AdminMfaGate'
import { getCurrentAal } from '@/lib/supabase'
import {
  fetchAdminUsers,
  createAdminUser,
  deleteAdminUser,
  updateAdminUserRole,
  fetchUserSnapshots,
  restoreUserSnapshot,
  fetchAdminConfig,
  saveAdminSrsIntervals,
  fetchImageStats,
  processImageBatch,
  resetCheckedNoImage,
  type AdminUserRow,
  type AdminSnapshotRow,
  type ImageStats,
  type ImageBatchResult,
} from '@/lib/admin-client'
import { STAGE_NAMES, DEFAULT_SRS_INTERVALS, getSrsIntervals, setSrsIntervals } from '@/lib/srs'

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

  // Image processing
  const [imgStats, setImgStats] = useState<ImageStats | null>(null)
  const [imgProcessing, setImgProcessing] = useState(false)
  const [imgResetting, setImgResetting] = useState(false)
  const [imgLastResult, setImgLastResult] = useState<ImageBatchResult | null>(null)
  const [imgGeminiKey, setImgGeminiKey] = useState('')
  const [imgPexelsKey, setImgPexelsKey] = useState('')

  // SRS intervals editor
  const [srsIntervals, setSrsIntervalsLocal] = useState<number[]>([...getSrsIntervals()])
  const [srsIntervalsLoading, setSrsIntervalsLoading] = useState(true)
  const [srsIntervalsSaving, setSrsIntervalsSaving] = useState(false)
  const [srsIntervalsChanged, setSrsIntervalsChanged] = useState(false)

  const isAdmin = state.role === 'admin'
  const [aal, setAal] = useState<'aal1' | 'aal2' | 'checking'>('checking')

  useEffect(() => {
    if (!isAdmin) { setAal('aal1'); return }
    getCurrentAal().then(setAal)
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin && aal === 'aal2') {
      loadUsers()
      loadSrsIntervals()
      fetchImageStats().then(setImgStats).catch(() => {})
    }
  }, [isAdmin, aal])

  async function loadSrsIntervals() {
    setSrsIntervalsLoading(true)
    try {
      const config = await fetchAdminConfig()
      const intervals = config?.srs_intervals as number[] | undefined
      if (Array.isArray(intervals) && intervals.length === 8) {
        setSrsIntervalsLocal(intervals)
        setSrsIntervals(intervals)
      } else {
        setSrsIntervalsLocal([...DEFAULT_SRS_INTERVALS])
      }
      setSrsIntervalsChanged(false)
    } catch (e) {
      // If table doesn't exist yet, use defaults
      setSrsIntervalsLocal([...DEFAULT_SRS_INTERVALS])
    } finally {
      setSrsIntervalsLoading(false)
    }
  }

  function msToHumanInput(ms: number): { value: number; unit: 'minutes' | 'hours' | 'days' } {
    if (ms === 0) return { value: 0, unit: 'hours' }
    const days = ms / (24 * 60 * 60 * 1000)
    if (days >= 1 && Number.isInteger(days)) return { value: days, unit: 'days' }
    const hours = ms / (60 * 60 * 1000)
    if (hours >= 1) return { value: Math.round(hours * 10) / 10, unit: 'hours' }
    return { value: Math.round(ms / 60000), unit: 'minutes' }
  }

  function humanInputToMs(value: number, unit: 'minutes' | 'hours' | 'days'): number {
    if (unit === 'minutes') return value * 60 * 1000
    if (unit === 'hours') return value * 60 * 60 * 1000
    return value * 24 * 60 * 60 * 1000
  }

  function formatMsHuman(ms: number): string {
    if (ms === 0) return '—'
    const hours = ms / 3600000
    if (hours < 1) return `${Math.round(ms / 60000)}min`
    if (hours < 24) return `${Math.round(hours * 10) / 10}h`
    const days = Math.round(hours / 24)
    return `${days}d`
  }

  function handleIntervalChange(index: number, ms: number) {
    const next = [...srsIntervals]
    next[index] = Math.max(0, ms)
    setSrsIntervalsLocal(next)
    setSrsIntervalsChanged(true)
  }

  async function handleSaveSrsIntervals() {
    // Validate non-decreasing
    for (let i = 1; i < srsIntervals.length; i++) {
      if (srsIntervals[i] < srsIntervals[i - 1]) {
        showToast(`El intervalo del nivel ${i} no puede ser menor que el del nivel ${i - 1}`, 'error')
        return
      }
    }
    if (srsIntervals[0] !== 0) {
      showToast('El nivel 0 debe tener intervalo 0', 'error')
      return
    }

    setSrsIntervalsSaving(true)
    try {
      await saveAdminSrsIntervals(srsIntervals)
      setSrsIntervals(srsIntervals) // Update runtime
      setSrsIntervalsChanged(false)
      showToast('Intervalos SRS guardados', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error guardando intervalos', 'error')
    } finally {
      setSrsIntervalsSaving(false)
    }
  }

  function handleResetSrsIntervals() {
    setSrsIntervalsLocal([...DEFAULT_SRS_INTERVALS])
    setSrsIntervalsChanged(true)
  }

  async function handleProcessImages() {
    setImgProcessing(true)
    setImgLastResult(null)
    try {
      const result = await processImageBatch({
        limit: 40,
        geminiApiKey: imgGeminiKey || undefined,
        pexelsApiKey: imgPexelsKey || undefined,
      })
      setImgLastResult(result)
      const stats = await fetchImageStats()
      setImgStats(stats)
      showToast(
        result.processed === 0
          ? 'No quedan palabras pendientes'
          : `Procesadas ${result.processed} palabras · ${result.new_images} nuevas imágenes`,
        'success',
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error procesando imágenes', 'error')
    } finally {
      setImgProcessing(false)
    }
  }

  async function handleResetNoImage() {
    setImgResetting(true)
    try {
      const { reset } = await resetCheckedNoImage()
      const stats = await fetchImageStats()
      setImgStats(stats)
      showToast(`${reset} palabras vueltas a pendiente`, 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al resetear', 'error')
    } finally {
      setImgResetting(false)
    }
  }

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

  if (aal === 'checking') {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  if (aal === 'aal1') {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">Panel de Administración</h2>
        <AdminMfaGate onVerified={() => setAal('aal2')} />
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

      {/* Vocabulary images */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Imágenes de vocabulario</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Gemini clasifica qué palabras son "imaginables" y Wikipedia aporta la imagen.
            </p>
          </div>
        </div>

        {imgStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Total palabras', value: imgStats.total, color: 'text-slate-700' },
              { label: 'Con imagen', value: imgStats.with_image, color: 'text-emerald-600' },
              { label: 'Revisadas', value: imgStats.checked, color: 'text-indigo-600' },
              { label: 'Pendientes', value: imgStats.pending, color: imgStats.pending > 0 ? 'text-amber-600' : 'text-slate-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {imgLastResult && imgLastResult.processed > 0 && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-800">
            Último batch: <strong>{imgLastResult.processed}</strong> procesadas ·{' '}
            <strong>{imgLastResult.new_images}</strong> imágenes nuevas ·{' '}
            <strong>{imgLastResult.not_imageable}</strong> no imaginables ·{' '}
            <strong>{imgLastResult.no_source_image}</strong> sin imagen en Pexels
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="password"
            placeholder="Gemini API Key (opcional si hay clave en servidor)"
            value={imgGeminiKey}
            onChange={e => setImgGeminiKey(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            autoComplete="off"
          />
          <input
            type="password"
            placeholder="Pexels API Key — pexels.com/api (obligatorio)"
            value={imgPexelsKey}
            onChange={e => setImgPexelsKey(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm"
            autoComplete="off"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled={imgProcessing || imgStats?.pending === 0}
            onClick={handleProcessImages}
            className="py-2.5 px-5 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition"
          >
            {imgProcessing
              ? 'Procesando…'
              : imgStats?.pending === 0
                ? 'Todo procesado'
                : `Procesar siguiente lote (${Math.min(40, imgStats?.pending ?? 0)} palabras)`}
          </button>
          <button
            type="button"
            disabled={imgResetting || imgProcessing}
            onClick={handleResetNoImage}
            title="Vuelve a marcar como pendientes las palabras revisadas sin imagen, para reintentarlas"
            className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-xl text-sm transition"
          >
            {imgResetting ? 'Reseteando…' : '↺ Reintentar sin foto'}
          </button>
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Cada lote procesa hasta 40 palabras. Fuente de imágenes: <strong>Pexels</strong> (regístrate en pexels.com/api, clave inmediata).
          También puedes guardarla en <code className="bg-slate-100 px-1 rounded">PEXELS_API_KEY</code> en .env.local para no tener que escribirla cada vez.
          «Reintentar sin foto» vuelve a poner en cola las palabras sin imagen encontrada.
        </p>
      </div>

      {/* SRS Intervals Editor */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-800">Intervalos SRS</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define cuánto tiempo esperar entre repasos por nivel. Se aplica a todos los usuarios.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleResetSrsIntervals}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
            >
              Restaurar defecto
            </button>
          </div>
        </div>

        {srsIntervalsLoading ? (
          <div className="py-6 text-center text-slate-400 text-sm">Cargando intervalos...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-3">Nivel</th>
                    <th className="py-2.5 px-3">Etapa</th>
                    <th className="py-2.5 px-3">Intervalo</th>
                    <th className="py-2.5 px-3 text-center">Actual</th>
                    <th className="py-2.5 px-3 text-center text-slate-400">Defecto</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {srsIntervals.map((ms, i) => {
                    const human = msToHumanInput(ms)
                    const defaultMs = DEFAULT_SRS_INTERVALS[i]
                    const isModified = ms !== defaultMs
                    const isLevel0 = i === 0

                    return (
                      <tr
                        key={i}
                        className={`border-b border-slate-100 ${
                          isModified ? 'bg-amber-50/50' : ''
                        } ${isLevel0 ? 'opacity-50' : ''}`}
                      >
                        <td className="py-2.5 px-3">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs">
                            {i}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">{STAGE_NAMES[i]}</td>
                        <td className="py-2.5 px-3">
                          {isLevel0 ? (
                            <span className="text-slate-400 text-xs">Siempre 0 (inmediato)</span>
                          ) : (
                            <SrsIntervalInput
                              ms={ms}
                              onChange={(newMs) => handleIntervalChange(i, newMs)}
                            />
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`text-xs font-semibold ${
                            isModified ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {formatMsHuman(ms)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className="text-xs text-slate-400">{formatMsHuman(defaultMs)}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {srsIntervalsChanged && (
              <div className="mt-4 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">Hay cambios sin guardar</p>
                <button
                  type="button"
                  disabled={srsIntervalsSaving}
                  onClick={handleSaveSrsIntervals}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition"
                >
                  {srsIntervalsSaving ? 'Guardando...' : 'Guardar intervalos'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <p className="text-xs text-slate-400 text-center px-4">
        Crear/eliminar usuarios requiere{' '}
        <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en el servidor (Vercel / .env.local).
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// SrsIntervalInput — inline editor for a single interval
// ---------------------------------------------------------------------------

function SrsIntervalInput({ ms, onChange }: { ms: number; onChange: (ms: number) => void }) {
  function msToFields(ms: number): { value: number; unit: 'minutes' | 'hours' | 'days' } {
    if (ms === 0) return { value: 0, unit: 'hours' }
    const days = ms / (24 * 60 * 60 * 1000)
    if (days >= 1 && days === Math.round(days)) return { value: days, unit: 'days' }
    const hours = ms / (60 * 60 * 1000)
    if (hours >= 1) return { value: Math.round(hours * 100) / 100, unit: 'hours' }
    return { value: Math.round(ms / 60000), unit: 'minutes' }
  }

  const fields = msToFields(ms)
  const [value, setValue] = useState(fields.value)
  const [unit, setUnit] = useState(fields.unit)

  useEffect(() => {
    const f = msToFields(ms)
    setValue(f.value)
    setUnit(f.unit)
  }, [ms])

  function emitChange(v: number, u: 'minutes' | 'hours' | 'days') {
    let newMs = 0
    if (u === 'minutes') newMs = v * 60 * 1000
    else if (u === 'hours') newMs = v * 60 * 60 * 1000
    else newMs = v * 24 * 60 * 60 * 1000
    onChange(Math.round(newMs))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        step="any"
        value={value}
        onChange={e => {
          const v = parseFloat(e.target.value) || 0
          setValue(v)
          emitChange(v, unit)
        }}
        className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      />
      <select
        value={unit}
        onChange={e => {
          const u = e.target.value as 'minutes' | 'hours' | 'days'
          setUnit(u)
          emitChange(value, u)
        }}
        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="minutes">min</option>
        <option value="hours">horas</option>
        <option value="days">días</option>
      </select>
    </div>
  )
}
