'use client'
/**
 * AuthShell
 *
 * Wrapper condicional del layout principal.
 *
 * - En /login y /auth/callback: renderiza solo los children (sin sidebar,
 *   sin header, sin AuthGuard). El usuario ve una página limpia de login.
 * - En el resto de rutas: renderiza el sidebar completo + AuthGuard.
 */
import { usePathname } from 'next/navigation'
import { SidebarProvider } from '@/lib/sidebar-context'
import Nav from './Nav'
import LayoutShell from './LayoutShell'
import AuthGuard from './AuthGuard'
import Tutorial from './Tutorial'

// Rutas que no necesitan el shell de navegación ni autenticación
const SHELL_EXCLUDED = ['/login', '/auth/callback']

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  if (SHELL_EXCLUDED.includes(pathname)) {
    // Página de autenticación: sin sidebar, sin headers
    return <>{children}</>
  }

  // Páginas normales: sidebar + auth guard
  return (
    <SidebarProvider>
      <Tutorial />
      <Nav />
      <LayoutShell>
        <AuthGuard>
          {children}
        </AuthGuard>
      </LayoutShell>
    </SidebarProvider>
  )
}
