'use client'
import { pickLabel, type GrammarScheme } from '@/lib/grammar-srs'

const TITLES = {
  use:   { es: 'Cómo se usa', ca: 'Com s’usa', en: 'How to use' },
  forms: { es: 'Formas', ca: 'Formes', en: 'Forms' },
}

function title(key: keyof typeof TITLES, lang: string): string {
  const t = TITLES[key]
  return lang === 'ca' ? t.ca : lang === 'en' ? t.en : t.es
}

/** Renders a grammar point's conjugation/usage scheme as two small tables. */
export default function GrammarSchemeView({ scheme, lang }: { scheme: GrammarScheme; lang: string }) {
  const hasFormation = scheme.formation.length > 0
  const hasConjugations = scheme.conjugations.length > 0
  if (!hasFormation && !hasConjugations) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {hasFormation && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{title('use', lang)}</p>
          <table className="w-full text-sm">
            <tbody>
              {scheme.formation.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400 align-top whitespace-nowrap">{pickLabel(row.type, lang)}</td>
                  <td className="py-1.5 text-right">
                    <span className="kanji-font font-semibold text-slate-800 dark:text-slate-100">{row.pattern}</span>
                    {row.example && <span className="block text-[11px] text-slate-400 dark:text-slate-500 kanji-font">{row.example}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hasConjugations && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">{title('forms', lang)}</p>
          <table className="w-full text-sm">
            <tbody>
              {scheme.conjugations.map((row, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                  <td className="py-1.5 pr-3 text-slate-500 dark:text-slate-400 align-top whitespace-nowrap">{pickLabel(row.form, lang)}</td>
                  <td className="py-1.5 text-right">
                    <span className="kanji-font font-semibold text-slate-800 dark:text-slate-100">{row.pattern}</span>
                    {row.reading && row.reading !== row.pattern && (
                      <span className="block text-[11px] text-slate-400 dark:text-slate-500">{row.reading}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
