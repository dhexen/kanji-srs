'use client'
/**
 * AuthShell — punto único de control del layout según el estado de autenticación.
 *
 * Estados posibles:
 *   /login | /auth/callback  → sin sidebar, sin spinner, solo la página
 *   cargando sesión          → spinner central sin nav (nunca se muestra el sidebar a no-usuarios)
 *   cargado, sin usuario     → null (la redirección a /login está en curso)
 *   cargado, con usuario     → app completa con sidebar
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { SidebarProvider } from '@/lib/sidebar-context'
import Nav from './Nav'
import LayoutShell from './LayoutShell'
import Tutorial from './Tutorial'

// Páginas de autenticación: sin sidebar, sin AuthGuard
const AUTH_PAGES = ['/login', '/auth/callback']
// Ninguna página es accesible sin login — todas requieren autenticación
const PUBLIC_PAGES: string[] = []

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state } = useStore()
  const router = useRouter()

  // Redirigir a /login cuando no hay sesión y la ruta lo requiere
  useEffect(() => {
    const needsAuth = !AUTH_PAGES.includes(pathname) && !PUBLIC_PAGES.includes(pathname)
    if (state.loaded && !state.user && needsAuth) {
      router.replace('/login')
    }
  }, [state.loaded, state.user, pathname, router])

  // ── Páginas de auth (login / callback): solo el contenido, sin shell ────
  if (AUTH_PAGES.includes(pathname)) {
    return <>{children}</>
  }

  // ── Rutas protegidas: controlar visibilidad del sidebar ──────────────────
  if (!PUBLIC_PAGES.includes(pathname)) {
    // Mientras carga: spinner sin nav (nunca mostrar el sidebar antes de saber si hay sesión)
    if (!state.loaded) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">
          <div className="text-5xl select-none">🌸</div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      )
    }

    // Sesión cargada pero sin usuario: redirección en curso, no renderizar nada
    if (!state.user) return null
  }

  // ── App completa con sidebar (usuario autenticado o ruta pública) ────────
  return (
    <SidebarProvider>
      <Tutorial />
      <Nav />
      <LayoutShell>
        {children}
      </LayoutShell>
    </SidebarProvider>
  )
}
