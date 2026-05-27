'use client'
import { useState } from 'react'
import KanaLearn from './KanaLearn'
import KanaTest from './KanaTest'

type Script = 'hiragana' | 'katakana'
type Tab = 'learn' | 'test'

export default function KanaClient() {
  const [script, setScript] = useState<Script>('hiragana')
  const [tab, setTab] = useState<Tab>('learn')

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-violet-700 dark:text-violet-400 flex items-center gap-2">
          <span>🔤</span> Hiragana & Katakana
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Aprende los dos silabarios japoneses con nemotécnica visual y pon a prueba tus conocimientos.
        </p>
      </div>

      {/* Script switcher */}
      <div className="flex gap-2">
        {(['hiragana', 'katakana'] as Script[]).map(s => (
          <button
            key={s}
            onClick={() => setScript(s)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all border ${
              script === s
                ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-violet-200 dark:border-slate-700 hover:border-violet-400 hover:text-violet-600 dark:hover:text-violet-300'
            }`}
          >
            {s === 'hiragana' ? 'あ Hiragana' : 'ア Katakana'}
          </button>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-violet-50 dark:bg-slate-800 rounded-xl p-1 w-fit">
        {([['learn','📖 Aprender'],['test','🎯 Test']] as [Tab, string][]).map(([t, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t
                ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'learn'
        ? <KanaLearn script={script} />
        : <KanaTest  script={script} />
      }
    </div>
  )
}
