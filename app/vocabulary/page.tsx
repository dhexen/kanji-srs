import type { Metadata } from 'next'
import { Suspense } from 'react'
import VocabularyClient from '@/components/vocabulary/VocabularyClient'
export const metadata: Metadata = { title: '栞 / Vocabulari' }
export default function VocabularyPage() {
  return <Suspense><VocabularyClient /></Suspense>
}
