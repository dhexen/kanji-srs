import { Suspense } from 'react'
import GrammarSeedClient from '@/components/admin/GrammarSeedClient'
import AdminEnrichJlpt from '@/components/admin/AdminEnrichJlpt'
import AdminGenerateSchemes from '@/components/admin/AdminGenerateSchemes'

export const metadata = { title: 'Generar frases de gramática' }

export default function GrammarSeedPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <a href="/admin" className="text-slate-400 hover:text-slate-600 text-sm">← Admin</a>
          <h1 className="text-xl font-semibold text-slate-800">Generación de frases de gramática</h1>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <Suspense fallback={<div className="p-8 text-slate-400">Cargando…</div>}>
            <GrammarSeedClient />
          </Suspense>
        </div>
        <h2 className="text-lg font-semibold text-purple-800 mt-8 mb-3">🧪 Sandbox de test (Gramàtica TEST)</h2>
        <div className="bg-white rounded-xl border border-purple-200 shadow-sm">
          <Suspense fallback={<div className="p-8 text-slate-400">Cargando…</div>}>
            <GrammarSeedClient target="test" />
          </Suspense>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
          <AdminEnrichJlpt />
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mt-6">
          <AdminGenerateSchemes />
        </div>
      </div>
    </div>
  )
}
