'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'
import VocabGlossary from './VocabGlossary'
import VocabAntonyms from './VocabAntonyms'
import VocabTransitivity from './VocabTransitivity'

type VocabTab = 'glossary' | 'antonyms' | 'transitivity'

export default function VocabularyClient() {
  const { state } = useStore()
  const lang = state.lang
  const [tab, setTab] = useState<VocabTab>('glossary')

  const tl = (key: string) => t(lang as Parameters<typeof t>[0], key as Parameters<typeof t>[1])

  const TABS: { key: VocabTab; icon: string; label: string }[] = [
    { key: 'glossary',     icon: '📖', label: tl('vocab_tab_glossary') },
    { key: 'antonyms',     icon: '⇄',  label: tl('vocab_tab_antonyms') },
    { key: 'transitivity', icon: '動',  label: tl('vocab_tab_transitivity') },
  ]

  return (
    <div className="space-y-4">
      {/* Back to dashboard */}
      <Link href="/review" className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors">
        ← Dashboard
      </Link>

      {/* Tab bar */}
      <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-800/60 rounded-xl p-1">
        {TABS.map(({ key, icon, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            <span className="text-base">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'glossary'     && <VocabGlossary />}
      {tab === 'antonyms'     && <VocabAntonyms />}
      {tab === 'transitivity' && <VocabTransitivity />}
    </div>
  )
}
