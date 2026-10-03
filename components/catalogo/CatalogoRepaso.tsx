'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { NIVEL_PILL, fetchCatalogoLista, urlDeFicha, type CatalogExample, type CatalogoItem } from '@/lib/catalogo'
import {
  estadoDe, fetchCatalogoSrs, fetchFrasesDe, saveCatalogoSrs, tras, type CatalogoSrs,
} from '@/lib/catalogo-srs'
import { getSrsLevelLabel } from '@/lib/grammar-test-srs'
import { Escribe, Piezas } from './Practicar'
import Tarjeta from './Tarjeta'

// «Repasar ahora» del catálogo: las gramáticas de tu pool a las que les toca,
// cada una con una de sus frases de ejemplo. Ves el español y montas la frase
// en japonés por piezas (puzzle) o la escribes entera (escritura libre).
//
// El SRS es el de siempre: si sale a la primera sube un nivel; si fallas, la
// gramática vuelve a salir al final con otra frase, y cuando por fin sale baja
// tantos niveles como fallos.

type Modo = 'puzzle' | 'escritura' | 'mezcla'
const MODO_KEY = 'catalogo-repaso-modo'
const MODOS: { m: Modo; icon: string; txt: string; sub: string }[] = [
  { m: 'puzzle', icon: '🧩', txt: 'Puzzle', sub: 'Montar la frase con sus piezas' },
  { m: 'escritura', icon: '✍️', txt: 'Escritura libre', sub: 'Escribir la frase entera' },
  { m: 'mezcla', icon: '🎲', txt: 'Mezcla', sub: 'Una de cada, al azar' },
]

type Item = { x: CatalogoItem; f: CatalogExample; como: 'puzzle' | 'escritura' }
type Hecha = { x: CatalogoItem; antes: number; despues: number; fallos: number }

const baraja = <T,>(xs: T[]) => {
  const out = [...xs]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Las frases que se pueden preguntar: con traducción y, para el puzzle, con piezas. */
const sirve = (f: CatalogExample, como: Item['como']) => !!f.text_es?.trim() && (como === 'escritura' || !!f.piezas?.length)

export default function CatalogoRepaso({ volver }: { volver: string }) {
  const [datos, setDatos] = useState<{ pool: CatalogoSrs[]; lista: CatalogoItem[] } | null>(null)
  const [error, setError] = useState('')
  const [modo, setModo] = useState<Modo>('puzzle')
  const [sesion, setSesion] = useState<{
    cola: Item[]
    frases: Record<string, CatalogExample[]>
    estado: Map<string, CatalogoSrs>
    fallos: Map<string, number>
    hechas: Hecha[]
    total: number
    /** Cuántas van preguntadas: la clave para que cada pregunta empiece de cero. */
    turno: number
  } | null>(null)
  const [empezando, setEmpezando] = useState(false)
  const [resultado, setResultado] = useState<boolean | null>(null)

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODO_KEY)
      if (m === 'puzzle' || m === 'escritura' || m === 'mezcla') setModo(m)
    } catch {}
    Promise.all([fetchCatalogoSrs(), fetchCatalogoLista()])
      .then(([pool, lista]) => setDatos({ pool, lista }))
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  const pendientes = useMemo(() => {
    if (!datos) return []
    const porId = new Map(datos.lista.map(x => [x.id, x]))
    const ahora = Date.now()
    return datos.pool
      .filter(s => estadoDe(s, ahora) === 'repasar' && porId.has(s.topic_id))
      .map(s => ({ s, x: porId.get(s.topic_id)! }))
  }, [datos])

  const eligeModo = (m: Modo) => {
    setModo(m)
    try {
      localStorage.setItem(MODO_KEY, m)
    } catch {}
  }

  /** Una frase de la gramática para preguntar, si puede ser distinta de la última. */
  const pregunta = useCallback(
    (x: CatalogoItem, frases: CatalogExample[], sin?: string): Item | null => {
      const como: Item['como'] =
        modo === 'mezcla' ? (Math.random() < 0.5 ? 'puzzle' : 'escritura') : modo
      // Sin piezas no hay puzzle: se escribe.
      for (const c of como === 'puzzle' ? (['puzzle', 'escritura'] as const) : (['escritura'] as const)) {
        const vale = frases.filter(f => sirve(f, c))
        if (!vale.length) continue
        const otras = vale.filter(f => f.id !== sin)
        const lista = otras.length ? otras : vale
        return { x, f: lista[Math.floor(Math.random() * lista.length)], como: c }
      }
      return null
    },
    [modo],
  )

  const empezar = async () => {
    setEmpezando(true)
    setError('')
    try {
      const frases = await fetchFrasesDe(pendientes.map(p => p.x.id))
      const cola: Item[] = []
      for (const { x } of baraja(pendientes)) {
        const it = pregunta(x, frases[x.id] ?? [])
        if (it) cola.push(it)
      }
      setSesion({
        cola,
        frases,
        estado: new Map(pendientes.map(p => [p.s.topic_id, p.s])),
        fallos: new Map(),
        hechas: [],
        total: cola.length,
        turno: 0,
      })
      setResultado(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEmpezando(false)
    }
  }

  const actual = sesion?.cola[0]
  const onResultado = useCallback((bien: boolean) => setResultado(bien), [])

  /** Pasa a la siguiente. `bien` puede venir forzado («Me vale»). */
  const siguiente = async (bien: boolean) => {
    if (!sesion || !actual) return
    const id = actual.x.id
    const resto = sesion.cola.slice(1)
    if (!bien) {
      // Vuelve a salir al final, con otra frase si la hay.
      const fallos = new Map(sesion.fallos).set(id, (sesion.fallos.get(id) ?? 0) + 1)
      const otra = pregunta(actual.x, sesion.frases[id] ?? [], actual.f.id) ?? actual
      setSesion({ ...sesion, cola: [...resto, otra], fallos, turno: sesion.turno + 1 })
      setResultado(null)
      return
    }
    const antes = sesion.estado.get(id)!
    const fallos = sesion.fallos.get(id) ?? 0
    const nuevo = tras(antes, fallos)
    setSesion({
      ...sesion,
      cola: resto,
      turno: sesion.turno + 1,
      hechas: [...sesion.hechas, { x: actual.x, antes: antes.level, despues: nuevo.level, fallos }],
    })
    setResultado(null)
    try {
      await saveCatalogoSrs(nuevo)
    } catch (e) {
      setError(`No se ha guardado ${actual.x.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // Enter con el resultado a la vista pasa a la siguiente.
  useEffect(() => {
    if (resultado === null) return
    const h = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return
      e.preventDefault()
      siguiente(resultado)
    }
    // Un tick después, para que el Enter que comprueba no sea también el que pasa.
    const t = setTimeout(() => window.addEventListener('keydown', h), 0)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', h)
    }
  })

  const cabecera = (
    <div className="flex items-center gap-3">
      <Link href={volver} className="text-sm font-medium text-violet-600 dark:text-violet-400 hover:underline">
        ← Catálogo
      </Link>
      <h1 className="flex-1 text-xl font-black text-slate-800 dark:text-slate-100">Repaso del catálogo</h1>
      {sesion && actual && (
        <span className="text-xs font-semibold tabular-nums text-slate-400">
          {sesion.hechas.length} / {sesion.total}
        </span>
      )}
    </div>
  )

  if (!datos) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {cabecera}
        {error ? (
          <p className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 p-5 text-sm text-rose-700 dark:text-rose-300">
            No se ha podido cargar: {error}
          </p>
        ) : (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
          </div>
        )}
      </div>
    )
  }

  // ── Elegir modo ─────────────────────────────────────────────────────────
  if (!sesion) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {cabecera}
        <Tarjeta kanji="復" color="rose">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
            {pendientes.length
              ? `${pendientes.length} ${pendientes.length === 1 ? 'gramática por repasar' : 'gramáticas por repasar'}`
              : 'No tienes nada por repasar ahora mismo.'}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            Verás una frase de ejemplo en español y tendrás que sacarla en japonés.
          </p>
          <div className="grid sm:grid-cols-3 gap-2 mt-4">
            {MODOS.map(({ m, icon, txt, sub }) => (
              <button
                key={m}
                type="button"
                onClick={() => eligeModo(m)}
                className={`text-left rounded-xl p-3 transition ${
                  modo === m
                    ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-400'
                    : 'bg-slate-50 dark:bg-slate-900/40 hover:bg-violet-50 dark:hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{icon}</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">{txt}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">{sub}</p>
              </button>
            ))}
          </div>
          {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
          <div className="flex justify-end mt-4">
            <button
              type="button"
              disabled={!pendientes.length || empezando}
              onClick={empezar}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {empezando ? 'Preparando…' : '▶ Empezar'}
            </button>
          </div>
        </Tarjeta>
      </div>
    )
  }

  // ── Fin ─────────────────────────────────────────────────────────────────
  if (!actual) {
    const aLaPrimera = sesion.hechas.filter(h => !h.fallos).length
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {cabecera}
        <Tarjeta kanji="終" color="emerald">
          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">🎉 Repaso terminado</p>
          <p className="text-sm text-slate-500 mt-0.5">
            {sesion.hechas.length
              ? `${aLaPrimera} de ${sesion.hechas.length} a la primera.`
              : 'Ninguna de las pendientes tenía frases que se pudieran preguntar.'}
          </p>
          {error && <p className="text-xs text-rose-600 mt-2">{error}</p>}
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-700">
            {sesion.hechas.map(h => (
              <li key={h.x.id} className="flex items-center gap-2 py-2 text-sm">
                <span className={h.despues > h.antes ? 'text-emerald-500' : 'text-rose-500'}>
                  {h.despues > h.antes ? '▲' : '▼'}
                </span>
                <span className="kanji-font flex-1 min-w-0 truncate text-slate-800 dark:text-slate-100">{h.x.name}</span>
                <span className="text-[11px] text-slate-400">{getSrsLevelLabel(h.despues, 'es')}</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end mt-4">
            <Link
              href={volver}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm transition"
            >
              Volver al catálogo
            </Link>
          </div>
        </Tarjeta>
      </div>
    )
  }

  // ── Una pregunta ────────────────────────────────────────────────────────
  const { x, f, como } = actual
  const hechas = sesion.hechas.length
  const clave = `${x.id}-${f.id}-${sesion.turno}`
  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-24">
      {cabecera}
      <div className="h-1.5 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-700">
        <div className="h-full bg-emerald-400 transition-all" style={{ width: `${(hechas / sesion.total) * 100}%` }} />
      </div>

      <Tarjeta kanji={como === 'puzzle' ? '組' : '書'} color={como === 'puzzle' ? 'violet' : 'sky'}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-[10px] font-bold px-1.5 rounded-full ${NIVEL_PILL[x.jlpt]}`}>{x.jlpt}</span>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">
            {como === 'puzzle' ? '🧩 Monta la frase' : '✍️ Escribe la frase'}
          </span>
          {!!sesion.fallos.get(x.id) && (
            <span className="text-[10px] font-bold px-1.5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600">
              otra vez
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Con <span className="kanji-font text-base font-semibold text-violet-700 dark:text-violet-300">{x.name}</span>
          {x.gloss_es && <span className="text-slate-400"> · {x.gloss_es}</span>}
        </p>
        <p className="text-lg text-slate-800 dark:text-slate-100 mt-2 mb-4">{f.text_es}</p>
        <div className="flex flex-col gap-2.5">
          {como === 'puzzle' ? (
            <Piezas key={clave} piezas={f.piezas ?? []} correcta={f.text_ja} modo="char" onResultado={onResultado} />
          ) : (
            <Escribe
              key={clave}
              correcta={f.text_ja}
              otras={f.kana ? [f.kana] : undefined}
              modo="char"
              pista="Escribe la frase en japonés…"
              onResultado={onResultado}
            />
          )}
        </div>
        {resultado !== null && f.romaji && <p className="text-xs text-slate-400 mt-2">{f.romaji}</p>}
      </Tarjeta>

      {resultado !== null && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-4 bg-gradient-to-t from-white via-white/95 dark:from-slate-950 dark:via-slate-950/95">
          <div className="max-w-2xl mx-auto flex items-center gap-2">
            <p className={`flex-1 text-sm font-bold ${resultado ? 'text-emerald-600' : 'text-rose-600'}`}>
              {resultado ? '✓ ¡Bien!' : '✗ Volverá a salir'}
              <a
                href={urlDeFicha(x)}
                target="_blank"
                rel="noreferrer"
                className="ml-2 text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
              >
                Ver la ficha ↗
              </a>
            </p>
            {!resultado && (
              <button
                type="button"
                onClick={() => siguiente(true)}
                title="Tu frase también es correcta: cuenta como acierto"
                className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-emerald-600 hover:border-emerald-300"
              >
                Me vale
              </button>
            )}
            <button
              type="button"
              onClick={() => siguiente(resultado)}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-sm"
            >
              Siguiente ↵
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
