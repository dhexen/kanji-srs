'use client'
import { useContext, useMemo, useState } from 'react'
import { saveCatalogoLecciones, type CatalogoItem } from '@/lib/catalogo'
import {
  LIBRO_NOMBRE, TEMAS, TIPOS_LECCION, TIPO_LECCION, enLeccion, leccionesDe, libroDe, librosDelNivel,
  nombreGrammarTest, nombreLeccion, ordenaPorLibro, recoloca, type Libro, type TipoLeccion,
} from '@/lib/catalogo-libros'
import { CambiaLecciones, ListaCatalogo } from './CatalogoShell'
import Tarjeta from './Tarjeta'

// La gramática en el orden de los libros, metida en la cabecera de la ficha:
// una etiqueta con la lección y el botón para recolocarla (solo el admin, que
// de momento es el único que ve el catálogo). El editor se abre debajo de la
// cabecera.

const CAMPO =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400'
const BOTON =
  'h-7 inline-flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:text-violet-400 transition'

function useLeccion(id: string) {
  const lista = useContext(ListaCatalogo)
  const x = lista?.find(y => y.id === id)
  const orden = useMemo(() => (lista && x ? ordenaPorLibro(lista, x.jlpt) : []), [lista, x])
  // Sin la migración 047 (o sin cargar el reparto) no hay nada que enseñar.
  if (!lista || !x || !lista.some(y => y.leccion)) return null
  const i = orden.findIndex(y => y.id === x.id)
  return { lista, x, i, total: orden.length }
}

/** El botón de recolocar, en la cabecera. */
export function LeccionNav({ onRecolocar, id }: { id: string; onRecolocar: () => void }) {
  if (!useLeccion(id)) return null
  return (
    <button type="button" onClick={onRecolocar} className={`${BOTON} shrink-0 px-2 text-[11px] font-semibold`}>
      Recolocar
    </button>
  )
}

/** La lección del libro, como una etiqueta más de la cabecera. */
export function LeccionPill({ id }: { id: string }) {
  const l = useLeccion(id)
  if (!l) return null
  const { x } = l
  const tipo = x.leccion_tipo ? TIPO_LECCION[x.leccion_tipo] : null
  const temas = x.leccion ? TEMAS[x.leccion] : undefined
  const app = nombreGrammarTest(x.grammar_test)
  const detalle = [
    tipo?.txt,
    x.leccion_nota,
    x.tambien && `También es un punto del ${tambien(x.tambien)}.`,
    temas?.length && `El libro enseña aquí: ${temas.join(', ')}`,
    app && `grammar-test: ${app}`,
    l.i >= 0 && `${l.i + 1} de ${l.total} del ${x.jlpt}`,
  ].filter(Boolean).join('\n')
  return (
    <span
      title={detalle}
      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-help ${tipo?.cls ?? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}
    >
      📖 {x.leccion ? nombreLeccion(x.leccion).larga : 'Sin colocar'}
    </span>
  )
}

/** El editor para recolocar, en su propia caja bajo la cabecera. */
export function LeccionEditor({ id, cerrar }: { id: string; cerrar: () => void }) {
  const l = useLeccion(id)
  if (!l) return null
  return (
    <Tarjeta kanji="本" titulo="Recolocar en los libros" className="ring-1 ring-violet-200 dark:ring-violet-800/60">
      <Editor x={l.x} lista={l.lista} cerrar={cerrar} />
    </Tarjeta>
  )
}

/** '総まとめ N3 · Semana 5, día 2' → '総まとめ N3: semana 5, día 2'. */
function tambien(leccion: string) {
  const [libro, resto] = nombreLeccion(leccion).larga.split(' · ')
  return resto ? `${libro}: ${resto.toLowerCase()}` : libro
}

function Editor({ x, lista, cerrar }: { x: CatalogoItem; lista: CatalogoItem[]; cerrar: () => void }) {
  const cambiaLecciones = useContext(CambiaLecciones)
  const libros = librosDelNivel(x.jlpt)
  const [libro, setLibro] = useState<Libro>(libroDe(x.leccion) ?? libros[0])
  const [leccion, setLeccion] = useState(x.leccion ?? leccionesDe(libro)[0])
  const [tipo, setTipo] = useState<TipoLeccion>(x.leccion_tipo ?? 'p')
  const [nota, setNota] = useState(x.leccion_nota ?? '')
  const otras = enLeccion(lista, x.jlpt, leccion, x.id)
  const [posicion, setPosicion] = useState(
    leccion === x.leccion && x.leccion_orden ? Math.min(x.leccion_orden, otras.length + 1) : otras.length + 1,
  )
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const eligeLibro = (b: Libro) => {
    setLibro(b)
    const l = leccionesDe(b)[0]
    eligeLeccion(l)
    if (b === 'w') setTipo('w')
    else if (b === 'x') setTipo('x')
    else if (tipo === 'w' || tipo === 'x') setTipo('p')
  }
  const eligeLeccion = (l: string) => {
    setLeccion(l)
    setPosicion(enLeccion(lista, x.jlpt, l, x.id).length + 1)
  }

  const guardar = async () => {
    setGuardando(true)
    setError('')
    try {
      const cambios = recoloca(lista, x, {
        leccion, leccion_tipo: tipo, leccion_nota: nota.trim() || null, posicion,
      })
      await saveCatalogoLecciones(cambios)
      cambiaLecciones(cambios)
      cerrar()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] text-slate-500">Libro</span>
          <select value={libro} onChange={e => eligeLibro(e.target.value as Libro)} className={CAMPO}>
            {libros.map(b => (
              <option key={b} value={b}>{LIBRO_NOMBRE[b]}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">Lección</span>
          <select
            value={leccion}
            onChange={e => eligeLeccion(e.target.value)}
            disabled={libro === 'w' || libro === 'x'}
            className={CAMPO}
          >
            {leccionesDe(libro).map(l => (
              <option key={l} value={l}>
                {nombreLeccion(l).corta}
                {TEMAS[l]?.[0] ? ` · ${TEMAS[l][0]}` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">Por qué va ahí</span>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoLeccion)} className={CAMPO}>
            {TIPOS_LECCION.map(t => (
              <option key={t} value={t}>{TIPO_LECCION[t].txt}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-slate-500">Sitio en la lección</span>
          <select value={posicion} onChange={e => setPosicion(+e.target.value)} className={CAMPO}>
            {Array.from({ length: otras.length + 1 }, (_, i) => (
              <option key={i} value={i + 1}>
                {i + 1}
                {i < otras.length ? ` · antes de ${otras[i].name}` : otras.length ? ' · al final' : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="text-[11px] text-slate-500">Nota</span>
        <textarea
          value={nota}
          onChange={e => setNota(e.target.value)}
          rows={2}
          placeholder="Por qué está aquí, si no es obvio"
          className={CAMPO}
        />
      </label>
      {error && <p className="text-xs text-rose-600 dark:text-rose-400">No se ha podido guardar: {error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={cerrar}
          disabled={guardando}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )
}
