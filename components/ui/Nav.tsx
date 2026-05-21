'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount } from '@/lib/srs'

export default function Nav() {
  const pathname = usePathname()
  const { state } = useStore()
  const isAdmin = state.role === 'admin'

  const pendingReview = getPendingCount(state.db, ['multi', 'meaning', 'kanji', 'reading', 'reverse'])
  const pendingStudy = state.db.filter(i => i.status === 'locked').length

  const tabs = [
    { href: '/review',     label: '📝 Repaso SRS',      badge: pendingReview, badgeColor: 'bg-red-500' },
    { href: '/study',      label: '📖 Estudiar Nuevos',  badge: pendingStudy,  badgeColor: 'bg-emerald-500' },
    { href: '/vocabulary', label: '📚 Vocabulario',       badge: 0,             badgeColor: '' },
    { href: '/context',    label: '💬 Contexto',          badge: 0,             badgeColor: '' },
    { href: '/stats',      label: '📊 Mi Progreso',       badge: 0,             badgeColor: '' },
    ...(isAdmin ? [
      { href: '/import',   label: '⚡ Importador IA',    badge: 0,             badgeColor: '' },
      { href: '/admin',    label: '🔧 Admin',             badge: 0,             badgeColor: '' },
    ] : []),
  ]

  return (
    <div className="flex flex-wrap border-b border-slate-200 mb-6 bg-white rounded-xl shadow-sm overflow-hidden p-1 gap-1">
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 min-w-[100px] py-3 px-2 text-center rounded-lg font-semibold border-b-2 transition-all text-sm ${
              active
                ? 'text-indigo-600 bg-indigo-50/50 border-indigo-600'
                : tab.href === '/admin'
                  ? 'text-amber-600 border-transparent hover:bg-amber-50 hover:text-amber-700'
                  : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
            }`}>
            {tab.label}
            {tab.badge > 0 && (
              <span className={`ml-1 text-white text-xs px-2 py-0.5 rounded-full ${tab.badgeColor}`}>
                {tab.badge}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
