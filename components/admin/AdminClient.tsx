'use client'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import AdminMfaGate from '@/components/ui/AdminMfaGate'
import AdminVocabTab from './AdminVocabTab'
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
  fetchClassifyStats,
  classifyVocabBatch,
  fetchImageReports,
  updateImageReport,
  fetchFullClassifyStats,
  runFullClassifyBatch,
  fetchFeedbackReports,
  updateFeedbackStatus,
  fetchVocabReports,
  updateVocabReportStatus,
  fetchGrammarReports,
  updateGrammarReportStatus,
  type AdminUserRow,
  type AdminSnapshotRow,
  type ImageStats,
  type ImageBatchResult,
  type ClassifyStats,
  type ClassifyBatchResult,
  type ImageReport,
  type FullClassifyStats,
  type FullClassifyResult,
  type FeedbackReport,
  type VocabReport,
  type GrammarReport,
} from '@/lib/admin-client'
import { STAGE_NAMES, DEFAULT_SRS_INTERVALS, getSrsIntervals, setSrsIntervals } from '@/lib/srs'

export default function AdminClient() {
  const { state } = useStore()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchRole, setSearchRole] = useState('all')
  const [creating, setCreating] = useState(false)
  const [newUser, setNewUser] = useState({ email: '', password: '', role: 'user' as 'admin' | 'contributor' | 'user' })
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

  // Vocabulary classification (legacy, per-feature)
  const [clsStats, setClsStats] = useState<ClassifyStats | null>(null)
  const [clsProcessing, setClsProcessing] = useState(false)
  const [clsLastResult, setClsLastResult] = useState<ClassifyBatchResult | null>(null)
  const [clsGeminiKey, setClsGeminiKey] = useState('')

  // ── Unified full classification (word_type + category + image + antonyms) ──
  const [fullStats,      setFullStats]      = useState<FullClassifyStats | null>(null)
  const [fullProcessing, setFullProcessing] = useState(false)
  const [fullLastResult, setFullLastResult] = useState<FullClassifyResult | null>(null)
  const [showLegacy,     setShowLegacy]     = useState(false)

  // Tabs
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState<'users' | 'images' | 'vocab' | 'system' | 'feedback'>(
    tabParam === 'images' ? 'images' : tabParam === 'vocab' ? 'vocab' : tabParam === 'system' ? 'system' : tabParam === 'feedback' ? 'feedback' : 'users',
  )

  // Image vote reports
  const [imgReports, setImgReports] = useState<ImageReport[] | null>(null)
  const [imgReportsLoading, setImgReportsLoading] = useState(false)
  const [imgReportUrls, setImgReportUrls] = useState<Record<string, string>>({})
  const [imgReportActing, setImgReportActing] = useState<string | null>(null)
  const [imgReportUrlOpen, setImgReportUrlOpen] = useState<string | null>(null)
  const [imgCandidates, setImgCandidates] = useState<Record<string, string>>({})
  const [imgCandidateActing, setImgCandidateActing] = useState<string | null>(null)

  // Feedback reports
  const [feedbackReports, setFeedbackReports] = useState<FeedbackReport[] | null>(null)
  const [feedbackLoading, setFeedbackLoading] = useState(false)
  const [feedbackExpanded, setFeedbackExpanded] = useState<string | null>(null)
  const [feedbackUpdating, setFeedbackUpdating] = useState<string | null>(null)
  const [feedbackReply, setFeedbackReply] = useState<Record<string, string>>({})

  // Grammar reports (in feedback tab)
  const [grammarReports, setGrammarReports] = useState<GrammarReport[] | null>(null)
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [grammarExpanded, setGrammarExpanded] = useState<string | null>(null)
  const [grammarUpdating, setGrammarUpdating] = useState<string | null>(null)

  // Vocab reports (in feedback tab — read + resolve only, editing in vocab tab)
  const [fbVocabReports, setFbVocabReports] = useState<VocabReport[] | null>(null)
  const [fbVocabLoading, setFbVocabLoading] = useState(false)
  const [fbVocabExpanded, setFbVocabExpanded] = useState<string | null>(null)
  const [fbVocabUpdating, setFbVocabUpdating] = useState<string | null>(null)

  // SRS intervals editor
  const [srsIntervals, setSrsIntervalsLocal] = useState<number[]>([...getSrsIntervals()])
  const [srsIntervalsLoading, setSrsIntervalsLoading] = useState(true)
  const [srsIntervalsSaving, setSrsIntervalsSaving] = useState(false)
  const [srsIntervalsChanged, setSrsIntervalsChanged] = useState(false)

  // Use effective role so an admin "simulating" a user is also blocked here
  const isAdmin = (state.simulatedRole ?? state.role) === 'admin'
  const [aal, setAal] = useState<'aal1' | 'aal2' | 'checking'>('checking')

  useEffect(() => {
    if (!isAdmin) { setAal('aal1'); return }
    getCurrentAal().then(setAal)
  }, [isAdmin])

  useEffect(() => {
    setActiveTab(
      tabParam === 'images' ? 'images' : tabParam === 'vocab' ? 'vocab' : tabParam === 'system' ? 'system' : tabParam === 'feedback' ? 'feedback' : 'users',
    )
  }, [tabParam])

  useEffect(() => {
    if (isAdmin && aal === 'aal2') {
      loadSrsIntervals()
      fetchImageStats().then(setImgStats).catch(() => {})
      fetchClassifyStats().then(setClsStats).catch(() => {})
      fetchFullClassifyStats().then(setFullStats).catch(() => {})
    }
  }, [isAdmin, aal])

  async function loadSrsIntervals() {
    setSrsIntervalsLoading(true)
    try {
      const config = await fetchAdminConfig()
      const intervals = config?.srs_intervals as number[] | undefined
      if (Array.isArray(intervals) && intervals.length === 10) {
        setSrsIntervalsLocal(intervals)
        setSrsIntervals(intervals)
      } else if (Array.isArray(intervals) && intervals.length === 8) {
        // Migrate old 8-entry config to new 10-entry format
        const migrated = [...intervals, DEFAULT_SRS_INTERVALS[8], DEFAULT_SRS_INTERVALS[9]]
        setSrsIntervalsLocal(migrated)
        setSrsIntervals(migrated)
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
        pexelsApiKey: imgPexelsKey || state.pexelsApiKey || undefined,
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

  async function handleFullClassifyBatch() {
    setFullProcessing(true)
    setFullLastResult(null)
    try {
      const result = await runFullClassifyBatch({
        limit:        35,
        geminiApiKey: imgGeminiKey || undefined,
        pexelsApiKey: imgPexelsKey || state.pexelsApiKey || undefined,
      })
      setFullLastResult(result)
      // Refresh all stat blocks
      const [stats, imgS, clsS] = await Promise.all([
        fetchFullClassifyStats().catch(() => null),
        fetchImageStats().catch(() => null),
        fetchClassifyStats().catch(() => null),
      ])
      if (stats) setFullStats(stats)
      if (imgS)  setImgStats(imgS)
      if (clsS)  setClsStats(clsS)
      showToast(
        result.processed === 0
          ? 'No quedan palabras pendientes'
          : `Procesadas ${result.processed} palabras · ${result.new_images} imágenes · ${result.antonym_pairs_added} pares nuevos`,
        'success',
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error en clasificación completa', 'error')
    } finally {
      setFullProcessing(false)
    }
  }

  async function handleClassifyBatch() {
    setClsProcessing(true)
    setClsLastResult(null)
    try {
      const result = await classifyVocabBatch({
        limit: 50,
        geminiApiKey: clsGeminiKey || imgGeminiKey || undefined,
      })
      setClsLastResult(result)
      const stats = await fetchClassifyStats()
      setClsStats(stats)
      showToast(
        result.processed === 0
          ? 'No quedan palabras sin clasificar'
          : `Clasificadas ${result.updated} de ${result.processed} palabras`,
        'success',
      )
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error clasificando', 'error')
    } finally {
      setClsProcessing(false)
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

  async function loadImgReports() {
    setImgReportsLoading(true)
    try {
      setImgReports(await fetchImageReports())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error cargando reportes', 'error')
    } finally {
      setImgReportsLoading(false)
    }
  }

  async function handleReportAction(word: string, action: 'remove' | 'set_url') {
    setImgReportActing(word)
    try {
      await updateImageReport({
        word,
        action,
        url: action === 'set_url' ? imgReportUrls[word] : undefined,
        pexelsApiKey: imgPexelsKey || state.pexelsApiKey || undefined,
      })
      if (action === 'remove') {
        showToast('Imagen eliminada', 'success')
      } else {
        showToast('URL guardada', 'success')
      }
      setImgReportUrlOpen(null)
      setImgCandidates(prev => { const n = { ...prev }; delete n[word]; return n })
      await loadImgReports()
      const stats = await fetchImageStats()
      setImgStats(stats)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setImgReportActing(null)
    }
  }

  async function handlePreviewSearch(word: string) {
    setImgCandidateActing(word)
    try {
      const result = await updateImageReport({
        word,
        action: 'preview',
        pexelsApiKey: imgPexelsKey || state.pexelsApiKey || undefined,
      })
      if (result.image_url) {
        setImgCandidates(prev => ({ ...prev, [word]: result.image_url }))
      } else {
        showToast('No se encontró imagen alternativa', 'info')
      }
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setImgCandidateActing(null)
    }
  }

  async function handleAcceptCandidate(word: string) {
    const candidateUrl = imgCandidates[word]
    if (!candidateUrl) return
    setImgReportActing(word)
    try {
      await updateImageReport({ word, action: 'retry', candidateUrl })
      showToast('Imagen guardada', 'success')
      setImgCandidates(prev => { const n = { ...prev }; delete n[word]; return n })
      await loadImgReports()
      const stats = await fetchImageStats()
      setImgStats(stats)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally {
      setImgReportActing(null)
    }
  }

  function handleRejectCandidate(word: string) {
    setImgCandidates(prev => { const n = { ...prev }; delete n[word]; return n })
  }

  async function loadUsers(q = searchQ, role = searchRole) {
    setLoading(true)
    setSearched(true)
    try {
      setUsers(await fetchAdminUsers({ q: q || undefined, role: role !== 'all' ? role : undefined }))
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

  async function changeRole(user: AdminUserRow, newRole: 'admin' | 'contributor' | 'user') {
    try {
      await updateAdminUserRole(user.user_id, newRole)
      setUsers(prev => prev.map(u => u.user_id === user.user_id ? { ...u, role: newRole } : u))
      const label = newRole === 'admin' ? '👑 Admin' : newRole === 'contributor' ? '✏️ Contributor' : '👤 Usuario'
      showToast(`Rol cambiado a: ${label}`, 'success')
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
      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
        <div className="text-5xl mb-3">🚫</div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Acceso restringido</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Solo los administradores pueden acceder a este panel.</p>
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
      <div className="bg-white dark:bg-slate-800 p-10 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Panel de Administración</h2>
        <AdminMfaGate onVerified={() => setAal('aal2')} />
      </div>
    )
  }

  const restoreTarget = users.find(u => u.user_id === restoreUserId)

  const tabs = [
    { key: 'users' as const,    label: '👥 Usuarios' },
    { key: 'images' as const,   label: '✨ Clasificación' },
    { key: 'vocab' as const,    label: '📚 Vocabulario' },
    { key: 'system' as const,   label: '⚙️ Sistema' },
    { key: 'feedback' as const, label: '🐛 Feedback' },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-5 rounded-2xl shadow-sm">
        <h2 className="text-2xl font-bold mb-0.5">🔧 Administración</h2>
        <p className="text-amber-100 text-sm">Panel de control de la aplicación.</p>
      </div>

      {/* Tab bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-1 flex gap-1 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition ${
              activeTab === tab.key
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: USUARIOS ─────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
              <div className="text-3xl font-bold text-amber-600">{users.length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Usuarios</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
              <div className="text-3xl font-bold text-indigo-600">{users.filter(u => u.role === 'admin').length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Admins</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center">
              <div className="text-3xl font-bold text-violet-600">{users.filter(u => u.role === 'contributor').length}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Contributors</div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 text-center col-span-2 md:col-span-1">
              <div className="text-3xl font-bold text-emerald-600">{users.reduce((s, u) => s + u.wordCount, 0)}</div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mt-1">Palabras totales</div>
            </div>
          </div>

          {/* Crear usuario */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4">➕ Crear usuario</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="email" placeholder="Email" value={newUser.email}
                onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm dark:bg-slate-700 dark:text-slate-100" autoComplete="off" />
              <input type="password" placeholder="Contraseña (mín. 6)" value={newUser.password}
                onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm dark:bg-slate-700 dark:text-slate-100" autoComplete="new-password" />
              <select value={newUser.role}
                onChange={e => setNewUser(u => ({ ...u, role: e.target.value as 'admin' | 'contributor' | 'user' }))}
                className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100">
                <option value="user">👤 Usuario</option>
                <option value="contributor">✏️ Contributor</option>
                <option value="admin">👑 Administrador</option>
              </select>
              <button type="button" disabled={creating} onClick={handleCreate}
                className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
                {creating ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </div>

          {/* Buscar usuarios */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-4">
            <form
              onSubmit={e => { e.preventDefault(); loadUsers() }}
              className="flex flex-wrap gap-3 items-end"
            >
              <div className="flex-1 min-w-[180px]">
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Email</label>
                <input
                  type="text"
                  placeholder="Buscar por email…"
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Rol</label>
                <select
                  value={searchRole}
                  onChange={e => setSearchRole(e.target.value)}
                  className="px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="all">Todos los roles</option>
                  <option value="admin">👑 Admin</option>
                  <option value="contributor">✏️ Contributor</option>
                  <option value="user">👤 Usuario</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
              >
                {loading ? 'Buscando…' : '🔍 Buscar'}
              </button>
            </form>
          </div>

          {/* Tabla usuarios */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            {!searched
              ? <div className="p-8 text-center text-slate-400 dark:text-slate-500">Usa el buscador para encontrar usuarios.</div>
              : loading
              ? <div className="p-8 text-center text-slate-400">Buscando…</div>
              : users.length === 0
              ? <div className="p-8 text-center text-slate-400 dark:text-slate-500">No se encontraron usuarios.</div>
              : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[960px]">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Palabras</th>
                        <th className="py-3 px-4">Rol</th>
                        <th className="py-3 px-4">Registro</th>
                        <th className="py-3 px-4 whitespace-nowrap">Último acceso</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">Logins</th>
                        <th className="py-3 px-4 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {users.map(user => {
                        const isMe = user.user_id === state.user?.id
                        return (
                          <tr key={user.user_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="py-3 px-4">
                              <span className="font-medium text-slate-800 dark:text-slate-100">{user.email || '—'}</span>
                              {isMe && <span className="ml-2 text-indigo-500 text-xs font-bold">(tú)</span>}
                              <p className="font-mono text-[10px] text-slate-400 mt-0.5">{user.user_id.slice(0, 8)}…</p>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">{user.wordCount}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                user.role === 'admin'
                                  ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400'
                                  : user.role === 'contributor'
                                  ? 'bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-400'
                                  : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                              }`}>
                                {user.role === 'admin' ? '👑 Admin' : user.role === 'contributor' ? '✏️ Contributor' : '👤 Usuario'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{user.created_at ? formatDate(user.created_at) : '—'}</td>
                            <td className="py-3 px-4 text-slate-400 text-xs whitespace-nowrap">{user.last_seen_at ? formatDate(user.last_seen_at) : '—'}</td>
                            <td className="py-3 px-4 text-center">
                              {user.login_count != null
                                ? <span className="font-semibold text-slate-700">{user.login_count}</span>
                                : <span className="text-slate-300 text-xs">—</span>}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap justify-end gap-1.5">
                                {!isMe && (
                                  <select
                                    value={user.role}
                                    onChange={e => changeRole(user, e.target.value as 'admin' | 'contributor' | 'user')}
                                    className="text-xs font-semibold px-2 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border-0 cursor-pointer"
                                  >
                                    <option value="user">👤 Usuario</option>
                                    <option value="contributor">✏️ Contributor</option>
                                    <option value="admin">👑 Admin</option>
                                  </select>
                                )}
                                <button type="button" onClick={() => openRestore(user.user_id)}
                                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400">
                                  💾 Backup
                                </button>
                                {!isMe && (
                                  <button type="button" onClick={() => handleDelete(user)}
                                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-400">
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
          <p className="text-xs text-slate-400 text-center px-4">
            Crear/eliminar usuarios requiere <code className="bg-slate-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> en el servidor.
          </p>
        </>
      )}

      {/* ── TAB: CLASIFICACIÓN ───────────────────────────────────────── */}
      {activeTab === 'images' && (
        <>
          {/* API keys */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-3">🔑 Claves API</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Gemini API Key</label>
                <input type="password" placeholder="AIza… (opcional si hay clave en servidor)"
                  value={imgGeminiKey} onChange={e => setImgGeminiKey(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm dark:bg-slate-700 dark:text-slate-100" autoComplete="off" />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pexels API Key</label>
                <input type="password" placeholder="pexels.com/api — clave gratuita inmediata"
                  value={imgPexelsKey} onChange={e => setImgPexelsKey(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm dark:bg-slate-700 dark:text-slate-100" autoComplete="off" />
              </div>
            </div>
          </div>

          {/* ── CLASIFICACIÓN UNIFICADA ─────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-indigo-50 to-sky-50 dark:from-indigo-900/20 dark:to-sky-900/20 rounded-2xl border border-indigo-100 p-5 md:p-6 space-y-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-base mb-0.5">
                ✨ Clasificación completa — 1 llamada Gemini
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Una sola consulta IA asigna tipo gramatical, categoría semántica, imagen (Pexels) y detecta antónimos para verbos y adjetivos. Procesa 35 palabras a la vez.
              </p>
            </div>

            {/* Stats grid */}
            {fullStats && (
              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[
                  { label: 'Total',        value: fullStats.total,         color: 'text-slate-700' },
                  { label: 'Tipo gram.',   value: fullStats.with_type,     color: 'text-emerald-600' },
                  { label: 'Categoría',   value: fullStats.with_category,  color: 'text-indigo-600' },
                  { label: 'Imagen',       value: fullStats.with_image,    color: 'text-violet-600' },
                  { label: 'Antónimos',   value: fullStats.antonym_pairs,  color: 'text-sky-600' },
                  { label: 'Sin antón.',   value: fullStats.antonym_todo,  color: fullStats.antonym_todo > 0 ? 'text-orange-500 font-extrabold' : 'text-slate-400' },
                  { label: 'Pendientes',   value: fullStats.pending,       color: fullStats.pending > 0 ? 'text-amber-600 font-extrabold' : 'text-slate-400' },
                ].map(s => (
                  <div key={s.label} className="bg-white/80 rounded-xl p-2.5 text-center shadow-sm">
                    <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 leading-tight">{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Last result */}
            {fullLastResult && fullLastResult.processed > 0 && (
              <div className="bg-white/90 rounded-xl px-4 py-3 text-sm text-slate-700 border border-indigo-100 space-y-0.5">
                <p className="font-semibold text-indigo-700">Último lote</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-xs text-slate-600 mt-1">
                  <span>🔠 Procesadas: <strong>{fullLastResult.processed}</strong></span>
                  <span>🏷️ Vocab actualizadas: <strong>{fullLastResult.updated_vocab}</strong></span>
                  <span>🖼️ Imágenes nuevas: <strong>{fullLastResult.new_images}</strong></span>
                  <span>⇄ Antónimos añadidos: <strong>{fullLastResult.antonym_pairs_added}</strong></span>
                  <span>🚫 No imaginables: <strong>{fullLastResult.not_imageable}</strong></span>
                  <span>📷 Sin foto: <strong>{fullLastResult.no_source_image}</strong></span>
                </div>
                {fullLastResult.message && (
                  <p className="text-xs text-indigo-500 mt-1">{fullLastResult.message}</p>
                )}
              </div>
            )}

            {/* Action button */}
            <button
              type="button"
              disabled={fullProcessing || fullStats?.pending === 0}
              onClick={handleFullClassifyBatch}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl text-sm transition shadow-sm"
            >
              {fullProcessing
                ? '⏳ Clasificando…'
                : fullStats?.pending === 0
                ? '✓ Todo clasificado y antónimos detectados'
                : fullStats && fullStats.antonym_todo > 0 && fullStats.pending === fullStats.antonym_todo
                ? `⇄ Detectar antónimos (${Math.min(35, fullStats.antonym_todo)} verbos/adj.)`
                : `✨ Clasificar lote (${Math.min(35, fullStats?.pending ?? 0)} palabras)`}
            </button>
          </div>

          {/* ── SECCIONES INDIVIDUALES (avanzado / legacy) ──────────────────── */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowLegacy(v => !v)}
              className="w-full flex items-center justify-between px-5 py-4 text-left text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            >
              <span>⚙️ Acciones individuales (avanzado)</span>
              <span className="text-slate-400 text-xs">{showLegacy ? '▲ Ocultar' : '▼ Mostrar'}</span>
            </button>

            {showLegacy && (
              <div className="p-5 space-y-6 border-t border-slate-100 dark:border-slate-700">

                {/* Imágenes sola */}
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">🖼️ Solo imágenes (Gemini + Pexels)</h4>
                  <p className="text-xs text-slate-400 mb-3">Útil para reintentar palabras sin foto. Requiere Pexels Key.</p>
                  {imgStats && (
                    <div className="flex gap-4 text-xs text-slate-500 mb-3">
                      <span>Total: <strong>{imgStats.total}</strong></span>
                      <span className="text-emerald-600">Con imagen: <strong>{imgStats.with_image}</strong></span>
                      <span className="text-amber-600">Pendientes: <strong>{imgStats.pending}</strong></span>
                    </div>
                  )}
                  {imgLastResult && imgLastResult.processed > 0 && (
                    <p className="text-xs text-emerald-700 mb-3">
                      Último: {imgLastResult.processed} procesadas · {imgLastResult.new_images} nuevas
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={imgProcessing || imgStats?.pending === 0} onClick={handleProcessImages}
                      className="py-2 px-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition">
                      {imgProcessing ? 'Procesando…' : `Procesar lote imágenes (${Math.min(40, imgStats?.pending ?? 0)})`}
                    </button>
                    <button type="button" disabled={imgResetting || imgProcessing} onClick={handleResetNoImage}
                      className="py-2 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold rounded-xl text-xs transition">
                      {imgResetting ? 'Reseteando…' : '↺ Reintentar sin foto'}
                    </button>
                  </div>
                </div>

                {/* Clasificación solo tipo+categoría */}
                <div>
                  <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-1">🏷️ Solo tipo gramatical + categoría</h4>
                  <p className="text-xs text-slate-400 mb-3">Sin imágenes ni antónimos.</p>
                  {clsStats && (
                    <div className="flex gap-4 text-xs text-slate-500 mb-3">
                      <span>Total: <strong>{clsStats.total}</strong></span>
                      <span className="text-emerald-600">Con tipo: <strong>{clsStats.with_type}</strong></span>
                      <span className="text-amber-600">Sin clasificar: <strong>{clsStats.pending}</strong></span>
                    </div>
                  )}
                  {clsLastResult && (
                    <p className="text-xs text-indigo-700 mb-3">
                      Último: {clsLastResult.processed} procesadas · {clsLastResult.updated} actualizadas
                    </p>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <input type="password" value={clsGeminiKey} onChange={e => setClsGeminiKey(e.target.value)}
                      placeholder="Gemini API Key (deja vacío para usar la de arriba)"
                      className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-xl text-xs dark:bg-slate-700 dark:text-slate-100" />
                  </div>
                  <button type="button" disabled={clsProcessing || clsStats?.pending === 0} onClick={handleClassifyBatch}
                    className="py-2 px-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition">
                    {clsProcessing ? 'Clasificando…' : `Clasificar lote tipo/cat. (${Math.min(50, clsStats?.pending ?? 0)})`}
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* Reportes de votos negativos */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100">👎 Imágenes reportadas</h3>
                <p className="text-xs text-slate-400 mt-0.5">Palabras cuya imagen tiene más 👎 que 👍 de los usuarios.</p>
              </div>
              <button type="button" onClick={loadImgReports} disabled={imgReportsLoading}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 transition">
                {imgReportsLoading ? 'Cargando…' : imgReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
              </button>
            </div>

            {imgReports === null ? (
              <p className="text-slate-400 text-sm text-center py-6">Pulsa «Cargar reportes» para ver las imágenes con votos negativos.</p>
            ) : imgReports.length === 0 ? (
              <p className="text-emerald-600 text-sm text-center py-6 bg-emerald-50 rounded-xl">✓ No hay imágenes reportadas — ¡todo bien!</p>
            ) : (
              <div className="space-y-3">
                {imgReports.map(r => {
                  const acting = imgReportActing === r.word
                  const candidateActing = imgCandidateActing === r.word
                  const candidate = imgCandidates[r.word]
                  const urlOpen = imgReportUrlOpen === r.word

                  if (candidate) {
                    return (
                      <div key={r.word} className="flex flex-col gap-3 p-3 border border-violet-200 dark:border-violet-800 rounded-xl bg-violet-50/40 dark:bg-violet-900/20">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="kanji-font text-xl font-bold text-slate-800">{r.word}</span>
                          <span className="text-xs text-slate-400">{r.meaning_es}</span>
                          <span className="ml-auto text-xs font-semibold text-rose-600">👍 {r.upvotes} · 👎 {r.downvotes}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-slate-400">Actual</span>
                            <img src={r.image_url} alt={r.word} className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                          </div>
                          <span className="text-slate-300 text-xl">→</span>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs text-violet-600 font-semibold">Candidata</span>
                            <img src={candidate} alt={r.word} className="w-24 h-24 object-cover rounded-lg border-2 border-violet-400" />
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" disabled={acting} onClick={() => handleAcceptCandidate(r.word)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold disabled:opacity-50 transition">
                            {acting ? '…' : '✅ Aceptar'}
                          </button>
                          <button type="button" disabled={acting} onClick={() => handleRejectCandidate(r.word)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-semibold disabled:opacity-50 transition">
                            ❌ Rechazar
                          </button>
                          <button type="button" disabled={acting || candidateActing} onClick={() => handlePreviewSearch(r.word)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold disabled:opacity-50 transition">
                            {candidateActing ? '…' : '🔄 Buscar otra'}
                          </button>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div key={r.word} className="flex flex-col sm:flex-row gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-700/30">
                      <img src={r.image_url} alt={r.word}
                        className="w-full sm:w-20 h-20 object-cover rounded-lg shrink-0 self-center sm:self-start" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="kanji-font text-xl font-bold text-slate-800 dark:text-slate-100">{r.word}</span>
                          <span className="text-xs text-slate-400">{r.meaning_es}</span>
                          <span className="ml-auto text-xs font-semibold text-rose-600">👍 {r.upvotes} · 👎 {r.downvotes}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <button type="button" disabled={acting} onClick={() => handleReportAction(r.word, 'remove')}
                            className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-50 transition">
                            🗑️ Quitar
                          </button>
                          <button type="button" disabled={acting || candidateActing} onClick={() => handlePreviewSearch(r.word)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold disabled:opacity-50 transition">
                            {candidateActing ? '…' : '🔄 Buscar otra'}
                          </button>
                          <button type="button" onClick={() => setImgReportUrlOpen(urlOpen ? null : r.word)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 font-semibold transition">
                            🔗 URL manual
                          </button>
                        </div>
                        {urlOpen && (
                          <div className="flex gap-2 mt-2">
                            <input type="url" placeholder="https://…" value={imgReportUrls[r.word] ?? ''}
                              onChange={e => setImgReportUrls(prev => ({ ...prev, [r.word]: e.target.value }))}
                              className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm dark:bg-slate-700 dark:text-slate-100" />
                            <button type="button" disabled={acting || !imgReportUrls[r.word]}
                              onClick={() => handleReportAction(r.word, 'set_url')}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition">
                              Guardar
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: VOCABULARIO ─────────────────────────────────────────── */}
      {activeTab === 'vocab' && <AdminVocabTab />}

      {/* ── TAB: SISTEMA ─────────────────────────────────────────────── */}
      {activeTab === 'system' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">Intervalos SRS</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tiempo entre repasos por nivel. Se aplica a todos los usuarios.</p>
            </div>
            <button type="button" onClick={handleResetSrsIntervals}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition">
              Restaurar defecto
            </button>
          </div>

          {srsIntervalsLoading ? (
            <div className="py-6 text-center text-slate-400 text-sm">Cargando intervalos...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
                      <th className="py-2.5 px-3">Nivel</th><th className="py-2.5 px-3">Etapa</th>
                      <th className="py-2.5 px-3">Intervalo</th><th className="py-2.5 px-3 text-center">Actual</th>
                      <th className="py-2.5 px-3 text-center text-slate-400">Defecto</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {srsIntervals.map((ms, i) => {
                      const defaultMs = DEFAULT_SRS_INTERVALS[i]
                      const isModified = ms !== defaultMs
                      return (
                        <tr key={i} className={`border-b border-slate-100 dark:border-slate-700 ${isModified ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''} ${i === 0 || i === 9 ? 'opacity-50' : ''}`}>
                          <td className="py-2.5 px-3">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs">{i}</span>
                          </td>
                          <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">{STAGE_NAMES[i]}</td>
                          <td className="py-2.5 px-3">
                            {i === 0 ? <span className="text-slate-400 text-xs">Siempre 0 (inmediato)</span>
                              : i === 9 ? <span className="text-slate-400 text-xs">∞ (sin más repasos)</span>
                              : <SrsIntervalInput ms={ms} onChange={(newMs) => handleIntervalChange(i, newMs)} />}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`text-xs font-semibold ${isModified ? 'text-amber-600' : 'text-slate-500'}`}>{formatMsHuman(ms)}</span>
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
                <div className="mt-4 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">Hay cambios sin guardar</p>
                  <button type="button" disabled={srsIntervalsSaving} onClick={handleSaveSrsIntervals}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition">
                    {srsIntervalsSaving ? 'Guardando...' : 'Guardar intervalos'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB: FEEDBACK ────────────────────────────────────────────── */}
      {activeTab === 'feedback' && (
        <>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">🐛 Reportes de usuarios</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Bugs y mejoras enviados por los usuarios, agrupados por autor.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setFeedbackLoading(true)
                try { setFeedbackReports(await fetchFeedbackReports()) }
                catch (e: any) { showToast(e.message || 'Error', 'error') }
                finally { setFeedbackLoading(false) }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
            >
              {feedbackLoading ? 'Cargando…' : feedbackReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
            </button>
          </div>

          {feedbackReports === null && !feedbackLoading && (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Pulsa «Cargar reportes» para ver los reportes.</p>
          )}

          {feedbackReports !== null && feedbackReports.length === 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 text-sm text-center py-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ No hay reportes todavía.</p>
          )}

          {feedbackReports !== null && feedbackReports.length > 0 && (() => {
            // Group by user_email
            const byUser = new Map<string, FeedbackReport[]>()
            for (const r of feedbackReports) {
              const key = r.user_email
              if (!byUser.has(key)) byUser.set(key, [])
              byUser.get(key)!.push(r)
            }
            return (
              <div className="space-y-4">
                {Array.from(byUser.entries()).map(([email, reports]) => {
                  const openCount = reports.filter(r => r.status === 'open').length
                  return (
                    <div key={email} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      {/* User header */}
                      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{email}</span>
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">{reports.length} reporte{reports.length !== 1 ? 's' : ''}</span>
                          {openCount > 0 && (
                            <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{openCount} abierto{openCount !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      {/* Reports list */}
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reports.map(report => {
                          const isOpen = feedbackExpanded === report.id
                          const dateStr = new Date(report.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          return (
                            <div key={report.id}>
                              {/* Row summary — clickable */}
                              <button
                                type="button"
                                onClick={() => setFeedbackExpanded(isOpen ? null : report.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                              >
                                <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${
                                  report.type === 'bug'
                                    ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
                                    : 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400'
                                }`}>
                                  {report.type === 'bug' ? '🐛 Bug' : '✨ Mejora'}
                                </span>
                                <span className="text-xs text-sky-600 dark:text-sky-400 shrink-0">{report.section}</span>
                                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate">{report.description}</span>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                                  report.status === 'open'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {report.status === 'open' ? 'Abierto' : 'Resuelto'}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                              </button>
                              {/* Expanded detail */}
                              {isOpen && (
                                <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-slate-700/30 space-y-3">
                                  <div className="text-xs text-slate-400 dark:text-slate-500">{dateStr}</div>
                                  <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">{report.description}</p>

                                  {/* Previous admin response (if any) */}
                                  {report.admin_response && (
                                    <div className="rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800/40 p-3">
                                      <p className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wide mb-1">Tu respuesta al usuario</p>
                                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{report.admin_response}</p>
                                    </div>
                                  )}

                                  {/* Reply box (shown when open) */}
                                  {report.status === 'open' && (
                                    <textarea
                                      value={feedbackReply[report.id] ?? ''}
                                      onChange={e => setFeedbackReply(prev => ({ ...prev, [report.id]: e.target.value }))}
                                      placeholder="Mensaje opcional para el usuario (se mostrará en su perfil al resolver)…"
                                      rows={2}
                                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-violet-300"
                                    />
                                  )}

                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={feedbackUpdating === report.id}
                                      onClick={async () => {
                                        const newStatus = report.status === 'open' ? 'resolved' : 'open'
                                        const reply = newStatus === 'resolved' ? (feedbackReply[report.id] ?? '') : undefined
                                        setFeedbackUpdating(report.id)
                                        try {
                                          await updateFeedbackStatus(report.id, newStatus, reply)
                                          setFeedbackReports(prev => prev ? prev.map(r => r.id === report.id ? { ...r, status: newStatus, admin_response: newStatus === 'resolved' ? (reply || null) : r.admin_response } : r) : prev)
                                          if (newStatus === 'resolved') showToast('✓ Resuelto y notificado al usuario', 'success')
                                        } catch (e: any) {
                                          showToast(e.message || 'Error', 'error')
                                        } finally {
                                          setFeedbackUpdating(null)
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        report.status === 'open'
                                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                      }`}
                                    >
                                      {feedbackUpdating === report.id ? '…' : report.status === 'open' ? '✓ Marcar resuelto' : '↩ Reabrir'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* ── GRAMMAR REPORTS ──────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">🔤 Errores de gramática</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Frases de práctica reportadas como incorrectas por los usuarios.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setGrammarLoading(true)
                try { setGrammarReports(await fetchGrammarReports()) }
                catch (e: any) { showToast(e.message || 'Error', 'error') }
                finally { setGrammarLoading(false) }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
            >
              {grammarLoading ? 'Cargando…' : grammarReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
            </button>
          </div>

          {grammarReports === null && !grammarLoading && (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Pulsa «Cargar reportes» para ver los reportes.</p>
          )}
          {grammarReports !== null && grammarReports.length === 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 text-sm text-center py-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ No hay reportes de gramática todavía.</p>
          )}

          {grammarReports !== null && grammarReports.length > 0 && (() => {
            const byPattern = new Map<string, GrammarReport[]>()
            for (const r of grammarReports) {
              const key = r.grammar_pattern
              if (!byPattern.has(key)) byPattern.set(key, [])
              byPattern.get(key)!.push(r)
            }
            return (
              <div className="space-y-4">
                {Array.from(byPattern.entries()).map(([pattern, reports]) => {
                  const openCount = reports.filter(r => r.status === 'open').length
                  return (
                    <div key={pattern} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50">
                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{pattern}</span>
                        <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">{reports.length} reporte{reports.length !== 1 ? 's' : ''}</span>
                        {openCount > 0 && (
                          <span className="shrink-0 text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{openCount} abierto{openCount !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {reports.map(report => {
                          const isOpen = grammarExpanded === report.id
                          const dateStr = new Date(report.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          return (
                            <div key={report.id}>
                              <button
                                type="button"
                                onClick={() => setGrammarExpanded(isOpen ? null : report.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/40 transition"
                              >
                                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 truncate font-mono">{report.sentence}</span>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                                  report.status === 'open'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {report.status === 'open' ? 'Abierto' : 'Resuelto'}
                                </span>
                                <span className="text-slate-300 dark:text-slate-600 text-xs">{isOpen ? '▲' : '▼'}</span>
                              </button>
                              {isOpen && (
                                <div className="px-4 pb-4 pt-1 bg-slate-50 dark:bg-slate-700/30 space-y-3">
                                  <div className="text-xs text-slate-400 dark:text-slate-500">{report.user_email} · {dateStr}</div>
                                  <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-lg px-3 py-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Frase completa</p>
                                    <p className="text-base font-bold text-slate-800 dark:text-slate-100">{report.sentence}</p>
                                  </div>
                                  {report.description && (
                                    <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">{report.description}</p>
                                  )}
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      disabled={grammarUpdating === report.id}
                                      onClick={async () => {
                                        const newStatus = report.status === 'open' ? 'resolved' : 'open'
                                        setGrammarUpdating(report.id)
                                        try {
                                          await updateGrammarReportStatus(report.id, newStatus)
                                          setGrammarReports(prev => prev ? prev.map(r => r.id === report.id ? { ...r, status: newStatus } : r) : prev)
                                          if (newStatus === 'resolved') showToast('✓ Reporte resuelto', 'success')
                                        } catch (e: any) {
                                          showToast(e.message || 'Error', 'error')
                                        } finally {
                                          setGrammarUpdating(null)
                                        }
                                      }}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                        report.status === 'open'
                                          ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/50'
                                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                                      }`}
                                    >
                                      {grammarUpdating === report.id ? '…' : report.status === 'open' ? '✓ Marcar resuelto' : '↩ Reabrir'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* ── VOCAB REPORTS ────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">🚩 Errores de vocabulario</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Lecturas o significados incorrectos reportados. Para editar ve a la pestaña Vocabulario.</p>
            </div>
            <button
              type="button"
              onClick={async () => {
                setFbVocabLoading(true)
                try { setFbVocabReports(await fetchVocabReports()) }
                catch (e: any) { showToast(e.message || 'Error', 'error') }
                finally { setFbVocabLoading(false) }
              }}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition"
            >
              {fbVocabLoading ? 'Cargando…' : fbVocabReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
            </button>
          </div>

          {fbVocabReports === null && !fbVocabLoading && (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Pulsa «Cargar reportes» para ver los reportes.</p>
          )}
          {fbVocabReports !== null && fbVocabReports.length === 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 text-sm text-center py-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ No hay errores de vocabulario reportados.</p>
          )}

          {fbVocabReports !== null && fbVocabReports.length > 0 && (() => {
            const byWord = new Map<string, VocabReport[]>()
            for (const r of fbVocabReports) {
              if (!byWord.has(r.word)) byWord.set(r.word, [])
              byWord.get(r.word)!.push(r)
            }
            return (
              <div className="space-y-3">
                {Array.from(byWord.entries()).map(([word, reports]) => {
                  const openCount = reports.filter(r => r.status === 'open').length
                  return (
                    <div key={word} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setFbVocabExpanded(fbVocabExpanded === word ? null : word)}
                        className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition text-left"
                      >
                        <span className="kanji-font text-lg font-bold text-slate-800 dark:text-slate-100">{word}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300">{reports.length} reporte{reports.length !== 1 ? 's' : ''}</span>
                        {openCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">{openCount} abierto{openCount !== 1 ? 's' : ''}</span>
                        )}
                        <span className="ml-auto text-slate-300 dark:text-slate-600 text-xs">{fbVocabExpanded === word ? '▲' : '▼'}</span>
                      </button>
                      {fbVocabExpanded === word && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-700">
                          {reports.map(r => (
                            <div key={r.id} className="flex items-start gap-3 px-4 py-3">
                              <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                                r.field === 'reading'  ? 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400' :
                                r.field === 'meaning'  ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' :
                                r.field === 'kanji'    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                                                         'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                              }`}>
                                {r.field === 'reading' ? 'Lectura' : r.field === 'meaning' ? 'Significado' : r.field === 'kanji' ? 'Kanji' : 'General'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-slate-500 dark:text-slate-400">{r.user_email} · {new Date(r.created_at).toLocaleDateString('es-ES')}</p>
                                {r.description && <p className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">{r.description}</p>}
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  r.status === 'open'
                                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                                    : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                }`}>
                                  {r.status === 'open' ? 'Abierto' : 'Resuelto'}
                                </span>
                                <button
                                  type="button"
                                  disabled={fbVocabUpdating === r.id}
                                  onClick={async () => {
                                    const newStatus = r.status === 'open' ? 'resolved' : 'open'
                                    setFbVocabUpdating(r.id)
                                    try {
                                      await updateVocabReportStatus(r.id, newStatus)
                                      setFbVocabReports(prev => prev ? prev.map(x => x.id === r.id ? { ...x, status: newStatus } : x) : prev)
                                    } catch (e: any) {
                                      showToast(e.message || 'Error', 'error')
                                    } finally {
                                      setFbVocabUpdating(null)
                                    }
                                  }}
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-lg transition ${
                                    r.status === 'open'
                                      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200'
                                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200'
                                  }`}
                                >
                                  {fbVocabUpdating === r.id ? '…' : r.status === 'open' ? '✓' : '↩'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>

        {/* ── IMAGE REPORTS ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">🖼️ Imágenes reportadas</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Imágenes con más votos negativos que positivos. Para gestión completa ve a la pestaña Imágenes.</p>
            </div>
            <button
              type="button"
              onClick={loadImgReports}
              disabled={imgReportsLoading}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 transition disabled:opacity-50"
            >
              {imgReportsLoading ? 'Cargando…' : imgReports === null ? 'Cargar reportes' : '🔄 Actualizar'}
            </button>
          </div>

          {imgReports === null && !imgReportsLoading && (
            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-8">Pulsa «Cargar reportes» para ver las imágenes con votos negativos.</p>
          )}
          {imgReports !== null && imgReports.length === 0 && (
            <p className="text-emerald-600 dark:text-emerald-400 text-sm text-center py-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">✓ No hay imágenes reportadas.</p>
          )}
          {imgReports !== null && imgReports.length > 0 && (
            <div className="space-y-3">
              {imgReports.map(r => {
                const acting = imgReportActing === r.word
                return (
                  <div key={r.word} className="flex flex-col sm:flex-row gap-3 p-3 border border-slate-100 dark:border-slate-700 rounded-xl bg-slate-50/60 dark:bg-slate-700/30">
                    <img src={r.image_url} alt={r.word} className="w-full sm:w-16 h-16 object-cover rounded-lg shrink-0 self-center sm:self-start" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="kanji-font text-lg font-bold text-slate-800 dark:text-slate-100">{r.word}</span>
                        <span className="text-xs text-slate-400">{r.meaning_es}</span>
                        <span className="ml-auto text-xs font-semibold text-rose-600">👍 {r.upvotes} · 👎 {r.downvotes}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <button
                          type="button"
                          disabled={acting}
                          onClick={() => handleReportAction(r.word, 'remove')}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-50 transition"
                        >
                          {acting ? '…' : '🗑️ Quitar imagen'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        </>
      )}

      {/* Backup restore modal — global (outside tabs) */}
      {restoreUserId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 dark:border-slate-700 max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start gap-3">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Restaurar backup</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{restoreTarget?.email}</p>
                <p className="text-xs text-slate-400 mt-0.5">Últimos 10 snapshots automáticos</p>
              </div>
              <button type="button" onClick={() => setRestoreUserId(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold leading-none">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {snapshotsLoading ? <p className="text-slate-400 text-sm text-center py-6">Cargando backups…</p>
                : snapshots.length === 0 ? <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-6 bg-slate-50 dark:bg-slate-800 rounded-xl">Este usuario no tiene backups aún.</p>
                : snapshots.map(s => (
                  <div key={s.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{formatDate(s.created_at)}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{s.word_count} palabras · {s.reason}</p>
                    </div>
                    <button type="button" disabled={restoringId !== null}
                      onClick={() => handleRestore(restoreUserId, s.id, formatDate(s.created_at))}
                      className="shrink-0 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg">
                      {restoringId === s.id ? '…' : 'Restaurar'}
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
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
        className="w-20 px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-center focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 dark:bg-slate-700 dark:text-slate-100"
      />
      <select
        value={unit}
        onChange={e => {
          const u = e.target.value as 'minutes' | 'hours' | 'days'
          setUnit(u)
          emitChange(value, u)
        }}
        className="px-2 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="minutes">min</option>
        <option value="hours">horas</option>
        <option value="days">días</option>
      </select>
    </div>
  )
}
