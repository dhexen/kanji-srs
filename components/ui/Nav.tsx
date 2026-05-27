'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount, ALL_REVIEW_MODES } from '@/lib/srs'
import { t } from '@/lib/i18n'
import { fetchKnownGrammar } from '@/lib/supabase'
import { useSidebar } from '@/lib/sidebar-context'

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

// ── NavItem ──────────────────────────────────────────────────────────────────
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
            ? 'bg-violet-100 text-violet-700 shadow-sm'
            : isAdmin
            ? 'text-amber-600 hover:bg-amber-50 hover:text-amber-700'
            : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'
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
            <div className="flex-1 h-1 bg-violet-100 rounded-full overflow-hidden">
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

// ── NavSection ───────────────────────────────────────────────────────────────
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
            ? 'bg-violet-100 text-violet-700 shadow-sm'
            : 'text-slate-500 hover:bg-violet-50 hover:text-violet-600'
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
            <div className="flex-1 h-1 bg-violet-100 rounded-full overflow-hidden">
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
        <div className="ml-4 pl-3 border-l border-violet-100 space-y-0.5 mt-0.5 mb-1">
          {subItems.map(child => (
            <Link
              key={child.href}
              href={child.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isChildActive(child.tabKey, child.isDefault)
                  ? 'bg-violet-100/80 text-violet-700'
                  : 'text-slate-400 hover:bg-violet-50 hover:text-violet-600'
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
  const { state } = useStore()
  const { collapsed, toggle } = useSidebar()
  const isAdmin = state.role === 'admin'
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


  const profileSubItems: SubItem[] = [
    { href: '/stats?tab=stats',    icon: '📊', label: stripEmoji(t(lang, 'stats_tab_stats')),    tabKey: 'stats',    isDefault: true,  badge: false },
    { href: '/stats?tab=settings', icon: '⚙️', label: stripEmoji(t(lang, 'stats_tab_settings')), tabKey: 'settings', isDefault: false, badge: false },
    { href: '/stats?tab=account',  icon: '👤', label: stripEmoji(t(lang, 'stats_tab_account')),  tabKey: 'account',  isDefault: false, badge: !state.user },
  ]

  // ── Sidebar content (reutilizado en desktop y mobile) ────────────────────
  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="shrink-0 px-4 py-3">
        <Link href="/review" className="flex items-center gap-2 group">
          <span className="text-2xl">🌸</span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-violet-700 tracking-wide leading-tight group-hover:text-violet-500 transition-colors">
              小学校漢字
            </h1>
            <p className="text-[10px] text-violet-400 font-medium">SRS</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      {state.user && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-violet-50 border border-violet-100/80">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
            <span className="text-xs text-slate-600 truncate">{state.user.email}</span>
          </div>
          {state.role && (
            <span className="mt-1 inline-block text-[10px] text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded-md">
              {state.role}
            </span>
          )}
        </div>
      )}
      {!state.user && state.loaded && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-100">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-600">{t(lang, 'header_local')}</span>
          </div>
        </div>
      )}
      <div className="mx-3 mb-2 border-t border-violet-100/80" />

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
          href="/context" icon="💬" label={stripEmoji(t(lang, 'nav_context'))}
          badge={0} progress={null} pathname={pathname}
        />
        <NavSection
          icon="👤" label={stripEmoji(t(lang, 'nav_stats'))}
          basePath="/stats" subItems={profileSubItems}
          pathname={pathname} currentTab={currentTab}
        />
        {isAdmin && (
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
        )}
      </nav>

      {/* Syncing */}
      {state.syncing && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-violet-50">
          <span className="text-violet-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        </div>
      )}

      {/* Collapse toggle — dentro del sidebar */}
      <div className="shrink-0 p-2 border-t border-violet-100/80 flex items-center justify-between px-3">
        <span className="text-[10px] text-slate-400 font-medium">Menú</span>
        <button
          type="button"
          onClick={toggle}
          title="Ocultar menú"
          className="flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:bg-violet-50 hover:text-violet-500 transition-all"
        >
          {/* Flecha apunta a la izquierda (ocultar) */}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* ────────────────── Desktop sidebar (lg+) ────────────────── */}
      {/* El sidebar se desliza fuera de pantalla cuando collapsed */}
      <aside
        className={[
          'hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col',
          'bg-white border-r border-violet-100',
          'shadow-[2px_0_20px_rgba(139,92,246,0.07)]',
          'transition-transform duration-300 ease-in-out',
          collapsed ? '-translate-x-full' : 'translate-x-0',
        ].join(' ')}
      >
        {sidebarContent}
      </aside>

      {/* ── Pestaña para volver a mostrar el sidebar ── */}
      {/* Aparece en el borde izquierdo cuando el sidebar está oculto */}
      <button
        type="button"
        onClick={toggle}
        title="Mostrar menú"
        className={[
          'hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-30',
          'flex-col items-center justify-center',
          'w-5 h-14 rounded-r-xl',
          'bg-white border border-l-0 border-violet-100',
          'shadow-[2px_0_8px_rgba(139,92,246,0.1)]',
          'text-violet-400 hover:text-violet-600 hover:bg-violet-50',
          'transition-all duration-300',
          collapsed ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none',
        ].join(' ')}
        aria-label="Mostrar menú"
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* ────────────────── Mobile top bar ────────────────── */}
      <div className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-violet-100 shadow-sm flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1.5 -ml-1.5 rounded-xl text-slate-500 hover:bg-violet-50 hover:text-violet-600 transition"
          aria-label="Abrir menú"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/review" className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <span className="font-bold text-sm tracking-wide text-violet-700">小学校漢字 SRS</span>
        </Link>
        {state.syncing && (
          <span className="ml-auto text-violet-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        )}
      </div>

      {/* ────────────────── Mobile slide-over ────────────────── */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-[80vw] flex flex-col bg-white shadow-2xl animate-slide-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-violet-50 transition"
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
