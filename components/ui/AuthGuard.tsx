'use client'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { usePathname, useRouter } from 'next/navigation'
import { ReactNode } from 'react'
import { t } from '@/lib/i18n'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { state } = useStore()
  const pathname = usePathname()
  const router = useRouter()
  const lang = state.lang

  // /stats es accesible sin login (estadísticas públicas)
  if (pathname === '/stats') return <>{children}</>

  // Cuando la sesión está cargada y no hay usuario, redirigir a /login
  useEffect(() => {
    if (state.loaded && !state.user) {
      router.replace('/login')
    }
  }, [state.loaded, state.user, router])

  // Spinner mientras se carga la sesión
  if (!state.loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4" />
        <p className="text-sm font-medium">{t(lang, 'auth_loading')}</p>
      </div>
    )
  }

  // Sin usuario: la redirección ya está en marcha (useEffect), no renderizar nada
  if (!state.user) return null

  return <>{children}</>
}
