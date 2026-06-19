'use client'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { useSidebar } from '@/lib/sidebar-context'
import { useHelp } from '@/lib/help-context'
import ThemeToggle from './ThemeToggle'
import FeedbackModal from './FeedbackModal'
import { useState, useEffect, useRef } from 'react'
import { fetchPendingReportsCount } from '@/lib/admin-client'
import { hasUnseenChanges } from '@/lib/changelog'
import { t } from '@/lib/i18n'
import WhatsNewModal from './WhatsNewModal'

function stripEmoji(label: string) {
  return label.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[☀-➿️]\s*/u, '')
}

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

export default function Header() {
  const { state, logout, setSimulatedRole } = useStore()
  const { toggle } = useSidebar()
  const help = useHelp()
  const lang = state.lang
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [pendingReports, setPendingReports] = useState(0)
  const [whatsNewOpen, setWhatsNewOpen] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const adminRef = useRef<HTMLDivElement>(null)

  const user = state.user
  const initial = (user?.email?.[0] ?? '?').toUpperCase()
  const isRealAdmin = state.role === 'admin'

  // Close dropdowns on outside click
  useEffect(() => {
    if (!menuOpen && !adminOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
      if (adminRef.current && !adminRef.current.contains(e.target as Node)) setAdminOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen, adminOpen])

  // Admin menu, grouped so it isn't a long flat list.
  const adminGroups: { title: string; items: { href: string; icon: string; label: string }[] }[] = [
    { title: 'Gestión', items: [
      { href: '/admin?tab=users', icon: '👥', label: 'Usuarios' },
    ] },
    { title: 'Contenido', items: [
      { href: '/admin?tab=vocab',  icon: '📚', label: 'Vocabulario' },
      { href: '/admin?tab=images', icon: '✨', label: 'Clasificación e imágenes' },
      { href: '/admin/seed-grammar', icon: '🌱', label: 'Frases de gramática' },
      { href: '/admin/grammar-refresh', icon: '🔄', label: 'Renovación de frases' },
    ] },
    { title: 'Revisión', items: [
      { href: '/admin?tab=feedback', icon: '🐛', label: 'Reportes y feedback' },
    ] },
    { title: 'Sistema', items: [
      { href: '/admin?tab=system', icon: '⚙️', label: 'Configuración del sistema' },
    ] },
  ]

  const profileItems = [
    { href: '/stats?tab=stats',    icon: '📊', label: stripEmoji(t(lang, 'stats_tab_stats')) },
    { href: '/stats?tab=reports',  icon: '🎫', label: 'Mis reportes' },
    { href: '/stats?tab=settings', icon: '⚙️', label: stripEmoji(t(lang, 'stats_tab_settings')) },
    { href: '/stats?tab=account',  icon: '👤', label: stripEmoji(t(lang, 'stats_tab_account')) },
  ]

  // Check for unseen changelog entries and auto-open once per version
  useEffect(() => {
    if (!user) return
    const unseen = hasUnseenChanges()
    setHasUnseen(unseen)
    if (unseen) setWhatsNewOpen(true)
  }, [user])

  // Poll the count of open reports for the admin badge
  useEffect(() => {
    if (!isRealAdmin) { setPendingReports(0); return }
    let cancelled = false
    const load = () => fetchPendingReportsCount()
      .then(c => { if (!cancelled) setPendingReports(c.total) })
      .catch(() => {})
    load()
    const id = setInterval(load, 60_000)  // refresh every minute
    return () => { cancelled = true; clearInterval(id) }
  }, [isRealAdmin])

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-violet-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-2.5">

          {/* Hamburger */}
          <button
            type="button"
            onClick={toggle}
            aria-label="Abrir/cerrar menú"
            data-sidebar-toggle="true"
            className="p-1.5 -ml-1 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition shrink-0"
          >
            <HamburgerIcon />
          </button>

          {/* Logo */}
          <Link
            href="/review"
            className="font-bold text-xl text-violet-700 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors select-none shrink-0"
          >
            栞
          </Link>

          <div className="flex-1" />

          {/* Pending writes indicator */}
          {state.pendingWrites > 0 && (
            <span className="hidden sm:flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/50 px-2 py-1 rounded-full">
              ⏳ {state.pendingWrites}
            </span>
          )}

          {/* Syncing indicator */}
          {state.syncing && (
            <span className="text-violet-400 animate-pulse text-xs hidden sm:inline">Sincronizando…</span>
          )}

          {/* Admin menu (real admins only) */}
          {isRealAdmin && (
            <div ref={adminRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setAdminOpen(s => !s)}
                aria-label="Administración"
                aria-expanded={adminOpen}
                className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all"
              >
                <span>🔧</span>
                <span className="hidden md:inline">Admin</span>
                {pendingReports > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white dark:border-slate-900 tabular-nums">
                    {pendingReports > 9 ? '9+' : pendingReports}
                  </span>
                )}
              </button>

              {adminOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50 py-1">
                  <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">🔧 Administración</p>
                  {adminGroups.map(group => (
                    <div key={group.title} className="py-1 border-t border-slate-100 dark:border-slate-700 first:border-t-0">
                      <p className="px-3 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{group.title}</p>
                      {group.items.map(item => (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setAdminOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-slate-700/60 transition-colors"
                        >
                          <span className="w-5 text-center shrink-0">{item.icon}</span>
                          <span className="truncate">{item.label}</span>
                          {item.href.includes('tab=feedback') && pendingReports > 0 && (
                            <span className="ml-auto min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold tabular-nums">{pendingReports > 9 ? '9+' : pendingReports}</span>
                          )}
                        </Link>
                      ))}
                    </div>
                  ))}
                  {/* Role simulation */}
                  <div className="py-1 border-t border-slate-100 dark:border-slate-700">
                    <p className="px-3 py-0.5 text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">👁 Simular rol</p>
                    <div className="flex gap-1 px-3 py-1.5">
                      {(['admin', 'contributor', 'user'] as const).map(role => {
                        const active = state.simulatedRole === role || (!state.simulatedRole && role === state.role)
                        const isCurrentReal = !state.simulatedRole && role === state.role
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => setSimulatedRole(isCurrentReal ? null : role)}
                            className={`flex-1 px-2 py-1 rounded-lg text-[11px] font-semibold capitalize transition ${
                              active ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {role === 'user' ? 'Usuario' : role === 'contributor' ? 'Contrib.' : 'Admin'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* User menu */}
          {user ? (
            <div ref={menuRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen(s => !s)}
                aria-label="Menú de usuario"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-violet-50 dark:hover:bg-slate-800 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-7 h-7 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-bold text-xs select-none">
                    {initial}
                  </div>
                  <span
                    title={state.isOnline ? 'Online' : 'Sin conexión'}
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${state.isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}
                  />
                  {isRealAdmin && pendingReports > 0 && (
                    <span
                      title={`${pendingReports} reporte(s) pendiente(s)`}
                      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold border-2 border-white dark:border-slate-900 tabular-nums"
                    >
                      {pendingReports > 9 ? '9+' : pendingReports}
                    </span>
                  )}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-slate-700 dark:text-slate-200 max-w-[140px] truncate">
                  {user.email}
                </span>
                <svg className={`hidden sm:block w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                    <p className={`text-[10px] mt-0.5 font-medium ${state.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {state.isOnline ? '● Online' : '● Sin conexión'}
                    </p>
                  </div>
                  {profileItems.map(item => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-700/60 transition-colors"
                    >
                      <span className="w-5 text-center shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={async () => { setMenuOpen(false); await logout() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 border-t border-slate-100 dark:border-slate-700 transition-colors"
                  >
                    <span className="w-5 text-center shrink-0">🚪</span>
                    <span className="truncate">{t(lang, 'stats_logout')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline px-2 py-1"
            >
              Iniciar sesión
            </Link>
          )}

          {/* What's new */}
          {user && (
            <button
              type="button"
              onClick={() => { setWhatsNewOpen(true); setHasUnseen(false) }}
              title="Novedades"
              aria-label="Novedades"
              className="relative flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all shrink-0"
            >
              <span>🚀</span>
              <span className="hidden md:inline">Novedades</span>
              {hasUnseen && (
                <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500 border border-white dark:border-slate-900" />
              )}
            </button>
          )}

          {/* Help */}
          <button
            type="button"
            onClick={help.toggle}
            title="Ayuda de esta sección"
            aria-label="Ayuda"
            className="w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold text-slate-400 dark:text-slate-500 hover:bg-violet-100 dark:hover:bg-violet-900/40 hover:text-violet-600 dark:hover:text-violet-400 transition-all shrink-0 border border-slate-200 dark:border-slate-700"
          >
            ?
          </button>

          {/* Feedback */}
          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            title="Reportar incidencia o mejora"
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-400 dark:text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition-all shrink-0"
          >
            <span>🐛</span>
            <span className="hidden md:inline">Reportar</span>
          </button>

          <ThemeToggle />
        </div>
      </header>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      {whatsNewOpen && (
        <WhatsNewModal onClose={() => { setWhatsNewOpen(false); setHasUnseen(false) }} />
      )}
    </>
  )
}
