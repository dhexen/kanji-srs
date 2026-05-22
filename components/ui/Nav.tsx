'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount } from '@/lib/srs'
import { t } from '@/lib/i18n'

export default function Nav() {
  const pathname = usePathname()
  const { state } = useStore()
  const isAdmin = state.role === 'admin'
  const lang = state.lang

  const pendingReview = getPendingCount(state.db, ['multi', 'meaning', 'kanji', 'reading', 'reverse'])
  const pendingStudy = state.db.filter(i => i.status === 'locked').length

  const tabs = [
    { href: '/review',     label: t(lang, 'nav_review'),     badge: pendingReview, badgeColor: 'bg-red-500' },
    { href: '/study',      label: t(lang, 'nav_study'),      badge: pendingStudy,  badgeColor: 'bg-emerald-500' },
    { href: '/vocabulary', label: t(lang, 'nav_vocabulary'), badge: 0,             badgeColor: '' },
    { href: '/context',    label: t(lang, 'nav_context'),    badge: 0,             badgeColor: '' },
    { href: '/stats',      label: t(lang, 'nav_stats'),      badge: 0,             badgeColor: '' },
    ...(isAdmin ? [
      { href: '/import',   label: t(lang, 'nav_import'),     badge: 0,             badgeColor: '' },
      { href: '/admin',    label: t(lang, 'nav_admin'),      badge: 0,             badgeColor: '' },
    ] : []),
  ]

  return (
    <div className="mb-6">
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-xl shadow-sm overflow-hidden p-1 gap-1">
        {tabs.map(tab => {
          const active = pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href}
              className={`flex-1 min-w-[90px] py-3 px-2 text-center rounded-lg font-semibold border-b-2 transition-all text-sm ${
                active ? 'text-indigo-600 bg-indigo-50/50 border-indigo-600'
                : tab.href === '/admin' ? 'text-amber-600 border-transparent hover:bg-amber-50'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
              }`}>
              {tab.label}
              {tab.badge > 0 && (
                <span className={`ml-1 text-white text-xs px-1.5 py-0.5 rounded-full ${tab.badgeColor}`}>{tab.badge}</span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
