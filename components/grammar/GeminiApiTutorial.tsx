'use client'
import { useState } from 'react'
import Link from 'next/link'
import type { Lang } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Per-language step content (long text lives here, not in i18n to avoid bloat)
// ─────────────────────────────────────────────────────────────────────────────

const STEPS: Record<Lang, {
  title: string
  intro: string
  steps: { icon: string; text: string }[]
  cta?: { label: string; href: string; external?: boolean }
}[]> = {
  es: [
    {
      title: '¿Por qué necesito una API Key?',
      intro: 'Esta app usa la IA de Google (Gemini Flash) para generar frases de práctica personalizadas. La clave es completamente gratuita y solo requiere una cuenta de Google.',
      steps: [
        { icon: '🤖', text: 'Gemini genera frases de práctica adaptadas a tu nivel JLPT' },
        { icon: '🆓', text: 'La capa gratuita es más que suficiente para estudiar a diario' },
        { icon: '🔒', text: 'Tu clave se guarda encriptada solo en tu cuenta' },
      ],
    },
    {
      title: 'Paso 1 — Obtener la clave en Google AI Studio',
      intro: 'Ve a Google AI Studio y crea tu API Key gratuita en menos de 2 minutos:',
      steps: [
        { icon: '1️⃣', text: 'Haz clic en el botón de abajo para abrir Google AI Studio' },
        { icon: '2️⃣', text: 'Inicia sesión con tu cuenta de Google' },
        { icon: '3️⃣', text: 'Haz clic en "Get API key" → "Create API key"' },
        { icon: '4️⃣', text: 'Selecciona un proyecto (o crea uno nuevo) y copia la clave generada' },
      ],
      cta: {
        label: '🔗 Abrir Google AI Studio',
        href: 'https://aistudio.google.com/apikey',
        external: true,
      },
    },
    {
      title: 'Paso 2 — Guardarla en la aplicación',
      intro: 'Ahora pega tu clave en la sección «Mi Perfil» de la app:',
      steps: [
        { icon: '1️⃣', text: 'Haz clic en el botón de abajo para ir a tu perfil' },
        { icon: '2️⃣', text: 'Busca el campo "Gemini API Key" y pega tu clave' },
        { icon: '3️⃣', text: 'Guarda los cambios y vuelve a esta sección de Gramática' },
        { icon: '✅', text: '¡Ya está! Podrás generar frases de práctica ilimitadas' },
      ],
      cta: {
        label: '⚙️ Ir a Mi Perfil',
        href: '/stats',
      },
    },
  ],

  ca: [
    {
      title: 'Per què necessito una API Key?',
      intro: 'Aquesta app usa la IA de Google (Gemini Flash) per generar frases de pràctica personalitzades. La clau és completament gratuïta i només requereix un compte de Google.',
      steps: [
        { icon: '🤖', text: 'Gemini genera frases de pràctica adaptades al teu nivell JLPT' },
        { icon: '🆓', text: 'La capa gratuïta és més que suficient per estudiar cada dia' },
        { icon: '🔒', text: 'La teva clau es desa encriptada només al teu compte' },
      ],
    },
    {
      title: 'Pas 1 — Obtenir la clau a Google AI Studio',
      intro: 'Ves a Google AI Studio i crea la teva API Key gratuïta en menys de 2 minuts:',
      steps: [
        { icon: '1️⃣', text: 'Fes clic al botó de baix per obrir Google AI Studio' },
        { icon: '2️⃣', text: 'Inicia sessió amb el teu compte de Google' },
        { icon: '3️⃣', text: 'Fes clic a "Get API key" → "Create API key"' },
        { icon: '4️⃣', text: 'Selecciona un projecte (o crea\'n un de nou) i copia la clau generada' },
      ],
      cta: {
        label: '🔗 Obrir Google AI Studio',
        href: 'https://aistudio.google.com/apikey',
        external: true,
      },
    },
    {
      title: 'Pas 2 — Desar-la a l\'aplicació',
      intro: 'Ara enganxa la teva clau a la secció «El meu perfil» de l\'app:',
      steps: [
        { icon: '1️⃣', text: 'Fes clic al botó de baix per anar al teu perfil' },
        { icon: '2️⃣', text: 'Cerca el camp "Gemini API Key" i enganxa la teva clau' },
        { icon: '3️⃣', text: 'Desa els canvis i torna a aquesta secció de Gramàtica' },
        { icon: '✅', text: 'Ja està! Podràs generar frases de pràctica il·limitades' },
      ],
      cta: {
        label: '⚙️ Anar al meu perfil',
        href: '/stats',
      },
    },
  ],

  en: [
    {
      title: 'Why do I need an API Key?',
      intro: 'This app uses Google AI (Gemini Flash) to generate personalised practice sentences. The key is completely free and only requires a Google account.',
      steps: [
        { icon: '🤖', text: 'Gemini generates practice sentences tailored to your JLPT level' },
        { icon: '🆓', text: 'The free tier is more than enough for daily study' },
        { icon: '🔒', text: 'Your key is stored encrypted only in your account' },
      ],
    },
    {
      title: 'Step 1 — Get your key from Google AI Studio',
      intro: 'Go to Google AI Studio and create your free API Key in under 2 minutes:',
      steps: [
        { icon: '1️⃣', text: 'Click the button below to open Google AI Studio' },
        { icon: '2️⃣', text: 'Sign in with your Google account' },
        { icon: '3️⃣', text: 'Click "Get API key" → "Create API key"' },
        { icon: '4️⃣', text: 'Select a project (or create a new one) and copy the generated key' },
      ],
      cta: {
        label: '🔗 Open Google AI Studio',
        href: 'https://aistudio.google.com/apikey',
        external: true,
      },
    },
    {
      title: 'Step 2 — Save it in the app',
      intro: 'Now paste your key in the «My Profile» section of the app:',
      steps: [
        { icon: '1️⃣', text: 'Click the button below to go to your profile' },
        { icon: '2️⃣', text: 'Find the "Gemini API Key" field and paste your key' },
        { icon: '3️⃣', text: 'Save the changes and return to the Grammar section' },
        { icon: '✅', text: 'Done! You can now generate unlimited practice sentences' },
      ],
      cta: {
        label: '⚙️ Go to My Profile',
        href: '/stats',
      },
    },
  ],

  ja: [
    {
      title: 'APIキーが必要な理由',
      intro: 'このアプリはGoogle AI（Gemini Flash）を使って、レベルに合った練習文を生成します。APIキーは完全無料で、Googleアカウントがあればすぐに取得できます。',
      steps: [
        { icon: '🤖', text: 'GeminiがJLPTレベルに合わせた練習文を生成します' },
        { icon: '🆓', text: '無料枠で毎日の学習には十分です' },
        { icon: '🔒', text: 'キーは暗号化されてあなたのアカウントにのみ保存されます' },
      ],
    },
    {
      title: 'ステップ1 — Google AI StudioでAPIキーを取得',
      intro: 'Google AI Studioにアクセスして、2分以内に無料のAPIキーを作成しましょう：',
      steps: [
        { icon: '1️⃣', text: '下のボタンをクリックしてGoogle AI Studioを開く' },
        { icon: '2️⃣', text: 'Googleアカウントでサインイン' },
        { icon: '3️⃣', text: '「Get API key」→「Create API key」をクリック' },
        { icon: '4️⃣', text: 'プロジェクトを選択（または作成）してキーをコピー' },
      ],
      cta: {
        label: '🔗 Google AI Studioを開く',
        href: 'https://aistudio.google.com/apikey',
        external: true,
      },
    },
    {
      title: 'ステップ2 — アプリに保存する',
      intro: 'コピーしたキーをアプリの「マイプロフィール」に貼り付けます：',
      steps: [
        { icon: '1️⃣', text: '下のボタンをクリックしてプロフィールページへ' },
        { icon: '2️⃣', text: '「Gemini API Key」フィールドにキーを貼り付け' },
        { icon: '3️⃣', text: '変更を保存してこの文法セクションに戻る' },
        { icon: '✅', text: '完了！練習文を無制限に生成できます' },
      ],
      cta: {
        label: '⚙️ マイプロフィールへ',
        href: '/stats',
      },
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
  lang: Lang
  /** Compact mode: used inside cards (GrammarExamples). Full mode: standalone (GrammarPractice). */
  compact?: boolean
}

export default function GeminiApiTutorial({ lang, compact = false }: Props) {
  const [step, setStep] = useState(0)
  const steps = STEPS[lang] ?? STEPS.es
  const current = steps[step]
  const isLast = step === steps.length - 1

  return (
    <div className={`rounded-2xl border border-amber-200 bg-amber-50 overflow-hidden ${compact ? '' : 'shadow-md'}`}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-100 border-b border-amber-200">
        <span className="text-xl">🔑</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900 leading-tight truncate">
            Gemini API Key
          </p>
          <p className="text-[10px] text-amber-700 font-medium">
            {step + 1} / {steps.length}
          </p>
        </div>
        {/* Step dots */}
        <div className="flex items-center gap-1.5 shrink-0">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step
                  ? 'bg-amber-600 scale-125'
                  : i < step
                    ? 'bg-amber-400'
                    : 'bg-amber-200'
              }`}
              aria-label={`Paso ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-4 pt-4 pb-3 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-amber-900 mb-1">{current.title}</h3>
          <p className="text-xs text-amber-800 leading-relaxed">{current.intro}</p>
        </div>

        {/* Step list */}
        <ul className="space-y-2">
          {current.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="shrink-0 text-base leading-none mt-0.5">{s.icon}</span>
              <span className="text-xs text-amber-800 leading-relaxed">{s.text}</span>
            </li>
          ))}
        </ul>

        {/* CTA button */}
        {current.cta && (
          current.cta.external ? (
            <a
              href={current.cta.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              {current.cta.label}
              <svg className="w-3.5 h-3.5 opacity-70" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          ) : (
            <Link
              href={current.cta.href}
              className="flex items-center justify-center gap-2 w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition shadow-sm"
            >
              {current.cta.label}
            </Link>
          )
        )}
      </div>

      {/* Navigation footer */}
      <div className="flex items-center justify-between px-4 pb-4 gap-2">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="text-xs font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-30 disabled:cursor-not-allowed transition px-2 py-1"
        >
          ← Anterior
        </button>

        {!isLast ? (
          <button
            onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition"
          >
            Siguiente →
          </button>
        ) : (
          <Link
            href="/stats"
            className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition"
          >
            ✓ Ir a configuración
          </Link>
        )}
      </div>
    </div>
  )
}
