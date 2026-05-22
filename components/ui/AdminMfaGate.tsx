'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  onVerified: () => void
}

type Step = 'loading' | 'enroll' | 'verify'

export default function AdminMfaGate({ onVerified }: Props) {
  const [step, setStep] = useState<Step>('loading')
  const [factorId, setFactorId] = useState('')
  const [challengeId, setChallengeId] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: factorData } = await supabase.auth.mfa.listFactors()
      const verified = (factorData?.totp ?? []).find(f => f.status === 'verified')

      if (verified) {
        // Factor already enrolled — just need to verify the code
        setFactorId(verified.id)
        const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: verified.id })
        if (cErr) { setError(cErr.message); return }
        setChallengeId(ch.id)
        setStep('verify')
      } else {
        // No factor yet — enroll first
        const { data: enroll, error: eErr } = await supabase.auth.mfa.enroll({
          factorType: 'totp',
          issuer: 'KanjiSRS Academia',
          friendlyName: 'Google Authenticator',
        })
        if (eErr) { setError(eErr.message); return }
        setFactorId(enroll.id)
        setQrCode(enroll.totp.qr_code)
        setSecret(enroll.totp.secret)
        const { data: ch, error: cErr } = await supabase.auth.mfa.challenge({ factorId: enroll.id })
        if (cErr) { setError(cErr.message); return }
        setChallengeId(ch.id)
        setStep('enroll')
      }
    }
    init()
  }, [])

  async function handleVerify() {
    if (code.length !== 6) return
    setLoading(true)
    setError('')
    try {
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId, challengeId, code })
      if (vErr) throw vErr
      onVerified()
    } catch (e: any) {
      setError('Código incorrecto. Inténtalo de nuevo.')
      setCode('')
      // Refresh challenge for next attempt
      const { data: ch } = await supabase.auth.mfa.challenge({ factorId })
      if (ch) setChallengeId(ch.id)
    } finally {
      setLoading(false)
    }
  }

  if (step === 'loading') {
    return (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-sm mx-auto space-y-5">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🔐</span>
          <span className="font-bold text-amber-800">
            {step === 'enroll' ? 'Configura tu doble autenticación' : 'Verificación de administrador'}
          </span>
        </div>
        <p className="text-xs text-amber-700">
          {step === 'enroll'
            ? 'Escanea el código QR con Google Authenticator (o cualquier app TOTP) y después introduce el código de 6 dígitos para activarlo.'
            : 'Introduce el código de 6 dígitos de tu app de autenticación para acceder al panel de administración.'}
        </p>
      </div>

      {step === 'enroll' && qrCode && (
        <div className="flex flex-col items-center gap-3 p-5 bg-white border border-slate-200 rounded-xl">
          <img src={qrCode} alt="Código QR para Google Authenticator" className="w-44 h-44" />
          <p className="text-xs text-slate-400 text-center">¿No puedes escanear? Usa la clave manual:</p>
          <code className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-mono text-slate-700 break-all text-center">
            {secret}
          </code>
        </div>
      )}

      <div className="space-y-3">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleVerify()}
          placeholder="000 000"
          autoFocus
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-center font-mono text-2xl tracking-[0.3em] focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none"
        />

        {error && (
          <p className="text-xs text-rose-600 text-center">{error}</p>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition"
        >
          {loading ? 'Verificando…' : step === 'enroll' ? 'Activar 2FA y continuar' : 'Verificar y entrar'}
        </button>
      </div>
    </div>
  )
}
