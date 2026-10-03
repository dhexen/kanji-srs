import type { Metadata } from 'next'
import AdminGate from '@/components/ui/AdminGate'
import CatalogoRepaso from '@/components/catalogo/CatalogoRepaso'
import { nivelDeUrl } from '@/lib/catalogo'

export const metadata: Metadata = { title: '栞 / Repaso del catálogo' }

export default function CatalogoRepasoPage({ searchParams }: { searchParams: { desde?: string } }) {
  const jlpt = nivelDeUrl(searchParams.desde ?? '')
  return (
    <AdminGate>
      <CatalogoRepaso volver={`/catalogo/${(jlpt ?? 'N5').toLowerCase()}`} />
    </AdminGate>
  )
}
