'use client'
import { useStore } from '@/lib/store'
import { t } from '@/lib/i18n'

interface Props { onBack: () => void; isPractice: boolean; total: number }
export default function SessionComplete({ onBack, isPractice, total }: Props) {
  const { state } = useStore()
  const lang = state.lang
  return (
    <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-100 text-center">
      <div className="text-6xl mb-4">🏆</div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{t(lang, 'review_complete_title')}</h2>
      <p className="text-slate-500 mb-6">
        {isPractice ? t(lang, 'review_complete_practice') : t(lang, 'review_complete_srs')} {total} {t(lang, 'review_complete_cards')}
      </p>
      <button onClick={onBack} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-md">
        {t(lang, 'review_complete_back')}
      </button>
    </div>
  )
}
