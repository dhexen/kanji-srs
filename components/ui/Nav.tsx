'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount, ALL_REVIEW_MODES } from '@/lib/srs'
import { t } from '@/lib/i18n'
import { fetchKnownGrammar } from '@/lib/supabase'
import { useSidebar } from '@/lib/sidebar-context'
import ThemeToggle from './ThemeToggle'

const TOTAL_GRAMMAR_POINTS = 121

function stripEmoji(label: string) {
  return label.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[☀-➿️]\s*/u, '')
}

type SubItem = {
  href: string
  icon: string
  label: string
  tabKey: string
  isDefault: boolean
  badge: boolean
}

// ── ProfileMenu ───────────────────────────────────────────────────────────────
function ProfileMenu() {
  const { state } = useStore()
  const lang = state.lang
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  if (!state.user) return null

  const initial = (state.user.email?.[0] ?? '?').toUpperCase()
  const items = [
    { href: '/stats?tab=stats',    label: stripEmoji(t(lang, 'stats_tab_stats')) },
    { href: '/stats?tab=settings', label: stripEmoji(t(lang, 'stats_tab_settings')) },
    { href: '/stats?tab=account',  label: stripEmoji(t(lang, 'stats_tab_account')) },
  ]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="w-8 h-8 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-bold text-sm hover:bg-violet-700 dark:hover:bg-violet-600 transition-colors select-none"
        aria-label="Perfil"
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate">{state.user.email}</p>
          </div>
          {items.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center px-3 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-700/60 transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({
  href, icon, label, badge, tutorialId, progress, isAdmin, pathname,
}: {
  href: string
  icon: string
  label: string
  badge: number
  tutorialId?: string
  progress: number | null
  isAdmin?: boolean
  pathname: string
}) {
  const active = pathname === href
  return (
    <div>
      <Link
        href={href}
        {...(tutorialId ? { 'data-tutorial-id': tutorialId } : {})}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-sm'
            : isAdmin
            ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-700 dark:hover:text-amber-300'
            : 'text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400'
        }`}
      >
        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        {badge > 0 && (
          <span className="ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-400">
            {badge}
          </span>
        )}
      </Link>
      {progress !== null && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <div className="flex items-center gap-1.5 pl-9">
            <div className="flex-1 h-1 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (progress ?? 0) >= 80 ? 'bg-emerald-400' :
                  (progress ?? 0) >= 40 ? 'bg-violet-400' : 'bg-violet-200'
                }`}
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
            <span className="text-[10px] text-violet-400 tabular-nums w-7 text-right">{progress}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── NavSection ────────────────────────────────────────────────────────────────
function NavSection({
  icon, label, basePath, subItems, tutorialId, progress, pathname, currentTab,
}: {
  icon: string
  label: string
  basePath: string
  subItems: SubItem[]
  tutorialId?: string
  progress?: number | null
  pathname: string
  currentTab: string | null
}) {
  const isOnSection = pathname === basePath
  const [isOpen, setIsOpen] = useState(isOnSection)

  useEffect(() => {
    if (isOnSection) setIsOpen(true)
  }, [isOnSection])

  function isChildActive(tabKey: string, isDefault = false) {
    if (pathname !== basePath) return false
    if (!currentTab && isDefault) return true
    return currentTab === tabKey
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        {...(tutorialId ? { 'data-tutorial-id': tutorialId } : {})}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isOnSection
            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 shadow-sm'
            : 'text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400'
        }`}
      >
        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
        <span className="truncate flex-1 text-left">{label}</span>
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-50 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {progress !== null && progress !== undefined && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <div className="flex items-center gap-1.5 pl-9">
            <div className="flex-1 h-1 bg-violet-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progress >= 80 ? 'bg-emerald-400' :
                  progress >= 40 ? 'bg-violet-400' : 'bg-violet-200'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-violet-400 tabular-nums w-7 text-right">{progress}%</span>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="ml-4 pl-3 border-l border-violet-100 dark:border-slate-700 space-y-0.5 mt-0.5 mb-1">
          {subItems.map(child => (
            <Link
              key={child.href}
              href={child.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isChildActive(child.tabKey, child.isDefault)
                  ? 'bg-violet-100/80 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300'
                  : 'text-slate-400 dark:text-slate-500 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              <span className="text-sm w-4 text-center shrink-0">{child.icon}</span>
              <span className="truncate flex-1">{child.label}</span>
              {child.badge && <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Nav inner component ──────────────────────────────────────────────────
function NavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const { state, setSimulatedRole } = useStore()
  const { collapsed, toggle } = useSidebar()
  const isRealAdmin = state.role === 'admin'
  const effectiveRole = state.simulatedRole ?? state.role
  const isAdmin = effectiveRole === 'admin'
  const lang = state.lang
  const [mobileOpen, setMobileOpen] = useState(false)
  const [knownGrammarCount, setKnownGrammarCount] = useState(-1)

  useEffect(() => { setMobileOpen(false) }, [pathname, currentTab])
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  useEffect(() => {
    if (!state.user) { setKnownGrammarCount(0); return }
    fetchKnownGrammar().then(s => setKnownGrammarCount(s.size)).catch(() => setKnownGrammarCount(0))
  }, [state.user])

  useEffect(() => {
    if (!state.user || !pathname.startsWith('/grammar')) return
    fetchKnownGrammar().then(s => setKnownGrammarCount(s.size)).catch(() => {})
  }, [pathname, state.user])

  const vocabPct = useMemo(() => {
    const active = state.db.filter(i => i.status === 'active')
    if (active.length === 0) return 0
    return Math.round((active.filter(i => i.srsLevel >= 5).length / active.length) * 100)
  }, [state.db])

  const grammarPct = knownGrammarCount < 0
    ? null
    : Math.round((knownGrammarCount / TOTAL_GRAMMAR_POINTS) * 100)

  const pendingReview = getPendingCount(state.db, ALL_REVIEW_MODES)
  const hasActiveVocab = state.db.some(i => i.status === 'active')

  // ── Non-admin: simple sticky top bar ─────────────────────────────────────
  if (!isAdmin) {
    return (
      <>
        {/* Simulation banner — only shown to real admin simulating a non-admin role */}
        {isRealAdmin && state.simulatedRole && (
          <div className="sticky top-0 z-50 flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-500 text-white text-xs font-semibold">
            <span>
              👁 Simulando como: <strong className="font-bold capitalize">
                {state.simulatedRole === 'user' ? 'Usuario' : state.simulatedRole === 'contributor' ? 'Contributor' : 'Admin'}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setSimulatedRole(null)}
              className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              ✕ Salir
            </button>
          </div>
        )}
        <div className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-violet-100 dark:border-slate-800 shadow-sm flex items-center gap-3 px-4 py-2.5">
          <Link href="/review" className="font-bold text-xl text-violet-700 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 transition-colors select-none">
            栞
          </Link>
          {pendingReview > 0 && (
            <span className="text-[10px] font-bold text-white bg-rose-400 px-1.5 py-0.5 rounded-full tabular-nums">
              {pendingReview}
            </span>
          )}
          <div className="ml-auto flex items-center gap-2">
            {state.syncing && (
              <span className="text-violet-400 animate-pulse text-xs hidden sm:inline">{t(lang, 'header_syncing')}</span>
            )}
            <ProfileMenu />
            <ThemeToggle />
          </div>
        </div>
      </>
    )
  }

  // ── Admin: full sidebar ───────────────────────────────────────────────────
  const profileSubItems: SubItem[] = [
    { href: '/stats?tab=stats',    icon: '📊', label: stripEmoji(t(lang, 'stats_tab_stats')),    tabKey: 'stats',    isDefault: true,  badge: false },
    { href: '/stats?tab=settings', icon: '⚙️', label: stripEmoji(t(lang, 'stats_tab_settings')), tabKey: 'settings', isDefault: false, badge: false },
    { href: '/stats?tab=account',  icon: '👤', label: stripEmoji(t(lang, 'stats_tab_account')),  tabKey: 'account',  isDefault: false, badge: !state.user },
  ]

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="shrink-0 px-4 py-3">
        <Link href="/review" className="group">
          <h1 className="text-xl font-bold text-violet-700 dark:text-violet-400 group-hover:text-violet-500 transition-colors">
            栞
          </h1>
        </Link>
      </div>

      {/* User info */}
      {state.user && (
        <div className="mx-3 mb-2 px-3 py-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100/80 dark:border-violet-800/40">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-bold text-sm shrink-0 select-none">
              {(state.user.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold truncate leading-tight">{state.user.email}</p>
              <p className="text-[10px] text-violet-500 dark:text-violet-400 mt-0.5">栞</p>
            </div>
          </div>
        </div>
      )}
      {!state.user && state.loaded && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/40">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-600 dark:text-amber-400">{t(lang, 'header_local')}</span>
          </div>
        </div>
      )}
      <div className="mx-3 mb-2 border-t border-violet-100/80 dark:border-slate-700" />

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scroll">
        <NavItem
          href="/review" icon="📝" label={stripEmoji(t(lang, 'nav_review'))}
          badge={pendingReview} tutorialId="nav-review"
          progress={null} pathname={pathname}
        />
        <NavItem
          href="/vocabulary" icon="📚" label={stripEmoji(t(lang, 'nav_vocabulary'))}
          badge={0} tutorialId="nav-vocabulary"
          progress={hasActiveVocab ? vocabPct : null}
          pathname={pathname}
        />
        <NavItem
          href="/grammar" icon="📖" label={stripEmoji(t(lang, 'nav_grammar'))}
          badge={0} progress={grammarPct} pathname={pathname}
        />
        <NavItem
          href="/kana" icon="🔤" label={stripEmoji(t(lang, 'nav_kana'))}
          badge={0} progress={null} pathname={pathname}
        />
        <NavItem
          href="/context" icon="💬" label={stripEmoji(t(lang, 'nav_context'))}
          badge={0} progress={null} pathname={pathname}
        />
        <NavSection
          icon="👤" label={stripEmoji(t(lang, 'nav_stats'))}
          basePath="/stats" subItems={profileSubItems}
          pathname={pathname} currentTab={currentTab}
        />
        <NavSection
          icon="🔧" label={stripEmoji(t(lang, 'nav_admin'))}
          basePath="/admin"
          subItems={[
            { href: '/admin?tab=users',  icon: '👥', label: 'Usuarios',    tabKey: 'users',  isDefault: true,  badge: false },
            { href: '/admin?tab=images', icon: '🖼️', label: 'Imágenes',    tabKey: 'images', isDefault: false, badge: false },
            { href: '/admin?tab=vocab',  icon: '📚', label: 'Vocabulario', tabKey: 'vocab',  isDefault: false, badge: false },
            { href: '/admin?tab=system', icon: '⚙️', label: 'Sistema',     tabKey: 'system', isDefault: false, badge: false },
          ]}
          pathname={pathname} currentTab={currentTab}
        />
        {/* Role simulation controls — admin only */}
        <div className="px-2 pt-1">
          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide px-1 mb-1.5">👁 Simular rol</p>
          <div className="flex flex-col gap-1">
            {(['admin', 'contributor', 'user'] as const).map(role => {
              const active = state.simulatedRole === role || (!state.simulatedRole && role === state.role)
              const isCurrentReal = !state.simulatedRole && role === state.role
              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSimulatedRole(isCurrentReal ? null : role)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                    active
                      ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${active ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                  <span className="capitalize">{role === 'user' ? 'Usuario' : role === 'contributor' ? 'Contributor' : 'Admin'}</span>
                  {isCurrentReal && <span className="ml-auto text-[9px] text-slate-400 dark:text-slate-500">real</span>}
                </button>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Syncing */}
      {state.syncing && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-slate-800">
          <span className="text-violet-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        </div>
      )}

      {/* CTA */}
      {state.user && hasActiveVocab && (
        <div className="shrink-0 mx-3 mb-3">
          <Link
            href="/review"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-violet-600 hover:bg-violet-700 active:scale-95 text-white font-semibold rounded-xl text-sm transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            {stripEmoji(t(lang, 'review_start'))}
          </Link>
        </div>
      )}

      {/* Bottom: collapse */}
      <div className="shrink-0 p-2 border-t border-violet-100/80 dark:border-slate-700 flex items-center justify-end px-3">
        <button
          type="button"
          onClick={toggle}
          title="Ocultar menú"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-500 dark:hover:text-violet-400 transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={[
          'hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col',
          'bg-white dark:bg-slate-900 border-r border-violet-100 dark:border-slate-800',
          'shadow-[2px_0_20px_rgba(139,92,246,0.07)]',
          'transition-transform duration-300 ease-in-out',
          collapsed ? '-translate-x-full' : 'translate-x-0',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* Re-show tab */}
      <button
        type="button"
        onClick={toggle}
        title="Mostrar menú"
        className={[
          'hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30',
          'flex-col items-center justify-center',
          'w-5 h-14 rounded-r-xl',
          'bg-white dark:bg-slate-900 border border-l-0 border-violet-100 dark:border-slate-800',
          'shadow-[2px_0_8px_rgba(139,92,246,0.1)]',
          'text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-slate-800',
          'transition-all duration-300',
          collapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
        ].join(' ')}
        aria-label="Mostrar menú"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Mobile top bar (admin) */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-violet-100 dark:border-slate-800 shadow-sm flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 -ml-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-violet-50 dark:hover:bg-slate-800 hover:text-violet-600 dark:hover:text-violet-400 transition"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/review" className="font-bold text-lg text-violet-700 dark:text-violet-400">栞</Link>
        <div className="ml-auto flex items-center gap-2">
          {state.syncing && (
            <span className="text-violet-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
          )}
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile slide-over */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-[80vw] flex flex-col bg-white dark:bg-slate-900 shadow-2xl animate-slide-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-violet-50 dark:hover:bg-slate-800 transition"
              aria-label="Cerrar menú"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}

export default function Nav() {
  return (
    <Suspense fallback={null}>
      <NavInner />
    </Suspense>
  )
}
