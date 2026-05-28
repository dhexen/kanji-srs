'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '@/lib/store'
import { driver as createDriver } from 'driver.js'
import 'driver.js/dist/driver.css'

// ─── Constants ────────────────────────────────────────────────────────────────
export const TOUR_DONE_KEY = 'kanji_tour_v3_done'
const TOUR_PHASE_KEY = 'kanji_tour_v3_phase'

type Phase = 'dashboard-init' | 'await-study' | 'study-intro' | 'dashboard-full'

// ─── Labels ───────────────────────────────────────────────────────────────────
type ML = Record<string, string>

const L: Record<string, ML> = {
  welcome_title: {
    es: '¡Bienvenido! 🌸', en: 'Welcome! 🌸', ca: 'Benvingut! 🌸', ja: 'ようこそ！🌸',
  },
  welcome_body: {
    es: 'Te guiaremos en tus primeros pasos para aprender kanji con repetición espaciada. El tour solo dura unos minutos.',
    en: 'We\'ll guide you through your first steps to learn kanji with spaced repetition. The tour only takes a few minutes.',
    ca: 'Et guiarem pels teus primers passos per aprendre kanji amb repetició espaïda. El tour dura només uns minuts.',
    ja: '間隔反復で漢字を学ぶ最初のステップをご案内します。ツアーは数分で終わります。',
  },
  quickadd_title: {
    es: 'Añade tus primeros kanjis 📚', en: 'Add your first kanji 📚',
    ca: 'Afegeix els teus primers kanjis 📚', ja: '最初の漢字を追加 📚',
  },
  quickadd_body: {
    es: 'Para empezar a estudiar necesitas añadir palabras a tu pool. Haz clic en <strong>"+3 kanjis (9 palabras)"</strong> para añadir tu primera tanda al sistema de repaso.',
    en: 'To start studying you need to add words to your pool. Click <strong>"+3 kanji (9 words)"</strong> to add your first batch to the review system.',
    ca: 'Per comenzar a estudiar has d\'afegir paraules al teu pool. Fes clic a <strong>"+3 kanjis (9 paraules)"</strong> per afegir el teu primer lot al sistema de repàs.',
    ja: '学習を始めるには単語をプールに追加する必要があります。<strong>「+3漢字（9語）」をクリック</strong>して最初のバッチをレビューシステムに追加しましょう。',
  },
  quit_title: {
    es: 'Botón "Dejarlo" ↩️', en: '"Quit" button ↩️', ca: 'Botó "Deixar-ho" ↩️', ja: '「やめる」ボタン ↩️',
  },
  quit_body: {
    es: 'Este botón te permite abandonar el estudio en cualquier momento. Tu progreso se guarda automáticamente con cada respuesta que das.',
    en: 'This button lets you quit the study session at any time. Your progress is saved automatically with each answer.',
    ca: 'Aquest botó et permet abandonar l\'estudi en qualsevol moment. El teu progrés es guarda automàticament amb cada resposta.',
    ja: 'このボタンでいつでも学習を終了できます。各回答の進捗は自動的に保存されます。',
  },
  master_title: {
    es: '"Ya me lo sé" ⭐', en: '"I already know it" ⭐', ca: '"Ja me la sé" ⭐', ja: '「もう知っている」⭐',
  },
  master_body: {
    es: 'Si ya dominas perfectamente esta palabra, pulsa aquí para marcarla como dominada directamente al nivel máximo sin necesidad de repasar.',
    en: 'If you already know this word perfectly, tap here to mark it as mastered and advance it to the top level without reviewing.',
    ca: 'Si ja domines perfectament aquesta paraula, prem aquí per marcar-la com a dominada directament al nivell màxim sense necessitat de repassar.',
    ja: 'この単語を完全にマスターしている場合は、ここをタップして復習なしで最高レベルにマークしましょう。',
  },
  mode_title: {
    es: 'Tipo de estudio 🏷️', en: 'Study type 🏷️', ca: 'Tipus d\'estudi 🏷️', ja: '学習タイプ 🏷️',
  },
  mode_body: {
    es: 'Esta etiqueta indica el tipo de repaso de cada tarjeta:<br><br>🖋️ <strong>Escritura kanji:</strong> Escribe el kanji en papel y comprueba.<br>🎯 <strong>Significado:</strong> Selecciona la respuesta correcta.<br>🔄 <strong>Inverso:</strong> Escribe el kanji y la lectura en papel.<br>📖 <strong>Lectura hiragana:</strong> Escribe la lectura en hiragana.<br>✅ <strong>Opción múltiple:</strong> Selecciona cómo se escribe en hiragana.',
    en: 'This badge shows the review type for each card:<br><br>🖋️ <strong>Kanji writing:</strong> Write the kanji on paper and check.<br>🎯 <strong>Meaning:</strong> Select the correct answer.<br>🔄 <strong>Reverse:</strong> Write the kanji and reading on paper.<br>📖 <strong>Hiragana reading:</strong> Write the reading in hiragana.<br>✅ <strong>Multiple choice:</strong> Select how it\'s written in hiragana.',
    ca: 'Aquesta etiqueta indica el tipus de repàs de cada targeta:<br><br>🖋️ <strong>Escriptura kanji:</strong> Escriu el kanji en paper i comprova.<br>🎯 <strong>Significat:</strong> Selecciona la resposta correcta.<br>🔄 <strong>Invers:</strong> Escriu el kanji i la lectura en paper.<br>📖 <strong>Lectura hiragana:</strong> Escriu la lectura en hiragana.<br>✅ <strong>Opció múltiple:</strong> Selecciona com s\'escriu en hiragana.',
    ja: 'このバッジは各カードの復習タイプを示します：<br><br>🖋️ <strong>漢字書き取り：</strong>紙に漢字を書いて確認。<br>🎯 <strong>意味：</strong>正しい答えを選択。<br>🔄 <strong>逆向き：</strong>漢字と読みを紙に書く。<br>📖 <strong>ひらがな読み：</strong>読みをひらがなで書く。<br>✅ <strong>選択問題：</strong>ひらがなでの書き方を選択。',
  },
  labels_title: {
    es: 'Etiquetas de la palabra 🔖', en: 'Word labels 🔖', ca: 'Etiquetes de la paraula 🔖', ja: '単語ラベル 🔖',
  },
  labels_body: {
    es: 'Estas etiquetas muestran el <strong>tipo de palabra</strong> (sustantivo, verbo...), la <strong>categoría temática</strong> (animales, números...) y el <strong>curso escolar</strong> japonés al que pertenece la palabra.',
    en: 'These labels show the <strong>word type</strong> (noun, verb...), the <strong>thematic category</strong> (animals, numbers...), and the Japanese <strong>school grade</strong> the word belongs to.',
    ca: 'Aquestes etiquetes mostren el <strong>tipus de paraula</strong> (substantiu, verb...), la <strong>categoria temàtica</strong> (animals, números...) i el <strong>curs escolar</strong> japonès al qual pertany la paraula.',
    ja: 'これらのラベルは<strong>単語の種類</strong>（名詞・動詞など）、<strong>テーマカテゴリー</strong>（動物・数字など）、単語が属する日本の<strong>学年</strong>を示します。',
  },
  study_done_title: {
    es: 'Sigue practicando ✨', en: 'Keep practicing ✨', ca: 'Continua practicant ✨', ja: '練習を続けよう ✨',
  },
  study_done_body: {
    es: 'Ya conoces la interfaz de estudio. Termina la sesión cuando quieras y vuelve al dashboard: continuaremos el tour explicando el resto de la aplicación.',
    en: 'You now know the study interface. Finish the session whenever you want and return to the dashboard — we\'ll continue the tour explaining the rest of the app.',
    ca: 'Ja coneixes la interfície d\'estudi. Acaba la sessió quan vulguis i torna al dashboard: continuarem el tour explicant la resta de l\'aplicació.',
    ja: '学習インターフェースをご理解いただけました。好きなときにセッションを終了してダッシュボードに戻ってください。残りのアプリを引き続き説明します。',
  },
  forecast_title: {
    es: 'Tu calendario de repasos 📅', en: 'Your review calendar 📅',
    ca: 'El teu calendari de repasos 📅', ja: '復習カレンダー 📅',
  },
  forecast_body: {
    es: 'Este panel muestra los repasos pendientes de hoy y una previsión de los próximos días. El sistema SRS programa automáticamente cuándo volver a repasar cada palabra para que la recuerdes a largo plazo.',
    en: 'This panel shows today\'s pending reviews and a forecast for upcoming days. The SRS system automatically schedules when to review each word again for long-term retention.',
    ca: 'Aquest panell mostra els repasos pendents d\'avui i una previsió dels propers dies. El sistema SRS programa automàticament quan tornar a repassar cada paraula per recordar-la a llarg termini.',
    ja: 'このパネルは今日の未処理の復習と今後の予定を表示します。SRSシステムが各単語の次の復習日を自動的にスケジュールし、長期的な記憶を助けます。',
  },
  modes_title: {
    es: 'Tipos de repaso 🎯', en: 'Review types 🎯', ca: 'Tipus de repàs 🎯', ja: '復習タイプ 🎯',
  },
  modes_body: {
    es: 'Selecciona qué tipos de repaso quieres practicar hoy: puedes combinar varios modos. Pulsa <strong>"Iniciar Repaso"</strong> para comenzar la sesión.',
    en: 'Select which review types you want to practice today — you can combine multiple modes. Press <strong>"Start Review"</strong> to begin the session.',
    ca: 'Selecciona quins tipus de repàs vols practicar avui: pots combinar diversos modes. Prem <strong>"Iniciar Repàs"</strong> per começar la sessió.',
    ja: '今日練習したい復習タイプを選択してください。複数のモードを組み合わせることができます。<strong>「復習を開始」</strong>を押してセッションを開始してください。',
  },
  sections_title: {
    es: 'Otras secciones 🗂️', en: 'Other sections 🗂️', ca: 'Altres seccions 🗂️', ja: 'その他のセクション 🗂️',
  },
  sections_body: {
    es: '<strong>Vocabulario:</strong> añade más kanjis y busca palabras.<br><strong>Gramática:</strong> practica puntos gramaticales con IA.<br><strong>Kana:</strong> aprende hiragana y katakana.<br><strong>Contexto IA:</strong> lee textos en japonés con tus palabras aprendidas.',
    en: '<strong>Vocabulary:</strong> add more kanji and search words.<br><strong>Grammar:</strong> practice grammar points with AI.<br><strong>Kana:</strong> learn hiragana and katakana.<br><strong>AI Context:</strong> read Japanese texts using your learned words.',
    ca: '<strong>Vocabulari:</strong> afegeix més kanjis i cerca paraules.<br><strong>Gramàtica:</strong> practica punts gramaticals amb IA.<br><strong>Kana:</strong> aprèn hiragana i katakana.<br><strong>Context IA:</strong> llegeix textos en japonès amb les teves paraules apresses.',
    ja: '<strong>語彙：</strong>漢字を追加して単語を検索。<br><strong>文法：</strong>AIで文法ポイントを練習。<br><strong>仮名：</strong>ひらがなとカタカナを学習。<br><strong>AIコンテキスト：</strong>学習した単語で日本語テキストを読む。',
  },
  finish_title: {
    es: '¡Listo para empezar! 🎉', en: 'Ready to start! 🎉', ca: 'Llest per a começar! 🎉', ja: '準備完了！🎉',
  },
  finish_body: {
    es: '¡Tour completado! Ya conoces todo lo necesario para aprender japonés con este sistema. Recuerda: la constancia diaria es la clave del éxito. ¡Ánimo!',
    en: 'Tour complete! You now know everything you need to learn Japanese with this system. Remember: daily consistency is the key to success. Go for it!',
    ca: 'Tour completat! Ja coneixes tot el necessari per aprendre japonès amb aquest sistema. Recorda: la constància diària és la clau de l\'èxit. Endavant!',
    ja: 'ツアー完了！このシステムで日本語を学ぶために必要なことをすべて学びました。毎日の継続が成功の鍵です。頑張ってください！',
  },
  next:       { es: 'Siguiente →', en: 'Next →', ca: 'Següent →', ja: '次へ →' },
  skip:       { es: 'Saltar tutorial', en: 'Skip tutorial', ca: 'Saltar tutorial', ja: 'スキップ' },
  finish:     { es: '🎉 ¡Empezar!', en: '🎉 Get started!', ca: '🎉 Endavant!', ja: '🎉 始めましょう！' },
  understood: { es: 'Entendido', en: 'Got it', ca: 'Entès', ja: 'わかった' },
}

// ─── Cursor animation ─────────────────────────────────────────────────────────
function TourCursor({ active }: { active: boolean }) {
  const [animPhase, setAnimPhase] = useState<'start' | 'moving' | 'clicking'>('start')
  const [startPos, setStartPos] = useState({ x: -200, y: -200 })
  const [targetPos, setTargetPos] = useState({ x: -200, y: -200 })
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!active || !mounted) {
      timersRef.current.forEach(clearTimeout)
      return
    }

    function getPositions() {
      const el = document.querySelector('[data-tour="pack-3"]')
      if (!el) return null
      const rect = el.getBoundingClientRect()
      return {
        start: { x: window.innerWidth * 0.5, y: window.innerHeight * 0.72 },
        target: { x: rect.left + rect.width * 0.45, y: rect.top + rect.height * 0.5 },
      }
    }

    const pos = getPositions()
    if (!pos) return

    setStartPos(pos.start)
    setTargetPos(pos.target)

    let cancelled = false

    function cycle() {
      if (cancelled) return
      timersRef.current.forEach(clearTimeout)

      // Re-calculate target in case element moved
      const p = getPositions()
      if (p) { setStartPos(p.start); setTargetPos(p.target) }

      setAnimPhase('start')

      const t1 = setTimeout(() => { if (!cancelled) setAnimPhase('moving') }, 800)
      const t2 = setTimeout(() => { if (!cancelled) setAnimPhase('clicking') }, 2200)
      const t3 = setTimeout(() => { if (!cancelled) setAnimPhase('moving') }, 2550)
      const t4 = setTimeout(() => { if (!cancelled) cycle() }, 4000)
      timersRef.current = [t1, t2, t3, t4]
    }

    cycle()

    const onResize = () => {
      const p = getPositions()
      if (p) { setStartPos(p.start); setTargetPos(p.target) }
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelled = true
      timersRef.current.forEach(clearTimeout)
      window.removeEventListener('resize', onResize)
    }
  }, [active, mounted])

  if (!active || !mounted) return null

  const pos = animPhase === 'start' ? startPos : targetPos

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: pos.x - 10,
        top: pos.y - 6,
        transition: animPhase !== 'start'
          ? 'left 1.4s cubic-bezier(0.4, 0, 0.2, 1), top 1.4s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease'
          : 'transform 0.15s ease',
        transform: `scale(${animPhase === 'clicking' ? 0.65 : 1.1})`,
        transformOrigin: '6px 4px',
        zIndex: 99999,
        pointerEvents: 'none',
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))',
        willChange: 'left, top, transform',
      }}
    >
      {/* Classic arrow cursor */}
      <svg width="22" height="28" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M2 2L2 24L8 18L12.5 26.5L15.5 25L11 16.5L19 16.5Z"
          fill="#1e1b4b"
          stroke="white"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    document.body
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductTour() {
  const { state } = useStore()
  const [mounted, setMounted] = useState(false)
  const [cursorActive, setCursorActive] = useState(false)

  // Stable refs
  const driverRef = useRef<ReturnType<typeof createDriver> | null>(null)
  const phaseRef = useRef<Phase>('dashboard-init')
  const langRef = useRef('es')
  const initializedRef = useRef(false)

  useEffect(() => setMounted(true), [])

  // Keep langRef current without re-triggering effects
  langRef.current = state.lang

  // ── Helpers ────────────────────────────────────────────────────────────────
  function lx(key: string): string {
    const l = langRef.current
    return L[key]?.[l] ?? L[key]?.['es'] ?? ''
  }

  function skipTour() {
    try { localStorage.setItem(TOUR_DONE_KEY, '1') } catch { /* */ }
    setCursorActive(false)
    driverRef.current?.destroy()
    driverRef.current = null
  }

  function advancePhase(next: Phase | 'done') {
    if (next === 'done') {
      try {
        localStorage.setItem(TOUR_DONE_KEY, '1')
        localStorage.removeItem(TOUR_PHASE_KEY)
      } catch { /* */ }
    } else {
      try { localStorage.setItem(TOUR_PHASE_KEY, next) } catch { /* */ }
      phaseRef.current = next
    }
    driverRef.current = null
  }

  // ── Dashboard Init Tour ────────────────────────────────────────────────────
  function startDashboardInitTour() {
    if (driverRef.current?.isActive()) return
    let closed = false

    const d = createDriver({
      animate: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      allowClose: true,
      disableActiveInteraction: false,
      popoverClass: 'kanji-driver-popover',
      steps: [
        {
          popover: {
            title: lx('welcome_title'),
            description: lx('welcome_body'),
            showButtons: ['next', 'close'],
            nextBtnText: lx('next'),
            doneBtnText: lx('next'),
          },
        },
        {
          element: '[data-tour="quickadd-panel"]',
          popover: {
            title: lx('quickadd_title'),
            description: lx('quickadd_body'),
            showButtons: ['close'],
            side: 'left',
            align: 'start',
          },
          onHighlighted: () => setCursorActive(true),
          onDeselected: () => setCursorActive(false),
        },
      ],
      onCloseClick: () => { closed = true },
      onDestroyed: () => {
        setCursorActive(false)
        if (closed) skipTour()
        driverRef.current = null
      },
    })

    driverRef.current = d
    d.drive()
  }

  // ── Study Intro Tour ───────────────────────────────────────────────────────
  function startStudyIntroTour() {
    if (driverRef.current?.isActive()) return
    let closed = false
    let completed = false

    const d = createDriver({
      animate: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      allowClose: true,
      disableActiveInteraction: false,
      popoverClass: 'kanji-driver-popover',
      steps: [
        {
          element: '[data-tour="quit-btn"]',
          popover: {
            title: lx('quit_title'),
            description: lx('quit_body'),
            showButtons: ['next', 'close'],
            nextBtnText: lx('next'),
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '[data-tour="master-btn"]',
          popover: {
            title: lx('master_title'),
            description: lx('master_body'),
            showButtons: ['previous', 'next', 'close'],
            nextBtnText: lx('next'),
            side: 'top',
            align: 'end',
          },
        },
        {
          element: '[data-tour="mode-badge"]',
          popover: {
            title: lx('mode_title'),
            description: lx('mode_body'),
            showButtons: ['previous', 'next', 'close'],
            nextBtnText: lx('next'),
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '[data-tour="category-labels"]',
          popover: {
            title: lx('labels_title'),
            description: lx('labels_body'),
            showButtons: ['previous', 'next', 'close'],
            nextBtnText: lx('next'),
            side: 'top',
            align: 'center',
          },
        },
        {
          popover: {
            title: lx('study_done_title'),
            description: lx('study_done_body'),
            showButtons: ['next', 'close'],
            nextBtnText: lx('understood'),
            doneBtnText: lx('understood'),
          },
          onDeselected: () => { completed = true },
        },
      ],
      onCloseClick: () => { closed = true },
      onDestroyed: () => {
        if (closed && !completed) {
          skipTour()
        } else if (completed) {
          advancePhase('study-done' as Phase)
        }
        driverRef.current = null
      },
    })

    driverRef.current = d
    d.drive()
  }

  // ── Dashboard Full Tour ────────────────────────────────────────────────────
  function startDashboardFullTour() {
    if (driverRef.current?.isActive()) return
    let closed = false
    let completed = false

    const d = createDriver({
      animate: true,
      overlayOpacity: 0.7,
      smoothScroll: true,
      allowClose: true,
      disableActiveInteraction: false,
      popoverClass: 'kanji-driver-popover',
      steps: [
        {
          element: '[data-tour="forecast-card"]',
          popover: {
            title: lx('forecast_title'),
            description: lx('forecast_body'),
            showButtons: ['next', 'close'],
            nextBtnText: lx('next'),
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '[data-tour="mode-selector"]',
          popover: {
            title: lx('modes_title'),
            description: lx('modes_body'),
            showButtons: ['previous', 'next', 'close'],
            nextBtnText: lx('next'),
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '[data-tour="sections-grid"]',
          popover: {
            title: lx('sections_title'),
            description: lx('sections_body'),
            showButtons: ['previous', 'next', 'close'],
            nextBtnText: lx('next'),
            side: 'top',
            align: 'center',
          },
        },
        {
          popover: {
            title: lx('finish_title'),
            description: lx('finish_body'),
            showButtons: ['next', 'close'],
            nextBtnText: lx('finish'),
            doneBtnText: lx('finish'),
          },
          onDeselected: () => { completed = true },
        },
      ],
      onCloseClick: () => { closed = true },
      onDestroyed: () => {
        if (closed && !completed) {
          skipTour()
        } else if (completed) {
          advancePhase('done')
        }
        driverRef.current = null
      },
    })

    driverRef.current = d
    d.drive()
  }

  // ── Initialization ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted || !state.loaded || !state.user) return
    if (initializedRef.current) return
    initializedRef.current = true

    try { if (localStorage.getItem(TOUR_DONE_KEY)) return } catch { return }

    const saved = localStorage.getItem(TOUR_PHASE_KEY) as Phase | null
    phaseRef.current = saved || 'dashboard-init'

    if (phaseRef.current === 'dashboard-init') {
      setTimeout(startDashboardInitTour, 900)
    } else if (phaseRef.current === 'dashboard-full') {
      setTimeout(startDashboardFullTour, 900)
    }
    // 'await-study' and 'study-intro' are handled by event listeners below
  }, [mounted, state.loaded, state.user]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event listeners ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return

    function onTourAction(e: Event) {
      const action = (e as CustomEvent).detail?.action as string | undefined
      if (!action) return

      if (action === 'quickadd-added' && phaseRef.current === 'dashboard-init') {
        setCursorActive(false)
        driverRef.current?.destroy()
        driverRef.current = null
        advancePhase('await-study')
      }

      if (action === 'session-started' && phaseRef.current === 'await-study') {
        advancePhase('study-intro')
        setTimeout(startStudyIntroTour, 450)
      }

      if (action === 'session-exited' && phaseRef.current === 'study-intro') {
        driverRef.current?.destroy()
        driverRef.current = null
        advancePhase('dashboard-full')
        setTimeout(startDashboardFullTour, 700)
      }
    }

    function onRestartTour() {
      try {
        localStorage.removeItem(TOUR_DONE_KEY)
        localStorage.removeItem(TOUR_PHASE_KEY)
      } catch { /* */ }
      phaseRef.current = 'dashboard-init'
      initializedRef.current = false
      driverRef.current?.destroy()
      driverRef.current = null
      setCursorActive(false)

      // Need to re-check if user is loaded
      if (state.loaded && state.user) {
        setTimeout(startDashboardInitTour, 400)
      } else {
        initializedRef.current = false
      }
    }

    window.addEventListener('tour-action', onTourAction)
    window.addEventListener('restart-tour', onRestartTour)
    return () => {
      window.removeEventListener('tour-action', onTourAction)
      window.removeEventListener('restart-tour', onRestartTour)
    }
  }, [mounted, state.loaded, state.user]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      driverRef.current?.destroy()
      driverRef.current = null
    }
  }, [])

  return <TourCursor active={cursorActive} />
}
