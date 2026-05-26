import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import { SidebarProvider } from '@/lib/sidebar-context'
import Nav from '@/components/ui/Nav'
import LayoutShell from '@/components/ui/LayoutShell'
import Toast from '@/components/ui/Toast'
import AuthGuard from '@/components/ui/AuthGuard'
import Tutorial from '@/components/ui/Tutorial'

export const metadata: Metadata = {
  title: '小学校漢字 SRS',
  description: 'Aprende kanjis con repetición espaciada e IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="text-slate-800 min-h-screen">
        <StoreProvider>
          <SidebarProvider>
            <Toast />
            <Tutorial />
            {/* Sidebar navigation */}
            <Nav />
            {/* Main content — padding adjusts with sidebar collapse state */}
            <LayoutShell>
              <AuthGuard>
                {children}
              </AuthGuard>
            </LayoutShell>
          </SidebarProvider>
        </StoreProvider>
      </body>
    </html>
  )
}
