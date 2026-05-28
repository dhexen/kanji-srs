import type { Metadata } from 'next'
import ReviewClient from '@/components/review/ReviewClient'
export const metadata: Metadata = { title: '栞 / Repassos' }
export default function ReviewPage() { return <ReviewClient /> }
