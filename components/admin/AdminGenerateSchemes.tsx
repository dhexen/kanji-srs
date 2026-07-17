'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { runGenerateSchemes } from '@/lib/admin-client'

export default function AdminGenerateSchemes() {
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
      for (let page = 0; page < 400; page++) {
        const r = await runGenerateSchemes({ offset, force, model: state.geminiModel, geminiApiKey: state.geminiApiKey || undefined })
        totalUpdated += r.updated
        scanned += r.fetched
        total = r.total
        setMsg(`Procesando… ${scanned}/${total} revisados · ${totalUpdated} esquemas`)
        if (r.done) break
        offset = r.next_offset
        await new Promise(res => setTimeout(res, 1500))  // pace under Gemini's per-minute limit
      }
      setMsg(`✓ Completado · ${scanned} puntos revisados · ${totalUpdated} esquemas generados`)
      showToast('Esquemas de gramática generados', 'success')
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : 'Error'}`)
      showToast(e instanceof Error ? e.message : 'Error al generar esquemas', 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-3 p-4">
      <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300">📐 Generar esquemas de conjugación (IA)</h2>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Genera un esquema visual por cada punto de gramática (Minna no Nihongo y JLPT): a qué se une
        (verbo, adjetivo い/な, sustantivo) y sus formas conjugadas, con etiquetas en español, catalán e inglés.
        Se muestra en la ficha de la gramática. Usa el modelo de Gemini elegido en Ajustes.
        Salta los puntos que ya tienen esquema salvo que marques «rehacer».
      </p>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <input type="checkbox" checked={force} onChange={e => setForce(e.target.checked)} disabled={running} />
        Rehacer también los que ya tienen esquema
      </label>
      <button
        onClick={run}
        disabled={running}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
      >
        {running ? '⏳ Procesando…' : '📐 Generar esquemas de conjugación'}
      </button>
      {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
    </div>
  )
}
