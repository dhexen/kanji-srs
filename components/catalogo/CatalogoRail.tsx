'use client'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  NIVELES, NIVEL_PILL, NIVEL_RAYA, fetchCatalogoFrases, urlDeFicha,
  type CatalogoItem, type Frases, type Jlpt,
} from '@/lib/catalogo'
import { casa, loQueSeVe, norm, trozos } from '@/lib/catalogo-buscar'
import {
  LIBRO_NOMBRE, comparaLecciones, libroDe, nombreLeccion, porOrden, type Libro, type TipoLeccion,
} from '@/lib/catalogo-libros'
import Marca from './Marca'

// La lista de gramáticas de un nivel, con las pestañas de los cinco niveles
// arriba y un buscador que cruza los cinco. Cada fila es un enlace: la sección
// se mueve con la URL, así que se puede volver atrás y compartir una ficha.
//
// Se puede ver «por libro» (agrupada por lección de los libros, en el orden en
// que se estudian) o «por lista» (en el orden de la web de donde salieron).
// Buscando, siempre es la lista.

type Vista = 'libro' | 'lista'
const VISTA_KEY = 'catalogo-vista'

/** Junto al nombre, por qué está en esa lección, si no es un punto de ella. */
const TIPO_CORTO: Partial<Record<TipoLeccion, string>> = { v: 'vocabulario', f: 'parecida' }

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
  const [vista, setVista] = useState<Vista>('libro')
  useEffect(() => {
    try {
      if (localStorage.getItem(VISTA_KEY) === 'lista') setVista('lista')
    } catch {}
  }, [])
  const cambiaVista = (v: Vista) => {
    setVista(v)
    try {
      localStorage.setItem(VISTA_KEY, v)
    } catch {}
  }
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

  // Por libro: las del nivel agrupadas por lección, con las lecciones en el
  // orden en que se estudian.
  const libros = useMemo(() => {
    const porLeccion = new Map<string, CatalogoItem[]>()
    for (const x of lista) {
      if (x.jlpt !== jlpt) continue
      const k = x.leccion ?? ''
      const g = porLeccion.get(k)
      if (g) g.push(x)
      else porLeccion.set(k, [x])
    }
    const lecciones = Array.from(porLeccion.keys()).sort((a, b) => comparaLecciones(jlpt, a || null, b || null))
    const out: { libro: Libro | null; total: number; lecciones: { k: string; xs: CatalogoItem[] }[] }[] = []
    for (const k of lecciones) {
      const libro = libroDe(k)
      const xs = porLeccion.get(k)!.sort(porOrden)
      let ultimo = out[out.length - 1]
      if (!ultimo || ultimo.libro !== libro) out.push((ultimo = { libro, total: 0, lecciones: [] }))
      ultimo.lecciones.push({ k, xs })
      ultimo.total += xs.length
    }
    return out
  }, [lista, jlpt])
  const colocadas = libros.some(b => b.libro)
  const porLibro = vista === 'libro' && !ts.length && colocadas

  // Al elegir un libro arriba, la lista salta a él.
  const caja = useRef<HTMLDivElement>(null)
  const saltaA = (libro: Libro | null) => {
    const el = caja.current?.querySelector<HTMLElement>(`[data-libro="${libro ?? ''}"]`)
    if (el && caja.current) caja.current.scrollTo({ top: el.offsetTop - caja.current.offsetTop, behavior: 'smooth' })
  }

  const fila = (x: CatalogoItem, frase: string[] | null, fuera: boolean) => {
    const activa = !fuera && x.slug === abierta
    const tipo = porLibro && x.leccion_tipo ? TIPO_CORTO[x.leccion_tipo] : undefined
    return (
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
          {tipo && (
            <span className="text-[9px] font-semibold px-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
              {tipo}
            </span>
          )}
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
    )
  }

  const boton = (activo: boolean) =>
    `flex-1 rounded-lg px-2 py-1 text-xs font-semibold transition ${
      activo
        ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
    }`

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

      {colocadas && !ts.length && (
        <div className="space-y-2">
          <div className="flex gap-1 rounded-xl bg-slate-100 dark:bg-slate-800 p-1">
            <button type="button" onClick={() => cambiaVista('libro')} className={boton(vista === 'libro')}>
              Por libro
            </button>
            <button type="button" onClick={() => cambiaVista('lista')} className={boton(vista === 'lista')}>
              Por lista
            </button>
          </div>
          {porLibro && (
            <div className="flex flex-wrap gap-1">
              {libros.map(b => (
                <button
                  key={b.libro ?? ''}
                  type="button"
                  onClick={() => saltaA(b.libro)}
                  className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 transition"
                >
                  {b.libro ? LIBRO_NOMBRE[b.libro] : 'Sin colocar'} <span className="tabular-nums text-slate-400">{b.total}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div ref={caja} className="relative flex flex-col gap-1 lg:max-h-[calc(100vh-17rem)] overflow-y-auto custom-scroll pr-1">
        {porLibro && libros.map(b => (
          <div key={b.libro ?? ''} data-libro={b.libro ?? ''} className="flex flex-col gap-1">
            <p className="sticky top-0 z-10 bg-white dark:bg-slate-950 pt-2 pb-1 px-1 flex items-baseline gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
              {b.libro ? LIBRO_NOMBRE[b.libro] : 'Sin colocar'}
              <span className="text-[10px] font-normal text-slate-400 tabular-nums">{b.total}</span>
            </p>
            {b.lecciones.map(l => (
              <Fragment key={l.k}>
                {b.libro !== 'w' && b.libro !== 'x' && b.libro && (
                  <p className="pt-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-violet-500 dark:text-violet-400">
                    {nombreLeccion(l.k).corta}
                  </p>
                )}
                {l.xs.map(x => <Fragment key={x.id}>{fila(x, null, false)}</Fragment>)}
              </Fragment>
            ))}
          </div>
        ))}
        {!porLibro && shown.map(({ x, frase }, i) => {
          const fuera = x.jlpt !== jlpt
          // Las de otros niveles van todas al final: se titula la primera.
          const corte = fuera && (i === 0 || shown[i - 1].x.jlpt === jlpt)
          return (
            <Fragment key={x.id}>
              {corte && (
                <p className="mt-1 pt-2.5 pb-1 px-1 border-t border-slate-200 dark:border-slate-700 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  En otros niveles
                </p>
              )}
              {fila(x, frase, fuera)}
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
