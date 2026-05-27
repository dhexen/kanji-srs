'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useStore } from '@/lib/store'
import { t, LANG_NAMES, type Lang } from '@/lib/i18n'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const { state, login, signup, signInWithGoogle, setLang } = useStore()
  const router = useRouter()
  const lang = state.lang

  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')

  // Si ya hay sesión activa, redirigir a /review
  useEffect(() => {
    if (state.loaded && state.user) {
      router.replace('/review')
    }
  }, [state.loaded, state.user, router])

  const switchMode = (m: Mode) => {
    setMode(m)
    setError('')
    setPassword('')
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    setError('')
    try {
      await signInWithGoogle()
      // La redirección la gestiona el flujo OAuth
    } catch {
      setError(t(lang, 'login_error_google'))
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError('')
    try {
      if (mode === 'signin') {
        await login(email.trim(), password)
        // login() establece el usuario → el useEffect redirigirá
      } else {
        const result = await signup(email.trim(), password)
        if (result === 'needs_confirmation') {
          setConfirmEmail(email.trim())
        }
        // result === 'ok' → usuario establecido → useEffect redirige
      }
    } catch {
      setError(
        mode === 'signin'
          ? t(lang, 'login_error_credentials')
          : t(lang, 'login_error_signup'),
      )
    } finally {
      setLoading(false)
    }
  }

  // ── Selector de idioma (flotante, esquina superior derecha) ─────────────
  const LangSelector = () => (
    <div className="fixed top-4 right-4 z-50">
      <select
        value={lang}
        onChange={e => setLang(e.target.value as Lang)}
        className="text-xs bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 shadow-sm hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
        aria-label="Idioma / Language"
      >
        {(Object.entries(LANG_NAMES) as [Lang, string][]).map(([code, name]) => (
          <option key={code} value={code}>{name}</option>
        ))}
      </select>
    </div>
  )

  // ── Spinner mientras se determina si hay sesión ──────────────────────────
  if (!state.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20">
        <LangSelector />
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }

  // ── Confirmación de email pendiente (registro con email no instantáneo) ──
  if (confirmEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 px-4">
        <LangSelector />
        <div className="w-full max-w-sm text-center">
          <div className="text-5xl mb-4 select-none">📧</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {t(lang, 'login_confirm_title')}
          </h2>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">
            {t(lang, 'login_confirm_body')}{' '}
            <strong className="text-slate-700 break-all">{confirmEmail}</strong>
          </p>
          <button
            type="button"
            onClick={() => { setConfirmEmail(''); setPassword('') }}
            className="text-sm text-violet-600 hover:underline"
          >
            {t(lang, 'login_confirm_back')}
          </button>
        </div>
      </div>
    )
  }

  // ── Página de bienvenida ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 via-violet-50/30 to-pink-50/20 px-4 py-12">
      <LangSelector />

      {/* Branding */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-3 select-none">🌸</div>
        <h1 className="text-3xl font-bold text-violet-700 tracking-wide">小学校漢字</h1>
        <p className="text-violet-400 text-sm font-medium mt-1">SRS</p>
        <p className="text-slate-500 text-sm mt-2">{t(lang, 'login_tagline')}</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

        {/* Tabs: Iniciar sesión / Crear cuenta */}
        <div className="flex border-b border-slate-100">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'signin'
                ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/40'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t(lang, 'login_tab_signin')}
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              mode === 'signup'
                ? 'text-violet-700 border-b-2 border-violet-600 bg-violet-50/40'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {t(lang, 'login_tab_signup')}
          </button>
        </div>

        <div className="p-8 space-y-5">

          {/* Botón Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-slate-700 font-medium hover:bg-slate-50 active:bg-slate-100 transition-all disabled:opacity-50 cursor-pointer"
          >
            {/* Logo Google */}
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? '...' : t(lang, 'login_google')}
          </button>

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">{t(lang, 'login_or')}</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>

          {/* Formulario email + contraseña */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t(lang, 'login_email_ph')}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition"
              required
              autoComplete="email"
              autoFocus
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t(lang, 'login_password_ph')}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300 transition"
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={mode === 'signup' ? 6 : undefined}
            />
            <button
              type="submit"
              disabled={loading || googleLoading || !email.trim() || !password}
              className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50"
            >
              {loading
                ? '...'
                : mode === 'signin'
                  ? t(lang, 'login_signin')
                  : t(lang, 'login_signup')}
            </button>
          </form>

          {/* Mensaje de error */}
          {error && (
            <p className="text-sm text-red-500 text-center leading-snug">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
