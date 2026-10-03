'use client'
import { useContext, useMemo } from 'react'
import Link from 'next/link'
import { NIVELES, type Jlpt } from '@/lib/catalogo'
import { estadoDe } from '@/lib/catalogo-srs'
import { getGrammarForecast } from '@/lib/grammar-test-srs'
import { ListaCatalogo } from './CatalogoShell'
import { usePool } from './CatalogoSrs'

// Lo que se ve al entrar en un nivel sin haber elegido gramática: el panel de
// tu pool del catálogo, con «Repasar ahora», lo que viene los próximos días y
// cómo vas en cada nivel.

export default function CatalogoVacio({ jlpt }: { jlpt: Jlpt }) {
  const lista = useContext(ListaCatalogo)
  const { mapa, error, ahora } = usePool()

  const porNivel = useMemo(() => {
    const c = new Map<Jlpt, { total: number; sabidas: number; estudio: number; repasar: number }>()
    for (const n of NIVELES) c.set(n, { total: 0, sabidas: 0, estudio: 0, repasar: 0 })
    for (const x of lista ?? []) {
      const n = c.get(x.jlpt)!
      n.total++
      const e = estadoDe(mapa?.get(x.id), ahora)
      if (e === 'estudiada' || e === 'quemada') n.sabidas++
      else if (e === 'estudio') n.estudio++
      else if (e === 'repasar') {
        n.repasar++
        if ((mapa?.get(x.id)?.level ?? 0) >= 5) n.sabidas++
        else n.estudio++
      }
    }
    return c
  }, [lista, mapa, ahora])

  const pendientes = useMemo(
    () => (mapa ? Array.from(mapa.values()).filter(s => estadoDe(s, ahora) === 'repasar').length : 0),
    [mapa, ahora],
  )
  const prevision = useMemo(() => {
    if (!mapa?.size) return []
    // getGrammarForecast quiere grammar_id; el catálogo usa topic_id.
    const m = new Map(Array.from(mapa.values()).map(s => [s.topic_id, { grammar_id: s.topic_id, ...s }]))
    return getGrammarForecast(m, 'es', 7)
  }, [mapa])

  if (error) {
    return (
      <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-5 text-sm text-rose-700 dark:text-rose-300">
        No se ha podido cargar tu pool del catálogo: {error}
        <p className="text-xs mt-1 opacity-80">¿Se ha corrido la migración 048_catalogo_srs.sql?</p>
      </div>
    )
  }

  const hay = pendientes > 0
  return (
    <div className="space-y-4">
      {/* Repasar ahora */}
      <div
        className={`relative overflow-hidden rounded-2xl p-5 shadow-sm flex items-center gap-4 ${
          hay ? 'bg-rose-50 dark:bg-rose-900/20' : 'bg-white dark:bg-slate-800'
        }`}
      >
        <span aria-hidden className="kanji-font absolute -right-2 -top-7 text-[7.5rem] leading-none text-rose-500 opacity-[0.09] select-none pointer-events-none">
          復
        </span>
        <div className="relative text-2xl shrink-0">{hay ? '⏰' : '🏋️'}</div>
        <div className="relative flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Repaso del catálogo</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {!mapa
              ? 'Cargando tu pool…'
              : !mapa.size
                ? 'Aún no estudias ninguna. Abre una gramática y pulsa «＋ Estudiar».'
                : hay
                  ? `${pendientes} ${pendientes === 1 ? 'gramática por repasar' : 'gramáticas por repasar'}`
                  : `Al día · ${mapa.size} en tu pool`}
          </p>
        </div>
        {hay ? (
          <Link
            href={`/catalogo/repaso?desde=${jlpt.toLowerCase()}`}
            className="relative shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
          >
            ▶ Repasar ahora
          </Link>
        ) : (
          <span className="relative shrink-0 px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-400">
            Al día
          </span>
        )}
      </div>

      {/* Previsión */}
      {!!prevision.length && (
        <div className="relative overflow-hidden bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm">
          <span aria-hidden className="kanji-font absolute -right-2 -top-7 text-[7.5rem] leading-none text-amber-500 opacity-[0.09] select-none pointer-events-none">
            暦
          </span>
          <div className="relative flex items-center justify-between mb-3">
            <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
              📅 Próximos 7 días
            </p>
            <span className="text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300 leading-none">
              {prevision[prevision.length - 1]?.cumulative ?? 0}
            </span>
          </div>
          <div className="relative flex gap-3 flex-wrap">
            {prevision.map(d => (
              <div
                key={d.date.toISOString()}
                className={`flex flex-col items-center min-w-[2.5rem] ${
                  d.isToday ? 'rounded-lg bg-amber-100/70 dark:bg-amber-900/30 px-1.5 py-0.5' : ''
                }`}
              >
                <span className={`text-[10px] font-medium capitalize ${d.isToday ? 'text-amber-700 dark:text-amber-300' : 'text-slate-400 dark:text-slate-500'}`}>
                  {d.isToday ? 'Hoy' : d.dayLabel}
                </span>
                <span className="text-xs font-bold tabular-nums mt-0.5">
                  {d.newDue === 0 ? (
                    <span className="text-slate-300 dark:text-slate-600">—</span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400">{d.isToday ? d.newDue : `+${d.newDue}`}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Avance por nivel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {NIVELES.map(n => {
          const c = porNivel.get(n)!
          if (!c.total) return null
          const pct = Math.round((c.sabidas / c.total) * 100)
          return (
            <Link
              key={n}
              href={`/catalogo/${n.toLowerCase()}`}
              className={`relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm hover:shadow-md transition ${
                n === jlpt ? 'ring-2 ring-violet-300 dark:ring-violet-700' : ''
              }`}
            >
              <span aria-hidden className="kanji-font absolute -right-2 -top-7 text-[7.5rem] leading-none text-violet-500 opacity-[0.09] select-none pointer-events-none">
                {KANJI_NIVEL[n]}
              </span>
              <div className="relative flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-100">Gramática del {n}</p>
                  <p className="text-[11px] text-slate-400">{c.total} gramáticas</p>
                </div>
                <div
                  className="relative shrink-0 w-12 h-12 rounded-full grid place-items-center"
                  style={{ background: `conic-gradient(#34d399 ${pct}%, rgba(148,163,184,.25) 0)` }}
                >
                  <div className="absolute inset-[3px] rounded-full bg-white dark:bg-slate-800" />
                  <span className="relative text-[11px] font-bold tabular-nums text-slate-700 dark:text-slate-200">{pct}%</span>
                </div>
              </div>
              <div className="relative flex gap-4">
                <div className="text-[11px] text-slate-400">
                  <b className="block text-base font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{c.sabidas}</b>estudiadas
                </div>
                <div className="text-[11px] text-slate-400">
                  <b className="block text-base font-bold text-amber-600 dark:text-amber-400 tabular-nums">{c.estudio}</b>en estudio
                </div>
                <div className="text-[11px] text-slate-400">
                  <b className="block text-base font-bold text-rose-500 tabular-nums">{c.repasar}</b>por repasar
                </div>
              </div>
              <div className="relative flex h-1.5 rounded-full overflow-hidden mt-3 bg-slate-100 dark:bg-slate-700">
                <i className="bg-emerald-400" style={{ width: `${(c.sabidas / c.total) * 100}%` }} />
                <i className="bg-amber-400" style={{ width: `${(c.estudio / c.total) * 100}%` }} />
              </div>
            </Link>
          )
        })}
      </div>
      <p className="text-xs text-slate-400 text-center">
        Abre una gramática de la lista y pulsa «＋ Estudiar» para meterla en tu pool, o «✓ Aprendida» si ya te la sabes.
      </p>
    </div>
  )
}

const KANJI_NIVEL: Record<Jlpt, string> = { N5: '五', N4: '四', N3: '三', N2: '二', N1: '一' }
