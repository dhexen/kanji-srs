'use client'
import type { ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { CARD_INFO, pick4, type CardId } from '@/lib/dashboard'

// El marco de todas las tarjetas del dashboard: un kanji grande y transparente
// de fondo, el nombre en japonés encima del título y las cuatro esquinas
// marcadas en el color de la tarjeta.
//
// El título sale de CARD_INFO, el mismo que se ve al añadir tarjetas, así que
// el nombre es siempre el mismo en los dos sitios.

// Clases enteras, para que Tailwind las encuentre al compilar.
const COLOR = {
  violet: { text: 'text-violet-600 dark:text-violet-400', corner: 'border-violet-500 dark:border-violet-400' },
  sky: { text: 'text-sky-600 dark:text-sky-400', corner: 'border-sky-500 dark:border-sky-400' },
  fuchsia: { text: 'text-fuchsia-600 dark:text-fuchsia-400', corner: 'border-fuchsia-500 dark:border-fuchsia-400' },
  indigo: { text: 'text-indigo-600 dark:text-indigo-400', corner: 'border-indigo-500 dark:border-indigo-400' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', corner: 'border-emerald-500 dark:border-emerald-400' },
  pink: { text: 'text-pink-600 dark:text-pink-400', corner: 'border-pink-500 dark:border-pink-400' },
  teal: { text: 'text-teal-600 dark:text-teal-400', corner: 'border-teal-500 dark:border-teal-400' },
  amber: { text: 'text-amber-600 dark:text-amber-400', corner: 'border-amber-500 dark:border-amber-400' },
  rose: { text: 'text-rose-600 dark:text-rose-400', corner: 'border-rose-500 dark:border-rose-400' },
  yellow: { text: 'text-yellow-600 dark:text-yellow-400', corner: 'border-yellow-500 dark:border-yellow-400' },
  orange: { text: 'text-orange-600 dark:text-orange-400', corner: 'border-orange-500 dark:border-orange-400' },
}

// El kanji de fondo de cada tarjeta y su color.
const ESTILO: Record<CardId, { kan: string; color: keyof typeof COLOR }> = {
  today: { kan: '今', color: 'violet' },     // hoy
  forecast: { kan: '週', color: 'sky' },     // semana
  modes: { kan: '式', color: 'fuchsia' },    // forma, modo
  sections: { kan: '門', color: 'indigo' },  // puerta
  quickAdd: { kan: '新', color: 'emerald' }, // nuevo
  stages: { kan: '級', color: 'pink' },      // nivel
  summary: { kan: '数', color: 'teal' },     // número
  xp: { kan: '経', color: 'amber' },         // experiencia
  jlpt: { kan: '試', color: 'rose' },        // examen
  ranking: { kan: '賞', color: 'yellow' },   // premio
  kana: { kan: '仮', color: 'orange' },      // el 仮 de 仮名
}

export default function DashCard({
  id, sub, right, tutorialId, children,
}: {
  id: CardId
  /** Una línea gris bajo el título. */
  sub?: ReactNode
  /** Lo que va a la derecha del título (un número, un enlace…). */
  right?: ReactNode
  tutorialId?: string
  children: ReactNode
}) {
  const lang = useStore().state.lang
  const info = CARD_INFO[id]
  const { kan, color } = ESTILO[id]
  const c = COLOR[color]
  const esquina = `absolute w-5 h-5 ${c.corner} pointer-events-none`

  return (
    <div
      {...(tutorialId ? { 'data-tutorial-id': tutorialId } : {})}
      className="relative overflow-hidden min-w-0 flex flex-col bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm"
    >
      <span className={`${esquina} top-2 left-2 border-t-2 border-l-2 rounded-tl-lg`} />
      <span className={`${esquina} top-2 right-2 border-t-2 border-r-2 rounded-tr-lg`} />
      <span className={`${esquina} bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg`} />
      <span className={`${esquina} bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg`} />
      <span
        aria-hidden="true"
        className={`kanji-font absolute -right-2 -top-7 text-[7.5rem] leading-none ${c.text} opacity-[0.09] select-none pointer-events-none`}
      >
        {kan}
      </span>

      <div className="relative mb-4 flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* En japonés el título ya lo dice: no se repite. */}
          {lang !== 'ja' && <p className={`kanji-font text-sm ${c.text}`}>{info.title.ja}</p>}
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight">{pick4(info.title, lang)}</h3>
          {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
        </div>
        {right && <div className="shrink-0 pt-1">{right}</div>}
      </div>

      <div className="relative flex-1 flex flex-col">{children}</div>
    </div>
  )
}
