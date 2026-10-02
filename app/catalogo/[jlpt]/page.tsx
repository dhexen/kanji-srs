import { notFound } from 'next/navigation'
import CatalogoVacio from '@/components/catalogo/CatalogoVacio'
import { nivelDeUrl } from '@/lib/catalogo'

export default function CatalogoNivelPage({ params }: { params: { jlpt: string } }) {
  const jlpt = nivelDeUrl(params.jlpt)
  if (!jlpt) notFound()
  return <CatalogoVacio jlpt={jlpt} />
}
