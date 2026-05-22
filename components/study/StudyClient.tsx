'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

export default function StudyClient() {
  const { state, dispatch } = useStore()
  const [form, setForm] = useState({ kanji: '', jp: '', reading: '', meaning: '' })
  const lang = state.lang

  const locked = state.db.filter(i => i.status === 'locked')
  const groups: Record<string, VocabItem[]> = {}
  locked.forEach(item => {
    if (!groups[item.kanji]) groups[item.kanji] = []
    groups[item.kanji].push(item)
  })

  function addManual() {
    const { kanji, jp, reading, meaning } = form
    if (!kanji || !jp || !reading || !meaning) { showToast('Error', 'error'); return }
    if (state.db.some(d => d.jp === jp)) { showToast('Error', 'error'); return }
    dispatch({ type: 'ADD_ITEMS', payload: [{ kanji, jp, reading, meaning, srsLevel: 0, due: 0, status: 'locked' }] })
    setForm({ kanji: '', jp: '', reading: '', meaning: '' })
    showToast('OK', 'success')
  }

  function activateAll() {
    const now = Date.now()
    const updated = state.db.map(item => {
      if (item.status !== 'locked') return item
      const act: VocabItem = { ...item, status: 'active', srsLevel: 1, due: now }
      Object.values(MODE_CONFIG).forEach(cfg => { (act as any)[cfg.key + '_level'] = 1; (act as any)[cfg.key + '_due'] = now })
      return migrateItem(act)
    })
    dispatch({ type: 'SET_DB', payload: updated })
    showToast(`${locked.length} ${t(lang, 'study_words')}`, 'success')
  }

  function skipKanji(kanjiChar: string) {
    const far = Date.now() + 365 * 10 * 24 * 60 * 60 * 1000
    const updated = state.db.map(item => {
      if (item.kanji !== kanjiChar || item.status !== 'locked') return item
      const upd: VocabItem = { ...item, status: 'active', srsLevel: 7, due: far }
      Object.values(MODE_CONFIG).forEach(cfg => { (upd as any)[cfg.key + '_level'] = 7; (upd as any)[cfg.key + '_due'] = far })
      return upd
    })
    dispatch({ type: 'SET_DB', payload: updated })
    showToast(kanjiChar, 'success')
  }

  const meaning = (item: VocabItem) =>
    lang === 'ca' && (item as any).meaning_ca ? (item as any).meaning_ca
    : lang === 'en' && (item as any).meaning_en ? (item as any).meaning_en
    : item.meaning

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-bold text-slate-800 mb-3">{t(lang, 'study_add_title')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {(['kanji', 'jp', 'reading', 'meaning'] as const).map(field => (
            <input key={field} type="text" autoComplete="off" value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={{ kanji: t(lang,'study_kanji_ph'), jp: t(lang,'study_word_ph'), reading: t(lang,'study_reading_ph'), meaning: t(lang,'study_meaning_ph') }[field]}
              className="px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500" />
          ))}
        </div>
        <button onClick={addManual} className="mt-3 px-4 py-2.5 bg-indigo-600 text-white font-bold rounded-xl text-sm hover:bg-indigo-700 transition">
          {t(lang, 'study_add_btn')}
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">{t(lang, 'study_locked_title')}</h2>
        <p className="text-slate-500 text-sm mb-6">{t(lang, 'study_locked_sub')}</p>
        <div className="space-y-6 max-h-[500px] overflow-y-auto custom-scroll pr-2">
          {Object.keys(groups).length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-4xl mb-2">🎓</p>
              <p className="font-bold text-slate-700">{t(lang, 'study_empty')}</p>
              <p className="text-slate-500 text-sm">{t(lang, 'study_empty_sub')}</p>
            </div>
          ) : Object.entries(groups).map(([kanjiChar, words]) => (
            <div key={kanjiChar} className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="kanji-font text-3xl font-bold text-slate-700">{kanjiChar}</span>
                  <span className="text-xs text-slate-400">{words.length} {t(lang, 'study_words')}</span>
                </div>
                <button onClick={() => skipKanji(kanjiChar)} className="text-xs text-slate-400 hover:text-indigo-600 transition">{t(lang, 'study_skip')}</button>
              </div>
              <div className="divide-y divide-slate-50">
                {words.map(w => (
                  <div key={w.jp} className="px-4 py-3 flex items-center gap-4">
                    <span className="kanji-font text-xl font-bold text-slate-800 w-20">{w.jp}</span>
                    <span className="text-indigo-600 font-semibold text-sm w-24">{w.reading}</span>
                    <span className="text-slate-500 text-sm">{meaning(w)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {locked.length > 0 && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <button onClick={activateAll} className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-xl transition shadow-md">
              {t(lang, 'study_activate')} ({locked.length})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
