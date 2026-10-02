import { notFound } from 'next/navigation'
import CatalogoFicha from '@/components/catalogo/CatalogoFicha'
import { nivelDeUrl } from '@/lib/catalogo'

export default function CatalogoFichaPage({ params }: { params: { jlpt: string; slug: string } }) {
  const jlpt = nivelDeUrl(params.jlpt)
  if (!jlpt) notFound()
  let slug = params.slug
  try {
    slug = decodeURIComponent(slug)
  } catch {}
  return <CatalogoFicha key={slug} jlpt={jlpt} slug={slug} />
}
