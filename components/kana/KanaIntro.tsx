'use client'
import { useState } from 'react'

/**
 * Beginner-friendly intro to the Japanese writing system, shown at the top of
 * the kana section. Collapsible; the collapsed state is remembered.
 */
export default function KanaIntro() {
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem('kana_intro_collapsed') !== '1' }
    catch { return true }
  })
  const toggle = () => {
    setOpen(o => {
      const next = !o
      try { localStorage.setItem('kana_intro_collapsed', next ? '0' : '1') } catch { /* incognito */ }
      return next
    })
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-violet-100 dark:border-slate-700 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-violet-50/50 dark:hover:bg-slate-700/40 transition"
      >
        <span className="text-sm font-bold text-violet-700 dark:text-violet-300">
          📖 ¿Cómo funciona la escritura japonesa?
        </span>
        <span className={`text-violet-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-1 space-y-4 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            El japonés se escribe combinando <strong>tres sistemas</strong>. No te agobies: para empezar
            solo necesitas el primero. Esta sección te enseña a leerlos.
          </p>

          <div className="space-y-3">
            <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 p-3">
              <p className="font-bold text-violet-800 dark:text-violet-200">
                <span className="kanji-font">ひらがな</span> · Hiragana
              </p>
              <p className="mt-1">
                El silabario básico. Cada símbolo es una <strong>sílaba</strong> (<span className="kanji-font">か</span> = <em>ka</em>).
                Se usa para palabras japonesas, las <strong>partículas</strong> gramaticales y las
                <strong> terminaciones</strong> de verbos y adjetivos. <strong>Es lo primero que debes aprender.</strong>
              </p>
            </div>

            <div className="rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 p-3">
              <p className="font-bold text-sky-800 dark:text-sky-200">
                <span className="kanji-font">カタカナ</span> · Katakana
              </p>
              <p className="mt-1">
                Los <strong>mismos sonidos</strong> que el hiragana, pero con otra forma. Se usa sobre todo para
                <strong> palabras extranjeras</strong> y nombres (<span className="kanji-font">コーヒー</span> <em>kōhī</em> = café),
                onomatopeyas y énfasis.
              </p>
            </div>

            <div className="rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800/50 p-3">
              <p className="font-bold text-rose-800 dark:text-rose-200">
                <span className="kanji-font">漢字</span> · Kanji
              </p>
              <p className="mt-1">
                Caracteres de origen chino que representan <strong>significados</strong>, no sonidos
                (<span className="kanji-font">食</span> = comer). Cada kanji puede leerse de varias formas y
                aporta el significado de las palabras. Se aprenden poco a poco con el vocabulario.
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-600 p-4">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Cómo se forma una frase</p>
            <p className="kanji-font text-xl text-center text-slate-800 dark:text-slate-100">
              <span className="text-rose-600 dark:text-rose-400">私</span>
              <span className="text-violet-600 dark:text-violet-400">は</span>
              <span className="text-sky-600 dark:text-sky-400">パン</span>
              <span className="text-violet-600 dark:text-violet-400">を</span>
              <span className="text-rose-600 dark:text-rose-400">食</span>
              <span className="text-violet-600 dark:text-violet-400">べます</span>
              。
            </p>
            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-1">«Yo como pan.»</p>
            <ul className="mt-3 space-y-1 text-xs">
              <li><span className="text-rose-600 dark:text-rose-400 font-bold kanji-font">私</span> · <span className="text-rose-600 dark:text-rose-400 font-bold kanji-font">食</span> — <strong>kanji</strong>: el significado (yo, comer)</li>
              <li><span className="text-violet-600 dark:text-violet-400 font-bold kanji-font">は を べます</span> — <strong>hiragana</strong>: partículas y conjugación</li>
              <li><span className="text-sky-600 dark:text-sky-400 font-bold kanji-font">パン</span> — <strong>katakana</strong>: palabra extranjera (del portugués «pão»)</li>
            </ul>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            💡 <strong>Por dónde empezar:</strong> aprende primero el <strong>hiragana</strong>, luego el <strong>katakana</strong>.
            Cuando puedas leerlos, ya podrás empezar con el vocabulario y los kanji.
          </p>
        </div>
      )}
    </div>
  )
}
