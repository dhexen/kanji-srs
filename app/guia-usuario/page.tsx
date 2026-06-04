import type { Metadata } from 'next'
import UserGuideClient from './UserGuideClient'

export const metadata: Metadata = {
  title: 'Guía de Usuario — Kanji SRS',
  description: 'Guía completa para usar Kanji SRS',
}

export default function UserGuidePage() {
  return <UserGuideClient />
}
