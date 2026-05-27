'use client'
/**
 * AuthShell — punto único de control del layout según el estado de autenticación.
 *
 * - /login | /auth/callback → solo el contenido, sin sidebar, sin nav
 * - cargando sesión         → spinner central (sin nav nunca)
 * - sin usuario             → null mientras el router redirige a /login
 * - con usuario             → app completa con sidebar
 */
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { SidebarProvider } from '@/lib/sidebar-context'
import Nav from './Nav'
import LayoutShell from './LayoutShell'
import Tutorial from './Tutorial'

// Rutas que se muestran sin sidebar ni autenticación
const AUTH_PAGES = ['/', '/login', '/auth/callback']

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state } = useStore()
  const router = useRouter()

  // Redirigir a /login si no hay sesión en rutas protegidas
  useEffect(() => {
    if (!AUTH_PAGES.includes(pathname) && state.loaded && !state.user) {
      router.replace('/login')
    }
  }, [state.loaded, state.user, pathname, router])

  // ── Páginas de auth / landing: solo el contenido, sin shell ─────────────
  if (AUTH_PAGES.includes(pathname)) {
    return <>{children}</>
  }

  // ── Rutas protegidas: controlar visibilidad del sidebar ──────────────────
  if (!PUBLIC_PAGES.includes(pathname)) {
    // Mientras carga: spinner sin nav (nunca mostrar el sidebar antes de saber si hay sesión)
    if (!state.loaded) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="text-5xl select-none">🌸</div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      )
    }

    // Sesión cargada pero sin usuario: redirección en curso, no renderizar nada
    if (!state.user) return null
  }

  // Sin usuario: redirección en curso, no renderizar nada con sidebar
  if (!state.user) return null

  // ── App completa con sidebar ─────────────────────────────────────────────
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
