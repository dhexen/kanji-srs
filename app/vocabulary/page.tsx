import { Suspense } from 'react'
import VocabularyClient from '@/components/vocabulary/VocabularyClient'

export default function VocabularyPage() {
  return (
    <Suspense>
      <VocabularyClient />
    </Suspense>
  )
}
