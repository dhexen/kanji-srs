import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import Toast from '@/components/ui/Toast'
import AuthShell from '@/components/ui/AuthShell'

export const metadata: Metadata = {
  title: '小学校漢字 SRS',
  description: 'Aprende kanjis con repetición espaciada e IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="text-slate-800 min-h-screen">
        <StoreProvider>
          {/* Toast siempre disponible, incluso en la página de login */}
          <Toast />
          {/* AuthShell decide si mostrar el sidebar o no según la ruta */}
          <AuthShell>
            {children}
          </AuthShell>
        </StoreProvider>
      </body>
    </html>
  )
}
