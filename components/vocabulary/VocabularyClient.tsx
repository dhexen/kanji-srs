'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem, getMeaningForLang } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

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
  { label: '1º Primaria', labelCa: '1r Primària', labelEn: '1st Grade', labelJa: '小学1年生', value: 1, kanjis: 80, words: 240 },
  { label: '2º Primaria', labelCa: '2n Primària', labelEn: '2nd Grade', labelJa: '小学2年生', value: 2, kanjis: 160, words: 480 },
]

export default function VocabularyClient() {
  const { state, addVocabItems, saveVocabDb } = useStore()
  const [packSize, setPackSize] = useState(3)
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [step, setStep] = useState<'select' | 'preview'>('select')
  const [discarded, setDiscarded] = useState<Set<string>>(new Set())
  const [showManual, setShowManual] = useState(false)
  const [form, setForm] = useState({ kanji: '', jp: '', reading: '', meaning: '' })
  const lang = state.lang

  const existingWords = new Set(state.db.map(i => i.jp))
  const activeKanjis = new Set(state.db.map(i => i.kanji))

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

  // Count how many kanjis of each grade the user already has
  const gradeKanjiCount = (gradeVal: number) => {
    return state.db.filter(i => {
      // We don't store grade per word, so we count based on approximate kanji coverage
      // Instead just show total active kanjis
      return i.status === 'active'
    }).length
  }

  async function loadPreview() {
    if (!state.user) { showToast(t(lang, 'vocab_no_login'), 'error'); return }
    setLoading(true)
    try {
      const kanjis = await getRandomKanjis(packSize * 3, grade)
      const newKanjis = (kanjis as string[]).filter(k => !activeKanjis.has(k)).slice(0, packSize)
      if (newKanjis.length === 0) {
        showToast(lang === 'ja' ? '新しい漢字がありません' : lang === 'ca' ? 'Ja tens tots els kanjis d\'aquest curs' : lang === 'en' ? 'You already have all kanji from this grade' : 'Ya tienes todos los kanjis de este curso', 'info')
        setLoading(false)
        return
      }
      const vocab = await getVocabularyByKanjis(newKanjis)
      const newVocab = (vocab || []).filter((v: any) => !existingWords.has(v.word))
      setPreview(newVocab)
      setDiscarded(new Set())
      setStep('preview')
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

  function discardAllKanji(kanjiChar: string) {
    setDiscarded(prev => {
      const next = new Set(prev)
      preview.filter(v => v.kanji === kanjiChar && !existingWords.has(v.word)).forEach(v => next.add(v.word))
      return next
    })
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
      } as VocabItem
      return activateItem(base, 1, now)
    })
    try {
      await addVocabItems(newItems)
      showToast(`${newItems.length} ${t(lang, 'vocab_added_srs')}`, 'success')
      setStep('select')
      setPreview([])
      setDiscarded(new Set())
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
      setForm({ kanji: '', jp: '', reading: '', meaning: '' })
      showToast('OK', 'success')
    } catch { /* toast en store */ }
  }

  const selectedCount = preview.filter(v => !existingWords.has(v.word) && !discarded.has(v.word)).length

  const grouped: Record<string, any[]> = {}
  preview.forEach(v => { if (!grouped[v.kanji]) grouped[v.kanji] = []; grouped[v.kanji].push(v) })

  if (!state.user) {
    return (
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t(lang, 'vocab_no_login')}</h2>
        <p className="text-slate-500 text-sm">{t(lang, 'vocab_no_login_sub')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {step === 'select' && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{t(lang, 'vocab_title')}</h2>
          <p className="text-slate-500 text-sm mb-6">{t(lang, 'vocab_sub')}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Grade selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_course')}</label>
              <div className="space-y-2">
                {GRADES.map(g => (
                  <button key={g.value} onClick={() => setGrade(g.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${
                      grade === g.value
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}>
                    <div className="flex items-center justify-between">
                      <span>🏫 {gradeLabel(g)}</span>
                      <span className={`text-xs font-normal px-2 py-0.5 rounded ${grade === g.value ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {g.kanjis} kanjis · {g.words} {t(lang, 'study_words')}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Pack size */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_amount')}</label>
              <div className="space-y-2">
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
              <div className="text-2xl font-bold text-emerald-600">{state.db.length}</div>
              <div className="text-xs text-slate-400">{t(lang, 'vocab_total')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {GRADES.find(g => g.value === grade)!.kanjis - [...activeKanjis].length > 0
                  ? GRADES.find(g => g.value === grade)!.kanjis - [...activeKanjis].length
                  : '✓'}
              </div>
              <div className="text-xs text-slate-400">{t(lang, 'vocab_available')}</div>
            </div>
          </div>

          <button onClick={loadPreview} disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition shadow-md flex items-center justify-center gap-2">
            {loading
              ? `⏳ ${t(lang, 'vocab_loading')}`
              : `${t(lang, 'vocab_load')} ${packSize} ${t(lang, 'vocab_load2')}`}
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-6">
          {/* Action bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <p className="text-slate-500 text-sm">
                {selectedCount} {t(lang, 'vocab_selected_count')}
                {discarded.size > 0 && (
                  <span className="ml-2 text-slate-400">· {discarded.size} {t(lang, 'vocab_discarded_count')}</span>
                )}
              </p>
              <button onClick={() => { setStep('select'); setDiscarded(new Set()) }}
                className="text-slate-400 hover:text-slate-600 text-sm underline">
                {t(lang, 'vocab_back')}
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={addSelectedToSrs} disabled={selectedCount === 0}
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
          {Object.entries(grouped).map(([kanji, words]) => (
            <div key={kanji}>
              {/* Kanji group header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <span className="kanji-font text-2xl font-bold text-indigo-500">{kanji}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{t(lang, 'study_kanji_label')} {kanji}</h3>
                    <p className="text-slate-400 text-sm">{t(lang, 'study_keywords_sub')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => discardAllKanji(kanji)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold text-sm border border-indigo-100 transition shrink-0"
                >
                  🎓 {t(lang, 'study_master_kanji')}
                </button>
              </div>

              {/* Word cards grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {words.map((w: any) => {
                  const alreadyHas = existingWords.has(w.word)
                  const isDiscarded = discarded.has(w.word)
                  return (
                    <div key={w.word}
                      className={`bg-white rounded-2xl border p-4 shadow-sm transition-all ${
                        alreadyHas ? 'opacity-40 border-slate-100'
                        : isDiscarded ? 'border-slate-200 opacity-50'
                        : 'border-slate-100'
                      }`}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="kanji-font text-2xl font-bold text-slate-800 leading-tight">{w.word}</span>
                        <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg font-medium shrink-0 mt-1">{w.reading}</span>
                      </div>
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
          ))}
        </div>
      )}

      {/* Manual add section */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
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
      </div>
    </div>
  )
}
