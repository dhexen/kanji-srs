'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import {
  QUEMADA, deleteCatalogoSrs, estadoDe, fetchCatalogoSrs, nueva, quemada, saveCatalogoSrs,
  type CatalogoSrs, type Estado,
} from '@/lib/catalogo-srs'
import { getSrsLevelLabel } from '@/lib/grammar-test-srs'

// Tu pool del catálogo, compartido por el menú de la izquierda (el estado de
// cada gramática), la ficha (los botones + y ✓) y el panel de «Repasar ahora».

type Pool = {
  /** null mientras carga (o si falta la migración 048). */
  mapa: Map<string, CatalogoSrs> | null
  error: string | null
  ahora: number
  guarda: (s: CatalogoSrs) => Promise<void>
  quita: (topicId: string) => Promise<void>
}

const PoolCatalogo = createContext<Pool>({
  mapa: null, error: null, ahora: 0, guarda: async () => {}, quita: async () => {},
})

export const usePool = () => useContext(PoolCatalogo)

export function PoolProvider({ children }: { children: React.ReactNode }) {
  const [mapa, setMapa] = useState<Map<string, CatalogoSrs> | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Para que «por repasar» aparezca sin recargar cuando llega la hora.
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    let vivo = true
    fetchCatalogoSrs()
      .then(l => { if (vivo) setMapa(new Map(l.map(s => [s.topic_id, s]))) })
      .catch(e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) })
    const t = setInterval(() => setAhora(Date.now()), 60_000)
    return () => { vivo = false; clearInterval(t) }
  }, [])

  const guarda = useCallback(async (s: CatalogoSrs) => {
    await saveCatalogoSrs(s)
    setMapa(m => new Map(m ?? []).set(s.topic_id, s))
    setAhora(Date.now())
  }, [])

  const quita = useCallback(async (topicId: string) => {
    await deleteCatalogoSrs(topicId)
    setMapa(m => {
      const n = new Map(m ?? [])
      n.delete(topicId)
      return n
    })
  }, [])

  return <PoolCatalogo.Provider value={{ mapa, error, ahora, guarda, quita }}>{children}</PoolCatalogo.Provider>
}

const ESTADO: Record<Estado, { txt: string; cls: string }> = {
  repasar: { txt: '⏰ Por repasar', cls: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 animate-pulse' },
  estudio: { txt: 'En estudio', cls: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse' },
  estudiada: { txt: '✓ Estudiada', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' },
  quemada: { txt: '🔥 Quemada', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
}

/** El estado de una gramática en tu pool, con el nivel SRS al pasar por encima. */
export function EstadoPill({ id, grande }: { id: string; grande?: boolean }) {
  const { mapa, ahora } = usePool()
  const s = mapa?.get(id)
  const e = estadoDe(s, ahora)
  if (!s || !e) return null
  const nivel = s.level === 0 ? 'Nueva, sin repasar' : getSrsLevelLabel(s.level, 'es')
  return (
    <span
      title={nivel}
      className={`shrink-0 font-bold rounded-full whitespace-nowrap ${
        grande ? 'text-[11px] px-2 py-0.5' : 'text-[9px] px-1.5'
      } ${ESTADO[e].cls}`}
    >
      {ESTADO[e].txt}
      {grande && <span className="font-normal opacity-80"> · {nivel}</span>}
    </span>
  )
}

const BOTON =
  'h-7 inline-flex items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition disabled:opacity-50'

/** «+» para meterla en tu pool y «✓ Aprendida» para quemarla directamente. */
export function PoolBotones({ id }: { id: string }) {
  const { mapa, error, guarda, quita } = usePool()
  const [ocupado, setOcupado] = useState(false)
  const [fallo, setFallo] = useState('')
  if (!mapa) {
    return error ? (
      <span className="text-[10px] text-rose-500" title={error}>Sin SRS (¿migración 048?)</span>
    ) : null
  }
  const s = mapa.get(id)
  const haz = (f: () => Promise<void>) => async () => {
    setOcupado(true)
    setFallo('')
    try {
      await f()
    } catch (e) {
      setFallo(e instanceof Error ? e.message : String(e))
    } finally {
      setOcupado(false)
    }
  }
  const quemadaYa = !!s && s.level >= QUEMADA
  return (
    <div className="flex items-center gap-1 shrink-0" title={fallo || undefined}>
      {!s ? (
        <button
          type="button"
          disabled={ocupado}
          onClick={haz(() => guarda(nueva(id)))}
          title="Añadir a mi pool: entra en «Repasar ahora»"
          className={`${BOTON} bg-violet-600 hover:bg-violet-700 text-white shadow-sm`}
        >
          ＋ Estudiar
        </button>
      ) : (
        <button
          type="button"
          disabled={ocupado}
          onClick={haz(() => quita(id))}
          title="Sacarla de mi pool (se pierde su nivel)"
          className={`${BOTON} border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-rose-600 hover:border-rose-300`}
        >
          − Quitar
        </button>
      )}
      <button
        type="button"
        disabled={ocupado}
        onClick={haz(() => guarda(quemadaYa ? { topic_id: id, level: 1, next_review: Date.now() } : quemada(id)))}
        title={quemadaYa ? 'Volver a estudiarla desde Aprendiz 1' : 'Ya me la sé: pasa directamente a quemada'}
        className={`${BOTON} ${
          quemadaYa
            ? 'border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:border-violet-300'
            : 'border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
        }`}
      >
        {quemadaYa ? '↺ Volver a estudiar' : '✓ Aprendida'}
      </button>
      {fallo && <span className="text-[10px] text-rose-500">Error</span>}
    </div>
  )
}
