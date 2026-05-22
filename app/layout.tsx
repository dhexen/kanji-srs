import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import Header from '@/components/ui/Header'
import Nav from '@/components/ui/Nav'
import Toast from '@/components/ui/Toast'
import AuthGuard from '@/components/ui/AuthGuard'

export const metadata: Metadata = {
  title: '小学校漢字 SRS',
  description: 'Aprende kanjis con repetición espaciada e IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-slate-50 text-slate-800 min-h-screen pb-12">
        <StoreProvider>
          <Toast />
          <Header />
          <main className="max-w-4xl mx-auto px-4 mt-6">
            <Nav />
            <AuthGuard>
              {children}
            </AuthGuard>
          </main>
        </StoreProvider>
      </body>
    </html>
  )
}
