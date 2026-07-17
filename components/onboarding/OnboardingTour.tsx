'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { isPendingOnboarding, setOnboardingDoneLocally } from '@/lib/onboarding'
import { showToast } from '@/components/ui/Toast'

type L4 = Record<'es' | 'ca' | 'en' | 'ja', string>
function pick(lang: string, m: L4): string {
  return (m as Record<string, string>)[lang] ?? m.es
}

type Stage = 'kana-prompt' | 'kana-explain' | 'forecast' | 'quickadd' | 'modes' | 'levels'
const ORDER: Stage[] = ['kana-prompt', 'kana-explain', 'forecast', 'quickadd', 'modes', 'levels']

const TARGET: Partial<Record<Stage, string>> = {
  'kana-explain': 'kana-tile',
  forecast: 'forecast-card',
  quickadd: 'quick-add-panel',
  modes: 'mode-selector',
}

const TITLES: Record<Stage, L4> = {
  'kana-prompt': {
    es: '¿Ya conoces el hiragana y el katakana?',
    ca: 'Ja coneixes el hiragana i el katakana?',
    en: 'Do you already know hiragana and katakana?',
    ja: 'ひらがな・カタカナはもう知っていますか？',
  },
  'kana-explain': {
    es: 'La sección Kana',
    ca: 'La secció Kana',
    en: 'The Kana section',
    ja: 'かなセクション',
  },
  forecast: {
    es: 'Repasos para hoy',
    ca: 'Repassos per avui',
    en: "Today's reviews",
    ja: '今日の復習',
  },
  quickadd: {
    es: 'Añadir vocabulario nuevo',
    ca: 'Afegir vocabulari nou',
    en: 'Adding new vocabulary',
    ja: '新しい語彙の追加',
  },
  modes: {
    es: 'Tipos de repaso',
    ca: 'Tipus de repàs',
    en: 'Review types',
    ja: '復習の種類',
  },
  levels: {
    es: 'Niveles de las palabras',
    ca: 'Nivells de les paraules',
    en: 'Word levels',
    ja: '単語のレベル',
  },
}

const STAGE_ROWS: [string, L4][] = [
  ['0', { es: 'Sin estudiar', ca: 'Sense estudiar', en: 'Not studied', ja: '未学習' }],
  ['1-4', { es: 'Aprendiz', ca: 'Aprenent', en: 'Apprentice', ja: '見習い' }],
  ['5-6', { es: 'Gurú', ca: 'Gurú', en: 'Guru', ja: 'グル' }],
  ['7', { es: 'Maestro', ca: 'Mestre', en: 'Master', ja: 'マスター' }],
  ['8', { es: 'Iluminado', ca: 'Il·luminat', en: 'Enlightened', ja: '悟り' }],
  ['9', { es: 'Quemado', ca: 'Cremat', en: 'Burned', ja: '燃え尽き' }],
]

export default function OnboardingTour() {
  const { state, markHelpSeen } = useStore()
  const pathname = usePathname()
  const lang = state.lang

  const [stage, setStage] = useState<Stage>('kana-prompt')
  const [skipKanaExplain, setSkipKanaExplain] = useState(false)
  const [active, setActive] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const effectiveRole = state.simulatedRole ?? state.role
  const helpSeenConfirmed = state.helpSeenLoaded || state.justSignedUp
  const eligible = state.loaded && isPendingOnboarding(effectiveRole, state.helpSeen, helpSeenConfirmed)

  // Activate (with a short delay so an admin/contributor account's real role
  // has time to resolve before we ever show the tour to them by mistake).
  useEffect(() => {
    if (!eligible || pathname !== '/review') { setActive(false); return }
    const timer = setTimeout(() => setActive(true), 700)
    return () => clearTimeout(timer)
  }, [eligible, pathname])

  // Safety net: if the role resolves away from 'user' after we already activated, bail out.
  useEffect(() => {
    if (active && !eligible) setActive(false)
  }, [active, eligible])

  // Spotlight positioning
  const targetId = TARGET[stage] ?? null
  useEffect(() => {
    if (!active || !targetId) { setRect(null); return }
    const el = document.querySelector(`[data-tutorial-id="${targetId}"]`)
    if (!el) { setRect(null); return }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    const update = () => setRect(el.getBoundingClientRect())
    update()
    const settleTimer = setTimeout(update, 350)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      clearTimeout(settleTimer)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [active, targetId, stage])

  const startedFinishRef = useRef(false)
  function finish(completed: boolean) {
    if (startedFinishRef.current) return
    startedFinishRef.current = true
    setOnboardingDoneLocally()
    markHelpSeen('onboarding')
    setActive(false)
    if (completed) {
      showToast(
        pick(lang, { es: '¡Tutorial completado! 🎉', ca: 'Tutorial completat! 🎉', en: 'Tutorial complete! 🎉', ja: 'チュートリアル完了！🎉' }),
        'success',
      )
    }
  }

  function visibleIndex(s: Stage): number {
    return ORDER.filter(x => !(x === 'kana-explain' && skipKanaExplain)).indexOf(s)
  }
  const totalSteps = ORDER.filter(x => !(x === 'kana-explain' && skipKanaExplain)).length

  function goNext() {
    const idx = ORDER.indexOf(stage)
    let nextIdx = idx + 1
    if (ORDER[nextIdx] === 'kana-explain' && skipKanaExplain) nextIdx++
    if (nextIdx >= ORDER.length) { finish(true); return }
    setStage(ORDER[nextIdx])
  }
  function goBack() {
    const idx = ORDER.indexOf(stage)
    let prevIdx = idx - 1
    if (prevIdx >= 0 && ORDER[prevIdx] === 'kana-explain' && skipKanaExplain) prevIdx--
    if (prevIdx < 0) return
    setStage(ORDER[prevIdx])
  }

  if (!active) return null

  const title = pick(lang, TITLES[stage])

  return createPortal(
    <>
      {/* Full-screen click-blocker */}
      <div className="fixed inset-0 z-[100]" />

      {/* Dimmer / spotlight */}
      {rect ? (
        <div
          className="fixed z-[100] rounded-xl ring-2 ring-violet-400 pointer-events-none transition-all duration-300"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15,23,42,0.68)',
          }}
        />
      ) : (
        <div className="fixed inset-0 z-[100] bg-slate-900/68 pointer-events-none" />
      )}

      {/* Tooltip card */}
      <div
        className="fixed z-[101] w-[min(340px,92vw)] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4"
        style={tooltipPosition(rect)}
      >
        <div className="flex items-start justify-between gap-2 mb-1">
          <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 uppercase tracking-wide">
            {pick(lang, { es: 'Tutorial', ca: 'Tutorial', en: 'Tutorial', ja: 'チュートリアル' })} · {visibleIndex(stage) + 1}/{totalSteps}
          </span>
          <button
            type="button"
            onClick={() => finish(false)}
            aria-label="Saltar tutorial"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-sm font-bold leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">{title}</h3>

        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-2">
          <StageBody stage={stage} lang={lang} />
        </div>

        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
          {stage === 'kana-prompt' ? (
            <div className="flex flex-col gap-1.5 w-full">
              <button
                type="button"
                onClick={() => { setSkipKanaExplain(false); setStage('kana-explain') }}
                className="w-full px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
              >
                {pick(lang, { es: 'No, quiero repasarlos', ca: 'No, vull repassar-los', en: 'No, I want to review them', ja: 'いいえ、復習したいです' })}
              </button>
              <button
                type="button"
                onClick={() => { setSkipKanaExplain(true); setStage('forecast') }}
                className="w-full px-3 py-1.5 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-slate-700 text-xs font-semibold transition"
              >
                {pick(lang, { es: 'Sí, ya los sé — continuar', ca: 'Sí, ja els sé — continuar', en: 'Yes, I know them — continue', ja: 'はい、知っています — 続ける' })}
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={goBack}
                disabled={visibleIndex(stage) === 0}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-0 transition"
              >
                {pick(lang, { es: '← Atrás', ca: '← Enrere', en: '← Back', ja: '← 戻る' })}
              </button>
              <button
                type="button"
                onClick={goNext}
                className="px-4 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition"
              >
                {stage === 'levels'
                  ? pick(lang, { es: 'Finalizar', ca: 'Finalitzar', en: 'Finish', ja: '完了' })
                  : pick(lang, { es: 'Siguiente →', ca: 'Següent →', en: 'Next →', ja: '次へ →' })}
              </button>
            </>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}

function tooltipPosition(rect: DOMRect | null): React.CSSProperties {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  const margin = 12
  const spaceBelow = window.innerHeight - rect.bottom
  const placeBelow = spaceBelow > 200
  const left = Math.min(Math.max(rect.left, margin), window.innerWidth - 340 - margin)
  return placeBelow
    ? { top: rect.bottom + margin, left }
    : { bottom: window.innerHeight - rect.top + margin, left }
}

function StageBody({ stage, lang }: { stage: Stage; lang: string }) {
  switch (stage) {
    case 'kana-prompt':
      return (
        <p>
          {pick(lang, {
            es: 'Son la base para leer japonés. Si aún no los dominas, te los presentamos antes de seguir con el resto de la app.',
            ca: 'Són la base per llegir japonès. Si encara no els domines, te els presentem abans de continuar amb la resta de l\'app.',
            en: "They're the foundation for reading Japanese. If you're not confident with them yet, we'll introduce them before the rest of the app.",
            ja: '日本語を読むための基礎です。まだ自信がない場合は、他の機能の前にご案内します。',
          })}
        </p>
      )
    case 'kana-explain':
      return (
        <ol className="space-y-1.5 list-decimal list-inside">
          <li>{pick(lang, {
            es: 'Toca un kana para ver su significado y cómo se escribe.',
            ca: 'Toca un kana per veure el seu significat i com s\'escriu.',
            en: 'Tap a kana to see its reading and how it\'s written.',
            ja: 'かなをタップすると、読み方と書き方が表示されます。',
          })}</li>
          <li>{pick(lang, {
            es: 'Pulsa "Empezar a aprender" para memorizarlos paso a paso.',
            ca: 'Prem "Començar a aprendre" per memoritzar-los pas a pas.',
            en: 'Tap "Start learning" to memorize them step by step.',
            ja: '「学習を始める」を押すと、段階的に覚えられます。',
          })}</li>
          <li>{pick(lang, {
            es: 'Cuando te sientas preparado, haz el test para comprobar que los recuerdas.',
            ca: 'Quan et sentis preparat, fes el test per comprovar que els recordes.',
            en: 'When you feel ready, take the test to check you remember them.',
            ja: '準備ができたら、テストで覚えているか確認しましょう。',
          })}</li>
        </ol>
      )
    case 'forecast':
      return (
        <p>
          {pick(lang, {
            es: 'Este es tu calendario de repasos. El número grande son los repasos pendientes ahora mismo — pulsa "Empezar repaso" para hacerlos. Debajo verás cuántos tendrás cada hora y en los próximos días, para planificarte.',
            ca: 'Aquest és el teu calendari de repassos. El número gran són els repassos pendents ara mateix — prem "Començar repàs" per fer-los. A sota veuràs quants en tindràs cada hora i els propers dies.',
            en: 'This is your review calendar. The big number is how many reviews are due right now — tap "Start review" to do them. Below you\'ll see how many you\'ll get each hour and over the coming days.',
            ja: 'これは復習カレンダーです。大きな数字は現在の未消化の復習数です。「復習を始める」をタップして始めましょう。下には今後の時間・日ごとの予定が表示されます。',
          })}
        </p>
      )
    case 'quickadd':
      return (
        <p>
          {pick(lang, {
            es: 'Desde aquí añades vocabulario nuevo agrupado por kanji. Elige el ritmo según cuánto quieras aprender de golpe: Normal (pocas palabras), Rápido o Súper rápido (muchas más de una vez).',
            ca: 'Des d\'aquí afegeixes vocabulari nou agrupat per kanji. Tria el ritme segons quant vulguis aprendre de cop: Normal (poques paraules), Ràpid o Súper ràpid (moltes més d\'una vegada).',
            en: 'Here you add new vocabulary grouped by kanji. Pick a pace based on how much you want to learn at once: Normal (fewer words), Fast or Super fast (many more at once).',
            ja: 'ここでは漢字ごとにまとめた新しい語彙を追加できます。一度にどれだけ学びたいかでペースを選べます：通常（少なめ）、速い、超速（一気に多く）。',
          })}
        </p>
      )
    case 'modes':
      return (
        <p>
          {pick(lang, {
            es: 'Cada pastilla es un tipo de pregunta (lectura, significado, escribir...). Tócala para activarla o desactivarla — solo se te preguntará de los tipos activos. Tu selección se recuerda para la próxima vez.',
            ca: 'Cada píndola és un tipus de pregunta (lectura, significat, escriure...). Toca-la per activar-la o desactivar-la — només se\'t preguntarà dels tipus actius. La selecció es recorda per a la propera vegada.',
            en: 'Each pill is a question type (reading, meaning, writing...). Tap it to turn it on or off — you\'ll only be asked the active types. Your selection is remembered for next time.',
            ja: '各ピルは問題の種類（読み、意味、書き取りなど）です。タップしてオン/オフを切り替えられます。有効な種類だけが出題され、選択は次回も記憶されます。',
          })}
        </p>
      )
    case 'levels':
      return (
        <>
          <div className="grid grid-cols-3 gap-1 text-[10px] text-center">
            {STAGE_ROWS.map(([lvl, name]) => (
              <div key={lvl} className="rounded-lg p-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">
                <div className="font-bold">{lvl}</div>
                <div className="opacity-80">{pick(lang, name)}</div>
              </div>
            ))}
          </div>
          <p>
            {pick(lang, {
              es: 'Acertar un repaso sube el nivel de la palabra; fallarlo lo baja. Cuanto más alto el nivel, más tiempo pasa hasta el siguiente repaso.',
              ca: 'Encertar un repàs puja el nivell de la paraula; fallar-lo el baixa. Com més alt el nivell, més temps passa fins al següent repàs.',
              en: 'Getting a review right raises the word\'s level; getting it wrong lowers it. The higher the level, the longer until the next review.',
              ja: '正解すると単語のレベルが上がり、間違えると下がります。レベルが高いほど、次の復習までの間隔が長くなります。',
            })}
          </p>
        </>
      )
  }
}
