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
      <body className="bg-slate-50 text-slate-800 min-h-screen">
        <StoreProvider>
          <Toast />
          {/* Sidebar navigation */}
          <Nav />

          {/* Main content area — offset on desktop for the sidebar */}
          <div className="lg:pl-56 min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-12">
              <AuthGuard>
                {children}
              </AuthGuard>
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  )
}
