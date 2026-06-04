'use client'
import { useState } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Step { n: number; text: string }
interface FaqItem { q: string; a: string }

// ─── Small helpers ────────────────────────────────────────────────────────────
function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {children}
    </span>
  )
}

function SectionTitle({ icon, title, subtitle, id }: { icon: string; title: string; subtitle?: string; id: string }) {
  return (
    <div id={id} className="flex items-start gap-3 mb-5">
      <span className="text-3xl shrink-0 leading-none mt-0.5 print:text-2xl">{icon}</span>
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 leading-tight print:text-xl">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function SubSection({ icon, title, children, accent = 'violet' }: {
  icon: string; title: string; children: React.ReactNode; accent?: string
}) {
  const border: Record<string, string> = {
    violet: 'border-l-violet-400',
    amber:  'border-l-amber-400',
    emerald:'border-l-emerald-400',
    sky:    'border-l-sky-400',
    rose:   'border-l-rose-400',
  }
  return (
    <div className={`border-l-4 ${border[accent] ?? border.violet} pl-4 mb-5`}>
      <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2 print:text-sm">
        <span>{icon}</span>{title}
      </h3>
      <div className="text-sm text-slate-600 leading-relaxed space-y-2">{children}</div>
    </div>
  )
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-2.5 mt-2">
      {steps.map(s => (
        <li key={s.n} className="flex items-start gap-3">
          <span className="shrink-0 w-6 h-6 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center mt-0.5">
            {s.n}
          </span>
          <p className="text-sm text-slate-700 leading-snug">{s.text}</p>
        </li>
      ))}
    </ol>
  )
}

function InfoBox({ color, icon, children }: { color: string; icon: string; children: React.ReactNode }) {
  const styles: Record<string, string> = {
    violet: 'bg-violet-50 border-violet-200 text-violet-800',
    amber:  'bg-amber-50 border-amber-200 text-amber-800',
    emerald:'bg-emerald-50 border-emerald-200 text-emerald-800',
    sky:    'bg-sky-50 border-sky-200 text-sky-800',
  }
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-sm ${styles[color] ?? styles.violet}`}>
      <span className="text-lg shrink-0">{icon}</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

function SrsLevelTable() {
  const rows = [
    { level: 1, name: 'Aprendiz 1', time: '4 horas',   color: 'bg-rose-100 text-rose-700' },
    { level: 2, name: 'Aprendiz 2', time: '8 horas',   color: 'bg-rose-100 text-rose-700' },
    { level: 3, name: 'Aprendiz 3', time: '1 día',     color: 'bg-orange-100 text-orange-700' },
    { level: 4, name: 'Aprendiz 4', time: '2 días',    color: 'bg-orange-100 text-orange-700' },
    { level: 5, name: 'Gurú 1',     time: '1 semana',  color: 'bg-violet-100 text-violet-700' },
    { level: 6, name: 'Gurú 2',     time: '2 semanas', color: 'bg-violet-100 text-violet-700' },
    { level: 7, name: 'Maestro',    time: '1 mes',     color: 'bg-blue-100 text-blue-700' },
    { level: 8, name: 'Iluminado',  time: '4 meses',   color: 'bg-indigo-100 text-indigo-700' },
    { level: 9, name: 'Quemado 🔥', time: 'Nunca más', color: 'bg-slate-200 text-slate-600' },
  ]
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Nivel</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Nombre</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Siguiente repaso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.level} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${r.color}`}>{r.level}</span>
              </td>
              <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
              <td className="px-4 py-2.5 text-slate-500">{r.time}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ModeTable() {
  const rows = [
    { mode: 'Lectura múltiple', desc: 'Ves el kanji, eliges la lectura correcta entre varias opciones', input: 'Botones' },
    { mode: 'Significado',       desc: 'Ves el kanji, eliges el significado correcto entre varias opciones', input: 'Botones' },
    { mode: 'Escribir lectura',  desc: 'Ves el significado, escribes la lectura en hiragana', input: 'Teclado' },
    { mode: 'Escribir kanji',    desc: 'Ves el significado, escribes el kanji en papel', input: 'Papel' },
    { mode: 'Inverso',           desc: 'Ves el kanji y su significado, escribes todo en papel', input: 'Papel' },
  ]
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Modo</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Qué pide</th>
            <th className="text-left px-3 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Cómo responder</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.mode} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2.5 font-semibold text-violet-700 whitespace-nowrap">{r.mode}</td>
              <td className="px-3 py-2.5 text-slate-600">{r.desc}</td>
              <td className="px-3 py-2.5">
                <Badge color={r.input === 'Papel' ? 'bg-amber-100 text-amber-700' : r.input === 'Teclado' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}>
                  {r.input}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GlossaryTable() {
  const rows = [
    ['Kanji', 'Caracteres de escritura japonesa de origen chino (ej: 食, 水, 山).'],
    ['Hiragana', 'Silabario japonés básico de 46 caracteres (ej: あいうえお). Se usa para conjugaciones y palabras nativas.'],
    ['Katakana', 'Segundo silabario japonés de 46 caracteres (ej: アイウエオ). Se usa para palabras extranjeras.'],
    ['Furigana', 'Pequeños caracteres en hiragana escritos encima de los kanji para mostrar su pronunciación.'],
    ['SRS', 'Spaced Repetition System. Método que programa los repasos exactamente cuando estás a punto de olvidar algo.'],
    ['JLPT', 'Japanese Language Proficiency Test. El examen oficial de japonés más reconocido. Tiene 5 niveles: N5 (básico) a N1 (avanzado).'],
    ['Fill-in-the-blank', 'Ejercicio de rellenar un hueco en una frase. Usado en la sección de Gramática.'],
    ['API Key', 'Una contraseña especial que te da acceso a servicios externos como Google Gemini o WaniKani.'],
    ['WaniKani', 'Aplicación externa de pago para aprender kanji. Esta app puede importar tu progreso de WaniKani.'],
    ['XP', 'Puntos de experiencia que ganas al practicar. Sirven para subir de nivel.'],
    ['Snapshot', 'Copia de seguridad de tu progreso guardada en la nube en un momento concreto.'],
    ['Pool de oraciones', 'Banco de frases de práctica compartidas entre todos los usuarios de la app.'],
    ['Validada ✓', 'Frase de gramática revisada y aprobada por un administrador o colaborador (profesor).'],
    ['Quemado 🔥', 'Nivel máximo (9). La app ya no te pide esa palabra porque la consideras dominada.'],
    ['他動詞', 'Verbo transitivo: tiene objeto directo (ej: "comer algo", "abrir la puerta").'],
    ['自動詞', 'Verbo intransitivo: no tiene objeto directo (ej: "correr", "la puerta se abre sola").'],
  ]
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide w-36">Término</th>
            <th className="text-left px-4 py-2.5 font-semibold text-slate-600 text-xs uppercase tracking-wide">Significado</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([t, d]) => (
            <tr key={t} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2.5 font-bold text-slate-800 align-top whitespace-nowrap">{t}</td>
              <td className="px-4 py-2.5 text-slate-600 leading-snug">{d}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white hover:bg-slate-50 transition-colors"
          >
            <span className="text-sm font-semibold text-slate-800 pr-4">{item.q}</span>
            <span className={`text-slate-400 text-lg shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}>
              ▾
            </span>
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-1 bg-slate-50 border-t border-slate-100 text-sm text-slate-600 leading-relaxed">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Nav links ────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'que-es',      label: '¿Qué es?' },
  { id: 'primeros',    label: 'Primeros pasos' },
  { id: 'srs',         label: 'Cómo funciona el SRS' },
  { id: 'secciones',   label: 'Secciones' },
  { id: 'comunidad',   label: 'Comunidad' },
  { id: 'reportar',    label: 'Reportar problemas' },
  { id: 'tutoriales',  label: 'Tutoriales' },
  { id: 'faq',         label: 'Preguntas frecuentes' },
  { id: 'glosario',    label: 'Glosario' },
]

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserGuideClient() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="print:hidden sticky top-0 z-20 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌸</span>
            <div>
              <p className="font-bold text-slate-800 text-sm leading-tight">Kanji SRS — Guía de Usuario</p>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                Para guardar como PDF: Archivo → Imprimir → Guardar como PDF
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/stats?tab=account"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition">
              ← Volver
            </a>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span className="hidden sm:inline">Imprimir / </span>PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 print:px-0 print:py-4 flex gap-8">

        {/* ── Sidebar nav (hidden on print) ──────────────────────────────────── */}
        <aside className="print:hidden hidden lg:block w-48 shrink-0">
          <div className="sticky top-20 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Contenido</p>
            <nav className="space-y-0.5">
              {NAV.map(n => (
                <a key={n.id} href={`#${n.id}`}
                  className="block px-2 py-1.5 text-xs text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors">
                  {n.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* ── Main content ───────────────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 space-y-10 print:space-y-6">

          {/* Cover */}
          <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-8 text-white text-center print:rounded-xl print:p-6">
            <div className="text-6xl mb-3 print:text-4xl">🌸</div>
            <h1 className="text-3xl font-extrabold mb-1 print:text-2xl">栞 Kanji SRS</h1>
            <p className="text-violet-200 text-lg font-medium mb-3 print:text-base">Guía de Usuario</p>
            <p className="text-violet-100 text-sm max-w-lg mx-auto">
              Aprende japonés con repetición espaciada e inteligencia artificial.
              Esta guía explica todas las funciones de la aplicación en lenguaje sencillo.
            </p>
          </div>

          {/* ── Sección: ¿Qué es? ─────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="que-es" icon="💡" title="¿Qué es Kanji SRS?"
              subtitle="Una aplicación para aprender japonés de forma eficiente" />
            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              <strong>Kanji SRS</strong> es una aplicación web para aprender japonés que combina dos técnicas
              muy poderosas: la <strong>repetición espaciada</strong> (te pide repasar cada palabra exactamente
              cuando estás a punto de olvidarla) y la <strong>inteligencia artificial</strong> (genera frases
              de práctica personalizadas con tus palabras).
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                ['📚', 'Vocabulario SRS', 'Aprende kanji con 5 tipos de preguntas diferentes'],
                ['📖', 'Gramática con IA', 'Practica frases generadas automáticamente'],
                ['🔤', 'Kana', 'Aprende hiragana y katakana con nemotécnica visual'],
                ['💬', 'Lectura en contexto', 'Lee textos adaptados a tu nivel'],
                ['🌐', 'Multi-idioma', 'Interfaz en Español, Catalán, Inglés y Japonés'],
                ['☁️', 'Progreso en la nube', 'Tu avance se guarda y sincroniza automáticamente'],
              ].map(([icon, title, desc]) => (
                <div key={title as string} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <span className="text-xl shrink-0">{icon}</span>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{title as string}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{desc as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* ── Sección: Primeros pasos ──────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="primeros" icon="🚀" title="Primeros pasos"
              subtitle="Cómo acceder y orientarte en la interfaz" />

            <SubSection icon="🔐" title="Cómo iniciar sesión" accent="violet">
              <p>En la pantalla de inicio de sesión tienes tres opciones:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {[
                  { label: 'Google', desc: 'La opción más rápida', icon: '🌐' },
                  { label: 'Enlace mágico', desc: 'Recibe un enlace por email, sin contraseña', icon: '✉️' },
                  { label: 'Email y contraseña', desc: 'Registro tradicional', icon: '🔑' },
                ].map(o => (
                  <div key={o.label} className="border border-slate-200 rounded-xl p-3 text-center">
                    <div className="text-2xl mb-1">{o.icon}</div>
                    <p className="text-xs font-bold text-slate-800">{o.label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{o.desc}</p>
                  </div>
                ))}
              </div>
            </SubSection>

            <SubSection icon="≡" title="La barra lateral (menú)" accent="violet">
              <p>
                Pulsa el icono de <strong>tres barras (≡)</strong> en la parte superior
                izquierda para abrir o cerrar el menú. Desde ahí accedes a todas las secciones.
                El menú también se cierra solo si haces clic en cualquier otra parte de la página.
              </p>
              <InfoBox color="violet" icon="💡">
                La primera vez que entres, un <strong>tutorial interactivo</strong> te guiará
                por las funciones principales. Solo aparece una vez por cuenta.
              </InfoBox>
            </SubSection>

            <SubSection icon="🌐" title="Estado de conexión" accent="sky">
              <p>
                Junto a tu avatar (la inicial de tu email) hay un puntito:
              </p>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                  <span><strong>Verde</strong> — conectado a internet</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span><strong>Rojo</strong> — sin conexión (los cambios se guardan al volver)</span>
                </div>
              </div>
            </SubSection>
          </section>

          {/* ── Sección: SRS ─────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="srs" icon="⏱️" title="Cómo funciona el sistema de repaso (SRS)"
              subtitle="La técnica que hace que recuerdes las palabras para siempre" />
            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
              Cada palabra que aprendes tiene un <strong>nivel</strong> que indica cuánto tiempo
              puede pasar antes de que necesites repasarla. Al acertar, el nivel sube y el tiempo
              aumenta. Al fallar, el nivel baja. El objetivo es llegar al nivel 9 "Quemado",
              que significa que la palabra está en tu memoria a largo plazo.
            </p>
            <SrsLevelTable />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoBox color="emerald" icon="✅">
                <strong>Aciertas:</strong> El nivel sube 1 peldaño y el tiempo de espera aumenta.
              </InfoBox>
              <InfoBox color="amber" icon="❌">
                <strong>Fallas:</strong> El nivel baja tantos peldaños como veces hayas fallado en esa sesión.
              </InfoBox>
            </div>

            <div className="mt-5">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <span>📋</span> Los 5 tipos de preguntas
              </h3>
              <ModeTable />
            </div>
          </section>

          {/* ── Sección: Secciones de la app ─────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="secciones" icon="🗂️" title="Secciones de la aplicación"
              subtitle="Qué puedes hacer en cada parte de la app" />

            <SubSection icon="📝" title="Mis Repasos" accent="violet">
              <p>La sección principal. Aquí repasas el vocabulario según el SRS.</p>
              <p className="mt-1">
                Para añadir palabras nuevas: pulsa el botón <strong>"+"</strong> y elige el lote
                (3, 5, 10 o 20 palabras). Las palabras siguen el currículo escolar japonés, de más
                básico a más avanzado.
              </p>
              <p className="mt-1">
                Si ya sabes una palabra, pulsa <strong>"Ya me lo sé"</strong>: se marca como
                Iluminado (nivel 8) y no vuelve hasta dentro de 4 meses.
              </p>
            </SubSection>

            <SubSection icon="📚" title="Vocabulario" accent="sky">
              <p>Tres pestañas:</p>
              <ul className="list-disc list-inside space-y-1 mt-1">
                <li><strong>Glosario</strong> — Busca cualquier palabra del diccionario por grado, kanji, lectura o significado</li>
                <li><strong>⇄ Antónimos</strong> — Parejas de palabras opuestas (alto ↔ bajo, caliente ↔ frío…)</li>
                <li><strong>動 Transitivos</strong> — Verbos clasificados por si tienen objeto directo (他動詞) o no (自動詞)</li>
              </ul>
            </SubSection>

            <SubSection icon="📖" title="Gramática" accent="emerald">
              <p>
                Más de 120 puntos gramaticales de Minna no Nihongo. Practica con frases de
                <em>rellena-el-hueco</em> generadas por IA. La gramática también tiene su propio
                sistema SRS de 8 niveles.
              </p>
              <p className="mt-1">
                <strong>Filtros:</strong> por libro (MNN 1/2/Chūkyū), por nivel JLPT (N5/N4/N3),
                búsqueda por nombre o patrón, ocultar las ya dominadas, ver solo "estudiando".
              </p>
            </SubSection>

            <SubSection icon="🔤" title="Kana" accent="amber">
              <p>
                Aprende los 46 caracteres de <strong>hiragana</strong> y los 46 de <strong>katakana</strong>
                con imágenes mnemotécnicas. Luego pon a prueba tu memoria con el modo <strong>Test</strong>.
              </p>
            </SubSection>

            <SubSection icon="💬" title="Lecturas IA" accent="violet">
              <p>
                Genera textos de lectura en japonés adaptados a tu nivel actual.
                La IA usa las palabras que ya dominas para crear textos que puedas leer y entender.
              </p>
            </SubSection>

            <SubSection icon="👤" title="Mi Perfil" accent="sky">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  ['📊 Estadísticas', 'Distribución de niveles SRS, racha de estudio, pronóstico de repasos para los próximos 7 días'],
                  ['⭐ Progresión', 'XP acumulado, nivel estimado de JLPT, niveles separados para vocab y gramática'],
                  ['⚙️ Configuración', 'API Keys (Gemini, WaniKani), idioma de la interfaz, toggle de oraciones compartidas'],
                  ['👤 Cuenta', 'Backup del progreso, sincronización WaniKani, cerrar sesión'],
                ].map(([title, desc]) => (
                  <div key={title as string} className="p-3 bg-slate-50 rounded-xl">
                    <p className="text-xs font-bold text-slate-800">{title as string}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{desc as string}</p>
                  </div>
                ))}
              </div>
            </SubSection>
          </section>

          {/* ── Sección: Comunidad ──────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="comunidad" icon="🌐" title="Funciones comunitarias"
              subtitle="Cómo los usuarios colaboran para mejorar el aprendizaje de todos" />

            <SubSection icon="👍" title="Votar imágenes de vocabulario" accent="amber">
              <p>
                Cada palabra del diccionario puede tener una imagen ilustrativa. Durante los
                repasos, si ves la imagen, puedes valorarla con los botones que aparecen sobre ella:
              </p>
              <div className="flex gap-3 mt-2">
                <div className="flex-1 flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <span className="text-xl">👍</span>
                  <p className="text-xs text-emerald-800"><strong>Buena imagen</strong> — Representa bien la palabra</p>
                </div>
                <div className="flex-1 flex items-center gap-2 p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                  <span className="text-xl">👎</span>
                  <p className="text-xs text-rose-800"><strong>Imagen incorrecta</strong> — No corresponde o es confusa</p>
                </div>
              </div>
              <p className="mt-2">
                Los administradores revisan las imágenes con más votos negativos y las sustituyen.
                ¡Tu voto ayuda a mejorar el diccionario para todos!
              </p>
            </SubSection>

            <SubSection icon="📦" title="El banco compartido de frases de gramática" accent="violet">
              <p>
                Las frases de práctica de gramática generadas por IA <strong>se comparten entre
                todos los usuarios</strong>. Cuando alguien genera frases para un punto gramatical,
                esas frases quedan disponibles para el resto.
              </p>
              <InfoBox color="violet" icon="💡">
                Puedes practicar gramática <strong>aunque no tengas API Key de Gemini</strong>,
                si otros usuarios ya generaron frases para ese punto.
              </InfoBox>
              <p className="mt-2">
                El banco tiene un <strong>límite de 100 frases</strong> por punto gramatical.
                Cuando se supera, las más antiguas se eliminan automáticamente para dejar espacio
                a las nuevas.
              </p>
            </SubSection>

            <SubSection icon="✅" title="Frases validadas por profesores" accent="emerald">
              <p>
                Los usuarios con rol de <strong>colaborador</strong> o <strong>administrador</strong>
                (que actúan como profesores o revisores) pueden revisar las frases del banco y
                marcarlas como <Badge color="bg-emerald-100 text-emerald-700">✓ Validada</Badge>.
              </p>
              <p className="mt-1.5">
                Las frases validadas son las más fiables porque han sido comprobadas por un experto.
                <strong> Siempre aparecen primero</strong> en tus sesiones de práctica.
              </p>
            </SubSection>

            <SubSection icon="🤝" title="Compartir tus propias frases" accent="sky">
              <p>
                Al acertar una frase durante la práctica, aparece un botón
                <strong> "🌐 Compartir con la comunidad"</strong>. Al pulsarlo, esa frase
                se guarda permanentemente para que otros usuarios también puedan practicar con ella.
              </p>
              <p className="mt-1.5">
                Puedes activar o desactivar ver las frases de la comunidad en
                <strong> Mi Perfil → Configuración → Oraciones compartidas</strong>.
              </p>
            </SubSection>
          </section>

          {/* ── Sección: Reportar problemas ─────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="reportar" icon="🚩" title="Reportar problemas"
              subtitle="Cómo avisar cuando algo está mal o quieres sugerir mejoras" />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border border-rose-200 bg-rose-50 rounded-2xl">
                <div className="text-2xl mb-2">🚩</div>
                <h3 className="text-sm font-bold text-rose-800 mb-1">Error en una palabra</h3>
                <p className="text-xs text-rose-700 leading-snug">
                  Durante un repaso, pulsa el icono de <strong>bandera</strong> en la tarjeta.
                  Indica si el error es en la lectura, el significado, el kanji u otro.
                  Un administrador lo corregirá para todos.
                </p>
              </div>
              <div className="p-4 border border-amber-200 bg-amber-50 rounded-2xl">
                <div className="text-2xl mb-2">👎</div>
                <h3 className="text-sm font-bold text-amber-800 mb-1">Imagen incorrecta</h3>
                <p className="text-xs text-amber-700 leading-snug">
                  Pulsa el botón <strong>👎</strong> que aparece sobre la imagen de vocabulario.
                  Los administradores revisan las imágenes más votadas negativamente
                  y las sustituyen.
                </p>
              </div>
              <div className="p-4 border border-violet-200 bg-violet-50 rounded-2xl">
                <div className="text-2xl mb-2">🐛</div>
                <h3 className="text-sm font-bold text-violet-800 mb-1">Bug o mejora</h3>
                <p className="text-xs text-violet-700 leading-snug">
                  Pulsa el botón <strong>"🐛 Reportar"</strong> en la barra superior.
                  Describe el problema o tu sugerencia. La página donde estás
                  se adjunta automáticamente.
                </p>
              </div>
            </div>
          </section>

          {/* ── Sección: Tutoriales ──────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="tutoriales" icon="🎯" title="Tutoriales paso a paso"
              subtitle="Guías detalladas para las tareas más habituales" />

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center">A</span>
                  Empezar a aprender vocabulario nuevo
                </h3>
                <StepList steps={[
                  { n: 1, text: 'Ve a la sección "Mis Repasos" en el menú lateral.' },
                  { n: 2, text: 'Pulsa el botón "+" en la parte inferior de la pantalla.' },
                  { n: 3, text: 'Elige cuántas palabras añadir. Para empezar, 3 o 5 es perfecto.' },
                  { n: 4, text: 'Las palabras aparecerán en tu próxima sesión de repaso.' },
                ]} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">B</span>
                  Configurar Gemini para gramática ilimitada (gratis)
                </h3>
                <StepList steps={[
                  { n: 1, text: 'Abre aistudio.google.com en tu navegador y crea una cuenta gratuita con Google.' },
                  { n: 2, text: 'En Google AI Studio, ve a "Get API Key" y copia tu clave.' },
                  { n: 3, text: 'En la app, ve a Mi Perfil → Configuración → campo "API Key de Gemini".' },
                  { n: 4, text: 'Pega la clave y guarda. A partir de ahora, la gramática genera frases sin límite.' },
                ]} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-xs font-bold flex items-center justify-center">C</span>
                  Sincronizar tu vocabulario de WaniKani
                </h3>
                <StepList steps={[
                  { n: 1, text: 'Entra en wanikani.com → Settings → Personal Access Tokens → crea un token.' },
                  { n: 2, text: 'En la app, ve a Mi Perfil → Configuración → "API Key de WaniKani" y pégala.' },
                  { n: 3, text: 'Elige el nivel SRS mínimo (recomendado: Gurú, es decir, nivel 5 o superior).' },
                  { n: 4, text: 'Ve a Mi Perfil → Cuenta → "Sincronizar WaniKani" y pulsa el botón.' },
                  { n: 5, text: 'El vocabulario de WaniKani estará disponible como contexto en la gramática.' },
                ]} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">D</span>
                  Crear una copia de seguridad de tu progreso
                </h3>
                <StepList steps={[
                  { n: 1, text: 'Ve a Mi Perfil → Cuenta.' },
                  { n: 2, text: 'Pulsa "Crear copia de seguridad".' },
                  { n: 3, text: 'La copia queda guardada en la nube.' },
                ]} />
                <InfoBox color="emerald" icon="💡">
                  La app también crea copias automáticas cada 25 repasos. Tienes siempre las últimas 10 guardadas.
                </InfoBox>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-bold flex items-center justify-center">E</span>
                  Cambiar el idioma de la interfaz
                </h3>
                <StepList steps={[
                  { n: 1, text: 'Ve a Mi Perfil → Configuración.' },
                  { n: 2, text: 'En el selector "Idioma", elige Español, Catalán, Inglés o Japonés.' },
                  { n: 3, text: 'Pulsa "Guardar". El cambio es inmediato.' },
                ]} />
              </div>
            </div>
          </section>

          {/* ── Sección: FAQ ─────────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="faq" icon="❓" title="Preguntas frecuentes"
              subtitle="Respuestas a las dudas más habituales" />
            <FaqAccordion items={[
              { q: '¿Con qué frecuencia debo usar la app?',
                a: 'Idealmente todos los días. Sesiones cortas de 15-30 minutos son más efectivas que sesiones largas esporádicas. La repetición espaciada funciona mejor con consistencia.' },
              { q: '¿Cuántas palabras nuevas debo añadir por día?',
                a: 'Entre 5 y 10 para un ritmo cómodo. Si añades demasiadas de golpe, los repasos se acumulan y se vuelven abrumadores. Es mejor ir poco a poco y de forma sostenida.' },
              { q: '¿Qué pasa si no uso la app durante varios días?',
                a: 'Las palabras vencidas te esperan. Tendrás una sesión más larga para ponerte al día, pero no pierdes el progreso. La app siempre guarda exactamente en qué nivel está cada palabra.' },
              { q: '¿La app funciona sin internet?',
                a: 'Puedes continuar una sesión de repasos sin internet. Los cambios se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión. El puntito junto a tu avatar se vuelve rojo cuando estás sin conexión.' },
              { q: '¿Para qué sirve votar las imágenes?',
                a: 'Tu voto (👍 o 👎) ayuda a los administradores a detectar imágenes incorrectas o confusas. Las imágenes con más votos negativos se revisan y sustituyen por otras mejores. Entre todos mejoramos la calidad del diccionario.' },
              { q: '¿Por qué algunas frases de gramática tienen una marca verde ✓?',
                a: 'Las frases marcadas han sido revisadas y aprobadas por un administrador o colaborador que actúa como profesor. Son las más fiables y aparecen primero en tus sesiones de práctica.' },
              { q: '¿Puedo practicar gramática sin tener API Key de Gemini?',
                a: 'Sí. Las frases generadas por otros usuarios se comparten en un banco común. Si otro usuario generó frases para ese punto gramatical antes que tú, puedes usarlas directamente, sin necesitar tu propia clave.' },
              { q: '¿Qué es JLPT y cómo me ayuda?',
                a: 'El JLPT (Japanese Language Proficiency Test) es el examen oficial de japonés más reconocido, con 5 niveles del N5 (básico) al N1 (avanzado). La app estima en qué nivel estás según el vocabulario que dominas y la gramática que conoces. Es útil para saber hacia dónde va tu progreso.' },
              { q: '¿Qué significa "Quemado 🔥"?',
                a: 'Una palabra "Quemada" ha llegado al nivel máximo (9). La app no te la vuelve a pedir porque considera que ya está en tu memoria a largo plazo. ¡Es el objetivo final para cada palabra!' },
              { q: '¿Cómo cambio el tema de claro a oscuro?',
                a: 'Pulsa el botón ☀️/🌙 en la parte superior derecha de la pantalla.' },
            ]} />
          </section>

          {/* ── Sección: Glosario ────────────────────────────────────────────── */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:shadow-none">
            <SectionTitle id="glosario" icon="📖" title="Glosario"
              subtitle="Significado de los términos específicos que usa la app" />
            <GlossaryTable />
          </section>

          {/* Footer */}
          <div className="text-center py-6 text-slate-400 text-xs print:py-4">
            <p>🌸 Kanji SRS · Guía de Usuario · {new Date().getFullYear()}</p>
          </div>

        </main>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page { margin: 1.5cm; size: A4; }
          body { font-size: 10pt; color: #1e293b; background: white; }
          .page-break-before { page-break-before: always; }
          section { page-break-inside: avoid; margin-bottom: 1rem; }
          table { page-break-inside: avoid; font-size: 9pt; }
        }
      `}</style>
    </div>
  )
}
