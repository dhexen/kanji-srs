'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface GrammarRow {
  id: string
  title: string
  jlpt: string
  count: number
  error: string | null
  is_permanent: boolean
  error_at: string | null
}

interface JobState {
  running: boolean
  started_at: string | null
  key_hint: string
  grammars: GrammarRow[]
  total: number
  done: number
  pending: number
}

const TARGET = 25
const STEP_DELAY_MS = 5_000

export default function GrammarSeedClient() {
  const [state, setState] = useState<JobState | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [waitingMs, setWaitingMs] = useState(0)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [modelCounts, setModelCounts] = useState<Record<string, number>>({})
  const runningRef = useRef(false)
  const waitTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const currentRowRef = useRef<HTMLTableRowElement | null>(null)
  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? ''
  }, [])

  const fetchState = useCallback(async () => {
    const token = await getToken()
    const res = await fetch('/api/admin/seed-grammar', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return
    const data: JobState = await res.json()
    setState(data)
    return data
  }, [getToken])

  useEffect(() => {
    fetchState().finally(() => setLoading(false))
  }, [fetchState])

  // Scroll current row into view
  useEffect(() => {
    currentRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentId])

  function startWaitCountdown(ms: number) {
    const endsAt = Date.now() + ms
    setWaitingMs(ms)
    if (waitTimerRef.current) clearInterval(waitTimerRef.current)
    waitTimerRef.current = setInterval(() => {
      const remaining = endsAt - Date.now()
      if (remaining <= 0) {
        clearInterval(waitTimerRef.current!)
        setWaitingMs(0)
      } else {
        setWaitingMs(remaining)
      }
    }, 500)
  }

  function updateGrammar(id: string, patch: Partial<GrammarRow>) {
    setState(prev => {
      if (!prev) return prev
      return {
        ...prev,
        grammars: prev.grammars.map(g => g.id === id ? { ...g, ...patch } : g),
        done: prev.grammars.filter(g => {
          const updated = g.id === id ? { ...g, ...patch } : g
          return updated.count >= TARGET
        }).length,
      }
    })
  }

  async function runLoop() {
    const token = await getToken()

    while (runningRef.current) {
      let result: any
      try {
        const res = await fetch('/api/admin/seed-grammar/step', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        })
        result = await res.json()
      } catch (e: any) {
        setStatusMsg(`Error de red: ${e.message} — reintentando en 10s`)
        startWaitCountdown(10_000)
        await sleep(10_000)
        continue
      }

      if (!runningRef.current) break

      if (result.status === 'stopped') {
        runningRef.current = false
        setState(prev => prev ? { ...prev, running: false } : prev)
        setStatusMsg('Detenido')
        setCurrentId(null)
        break
      }

      if (result.status === 'all_done') {
        runningRef.current = false
        setState(prev => prev ? { ...prev, running: false } : prev)
        setStatusMsg('¡Completado! Todas las gramáticas tienen sus frases.')
        setCurrentId(null)
        break
      }

      if (result.status === 'done') {
        updateGrammar(result.grammar_id, { count: result.new_count, error: null, is_permanent: false })
        setStatusMsg(`✓ ${result.grammar_id}: +${result.sentences_added} frases`)
        if (result.model_used) {
          setModelCounts(prev => ({ ...prev, [result.model_used]: (prev[result.model_used] ?? 0) + 1 }))
        }
        setCurrentId(null)
        startWaitCountdown(STEP_DELAY_MS)
        await sleep(STEP_DELAY_MS)
        continue
      }

      if (result.status === 'retry') {
        setCurrentId(result.grammar_id)
        updateGrammar(result.grammar_id, { error: result.error, is_permanent: false })
        const wait = result.retry_after_ms ?? 65_000
        setStatusMsg(`⏸ ${result.grammar_id}: ${result.error} — esperando ${Math.round(wait / 1000)}s`)
        startWaitCountdown(wait)
        await sleep(wait)
        // Don't clear currentId — still working on this grammar
        continue
      }

      if (result.status === 'skip') {
        updateGrammar(result.grammar_id, { error: result.error, is_permanent: true })
        setStatusMsg(`✗ ${result.grammar_id}: error permanente — saltando`)
        setCurrentId(null)
        await sleep(1_000)
        continue
      }
    }
  }

  async function handleStart() {
    const token = await getToken()
    await fetch('/api/admin/seed-grammar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    })
    runningRef.current = true
    setState(prev => prev ? { ...prev, running: true } : prev)
    setStatusMsg('Iniciando…')
    runLoop()
  }

  async function handleStop() {
    runningRef.current = false
    const token = await getToken()
    await fetch('/api/admin/seed-grammar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'stop' }),
    })
    setState(prev => prev ? { ...prev, running: false } : prev)
    setStatusMsg('Deteniéndose…')
    setCurrentId(null)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    const token = await getToken()
    try {
      const res = await fetch('/api/admin/seed-grammar/test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.ok) {
        setTestResult(`✅ OK — clave ${data.key_hint}, modelo ${data.model} → "${data.response_text}"`)
      } else {
        setTestResult(`❌ Error ${data.status} — ${data.error}`)
      }
    } catch (e: any) {
      setTestResult(`❌ Error de red: ${e.message}`)
    } finally {
      setTesting(false)
    }
  }

  async function handleClearErrors(action: 'clear_errors' | 'clear_permanent_errors' | 'clear_all_errors') {
    const token = await getToken()
    await fetch('/api/admin/seed-grammar', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    setState(prev => {
      if (!prev) return prev
      return {
        ...prev,
        grammars: prev.grammars.map(g => ({
          ...g,
          error: (action === 'clear_all_errors' || (action === 'clear_errors' && !g.is_permanent) || (action === 'clear_permanent_errors' && g.is_permanent)) ? null : g.error,
          is_permanent: (action === 'clear_all_errors' || action === 'clear_permanent_errors') ? false : g.is_permanent,
        })),
      }
    })
  }

  if (loading) return <div className="p-8 text-slate-500">Cargando…</div>
  if (!state) return <div className="p-8 text-red-500">Error al cargar datos.</div>

  const pct = Math.round((state.done / state.total) * 100)
  const errors = state.grammars.filter(g => g.error && !g.is_permanent).length
  const permErrors = state.grammars.filter(g => g.is_permanent).length

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Key indicator */}
      <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 font-mono">
        🔑 Clave activa: <span className={state.key_hint.startsWith('sin') ? 'text-red-600 font-semibold' : 'text-slate-700 font-semibold'}>{state.key_hint}</span>
        {state.key_hint.startsWith('sin') && <span className="ml-2 text-red-500">— añade tu clave Gemini en Configuración</span>}
        {state.key_hint.startsWith('vercel') && <span className="ml-2 text-amber-600">— usando clave del servidor (puede tener cuota compartida)</span>}
      </div>

      {/* Model usage stats (tracked this session) */}
      {Object.keys(modelCounts).length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs font-mono">
          <span className="text-slate-400">Uso sesión:</span>
          {Object.entries(modelCounts).map(([model, count]) => {
            const shortName = model.replace('gemini-', '').replace('-preview', '')
            const limit = model.includes('3.1-flash-lite') ? 500 : model.includes('3.1-flash') ? 500 : 20
            const pct = Math.round((count / limit) * 100)
            return (
              <span
                key={model}
                className={`px-2 py-0.5 rounded border ${pct >= 80 ? 'bg-red-50 border-red-200 text-red-700' : pct >= 50 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                title={`${count}/${limit} RPD (${pct}%)`}
              >
                {shortName}: {count}/{limit} RPD
              </span>
            )
          })}
        </div>
      )}

      {/* Header stats */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-3 text-sm">
          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-medium">
            ✓ {state.done} completadas
          </span>
          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-medium">
            ⏳ {state.pending} pendientes
          </span>
          {errors > 0 && (
            <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded font-medium">
              ⚠ {errors} con error
            </span>
          )}
          {permErrors > 0 && (
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded font-medium">
              ✗ {permErrors} error permanente
            </span>
          )}
        </div>

        <div className="ml-auto flex gap-2 items-center">
            <button
            onClick={handleTest}
            disabled={testing}
            className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
          >
            {testing ? 'Probando…' : '🔬 Probar clave'}
          </button>
          {errors > 0 && !state.running && (
            <button
              onClick={() => handleClearErrors('clear_errors')}
              className="px-3 py-1.5 text-sm rounded border border-slate-300 hover:bg-slate-50"
            >
              Limpiar errores
            </button>
          )}
          {permErrors > 0 && !state.running && (
            <button
              onClick={() => handleClearErrors('clear_permanent_errors')}
              className="px-3 py-1.5 text-sm rounded border border-red-200 text-red-600 hover:bg-red-50"
            >
              Reintentar permanentes ({permErrors})
            </button>
          )}
          {state.running ? (
            <button
              onClick={handleStop}
              className="px-4 py-2 rounded bg-red-600 text-white font-medium hover:bg-red-700"
            >
              ⏹ Parar
            </button>
          ) : (
            <button
              onClick={handleStart}
              className="px-4 py-2 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700"
            >
              ▶ Iniciar generación
            </button>
          )}
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div className={`text-sm rounded px-3 py-2 font-mono border ${testResult.startsWith('✅') ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {testResult}
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full bg-slate-200 rounded-full h-2.5">
        <div
          className="bg-emerald-500 h-2.5 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-slate-500">{pct}% — {state.done}/{state.total} gramáticas</div>

      {/* Status message */}
      {statusMsg && (
        <div className="text-sm bg-slate-50 border border-slate-200 rounded px-3 py-2 font-mono">
          {statusMsg}
          {waitingMs > 0 && (
            <span className="ml-2 text-slate-400">({Math.round(waitingMs / 1000)}s)</span>
          )}
        </div>
      )}

      {/* Grammar table */}
      <div className="overflow-auto max-h-[60vh] border border-slate-200 rounded">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-8">#</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Gramática</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-16">JLPT</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-20">Frases</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600 w-28">Estado</th>
              <th className="text-left px-3 py-2 font-medium text-slate-600">Último error</th>
            </tr>
          </thead>
          <tbody>
            {state.grammars.map((g, i) => {
              const isCurrent = g.id === currentId
              const isDone = g.count >= TARGET
              return (
                <tr
                  key={g.id}
                  ref={isCurrent ? currentRowRef : undefined}
                  className={[
                    'border-t border-slate-100',
                    isCurrent ? 'bg-blue-50 border-l-2 border-l-blue-500' : '',
                    isDone ? 'opacity-50' : '',
                  ].join(' ')}
                >
                  <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
                  <td className="px-3 py-1.5 font-mono text-xs">{g.title}</td>
                  <td className="px-3 py-1.5 text-slate-500">{g.jlpt}</td>
                  <td className="px-3 py-1.5">
                    <span className={`font-medium ${isDone ? 'text-emerald-600' : 'text-slate-700'}`}>
                      {g.count}/{TARGET}
                    </span>
                  </td>
                  <td className="px-3 py-1.5">
                    {isCurrent ? (
                      <span className="text-blue-600 font-medium animate-pulse">⟳ Generando…</span>
                    ) : isDone ? (
                      <span className="text-emerald-600">✓</span>
                    ) : g.is_permanent ? (
                      <span className="text-red-600 text-xs">✗ Permanente</span>
                    ) : g.error ? (
                      <span className="text-orange-600 text-xs">⚠ Error</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Pendiente</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-red-600 max-w-xs truncate" title={g.error ?? ''}>
                    {g.error}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
