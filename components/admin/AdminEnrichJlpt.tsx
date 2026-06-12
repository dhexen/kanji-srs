'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { runEnrichJlpt } from '@/lib/admin-client'

export default function AdminEnrichJlpt() {
  const { state } = useStore()
  const [running, setRunning] = useState(false)
  const [force, setForce] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    if (running) return
    setRunning(true)
    setMsg('Procesando…')
    try {
      let offset = 0
      let totalUpdated = 0
      let scanned = 0
      let total = 0
      for (let page = 0; page < 200; page++) {
        const r = await runEnrichJlpt({ offset, force, model: state.geminiModel, geminiApiKey: state.geminiApiKey || undefined })
        totalUpdated += r.updated
        scanned += r.fetched
        total = r.total
        setMsg(`Procesando… ${scanned}/${total} revisados · ${totalUpdated} enriquecidos`)
        if (r.done) break
        offset = r.next_offset
        await new Promise(res => setTimeout(res, 1500))  // pace under Gemini's per-minute limit
      }
      setMsg(`✓ Completado · ${scanned} puntos revisados · ${totalUpdated} enriquecidos`)
      showToast('Gramática JLPT enriquecida', 'success')
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : 'Error'}`)
      showToast(e instanceof Error ? e.message : 'Error al enriquecer', 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">🈁 Enriquecer gramática JLPT (IA)</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Los puntos JLPT traen una explicación muy breve. Esto pide a Gemini una explicación más completa
        y varias frases de ejemplo por punto, y las guarda para mostrarlas en la sección JLPT.
        Usa el modelo de Gemini elegido en Ajustes. Salta los puntos ya enriquecidos salvo que marques «rehacer».
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} disabled={running} />
        Rehacer también los ya enriquecidos
      </label>
      <button
        onClick={run}
        disabled={running}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
      >
        {running ? '⏳ Procesando…' : '🈁 Enriquecer gramática JLPT'}
      </button>
      {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
    </div>
  )
}
