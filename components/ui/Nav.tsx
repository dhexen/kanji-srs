'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount, ALL_REVIEW_MODES } from '@/lib/srs'
import { t } from '@/lib/i18n'
import { fetchKnownGrammar } from '@/lib/supabase'

const TOTAL_GRAMMAR_POINTS = 121

function stripEmoji(label: string) {
  return label.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[☀-➿️]\s*/u, '')
}

// ── Types ─────────────────────────────────────────────────────────────────────
type SubItem = {
  href: string
  icon: string
  label: string
  tabKey: string
  isDefault: boolean
  badge: boolean
}

// ── NavSection: each collapsible section manages its own open/close state ─────
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

  // Auto-expand when navigating to this section's route
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
      {/* Section header – toggles the submenu */}
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        {...(tutorialId ? { 'data-tutorial-id': tutorialId } : {})}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isOnSection
            ? 'bg-white/15 text-white shadow-sm shadow-black/10'
            : 'text-indigo-200 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
        <span className="truncate flex-1 text-left">{label}</span>
        {/* Chevron */}
        <svg
          className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 opacity-60 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Progress bar (shown below the header, e.g. vocab) */}
      {progress !== null && progress !== undefined && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <div className="flex items-center gap-1.5 pl-9">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  progress >= 80 ? 'bg-emerald-400' :
                  progress >= 40 ? 'bg-indigo-400' : 'bg-indigo-300/50'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400 tabular-nums w-7 text-right">{progress}%</span>
          </div>
        </div>
      )}

      {/* Sub-items */}
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-white/10 space-y-0.5 mt-0.5 mb-1">
          {subItems.map(child => (
            <Link
              key={child.href}
              href={child.href}
              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                isChildActive(child.tabKey, child.isDefault)
                  ? 'bg-white/15 text-white'
                  : 'text-indigo-300 hover:bg-white/10 hover:text-indigo-100'
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

// ── NavItem: a simple flat link ───────────────────────────────────────────────
function NavItem({
  href, icon, label, badge, badgeColor, tutorialId, progress, isAdmin, pathname,
}: {
  href: string
  icon: string
  label: string
  badge: number
  badgeColor: string
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
            ? 'bg-white/15 text-white shadow-sm shadow-black/10'
            : isAdmin
            ? 'text-amber-300 hover:bg-amber-500/15 hover:text-amber-200'
            : 'text-indigo-200 hover:bg-white/10 hover:text-white'
        }`}
      >
        <span className="text-lg w-6 text-center shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
        {badge > 0 && (
          <span className={`ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>
            {badge}
          </span>
        )}
      </Link>
      {progress !== null && (
        <div className="px-3 pb-1.5 -mt-0.5">
          <div className="flex items-center gap-1.5 pl-9">
            <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  (progress ?? 0) >= 80 ? 'bg-emerald-400' :
                  (progress ?? 0) >= 40 ? 'bg-indigo-400' : 'bg-indigo-300/50'
                }`}
                style={{ width: `${progress ?? 0}%` }}
              />
            </div>
            <span className="text-[10px] text-indigo-400 tabular-nums w-7 text-right">{progress}%</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Nav inner component (needs useSearchParams → wrapped in Suspense) ────
function NavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const { state } = useStore()
  const isAdmin = state.role === 'admin'
  const lang = state.lang
  const [mobileOpen, setMobileOpen] = useState(false)
  const [knownGrammarCount, setKnownGrammarCount] = useState(-1)

  // Close mobile sidebar on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname, currentTab])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Fetch grammar progress
  useEffect(() => {
    if (!state.user) { setKnownGrammarCount(0); return }
    fetchKnownGrammar().then(s => setKnownGrammarCount(s.size)).catch(() => setKnownGrammarCount(0))
  }, [state.user])

  useEffect(() => {
    if (!state.user || !pathname.startsWith('/grammar')) return
    fetchKnownGrammar().then(s => setKnownGrammarCount(s.size)).catch(() => {})
  }, [pathname, state.user])

  // ── Progress calculations ─────────────────────────────────────────────────
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

  // ── Sub-item definitions ──────────────────────────────────────────────────
  const vocabSubItems: SubItem[] = [
    { href: '/vocabulary?tab=import',   icon: '📥', label: t(lang, 'vocab_tab_import'),              tabKey: 'import',   isDefault: true,  badge: false },
    { href: '/vocabulary?tab=glossary', icon: '📋', label: t(lang, 'vocab_tab_glossary'),             tabKey: 'glossary', isDefault: false, badge: false },
  ]

  const profileSubItems: SubItem[] = [
    { href: '/stats?tab=stats',    icon: '📊', label: stripEmoji(t(lang, 'stats_tab_stats')),    tabKey: 'stats',    isDefault: true,  badge: false },
    { href: '/stats?tab=settings', icon: '⚙️', label: stripEmoji(t(lang, 'stats_tab_settings')), tabKey: 'settings', isDefault: false, badge: false },
    { href: '/stats?tab=account',  icon: '👤', label: stripEmoji(t(lang, 'stats_tab_account')),  tabKey: 'account',  isDefault: false, badge: !state.user },
  ]

  // ── Sidebar content ───────────────────────────────────────────────────────
  const sidebar = (
    <>
      {/* Logo */}
      <div className="p-4 pb-2">
        <Link href="/review" className="flex items-center gap-2 group">
          <span className="text-2xl">🌸</span>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-white tracking-wide leading-tight group-hover:text-indigo-200 transition-colors">小学校漢字</h1>
            <p className="text-[10px] text-indigo-300 font-medium">SRS</p>
          </div>
        </Link>
      </div>

      {/* User info */}
      {state.user && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-white/10 border border-white/10">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full shrink-0 bg-emerald-400" />
            <span className="text-xs text-indigo-100 truncate">{state.user.email}</span>
          </div>
          {state.role && (
            <span className="mt-1 inline-block text-[10px] text-indigo-200 bg-white/10 px-1.5 py-0.5 rounded">
              {state.role}
            </span>
          )}
        </div>
      )}
      {!state.user && state.loaded && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg bg-amber-500/20 border border-amber-400/20">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0 bg-amber-400 animate-pulse" />
            <span className="text-xs text-amber-200">{t(lang, 'header_local')}</span>
          </div>
        </div>
      )}

      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scroll">

        {/* 📝 Repasar */}
        <NavItem
          href="/review" icon="📝" label={stripEmoji(t(lang, 'nav_review'))}
          badge={pendingReview} badgeColor="bg-red-500"
          tutorialId="nav-review" progress={null} pathname={pathname}
        />

        {/* 📚 Vocabulario ▾ */}
        <NavSection
          icon="📚" label={stripEmoji(t(lang, 'nav_vocabulary'))}
          basePath="/vocabulary" subItems={vocabSubItems}
          tutorialId="nav-vocabulary"
          progress={hasActiveVocab ? vocabPct : null}
          pathname={pathname} currentTab={currentTab}
        />

        {/* 📖 Gramática */}
        <NavItem
          href="/grammar" icon="📖" label={stripEmoji(t(lang, 'nav_grammar'))}
          badge={0} badgeColor="" tutorialId={undefined}
          progress={grammarPct} pathname={pathname}
        />

        {/* 💬 Contexto */}
        <NavItem
          href="/context" icon="💬" label={stripEmoji(t(lang, 'nav_context'))}
          badge={0} badgeColor="" tutorialId={undefined}
          progress={null} pathname={pathname}
        />

        {/* 👤 Mi Perfil ▾ */}
        <NavSection
          icon="👤" label={stripEmoji(t(lang, 'nav_stats'))}
          basePath="/stats" subItems={profileSubItems}
          pathname={pathname} currentTab={currentTab}
        />

        {/* 🔧 Admin (admin only) */}
        {isAdmin && (
          <NavSection
            icon="🔧" label={stripEmoji(t(lang, 'nav_admin'))}
            basePath="/admin"
            subItems={[
              { href: '/admin?tab=users',  icon: '👥', label: 'Usuarios',     tabKey: 'users',  isDefault: true,  badge: false },
              { href: '/admin?tab=images', icon: '🖼️', label: 'Imágenes',     tabKey: 'images', isDefault: false, badge: false },
              { href: '/admin?tab=vocab',  icon: '📚', label: 'Vocabulario',  tabKey: 'vocab',  isDefault: false, badge: false },
              { href: '/admin?tab=system', icon: '⚙️', label: 'Sistema',      tabKey: 'system', isDefault: false, badge: false },
            ]}
            pathname={pathname} currentTab={currentTab}
          />
        )}
      </nav>

      {/* Syncing indicator */}
      {state.syncing && (
        <div className="mx-3 mb-3 px-3 py-2 rounded-lg bg-indigo-400/20">
          <span className="text-indigo-300 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        </div>
      )}
    </>
  )

  return (
    <>
      {/* ——— Desktop sidebar (lg+) ——— */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-56 flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-r border-white/10 shadow-xl">
        {sidebar}
      </aside>

      {/* ——— Mobile top bar ——— */}
      <div className="lg:hidden sticky top-0 z-40 bg-slate-900 text-white flex items-center gap-3 px-4 py-3 shadow-md">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-1 -ml-1 rounded-lg hover:bg-white/10 transition"
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <Link href="/review" className="flex items-center gap-2">
          <span className="text-xl">🌸</span>
          <span className="font-bold text-sm tracking-wide">小学校漢字 SRS</span>
        </Link>
        {state.syncing && (
          <span className="ml-auto text-indigo-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        )}
      </div>

      {/* ——— Mobile slide-over ——— */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 max-w-[80vw] flex flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 shadow-2xl animate-slide-in">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-3 right-3 p-1 rounded-lg text-indigo-300 hover:text-white hover:bg-white/10 transition"
              aria-label="Close menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {sidebar}
          </div>
        </div>
      )}
    </>
  )
}

// ── Export wrapped in Suspense (required for useSearchParams in Next.js 14) ───
export default function Nav() {
  return (
    <Suspense fallback={null}>
      <NavInner />
    </Suspense>
  )
}
