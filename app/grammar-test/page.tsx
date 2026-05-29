import type { Metadata } from 'next'
import GrammarTestClient from '@/components/grammar-test/GrammarTestClient'
export const metadata: Metadata = { title: '栞 / Gramática Test' }
export default function GrammarTestPage() { return <GrammarTestClient /> }
