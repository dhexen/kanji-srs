import type { Metadata } from 'next'
import GrammarClient from '@/components/grammar/GrammarClient'
import RoleGate from '@/components/ui/RoleGate'
export const metadata: Metadata = { title: '栞 / Gramàtica' }
export default function GrammarPage() { return <RoleGate><GrammarClient /></RoleGate> }
