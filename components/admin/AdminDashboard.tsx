'use client'
import { useEffect, useState } from 'react'
import { fetchAdminDashboard, type DashboardData } from '@/lib/admin-client'
import { showToast } from '@/components/ui/Toast'

type AdminTab = 'users' | 'images' | 'vocab' | 'system' | 'feedback'

interface Tile {
  icon: string
  name: string
  desc: string
  tab?: AdminTab
  href?: string
  /** Matches a key in DashboardData.toolRuns for the "última ejecución" foot. */
  toolKey?: string
  danger?: boolean
}

interface Group {
  title: string
  danger?: boolean
  tiles: Tile[]
}

const GROUPS: Group[] = [
  { title: 'Usuarios', tiles: [
    { icon: '👥', name: 'Gestión de usuarios', desc: 'Roles, eliminar y restaurar cuentas.', tab: 'users' },
    { icon: '➕', name: 'Crear usuario', desc: 'Alta manual de una cuenta.', tab: 'users' },
    { icon: '💾', name: 'Snapshots', desc: 'Copias de seguridad del progreso por usuario.', tab: 'users' },
  ]},
  { title: 'Vocabulario', tiles: [
    { icon: '🈁', name: 'Revisión de furigana', desc: 'Fija la lectura por kanji cuando el automático no es fiable.', tab: 'vocab' },
    { icon: '🈶', name: 'Escritura completa', desc: 'Rellena la palabra con todos sus kanji (草はら → 草原).', tab: 'vocab' },
    { icon: '🚫', name: 'Kanji sueltos que no son palabra', desc: 'Escanea con IA y oculta los que no son palabra real.', tab: 'vocab', toolKey: 'vocab-scan-non-words' },
    { icon: '🔍', name: 'Buscar y eliminar', desc: 'Busca por palabra, kanji, lectura o significado.', tab: 'vocab' },
    { icon: '📥', name: 'Importar CSV', desc: 'Alta masiva de vocabulario desde un archivo.', tab: 'vocab' },
  ]},
  { title: 'Clasificación e imágenes', tiles: [
    { icon: '✨', name: 'Clasificación completa', desc: 'Tipo, categoría, imagen y antónimos en 1 llamada Gemini.', tab: 'images', toolKey: 'vocab-classify-full' },
    { icon: '🖼️', name: 'Solo imágenes', desc: 'Genera imágenes (Gemini + Pexels) sin tocar el resto.', tab: 'images' },
    { icon: '🏷️', name: 'Solo tipo y categoría', desc: 'Clasifica gramática y categoría semántica.', tab: 'images', toolKey: 'vocab-classify' },
    { icon: '🔑', name: 'Claves API', desc: 'Gemini y Pexels para las tareas con IA.', tab: 'images' },
  ]},
  { title: 'Gramática', tiles: [
    { icon: '🌱', name: 'Frases de gramática', desc: 'Genera el banco de frases de cada punto (seed).', href: '/admin/seed-grammar', toolKey: 'grammar-seed' },
    { icon: '🔄', name: 'Renovación de frases', desc: 'Refresco semanal automático del banco.', href: '/admin/grammar-refresh', toolKey: 'grammar-refresh' },
    { icon: '📖', name: 'Enriquecer JLPT', desc: 'Explicación y ejemplos de los puntos JLPT.', href: '/admin/seed-grammar' },
    { icon: '🧩', name: 'Generar esquemas', desc: 'Esquemas de conjugación y uso (MNN + JLPT).', href: '/admin/seed-grammar' },
  ]},
  { title: 'Sistema', tiles: [
    { icon: '⏱️', name: 'Intervalos SRS', desc: 'Tiempos de repaso por nivel (4h, 8h, 1d…).', tab: 'system' },
    { icon: '♻️', name: 'Restaurar backup', desc: 'Recupera el progreso desde un snapshot.', tab: 'users' },
  ]},
  { title: 'Zona peligrosa', danger: true, tiles: [
    { icon: '🔴', name: 'Reset completo de vocabulario', desc: 'Borra todo el vocabulario y su progreso para todos.', tab: 'vocab', danger: true },
    { icon: '🗑️', name: 'Eliminar por grado', desc: 'Elimina el vocabulario de un grado concreto.', tab: 'vocab', danger: true },
  ]},
]

const TRAYS: Array<{ icon: string; short: string; key: 'feedback' | 'grammar' | 'vocab' }> = [
  { icon: '🐛', short: 'Feedback', key: 'feedback' },
  { icon: '🔤', short: 'Gramática', key: 'grammar' },
  { icon: '🚩', short: 'Vocab', key: 'vocab' },
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

/** Two-letter initials from an email or name. */
function initials(label: string): string {
  const base = label.includes('@') ? label.split('@')[0] : label
  const parts = base.split(/[.\-_\s]+/).filter(Boolean)
  const chars = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2)
  return chars.toUpperCase()
}

/** Display name: the email local-part, or the full email as fallback. */
function displayName(email: string): string {
  return email && email.includes('@') ? email.split('@')[0] : (email || '—')
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
  const ranking = data?.ranking ?? []
  const top3 = ranking.slice(0, 3)
  const rest = ranking.slice(3)
  const maxN = ranking[0]?.count || 1
  // podium display order: 2nd · 1st · 3rd
  const podiumOrder = [top3[1], top3[0], top3[2]]

  const PODIUM_STYLE: Record<number, { bar: string; av: string; medal: string }> = {
    1: { bar: 'h-[74px] bg-gradient-to-b from-amber-400 to-amber-500', av: 'bg-amber-500', medal: '🥇' },
    2: { bar: 'h-[56px] bg-gradient-to-b from-slate-300 to-slate-400', av: 'bg-slate-400', medal: '🥈' },
    3: { bar: 'h-[42px] bg-gradient-to-b from-[#d8a066] to-[#b4703c]', av: 'bg-[#b4703c]', medal: '🥉' },
  }

  return (
    <div className="space-y-6">
      {/* ── Sticky attention summary ─────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-1.5 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-300 tabular-nums leading-none">
              {loading ? '·' : attention}
            </span>
            <span className="text-[12.5px] text-slate-500 dark:text-slate-400 max-w-[190px] leading-snug">
              <strong className="text-slate-800 dark:text-slate-100 font-bold">requieren tu atención</strong> en las bandejas de revisión
            </span>
          </div>
          <div className="flex gap-2.5 flex-wrap ml-auto">
            {TRAYS.map(t => (
              <button
                key={t.key}
                onClick={() => onNavigate('feedback')}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-500 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-500 hover:-translate-y-px transition px-2.5 py-1.5 rounded-xl"
              >
                <span>{t.icon}</span>
                {t.short}
                <span className="tabular-nums font-extrabold text-white bg-amber-700 dark:bg-amber-500 dark:text-slate-900 min-w-[19px] h-[19px] px-1.5 rounded-md inline-flex items-center justify-center text-[11px]">
                  {data?.attention[t.key] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Usuarios: KPIs + podium ──────────────────────────────────── */}
      <section className="space-y-3.5">
        <div className="flex items-center gap-2.5 px-1">
          <span className="text-[11.5px] font-bold uppercase tracking-[0.09em] text-slate-400 dark:text-slate-500">Usuarios</span>
          <span className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
        </div>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-3.5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Registrados</span>
            <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tabular-nums leading-tight">{data?.kpis.registered ?? '—'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">en total</span>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 py-4 flex flex-col gap-0.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">Activos · 7 días</span>
            <span className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tabular-nums leading-tight">{data?.kpis.active7d ?? '—'}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {data && data.kpis.registered > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{Math.round((data.kpis.active7d / data.kpis.registered) * 100)}%</span>
              )} del total
            </span>
          </div>
        </div>

        {/* Podium */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm px-4 pt-4 pb-4">
          <div className="flex items-baseline gap-2 mb-3.5 flex-wrap">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">🏆 Top de la semana</h3>
            <span className="text-[11.5px] text-slate-400 dark:text-slate-500">palabras que subieron de nivel SRS · últimos 7 días</span>
            <span className="ml-auto text-[10.5px] font-bold uppercase tracking-wide text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/40 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md">solo admin</span>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Cargando…</p>
          ) : ranking.length === 0 ? (
            <p className="text-xs text-slate-400 py-3">Nadie ha subido de nivel ninguna palabra esta semana.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2.5 items-end max-w-[460px] mx-auto">
                {podiumOrder.map((p, idx) => {
                  const pos = idx === 0 ? 2 : idx === 1 ? 1 : 3
                  if (!p) return <div key={pos} />
                  const st = PODIUM_STYLE[pos]
                  return (
                    <div key={p.user_id} className="flex flex-col items-center gap-1.5">
                      <span className={`w-[42px] h-[42px] rounded-full flex items-center justify-center font-extrabold text-[15px] text-white ${st.av}`}>
                        {initials(p.email)}
                      </span>
                      <span className="text-xs font-bold text-center text-slate-700 dark:text-slate-200 truncate max-w-full" title={p.email}>{displayName(p.email)}</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{p.count} palabras</span>
                      <span className={`w-full rounded-t-[10px] flex items-start justify-center pt-1.5 text-lg ${st.bar}`}>{st.medal}</span>
                    </div>
                  )
                })}
              </div>

              {rest.length > 0 && (
                <div className="flex flex-col gap-0.5 mt-3 border-t border-slate-200 dark:border-slate-700 pt-2.5">
                  {rest.map((p, i) => (
                    <div key={p.user_id} className="grid grid-cols-[22px_1fr_auto] items-center gap-2.5 px-1 py-1 text-[12.5px]">
                      <span className="text-slate-400 dark:text-slate-500 font-bold tabular-nums text-center">{i + 4}</span>
                      <span className="text-slate-700 dark:text-slate-200 font-semibold truncate" title={p.email}>{displayName(p.email)}</span>
                      <span className="text-slate-500 dark:text-slate-400 tabular-nums font-bold">{p.count}</span>
                      <span className="col-start-2 col-end-4 h-[5px] rounded-full bg-indigo-500/50 mt-0.5" style={{ width: `${Math.round((p.count / maxN) * 100)}%` }} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Usuarios tiles */}
        <ToolGrid group={GROUPS[0]} data={data} onGo={go} />
      </section>

      {/* ── Remaining groups ─────────────────────────────────────────── */}
      {GROUPS.slice(1).map(group => (
        <section key={group.title} className="space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <span className={`text-[11.5px] font-bold uppercase tracking-[0.09em] ${group.danger ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>{group.title}</span>
            <span className={`flex-1 h-px ${group.danger ? 'bg-rose-300 dark:bg-rose-900' : 'bg-slate-200 dark:bg-slate-700'}`} />
          </div>
          <ToolGrid group={group} data={data} onGo={go} />
        </section>
      ))}
    </div>
  )
}

function ToolGrid({ group, data, onGo }: { group: Group; data: DashboardData | null; onGo: (t: Tile) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(232px,1fr))] gap-3.5">
      {group.tiles.map(tile => {
        const run = tile.toolKey ? data?.toolRuns[tile.toolKey] : undefined
        const hasRun = Boolean(run?.last_run_at)
        return (
          <button
            key={tile.name}
            onClick={() => onGo(tile)}
            className={`group text-left rounded-2xl border shadow-sm p-4 min-h-[128px] flex flex-col gap-2 transition hover:-translate-y-0.5 hover:shadow-md ${
              tile.danger
                ? 'border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:border-rose-400'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-500'
            }`}
          >
            <span className={`w-[38px] h-[38px] rounded-xl flex items-center justify-center text-[19px] ${tile.danger ? '' : 'bg-indigo-50 dark:bg-indigo-900/40'}`}>{tile.icon}</span>
            <span className={`font-bold text-[14.5px] ${tile.danger ? 'text-rose-700 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>{tile.name}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{tile.desc}</span>
            {tile.danger && (
              <span className="self-start text-[10px] font-bold uppercase tracking-wide text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-900 px-1.5 py-0.5 rounded-md">Irreversible</span>
            )}
            {tile.toolKey && (
              <span className="mt-auto pt-2 flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                {hasRun && <span className="w-[5px] h-[5px] rounded-full bg-emerald-500 shrink-0" />}
                🕒 Última: {timeAgo(run?.last_run_at)}{run?.by ? ` · ${run.by}` : ''}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
