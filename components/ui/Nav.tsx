'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useStore } from '@/lib/store'
import { getPendingCount } from '@/lib/srs'

const tabs = [
  { href: '/review',  label: '📝 Repaso SRS',      badge: 'review' },
  { href: '/study',   label: '📖 Estudiar Nuevos',  badge: 'study' },
  { href: '/import',  label: '⚡ Importador IA',    badge: null },
  { href: '/context', label: '💬 Contexto',          badge: null },
  { href: '/stats',   label: '📊 Mi Progreso',       badge: null },
]

export default function Nav() {
  const pathname = usePathname()
  const { state } = useStore()

  const pendingReview = getPendingCount(state.db, ['multi', 'meaning', 'kanji', 'reading', 'reverse'])
  const pendingStudy = state.db.filter(i => i.status === 'locked').length

  return (
    <div className="flex flex-wrap border-b border-slate-200 mb-6 bg-white rounded-xl shadow-sm overflow-hidden p-1 gap-1">
      {tabs.map(tab => {
        const active = pathname === tab.href || (tab.href !== '/' && pathname.startsWith(tab.href))
        const count = tab.badge === 'review' ? pendingReview : tab.badge === 'study' ? pendingStudy : 0
        return (
          <Link key={tab.href} href={tab.href}
            className={`flex-1 min-w-[110px] py-3 px-2 text-center rounded-lg font-semibold border-b-2 transition-all text-sm md:text-base ${
              active
                ? 'text-indigo-600 bg-indigo-50/50 border-indigo-600'
                : 'text-slate-500 border-transparent hover:bg-slate-50 hover:text-slate-700'
            }`}>
            {tab.label}
            {count > 0 && (
              <span className={`ml-1 text-white text-xs px-2 py-0.5 rounded-full ${tab.badge === 'review' ? 'bg-red-500' : 'bg-emerald-500'}`}>
                {count}
              </span>
            )}
          </Link>
        )
      })}
    </div>
  )
}
