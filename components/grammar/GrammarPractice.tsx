'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toHiragana } from 'wanakana'
import type { GrammarPoint } from '@/lib/grammar-mnn1'
import type { Lang } from '@/lib/i18n'
import { t, getMeaning } from '@/lib/i18n'
import {
  type GrammarSentence,
  type GrammarSrsStat,
  applyGrammarResult,
  checkAnswer,
  formatNextReview,
  getSrsLevelLabel,
} from '@/lib/grammar-srs'
import {
  supabase,
  fetchGrammarSentences,
  saveGrammarSentences,
  deleteGrammarSentences,
  trimGrammarSentencesPool,
  fetchGrammarSrsStat,
  saveGrammarSrsResult,
  markGrammarAsStudying,
  fetchSchoolVocabSample,
  fetchWaniKaniVocabSample,
  fetchUserSharedSentences,
  shareGrammarSentence,
  updateGrammarSentence,
  validateGrammarSentence,
  deleteGrammarSentenceById,
  submitGrammarReport,
} from '@/lib/supabase'
import { useStore } from '@/lib/store'
import GeminiApiTutorial from './GeminiApiTutorial'
import { grammarXpForSession } from '@/lib/progression'
import XpToast from '@/components/progression/XpToast'

// How many sentences to show per practice session
const SESSION_SIZE = 5

/** Vocabulary item from the Japanese school curriculum (primaria + secundaria). */
type SchoolVocabItem = {
  jp: string
  reading: string
  meaning_es: string
  meaning_ca: string | null
  meaning_en: string | null
}
// Minimum sentences needed to start; generate more if below this
const MIN_POOL = 5
// Target pool size to save after filtering
const TARGET_POOL = 25
// How many to ask Gemini for (extra buffer so filtering still leaves us with TARGET_POOL)
const GENERATE_SIZE = 38
// Minimum quality score (1–5) to keep a sentence — Gemini self-rates each sentence
const QUALITY_THRESHOLD = 4
// Maximum number of sentences in the shared pool per grammar point.
// When this is exceeded, the oldest sentences are automatically removed.
const MAX_POOL = 100

type Phase =
  | 'loading'      // fetching from DB
  | 'generating'   // calling Gemini
  | 'ready'        // loaded, not started
  | 'asking'       // showing a blank question
  | 'answered'     // showing result for current question
  | 'complete'     // session end

interface Props {
  grammar: GrammarPoint
  lang: Lang
  geminiKey: string
  sessionToken: string
  activeVocab: { jp: string; reading: string; meaning: string; meaning_ca?: string; meaning_en?: string }[]
  showSharedSentences?: boolean
  onBack: () => void
  onSrsUpdate?: (stat: GrammarSrsStat) => void
  onSessionEnd?: (grammarId: string, hadWrongs: boolean) => void
  canEdit?: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// Furigana helpers
// ─────────────────────────────────────────────────────────────────────────────

type RubyToken = { base: string; ruby?: string }

/** Returns true for kanji (CJK unified ideographs). */
function isKanjiChar(ch: string): boolean {
  const cp = ch.codePointAt(0) ?? 0
  return (cp >= 0x4e00 && cp <= 0x9fff)   // CJK unified
      || (cp >= 0x3400 && cp <= 0x4dbf)   // CJK extension A
}

/**
 * Grammatical particles whose orthographic writing differs from their phonetic
 * reading. AI-generated reading fields sometimes use the phonetic form
 * (e.g. "わ" for は). Accepting both prevents the entire remaining reading
 * from being wrongly assigned to the preceding kanji block.
 */
const RUBY_PARTICLE_PHONETIC: Record<string, string> = { 'は': 'わ', 'を': 'お', 'へ': 'え' }

/**
 * Splits `text` (kanji/kana mixed) into tokens, each carrying a ruby reading
 * extracted from the flat `reading` string.
 *
 * Algorithm: walk through `text`; when encountering a kana character it must
 * match the same position in `reading` (advance both). Kanji sequences are
 * assigned the reading characters up to the position of the next kana anchor.
 * For grammatical particles (は/を/へ) the phonetic alternative is also
 * accepted as anchor (は→わ, を→お, へ→え) in case the AI stored the
 * phonetic form in the reading field.
 */
function buildRubyTokens(text: string, reading: string): RubyToken[] {
  if (!text) return []
  if (!reading) return [{ base: text }]

  const tokens: RubyToken[] = []
  let ti = 0  // index into text
  let ri = 0  // index into reading

  while (ti < text.length) {
    const ch = text[ti]

    if (!isKanjiChar(ch)) {
      // Kana / punctuation / ASCII — output as plain span, advance reading by 1
      tokens.push({ base: ch })
      ri++
      ti++
    } else {
      // Kanji sequence: collect consecutive kanji
      let kanjiEnd = ti + 1
      while (kanjiEnd < text.length && isKanjiChar(text[kanjiEnd])) kanjiEnd++

      // Find the reading for this kanji block:
      // the reading ends where the next text character (after the kanji block)
      // appears in the reading string. Also accept the phonetic alternative
      // for particles (は/わ, を/お, へ/え) to handle AI-generated readings.
      let readingEnd: number
      if (kanjiEnd >= text.length) {
        // Last group — consume the rest of reading
        readingEnd = reading.length
      } else {
        const nextCh = text[kanjiEnd]
        const phoneticAlt = RUBY_PARTICLE_PHONETIC[nextCh]
        // Prefer orthographic anchor over phonetic to avoid false early matches
        // (e.g. 川 reads かわ — the わ must not be mistaken for は's phonetic form).
        let searchPos = ri + 1
        while (searchPos < reading.length && reading[searchPos] !== nextCh) searchPos++
        if (searchPos >= reading.length && phoneticAlt) {
          searchPos = ri + 1
          while (searchPos < reading.length && reading[searchPos] !== phoneticAlt) searchPos++
        }
        readingEnd = searchPos
      }

      tokens.push({
        base: text.slice(ti, kanjiEnd),
        ruby: reading.slice(ri, readingEnd) || undefined,
      })
      ti = kanjiEnd
      ri = readingEnd
    }
  }

  return tokens
}

/** Renders a Japanese string with ruby furigana above kanji. */
function RubyText({ text, reading }: { text: string; reading: string }) {
  const tokens = buildRubyTokens(text, reading)
  return (
    <>
      {tokens.map((tok, i) =>
        tok.ruby ? (
          <ruby key={i}>
            {tok.base}
            <rt className="text-xs font-normal text-slate-400 tracking-tight">{tok.ruby}</rt>
          </ruby>
        ) : (
          <span key={i}>{tok.base}</span>
        )
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tiny sub-components
// ─────────────────────────────────────────────────────────────────────────────

function LevelDots({ level, max = 7 }: { level: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max + 1 }, (_, i) => (
        <div
          key={i}
          className={`w-3 h-3 rounded-full transition-colors ${
            i <= level
              ? level >= 7
                ? 'bg-emerald-400'
                : level >= 5
                  ? 'bg-indigo-400'
                  : level >= 3
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  )
}

function SpinnerScreen({ msg }: { msg: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center space-y-3">
        <svg className="w-9 h-9 animate-spin text-indigo-500 mx-auto" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
        </svg>
        <p className="text-sm text-slate-500 font-medium">{msg}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

// Detect topic from translation text using keyword mapping
function detectTopic(translation: string): string {
  const t = translation.toLowerCase()
  if (/escuel|colegio|profe|alumno|class|school|teacher|student|estudian/.test(t)) return 'escuela'
  if (/trabaj|ofici|empres|jefe|colega|work|office|boss|colleague/.test(t)) return 'trabajo'
  if (/casa|hogar|habitaci|cocin|salon|home|house|kitchen|room/.test(t)) return 'casa'
  if (/famili|padre|madre|hijo|hermano|abuel|family|father|mother|child|sibling/.test(t)) return 'familia'
  if (/comer|comid|restaur|plato|bebid|food|drink|eat|restaurant|meal/.test(t)) return 'comida'
  if (/tiemp|clima|lluvi|sol|frio|calor|weather|rain|sun|cold|hot/.test(t)) return 'clima'
  if (/viaj|tren|avion|coche|autobús|travel|train|plane|car|bus/.test(t)) return 'transporte'
  if (/deport|futbol|corr|nada|sport|football|run|swim/.test(t)) return 'deporte'
  if (/ciudad|tiend|mercad|ciudad|compra|city|shop|market|buy/.test(t)) return 'ciudad'
  if (/natur|parqu|montañ|bosqu|nature|park|mountain|forest/.test(t)) return 'naturaleza'
  if (/hospital|medic|enferm|dolor|hospital|doctor|pain|medicine/.test(t)) return 'salud'
  return 'cotidiano'
}

export default function GrammarPractice({
  grammar,
  lang,
  geminiKey,
  sessionToken,
  activeVocab,
  showSharedSentences: showSharedProp = true,
  onBack,
  onSrsUpdate,
  onSessionEnd,
  canEdit,
}: Props) {
  const { addXP, state } = useStore()
  const hasWaniKani = Boolean(state.waniKaniApiKey)
  const [phase, setPhase]                   = useState<Phase>('loading')
  const [sentences, setSentences]           = useState<GrammarSentence[]>([])
  const [srsStat, setSrsStat]               = useState<GrammarSrsStat | null>(null)
  const [sessionQueue, setSessionQueue]     = useState<number[]>([])
  const [currentPos, setCurrentPos]         = useState(0)
  const [userInput, setUserInput]           = useState('')
  const [isCorrect, setIsCorrect]           = useState(false)
  const [showFurigana, setShowFurigana]     = useState(false)
  const [sessionResults, setSessionResults] = useState<boolean[]>([])
  const [genError, setGenError]             = useState('')
  const [newSrsStat, setNewSrsStat]         = useState<GrammarSrsStat | null>(null)
  const [xpGained, setXpGained]             = useState<number | null>(null)
  const [xpToastKey, setXpToastKey]         = useState(0)
  // Stats from last generation: how many Gemini produced vs how many passed quality check
  const [lastGenStats, setLastGenStats]     = useState<{ generated: number; kept: number } | null>(null)
  // School vocabulary (primaria + secundaria) used as the vocabulary source for AI prompts
  const [schoolVocab, setSchoolVocab]       = useState<SchoolVocabItem[]>([])
  // WaniKani vocabulary (user's acquired vocab, loaded on mount if key is configured)
  const [wkVocab, setWkVocab]               = useState<{ jp: string; reading: string; meaning: string }[]>([])
  const [useWkVocab, setUseWkVocab]         = useState(() => {
    try { return localStorage.getItem('gp_use_wk_vocab') === 'true' } catch { return false }
  })
  // Shared community sentences
  const [sharedSentences, setSharedSentences] = useState<GrammarSentence[]>([])
  const [showShared, setShowShared]           = useState(showSharedProp)
  // Share-button state for the current sentence
  const [sharing, setSharing]               = useState(false)
  const [shareSuccess, setShareSuccess]     = useState(false)

  // ── Grammar report state ──────────────────────────────────────────────────
  const [reportOpen, setReportOpen]         = useState(false)
  const [reportSent, setReportSent]         = useState(false)
  const [reportSending, setReportSending]   = useState(false)
  const [reportDesc, setReportDesc]         = useState('')

  // ── Sentence edit state (admin / contributor only) ────────────────────────
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editBefore, setEditBefore]         = useState('')
  const [editBeforeR, setEditBeforeR]       = useState('')
  const [editBeforeAlts, setEditBeforeAlts] = useState<string[]>(['', '', '', ''])
  const [editBeforeRAlts, setEditBeforeRAlts] = useState<string[]>(['', '', '', ''])
  const [editAnswer, setEditAnswer]         = useState('')
  const [editAfter, setEditAfter]           = useState('')
  const [editAfterR, setEditAfterR]         = useState('')
  const [editTransEs, setEditTransEs]       = useState('')
  const [editTransCa, setEditTransCa]       = useState('')
  const [editTransEn, setEditTransEn]       = useState('')
  const [editSaving, setEditSaving]         = useState(false)
  const [editError, setEditError]           = useState('')
  const [validating, setValidating]         = useState(false)
  const [deleting, setDeleting]             = useState(false)
  const [deleteConfirm, setDeleteConfirm]   = useState(false)

  // ── Hint (translation) state for the asking phase ────────────────────────
  const [showHint, setShowHint]             = useState(false)

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [ttsError, setTtsError]     = useState(false)
  const currentAudio                = useRef<HTMLAudioElement | null>(null)

  const inputRef    = useRef<HTMLInputElement>(null)
  const isComposing = useRef(false)

  async function speakJapanese(text: string) {
    if (isSpeaking) {
      currentAudio.current?.pause()
      setIsSpeaking(false)
      return
    }
    setTtsError(false)
    setIsSpeaking(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('no session')

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        console.error('[TTS] error', res.status, err)
        throw new Error(err?.error ?? `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      currentAudio.current = audio
      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(url) }
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(url); setTtsError(true) }
      await audio.play()
    } catch {
      setIsSpeaking(false)
      setTtsError(true)
    }
  }

  // ── Load on mount ─────────────────────────────────────────────────────────
  useEffect(() => {
    load()
  }, [grammar.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch school vocabulary once (primaria + secundaria) ──────────────────
  useEffect(() => {
    fetchSchoolVocabSample(40).then(setSchoolVocab).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch WaniKani vocabulary sample if enabled ───────────────────────────
  useEffect(() => {
    if (!hasWaniKani || !useWkVocab) return
    fetchWaniKaniVocabSample(40).then(items => {
      setWkVocab(items.map(w => ({
        jp: w.word,
        reading: w.reading,
        meaning:
          lang === 'ca' ? (w.meaning_ca ?? w.meaning_en) :
          lang === 'en' ? w.meaning_en :
          (w.meaning_es ?? w.meaning_en),
      })))
    }).catch(() => {})
  }, [hasWaniKani, useWkVocab, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch user-shared sentences for this grammar point ────────────────────
  useEffect(() => {
    if (!showShared) return
    fetchUserSharedSentences(grammar.id).then(rows => {
      setSharedSentences(rows.map(r => ({
        id: r.id,
        grammar_id: r.grammar_id,
        sentence_before: r.sentence_before,
        sentence_before_reading: r.sentence_before_reading,
        sentence_before_alts: r.sentence_before_alts,
        sentence_before_reading_alts: r.sentence_before_reading_alts,
        sentence_after: r.sentence_after,
        sentence_after_reading: r.sentence_after_reading,
        answer: r.answer,
        answer_alts: r.answer_alts,
        translation_es: r.translation_es,
        translation_ca: r.translation_ca,
        translation_en: r.translation_en,
        is_shared: true,
        grammar_jlpt: r.grammar_jlpt || undefined,
        topic: r.topic ?? undefined,
        vocab_used: r.vocab_words,
      })))
    }).catch(() => {})
  }, [grammar.id, showShared]) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    setPhase('loading')
    try {
      const [storedSentences, stat] = await Promise.all([
        fetchGrammarSentences(grammar.id),
        fetchGrammarSrsStat(grammar.id),
      ])
      setSentences(storedSentences)
      setSrsStat(stat)
    } catch {
      // table might not exist yet — stay in 'ready' with empty pool
    }
    setPhase('ready')
  }

  // ── Sentence generation ───────────────────────────────────────────────────
  const generate = useCallback(async () => {
    if (!sessionToken) { setGenError(t(lang, 'gp_need_login')); return }

    setPhase('generating')
    setGenError('')

    const targetLang =
      lang === 'ca' ? 'catalán' :
      lang === 'en' ? 'inglés'  :
      'español'

    // Build school vocabulary base
    const schoolBase: { jp: string; reading: string; meaning: string }[] =
      schoolVocab.length > 0
        ? schoolVocab.map(w => ({
            jp: w.jp,
            reading: w.reading,
            meaning:
              lang === 'ca' ? (w.meaning_ca ?? w.meaning_es) :
              lang === 'en' ? (w.meaning_en ?? w.meaning_es) :
              w.meaning_es,
          }))
        : activeVocab.map(w => ({
            jp: w.jp,
            reading: w.reading,
            meaning: getMeaning(w, lang),
          }))

    const schoolSample = [...schoolBase]
      .sort(() => Math.random() - 0.5)
      .slice(0, useWkVocab && wkVocab.length > 0 ? 15 : 20)
      .map(w => `${w.jp}(${w.reading}): ${w.meaning}`)
      .join(', ')

    const wkSample = useWkVocab && wkVocab.length > 0
      ? [...wkVocab].sort(() => Math.random() - 0.5).slice(0, 10).map(w => `${w.jp}(${w.reading}): ${w.meaning}`).join(', ')
      : ''

    const vocabSection = wkSample
      ? `Vocabulario disponible:\n- Del currículo escolar japonés (primaria y secundaria): ${schoolSample}\n- Vocabulario WaniKani del alumno (ya adquirido): ${wkSample}`
      : `Vocabulario disponible del currículo escolar japonés (primaria y secundaria): ${schoolSample || 'vocabulario básico N5'}`

    const prompt = `Eres un profesor de japonés experto (nivel nativo). Genera exactamente ${GENERATE_SIZE} frases de práctica para el patrón gramatical "${grammar.pattern}" (${grammar.name_es}).

El alumno ve la frase con UN HUECO (___) donde falta la gramática, junto con su traducción, y debe completar la frase entera en japonés.

${vocabSection}

Responde ÚNICAMENTE con este JSON (sin backticks ni texto extra):
{
  "sentences": [
    {
      "before_jp": "texto antes del hueco (usa kanji donde corresponda)",
      "before_reading": "lectura completa del before en kana puro, sin kanji",
      "answer": "SOLO la gramática en hiragana/katakana, nunca kanji",
      "answer_alts": ["variante hiragana aceptable"],
      "after_jp": "texto después del hueco",
      "after_reading": "lectura completa del after en kana puro, sin kanji",
      "translation_es": "traducción COMPLETA y NATURAL al español",
      "translation_ca": "traducció COMPLETA i NATURAL al català",
      "translation_en": "COMPLETE and NATURAL English translation",
      "topic": "uno de: casa, escuela, trabajo, familia, comida, clima, deporte, transporte, ciudad, naturaleza, salud, cotidiano",
      "vocab_used": ["palabras_del_vocabulario_disponible_que_aparecen_en_la_frase"],
      "quality": 5
    }
  ]
}

⚠️ REGLAS CRÍTICAS sobre la frase japonesa:
1. La frase COMPLETA (before + answer + after) debe tener sentido lógico por sí sola. NUNCA generes frases incompletas.
2. El sujeto debe ser claro. Ejemplos de frases INCORRECTAS: "La manzana es una" (incompleta), "Ayer es mañana" (sin sentido), "El teléfono come" (ilógica).
3. Usa contextos cotidianos realistas: casa, escuela, trabajo, tiendas, familia, clima, tiempo libre.

⚠️ REGLA CRÍTICA sobre el campo "answer":
- Debe contener ÚNICAMENTE el marcador gramatical: partículas (は、が、を、に、で…), cópulas (です、だ), conjugaciones (ます、ました、て…), patrones fijos (〜てください、〜ている…)
- NUNCA incluyas sustantivos, verbos de contenido, adjetivos ni números en el answer
- NUNCA uses kanji en el answer — solo hiragana o katakana
- Ejemplo CORRECTO → before:"私は学生", answer:"です", after:"。"  → frase: "私は学生です。" = "Soy estudiante."
- Ejemplo INCORRECTO → before:"今月", answer:"は七月です" ← MAL: incluye vocabulario con kanji
- Ejemplo INCORRECTO → before:"りんご", answer:"は", after:"" ← MAL: la frase queda incompleta "りんごは"

⚠️ REGLAS CRÍTICAS sobre las traducciones:
- Cada traducción debe ser una oración COMPLETA y NATURAL en el idioma destino
- NUNCA termines en "es una", "es el", "tiene un", "de la" o cualquier fragmento incompleto
- La traducción en español, català e inglés debe poder leerse sola y tener pleno sentido
- Si la frase japonesa dice "私はりんごが好きです", la traducción ES "Me gustan las manzanas" NO "Yo la manzana es una"

Campo "quality" — puntuación de coherencia del 1 al 5 (sé MUY ESTRICTO):
- 5: Frase perfecta — japonés natural, sentido completo, contexto realista, traducción exacta
- 4: Buena — uso correcto, algún detalle mejorable pero todo tiene sentido
- 3: Aceptable — uso algo forzado o contexto poco natural pero gramaticalmente correcta
- 2: Deficiente — frase incompleta, contexto irreal, traducción inexacta o incompleta
- 1: Incorrecta — errores gramaticales graves, frase sin sentido lógico o traducción imposible
SIEMPRE asigna calidad 1 a: frases incompletas, traducciones fragmentadas, mezcla de idiomas, información factualmente errónea.
Sé HONESTO: no todas las frases pueden ser 4-5.

Otras reglas:
- Frases naturales y correctas, nivel ${grammar.jlpt}
- Varía sujetos, contextos y vocabulario; usa el vocabulario disponible cuando encaje
- before_reading y after_reading: solo kana (para mostrar furigana al alumno)
- ⚠️ REGLA CRÍTICA de lectura: escribe SIEMPRE las partículas con su forma ORTOGRÁFICA, NO fonética: は (no わ), を (no お), へ (no え). Ejemplo: "私は学生" → before_reading:"わたしはがくせい" ✓, NO "わたしわがくせい" ✗
- answer_alts: variantes aceptables en hiragana (p.ej. forma informal) o array vacío []
- Genera exactamente ${GENERATE_SIZE} frases distintas con sujetos y vocabulario variados`

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ prompt, userApiKey: geminiKey }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Error ${res.status}`)
      }
      const data  = await res.json()
      const clean = data.text.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(clean)

      if (!parsed.sentences?.length) throw new Error(t(lang, 'gp_no_sentences'))

      // ── Quality filter ────────────────────────────────────────────────────
      const allRaw   = parsed.sentences as any[]
      const passing  = allRaw.filter(s => (Number(s.quality) || 5) >= QUALITY_THRESHOLD)
      const discarded = allRaw.length - passing.length

      const newSentences: GrammarSentence[] = passing.slice(0, TARGET_POOL).map(s => ({
        grammar_id:                     grammar.id,
        sentence_before:                String(s.before_jp          ?? ''),
        sentence_before_reading:        String(s.before_reading     ?? ''),
        sentence_before_alts:           [],
        sentence_before_reading_alts:   [],
        sentence_after:                 String(s.after_jp           ?? ''),
        sentence_after_reading:         String(s.after_reading      ?? ''),
        answer:                         String(s.answer             ?? grammar.pattern),
        answer_alts:                    Array.isArray(s.answer_alts) ? (s.answer_alts as unknown[]).map(String) : [],
        translation_es:                 String(s.translation_es     ?? ''),
        translation_ca:                 String(s.translation_ca     ?? ''),
        translation_en:                 String(s.translation_en     ?? ''),
        topic:                          typeof s.topic === 'string' ? s.topic : undefined,
        vocab_used:                     Array.isArray(s.vocab_used) ? (s.vocab_used as unknown[]).map(String) : [],
      }))

      setLastGenStats({ generated: allRaw.length, kept: newSentences.length })
      if (discarded > 0) {
        console.info(`[GrammarPractice] Quality filter: ${newSentences.length} kept, ${discarded} discarded (score < ${QUALITY_THRESHOLD})`)
      }

      // Sentences generated with WaniKani vocab are private — not visible in the community pool
      const isPrivate = useWkVocab && wkVocab.length > 0
      await saveGrammarSentences(grammar.id, newSentences, isPrivate
        ? { isPrivate: true, userId: supabase.auth.getUser ? (await supabase.auth.getUser()).data.user?.id : undefined }
        : undefined
      )

      // Trim pool to MAX_POOL, removing the oldest sentences if necessary,
      // then reload from DB so local state matches the actual shared pool.
      await trimGrammarSentencesPool(grammar.id, MAX_POOL)
      const updatedPool = await fetchGrammarSentences(grammar.id)
      setSentences(updatedPool)

      setPhase('ready')
    } catch (e: unknown) {
      setGenError(e instanceof Error ? e.message : t(lang, 'gp_gen_error'))
      setPhase('ready')
    }
  }, [grammar, lang, geminiKey, sessionToken, activeVocab, useWkVocab, wkVocab]) // eslint-disable-line react-hooks/exhaustive-deps

  // Delete current pool then generate fresh sentences
  const regenerate = useCallback(async () => {
    setSentences([])
    setLastGenStats(null)
    await deleteGrammarSentences(grammar.id)
    await generate()
  }, [grammar.id, generate]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sentence editor helpers ───────────────────────────────────────────────
  function padTo4(arr: string[]): string[] {
    return [...arr.slice(0, 4), '', '', '', ''].slice(0, 4)
  }

  function openEdit(s: GrammarSentence) {
    if (!s.id) return
    setEditingId(s.id)
    setEditBefore(s.sentence_before)
    setEditBeforeR(s.sentence_before_reading)
    setEditBeforeAlts(padTo4(s.sentence_before_alts ?? []))
    setEditBeforeRAlts(padTo4(s.sentence_before_reading_alts ?? []))
    setEditAnswer(s.answer)
    setEditAfter(s.sentence_after)
    setEditAfterR(s.sentence_after_reading)
    setEditTransEs(s.translation_es)
    setEditTransCa(s.translation_ca)
    setEditTransEn(s.translation_en)
    setEditError('')
  }

  function closeEdit() {
    setEditingId(null)
    setEditBeforeAlts(['', '', '', ''])
    setEditBeforeRAlts(['', '', '', ''])
    setEditError('')
  }

  async function saveEdit() {
    if (!editingId) return
    const trimAnswer = editAnswer.trim()
    const trimBefore = editBefore.trim()
    if (!trimAnswer) { setEditError('La respuesta no puede estar vacía.'); return }
    if (!trimBefore && !editAfter.trim()) { setEditError('La frase no puede estar vacía.'); return }

    setEditSaving(true)
    setEditError('')
    try {
      const cleanAlts = editBeforeAlts.map(s => s.trim()).filter(Boolean)
      const cleanAltRs = editBeforeRAlts.map(s => s.trim())
      // Align readings with their corresponding alt (pad with '' if missing)
      const alignedAltRs = cleanAlts.map((_, i) => cleanAltRs[i] ?? '')

      const patch = {
        sentence_before: trimBefore,
        sentence_before_reading: editBeforeR.trim(),
        sentence_before_alts: cleanAlts,
        sentence_before_reading_alts: alignedAltRs,
        answer: trimAnswer,
        sentence_after: editAfter.trim(),
        sentence_after_reading: editAfterR.trim(),
        translation_es: editTransEs.trim(),
        translation_ca: editTransCa.trim(),
        translation_en: editTransEn.trim(),
      }
      await updateGrammarSentence(editingId, patch)
      setSentences(prev => prev.map(s =>
        s.id === editingId ? { ...s, ...patch } : s
      ))
      closeEdit()
    } catch {
      setEditError('Error al guardar. Inténtalo de nuevo.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleValidate(sentence: GrammarSentence) {
    if (!sentence.id || validating) return
    const newVal = !sentence.validated
    setValidating(true)
    await validateGrammarSentence(sentence.id, newVal)
    setSentences(prev => prev.map(s => s.id === sentence.id ? { ...s, validated: newVal } : s))
    setValidating(false)
  }

  async function handleDelete(sentence: GrammarSentence) {
    if (!sentence.id || deleting) return
    setDeleting(true)
    setDeleteConfirm(false)

    const deletedLocalIdx = sentences.findIndex(s => s.id === sentence.id)
    await deleteGrammarSentenceById(sentence.id)

    // Remove from local sentences and fix queue indices
    setSentences(prev => prev.filter(s => s.id !== sentence.id))
    const newQueue = sessionQueue
      .filter((_, qIdx) => qIdx !== currentPos)        // drop current slot
      .map(idx => idx > deletedLocalIdx ? idx - 1 : idx) // shift indices after gap

    setSessionQueue(newQueue)
    setDeleting(false)

    if (newQueue.length === 0 || currentPos >= newQueue.length) {
      setPhase('complete')
    } else {
      setUserInput('')
      setPhase('asking')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Session start ─────────────────────────────────────────────────────────
  function startSession() {
    // If first time practicing, mark as studying so it appears in the SRS queue
    if (!srsStat) {
      markGrammarAsStudying(grammar.id).then(newStat => {
        if (newStat) {
          setSrsStat(newStat)
          onSrsUpdate?.(newStat)
        }
      })
    }

    // Merge auto-generated pool with community shared sentences (if enabled)
    const allSentences: GrammarSentence[] = showShared && sharedSentences.length > 0
      ? [...sentences, ...sharedSentences.filter(sh => !sentences.some(s => s.sentence_before === sh.sentence_before && s.answer === sh.answer))]
      : sentences
    if (allSentences.length === 0) return

    // Sync merged sentences into state so session indices are valid
    if (showShared && sharedSentences.length > 0) setSentences(allSentences)

    const count = Math.min(SESSION_SIZE, allSentences.length)
    const validatedIdx   = allSentences.map((s, i) => ({ s, i })).filter(x => x.s.validated).map(x => x.i).sort(() => Math.random() - 0.5)
    const sharedIdx      = allSentences.map((s, i) => ({ s, i })).filter(x => !x.s.validated && x.s.is_shared).map(x => x.i).sort(() => Math.random() - 0.5)
    const unvalidatedIdx = allSentences.map((s, i) => ({ s, i })).filter(x => !x.s.validated && !x.s.is_shared).map(x => x.i).sort(() => Math.random() - 0.5)
    const ordered = [...validatedIdx, ...sharedIdx, ...unvalidatedIdx]
    setSessionQueue(ordered.slice(0, count))
    setCurrentPos(0)
    setSessionResults([])
    setUserInput('')
    setNewSrsStat(null)
    setDeleteConfirm(false)
    setShareSuccess(false)
    setPhase('asking')
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Input handling ────────────────────────────────────────────────────────
  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    if (!isComposing.current) {
      setUserInput(toHiragana(raw, { IMEMode: true }))
    } else {
      setUserInput(raw)
    }
  }

  function submitAnswer() {
    if (!userInput.trim() || phase !== 'asking') return
    const sentence = sentences[sessionQueue[currentPos]]
    if (!sentence) return
    const correct = checkAnswer(userInput.trim(), sentence.answer, sentence.answer_alts)
    setIsCorrect(correct)
    setSessionResults(prev => [...prev, correct])
    setPhase('answered')
  }

  // ── Share current sentence with the community ─────────────────────────────
  async function handleShare() {
    const sentence = sentences[sessionQueue[currentPos]]
    if (!sentence || sharing || shareSuccess) return
    setSharing(true)
    try {
      // Extract vocab words that appear in the sentence text
      const sentenceText = sentence.sentence_before + sentence.answer + sentence.sentence_after
      const allWords = [...schoolVocab.map(w => w.jp), ...wkVocab.map(w => w.jp)]
      const vocabWords = allWords.filter(w => sentenceText.includes(w))

      const translation = sentence.translation_es || sentence.translation_en || ''
      const topic = sentence.topic ?? detectTopic(translation)

      await shareGrammarSentence({
        grammar_id: sentence.grammar_id,
        sentence_before: sentence.sentence_before,
        sentence_before_reading: sentence.sentence_before_reading,
        sentence_before_alts: sentence.sentence_before_alts ?? [],
        sentence_before_reading_alts: sentence.sentence_before_reading_alts ?? [],
        sentence_after: sentence.sentence_after,
        sentence_after_reading: sentence.sentence_after_reading,
        answer: sentence.answer,
        answer_alts: sentence.answer_alts,
        translation_es: sentence.translation_es,
        translation_ca: sentence.translation_ca,
        translation_en: sentence.translation_en,
        grammar_jlpt: (grammar as any).jlpt ?? '',
        vocab_words: vocabWords,
        topic,
      })
      setShareSuccess(true)
    } catch { /* ignore duplicate / errors */ }
    finally { setSharing(false) }
  }

  // ── Next question / complete ───────────────────────────────────────────────
  async function nextQuestion() {
    const isLast = currentPos + 1 >= sessionQueue.length

    if (isLast) {
      // Calculate SRS update based on full session results
      // (sessionResults already has the last answer at this point)
      const allResults     = sessionResults
      const correctCount   = allResults.filter(Boolean).length
      const wrongCount     = allResults.length - correctCount
      const sessionPassed  = correctCount >= Math.ceil(allResults.length * 0.6)
      const currentLevel   = srsStat?.level ?? 1
      const { newLevel, nextReview } = applyGrammarResult(currentLevel, wrongCount)
      const updated: GrammarSrsStat = { grammar_id: grammar.id, level: newLevel, next_review: nextReview }
      setNewSrsStat(updated)
      setSrsStat(updated)
      onSrsUpdate?.(updated)
      onSessionEnd?.(grammar.id, wrongCount > 0)
      try { await saveGrammarSrsResult(grammar.id, newLevel, nextReview) } catch { /* offline */ }
      // Award grammar XP based on session performance
      const xp = grammarXpForSession(correctCount, wrongCount, sessionPassed)
      if (xp > 0) {
        addXP({ grammarXp: xp })
        setXpGained(xp)
        setXpToastKey(k => k + 1)
      }
      setPhase('complete')
    } else {
      setCurrentPos(p => p + 1)
      setUserInput('')
      setDeleteConfirm(false)
      setShareSuccess(false)
      setShowHint(false)
      setReportOpen(false)
      setReportSent(false)
      setReportDesc('')
      setPhase('asking')
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  const currentSentence = (phase === 'asking' || phase === 'answered')
    ? sentences[sessionQueue[currentPos]]
    : null

  const getTranslation = (s: GrammarSentence) =>
    lang === 'ca' ? (s.translation_ca || s.translation_es) :
    lang === 'en' ? (s.translation_en || s.translation_es) :
    s.translation_es

  const isDue = (srsStat?.next_review ?? 0) <= Date.now()

  // ── Render: Loading ───────────────────────────────────────────────────────
  if (phase === 'loading') return <SpinnerScreen msg={t(lang, 'gp_loading')} />

  const xpToastEl = xpGained !== null
    ? <XpToast key={xpToastKey} xp={xpGained} type="grammar" />
    : null

  // ── Render: Generating ────────────────────────────────────────────────────
  if (phase === 'generating') return <SpinnerScreen msg={t(lang, 'gp_generating')} />

  // ── Render: Session Complete ──────────────────────────────────────────────
  if (phase === 'complete') {
    const allResults   = sessionResults
    const correct      = allResults.filter(Boolean).length
    const sessionPassed = correct >= Math.ceil(allResults.length * 0.6)
    const oldLevel     = sessionPassed ? (newSrsStat?.level ?? 1) - 1 : (newSrsStat?.level ?? 0) + 1
    const finalLevel   = newSrsStat?.level ?? 0
    const nr           = newSrsStat?.next_review ?? 0

    return (
      <>
        {xpToastEl}
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t(lang, 'gp_complete_title')}</h2>
        </div>

        {/* Score card */}
        <div className={`rounded-2xl p-6 text-center space-y-4 ${
          sessionPassed
            ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800'
            : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
        }`}>
          <p className="text-4xl">{sessionPassed ? '🎉' : '📚'}</p>
          <div>
            <p className="text-3xl font-bold text-slate-800 dark:text-slate-100">{correct} / {allResults.length}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{t(lang, 'gp_correct_answers')}</p>
          </div>

          {/* Result dots */}
          <div className="flex items-center justify-center gap-1.5">
            {allResults.map((r, i) => (
              <div key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                r ? 'bg-emerald-400 text-white' : 'bg-rose-400 text-white'
              }`}>
                {r ? '✓' : '✗'}
              </div>
            ))}
          </div>

          {/* XP earned */}
          {xpGained !== null && xpGained > 0 && (
            <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow">
              +{xpGained} XP 文法
            </div>
          )}

          {/* SRS level change */}
          <div className="flex flex-col items-center gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {t(lang, 'gp_srs_level')}
            </p>
            <LevelDots level={finalLevel} />
            <p className={`text-sm font-bold ${sessionPassed ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {getSrsLevelLabel(finalLevel, lang)}
              {sessionPassed
                ? ` ↑ (+1 ${t(lang, 'gp_level')})`
                : oldLevel > 0 ? ` ↓ (-1 ${t(lang, 'gp_level')})` : ''}
            </p>
            {nr > 0 && (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {t(lang, 'gp_next_review')}: {formatNextReview(nr, lang)}
              </p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={startSession}
            className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition"
          >
            🔄 {t(lang, 'gp_again')}
          </button>
          <button
            onClick={onBack}
            className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition"
          >
            ← {t(lang, 'gp_back')}
          </button>
        </div>
      </div>
      </>
    )
  }

  // ── Render: Ready (no sentences yet) ─────────────────────────────────────
  if (phase === 'ready' && sentences.length < MIN_POOL) {
    return (
      <div className="space-y-5">
        <BackHeader onBack={onBack} label={`🏋️ ${t(lang, 'gp_practice')}: ${grammar.pattern}`} />

        {/* If no API key: show interactive tutorial */}
        {!geminiKey ? (
          <GeminiApiTutorial lang={lang} />
        ) : (
          <>
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 text-center space-y-3">
              <p className="text-4xl">📝</p>
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{t(lang, 'gp_no_sentences')}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t(lang, 'gp_generate_hint')}</p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 rounded-xl px-3 py-2">
                🌐 {t(lang, 'gp_pool_shared_info')}
              </p>
              {!sessionToken && (
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  💡 {t(lang, 'gp_need_login')}
                </p>
              )}
              {genError && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
                  {genError}
                </div>
              )}
            </div>

            <button
              onClick={generate}
              disabled={!sessionToken}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm"
            >
              ✨ {t(lang, 'gp_generate_btn').replace('{n}', String(TARGET_POOL))}
            </button>
          </>
        )}

        <button onClick={onBack} className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition">
          ← {t(lang, 'gp_back_detail')}
        </button>
      </div>
    )
  }

  // ── Render: Ready (has sentences) ─────────────────────────────────────────
  if (phase === 'ready') {
    return (
      <div className="space-y-5">
        <BackHeader onBack={onBack} label={`🏋️ ${t(lang, 'gp_practice')}`} sublabel={grammar.pattern} />

        {/* SRS status card */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t(lang, 'gp_srs_status')}</span>
            {srsStat ? (
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                isDue
                  ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400'
                  : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
              }`}>
                {isDue ? `⏰ ${t(lang, 'gp_due')}` : `✓ ${t(lang, 'gp_up_to_date')}`}
              </span>
            ) : (
              <span className="text-xs text-slate-400 dark:text-slate-500">{t(lang, 'gp_not_studied')}</span>
            )}
          </div>
          <LevelDots level={srsStat?.level ?? 0} />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {getSrsLevelLabel(srsStat?.level ?? 0, lang)}
            {srsStat && !isDue && (
              <span className="ml-2 text-slate-400 dark:text-slate-500">
                · {t(lang, 'gp_next_review')}: {formatNextReview(srsStat.next_review, lang)}
              </span>
            )}
          </p>
        </div>

        {/* Pool info */}
        <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                📦 {t(lang, 'gp_pool_count').replace('{n}', `${sentences.length} / ${MAX_POOL}`)}
              </span>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800 text-indigo-500 dark:text-indigo-400 rounded-full px-2 py-0.5">
                🌐 {t(lang, 'gp_pool_shared')}
              </span>
              {sharedSentences.length > 0 && showShared && (
                <span className="text-[10px] bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800 text-violet-600 dark:text-violet-400 rounded-full px-2 py-0.5">
                  👥 +{sharedSentences.length} {t(lang, 'gp_shared_badge').toLowerCase()}
                </span>
              )}
            </div>
            {sessionToken && (
              <button
                onClick={generate}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition"
                title={sentences.length >= MAX_POOL ? t(lang, 'gp_gen_more_replace') : undefined}
              >
                {sentences.length >= MAX_POOL ? '🔄' : '+'} {t(lang, 'gp_gen_more')}
              </button>
            )}
          </div>

          {/* WaniKani toggle */}
          {hasWaniKani && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useWkVocab}
                onChange={e => {
                  const v = e.target.checked
                  setUseWkVocab(v)
                  try { localStorage.setItem('gp_use_wk_vocab', String(v)) } catch { /* incognito */ }
                }}
                className="w-3.5 h-3.5 rounded accent-pink-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400">{t(lang, 'gp_wk_toggle')}</span>
            </label>
          )}

          {/* Shared sentences toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showShared}
              onChange={e => setShowShared(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-violet-500"
            />
            <span className="text-xs text-slate-600 dark:text-slate-400">{t(lang, 'gp_show_shared')}</span>
          </label>

          {/* Quality filter badge — shown when the last generation discarded some sentences */}
          {lastGenStats && lastGenStats.kept < lastGenStats.generated && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t(lang, 'gp_quality_checked')}
              </span>
              <span className="text-slate-400 dark:text-slate-500">
                {lastGenStats.kept}/{lastGenStats.generated} {t(lang, 'gp_quality_kept')}
              </span>
            </div>
          )}
        </div>

        {genError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-sm text-red-700 dark:text-red-400">
            {genError}
          </div>
        )}

        {/* API Key tutorial — shown when the user has no key but there are already sentences in the pool */}
        {!geminiKey && (
          <GeminiApiTutorial lang={lang} compact />
        )}

        {/* Start button */}
        <button
          onClick={startSession}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-base rounded-xl transition shadow-md"
        >
          🏋️ {t(lang, 'gp_start_session').replace('{n}', String(Math.min(SESSION_SIZE, sentences.length)))}
        </button>

        <button onClick={onBack} className="w-full py-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-sm transition">
          ← {t(lang, 'gp_back_detail')}
        </button>
      </div>
    )
  }

  // ── Render: Asking / Answered ─────────────────────────────────────────────
  if (!currentSentence) return null

  const translation   = getTranslation(currentSentence)
  const hasFurigana   = !!(currentSentence.sentence_before_reading || currentSentence.sentence_after_reading)
  const progress      = ((currentPos + (phase === 'answered' ? 1 : 0)) / sessionQueue.length) * 100

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onBack}
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{grammar.pattern}</span>
        </div>
        <span className="shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400 ml-2">
          {currentPos + 1} / {sessionQueue.length}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
        <div
          className="bg-indigo-500 h-full rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── ASKING phase: Japanese sentence with blank ────────────────────── */}
      {phase === 'asking' && (
        <>
          {/* Sentence card */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Controls row */}
            <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
              <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                {lang === 'en' ? 'Fill in the blank' : lang === 'ca' ? 'Omple el buit' : 'Rellena el hueco'}
              </span>
              <div className="flex items-center gap-2">
                {hasFurigana && (
                  <button
                    onClick={() => setShowFurigana(v => !v)}
                    className={`text-xs px-2 py-0.5 rounded-full border transition ${
                      showFurigana
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    ふ
                  </button>
                )}
                {currentSentence?.validated && (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t(lang, 'gp_validated_badge')}
                  </span>
                )}
              </div>
            </div>

            {/* Japanese sentence with blank */}
            <div className="px-5 py-6 text-center">
              <div className="kanji-font text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
                {currentSentence.sentence_before && (
                  <span>
                    {showFurigana && hasFurigana
                      ? <RubyText text={currentSentence.sentence_before} reading={currentSentence.sentence_before_reading} />
                      : currentSentence.sentence_before}
                  </span>
                )}
                {/* The blank */}
                <span className="mx-1 inline-flex items-center justify-center min-w-[4ch] px-2 border-b-4 border-indigo-400 dark:border-indigo-500 text-indigo-300 dark:text-indigo-600 select-none">
                  {'　'}
                </span>
                {currentSentence.sentence_after && (
                  <span>
                    {showFurigana && hasFurigana
                      ? <RubyText text={currentSentence.sentence_after} reading={currentSentence.sentence_after_reading} />
                      : currentSentence.sentence_after}
                  </span>
                )}
              </div>
            </div>

            {/* Translation hint (optional) */}
            {showHint && translation ? (
              <div className="px-5 pb-4 text-center">
                <p className="text-sm italic text-slate-400 dark:text-slate-500">{translation}</p>
              </div>
            ) : translation ? (
              <div className="flex justify-center pb-4">
                <button
                  onClick={() => setShowHint(true)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1"
                >
                  💡 {lang === 'en' ? 'Show translation' : lang === 'ca' ? 'Mostra traducció' : 'Ver traducción'}
                </button>
              </div>
            ) : null}
          </div>

          {/* Input — only the grammar answer */}
          <div className="space-y-3">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInput}
                onCompositionStart={() => { isComposing.current = true }}
                onCompositionEnd={e => {
                  isComposing.current = false
                  setUserInput(toHiragana((e.target as HTMLInputElement).value, { IMEMode: true }))
                }}
                onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                placeholder={lang === 'en' ? 'Type the grammar form…' : lang === 'ca' ? 'Escriu la gramàtica…' : 'Escribe la gramática…'}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                data-lpignore="true"
                data-1p-ignore="true"
                className="w-full px-4 py-3.5 text-center text-lg font-bold border-2 border-slate-200 dark:border-slate-600 focus:border-indigo-400 dark:focus:border-indigo-500 rounded-xl focus:outline-none transition bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 dark:text-slate-500 select-none pointer-events-none">
                ローマ字OK
              </span>
            </div>
            <button
              onClick={submitAnswer}
              disabled={!userInput.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition shadow-sm"
            >
              {t(lang, 'gp_check')}
            </button>
          </div>
        </>
      )}

      {/* ── ANSWERED phase: show correct sentence + user's attempt ────────── */}
      {phase === 'answered' && (
        <>
          {/* Result card */}
          <div className={`rounded-2xl border overflow-hidden ${
            isCorrect ? 'border-emerald-200 dark:border-emerald-800' : 'border-rose-200 dark:border-rose-800'
          }`}>
            {/* Card header with furigana toggle */}
            <div className={`flex items-center justify-between px-4 py-2 border-b ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-base">{isCorrect ? '✅' : '❌'}</span>
                <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                  {isCorrect ? t(lang, 'gp_correct') : t(lang, 'gp_wrong')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => speakJapanese(
                    currentSentence.sentence_before + currentSentence.answer + currentSentence.sentence_after
                  )}
                  title="Escuchar frase"
                  className={`p-1.5 rounded-full border transition ${
                    isSpeaking
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-600 dark:text-indigo-400'
                      : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5L6 9H3v6h3l5 4V5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072" />
                  </svg>
                </button>
                {hasFurigana && (
                  <button
                    onClick={() => setShowFurigana(v => !v)}
                    className={`text-xs px-2.5 py-0.5 rounded-full border transition ${
                      showFurigana
                        ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300'
                        : 'border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {showFurigana ? t(lang, 'gp_hide_furigana') : t(lang, 'gp_show_furigana')}
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 px-5 py-4 space-y-4">
              {ttsError && (
                <p className="text-xs text-center text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700 rounded-lg px-3 py-1.5">
                  {lang === 'en' ? 'Audio error. Check TTS config.' : lang === 'ca' ? 'Error d\'àudio.' : 'Error de audio.'}
                </p>
              )}
              {/* Correct full sentence */}
              <div className="text-center">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-2">
                  {t(lang, 'gp_correct_sentence')}
                </p>
                <div className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 leading-loose">
                  {currentSentence.sentence_before && (
                    <span>
                      {showFurigana && hasFurigana
                        ? <RubyText text={currentSentence.sentence_before} reading={currentSentence.sentence_before_reading} />
                        : currentSentence.sentence_before}
                    </span>
                  )}
                  <span className={`mx-0.5 px-1.5 py-0.5 rounded-lg ${
                    isCorrect
                      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'
                  }`}>
                    {currentSentence.answer}
                  </span>
                  {currentSentence.sentence_after && (
                    <span>
                      {showFurigana && hasFurigana
                        ? <RubyText text={currentSentence.sentence_after} reading={currentSentence.sentence_after_reading} />
                        : currentSentence.sentence_after}
                    </span>
                  )}
                </div>
                {translation && (
                  <p className="mt-2 text-sm italic text-slate-400 dark:text-slate-500">{translation}</p>
                )}
              </div>

              {/* User's answer */}
              <div className={`pt-3 border-t ${isCorrect ? 'border-emerald-100 dark:border-emerald-800/50' : 'border-rose-100 dark:border-rose-800/50'}`}>
                <div className="flex items-center justify-center gap-3">
                  <div className="text-center">
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                      {t(lang, 'gp_your_answer')}
                    </p>
                    <p className={`text-xl font-bold ${isCorrect ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {userInput}
                    </p>
                  </div>
                  {!isCorrect && (
                    <>
                      <span className="text-slate-300 dark:text-slate-600 text-lg">→</span>
                      <div className="text-center">
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-1">
                          {lang === 'en' ? 'Correct' : lang === 'ca' ? 'Correcte' : 'Correcto'}
                        </p>
                        <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                          {currentSentence.answer}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Grammar explanation — shown on wrong answer */}
              {!isCorrect && (() => {
                const explanation =
                  lang === 'ca' ? (grammar as any).explanation_ca :
                  lang === 'en' ? (grammar as any).explanation_en :
                  (grammar as any).explanation_es
                return explanation ? (
                  <div className="mt-3 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-left">
                    <p className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wide mb-1">
                      {lang === 'en' ? 'Grammar note' : lang === 'ca' ? 'Nota gramatical' : 'Nota gramatical'} — {grammar.pattern}
                    </p>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
                  </div>
                ) : null
              })()}
            </div>

            {/* ── Validated footer ─────────────────────────────────────────── */}
            {currentSentence?.validated && (
              <div className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t(lang, 'gp_validated_badge')}
              </div>
            )}
          </div>

          <button
            onClick={nextQuestion}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-sm"
          >
            {currentPos + 1 >= sessionQueue.length
              ? `🏁 ${t(lang, 'gp_see_results')}`
              : `${t(lang, 'gp_next')} →`}
          </button>

          {/* ── Report sentence button ────────────────────────────────── */}
          {sessionToken && (
            reportSent ? (
              <div className="text-center text-xs text-emerald-600 dark:text-emerald-400">
                ✓ {lang === 'en' ? 'Report sent' : lang === 'ca' ? 'Informe enviat' : 'Reporte enviado'}
              </div>
            ) : reportOpen ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl space-y-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {lang === 'en' ? 'What is wrong with this sentence?' : lang === 'ca' ? 'Què falla en aquesta frase?' : '¿Qué falla en esta frase?'}
                </p>
                <textarea
                  value={reportDesc}
                  onChange={e => setReportDesc(e.target.value)}
                  placeholder={lang === 'en' ? 'Describe the error (optional)…' : lang === 'ca' ? 'Descriu l\'error (opcional)…' : 'Describe el error (opcional)…'}
                  rows={2}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-400"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setReportOpen(false); setReportDesc('') }}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {lang === 'en' ? 'Cancel' : lang === 'ca' ? 'Cancel·lar' : 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    disabled={reportSending}
                    onClick={async () => {
                      setReportSending(true)
                      try {
                        await submitGrammarReport({
                          grammar_id: grammar.id,
                          grammar_pattern: grammar.pattern,
                          sentence: currentSentence.sentence_before + currentSentence.answer + currentSentence.sentence_after,
                          description: reportDesc,
                        })
                        setReportSent(true)
                        setReportOpen(false)
                      } catch { /* ignore */ }
                      finally { setReportSending(false) }
                    }}
                    className="text-xs font-semibold px-3 py-1.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-lg transition"
                  >
                    {reportSending ? '…' : (lang === 'en' ? 'Send' : lang === 'ca' ? 'Enviar' : 'Enviar')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setReportOpen(true)}
                  className="text-xs text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 transition-colors"
                >
                  🚩 {lang === 'en' ? 'Report sentence error' : lang === 'ca' ? 'Reportar error en la frase' : 'Reportar error en esta frase'}
                </button>
              </div>
            )
          )}

          {/* ── Community shared badge (when sentence is from shared pool) ── */}
          {currentSentence.is_shared && (
            <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-xs font-semibold text-violet-700 dark:text-violet-400">
              <span>👥</span>
              <span>{t(lang, 'gp_shared_badge')}</span>
              {currentSentence.grammar_jlpt && (
                <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900 rounded text-[10px]">
                  {currentSentence.grammar_jlpt}
                </span>
              )}
              {currentSentence.topic && (
                <span className="px-1.5 py-0.5 bg-violet-100 dark:bg-violet-900 rounded text-[10px]">
                  {currentSentence.topic}
                </span>
              )}
              {currentSentence.vocab_used && currentSentence.vocab_used.length > 0 && (
                <span className="text-violet-500 dark:text-violet-500 text-[10px] font-normal">
                  {currentSentence.vocab_used.slice(0, 4).join(', ')}
                </span>
              )}
            </div>
          )}

          {/* ── Share button (only for non-shared sentences when logged in) ── */}
          {!currentSentence.is_shared && sessionToken && (
            shareSuccess
              ? (
                <div className="flex items-center justify-center gap-2 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-xs font-semibold text-violet-700 dark:text-violet-400">
                  ✓ {t(lang, 'gp_share_success')}
                </div>
              ) : (
                <button
                  onClick={handleShare}
                  disabled={sharing}
                  className="w-full flex items-center justify-center gap-2 py-2 border border-violet-200 dark:border-violet-800 rounded-xl text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:border-violet-300 dark:hover:border-violet-700 disabled:opacity-50 transition"
                >
                  {sharing
                    ? <><svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/></svg> {t(lang, 'gp_sharing')}</>
                    : <>👥 {t(lang, 'gp_share_btn')}</>
                  }
                </button>
              )
          )}

          {/* ── Validate button (admin / contributor only) ───────────────── */}
          {canEdit && currentSentence?.id && !editingId && (
            <button
              onClick={() => handleValidate(currentSentence)}
              disabled={validating}
              className={`w-full flex items-center justify-center gap-2 py-2 border rounded-xl text-xs font-semibold transition ${
                currentSentence.validated
                  ? 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-900/20'
                  : 'border-slate-200 text-slate-500 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {currentSentence.validated ? t(lang, 'gp_unvalidate_btn') : t(lang, 'gp_validate_btn')}
            </button>
          )}

          {/* ── Delete button (admin / contributor only) ─────────────────── */}
          {canEdit && currentSentence?.id && !editingId && (
            deleteConfirm ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex-1">
                  {lang === 'en' ? 'Delete permanently?' : lang === 'ca' ? 'Eliminar permanentment?' : '¿Eliminar permanentemente?'}
                </span>
                <button
                  onClick={() => handleDelete(currentSentence)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold transition"
                >
                  {deleting ? '⏳' : (lang === 'en' ? 'Confirm' : lang === 'ca' ? 'Confirmar' : 'Confirmar')}
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
                >
                  {lang === 'en' ? 'Cancel' : lang === 'ca' ? 'Cancel·lar' : 'Cancelar'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:border-rose-300 dark:hover:border-rose-700 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {lang === 'en' ? 'Delete sentence' : lang === 'ca' ? 'Eliminar frase' : 'Eliminar frase'}
              </button>
            )
          )}

          {/* ── Sentence editor (admin / contributor only) ──────────────── */}
          {canEdit && currentSentence?.id && (
            editingId === currentSentence.id ? (
              <SentenceEditForm
                lang={lang}
                editBefore={editBefore}            setEditBefore={setEditBefore}
                editBeforeR={editBeforeR}          setEditBeforeR={setEditBeforeR}
                editBeforeAlts={editBeforeAlts}    setEditBeforeAlts={setEditBeforeAlts}
                editBeforeRAlts={editBeforeRAlts}  setEditBeforeRAlts={setEditBeforeRAlts}
                editAnswer={editAnswer}            setEditAnswer={setEditAnswer}
                editAfter={editAfter}              setEditAfter={setEditAfter}
                editAfterR={editAfterR}            setEditAfterR={setEditAfterR}
                editTransEs={editTransEs}          setEditTransEs={setEditTransEs}
                editTransCa={editTransCa}          setEditTransCa={setEditTransCa}
                editTransEn={editTransEn}          setEditTransEn={setEditTransEn}
                saving={editSaving}
                error={editError}
                onSave={saveEdit}
                onCancel={closeEdit}
              />
            ) : (
              <button
                onClick={() => openEdit(currentSentence)}
                className="w-full flex items-center justify-center gap-2 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                {lang === 'en' ? 'Edit this sentence' : lang === 'ca' ? 'Editar aquesta frase' : 'Editar esta frase'}
              </button>
            )
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sentence editor form (admin / contributor only)
// ─────────────────────────────────────────────────────────────────────────────

interface SentenceEditFormProps {
  lang: Lang
  editBefore: string;            setEditBefore: (v: string) => void
  editBeforeR: string;           setEditBeforeR: (v: string) => void
  editBeforeAlts: string[];      setEditBeforeAlts: (v: string[]) => void
  editBeforeRAlts: string[];     setEditBeforeRAlts: (v: string[]) => void
  editAnswer: string;            setEditAnswer: (v: string) => void
  editAfter: string;             setEditAfter: (v: string) => void
  editAfterR: string;            setEditAfterR: (v: string) => void
  editTransEs: string;           setEditTransEs: (v: string) => void
  editTransCa: string;           setEditTransCa: (v: string) => void
  editTransEn: string;           setEditTransEn: (v: string) => void
  saving: boolean
  error: string
  onSave: () => void
  onCancel: () => void
}

function SentenceEditForm({
  lang,
  editBefore, setEditBefore,
  editBeforeR, setEditBeforeR,
  editBeforeAlts, setEditBeforeAlts,
  editBeforeRAlts, setEditBeforeRAlts,
  editAnswer, setEditAnswer,
  editAfter, setEditAfter,
  editAfterR, setEditAfterR,
  editTransEs, setEditTransEs,
  editTransCa, setEditTransCa,
  editTransEn, setEditTransEn,
  saving, error, onSave, onCancel,
}: SentenceEditFormProps) {
  const beforeLabel  = lang === 'en' ? 'Before blank' : lang === 'ca' ? 'Abans del buit' : 'Antes del hueco'
  const readingLabel = lang === 'en' ? 'Reading before' : lang === 'ca' ? 'Lectura abans' : 'Lectura antes'
  const altLabel     = lang === 'en' ? 'Alternative' : lang === 'ca' ? 'Alternativa' : 'Alternativa'
  const altsHint     = lang === 'en'
    ? 'Alternative phrasings (honorifics, different pronouns…) accepted as correct'
    : lang === 'ca'
    ? 'Formes alternatives (honorífics, pronoms…) acceptades com a correctes'
    : 'Formas alternativas (honoríficos, pronombres…) aceptadas como correctas'

  function setAlt(i: number, val: string) {
    const next = [...editBeforeAlts]
    next[i] = val
    setEditBeforeAlts(next)
  }
  function setAltR(i: number, val: string) {
    const next = [...editBeforeRAlts]
    next[i] = val
    setEditBeforeRAlts(next)
  }

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className="text-sm font-bold text-amber-800 dark:text-amber-300">
          {lang === 'en' ? 'Edit sentence' : lang === 'ca' ? 'Editar frase' : 'Editar frase'}
        </span>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-amber-200 dark:border-amber-700 px-3 py-2 text-center font-bold text-slate-700 dark:text-slate-200 text-lg">
        {editBefore}
        <span className="mx-1 px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">{editAnswer || '___'}</span>
        {editAfter}
      </div>

      {/* Main before + reading */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{beforeLabel}</label>
          <input value={editBefore} onChange={e => setEditBefore(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium"
            lang="ja" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{readingLabel}</label>
          <input value={editBeforeR} onChange={e => setEditBeforeR(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            lang="ja" />
        </div>
      </div>

      {/* Alternatives (up to 4) */}
      <div className="border border-dashed border-amber-300 dark:border-amber-700 rounded-lg p-3 space-y-2">
        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
          <span>≈</span> {altLabel}s
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 -mt-1">{altsHint}</p>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="grid grid-cols-2 gap-2">
            <input
              value={editBeforeAlts[i] ?? ''}
              onChange={e => setAlt(i, e.target.value)}
              placeholder={`${altLabel} ${i + 1}`}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600 font-medium"
              lang="ja"
            />
            <input
              value={editBeforeRAlts[i] ?? ''}
              onChange={e => setAltR(i, e.target.value)}
              placeholder={`${lang === 'en' ? 'Reading' : lang === 'ca' ? 'Lectura' : 'Lectura'} ${i + 1}`}
              className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 placeholder:text-slate-300 dark:placeholder:text-slate-600"
              lang="ja"
            />
          </div>
        ))}
      </div>

      {/* Answer + after fields */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {lang === 'en' ? 'Answer (grammar)' : lang === 'ca' ? 'Resposta (gramàtica)' : 'Respuesta (gramática)'}
          </label>
          <input value={editAnswer} onChange={e => setEditAnswer(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 font-bold text-indigo-700 dark:text-indigo-300"
            lang="ja" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {lang === 'en' ? 'After blank' : lang === 'ca' ? 'Després del buit' : 'Después del hueco'}
          </label>
          <input value={editAfter} onChange={e => setEditAfter(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 font-medium"
            lang="ja" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            {lang === 'en' ? 'Reading after' : lang === 'ca' ? 'Lectura després' : 'Lectura después'}
          </label>
          <input value={editAfterR} onChange={e => setEditAfterR(e.target.value)}
            className="w-full px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            lang="ja" />
        </div>
      </div>

      {/* Translation fields */}
      <div className="border-t border-amber-200 dark:border-amber-700/50 pt-3 space-y-2">
        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          {lang === 'en' ? 'Translations' : lang === 'ca' ? 'Traduccions' : 'Traducciones'}
        </p>
        {[
          { code: 'ES', val: editTransEs, set: setEditTransEs },
          { code: 'CA', val: editTransCa, set: setEditTransCa },
          { code: 'EN', val: editTransEn, set: setEditTransEn },
        ].map(({ code, val, set }) => (
          <div key={code} className="flex items-center gap-2">
            <span className="w-7 text-[10px] font-bold text-slate-400 dark:text-slate-500 shrink-0">{code}</span>
            <input
              value={val}
              onChange={e => set(e.target.value)}
              className="flex-1 px-2 py-1.5 text-sm border border-slate-200 dark:border-slate-600 rounded-lg focus:border-indigo-400 dark:focus:border-indigo-500 focus:outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100"
            />
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 dark:disabled:bg-indigo-800 text-white text-xs font-semibold transition"
        >
          {saving && (
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
            </svg>
          )}
          💾 {lang === 'en' ? 'Save' : lang === 'ca' ? 'Desar' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold transition"
        >
          {lang === 'en' ? 'Cancel' : lang === 'ca' ? 'Cancel·lar' : 'Cancelar'}
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Back header helper
// ─────────────────────────────────────────────────────────────────────────────
function BackHeader({ onBack, label, sublabel }: { onBack: () => void; label: string; sublabel?: string }) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={onBack}
        className="mt-0.5 p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{label}</h2>
        {sublabel && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  )
}
