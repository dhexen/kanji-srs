'use client'
import { useState, useEffect, useCallback } from 'react'
import { showToast } from '@/components/ui/Toast'
import { fetchGrammarRefreshStatus, runGrammarRefresh, type GrammarRefreshStatus } from '@/lib/admin-client'

const LEVEL_PILL: Record<string, string> = {
  N5: 'bg-emerald-100 text-emerald-700', N4: 'bg-sky-100 text-sky-700', N3: 'bg-violet-100 text-violet-700',
  N2: 'bg-amber-100 text-amber-700', N1: 'bg-rose-100 text-rose-700',
}
const STOPPED_LABEL: Record<string, string> = {
  target_reached: 'Cupo de la noche', time_budget: 'Límite de tiempo', max_per_call: 'Lote completado',
  batch_done: 'Lote completado', gemini_throttled: 'Gemini saturado', cycle_complete: 'Ciclo completado',
}

function fmtTime(iso: string) {
  try { return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) }
  catch { return iso }
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 tabular-nums mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  )
}

export default function GrammarRefreshMonitor() {
  const [data, setData] = useState<GrammarRefreshStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const load = useCallback(async () => {
    try { setData(await fetchGrammarRefreshStatus()) }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error al cargar', 'error') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])
  // Auto-refresh every 10s
  useEffect(() => {
    const id = setInterval(load, 10_000)
    return () => clearInterval(id)
  }, [load])

  async function handleRun() {
    if (running) return
    setRunning(true)
    try {
      await runGrammarRefresh('run')
      showToast('Ejecución lanzada', 'success')
      await load()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Error', 'error')
    } finally { setRunning(false) }
  }

  async function handleRestart() {
    if (!confirm('¿Reiniciar el ciclo? Vaciará la cola y el contador de hoy; la próxima ejecución empezará un ciclo nuevo desde el principio.')) return
    try { await runGrammarRefresh('restart'); showToast('Ciclo reiniciado', 'success'); await load() }
    catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
  }

  if (loading && !data) return <p className="text-sm text-slate-500">Cargando…</p>
  if (!data) return <p className="text-sm text-rose-500">No se pudo cargar el estado.</p>

  // Defensive defaults so a partial/old API response can never crash the page.
  const totalPoints = data.total_points ?? 0
  const nightlyTarget = data.nightly_target ?? 0
  const totalSentences = data.total_sentences ?? 0
  const st = data.state ?? { processed_today: 0, run_date: null, remaining_in_cycle: 0, processed_in_cycle: 0, updated_at: null }
  const runs = data.runs ?? []
  const errs = data.errors ?? []
  const nextUp = data.next_up ?? []
  const validated = data.validated ?? { goal: 100, total: 0, points_with_any: 0, points_complete: 0, per_point: [] }

  const cyclePct = totalPoints > 0 ? Math.round((st.processed_in_cycle / totalPoints) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleRun} disabled={running}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition">
          {running ? '⏳ Ejecutando…' : '▶ Ejecutar ahora'}
        </button>
        <button onClick={load} className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-xl text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          ↻ Actualizar
        </button>
        <button onClick={handleRestart} className="px-3 py-2 border border-rose-300 text-rose-700 rounded-xl text-sm hover:bg-rose-50 ml-auto">
          Reiniciar ciclo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Ciclo actual" value={`${st.processed_in_cycle}/${totalPoints}`} sub={`${cyclePct}% · faltan ${st.remaining_in_cycle}`} />
        <Stat label="Procesados hoy" value={`${st.processed_today}`} sub={`tope auto/noche: ${nightlyTarget}`} />
        <Stat label="Frases totales" value={totalSentences.toLocaleString('es-ES')} sub="en el banco" />
        <Stat label="Últim. actividad" value={st.updated_at ? fmtTime(st.updated_at).split(' ')[1] ?? '—' : '—'} sub={st.run_date ?? ''} />
      </div>

      {/* Progress bars */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Progreso del ciclo</span><span>{cyclePct}%</span></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${cyclePct}%` }} /></div>
        </div>
      </div>

      {/* Validated-by-teacher progress (toward 100/point) */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">✓ Validadas por profesor</h2>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <Stat label="Validadas" value={validated.total.toLocaleString('es-ES')} sub={`objetivo ${(totalPoints * validated.goal).toLocaleString('es-ES')}`} />
          <Stat label={`Puntos al ${validated.goal}`} value={`${validated.points_complete}/${totalPoints}`} sub="completos" />
          <Stat label="Puntos con validadas" value={`${validated.points_with_any}/${totalPoints}`} sub="empezados" />
        </div>
        {validated.per_point.length === 0 ? (
          <p className="text-sm text-slate-400">Aún no hay frases validadas por profesor.</p>
        ) : (
          <div className="max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700/60">
            {validated.per_point.map(p => {
              const pct = Math.min(100, Math.round((p.validated / validated.goal) * 100))
              const done = p.validated >= validated.goal
              return (
                <div key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${LEVEL_PILL[p.jlpt] ?? 'bg-slate-100 text-slate-600'}`}>{p.jlpt || '—'}</span>
                  <span className="kanji-font text-sm font-semibold text-slate-700 dark:text-slate-200 truncate w-40 shrink-0">{p.pattern}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs tabular-nums shrink-0 w-14 text-right ${done ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                    {p.validated}/{validated.goal}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent runs */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ejecuciones recientes</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Cuándo</th>
                <th className="text-left font-semibold px-3 py-2">Origen</th>
                <th className="text-right font-semibold px-3 py-2">Puntos</th>
                <th className="text-right font-semibold px-3 py-2">Frases</th>
                <th className="text-right font-semibold px-3 py-2">Restan</th>
                <th className="text-left font-semibold px-3 py-2">Estado</th>
                <th className="text-right font-semibold px-3 py-2">Dur.</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 && (
                <tr><td colSpan={7} className="px-3 py-4 text-center text-slate-400">Sin ejecuciones todavía.</td></tr>
              )}
              {runs.map(r => (
                <tr key={r.id} className={`border-t border-slate-100 dark:border-slate-700/60 ${r.error ? 'bg-rose-50/60 dark:bg-rose-900/10' : ''}`}>
                  <td className="px-3 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtTime(r.ran_at)}</td>
                  <td className="px-3 py-1.5 text-slate-400">{r.trigger === 'manual' ? '👤 manual' : '⏰ cron'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{r.processed}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-emerald-600 dark:text-emerald-400">+{r.added}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{r.remaining}</td>
                  <td className="px-3 py-1.5">
                    <span className={r.error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}>
                      {STOPPED_LABEL[r.stopped ?? ''] ?? r.stopped ?? '—'}
                    </span>
                    {r.error && <span className="block text-[11px] text-rose-500 truncate max-w-[24ch]" title={r.error}>{r.error}</span>}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-slate-400">{(r.duration_ms / 1000).toFixed(0)}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Errors */}
      {errs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold text-rose-700 dark:text-rose-400">Puntos con error ({errs.length})</h2>
            <button
              onClick={async () => {
                if (!confirm('¿Limpiar todos los errores? Los puntos marcados (incluidos los permanentes) volverán a intentarse en la próxima generación.')) return
                try { await runGrammarRefresh('clear_errors'); showToast('Errores limpiados', 'success'); await load() }
                catch (e) { showToast(e instanceof Error ? e.message : 'Error', 'error') }
              }}
              className="text-xs px-2.5 py-1 border border-rose-300 text-rose-600 rounded-lg hover:bg-rose-50"
            >
              Limpiar errores y reintentar
            </button>
          </div>
          <div className="space-y-1.5">
            {errs.map(e => (
              <div key={e.id} className="flex items-start gap-2 text-sm bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800/40 rounded-lg px-3 py-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 mt-0.5 ${LEVEL_PILL[e.jlpt] ?? 'bg-slate-100 text-slate-600'}`}>{e.jlpt || '—'}</span>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 dark:text-slate-200">{e.pattern} · <span className="font-normal text-slate-500">{e.name}</span> {e.is_permanent && <span className="text-rose-500 text-xs">(permanente)</span>}</p>
                  <p className="text-xs text-rose-500 break-words">{e.error_msg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next up */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Próximos en la cola ({st.remaining_in_cycle})</h2>
        {nextUp.length === 0 ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">✓ Ciclo completado; la próxima ejecución empezará uno nuevo.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {nextUp.map(p => (
              <span key={p.id} className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                <span className={`text-[9px] font-bold px-1 rounded ${LEVEL_PILL[p.jlpt] ?? 'bg-slate-200 text-slate-600'}`}>{p.jlpt || '—'}</span>
                {p.pattern}
              </span>
            ))}
            {st.remaining_in_cycle > nextUp.length && (
              <span className="text-xs text-slate-400 self-center">+{st.remaining_in_cycle - nextUp.length} más…</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
