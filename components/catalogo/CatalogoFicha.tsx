'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  NIVEL_PILL, explicacionPropia, fetchCatalogoFicha,
  type CatalogExample, type CatalogTopic, type Jlpt,
} from '@/lib/catalogo'
import CatalogoUso from './CatalogoUso'
import CatalogoExplicacionIA from './CatalogoExplicacionIA'
import { Borrosa, Ejes, Escribe, Piezas, piezasEs, type Como, type Dir } from './Practicar'

// Una gramática del catálogo: lo que quiere decir, la explicación de la ficha
// original (o la de Gemini si no trae), el «Cómo se usa» y las frases de
// ejemplo con sus cuatro maneras de practicarlas.

const CAJA = 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4'
const TITULO = 'text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2'

export default function CatalogoFicha({ jlpt, slug }: { jlpt: Jlpt; slug: string }) {
  const [datos, setDatos] = useState<{ topic: CatalogTopic; frases: CatalogExample[] } | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'lista' | 'no-existe' | 'error'>('cargando')
  const [error, setError] = useState('')

  useEffect(() => {
    let vivo = true
    setEstado('cargando')
    fetchCatalogoFicha(jlpt, slug)
      .then(d => {
        if (!vivo) return
        setDatos(d)
        setEstado(d ? 'lista' : 'no-existe')
      })
      .catch(e => {
        if (!vivo) return
        setError(e instanceof Error ? e.message : String(e))
        setEstado('error')
      })
    return () => { vivo = false }
  }, [jlpt, slug])

  const volver = (
    <Link
      href={`/catalogo/${jlpt.toLowerCase()}`}
      className="lg:hidden inline-flex items-center gap-1 text-sm font-medium text-violet-600 dark:text-violet-400 mb-3"
    >
      ← Lista del {jlpt}
    </Link>
  )

  if (estado === 'cargando') {
    return (
      <>
        {volver}
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
        </div>
      </>
    )
  }
  if (estado !== 'lista' || !datos) {
    return (
      <>
        {volver}
        <div className={`${CAJA} text-sm text-slate-500`}>
          {estado === 'no-existe' ? 'Esta gramática no está en el catálogo.' : `No se ha podido cargar: ${error}`}
        </div>
      </>
    )
  }

  // Al cambiar de gramática la ficha empieza de cero (modo y piezas incluidos).
  return (
    <>
      {volver}
      <Ficha key={datos.topic.id} topic={datos.topic} frases={datos.frases} />
    </>
  )
}

function Ficha({ topic, frases }: { topic: CatalogTopic; frases: CatalogExample[] }) {
  const [dir, setDir] = useState<Dir>('ja-es')
  const [como, setComo] = useState<Como>('ver')

  // Sin el reclamo de la web; null si no queda explicación de verdad.
  const explicacion = useMemo(() => explicacionPropia(topic.explicacion_html), [topic.explicacion_html])

  return (
    <div className="space-y-4">
      {/* Cabecera */}
      <div className={CAJA}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="kanji-font text-2xl text-slate-800 dark:text-slate-100 leading-snug">{topic.name}</h2>
            {topic.gloss_es && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{topic.gloss_es}</p>}
          </div>
          <span className={`shrink-0 text-xs font-bold px-2 py-0.5 rounded-full ${NIVEL_PILL[topic.jlpt]}`}>{topic.jlpt}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
            {topic.jlpt} · <span className="tabular-nums">#{topic.position}</span>
          </span>
          {topic.romaji && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
              {topic.romaji}
            </span>
          )}
          {!!frases.length && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300">
              <span className="tabular-nums">{frases.length}</span> ejemplos
            </span>
          )}
          <a
            href={topic.source_url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-600 text-slate-400 hover:text-violet-600 hover:border-violet-300 dark:hover:text-violet-400 transition"
          >
            Ficha original ↗
          </a>
        </div>
      </div>

      {/* Explicación y «Cómo se usa»: lado a lado cuando hay sitio */}
      <div className={`grid gap-4 items-start ${topic.uso ? 'xl:grid-cols-[minmax(0,1fr)_fit-content(400px)]' : ''}`}>
        <section className={CAJA}>
          <p className={TITULO}>Explicación</p>
          {explicacion ? (
            // El HTML lo dejó limpio el script de Hellotalk que baja las fichas:
            // lista de etiquetas permitidas y sin atributos (solo unas clases).
            <div className="catalogo-expl" dangerouslySetInnerHTML={{ __html: explicacion }} />
          ) : (
            <CatalogoExplicacionIA topic={topic} />
          )}
        </section>

        {topic.uso && (
          <section className={`${CAJA} xl:min-w-[280px]`}>
            <p className={TITULO}>Cómo se usa</p>
            <CatalogoUso uso={topic.uso} />
          </section>
        )}
      </div>

      {/* Ejemplos y práctica */}
      {!!frases.length && (
        <section className={`${CAJA} space-y-3`}>
          <p className={TITULO}>Ejemplos</p>
          <Ejes dir={dir} setDir={setDir} como={como} setComo={setComo} />
          <div>
            {frases.map(f => (
              // La clave lleva el ejercicio: al cambiar de modo la frase empieza de cero.
              <Frase key={`${f.id}-${dir}-${como}`} f={f} dir={dir} como={como} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// ── Una frase, en el ejercicio que toque ─────────────────────────────────────
function Frase({ f, dir, como }: { f: CatalogExample; dir: Dir; como: Como }) {
  // Lo que tienes que sacar, y cómo se compara: el español palabra a palabra,
  // el japonés carácter a carácter.
  const meta = dir === 'ja-es' ? (f.text_es ?? '') : f.text_ja
  const modoDiff = dir === 'ja-es' ? 'word' : 'char'

  // Antes de los returns: si no, cada pintada rebarajaría el banco de piezas.
  const piezas = useMemo(
    () => (dir === 'ja-es' ? piezasEs(f.text_es) : (f.piezas ?? [])),
    [dir, f.text_es, f.piezas],
  )

  const japones = (
    <span className="flex flex-col gap-0.5">
      <span className="text-lg leading-relaxed text-slate-800 dark:text-slate-100">{f.text_ja}</span>
      {f.romaji && <span className="text-xs text-slate-400 dark:text-slate-500">{f.romaji}</span>}
    </span>
  )
  const espanol = (grande: boolean) => (
    <span
      className={`flex items-baseline gap-2 ${
        grande ? 'text-base text-slate-700 dark:text-slate-200' : 'text-sm text-slate-500 dark:text-slate-400'
      }`}
    >
      <span>{f.text_es}</span>
      <Trad origen={f.origen} />
    </span>
  )

  // El lado de partida, el que se ve siempre. En la dirección española el
  // romaji es parte de la respuesta, así que no puede asomar.
  const partida = dir === 'ja-es' ? japones : espanol(true)
  const fila = 'flex flex-col py-3 border-b border-slate-200/70 dark:border-slate-700/70 last:border-0 last:pb-0 first:pt-1'

  if (como === 'ver') {
    return (
      <div className={`${fila} gap-1`}>
        {partida}
        {dir === 'ja-es' ? espanol(false) : japones}
      </div>
    )
  }

  if (como === 'tapado') {
    return (
      <div className={`${fila} gap-1`}>
        {partida}
        {dir === 'ja-es' ? (
          <span className="flex items-baseline gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Borrosa etiqueta="Ver la traducción">{f.text_es}</Borrosa>
            <Trad origen={f.origen} />
          </span>
        ) : (
          <Borrosa etiqueta="Ver la frase en japonés">{japones}</Borrosa>
        )}
      </div>
    )
  }

  if (como === 'piezas') {
    return (
      <div className={`${fila} gap-2.5`}>
        {partida}
        {piezas.length ? (
          <Piezas piezas={piezas} correcta={meta} modo={modoDiff} />
        ) : (
          <p className="text-xs text-slate-400">Esta frase no se puede montar por piezas.</p>
        )}
      </div>
    )
  }

  return (
    <div className={`${fila} gap-2.5`}>
      {partida}
      <Escribe
        correcta={meta}
        modo={modoDiff}
        pista={dir === 'ja-es' ? 'Escribe la frase en español…' : 'Escribe la frase en japonés…'}
      />
    </div>
  )
}

// De dónde salió el español, solo cuando no salió de la ficha original.
function Trad({ origen }: { origen: string }) {
  if (origen !== 'traducido') return null
  return (
    <span
      className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 cursor-help"
      title="La ficha original traía esta frase en inglés. La traducción al español es automática."
    >
      trad
    </span>
  )
}
