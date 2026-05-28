import type { Metadata } from 'next'
import './globals.css'
import { StoreProvider } from '@/lib/store'
import Toast from '@/components/ui/Toast'
import AuthShell from '@/components/ui/AuthShell'

export const metadata: Metadata = {
  title: '栞',
  description: 'Aprende kanjis con repetición espaciada e IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        {/* Anti-flash: apply dark class before React hydration */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('kanji-srs-theme') || 'system';
            if (t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body className="text-slate-800 dark:text-slate-100 dark:bg-slate-950 min-h-screen">
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
