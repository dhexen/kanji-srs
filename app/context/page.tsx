import type { Metadata } from 'next'
import ContextClient from '@/components/context/ContextClient'
export const metadata: Metadata = { title: '栞 / Context' }
export default function ContextPage() { return <ContextClient /> }
