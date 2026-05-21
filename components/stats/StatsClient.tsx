'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { MODE_CONFIG, ReviewMode, STAGE_NAMES, getSrsClass, getModeLevelAndDue } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'

export default function StatsClient() {
  const { state, dispatch, syncUp, syncDown, login, signup, logout } = useStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const active = state.db.filter(i => i.status === 'active')
  const locked = state.db.filter(i => i.status === 'locked')
  const pending = active.filter(i => i.due <= Date.now()).length
  const mastered = active.filter(i => i.srsLevel >= 5).length

  async function handleAuth(fn: () => Promise<void>, successMsg: string) {
    setAuthLoading(true)
    try { await fn(); showToast(successMsg, 'success') }
    catch (e: any) { showToast(e.message, 'error') }
    finally { setAuthLoading(false) }
  }

  function exportJSON() {
    const blob = new Blob([JSON.stringify(state.db, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `srs_backup_${Date.now()}.json`; a.click()
    showToast('Backup descargado', 'success')
  }

  function importJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (Array.isArray(parsed)) { dispatch({ type: 'SET_DB', payload: parsed }); showToast('Backup importado', 'success') }
      } catch { showToast('Archivo inválido', 'error') }
    }
    reader.readAsText(file)
  }

  async function resetAll() {
    if (!confirm('¿Borrar TODO tu progreso? Esta acción no se puede deshacer.')) return
    dispatch({ type: 'RESET' })
    try { localStorage.removeItem('kanji_srs_official_db2') } catch {}
    showToast('Progreso eliminado', 'success')
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Kanjis Activos', val: [...new Set(active.map(i => i.kanji))].length, color: 'text-indigo-600' },
          { label: 'Palabras Totales', val: state.db.length, color: 'text-emerald-600' },
          { label: 'Pendientes', val: pending, color: 'text-amber-600' },
          { label: 'Dominadas', val: mastered, color: 'text-purple-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-center">
            <div className={`text-3xl font-bold ${s.color}`}>{s.val}</div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Auth panel */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-900">☁️ Sincronización en la Nube</h3>
          <p className="text-slate-500 text-xs">Tu progreso se guarda automáticamente en Supabase.</p>

          {state.user ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <span className="text-sm text-emerald-700 font-semibold">🟢 {state.user.email}</span>
                <button onClick={() => handleAuth(logout, 'Sesión cerrada')} className="text-xs text-red-500 hover:text-red-700 underline">Cerrar sesión</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => syncUp()} className="flex-1 py-2 border-2 border-indigo-200 hover:border-indigo-500 text-indigo-700 font-bold rounded-xl text-xs transition bg-indigo-50">↑ Subir</button>
                <button onClick={syncDown} className="flex-1 py-2 border-2 border-indigo-200 hover:border-indigo-500 text-indigo-700 font-bold rounded-xl text-xs transition bg-indigo-50">↓ Descargar</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-400">Inicia sesión o crea tu cuenta:</p>
              <input type="text" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email"
                autoComplete="off" data-lpignore="true"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña"
                autoComplete="new-password" data-lpignore="true"
                className="w-full px-3 py-2 border rounded-lg text-sm" />
              <div className="flex gap-2">
                <button disabled={authLoading} onClick={() => handleAuth(() => login(email, password), '¡Sesión iniciada!')}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs disabled:opacity-50 transition">
                  Iniciar sesión
                </button>
                <button disabled={authLoading} onClick={() => handleAuth(() => signup(email, password), '¡Cuenta creada!')}
                  className="flex-1 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg text-xs disabled:opacity-50 transition">
                  Crear cuenta
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Backup */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900">💾 Copia de Seguridad Local</h3>
            <p className="text-slate-500 text-xs mt-1">Exporta o importa un archivo JSON con tu progreso.</p>
            <div className="flex gap-3 mt-4">
              <button onClick={exportJSON} className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition flex items-center justify-center gap-1">📤 Exportar</button>
              <label className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition flex items-center justify-center gap-1 cursor-pointer">
                📥 Importar
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
            </div>
          </div>
          <button onClick={resetAll} className="w-full py-3 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition">
            ⚠️ Reiniciar todo el progreso
          </button>
        </div>
      </div>

      {/* Vocab table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-bold text-slate-800">Mi Vocabulario ({state.db.length})</h3>
          <div className="flex flex-wrap gap-2 text-xs">
            {(Object.entries(MODE_CONFIG) as [ReviewMode, any][]).map(([, cfg]) => (
              <span key={cfg.key} className={`px-2 py-0.5 rounded font-semibold ${cfg.badge}`}>{cfg.label}</span>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-100 text-slate-500 text-xs uppercase tracking-wider">
                <th className="py-3 px-3">Kanji</th>
                <th className="py-3 px-3">Palabra</th>
                <th className="py-3 px-3">Lectura</th>
                <th className="py-3 px-3 hidden md:table-cell">Significado</th>
                {(Object.keys(MODE_CONFIG) as ReviewMode[]).map(m => (
                  <th key={m} className="py-3 px-3 text-center">{MODE_CONFIG[m].label.split(' ')[0]}</th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm">
              {state.db.map(item => (
                <tr key={item.jp} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-bold text-slate-400 text-lg">{item.kanji}</td>
                  <td className="py-3 px-3 font-bold text-slate-800">{item.jp}</td>
                  <td className="py-3 px-3 text-indigo-600 font-semibold text-sm">{item.reading}</td>
                  <td className="py-3 px-3 text-slate-500 text-sm hidden md:table-cell">{item.meaning}</td>
                  {(Object.keys(MODE_CONFIG) as ReviewMode[]).map(mode => {
                    if (item.status === 'locked') return <td key={mode} className="py-3 px-3 text-center"><span className="text-slate-300 text-xs">—</span></td>
                    const { level, due } = getModeLevelAndDue(item, mode)
                    const isPending = due <= Date.now()
                    return (
                      <td key={mode} className="py-3 px-3 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${getSrsClass(level, item.status, due)}`} title={STAGE_NAMES[level]}>
                          {level}<span className="opacity-40">/7</span>
                        </span>
                        {isPending && <span className="text-rose-400 text-xs ml-0.5">!</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
