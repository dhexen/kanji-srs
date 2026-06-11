'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import { runFillFullWord } from '@/lib/admin-client'

export default function AdminFillFullWord() {
  const { state } = useStore()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')

  async function run() {
    if (running) return
    setRunning(true)
    setMsg('Procesando…')
    try {
      let offset = 0
      let totalUpdated = 0
      let totalWithKanji = 0
      let scanned = 0
      for (let page = 0; page < 500; page++) {
        const r = await runFillFullWord({ offset, model: state.geminiModel, geminiApiKey: state.geminiApiKey || undefined })
        totalUpdated += r.updated
        totalWithKanji += r.with_kanji
        scanned += r.fetched
        setMsg(`Procesando… ${scanned} revisadas · ${totalWithKanji} con kanji añadidos`)
        if (r.done) break
        offset = r.next_offset
        await new Promise(res => setTimeout(res, 1200))  // pace under Gemini's per-minute limit
      }
      setMsg(`✓ Completado · ${scanned} palabras revisadas · ${totalWithKanji} con escritura completa distinta`)
      showToast('Escritura completa rellenada', 'success')
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : 'Error'}`)
      showToast(e instanceof Error ? e.message : 'Error al rellenar', 'error')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Rellena la columna de <strong>escritura completa</strong> (la palabra con todos sus kanji, p. ej. 草はら → 草原)
        usando IA, palabra por palabra. Se muestra en el glosario y al revelar la respuesta en los repasos. Usa el modelo de Gemini elegido en Ajustes.
      </p>
      <button
        onClick={run}
        disabled={running}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
      >
        {running ? '⏳ Procesando…' : '🈶 Rellenar escritura completa (IA)'}
      </button>
      {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}
    </div>
  )
}
