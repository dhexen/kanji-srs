import type { Jlpt } from '@/lib/catalogo'

// Lo que se ve al entrar en un nivel sin haber elegido gramática.
export default function CatalogoVacio({ jlpt }: { jlpt: Jlpt }) {
  return (
    <div className="hidden lg:flex flex-col items-center justify-center text-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 p-10 min-h-[300px]">
      <span className="text-4xl">📖</span>
      <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">Gramática del {jlpt}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">
        Elige una gramática de la lista. Aquí solo se mira y se practica: nada de esto cuenta para el SRS.
      </p>
    </div>
  )
}
