'use client'
import { useContext, useMemo, useState } from 'react'
import Link from 'next/link'
import { saveCatalogoLecciones, urlDeFicha, type CatalogoItem } from '@/lib/catalogo'
import {
  LIBRO_NOMBRE, TEMAS, TIPOS_LECCION, TIPO_LECCION, enLeccion, leccionesDe, libroDe, librosDelNivel,
  nombreGrammarTest, nombreLeccion, ordenaPorLibro, recoloca, type Libro, type TipoLeccion,
} from '@/lib/catalogo-libros'
import { CambiaLecciones, ListaCatalogo } from './CatalogoShell'

// En qué lección de los libros se estudia esta gramática, lo que enseña el
// libro ahí, y la anterior y la siguiente en ese orden. Desde aquí se recoloca:
// otra lección, otro tipo, otro sitio dentro de la lección (solo el admin, que
// de momento es el único que ve el catálogo).

const CAJA = 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4'
const TITULO = 'text-[10px] font-semibold text-slate-400 uppercase tracking-wide'
const CAMPO =
  'w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400'

export default function CatalogoLeccion({ id }: { id: string }) {
  const lista = useContext(ListaCatalogo)
  const [editando, setEditando] = useState(false)

  const x = lista?.find(y => y.id === id)
  const orden = useMemo(() => (lista && x ? ordenaPorLibro(lista, x.jlpt) : []), [lista, x])
  // Sin la migración 047 (o sin cargar el reparto) no hay nada que enseñar.
  if (!lista || !x || !lista.some(y => y.leccion)) return null

  const i = orden.findIndex(y => y.id === x.id)
  const antes = orden[i - 1]
  const despues = orden[i + 1]
  const temas = x.leccion ? TEMAS[x.leccion] : undefined
  const tipo = x.leccion_tipo ? TIPO_LECCION[x.leccion_tipo] : null
  const app = nombreGrammarTest(x.grammar_test)

  return (
    <section className={`${CAJA} space-y-3`}>
      <div className="flex items-center gap-2">
        <p className={`${TITULO} flex-1`}>En los libros</p>
        {!editando && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:text-violet-400 transition"
          >
            Recolocar
          </button>
        )}
      </div>

      {editando ? (
        <Editor x={x} lista={lista} cerrar={() => setEditando(false)} />
      ) : (
        <>
          <div>
            <p className="font-bold text-slate-800 dark:text-slate-100">
              {x.leccion ? nombreLeccion(x.leccion).larga : 'Todavía sin colocar'}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {tipo && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tipo.cls}`}>{tipo.txt}</span>}
              {app && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400">
                  grammar-test: {app}
                </span>
              )}
              {i >= 0 && (
                <span className="text-[10px] text-slate-400 tabular-nums">
                  {i + 1} de {orden.length} del {x.jlpt}
                </span>
              )}
            </div>
            {x.leccion_nota && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{x.leccion_nota}</p>}
            {x.tambien && (
              <p className="text-xs text-slate-400 mt-0.5">
                También es un punto del {tambien(x.tambien)}.
              </p>
            )}
          </div>

          {!!temas?.length && (
            <div>
              <p className={`${TITULO} mb-1.5`}>Lo que enseña el libro aquí</p>
              <div className="flex flex-wrap gap-1">
                {temas.map(t => (
                  <span
                    key={t}
                    className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(antes || despues) && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              {antes ? <Vecina y={antes} lado="antes" /> : <span />}
              {despues && <Vecina y={despues} lado="despues" />}
            </div>
          )}
        </>
      )}
    </section>
  )
}

/** '総まとめ N3 · Semana 5, día 2' → '総まとめ N3: semana 5, día 2'. */
function tambien(leccion: string) {
  const [libro, resto] = nombreLeccion(leccion).larga.split(' · ')
  return resto ? `${libro}: ${resto.toLowerCase()}` : libro
}

function Vecina({ y, lado }: { y: CatalogoItem; lado: 'antes' | 'despues' }) {
  return (
    <Link
      href={urlDeFicha(y)}
      className={`rounded-lg border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 hover:border-violet-300 dark:hover:border-violet-600 transition min-w-0 ${
        lado === 'despues' ? 'text-right col-start-2' : ''
      }`}
    >
      <span className="block text-[10px] text-slate-400">
        {lado === 'antes' ? '← Anterior' : 'Siguiente →'} · {nombreLeccion(y.leccion).corta}
      </span>
      <span className="block kanji-font text-sm text-slate-700 dark:text-slate-200 truncate">{y.name}</span>
    </Link>
  )
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
