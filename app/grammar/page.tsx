import type { Metadata } from 'next'
import GrammarClient from '@/components/grammar/GrammarClient'
export const metadata: Metadata = { title: '栞 / Gramàtica' }
export default function GrammarPage() { return <GrammarClient /> }
