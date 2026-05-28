import type { Metadata } from 'next'
import KanaClient from '@/components/kana/KanaClient'
export const metadata: Metadata = { title: '栞 / Kana' }
export default function KanaPage() { return <KanaClient /> }
