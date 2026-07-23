'use client'
import { useEffect, useState } from 'react'
import { fetchAdminDashboard, type DashboardData } from '@/lib/admin-client'
import { showToast } from '@/components/ui/Toast'

type AdminTab = 'users' | 'images' | 'vocab' | 'system' | 'feedback'

interface Tile {
  title: string
  desc: string
  /** Switches to this admin tab. */
  tab?: AdminTab
  /** Navigates to a full page instead of a tab. */
  href?: string
  /** Matches a key in DashboardData.toolRuns to show "última ejecución". */
  toolKey?: string
  /** Shows the open-reports badge. */
  attention?: boolean
}

interface Group {
  area: string
  tiles: Tile[]
}

const GROUPS: Group[] = [
  {
    area: 'Usuarios',
    tiles: [
      { title: 'Gestión de usuarios', desc: 'Altas, roles, palabras y restauración de copias', tab: 'users' },
    ],
  },
  {
    area: 'Vocabulario',
    tiles: [
      { title: 'Vocabulario', desc: 'Glosario, escritura completa y promoción de palabras', tab: 'vocab' },
      { title: 'Kanji sueltos (IA)', desc: 'Oculta kanji que no son palabra real por sí mismos', tab: 'vocab', toolKey: 'vocab-scan-non-words' },
    ],
  },
  {
    area: 'Clasificación e imágenes',
    tiles: [
      { title: 'Clasificación completa', desc: 'Tipo, categoría e imágenes con IA + Pexels', tab: 'images', toolKey: 'vocab-classify-full' },
    ],
  },
  {
    area: 'Gramática',
    tiles: [
      { title: 'Frases de gramática', desc: 'Genera frases de ejemplo para los puntos', href: '/admin/seed-grammar', toolKey: 'grammar-seed' },
      { title: 'Renovación de frases', desc: 'Refresca el ciclo de frases compartidas', href: '/admin/grammar-refresh', toolKey: 'grammar-refresh' },
    ],
  },
  {
    area: 'Revisión',
    tiles: [
      { title: 'Reportes y feedback', desc: 'Errores de palabras, gramática, imágenes y sugerencias', tab: 'feedback', attention: true },
    ],
  },
  {
    area: 'Sistema',
    tiles: [
      { title: 'Sistema', desc: 'Claves de API, mantenimiento y ajustes globales', tab: 'system' },
    ],
  },
]

function timeAgo(iso: string | undefined): string {
  if (!iso) return 'Nunca'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 0) return 'ahora'
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'hace un momento'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function AdminDashboard({ onNavigate }: { onNavigate: (tab: AdminTab) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const d = await fetchAdminDashboard()
        if (alive) setData(d)
      } catch (e) {
        if (alive) showToast(e instanceof Error ? e.message : 'Error al cargar el panel', 'error')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [])

  function go(tile: Tile) {
    if (tile.href) window.location.href = tile.href
    else if (tile.tab) onNavigate(tile.tab)
  }

  const attention = data?.attention.total ?? 0

  return (
    <div className="space-y-4">
      {/* Sticky attention + KPI header */}
      <div className="sticky top-0 z-10 -mx-1 px-1 py-1 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 flex flex-wrap items-center gap-4">
          <div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {attention > 0 ? `${attention} pendientes de revisar` : 'Nada pendiente'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {data ? `${data.attention.feedback} feedback · ${data.attention.vocab} vocabulario · ${data.attention.grammar} gramática` : '—'}
            </div>
          </div>
          <div className="ml-auto flex gap-3">
            <button
              onClick={() => onNavigate('users')}
              className="text-center px-4 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition"
            >
              <div className="text-2xl font-bold text-amber-600 tabular-nums">{data?.kpis.registered ?? '—'}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Registrados</div>
            </button>
            <button
              onClick={() => onNavigate('users')}
              className="text-center px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition"
            >
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">{data?.kpis.active7d ?? '—'}</div>
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Activos 7 días</div>
            </button>
          </div>
        </div>
      </div>

      {/* Weekly podium (admin only, real names) */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Top de la semana · palabras que subieron de nivel</h3>
        {loading ? (
          <p className="text-xs text-slate-400">Cargando…</p>
        ) : !data || data.ranking.length === 0 ? (
          <p className="text-xs text-slate-400">Nadie ha subido de nivel ninguna palabra esta semana.</p>
        ) : (
          <ol className="space-y-1.5">
            {data.ranking.map((r, i) => (
              <li key={r.user_id} className="flex items-center gap-3 text-sm">
                <span className="w-6 text-center text-xs font-bold text-slate-400 tabular-nums">{i + 1}</span>
                <span className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200">{r.email}</span>
                <span className="font-bold text-amber-600 tabular-nums">{r.count}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Tool grid */}
      {GROUPS.map(group => (
        <div key={group.area}>
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2 px-1">{group.area}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.tiles.map(tile => {
              const run = tile.toolKey ? data?.toolRuns[tile.toolKey] : undefined
              return (
                <button
                  key={tile.title}
                  onClick={() => go(tile)}
                  className="group text-left rounded-2xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm p-4 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition flex flex-col gap-2"
                >
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        {tile.title}
                        {tile.attention && attention > 0 && (
                          <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 text-[11px] font-bold rounded-full bg-rose-500 text-white">{attention}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{tile.desc}</p>
                    </div>
                  </div>
                  {tile.toolKey && (
                    <div className="text-[11px] text-slate-400 dark:text-slate-500 mt-auto pt-1">
                      Última: {timeAgo(run?.last_run_at)}{run?.by ? ` · ${run.by}` : ''}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
