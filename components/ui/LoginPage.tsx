'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

export default function LoginPage() {
  const { state, signInWithGoogle, signInWithMagicLink } = useStore()
  const router = useRouter()
  const lang = state.lang

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  // Si ya hay sesión activa, redirigir a /review
  useEffect(() => {
    if (state.loaded && state.user) {
      router.replace('/review')
    }
  }, [state.loaded, state.user, router])

  const handleGoogle = async () => {
    setLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      // La redirección la gestiona el flujo OAuth — no hace falta hacer nada más aquí
    } catch {
      setError(t(lang, 'login_error_google'))
      setLoading(false)
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    try {
      await signInWithMagicLink(email.trim())
      setSent(true)
    } catch {
      setError(t(lang, 'login_error_email'))
    } finally {
      setLoading(false)
    }
  }

  // Spinner mientras se determina si hay sesión
  if (!state.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 px-4">
      <div className="w-full max-w-sm">

        {/* ── Branding ─────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 select-none">🌸</div>
          <h1 className="text-3xl font-bold text-violet-700 tracking-wide">小学校漢字</h1>
          <p className="text-violet-400 text-sm font-medium mt-1">SRS</p>
          <p className="text-slate-500 text-sm mt-2">{t(lang, 'login_tagline')}</p>
        </div>

        {/* ── Card ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 p-8">

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 active:bg-slate-100 dark:active:bg-slate-600 transition-all disabled:opacity-50 cursor-pointer"
          >
            {/* Google logo */}
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {t(lang, 'login_google')}
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">{t(lang, 'login_or')}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Email magic link */}
          {sent ? (
            /* Confirmación de envío */
            <div className="text-center py-2">
              <div className="text-5xl mb-3 select-none">📧</div>
              <p className="font-semibold text-slate-800 dark:text-slate-100 text-base">{t(lang, 'login_sent_title')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                {t(lang, 'login_sent_body')}{' '}
                <strong className="text-slate-700 dark:text-slate-200 break-all">{email}</strong>
              </p>
              <button
                type="button"
                onClick={() => { setSent(false); setEmail('') }}
                className="text-xs text-violet-500 mt-5 hover:underline"
              >
                {t(lang, 'login_sent_other')}
              </button>
            </div>
          ) : (
            /* Formulario de email */
            <form onSubmit={handleMagicLink} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={t(lang, 'login_email_ph')}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition placeholder:text-slate-400 dark:placeholder:text-slate-500"
                required
                autoComplete="email"
                autoFocus
              />
              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? t(lang, 'login_sending') : t(lang, 'login_send_link')}
              </button>
            </form>
          )}

          {/* Mensaje de error */}
          {error && (
            <p className="text-sm text-red-500 text-center mt-4 leading-snug">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
