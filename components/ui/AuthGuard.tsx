'use client'
import { useStore } from '@/lib/store'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'

export default function AuthGuard({ children }: { children: ReactNode }) {
  const { state } = useStore()
  const pathname = usePathname()
  const lang = state.lang

  if (pathname === '/stats') return <>{children}</>

  if (!state.loaded) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-sm font-medium">{t(lang, 'auth_loading')}</p>
      </div>
    )
  }

  if (!state.user) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center max-w-md mx-auto mt-8">
        <div className="text-6xl mb-4">🌸</div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">{t(lang, 'auth_title')}</h2>
        <p className="text-slate-500 mb-6 text-sm">{t(lang, 'auth_subtitle')}</p>
        <Link href="/stats" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md">
          {t(lang, 'auth_cta')}
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
