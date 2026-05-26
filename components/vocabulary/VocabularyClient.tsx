'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem, VocabCategory, VocabWordType } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis, getVocabGradeWords, getKanjiGrade, insertUnofficialVocab, searchVocabulary } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'
import SectionHelp from '@/components/ui/SectionHelp'
import VocabGlossary from './VocabGlossary'

const ALL_CATEGORIES: VocabCategory[] = [
  'animals','nature','colors','weather','time','food','transport','family',
  'body','school','home','work','places','numbers','emotions','actions','sports','culture','other',
]

const ALL_WORD_TYPES: VocabWordType[] = [
  'noun','verb_transitive','verb_intransitive','verb','adj_i','adj_na','adverb','particle','expression',
]

function CategoryBadge({ category, lang }: { category: VocabCategory; lang: string }) {
  const label = t(lang as any, `cat_${category}`)
  return (
    <span className="inline-block text-xs font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-100 leading-none">
      {label}
    </span>
  )
}

function WordTypeBadge({ wordType, lang }: { wordType: VocabWordType; lang: string }) {
  const label = t(lang as any, `wt_${wordType}`)
  const colors: Record<VocabWordType, string> = {
    noun: 'bg-slate-100 text-slate-600 border-slate-200',
    verb_transitive: 'bg-violet-50 text-violet-600 border-violet-100',
    verb_intransitive: 'bg-purple-50 text-purple-600 border-purple-100',
    verb: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    adj_i: 'bg-amber-50 text-amber-600 border-amber-100',
    adj_na: 'bg-orange-50 text-orange-600 border-orange-100',
    adverb: 'bg-teal-50 text-teal-600 border-teal-100',
    particle: 'bg-rose-50 text-rose-600 border-rose-100',
    expression: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  }
  return (
    <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded border leading-none ${colors[wordType]}`}>
      {label}
    </span>
  )
}

type KanjiInfo = { meanings: string[]; on_readings: string[]; kun_readings: string[] }

function activateItem(item: VocabItem, level: number, due: number): VocabItem {
  const upd: VocabItem = { ...item, status: 'active', srsLevel: level, due }
  Object.values(MODE_CONFIG).forEach(cfg => {
    const row = upd as unknown as Record<string, number>
    row[`${cfg.key}_level`] = level
    row[`${cfg.key}_due`] = due
  })
  return migrateItem(upd)
}

const GRADES = [
  { label: '1º Primaria',   labelCa: '1r Primària',   labelEn: '1st Grade', labelJa: '小学1年生', value: 1, group: 'primary'   },
  { label: '2º Primaria',   labelCa: '2n Primària',   labelEn: '2nd Grade', labelJa: '小学2年生', value: 2, group: 'primary'   },
  { label: '3º Primaria',   labelCa: '3r Primària',   labelEn: '3rd Grade', labelJa: '小学3年生', value: 3, group: 'primary'   },
  { label: '4º Primaria',   labelCa: '4t Primària',   labelEn: '4th Grade', labelJa: '小学4年生', value: 4, group: 'primary'   },
  { label: '5º Primaria',   labelCa: '5è Primària',   labelEn: '5th Grade', labelJa: '小学5年生', value: 5, group: 'primary'   },
  { label: '6º Primaria',   labelCa: '6è Primària',   labelEn: '6th Grade', labelJa: '小学6年生', value: 6, group: 'primary'   },
  { label: '1º Secundaria', labelCa: '1r Secundària', labelEn: '7th Grade', labelJa: '中学1年生', value: 7, group: 'secondary' },
  { label: '2º Secundaria', labelCa: '2n Secundària', labelEn: '8th Grade', labelJa: '中学2年生', value: 8, group: 'secondary' },
  { label: '3º Secundaria', labelCa: '3r Secundària', labelEn: '9th Grade', labelJa: '中学3年生', value: 9, group: 'secondary' },
]
const PRIMARY_GRADES   = GRADES.filter(g => g.group === 'primary')
const SECONDARY_GRADES = GRADES.filter(g => g.group === 'secondary')

type GradeWordEntry = { word: string; kanji: string; is_official: boolean }

export default function VocabularyClient() {
  const { state, addVocabItems } = useStore()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab') as 'import' | 'glossary' | null
  const [activeTab, setActiveTab] = useState<'import' | 'glossary'>(
    tabParam === 'glossary' ? 'glossary' : 'import'
  )

  // Sync tab with URL param changes (when nav link is clicked)
  useEffect(() => {
    setActiveTab(tabParam === 'glossary' ? 'glossary' : 'import')
  }, [tabParam])
  const [packSize, setPackSize] = useState(3)
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [step, setStep] = useState<'select' | 'preview'>('select')
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [showManual, setShowManual] = useState(false)
  const [form, setForm] = useState({ kanji: '', jp: '', reading: '', meaning: '' })
  const [gradeWords, setGradeWords] = useState<Record<number, GradeWordEntry[]>>({})
  const [statsLoading, setStatsLoading] = useState(true)
  const [shownKanjis, setShownKanjis] = useState<Set<string>>(new Set())
  const [allOrderedKanjis, setAllOrderedKanjis] = useState<string[]>([])
  const [dominatingKanji, setDominatingKanji] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [filterCategory, setFilterCategory] = useState<VocabCategory | ''>('')
  const [filterWordType, setFilterWordType] = useState<VocabWordType | ''>('')
  const [addingWord, setAddingWord] = useState<string | null>(null)
  const [kanjiInfo, setKanjiInfo] = useState<Record<string, KanjiInfo | null>>({})
  const fetchedKanjisRef = useRef(new Set<string>())
  const lang = state.lang

  const existingWords = useMemo(() => new Set(state.db.map(i => i.jp)), [state.db])
  const activeKanjis = useMemo(() => new Set(state.db.map(i => i.kanji)), [state.db])

  const PACKS = [
    { value: 3, label: t(lang, 'vocab_k3'), desc: t(lang, 'vocab_k3_desc') },
    { value: 5, label: t(lang, 'vocab_k5'), desc: t(lang, 'vocab_k5_desc') },
    { value: 15, label: t(lang, 'vocab_k15'), desc: t(lang, 'vocab_k15_desc') },
  ]

  const meaning = (v: any) =>
    lang === 'ca' && v.meaning_ca ? v.meaning_ca
    : lang === 'en' && v.meaning_en ? v.meaning_en
    : v.meaning_es

  const gradeLabel = (g: typeof GRADES[0]) =>
    lang === 'ca' ? g.labelCa : lang === 'en' ? g.labelEn : lang === 'ja' ? g.labelJa : g.label

  function getGradeStats(gradeVal: number) {
    const words = gradeWords[gradeVal] ?? []
    const totalWords = words.length
    const totalKanjis = new Set(words.map(w => w.kanji)).size
    const unofficial = words.filter(w => !w.is_official).length
    const userWords = words.filter(w => existingWords.has(w.word))
    const userWordCount = userWords.length
    const userKanjiCount = new Set(userWords.map(w => w.kanji)).size
    return { totalWords, totalKanjis, unofficial, userWordCount, userKanjiCount, remaining: totalWords - userWordCount }
  }

  async function loadGradeStats() {
    setStatsLoading(true)
    try {
      const results = await Promise.all(
        GRADES.map(g => getVocabGradeWords(g.value).then(data => ({ grade: g.value, data })))
      )
      const byGrade: Record<number, GradeWordEntry[]> = {}
      for (const { grade: g, data } of results) byGrade[g] = data
      setGradeWords(byGrade)
    } catch { /* stats are optional */ } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => { loadGradeStats() }, [])

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return }
    setSearchLoading(true)
    const timer = setTimeout(async () => {
      try {
        const results = await searchVocabulary(searchQuery)
        setSearchResults(results)
      } catch { /* ignore */ } finally { setSearchLoading(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    if (preview.length === 0) return
    const kanjis = [...new Set(preview.map((v: any) => v.kanji as string))]
    const toFetch = kanjis.filter(k => !fetchedKanjisRef.current.has(k))
    if (toFetch.length === 0) return
    toFetch.forEach(k => fetchedKanjisRef.current.add(k))
    Promise.all(
      toFetch.map(k =>
        fetch(`https://kanjiapi.dev/v1/kanji/${encodeURIComponent(k)}`)
          .then(r => r.ok ? r.json() : null)
          .catch(() => null)
          .then(data => [k, data] as const)
      )
    ).then(results => {
      const updates: Record<string, KanjiInfo | null> = {}
      for (const [k, data] of results) {
        updates[k] = data ? { meanings: data.meanings ?? [], on_readings: data.on_readings ?? [], kun_readings: data.kun_readings ?? [] } : null
      }
      setKanjiInfo(prev => ({ ...prev, ...updates }))
    })
  }, [preview])

  async function addWordToSrs(w: any) {
    setAddingWord(w.word)
    try {
      const now = Date.now()
      const base: VocabItem = {
        kanji: w.kanji, jp: w.word, reading: w.reading,
        meaning: w.meaning_es, meaning_ca: w.meaning_ca, meaning_en: w.meaning_en,
        srsLevel: 1, due: now, status: 'active',
        ...(w.image_url ? { image_url: w.image_url } : {}),
        ...(w.category ? { category: w.category } : {}),
        ...(w.word_type ? { word_type: w.word_type } : {}),
      } as VocabItem
      await addVocabItems([activateItem(base, 1, now)])
      loadGradeStats()
    } catch { showToast('Error', 'error') } finally { setAddingWord(null) }
  }

  async function markWordKnown(w: any) {
    setAddingWord(w.word)
    try {
      const now = Date.now()
      const masterDue = now + 30 * 24 * 60 * 60 * 1000
      const base: VocabItem = {
        kanji: w.kanji, jp: w.word, reading: w.reading,
        meaning: w.meaning_es, meaning_ca: w.meaning_ca, meaning_en: w.meaning_en,
        srsLevel: 8, due: masterDue, status: 'active',
        ...(w.image_url ? { image_url: w.image_url } : {}),
        ...(w.category ? { category: w.category } : {}),
        ...(w.word_type ? { word_type: w.word_type } : {}),
      } as VocabItem
      await addVocabItems([activateItem(base, 8, masterDue)])
      loadGradeStats()
    } catch { showToast('Error', 'error') } finally { setAddingWord(null) }
  }

  async function loadPreview() {
    if (!state.user) { showToast(t(lang, 'vocab_no_login'), 'error'); return }
    setLoading(true)
    try {
      const allKanjis = await getRandomKanjis(0, grade) as string[]
      setAllOrderedKanjis(allKanjis)
      const newKanjis = allKanjis.filter(k => !activeKanjis.has(k) && !shownKanjis.has(k)).slice(0, packSize)
      setShownKanjis(prev => new Set([...prev, ...newKanjis]))
      if (newKanjis.length === 0) {
        showToast(t(lang, 'vocab_complete'), 'info')
        setLoading(false)
        return
      }
      const vocab = await getVocabularyByKanjis(newKanjis, grade)
      const newVocab = (vocab || []).filter((v: any) => !existingWords.has(v.word))
      setPreview(newVocab)
      setDiscarded(new Set())
      setStep('preview')
      window.dispatchEvent(new CustomEvent('tutorial-action', { detail: { action: 'vocab-loaded' } }))
    } catch (e) {
      showToast('Error', 'error')
    } finally { setLoading(false) }
  }

  function toggleDiscard(word: string) {
    setDiscarded(prev => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  async function dominateKanji(kanjiChar: string) {
    setDominatingKanji(kanjiChar)
    try {
      // Save all new words for this kanji at Maestro level (8)
      const kanjiWords = preview.filter(v => v.kanji === kanjiChar && !existingWords.has(v.word))
      if (kanjiWords.length > 0) {
        const now = Date.now()
        const masterDue = now + 30 * 24 * 60 * 60 * 1000
        const newItems: VocabItem[] = kanjiWords.map(v => {
          const base: VocabItem = {
            kanji: v.kanji, jp: v.word, reading: v.reading,
            meaning: v.meaning_es, meaning_ca: v.meaning_ca, meaning_en: v.meaning_en,
            srsLevel: 8, due: masterDue, status: 'active',
            ...(v.image_url ? { image_url: v.image_url } : {}),
            ...(v.category ? { category: v.category } : {}),
            ...(v.word_type ? { word_type: v.word_type } : {}),
          } as VocabItem
          return activateItem(base, 8, masterDue)
        })
        await addVocabItems(newItems)
      }

      // Find next kanji in sorted order not yet shown nor active
      const currentKanjis = new Set(Object.keys(grouped).filter(k => k !== kanjiChar))
      const nextKanji = allOrderedKanjis.find(
        k => !activeKanjis.has(k) && !shownKanjis.has(k) && !currentKanjis.has(k)
      )

      // Remove dominated kanji from preview
      setPreview(prev => prev.filter(v => v.kanji !== kanjiChar))

      // Fetch and append next kanji if available
      if (nextKanji) {
        setShownKanjis(prev => new Set([...prev, nextKanji]))
        const vocab = await getVocabularyByKanjis([nextKanji], grade)
        const newWords = (vocab || []).filter((v: any) => !existingWords.has(v.word))
        setPreview(prev => [...prev, ...newWords])
      }

      loadGradeStats()
    } catch {
      showToast('Error', 'error')
    } finally {
      setDominatingKanji(null)
    }
  }

  async function addSelectedToSrs() {
    const now = Date.now()
    const selected = preview.filter(v => !existingWords.has(v.word) && !discarded.has(v.word))
    if (selected.length === 0) {
      showToast(t(lang, 'vocab_none_selected'), 'info')
      return
    }
    const newItems: VocabItem[] = selected.map(v => {
      const base: VocabItem = {
        kanji: v.kanji, jp: v.word, reading: v.reading,
        meaning: v.meaning_es,
        meaning_ca: v.meaning_ca,
        meaning_en: v.meaning_en,
        srsLevel: 1, due: now, status: 'active',
        ...(v.image_url ? { image_url: v.image_url } : {}),
        ...(v.category ? { category: v.category } : {}),
        ...(v.word_type ? { word_type: v.word_type } : {}),
      } as VocabItem
      return activateItem(base, 1, now)
    })
    try {
      await addVocabItems(newItems)
      showToast(`${newItems.length} ${t(lang, 'vocab_added_srs')}`, 'success')
      setStep('select')
      setPreview([])
      setDiscarded(new Set())
      loadGradeStats()
      window.dispatchEvent(new CustomEvent('tutorial-action', { detail: { action: 'vocab-activated' } }))
    } catch {
      /* toast ya mostrado por el store */
    }
  }

  async function addManual() {
    const { kanji, jp, reading, meaning: m } = form
    if (!kanji || !jp || !reading || !m) { showToast('Error', 'error'); return }
    if (state.db.some(d => d.jp === jp)) { showToast('Error', 'error'); return }
    const now = Date.now()
    const base: VocabItem = { kanji, jp, reading, meaning: m, srsLevel: 1, due: now, status: 'active' }
    const item = activateItem(base, 1, now)
    try {
      await addVocabItems([item])
      // Add to shared vocabulary table as unofficial (grade from kanji lookup, or 0 if unknown)
      const kanjiGrade = await getKanjiGrade(kanji).catch(() => null)
      await insertUnofficialVocab({ kanji, word: jp, reading, meaning_es: m, grade: kanjiGrade ?? 0 }).catch(() => {})
      setForm({ kanji: '', jp: '', reading: '', meaning: '' })
      showToast('OK', 'success')
      loadGradeStats()
    } catch { /* toast en store */ }
  }

  const filteredSearchResults = searchResults.filter(w => {
    if (filterCategory && w.category !== filterCategory) return false
    if (filterWordType && w.word_type !== filterWordType) return false
    return true
  })

  const selectedCount = preview.filter(v => !existingWords.has(v.word) && !discarded.has(v.word)).length
  const grouped: Record<string, any[]> = {}
  preview.forEach(v => { if (!grouped[v.kanji]) grouped[v.kanji] = []; grouped[v.kanji].push(v) })

  const currentStats = getGradeStats(grade)

  if (!state.user) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t(lang, 'vocab_no_login')}</h2>
        <p className="text-slate-500 text-sm">{t(lang, 'vocab_no_login_sub')}</p>
      </div>
    )
  }

  const isSearching = searchQuery.trim().length > 0

  return (
    <div className="space-y-6">

      {/* Tab switcher — visible on mobile only (desktop uses the sidebar submenu) */}
      <div className="flex gap-2 lg:hidden">
        <button
          onClick={() => setActiveTab('import')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'import'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          📥 {t(lang, 'vocab_tab_import')}
        </button>
        <button
          onClick={() => setActiveTab('glossary')}
          className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'glossary'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
          }`}
        >
          📋 {t(lang, 'vocab_tab_glossary')}
        </button>
      </div>

      {/* Glossary tab */}
      {activeTab === 'glossary' && <VocabGlossary />}

      {/* Import tab content */}
      {activeTab === 'import' && <>

      {/* Search bar — always visible */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-slate-400 text-lg shrink-0">🔍</span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t(lang, 'vocab_search_ph')}
            className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400 text-slate-800"
          />
          {isSearching && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xl leading-none shrink-0">×</button>
          )}
        </div>
        {/* Category + word type filters — visible when searching */}
        {isSearching && (
          <div className="flex flex-wrap gap-2 pt-1">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value as VocabCategory | '')}
              className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">{t(lang, 'vocab_all_categories')}</option>
              {ALL_CATEGORIES.map(c => (
                <option key={c} value={c}>{t(lang, `cat_${c}`)}</option>
              ))}
            </select>
            <select
              value={filterWordType}
              onChange={e => setFilterWordType(e.target.value as VocabWordType | '')}
              className="text-xs rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">{t(lang, 'vocab_all_types')}</option>
              {ALL_WORD_TYPES.map(wt => (
                <option key={wt} value={wt}>{t(lang, `wt_${wt}`)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Search results */}
      {isSearching && (
        <div>
          {searchLoading ? (
            <p className="text-center text-slate-400 py-8 text-sm">{t(lang, 'vocab_searching')}</p>
          ) : filteredSearchResults.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">
              {t(lang, 'vocab_no_results').replace('{q}', searchQuery)}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSearchResults.map((w: any) => {
                const alreadyHas = existingWords.has(w.word)
                const isBusy = addingWord === w.word
                const isUnofficial = w.is_official === false
                return (
                  <div key={w.word} className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${alreadyHas ? 'border-emerald-200' : isUnofficial ? 'border-red-200' : 'border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="kanji-font text-2xl font-bold text-slate-800 leading-tight">{w.word}</span>
                        {isUnofficial && <span className="text-xs text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">{t(lang, 'vocab_unofficial')}</span>}
                      </div>
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-medium shrink-0 mt-1">{w.reading}</span>
                    </div>
                    {(w.category || w.word_type) && (
                      <div className="flex flex-wrap gap-1 mb-1 mt-0.5">
                        {w.word_type && <WordTypeBadge wordType={w.word_type} lang={lang} />}
                        {w.category && <CategoryBadge category={w.category} lang={lang} />}
                      </div>
                    )}
                    {w.image_url && (
                      <img
                        src={w.image_url}
                        alt=""
                        className="w-full h-20 object-cover rounded-xl mb-2 mt-1"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                      />
                    )}
                    <p className="text-xs text-slate-400 mb-1">{t(lang, 'study_kanji_label')} {w.kanji}</p>
                    <p className="text-slate-500 text-sm mb-3">{meaning(w)}</p>
                    {alreadyHas ? (
                      <span className="text-xs text-emerald-600 font-semibold">✓ {t(lang, 'vocab_already')}</span>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          disabled={isBusy}
                          onClick={() => addWordToSrs(w)}
                          className="flex-1 text-xs font-semibold rounded-lg px-2 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-40 transition"
                        >
                          {isBusy ? '...' : `+ ${t(lang, 'vocab_activate_srs')}`}
                        </button>
                        <button
                          disabled={isBusy}
                          onClick={() => markWordKnown(w)}
                          className="flex-1 text-xs font-semibold rounded-lg px-2 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-40 transition"
                        >
                          {isBusy ? '...' : `✓ ${t(lang, 'study_known_btn')}`}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {!isSearching && step === 'select' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-slate-800">{t(lang, 'vocab_title')}</h2>
            <SectionHelp section="vocabulary" lang={lang} />
          </div>
          <p className="text-slate-500 text-sm mb-6">{t(lang, 'vocab_sub')}</p>

          <div data-tutorial-id="vocab-load-controls" className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Grade selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_course')}</label>
              <div data-tutorial-id="vocab-grade-selector" className="space-y-3">
                {/* Primaria */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">
                    {lang === 'en' ? 'Elementary' : lang === 'ja' ? '小学校' : lang === 'ca' ? 'Primària' : 'Primaria'}
                  </p>
                  {PRIMARY_GRADES.map(g => {
                    const gStats = getGradeStats(g.value)
                    const isSelected = grade === g.value
                    return (
                      <button key={g.value} onClick={() => { setGrade(g.value); setShownKanjis(new Set()) }}
                        className={`w-full px-3 py-2 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                        }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span>🏫 {gradeLabel(g)}</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <span className={`text-xs font-normal px-2 py-0.5 rounded ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {statsLoading ? '...' : `${gStats.totalKanjis} kanjis · ${gStats.totalWords} ${t(lang, 'study_words')}`}
                            </span>
                            {!statsLoading && gStats.unofficial > 0 && (
                              <span className={`text-xs font-normal px-2 py-0.5 rounded ${isSelected ? 'bg-red-400 text-white' : 'bg-red-50 text-red-500'}`}>
                                {t(lang, 'vocab_unofficials_n').replace('{n}', String(gStats.unofficial))}
                              </span>
                            )}
                          </div>
                        </div>
                        {!statsLoading && gStats.userWordCount > 0 && (
                          <div className={`text-xs font-normal mt-0.5 ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                            ({t(lang, 'vocab_learning').replace('{k}', String(gStats.userKanjiCount)).replace('{w}', String(gStats.userWordCount))})
                          </div>
                        )}
                        {!statsLoading && (
                          <div className={`text-xs font-normal mt-0.5 ${isSelected ? 'text-indigo-200' : gStats.remaining === 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {gStats.remaining === 0 ? t(lang, 'vocab_complete') : t(lang, 'vocab_remaining_n').replace('{n}', String(gStats.remaining))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
                {/* Secundaria */}
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1">
                    {lang === 'en' ? 'Middle School' : lang === 'ja' ? '中学校' : lang === 'ca' ? 'Secundària' : 'Secundaria'}
                  </p>
                  {SECONDARY_GRADES.map(g => {
                    const gStats = getGradeStats(g.value)
                    const isSelected = grade === g.value
                    return (
                      <button key={g.value} onClick={() => { setGrade(g.value); setShownKanjis(new Set()) }}
                        className={`w-full px-3 py-2 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                        }`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span>🎓 {gradeLabel(g)}</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end">
                            <span className={`text-xs font-normal px-2 py-0.5 rounded ${isSelected ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {statsLoading ? '...' : `${gStats.totalKanjis} kanjis · ${gStats.totalWords} ${t(lang, 'study_words')}`}
                            </span>
                            {!statsLoading && gStats.unofficial > 0 && (
                              <span className={`text-xs font-normal px-2 py-0.5 rounded ${isSelected ? 'bg-red-400 text-white' : 'bg-red-50 text-red-500'}`}>
                                {t(lang, 'vocab_unofficials_n').replace('{n}', String(gStats.unofficial))}
                              </span>
                            )}
                          </div>
                        </div>
                        {!statsLoading && gStats.userWordCount > 0 && (
                          <div className={`text-xs font-normal mt-0.5 ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>
                            ({t(lang, 'vocab_learning').replace('{k}', String(gStats.userKanjiCount)).replace('{w}', String(gStats.userWordCount))})
                          </div>
                        )}
                        {!statsLoading && (
                          <div className={`text-xs font-normal mt-0.5 ${isSelected ? 'text-violet-200' : gStats.remaining === 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {gStats.remaining === 0 ? t(lang, 'vocab_complete') : t(lang, 'vocab_remaining_n').replace('{n}', String(gStats.remaining))}
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Pack size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_amount')}</label>
              <div data-tutorial-id="vocab-pack-selector" className="space-y-2">
                {PACKS.map(p => (
                  <button key={p.value} onClick={() => setPackSize(p.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                      packSize === p.value
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                    }`}>
                    {p.label} <span className={`text-xs font-normal ${packSize === p.value ? 'opacity-80' : 'text-slate-400'}`}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600">{activeKanjis.size}</div>
              <div className="text-xs text-slate-400">{t(lang, 'vocab_active')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-emerald-600">
                {statsLoading ? '...' : currentStats.totalWords}
              </div>
              <div className="text-xs text-slate-400">{t(lang, 'vocab_total')}</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${statsLoading ? 'text-slate-400' : currentStats.remaining === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {statsLoading ? '...' : currentStats.remaining === 0 ? '✓' : currentStats.remaining}
              </div>
              <div className="text-xs text-slate-400">{t(lang, 'vocab_available')}</div>
            </div>
          </div>

          <button data-tutorial-id="vocab-load-btn" onClick={loadPreview} disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition shadow-md flex items-center justify-center gap-2">
            {loading
              ? `⏳ ${t(lang, 'vocab_loading')}`
              : `${t(lang, 'vocab_load')} ${packSize} ${t(lang, 'vocab_load2')}`}
          </button>
        </div>
      )}

      {!isSearching && step === 'preview' && (
        <div data-tutorial-id="vocab-preview-area" className="space-y-6">
          {/* Action bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-sm">
                {selectedCount} {t(lang, 'vocab_selected_count')}
                {discarded.size > 0 && (
                  <span className="ml-2 text-slate-400">· {discarded.size} {t(lang, 'vocab_discarded_count')}</span>
                )}
              </p>
              <button onClick={() => { setStep('select'); setDiscarded(new Set()); setShownKanjis(new Set()) }}
                className="text-slate-400 hover:text-slate-600 text-sm underline">
                {t(lang, 'vocab_back')}
              </button>
            </div>
            <div className="flex gap-3">
              <button data-tutorial-id="vocab-activate-btn" onClick={addSelectedToSrs} disabled={selectedCount === 0}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold rounded-xl transition">
                {t(lang, 'vocab_activate_srs')} ({selectedCount})
              </button>
              <button onClick={loadPreview} disabled={loading}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-sm">
                {t(lang, 'vocab_other')}
              </button>
            </div>
          </div>

          {/* Words grouped by kanji — card layout */}
          {Object.entries(grouped).map(([kanji, words]) => {
            const info = kanjiInfo[kanji]
            return (
            <div key={kanji}>
              {/* Kanji group header — stacks vertically on mobile */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-3 gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-16 h-16 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="kanji-font text-3xl font-bold text-indigo-500">{kanji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800">{t(lang, 'study_kanji_label')} {kanji}</h3>
                    {info && info.meanings.length > 0 && (
                      <p className="text-slate-600 text-sm leading-snug">
                        {info.meanings.slice(0, 4).join(', ')}
                        {/* Meanings from kanjiapi.dev are always in English */}
                        <span className="ml-1 text-[10px] text-slate-400 bg-slate-100 px-1 py-0.5 rounded">EN</span>
                      </p>
                    )}
                    {info && (info.on_readings.length > 0 || info.kun_readings.length > 0) && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {info.on_readings.slice(0, 4).map(r => (
                          <span key={r} className="text-xs bg-orange-50 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full font-medium">
                            {t(lang, 'vocab_on_yomi')} {r}
                          </span>
                        ))}
                        {info.kun_readings.slice(0, 4).map(r => (
                          <span key={r} className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full font-medium">
                            {t(lang, 'vocab_kun_yomi')} {r}
                          </span>
                        ))}
                      </div>
                    )}
                    {!info && <p className="text-slate-400 text-xs">{t(lang, 'study_keywords_sub')}</p>}
                  </div>
                </div>
                {/* "Master kanji" button — full width on mobile, auto on sm+ */}
                <button
                  type="button"
                  onClick={() => dominateKanji(kanji)}
                  disabled={dominatingKanji === kanji}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-sm border border-indigo-100 transition sm:shrink-0 w-full sm:w-auto"
                >
                  🎓 {t(lang, 'study_master_kanji')}
                </button>
              </div>

              {/* Word cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {words.map((w: any) => {
                  const alreadyHas = existingWords.has(w.word)
                  const isDiscarded = discarded.has(w.word)
                  const isUnofficial = w.is_official === false
                  return (
                    <div key={w.word}
                      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
                        alreadyHas ? 'opacity-40 border-slate-100'
                        : isDiscarded ? 'border-slate-200 opacity-50'
                        : isUnofficial ? 'border-red-200'
                        : 'border-slate-100'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="kanji-font text-2xl font-bold text-slate-800 leading-tight">{w.word}</span>
                          {isUnofficial && (
                            <span className="text-xs text-red-500 font-semibold bg-red-50 px-1.5 py-0.5 rounded">
                              {t(lang, 'vocab_unofficial')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-medium shrink-0 mt-1">{w.reading}</span>
                      </div>
                      {(w.word_type || w.category) && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {w.word_type && <WordTypeBadge wordType={w.word_type} lang={lang} />}
                          {w.category && <CategoryBadge category={w.category} lang={lang} />}
                        </div>
                      )}
                      {w.image_url && (
                        <img
                          src={w.image_url}
                          alt=""
                          className="w-full h-24 object-cover rounded-xl mb-2"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      )}
                      <p className="text-slate-500 text-sm mb-3">{meaning(w)}</p>
                      {alreadyHas ? (
                        <span className="text-xs text-slate-300">{t(lang, 'vocab_already')}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleDiscard(w.word)}
                          className={`flex items-center gap-1.5 text-sm font-semibold rounded-lg px-3 py-1.5 transition border ${
                            isDiscarded
                              ? 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isDiscarded ? t(lang, 'vocab_undo') : <>✓ {t(lang, 'study_known_btn')}</>}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
          })}
        </div>
      )}

      {/* Manual add section */}
      {!isSearching && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowManual(v => !v)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          {t(lang, 'study_add_title')}
          <span className="text-slate-400">{showManual ? '−' : '+'}</span>
        </button>
        {showManual && (
          <div className="px-5 pb-5 pt-0 border-t border-slate-100 space-y-3">
            <p className="text-xs text-slate-400 pt-3">
              {t(lang, 'vocab_manual_note')}{' '}
              <span className="text-red-500 font-medium">{t(lang, 'vocab_unofficial')}</span>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {(['kanji', 'jp', 'reading', 'meaning'] as const).map(field => (
                <input
                  key={field}
                  type="text"
                  autoComplete="off"
                  value={form[field]}
                  onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                  placeholder={{
                    kanji: t(lang, 'study_kanji_ph'),
                    jp: t(lang, 'study_word_ph'),
                    reading: t(lang, 'study_reading_ph'),
                    meaning: t(lang, 'study_meaning_ph'),
                  }[field]}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                />
              ))}
            </div>
            <button
              type="button"
              onClick={addManual}
              className="px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition"
            >
              {t(lang, 'study_add_btn')}
            </button>
          </div>
        )}
      </div>}

      </> /* end import tab */}

    </div>
  )
}
