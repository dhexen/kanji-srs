'use client'
import Link from 'next/link'
import { useHelp } from '@/lib/help-context'
import { useStore } from '@/lib/store'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'

// ─── Small primitives ─────────────────────────────────────────────────────────

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 rounded-xl text-xs text-violet-700 dark:text-violet-300 leading-relaxed">
      <span className="shrink-0">💡</span>
      <span>{children}</span>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3 items-start">
      <span className="shrink-0 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">{n}</span>
      <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{children}</span>
    </li>
  )
}

function Tag({ color, children }: { color: string; children: React.ReactNode }) {
  return <span className={`inline-block text-[10px] font-bold px-1.5 py-0.5 rounded-full ${color}`}>{children}</span>
}

// ─── Section content ──────────────────────────────────────────────────────────

function HelpReview() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">¿Cómo funciona?</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Cada palabra tiene un <strong>nivel (1-9)</strong>. Al acertar sube; al fallar baja.
          El tiempo de espera hasta el siguiente repaso depende del nivel.
        </p>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px] text-center">
          {[
            ['1-4', 'Aprendiz', 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'],
            ['5-6', 'Gurú', 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300'],
            ['7-9', 'Maestro+', 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300'],
          ].map(([lvl, name, color]) => (
            <div key={lvl as string} className={`rounded-lg p-2 ${color}`}>
              <div className="font-bold">{lvl}</div>
              <div className="opacity-70">{name}</div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Tipos de preguntas</h3>
        <div className="space-y-2">
          {[
            ['Lectura múltiple', 'Ves el kanji, eliges la lectura correcta', 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300'],
            ['Significado', 'Ves el kanji, eliges el significado', 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'],
            ['Escribir lectura', 'Ves el significado, escribes en hiragana', 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'],
            ['Escribir kanji', 'Ves el significado, escribes en papel', 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'],
            ['Inverso', 'Ves el kanji+significado, escribes todo en papel', 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300'],
          ].map(([name, desc, color]) => (
            <div key={name as string} className="flex items-start gap-2.5">
              <Tag color={color as string}>{name}</Tag>
              <span className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">{desc}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 leading-snug">
          Tu selección de tipos de repaso se recuerda y se mantiene hasta que elijas otra.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-snug">
          En opción múltiple, las respuestas incorrectas son palabras parecidas (comparten un kanji, suenan similar o son del mismo tipo) para que elegir bien sea un reto.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Añadir palabras nuevas</h3>
        <ol className="space-y-2">
          <Step n={1}>Pulsa el botón <strong>"+"</strong> en esta página y elige cuántas palabras añadir</Step>
          <Step n={2}>Se abre una <strong>sesión de estudio</strong>: ve pasando las tarjetas para ver el kanji, lectura e imagen de cada palabra</Step>
          <Step n={3}>Al terminar pulsa <strong>"Empezar repaso"</strong> para pasar al SRS, o cierra para hacerlo más tarde</Step>
        </ol>
      </div>

      <Tip>
        Si ya sabes una palabra, pulsa <strong>"Ya me lo sé"</strong> en la tarjeta de repaso.
        Se marca directamente como nivel 8 y no vuelve hasta dentro de 4 meses.
      </Tip>
      <Tip>El botón <strong>🎲 Repaso libre</strong> repasa al azar todo tu vocabulario activo sin presión: no cuenta para el nivel de las palabras.</Tip>
      <Tip>Si dominas casi todas tus palabras y te quedan pocos repasos al día, verás una tarjeta 🌱 que te sugiere añadir vocabulario nuevo. Puedes descartarla.</Tip>
    </div>
  )
}

function HelpVocabulary() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Las tres pestañas</h3>
        <div className="space-y-3">
          {[
            { icon: '📖', label: 'Glosario', desc: 'Busca cualquier palabra del diccionario (por grado, kanji, lectura o significado). Cada palabra lleva su tipo y categoría y un punto de color con tu progreso (verde dominada · amarillo estudiando · gris no iniciada). Toca una palabra para ver su ficha grande con lectura, imagen, orden de trazos, la escritura completa (con todos sus kanji y furigana) y tus niveles, y añadirla a tus repasos.' },
            { icon: '⇄', label: 'Antónimos', desc: 'Parejas de palabras con significado opuesto: alto ↔ bajo, frío ↔ caliente, comprar ↔ vender…' },
            { icon: '動', label: 'Transitivos', desc: 'Verbos clasificados por si tienen objeto directo (他動詞) o no (自動詞). Fundamental en japonés.' },
          ].map(s => (
            <div key={s.label} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <span className="text-xl shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Tip>Las imágenes que ves en los repasos proceden del diccionario. Si ves una incorrecta, usa el 👎 para reportarla.</Tip>
    </div>
  )
}

function HelpGrammar() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Añadir a repasos</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          En la ficha de cada punto gramatical pulsa <strong>"📚 Añadir a repasos"</strong> para incluirlo en tu SRS y verás su nivel actual. Para quitarlo, al final de la ficha hay un enlace <strong>"Quitar de repasos"</strong> que pide confirmación antes de hacerlo.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Cómo practicar</h3>
        <ol className="space-y-2">
          <Step n={1}>Elige un punto gramatical y pulsa <strong>"Practicar"</strong></Step>
          <Step n={2}>Verás la frase japonesa con un <strong>hueco (___)</strong> — escribe solo la gramática que falta</Step>
          <Step n={3}>La traducción está oculta por defecto; pulsa <strong>"Ver traducción"</strong> si la necesitas</Step>
          <Step n={4}>Al fallar verás la respuesta correcta y una nota con la explicación del patrón</Step>
        </ol>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Practicar desde la ficha es solo para entrenar: <strong>no sube de nivel</strong> salvo que la gramática ya esté vencida. El nivel avanza con el <strong>repaso</strong> (solo gramáticas vencidas).
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          Se aceptan la <strong>forma formal y la informal</strong> cuando son la misma estructura (p. ej. …ですか y …). Si el hueco espera una forma educada, verás una etiqueta <strong>🎩 formal</strong> que te indica el registro.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Sección JLPT (en pruebas)</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          En la cabecera de Gramática hay un selector <strong>"Minna no Nihongo / JLPT"</strong>. La sección <strong>JLPT</strong> reúne cientos de puntos por nivel (N5–N1), con explicación ampliada y varios ejemplos, que puedes consultar y practicar.
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          De momento es solo para consultar y practicar: <strong>no cuenta para tu SRS ni tu calendario</strong> de repasos.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Esquema de conjugación</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          La ficha de cada punto puede mostrar, bajo la explicación, un esquema en dos tablas: <strong>Cómo se usa</strong> (a qué se une: verbo, adjetivo い/な, sustantivo) y <strong>Formas</strong> (no pasado, negativo, pasado, forma て…), con las etiquetas en tu idioma.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">El banco compartido de frases</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Las frases generadas por la IA se <strong>comparten entre todos los usuarios</strong>.
          Si alguien ya generó frases para ese punto, puedes usarlas sin necesitar API Key propia.
        </p>
        <div className="mt-2 flex gap-2 flex-wrap">
          <Tag color="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">✓ Validada por profesor</Tag>
          <Tag color="bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300">🌐 Compartida</Tag>
          <Tag color="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">IA</Tag>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">Las validadas (✓) aparecen primero, son las más fiables.</p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">El repaso SRS de gramática</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Solo se repasan las gramáticas <strong>vencidas</strong> (las que toca según su nivel). Si ninguna está vencida, no podrás empezar el repaso todavía. Al pulsar <strong>"▶ Empezar repaso"</strong> verás una lista con casillas (todas marcadas) para elegir cuáles, con un botón <strong>"✨ Generar"</strong> por fila y dos opciones globales (WaniKani y frases de la comunidad).
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2">
          El repaso es continuo: <strong>una frase por gramática</strong>, sin pantallas intermedias. Al final ves un resumen con aciertos, fallos y el nivel de cada gramática (↑/↓). Si fallas una, vuelve a salir al final.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Vocabulario WaniKani en los ejemplos</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Si tienes configurada tu API Key de WaniKani, aparece el checkbox <strong>"Usar vocabulario WaniKani"</strong> en los ejemplos del detalle y en la práctica. La IA usará también palabras de tu progreso en WaniKani al generar las frases.
        </p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Reportar una frase incorrecta</h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          Si crees que una frase está mal construida, pulsa el enlace <strong>🚩 Reportar error en esta frase</strong> que aparece debajo de la respuesta. El administrador recibirá el reporte y podrá revisarla.
        </p>
      </div>

      <Tip>Usa el filtro <strong>"📚 Estudiando"</strong> para ver solo los puntos que tienes activos en tu SRS.</Tip>
      <Tip>El botón <strong>🎲 Repaso libre</strong> te deja elegir lecciones (de lo que estudias) y repasar sin afectar a los niveles: 2-3 frases por punto en orden aleatorio. De vez en cuando, al azar, te pide escribir entera una frase que ya viste antes; se compara con la original y, si fallas, te marca el error.</Tip>
      <Tip>Si dominas casi toda la gramática que estudias y tienes pocos repasos próximos, aparece una tarjeta 🌱 sugiriéndote añadir más puntos. Es descartable.</Tip>
      <Tip>En la lista, cada punto muestra tu nivel y tiene un botón <strong>➕</strong> para añadirlo a repasos sin entrar. Durante el repaso, el botón <strong>💡 Pista</strong> te va revelando la respuesta letra a letra si dudas qué forma se espera.</Tip>
    </div>
  )
}

function HelpKana() {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Los dos silabarios</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800/50 rounded-xl text-center">
            <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">あ</p>
            <p className="text-xs font-bold text-violet-800 dark:text-violet-200 mt-1">Hiragana</p>
            <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5">46 caracteres básicos. Palabras nativas y conjugaciones.</p>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800/50 rounded-xl text-center">
            <p className="text-2xl font-bold text-sky-700 dark:text-sky-300">ア</p>
            <p className="text-xs font-bold text-sky-800 dark:text-sky-200 mt-1">Katakana</p>
            <p className="text-[11px] text-sky-600 dark:text-sky-400 mt-0.5">46 caracteres. Palabras extranjeras y onomatopeyas.</p>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Dos modos</h3>
        <div className="space-y-2">
          <div className="flex gap-2.5 items-center">
            <span className="text-lg">📖</span>
            <div><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Aprender</p><p className="text-xs text-slate-500 dark:text-slate-400">Tarjetas con imagen mnemotécnica para memorizar cada carácter</p></div>
          </div>
          <div className="flex gap-2.5 items-center">
            <span className="text-lg">✏️</span>
            <div><p className="text-xs font-bold text-slate-800 dark:text-slate-100">Test</p><p className="text-xs text-slate-500 dark:text-slate-400">Ejercicios cronometrados para comprobar que los recuerdas</p></div>
          </div>
        </div>
      </div>
      <Tip>Aprende primero el <strong>hiragana</strong> completo. El katakana tiene los mismos sonidos, solo cambia la forma.</Tip>
    </div>
  )
}

function HelpContext() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Esta sección genera <strong>textos de lectura en japonés</strong> adaptados a tu nivel actual,
        usando las palabras que ya dominas como base.
      </p>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Cómo usarlo</h3>
        <ol className="space-y-2">
          <Step n={1}>Configura el tema o contexto del texto que quieres leer</Step>
          <Step n={2}>Pulsa <strong>"Generar"</strong> para que la IA cree el texto</Step>
          <Step n={3}>Lee el texto con furigana (lectura en hiragana sobre los kanji)</Step>
          <Step n={4}>Los últimos 10 textos se guardan para revisarlos más tarde</Step>
        </ol>
      </div>
      <Tip>Necesitas tener vocabulario activo en tus repasos para que los textos sean relevantes a tu nivel.</Tip>
      <Tip>Con las casillas <strong>"Incluir vocabulario"</strong> y <strong>"Incluir vocabulario de WaniKani"</strong> eliges la fuente: marca las dos para mezclarlas, o solo una para usar únicamente ese vocabulario. El vocabulario de WaniKani (formal/técnico/antiguo) se usa solo cuando encaja en el contexto.</Tip>
      <Tip>Según el tema elegido, se priorizan las palabras cuya categoría encaja con él. El vocabulario de WaniKani se clasifica al sincronizar; si lo importaste antes, pulsa <strong>"Clasificar vocabulario de WaniKani"</strong> en Mi Perfil → Cuenta para clasificar lo que falte.</Tip>
    </div>
  )
}

function HelpStats() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Accede a tu perfil pulsando tu <strong>avatar</strong> en la esquina superior derecha: se despliega un menú con las pestañas y la opción de cerrar sesión.
      </p>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Las pestañas</h3>
        <div className="space-y-2.5">
          {[
            { icon: '📊', label: 'Estadísticas', desc: 'Distribución de niveles SRS, racha de estudio, pronóstico de repasos para los próximos 7 días' },
            { icon: '⭐', label: 'Progresión', desc: 'XP acumulado, nivel estimado de JLPT, niveles separados para vocabulario y gramática' },
            { icon: '⚙️', label: 'Configuración', desc: 'API Keys de Gemini y WaniKani, elección del modelo de Gemini (2.5 Flash o 3.1 Flash Lite), idioma de la interfaz, toggle de oraciones compartidas' },
            { icon: '👤', label: 'Cuenta', desc: 'Copias de seguridad del progreso, sincronización y clasificación del vocabulario de WaniKani, cerrar sesión' },
          ].map(s => (
            <div key={s.label} className="flex gap-2.5">
              <span className="text-lg shrink-0">{s.icon}</span>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{s.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Tip>
        Para practicar gramática sin límites, añade tu <strong>API Key de Gemini</strong> (gratuita en aistudio.google.com) en la pestaña Configuración.
      </Tip>
    </div>
  )
}

function HelpProgress() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Vista detallada de <strong>todas tus palabras activas</strong> con su nivel SRS por modo
        y fecha del próximo repaso.
      </p>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Filtros disponibles</h3>
        <div className="flex flex-wrap gap-1.5">
          {['Por nivel SRS', 'Por modo', 'Búsqueda de texto', 'Solo vencidas hoy', 'Solo sin repasar'].map(f => (
            <Tag key={f} color="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">{f}</Tag>
          ))}
        </div>
      </div>
      <Tip>Usa el filtro <strong>"Solo vencidas hoy"</strong> para ver rápidamente qué toca repasar ahora mismo.</Tip>
    </div>
  )
}

function HelpStudy() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Aquí aparecen las palabras en estado <strong>"bloqueado"</strong> que aún no has activado
        para el repaso. Estudiarlas aquí las activa para el SRS.
      </p>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Cómo estudiar una palabra</h3>
        <ol className="space-y-2">
          <Step n={1}>Observa el kanji, la lectura y el significado</Step>
          <Step n={2}>Mira la imagen si tiene una</Step>
          <Step n={3}>Cuando la hayas memorizado, pulsa <strong>"Activar"</strong></Step>
          <Step n={4}>La palabra pasa al pool de repasos SRS</Step>
        </ol>
      </div>
      <Tip>No actives demasiadas palabras a la vez. 5-10 al día es un ritmo cómodo y sostenible.</Tip>
    </div>
  )
}

function HelpImport() {
  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Importa vocabulario japonés describiendo un tema en lenguaje natural.
        La IA busca palabras relevantes del currículo escolar.
      </p>
      <div>
        <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2.5">Cómo usarlo</h3>
        <ol className="space-y-2">
          <Step n={1}>Describe el vocabulario que buscas (ej: "palabras de cocina", "verbos de movimiento")</Step>
          <Step n={2}>La IA genera una lista de palabras del diccionario oficial</Step>
          <Step n={3}>Revisa la lista y confirma qué palabras importar</Step>
          <Step n={4}>Las palabras se añaden a tu vocabulario activo</Step>
        </ol>
      </div>
      <Tip>Necesitas tener tu <strong>API Key de Gemini</strong> configurada en Mi Perfil → Configuración para usar esta función.</Tip>
    </div>
  )
}

function HelpDefault() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        Bienvenido a <strong>Kanji SRS</strong>. Navega por las secciones del menú lateral
        para aprender vocabulario y gramática japonesa con repetición espaciada e IA.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {[
          ['📝', 'Mis Repasos', '/review'],
          ['📚', 'Vocabulario', '/vocabulary'],
          ['📖', 'Gramática', '/grammar'],
          ['🔤', 'Kana', '/kana'],
        ].map(([icon, label, href]) => (
          <Link key={href as string} href={href as string}
            className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors">
            <span className="text-lg">{icon}</span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{label as string}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const SECTION_CONTENT: Record<string, { icon: string; title: string; component: React.ComponentType }> = {
  review:     { icon: '📝', title: 'Mis Repasos',      component: HelpReview },
  vocabulary: { icon: '📚', title: 'Vocabulario',       component: HelpVocabulary },
  grammar:    { icon: '📖', title: 'Gramática',         component: HelpGrammar },
  kana:       { icon: '🔤', title: 'Kana',              component: HelpKana },
  context:    { icon: '💬', title: 'Lecturas IA',       component: HelpContext },
  stats:      { icon: '👤', title: 'Mi Perfil',         component: HelpStats },
  progress:   { icon: '📈', title: 'Progreso',          component: HelpProgress },
  study:      { icon: '📗', title: 'Estudiar',          component: HelpStudy },
  import:     { icon: '⚡', title: 'Importar',          component: HelpImport },
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export default function HelpDrawer() {
  const { isOpen, section, close } = useHelp()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return null

  const meta = SECTION_CONTENT[section]
  const ContentComponent = meta?.component ?? HelpDefault

  return createPortal(
    <>
      {/* Backdrop (mobile) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Drawer panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-80 z-50',
          'bg-white dark:bg-slate-900',
          'border-l border-slate-200 dark:border-slate-700',
          'shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        aria-label="Ayuda contextual"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{meta?.icon ?? '❓'}</span>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {meta?.title ?? 'Ayuda'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Guía de uso</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/guia-usuario"
              target="_blank"
              className="flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 hover:underline"
              title="Ver guía completa"
            >
              <span>📄</span>
              <span className="hidden sm:inline">Guía completa</span>
            </Link>
            <button
              type="button"
              onClick={close}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Cerrar ayuda"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 custom-scroll">
          <ContentComponent />
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Este panel se muestra una vez por sección
          </p>
          <Link
            href="/guia-usuario"
            target="_blank"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-[11px] font-semibold rounded-lg transition"
          >
            📄 Guía completa
          </Link>
        </div>
      </div>
    </>,
    document.body,
  )
}
