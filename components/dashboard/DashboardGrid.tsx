'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { fetchDashboardLayout, saveDashboardLayout } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import {
  CARD_INFO, DEFAULT_LAYOUT, ROW_GRID, pick4, sanitizeLayout, setRowCols, usedCards,
  type CardId, type Cols, type DashLayout, type DashRow,
} from '@/lib/dashboard'

// El dashboard en filas de 1 a 4 columnas. Fuera de edición solo pinta las
// tarjetas; en edición deja cambiar columnas, mover filas y tarjetas con
// flechas (arrastrar en el móvil da guerra) y añadir o quitar tarjetas.
//
// Las tarjetas llegan ya montadas desde fuera (`cards`), porque varias usan el
// estado del repaso (modos elegidos, empezar sesión…).

const CACHE_KEY = 'dashboard_layout_v1'

const T = {
  editing: { es: 'Personalizando el dashboard', en: 'Customizing dashboard', ca: 'Personalitzant el dashboard', ja: 'ダッシュボードを編集中' },
  hint: { es: 'En el móvil las tarjetas se apilan; las columnas se aplican en pantallas grandes.', en: 'On mobile cards stack; columns apply on large screens.', ca: 'Al mòbil les targetes s’apilen; les columnes s’apliquen en pantalles grans.', ja: 'スマホでは縦に並び、列は大きな画面で適用されます。' },
  reset: { es: 'Restablecer', en: 'Reset', ca: 'Restablir', ja: 'リセット' },
  cancel: { es: 'Cancelar', en: 'Cancel', ca: 'Cancel·lar', ja: 'キャンセル' },
  save: { es: 'Guardar', en: 'Save', ca: 'Desar', ja: '保存' },
  saved: { es: 'Dashboard guardado', en: 'Dashboard saved', ca: 'Dashboard desat', ja: '保存しました' },
  saveError: { es: 'No se ha podido guardar el dashboard', en: 'Could not save the dashboard', ca: "No s'ha pogut desar", ja: '保存できませんでした' },
  row: { es: 'Fila', en: 'Row', ca: 'Fila', ja: '行' },
  cols: { es: 'Columnas', en: 'Columns', ca: 'Columnes', ja: '列' },
  addRow: { es: 'Nueva fila', en: 'New row', ca: 'Nova fila', ja: '行を追加' },
  addCard: { es: 'Añadir tarjeta', en: 'Add card', ca: 'Afegir targeta', ja: 'カードを追加' },
  pickTitle: { es: 'Elige una tarjeta', en: 'Pick a card', ca: 'Tria una targeta', ja: 'カードを選ぶ' },
  noneLeft: { es: 'Ya están todas las tarjetas en el dashboard.', en: 'All cards are already on the dashboard.', ca: 'Ja hi són totes.', ja: 'すべてのカードが配置済みです。' },
}

function loadCache(): DashLayout | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? sanitizeLayout(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function saveCache(layout: DashLayout) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(layout)) } catch { /* incógnito */ }
}

export default function DashboardGrid({
  cards, editing, onDoneEditing,
}: {
  cards: Record<CardId, ReactNode>
  editing: boolean
  onDoneEditing: () => void
}) {
  const { state } = useStore()
  const lang = state.lang
  const tr = (k: keyof typeof T) => pick4(T[k], lang)

  const [layout, setLayout] = useState<DashLayout>(DEFAULT_LAYOUT)
  const [draft, setDraft] = useState<DashLayout>(DEFAULT_LAYOUT)
  const [saving, setSaving] = useState(false)
  // Hueco al que se va a añadir tarjeta (fila, columna)
  const [picking, setPicking] = useState<[number, number] | null>(null)

  // Primero lo último que se vio en este navegador (sin parpadeo), luego la base.
  useEffect(() => {
    const cached = loadCache()
    if (cached) setLayout(cached)
    if (!state.user) return
    let vivo = true
    fetchDashboardLayout().then(raw => {
      if (!vivo) return
      const l = sanitizeLayout(raw) ?? DEFAULT_LAYOUT
      setLayout(l)
      saveCache(l)
    })
    return () => { vivo = false }
  }, [state.user])

  // Al entrar en edición se parte del diseño actual.
  useEffect(() => {
    if (editing) setDraft(layout)
  }, [editing]) // eslint-disable-line react-hooks/exhaustive-deps

  const shown = editing ? draft : layout

  // ── Ediciones sobre el borrador ───────────────────────────────────────────
  const editRows = (fn: (rows: DashRow[]) => DashRow[]) =>
    setDraft(d => ({ ...d, rows: fn(d.rows.map(r => ({ ...r, cards: [...r.cards] }))) }))

  const moveRow = (i: number, dir: -1 | 1) => editRows(rows => {
    const j = i + dir
    if (j < 0 || j >= rows.length) return rows
    ;[rows[i], rows[j]] = [rows[j], rows[i]]
    return rows
  })

  // ← → dentro de la fila; ↑ ↓ a la misma columna de la fila vecina (o la última
  // que tenga). Siempre intercambia, así nunca se pierde una tarjeta.
  const moveCard = (r: number, c: number, dr: number, dc: number) => editRows(rows => {
    const r2 = r + dr
    if (r2 < 0 || r2 >= rows.length) return rows
    const c2 = Math.min(c + dc, rows[r2].cols - 1)
    if (c2 < 0) return rows
    const tmp = rows[r].cards[c]
    rows[r].cards[c] = rows[r2].cards[c2]
    rows[r2].cards[c2] = tmp
    return rows
  })

  const setCard = (r: number, c: number, id: CardId | null) => editRows(rows => {
    rows[r].cards[c] = id
    return rows
  })

  async function save() {
    setSaving(true)
    try {
      await saveDashboardLayout(draft)
      setLayout(draft)
      saveCache(draft)
      showToast(tr('saved'))
      onDoneEditing()
    } catch {
      showToast(tr('saveError'))
    } finally {
      setSaving(false)
    }
  }

  const usados = usedCards(draft)
  const libres = (Object.keys(CARD_INFO) as CardId[]).filter(id => !usados.has(id))

  const btn = 'px-2 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-300 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 disabled:opacity-30 disabled:pointer-events-none transition'

  return (
    <div className="space-y-4">
      {editing && (
        <div className="sticky top-2 z-30 flex flex-wrap items-center gap-2 justify-between rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/95 dark:bg-slate-800/95 backdrop-blur px-4 py-3 shadow-sm">
          <div className="min-w-0">
            <p className="text-sm font-bold text-violet-700 dark:text-violet-300">✏️ {tr('editing')}</p>
            <p className="text-[11px] text-violet-500/80 dark:text-slate-400">{tr('hint')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={btn} onClick={() => setDraft(DEFAULT_LAYOUT)}>{tr('reset')}</button>
            <button type="button" className={btn} onClick={onDoneEditing}>{tr('cancel')}</button>
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 transition"
            >
              {saving ? '…' : tr('save')}
            </button>
          </div>
        </div>
      )}

      {shown.rows.map((row, r) => {
        // Fuera de edición, una fila sin tarjetas no ocupa sitio.
        if (!editing && row.cards.every(c => c === null)) return null
        return (
          <div key={r} className={editing ? 'rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-3 space-y-3' : ''}>
            {editing && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">{tr('row')} {r + 1}</span>
                <span className="text-slate-400 dark:text-slate-500 ml-2">{tr('cols')}</span>
                <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
                  {([1, 2, 3, 4] as Cols[]).map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => editRows(rows => { rows[r] = setRowCols(rows[r], n); return rows })}
                      className={`w-7 py-1 font-bold transition ${row.cols === n ? 'bg-violet-600 text-white' : 'text-slate-500 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-700'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="ml-auto flex gap-1">
                  <button type="button" className={btn} disabled={r === 0} onClick={() => moveRow(r, -1)} aria-label="Subir fila">↑</button>
                  <button type="button" className={btn} disabled={r === shown.rows.length - 1} onClick={() => moveRow(r, 1)} aria-label="Bajar fila">↓</button>
                  <button type="button" className={`${btn} hover:!border-rose-300 hover:!text-rose-500`} onClick={() => editRows(rows => rows.filter((_, i) => i !== r))} aria-label="Borrar fila">🗑</button>
                </div>
              </div>
            )}

            <div className={`grid gap-4 ${ROW_GRID[row.cols]}`}>
              {row.cards.map((id, c) => {
                if (!editing) {
                  // Hueco vacío: guarda el sitio solo cuando se ven todas las columnas.
                  if (!id) return <div key={c} className="hidden xl:block" />
                  return <div key={c} className="min-w-0 flex flex-col [&>*]:flex-1">{cards[id]}</div>
                }
                if (!id) {
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPicking([r, c])}
                      className="min-h-[8rem] rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-800/60 text-violet-500 dark:text-violet-400 text-sm font-semibold hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                    >
                      ＋ {tr('addCard')}
                    </button>
                  )
                }
                const info = CARD_INFO[id]
                return (
                  <div key={c} className="min-w-0 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400 truncate mr-auto">{info.icon} {pick4(info.title, lang)}</span>
                      <button type="button" className={btn} onClick={() => moveCard(r, c, 0, -1)} disabled={c === 0} aria-label="Izquierda">←</button>
                      <button type="button" className={btn} onClick={() => moveCard(r, c, 0, 1)} disabled={c === row.cols - 1} aria-label="Derecha">→</button>
                      <button type="button" className={btn} onClick={() => moveCard(r, c, -1, 0)} disabled={r === 0} aria-label="Arriba">↑</button>
                      <button type="button" className={btn} onClick={() => moveCard(r, c, 1, 0)} disabled={r === shown.rows.length - 1} aria-label="Abajo">↓</button>
                      <button type="button" className={`${btn} hover:!border-rose-300 hover:!text-rose-500`} onClick={() => setCard(r, c, null)} aria-label="Quitar">✕</button>
                    </div>
                    {/* Vista previa: no se puede pulsar mientras se edita */}
                    <div className="flex-1 flex flex-col [&>*]:flex-1 pointer-events-none select-none opacity-80">{cards[id]}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {editing && (
        <button
          type="button"
          onClick={() => editRows(rows => [...rows, { cols: 2, cards: [null, null] }])}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 text-sm font-semibold hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 transition"
        >
          ＋ {tr('addRow')}
        </button>
      )}

      {/* Catálogo de tarjetas */}
      {picking && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={() => setPicking(null)}>
          <div
            className="w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{tr('pickTitle')}</h3>
              <button type="button" onClick={() => setPicking(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg leading-none" aria-label="Cerrar">✕</button>
            </div>
            {libres.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{tr('noneLeft')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {libres.map(id => {
                  const info = CARD_INFO[id]
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => { setCard(picking[0], picking[1], id); setPicking(null) }}
                      className="flex items-start gap-3 text-left rounded-xl border border-slate-200 dark:border-slate-600 p-3 hover:border-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition"
                    >
                      <span className="text-xl w-7 text-center shrink-0">{info.icon}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold text-slate-700 dark:text-slate-200">{pick4(info.title, lang)}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{pick4(info.desc, lang)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
