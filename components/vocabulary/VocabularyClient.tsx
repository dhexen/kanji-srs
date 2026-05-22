'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem } from '@/lib/srs'
import { getRandomKanjis, getVocabularyByKanjis } from '@/lib/supabase'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

const GRADES = [{ label: '1º Primaria', value: 1 }]

export default function VocabularyClient() {
  const { state, dispatch } = useStore()
  const [packSize, setPackSize] = useState(3)
  const [grade, setGrade] = useState(1)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<any[]>([])
  const [previewKanjis, setPreviewKanjis] = useState<string[]>([])
  const [step, setStep] = useState<'select' | 'preview'>('select')
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

  async function loadPreview() {
    if (!state.user) { showToast(t(lang, 'vocab_no_login'), 'error'); return }
    setLoading(true)
    try {
      const kanjis = await getRandomKanjis(packSize * 3, grade)
      const newKanjis = (kanjis as string[]).filter(k => !activeKanjis.has(k)).slice(0, packSize)
      if (newKanjis.length === 0) { showToast('Sin kanjis nuevos', 'info'); setLoading(false); return }
      const vocab = await getVocabularyByKanjis(newKanjis)
      const newVocab = (vocab || []).filter((v: any) => !existingWords.has(v.word))
      setPreview(newVocab)
      setPreviewKanjis(newKanjis)
      setStep('preview')
    } catch (e) {
      showToast('Error', 'error')
    } finally { setLoading(false) }
  }

  function addToStudy() {
    const now = Date.now()
    const newItems: VocabItem[] = preview.filter(v => !existingWords.has(v.word)).map(v => ({
      kanji: v.kanji, jp: v.word, reading: v.reading,
      meaning: v.meaning_es,
      meaning_ca: v.meaning_ca,
      meaning_en: v.meaning_en,
      srsLevel: 0, due: 0, status: 'locked',
    } as VocabItem))
    dispatch({ type: 'ADD_ITEMS', payload: newItems })
    showToast(`✅ ${newItems.length} ${t(lang, 'study_words')}`, 'success')
    setStep('select'); setPreview([])
  }

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
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_course')}</label>
              {GRADES.map(g => (
                <button key={g.value} onClick={() => setGrade(g.value)}
                  className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${grade === g.value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}>
                  🏫 {g.label} <span className="opacity-70 font-normal text-xs">(80 kanjis · 240 {t(lang, 'study_words')})</span>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">{t(lang, 'vocab_amount')}</label>
              <div className="space-y-2">
                {PACKS.map(p => (
                  <button key={p.value} onClick={() => setPackSize(p.value)}
                    className={`w-full px-4 py-3 rounded-xl border-2 font-semibold text-sm text-left transition-all ${packSize === p.value ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'}`}>
                    {p.label} <span className="opacity-70 font-normal text-xs">{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6 p-4 bg-slate-50 rounded-xl">
            <div className="text-center"><div className="text-2xl font-bold text-indigo-600">{activeKanjis.size}</div><div className="text-xs text-slate-400">{t(lang,'vocab_active')}</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-emerald-600">{state.db.length}</div><div className="text-xs text-slate-400">{t(lang,'vocab_total')}</div></div>
            <div className="text-center"><div className="text-2xl font-bold text-amber-600">{80 - activeKanjis.size}</div><div className="text-xs text-slate-400">{t(lang,'vocab_available')}</div></div>
          </div>
          <button onClick={loadPreview} disabled={loading}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-lg rounded-xl transition shadow-md flex items-center justify-center gap-2">
            {loading ? `⏳ ${t(lang,'vocab_loading')}` : `${t(lang,'vocab_load')} ${packSize} ${t(lang,'vocab_load2')}`}
          </button>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{t(lang,'vocab_preview_title')} — {previewKanjis.length} kanjis</h3>
                <p className="text-slate-400 text-sm">{preview.filter(v => !existingWords.has(v.word)).length} {t(lang,'vocab_preview_new')}</p>
              </div>
              <button onClick={() => setStep('select')} className="text-slate-400 hover:text-slate-600 text-sm underline">{t(lang,'vocab_back')}</button>
            </div>
            <div className="flex gap-3">
              <button onClick={addToStudy} className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition">{t(lang,'vocab_add')}</button>
              <button onClick={loadPreview} disabled={loading} className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition text-sm">{t(lang,'vocab_other')}</button>
            </div>
          </div>
          <div className="space-y-3 max-h-[600px] overflow-y-auto custom-scroll pr-1">
            {Object.entries(grouped).map(([kanji, words]) => (
              <div key={kanji} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-3">
                  <span className="kanji-font text-3xl font-bold text-slate-700">{kanji}</span>
                  <span className="text-xs text-slate-400">{words.length} {t(lang,'study_words')}</span>
                </div>
                <div className="divide-y divide-slate-50">
                  {words.map((w: any) => {
                    const alreadyHas = existingWords.has(w.word)
                    return (
                      <div key={w.word} className={`px-4 py-3 flex items-center gap-4 ${alreadyHas ? 'opacity-40' : ''}`}>
                        <span className="kanji-font text-xl font-bold text-slate-800 w-24">{w.word}</span>
                        <span className="text-indigo-600 font-semibold text-sm w-28">{w.reading}</span>
                        <span className="text-slate-500 text-sm flex-1">{meaning(w)}</span>
                        {alreadyHas && <span className="text-xs text-slate-300 shrink-0">{t(lang,'vocab_already')}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
