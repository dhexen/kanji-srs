'use client'
import { useEffect, useState } from 'react'
import { useStore } from '@/lib/store'
import { showToast } from '@/components/ui/Toast'
import {
  runScanNonWords,
  fetchHiddenNonWords,
  setVocabWordReview,
  type HiddenNonWord,
} from '@/lib/admin-client'

export default function AdminNonWordReview() {
  const { state } = useStore()
  const [running, setRunning] = useState(false)
  const [msg, setMsg] = useState('')
  const [items, setItems] = useState<HiddenNonWord[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  async function loadQueue() {
    setLoading(true)
    try {
      setItems(await fetchHiddenNonWords())
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al cargar', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQueue() }, [])

  async function scan() {
    if (running) return
    setRunning(true)
    setMsg('Escaneando…')
    try {
      let offset = 0
      let scanned = 0
      let hidden = 0
      for (let page = 0; page < 500; page++) {
        const r = await runScanNonWords({ offset, model: state.geminiModel, geminiApiKey: state.geminiApiKey || undefined })
        scanned += r.scanned
        hidden += r.hidden
        setMsg(`Escaneando… ${scanned} kanji sueltos revisados · ${hidden} ocultados`)
        if (r.done) break
        offset = r.next_offset
        await new Promise(res => setTimeout(res, 1200))  // ritmo bajo el límite por minuto de Gemini
      }
      setMsg(`✓ Escaneo completo · ${scanned} kanji sueltos revisados · ${hidden} ocultados automáticamente`)
      showToast('Escaneo completado', 'success')
      await loadQueue()
    } catch (e) {
      setMsg(`⚠️ ${e instanceof Error ? e.message : 'Error'}`)
      showToast(e instanceof Error ? e.message : 'Error al escanear', 'error')
    } finally {
      setRunning(false)
    }
  }

  async function restore(item: HiddenNonWord) {
    const key = `${item.word}|${item.kanji}`
    setBusy(key)
    try {
      await setVocabWordReview(item.word, item.kanji, 'ok')
      setItems(prev => prev.filter(i => `${i.word}|${i.kanji}` !== key))
      showToast('Restaurada (vuelve al glosario)', 'success')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error al restaurar', 'error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Revisa las entradas de <strong>un kanji suelto</strong> y <strong>oculta automáticamente</strong> las que no son una
        palabra real por sí mismas (p. ej. 休 con lectura やす: la palabra real es 休む). Se quitan del glosario para todos los
        usuarios y también del pool de repasos de quien las tuviera. Es <strong>irreversible</strong> (se pierde el progreso SRS
        de esa palabra); si la IA se equivoca en alguna, puedes restaurarla abajo. Usa el modelo de Gemini elegido en Ajustes.
      </p>
      <button
        onClick={scan}
        disabled={running}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
      >
        {running ? '⏳ Escaneando…' : '🔎 Escanear y ocultar kanji sueltos (IA)'}
      </button>
      {msg && <p className="text-xs text-slate-500 dark:text-slate-400">{msg}</p>}

      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
          Ocultadas por la IA {loading ? '' : `(${items.length})`}
        </p>
        {loading ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-slate-400">Nada ocultado todavía. Ejecuta el escaneo.</p>
        ) : (
          <ul className="space-y-2">
            {items.map(item => {
              const key = `${item.word}|${item.kanji}`
              return (
                <li
                  key={key}
                  className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{item.word}</span>
                    <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{item.reading}</span>
                    {item.grade != null && (
                      <span className="ml-2 text-[10px] text-slate-400">G{item.grade}</span>
                    )}
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.meaning_es}</p>
                  </div>
                  <button
                    onClick={() => restore(item)}
                    disabled={busy === key}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 dark:bg-emerald-900/40 dark:text-emerald-300 transition"
                  >
                    Restaurar
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
