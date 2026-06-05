'use client'
import { useState } from 'react'
import { useStore } from '@/lib/store'
import { VocabItem, MODE_CONFIG, migrateItem, getMeaningForLang } from '@/lib/srs'
import { showToast } from '@/components/ui/Toast'
import { t } from '@/lib/i18n'

function activateItem(item: VocabItem, level: number, due: number): VocabItem {
  // Per-mode levels start at 0 for new words (level ≤ 1) so the first correct
  // answer brings them to level 1, not level 2. Words explicitly mastered
  // (level > 1, e.g. "Ya me la sé") keep the given level.
  const perModeLevel = level > 1 ? level : 0
  const upd: VocabItem = { ...item, status: 'active', srsLevel: level, due }
  Object.values(MODE_CONFIG).forEach(cfg => {
    const row = upd as unknown as Record<string, number>
    row[`${cfg.key}_level`] = perModeLevel
    row[`${cfg.key}_due`] = due
  })
  return migrateItem(upd)
}

export default function StudyClient() {
  const { state, addVocabItems, saveVocabDb } = useStore()
  const [form, setForm] = useState({ kanji: '', jp: '', reading: '', meaning: '' })
  const [showManual, setShowManual] = useState(false)
  const lang = state.lang

  const locked = state.db.filter(i => i.status === 'locked')
  const groups: Record<string, VocabItem[]> = {}
  locked.forEach(item => {
    if (!groups[item.kanji]) groups[item.kanji] = []
    groups[item.kanji].push(item)
  })
  const kanjiEntries = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b, 'ja'))
  const kanjiCount = kanjiEntries.length

  async function addManual() {
    const { kanji, jp, reading, meaning } = form
    if (!kanji || !jp || !reading || !meaning) { showToast('Error', 'error'); return }
    if (state.db.some(d => d.jp === jp)) { showToast('Error', 'error'); return }
    try {
      await addVocabItems([{ kanji, jp, reading, meaning, srsLevel: 0, due: 0, status: 'locked' }])
      setForm({ kanji: '', jp: '', reading: '', meaning: '' })
      showToast('OK', 'success')
    } catch { /* toast en store */ }
  }

  async function persistDb(updated: VocabItem[]) {
    try {
      await saveVocabDb(updated)
    } catch { /* toast en store */ }
  }

  async function markWordKnown(jp: string) {
    const far = Date.now() + 365 * 10 * 24 * 60 * 60 * 1000
    const updated = state.db.map(item =>
      item.jp !== jp || item.status !== 'locked' ? item : activateItem(item, 7, far),
    )
    await persistDb(updated)
    showToast(t(lang, 'study_known_btn'), 'success')
  }

  async function masterKanji(kanjiChar: string) {
    const far = Date.now() + 365 * 10 * 24 * 60 * 60 * 1000
    const updated = state.db.map(item =>
      item.kanji !== kanjiChar || item.status !== 'locked' ? item : activateItem(item, 7, far),
    )
    await persistDb(updated)
    showToast(`${t(lang, 'study_master_kanji')}: ${kanjiChar}`, 'success')
  }

  async function activateAll() {
    const now = Date.now()
    const updated = state.db.map(item =>
      item.status !== 'locked' ? item : activateItem(item, 1, now),
    )
    await persistDb(updated)
    showToast(`${locked.length} ${t(lang, 'study_words')}`, 'success')
  }

  return (
    <div className="space-y-6">
      {kanjiCount === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
          <p className="text-4xl mb-2">🎓</p>
          <p className="font-bold text-slate-800 text-lg">{t(lang, 'study_empty')}</p>
          <p className="text-slate-500 text-sm mt-1">{t(lang, 'study_empty_sub')}</p>
        </div>
      ) : (
        <div className="space-y-5 overflow-visible">
          <div className="sticky top-0 z-20 -mx-4 px-4 py-3 bg-slate-50/95 backdrop-blur-sm border-y border-slate-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700">
                {t(lang, 'study_pending_bar')
                  .replace('{words}', String(locked.length))
                  .replace('{kanjis}', String(kanjiCount))}
              </p>
              <button
                type="button"
                onClick={activateAll}
                className="shrink-0 w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm text-sm"
              >
                {t(lang, 'study_activate_short')} ({locked.length})
              </button>
            </div>
          </div>

          {kanjiEntries.map(([kanjiChar, words]) => (
            <section
              key={kanjiChar}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 md:p-6 space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 shrink-0 rounded-xl bg-violet-100 border border-violet-200/80 flex items-center justify-center">
                    <span className="kanji-font text-3xl font-bold text-violet-700 leading-none">
                      {kanjiChar}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-slate-800">
                      {t(lang, 'study_kanji_label')} {kanjiChar}
                    </h2>
                    <p className="text-sm text-slate-500">{t(lang, 'study_keywords_sub')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => masterKanji(kanjiChar)}
                  className="shrink-0 px-4 py-2.5 rounded-xl bg-violet-100 hover:bg-violet-200 text-violet-800 font-semibold text-sm border border-violet-200/80 transition"
                >
                  🎓 {t(lang, 'study_master_kanji')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {words.map(w => (
                  <article
                    key={w.jp}
                    className="flex flex-col rounded-xl border border-slate-200 bg-slate-50/50 p-4 min-h-[140px]"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="kanji-font text-2xl font-bold text-slate-900 leading-tight">{w.jp}</p>
                      <p className="text-violet-600 font-medium text-sm">{w.reading}</p>
                      <p className="text-slate-500 text-sm leading-snug">{getMeaningForLang(w, lang)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => markWordKnown(w.jp)}
                      className="mt-4 w-full py-2 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-sm border border-emerald-200/80 transition flex items-center justify-center gap-1.5"
                    >
                      <span aria-hidden>✓</span>
                      {t(lang, 'study_known_btn')}
                    </button>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

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
