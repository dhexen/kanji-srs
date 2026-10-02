'use client'
import { Fragment } from 'react'
import { resalta } from '@/lib/catalogo-buscar'

/** Un texto con lo que se está buscando marcado por dentro. */
export default function Marca({ texto, trozos }: { texto: string; trozos: string[] }) {
  if (!trozos.length || !texto) return <>{texto}</>
  return (
    <>
      {resalta(texto, trozos).map((p, i) =>
        p.marca ? (
          <mark key={i} className="bg-amber-200/80 dark:bg-amber-500/30 text-inherit rounded-sm">
            {p.txt}
          </mark>
        ) : (
          <Fragment key={i}>{p.txt}</Fragment>
        ),
      )}
    </>
  )
}
