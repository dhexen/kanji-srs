'use client'
import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { SidebarProvider } from '@/lib/sidebar-context'
import { HelpProvider } from '@/lib/help-context'
import Nav from './Nav'
import LayoutShell from './LayoutShell'
import HelpDrawer from './HelpDrawer'
import OnboardingTour from '@/components/onboarding/OnboardingTour'

// Páginas de autenticación: sin sidebar, sin AuthGuard
const AUTH_PAGES = ['/login', '/auth/callback', '/guia-usuario']
// Páginas accesibles sin login (con sidebar si hay sesión, sin sidebar si no)
const PUBLIC_PAGES = ['/stats']

export default function AuthShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { state } = useStore()
  const router = useRouter()

  useEffect(() => {
    const needsAuth = !AUTH_PAGES.includes(pathname) && !PUBLIC_PAGES.includes(pathname)
    if (state.loaded && !state.user && needsAuth) {
      router.replace('/login')
    }
  }, [state.loaded, state.user, pathname, router])

  // ── Auth pages: just the content, no shell ───────────────────────────────
  if (AUTH_PAGES.includes(pathname)) {
    return <>{children}</>
  }

  // ── Protected routes ─────────────────────────────────────────────────────
  if (!PUBLIC_PAGES.includes(pathname)) {
    if (!state.loaded) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
          <div className="text-5xl select-none">🌸</div>
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
        </div>
      )
    }
    if (!state.user) return null
  }

  // ── Full app with sidebar ────────────────────────────────────────────────
  return (
    <SidebarProvider>
      <HelpProvider>
        <Nav />
        <LayoutShell>
          {children}
        </LayoutShell>
        <HelpDrawer />
        <OnboardingTour />
      </HelpProvider>
    </SidebarProvider>
  )
}
