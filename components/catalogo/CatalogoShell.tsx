'use client'
import { useEffect, useMemo, useState } from 'react'
import { useSelectedLayoutSegment } from 'next/navigation'
import { fetchCatalogoLista, type CatalogoItem, type Jlpt } from '@/lib/catalogo'
import CatalogoRail from './CatalogoRail'

// El armazón de /catalogo/[nivel]: la lista a la izquierda y la ficha a la
// derecha. Vive en el layout, así que al cambiar de ficha la lista no se vuelve
// a pedir ni pierde el sitio por el que ibas.
//
// En el móvil no caben las dos: con una ficha abierta se ve solo la ficha (con
// un enlace para volver a la lista).

export default function CatalogoShell({ jlpt, children }: { jlpt: Jlpt; children: React.ReactNode }) {
  const [lista, setLista] = useState<CatalogoItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let vivo = true
    fetchCatalogoLista()
      .then(l => { if (vivo) setLista(l) })
      .catch(e => { if (vivo) setError(e instanceof Error ? e.message : String(e)) })
    return () => { vivo = false }
  }, [])

  // Cuál está abierta, sacado de la URL. Viene escapado (los slugs llevan
  // japonés), así que se deshace antes de compararlo.
  const segmento = useSelectedLayoutSegment()
  const abierta = useMemo(() => {
    if (!segmento) return null
    try {
      return decodeURIComponent(segmento)
    } catch {
      return segmento
    }
  }, [segmento])

  return (
    <div className="space-y-4">
      <div className={abierta ? 'hidden lg:block' : ''}>
        <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
          Catálogo de gramática
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            Admin
          </span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Todas las gramáticas del JLPT, del N5 al N1, con sus ejemplos para practicar.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 dark:border-rose-800/50 bg-rose-50 dark:bg-rose-900/20 p-4 text-sm text-rose-700 dark:text-rose-300">
          No se ha podido cargar el catálogo: {error}
          <p className="text-xs mt-1 opacity-80">
            ¿Se ha corrido la migración 045_catalogo.sql y copiado los datos con scripts/copiar-catalogo.mjs?
          </p>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)] items-start">
          <div className={abierta ? 'hidden lg:block' : ''}>
            {lista ? (
              <CatalogoRail jlpt={jlpt} lista={lista} abierta={abierta} />
            ) : (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-violet-600" />
              </div>
            )}
          </div>
          <div className="min-w-0">{children}</div>
        </div>
      )}
    </div>
  )
}
