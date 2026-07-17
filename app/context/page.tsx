import type { Metadata } from 'next'
import ContextClient from '@/components/context/ContextClient'
import RoleGate from '@/components/ui/RoleGate'
export const metadata: Metadata = { title: '栞 / Lecturas IA' }
export default function ContextPage() { return <RoleGate><ContextClient /></RoleGate> }
