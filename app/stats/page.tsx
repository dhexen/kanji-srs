import { Suspense } from 'react'
import StatsClient from '@/components/stats/StatsClient'

export default function StatsPage() {
  return (
    <Suspense>
      <StatsClient />
    </Suspense>
  )
}
