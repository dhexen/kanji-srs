'use client'
import { useStore } from '@/lib/store'
import { ReactNode } from 'react'
import Link from 'next/link'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { state } = useStore()

  // Still checking session
  if (!state.loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-medium">Cargando sesión...</p>
      </div>
    )
  }

  // No session
  if (!state.user) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md mx-auto mt-8">
        <div className="text-6xl mb-4">🌸</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">小学校漢字 SRS</h2>
        <p className="text-slate-500 mb-6 text-sm">
          Inicia sesión o crea una cuenta para acceder a tu progreso.
          Tu vocabulario y nivel SRS se guardan en la nube.
        </p>
        <Link href="/stats"
          className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md">
          Iniciar sesión / Crear cuenta
        </Link>
      </div>
    )
  }

  // Session active — show content
  return <>{children}</>
}
