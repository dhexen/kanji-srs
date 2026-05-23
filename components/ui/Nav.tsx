'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount, ALL_REVIEW_MODES } from '@/lib/srs'
import { t } from '@/lib/i18n'

export default function Nav() {
  const pathname = usePathname()
  const { state } = useStore()
  const isAdmin = state.role === 'admin'
  const lang = state.lang
  const [mobileOpen, setMobileOpen] = useState(false)

  // Close sidebar on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const pendingReview = getPendingCount(state.db, ALL_REVIEW_MODES)

  const tabs = [
    { href: '/review',     icon: '📝', label: t(lang, 'nav_review'),     badge: pendingReview, badgeColor: 'bg-red-500', tutorialId: 'nav-review' },
    { href: '/vocabulary', icon: '📚', label: t(lang, 'nav_vocabulary'), badge: 0,             badgeColor: '',           tutorialId: 'nav-vocabulary' },
    { href: '/grammar',    icon: '📖', label: t(lang, 'nav_grammar'),    badge: 0,             badgeColor: '',           tutorialId: undefined },
    { href: '/context',    icon: '💬', label: t(lang, 'nav_context'),    badge: 0,             badgeColor: '',           tutorialId: undefined },
    { href: '/progress',   icon: '🔍', label: t(lang, 'nav_progress'),   badge: 0,             badgeColor: '',           tutorialId: undefined },
    { href: '/stats',      icon: '📊', label: t(lang, 'nav_stats'),      badge: 0,             badgeColor: '',           tutorialId: undefined },
    ...(isAdmin ? [
      { href: '/import',   icon: '⚡', label: t(lang, 'nav_import'),     badge: 0,             badgeColor: '',           tutorialId: undefined },
      { href: '/admin',    icon: '🔧', label: t(lang, 'nav_admin'),      badge: 0,             badgeColor: '',           tutorialId: undefined },
    ] : []),
  ]

  // Strip emoji prefix from label for the sidebar (emoji is shown separately as icon)
  function stripEmoji(label: string) {
    return label.replace(/^\p{Emoji_Presentation}\s*/u, '').replace(/^[\u2600-\u27BF\uFE0F]\s*/u, '')
  }

  const sidebarContent = (
    <>
      {/* Logo / brand */}
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

      {/* Divider */}
      <div className="mx-3 my-2 border-t border-white/10" />

      {/* Navigation links */}
      <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto custom-scroll">
        {tabs.map(tab => {
          const active = pathname === tab.href
          const isAdminTab = tab.href === '/admin'
          return (
            <Link
              key={tab.href}
              href={tab.href}
              {...(tab.tutorialId ? { 'data-tutorial-id': tab.tutorialId } : {})}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-white/15 text-white shadow-sm shadow-black/10'
                  : isAdminTab
                  ? 'text-amber-300 hover:bg-amber-500/15 hover:text-amber-200'
                  : 'text-indigo-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <span className="text-lg w-6 text-center shrink-0">{tab.icon}</span>
              <span className="truncate">{stripEmoji(tab.label)}</span>
              {tab.badge > 0 && (
                <span className={`ml-auto text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}>
                  {tab.badge}
                </span>
              )}
            </Link>
          )
        })}
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
        {sidebarContent}
      </aside>

      {/* ——— Mobile top bar + slide-over ——— */}
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

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Slide-over panel */}
          <div className="relative w-64 max-w-[80vw] flex flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 shadow-2xl animate-slide-in">
            {/* Close button */}
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
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  )
}
