// Una caja de la ficha del catálogo, como las tarjetas del dashboard: sin
// borde, con sombra y un kanji grande y desvaído de fondo.

const COLOR = {
  violet: 'text-violet-500',
  sky: 'text-sky-500',
  emerald: 'text-emerald-500',
  amber: 'text-amber-500',
  rose: 'text-rose-500',
} as const

export default function Tarjeta({
  kanji, titulo, color = 'violet', className = '', children,
}: {
  kanji: string
  titulo?: string
  color?: keyof typeof COLOR
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={`relative overflow-hidden min-w-0 bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm ${className}`}>
      <span
        aria-hidden
        className={`kanji-font absolute -right-2 -top-7 text-[7.5rem] leading-none ${COLOR[color]} opacity-[0.09] select-none pointer-events-none`}
      >
        {kanji}
      </span>
      {titulo && (
        <p className="relative text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{titulo}</p>
      )}
      <div className="relative">{children}</div>
    </section>
  )
}
