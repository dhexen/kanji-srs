import type { Metadata } from 'next'
import GrammarTestClient from '@/components/grammar-test/GrammarTestClient'
import AdminGate from '@/components/ui/AdminGate'
export const metadata: Metadata = { title: '栞 TEST / Gramàtica (sandbox)' }
export default function GrammarTestPage() { return <AdminGate><GrammarTestClient /></AdminGate> }
