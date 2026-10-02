'use client'
import { Fragment } from 'react'
import { esNota, type Uso, type UsoCelda, type UsoSeg, type UsoTrozo } from '@/lib/catalogo'

// El recuadro de «Cómo se usa»: la estructura que pide la gramática.
//
// La regla: el japonés NO se parte nunca (lo más largo del catálogo son 32 de
// ancho, que caben), y el español sí, porque es prosa.

const PASTILLA = 'bg-violet-50 dark:bg-violet-900/30 text-slate-800 dark:text-slate-100 rounded-md whitespace-nowrap'

function Tramos({ segs }: { segs: UsoSeg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.s ? (
          <s key={i} className="text-slate-400 decoration-rose-400">{s.txt}</s>
        ) : (
          <span key={i}>{s.txt}</span>
        ),
      )}
    </>
  )
}

// En una celda mezclada el japonés va en su pastilla y el español alrededor.
function Mixto({ segs }: { segs: UsoSeg[] }) {
  return (
    <>
      {segs.map((s, i) =>
        s.ja ? (
          <span key={i} className={`${PASTILLA} text-sm px-1.5 py-px`}>
            {s.s ? <s>{s.txt}</s> : s.txt}
          </span>
        ) : (
          <span key={i}>{s.txt}</span>
        ),
      )}
    </>
  )
}

function Trozo({ trozo }: { trozo: UsoTrozo }) {
  if (trozo.t === 'mixto') {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400 min-w-0">
        {trozo.alts.map((segs, i) => (
          <span className="block" key={i}>
            <Mixto segs={segs} />
          </span>
        ))}
      </span>
    )
  }
  if (trozo.t === 'lado') {
    return (
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {trozo.alts.map((segs, i) => (
          <span className="block" key={i}>
            <Tramos segs={segs} />
          </span>
        ))}
      </span>
    )
  }
  return (
    <span className="flex flex-col gap-0.5">
      {trozo.alts.map((segs, i) => (
        <span key={i} className={`${PASTILLA} kanji-font text-[15px] font-medium px-2 py-0.5`}>
          <Tramos segs={segs} />
        </span>
      ))}
    </span>
  )
}

function Celda({ celda }: { celda: UsoCelda }) {
  if (!Array.isArray(celda)) return <Trozo trozo={celda} />
  // Lo que la web apilaba con rowspan: un solo hueco y varias gramáticas.
  return (
    <span className="flex flex-col gap-1">
      {celda.map((tr, i) => (
        <Trozo trozo={tr} key={i} />
      ))}
    </span>
  )
}

export default function CatalogoUso({ uso }: { uso: Uso }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3">
      {uso.map((fila, i) => (
        <div
          key={i}
          className="flex flex-wrap items-center gap-2 py-2 first:pt-0 last:pb-0 border-b border-dashed border-slate-200 dark:border-slate-700 last:border-0"
        >
          {esNota(fila) ? (
            <span className="text-xs italic text-slate-500 dark:text-slate-400 leading-relaxed">{fila.nota}</span>
          ) : (
            fila.celdas.map((c, j) => (
              <Fragment key={j}>
                {j > 0 && <span className="text-xs text-slate-400">＋</span>}
                <Celda celda={c} />
              </Fragment>
            ))
          )}
        </div>
      ))}
    </div>
  )
}
