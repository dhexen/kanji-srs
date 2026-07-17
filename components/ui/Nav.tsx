'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount, ALL_REVIEW_MODES } from '@/lib/srs'
import { t } from '@/lib/i18n'
import { fetchKnownGrammar, fetchPendingVocabCount } from '@/lib/supabase'
import { useSidebar } from '@/lib/sidebar-context'
import FeedbackModal from './FeedbackModal'
import LevelWidget from '@/components/progression/LevelWidget'
import LevelUpOverlay from '@/components/progression/LevelUpOverlay'

const TOTAL_GRAMMAR_POINTS = 121

function stripEmoji(label: string) {
  return label.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[☀-➿️]\s*/u, '')
}

// ── NavItem ───────────────────────────────────────────────────────────────────
function NavItem({
  href, icon, label, badge, tutorialId, progress, isAdmin, pathname, onNavigate,
}: {
  href: string
  icon: string
  label: string
  badge: number
  tutorialId?: string
  progress: number | null
  isAdmin?: boolean
  pathname: string
  onNavigate?: () => void
}) {
  const active = pathname === href
  return (
    <div>
      <Link
        href={href}
        onClick={active ? onNavigate : undefined}
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

// ── Main Nav inner component ──────────────────────────────────────────────────
function NavInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentTab = searchParams.get('tab')
  const { state, setSimulatedRole, refreshData } = useStore()
  const { collapsed, toggle, close } = useSidebar()
  const isRealAdmin = state.role === 'admin'
  const effectiveRole = state.simulatedRole ?? state.role
  const isStaff = effectiveRole === 'admin' || effectiveRole === 'contributor'
  const lang = state.lang
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [knownGrammarCount, setKnownGrammarCount] = useState(-1)
  const [pendingVocabCount, setPendingVocabCount] = useState(0)
  const sidebarRef = useRef<HTMLElement>(null)

  // Close sidebar when navigating
  useEffect(() => { close() }, [pathname, currentTab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh the user's data when navigating to a new section, so counts (pending
  // reviews, etc.) reflect the latest state without needing a manual F5.
  useEffect(() => {
    if (state.user) void refreshData()
  }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close sidebar on click/tap outside.
  // We match against [data-sidebar-panel] (present on BOTH the desktop aside and
  // the mobile slide-over) instead of a single ref, so a tap on a link inside
  // the mobile menu is NOT treated as "outside" — otherwise the menu would close
  // before the link could navigate.
  useEffect(() => {
    if (collapsed) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Element
      if (target.closest('[data-sidebar-toggle]')) return  // hamburger handles its own toggle
      if (target.closest('[data-sidebar-panel]')) return   // click inside the menu → let it act
      close()
    }
    // Use a click listener (not mousedown) so a link's navigation fires first
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [collapsed, close])

  useEffect(() => {
    if (!state.user) { setKnownGrammarCount(0); return }
    fetchKnownGrammar().then(s => setKnownGrammarCount(s.size)).catch(() => setKnownGrammarCount(0))
  }, [state.user])

  // Pending vocab proposals — only relevant to admin/contributor, who don't
  // have another shared "you have something to review" surface for this.
  useEffect(() => {
    if (!isStaff) { setPendingVocabCount(0); return }
    fetchPendingVocabCount().then(setPendingVocabCount).catch(() => setPendingVocabCount(0))
  }, [isStaff, pathname])

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

  // ── Sidebar (all users) ───────────────────────────────────────────────────
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

      {/* User info + network status */}
      {state.user && (
        <div className="mx-3 mb-2 space-y-1.5">
          <div className={`px-3 py-3 rounded-xl border ${
            state.isOnline
              ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-100/80 dark:border-violet-800/40'
              : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200/80 dark:border-rose-800/40'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar with network dot */}
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full bg-violet-600 dark:bg-violet-700 flex items-center justify-center text-white font-bold text-sm select-none">
                  {(state.user.email?.[0] ?? '?').toUpperCase()}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-900 ${
                  state.isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                }`} title={state.isOnline ? 'Online' : 'Sin conexión'} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-700 dark:text-slate-200 font-semibold truncate leading-tight">{state.user.email}</p>
                <p className={`text-[10px] mt-0.5 font-medium ${state.isOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                  {state.isOnline ? '● Online' : '● Sin conexión'}
                </p>
              </div>
            </div>
          </div>

          {/* Pending writes banner */}
          {state.pendingWrites > 0 && (
            <div className="px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2">
              <span className="text-amber-500 shrink-0 mt-0.5">⏳</span>
              <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-tight">
                {state.pendingWrites === 1
                  ? '1 cambio pendiente de sincronizar'
                  : `${state.pendingWrites} cambios pendientes de sincronizar`}
                {!state.isOnline && ' · esperando conexión'}
              </p>
            </div>
          )}
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

      {/* Level widget */}
      {state.user && <LevelWidget />}

      {/* Nav links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scroll">
        <NavItem
          href="/review" icon="📝" label={stripEmoji(t(lang, 'nav_review'))}
          badge={pendingReview} tutorialId="nav-review"
          progress={null} pathname={pathname} onNavigate={refreshData}
        />
        <NavItem
          href="/vocabulary" icon="📚" label={stripEmoji(t(lang, 'nav_vocabulary'))}
          badge={isStaff ? pendingVocabCount : 0} tutorialId="nav-vocabulary"
          progress={hasActiveVocab ? vocabPct : null}
          pathname={pathname} onNavigate={refreshData}
        />
        {isStaff && (
          <NavItem
            href="/grammar" icon="📖" label={stripEmoji(t(lang, 'nav_grammar'))}
            badge={0} progress={grammarPct} pathname={pathname} onNavigate={refreshData}
          />
        )}
        <NavItem
          href="/kana" icon="🔤" label={stripEmoji(t(lang, 'nav_kana'))}
          badge={0} progress={null} pathname={pathname} onNavigate={refreshData}
        />
        {isStaff && (
          <NavItem
            href="/context" icon="💬" label={stripEmoji(t(lang, 'nav_context'))}
            badge={0} progress={null} pathname={pathname} onNavigate={refreshData}
          />
        )}
        {/* JLPT grammar is now a section inside /grammar (toggle in its header). */}
        {/* Admin tools + role simulation moved to the top-right "🔧 Admin" dropdown (Header). */}
      </nav>

      {/* Syncing */}
      {state.syncing && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-xl bg-violet-50 dark:bg-slate-800">
          <span className="text-violet-400 animate-pulse text-xs">{t(lang, 'header_syncing')}</span>
        </div>
      )}

      {/* (CTA "Iniciar repaso" removed — accessible via nav) */}
      {state.user && hasActiveVocab && (
        <div className="shrink-0 mx-3 mb-3 hidden">
          {/* placeholder to avoid layout shift */}
        </div>
      )}

      <LevelUpOverlay />
    </>
  )

  return (
    <>
      {/* Simulation banner — only shown to real admin simulating a non-admin role */}
      {isRealAdmin && state.simulatedRole && (
        <div className="fixed top-0 inset-x-0 z-50 flex items-center justify-between gap-2 px-4 py-1.5 bg-amber-500 text-white text-xs font-semibold">
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

      {/* Desktop sidebar */}
      <aside
        ref={sidebarRef}
        data-sidebar-panel
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

      {/* Mobile slide-over (all users) */}
      {!collapsed && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/25 backdrop-blur-sm" onClick={close} />
          <div data-sidebar-panel className="relative w-64 max-w-[80vw] flex flex-col bg-white dark:bg-slate-900 shadow-2xl animate-slide-in">
            <button
              type="button"
              onClick={close}
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
