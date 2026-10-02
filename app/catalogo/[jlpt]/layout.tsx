import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import AdminGate from '@/components/ui/AdminGate'
import CatalogoShell from '@/components/catalogo/CatalogoShell'
import { nivelDeUrl } from '@/lib/catalogo'

export const metadata: Metadata = { title: '栞 / Catálogo' }

export default function CatalogoLayout({ params, children }: { params: { jlpt: string }; children: React.ReactNode }) {
  const jlpt = nivelDeUrl(params.jlpt)
  if (!jlpt) notFound()
  return (
    <AdminGate>
      <CatalogoShell jlpt={jlpt}>{children}</CatalogoShell>
    </AdminGate>
  )
}
