'use client'
interface Props { onBack: () => void; isPractice: boolean; total: number }
export default function SessionComplete({ onBack, isPractice, total }: Props) {
  return (
    <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Sesión completada!</h2>
      <p className="text-slate-500 mb-6">
        {isPractice ? `Has practicado ${total} tarjetas.` : `Has repasado ${total} tarjetas. El SRS ha guardado tu progreso.`}
      </p>
      <button onClick={onBack} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md">
        Volver al selector de modos
      </button>
    </div>
  )
}
