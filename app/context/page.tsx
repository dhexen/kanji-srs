import type { Metadata } from 'next'
import ContextClient from '@/components/context/ContextClient'
export const metadata: Metadata = { title: '栞 / Lecturas IA' }
export default function ContextPage() { return <ContextClient /> }
