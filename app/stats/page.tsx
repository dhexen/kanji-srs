import type { Metadata } from 'next'
import { Suspense } from 'react'
import StatsClient from '@/components/stats/StatsClient'
export const metadata: Metadata = { title: '栞 / Perfil' }
export default function StatsPage() {
  return <Suspense><StatsClient /></Suspense>
}
