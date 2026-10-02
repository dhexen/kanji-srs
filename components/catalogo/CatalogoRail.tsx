'use client'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  NIVELES, NIVEL_PILL, NIVEL_RAYA, fetchCatalogoFrases, urlDeFicha,
  type CatalogoItem, type Frases, type Jlpt,
} from '@/lib/catalogo'
import { casa, loQueSeVe, norm, trozos } from '@/lib/catalogo-buscar'
import Marca from './Marca'

// La lista de gramáticas de un nivel, con las pestañas de los cinco niveles
// arriba y un buscador que cruza los cinco. Cada fila es un enlace: la sección
// se mueve con la URL, así que se puede volver atrás y compartir una ficha.

type Frase = { versiones: string[]; texto: string }
type Indice = Record<string, Frase[]>

/**
 * Las frases de ejemplo de todo el catálogo, traídas la primera vez que se
 * escribe algo en el buscador (pesan un mega). Mientras no llegan se busca
 * solo por el nombre.
 */
function usaFrases(buscando: boolean) {
  const [indice, setIndice] = useState<Indice | null>(null)
  const pedido = useRef(false)

  useEffect(() => {
    if (!buscando || pedido.current) return
    pedido.current = true
    let vivo = true
    fetchCatalogoFrases()
      .then((frases: Frases) => {
        if (!vivo) return
        // Normalizado una vez al llegar, no en cada tecla.
        const idx: Indice = {}
        for (const [id, lista] of Object.entries(frases)) {
          idx[id] = lista.map(versiones => ({ versiones, texto: norm(versiones.join(' ')) }))
        }
        setIndice(idx)
      })
      .catch(e => {
        // Sin frases el buscador sigue buscando por el nombre, y no se reintenta.
        console.warn('No se han podido traer las frases para buscar:', e)
        if (vivo) setIndice({})
      })
    return () => { vivo = false }
  }, [buscando])

  return { indice, cargando: buscando && indice === null }
}

export default function CatalogoRail({
  jlpt, lista, abierta,
}: {
  jlpt: Jlpt
  lista: CatalogoItem[]
  /** El slug de la ficha abierta, si hay una. */
  abierta: string | null
}) {
  const [q, setQ] = useState('')
  const { indice, cargando } = usaFrases(!!q.trim())
  const ts = useMemo(() => trozos(q), [q])

  const cuentas = useMemo(() => {
    const c: Record<string, number> = {}
    for (const n of NIVELES) c[n] = 0
    for (const x of lista) c[x.jlpt]++
    return c
  }, [lista])

  // El nombre de cada ficha, normalizado una vez: por el japonés, por el romaji
  // y por lo que quiere decir.
  const nombres = useMemo(
    () => new Map(lista.map(x => [x.id, norm(`${x.name} ${x.romaji ?? ''} ${x.gloss_es ?? ''}`)])),
    [lista],
  )

  // Sin nada escrito, el nivel que se está mirando. Con algo escrito, el
  // catálogo entero, con las de este nivel primero.
  const shown = useMemo(() => {
    const aqui = (x: CatalogoItem) => x.jlpt === jlpt
    if (!ts.length) return lista.filter(aqui).map(x => ({ x, frase: null as string[] | null }))

    const salen: { x: CatalogoItem; frase: string[] | null }[] = []
    for (const x of lista) {
      if (casa(nombres.get(x.id) ?? '', ts)) {
        salen.push({ x, frase: null })
        continue
      }
      // La abierta se queda aunque no case, para que no desaparezca de debajo
      // de lo que estás leyendo.
      if (aqui(x) && x.slug === abierta) {
        salen.push({ x, frase: null })
        continue
      }
      // Si el nombre no dice nada, por dentro de sus frases.
      const dentro = indice?.[x.id]?.find(f => casa(f.texto, ts))
      if (dentro) salen.push({ x, frase: loQueSeVe(dentro.versiones, ts) })
    }

    return salen.sort(
      (a, b) =>
        Number(aqui(b.x)) - Number(aqui(a.x)) ||
        Number(!!a.frase) - Number(!!b.frase) ||
        NIVELES.indexOf(a.x.jlpt) - NIVELES.indexOf(b.x.jlpt) ||
        a.x.position - b.x.position,
    )
  }, [lista, nombres, indice, ts, abierta, jlpt])

  return (
    <aside className="flex flex-col gap-3 lg:sticky lg:top-20">
      {/* Los cinco niveles */}
      <div className="flex gap-1.5">
        {NIVELES.map(n => {
          const hay = cuentas[n] ?? 0
          const actual = n === jlpt
          const base = 'flex-1 flex flex-col items-center gap-0.5 rounded-xl border py-1.5 transition'
          const contenido = (
            <>
              <span className="text-sm font-bold">{n}</span>
              <span className="text-[10px] tabular-nums text-slate-400">{hay || '—'}</span>
              <i className={`w-5 h-[3px] rounded-full mt-0.5 ${NIVEL_RAYA[n]}`} />
            </>
          )
          return hay || actual ? (
            <Link
              key={n}
              href={`/catalogo/${n.toLowerCase()}`}
              aria-current={actual ? 'page' : undefined}
              className={`${base} ${
                actual
                  ? 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 shadow-sm'
                  : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-600'
              }`}
            >
              {contenido}
            </Link>
          ) : (
            // Un nivel sin datos se enseña apagado: así se ve que son cinco.
            <span
              key={n}
              aria-disabled="true"
              className={`${base} opacity-40 bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400`}
            >
              {contenido}
            </span>
          )
        })}
      </div>

      <input
        type="search"
        value={q}
        onChange={e => setQ(e.target.value)}
        placeholder="Buscar en el catálogo y en sus frases…"
        aria-label="Buscar en el catálogo y en sus frases"
        autoComplete="off"
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-400"
      />

      <div className="flex flex-col gap-1 lg:max-h-[calc(100vh-15rem)] overflow-y-auto custom-scroll pr-1">
        {shown.map(({ x, frase }, i) => {
          const fuera = x.jlpt !== jlpt
          // Las de otros niveles van todas al final: se titula la primera.
          const corte = fuera && (i === 0 || shown[i - 1].x.jlpt === jlpt)
          const activa = !fuera && x.slug === abierta
          return (
            <Fragment key={x.id}>
              {corte && (
                <p className="mt-1 pt-2.5 pb-1 px-1 border-t border-slate-200 dark:border-slate-700 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  En otros niveles
                </p>
              )}
              <Link
                href={urlDeFicha(x)}
                aria-current={activa ? 'true' : undefined}
                className={`block rounded-xl border px-3 py-2 transition ${
                  activa
                    ? 'bg-violet-50 dark:bg-violet-900/25 border-violet-300 dark:border-violet-700'
                    : 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-sm'
                }`}
              >
                <p className="kanji-font text-[15px] text-slate-800 dark:text-slate-100 leading-snug">
                  <Marca texto={x.name} trozos={ts} />
                </p>
                {x.gloss_es && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                    <Marca texto={x.gloss_es} trozos={ts} />
                  </p>
                )}
                <p className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 dark:text-slate-500">
                  {fuera && (
                    <span className={`text-[9px] font-bold px-1.5 rounded-full ${NIVEL_PILL[x.jlpt]}`}>{x.jlpt}</span>
                  )}
                  <span className="tabular-nums">#{x.position}</span>
                  {x.romaji && (
                    <span className="truncate">
                      <Marca texto={x.romaji} trozos={ts} />
                    </span>
                  )}
                </p>
                {frase && (
                  // La frase por la que sale una ficha cuyo nombre no casa.
                  <span className="flex flex-col gap-px mt-1.5 pl-2 border-l-2 border-slate-200 dark:border-slate-600 text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                    {frase.map((v, k) => (
                      <span key={k} className={k > 0 ? 'text-slate-400 dark:text-slate-500' : ''}>
                        <Marca texto={v} trozos={ts} />
                      </span>
                    ))}
                  </span>
                )}
              </Link>
            </Fragment>
          )
        })}
        {!shown.length && (
          <p className="text-sm text-slate-400 px-1 py-2.5">
            {cargando ? 'Buscando también en las frases…' : 'Nada se llama así ni lo dice en sus frases.'}
          </p>
        )}
      </div>
    </aside>
  )
}
