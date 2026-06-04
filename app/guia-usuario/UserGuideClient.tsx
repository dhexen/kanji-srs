'use client'

export default function UserGuideClient() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* Print/Download toolbar — hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🌸</span>
          <div>
            <p className="font-bold text-slate-800 text-sm">Kanji SRS — Guía de Usuario</p>
            <p className="text-xs text-slate-500">Para guardar como PDF: Archivo → Imprimir → Guardar como PDF</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/stats?tab=account"
            className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg transition"
          >
            ← Volver
          </a>
          <button
            onClick={() => window.print()}
            className="px-4 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* Document content */}
      <div className="max-w-4xl mx-auto px-8 py-10 print:px-0 print:py-0">

        {/* Cover */}
        <div className="text-center mb-16 print:mb-12 print:pt-8">
          <div className="text-8xl mb-4 print:text-6xl">🌸</div>
          <h1 className="text-4xl font-bold text-violet-700 mb-2 print:text-3xl">栞 Kanji SRS</h1>
          <h2 className="text-2xl text-slate-600 mb-4 print:text-xl">Guía de Usuario</h2>
          <p className="text-slate-500 text-sm">Para aprender japonés con repetición espaciada e inteligencia artificial</p>
          <div className="mt-8 h-px bg-slate-200 print:mt-6" />
        </div>

        <GuideContent />
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          @page { margin: 2cm; size: A4; }
          body { font-size: 11pt; color: #1e293b; }
          h1 { font-size: 22pt; }
          h2 { font-size: 16pt; page-break-after: avoid; }
          h3 { font-size: 13pt; page-break-after: avoid; }
          h4 { font-size: 11pt; page-break-after: avoid; }
          table { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
        }
      `}</style>
    </div>
  )
}

function GuideContent() {
  return (
    <article className="prose prose-slate max-w-none prose-headings:text-slate-800 prose-h1:text-3xl prose-h2:text-2xl prose-h2:border-b prose-h2:border-slate-200 prose-h2:pb-2 prose-h2:mt-10 prose-h3:text-lg prose-h3:text-violet-700 prose-table:text-sm prose-td:py-1.5 prose-th:py-1.5">

      <h2>¿Qué es Kanji SRS?</h2>
      <p>
        <strong>Kanji SRS</strong> es una aplicación web para aprender japonés que combina
        la <strong>repetición espaciada</strong> con <strong>inteligencia artificial</strong>.
        Te ayuda a memorizar kanji (caracteres japoneses), vocabulario y gramática de forma
        eficiente: te hace repasar cada palabra en el momento exacto en que estás a punto
        de olvidarla.
      </p>

      <h2>Primeros pasos</h2>
      <h3>Cómo acceder</h3>
      <p>Abre la web y verás la pantalla de inicio de sesión con tres opciones:</p>
      <ul>
        <li><strong>Continuar con Google</strong> — la forma más rápida</li>
        <li><strong>Enlace mágico</strong> — recibe un enlace por email sin contraseña</li>
        <li><strong>Email y contraseña</strong> — registro tradicional</li>
      </ul>

      <h3>La interfaz</h3>
      <p>
        Pulsa el icono de <strong>tres barras (≡)</strong> en la parte superior izquierda
        para abrir el menú lateral. Desde ahí accedes a todas las secciones.
        El menú se cierra automáticamente al hacer clic en cualquier otro lugar.
      </p>

      <h2>El sistema de niveles (SRS)</h2>
      <p>Cada palabra que aprendes sube o baja de nivel según tus respuestas:</p>
      <table>
        <thead><tr><th>Nivel</th><th>Nombre</th><th>Próximo repaso</th></tr></thead>
        <tbody>
          {[
            ['1', 'Aprendiz 1', '4 horas'],
            ['2', 'Aprendiz 2', '8 horas'],
            ['3', 'Aprendiz 3', '1 día'],
            ['4', 'Aprendiz 4', '2 días'],
            ['5', 'Gurú 1', '1 semana'],
            ['6', 'Gurú 2', '2 semanas'],
            ['7', 'Maestro', '1 mes'],
            ['8', 'Iluminado', '4 meses'],
            ['9', 'Quemado 🔥', 'Nunca más'],
          ].map(([lvl, name, time]) => (
            <tr key={lvl}><td>{lvl}</td><td>{name}</td><td>{time}</td></tr>
          ))}
        </tbody>
      </table>
      <p>Respuesta correcta → sube 1 nivel. Respuesta incorrecta → baja según los errores.</p>

      <h2>Secciones de la aplicación</h2>

      <h3>Mis Repasos</h3>
      <p>
        La sección principal. Aquí repasas el vocabulario con preguntas de 5 tipos:
        lectura múltiple, significado, escritura de lectura en hiragana,
        escritura de kanji en papel, y modo inverso.
      </p>
      <p>
        Para añadir palabras nuevas, pulsa el botón <strong>"+"</strong> y elige el lote
        (3, 5, 10 o 20 palabras).
      </p>
      <p>
        Si ya sabes una palabra, pulsa <strong>"Ya me lo sé"</strong> para marcarla
        directamente como Iluminado (nivel 8) y que no aparezca hasta dentro de 4 meses.
      </p>

      <h3>Votar imágenes</h3>
      <p>
        Cada palabra con imagen muestra botones <strong>👍 / 👎</strong> en la esquina de la imagen.
        Vota si la imagen es correcta o no. Los administradores revisan las imágenes con más votos
        negativos y las sustituyen. Entre todos mejoramos el diccionario visual.
      </p>

      <h3>Reportar errores en palabras</h3>
      <p>
        Si una lectura, significado o kanji está incorrecto, pulsa el icono de
        <strong>bandera (🚩)</strong> en la tarjeta de la palabra. Elige qué está mal
        (Lectura / Significado / Kanji / General) y envía el reporte.
        Un administrador corregirá la palabra para todos los usuarios.
      </p>

      <h3>Reportar un bug o sugerencia</h3>
      <p>
        Pulsa el botón <strong>"🐛 Reportar"</strong> en la barra superior para enviar cualquier
        incidencia o mejora. La URL de la página donde estás se adjunta automáticamente.
      </p>

      <h3>Vocabulario</h3>
      <p>Tres pestañas disponibles:</p>
      <ul>
        <li><strong>Glosario</strong> — Diccionario con búsqueda por grado escolar japonés (1-9)</li>
        <li><strong>⇄ Antónimos</strong> — Pares de palabras con significado opuesto (alto ↔ bajo)</li>
        <li><strong>動 Transitivos</strong> — Verbos clasificados por transitivos (他動詞) e intransitivos (自動詞)</li>
      </ul>

      <h3>Gramática</h3>
      <p>
        Más de 120 puntos gramaticales de Minna no Nihongo (MNN 1, 2 y Chūkyū I).
        Al practicar, la IA genera frases de rellena-el-hueco adaptadas al punto estudiado.
        La gramática tiene su propio sistema SRS de 8 niveles.
      </p>
      <p>
        <strong>Filtros disponibles:</strong> por libro, por nivel JLPT (N5/N4/N3),
        búsqueda de texto, ocultar las ya dominadas, ver solo las que estás estudiando.
      </p>

      <h3>Kana</h3>
      <p>
        Aprende los 46 caracteres de hiragana y los 46 de katakana con nemotécnica visual.
        Modos: <strong>Aprender</strong> (tarjetas con ayuda visual) y <strong>Test</strong>
        (ejercicios cronometrados).
      </p>

      <h3>Lecturas IA</h3>
      <p>
        Genera textos de lectura en japonés usando tu vocabulario dominado como contexto.
        Útil para practicar comprensión lectora con palabras que ya conoces.
      </p>

      <h3>Mi Perfil</h3>
      <ul>
        <li><strong>Estadísticas</strong> — Distribución de niveles SRS, racha diaria, pronóstico de repasos</li>
        <li><strong>Progresión</strong> — XP acumulado y nivel estimado de JLPT</li>
        <li><strong>Configuración</strong> — API Keys de Gemini y WaniKani, idioma de interfaz</li>
        <li><strong>Cuenta</strong> — Backup del progreso, sincronización WaniKani, cerrar sesión</li>
      </ul>

      <div className="page-break" />

      <h2>Tareas frecuentes</h2>

      <h3>Cómo empezar a aprender vocabulario nuevo</h3>
      <ol>
        <li>Ve a <strong>"Mis Repasos"</strong></li>
        <li>Pulsa el botón <strong>"+"</strong></li>
        <li>Elige cuántas palabras añadir (empieza con 3-5)</li>
        <li>Las palabras aparecerán en tu próxima sesión</li>
      </ol>

      <h3>Cómo configurar Gemini para práctica de gramática ilimitada</h3>
      <ol>
        <li>Ve a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer">aistudio.google.com</a> y crea una cuenta gratuita</li>
        <li>Obtén tu API Key (gratuita para uso personal)</li>
        <li>En la app: <strong>Mi Perfil → Configuración → API Key de Gemini</strong></li>
        <li>Pega la clave y guarda</li>
      </ol>

      <h3>Cómo sincronizar WaniKani</h3>
      <ol>
        <li>Obtén tu API Key en wanikani.com/settings/personal_access_tokens</li>
        <li>En la app: <strong>Mi Perfil → Configuración → API Key de WaniKani</strong></li>
        <li>Ve a <strong>Mi Perfil → Cuenta → Sincronizar WaniKani</strong></li>
      </ol>

      <h3>Cómo hacer una copia de seguridad</h3>
      <ol>
        <li>Ve a <strong>Mi Perfil → Cuenta</strong></li>
        <li>Pulsa <strong>"Crear copia de seguridad"</strong></li>
      </ol>
      <p>La app también crea copias automáticas cada 25 repasos.</p>

      <h2>Preguntas frecuentes</h2>

      <h3>¿Para qué sirve votar las imágenes?</h3>
      <p>Tu voto ayuda a detectar imágenes incorrectas. Los administradores las revisan y sustituyen. Cuantos más usuarios voten, mejor es el diccionario visual para todos.</p>

      <h3>¿Por qué algunas frases de gramática tienen una marca verde?</h3>
      <p>Las frases con ✓ han sido revisadas por un administrador o colaborador (que actúa como profesor). Son las más fiables y aparecen primero en tus sesiones.</p>

      <h3>¿Por qué puedo practicar gramática sin API Key de Gemini?</h3>
      <p>Las frases generadas por otros usuarios se comparten en un banco común. Si alguien ya generó frases para ese punto gramatical, tú puedes usarlas directamente.</p>

      <h3>¿Cómo reporto un bug?</h3>
      <p>Pulsa el botón <strong>"🐛 Reportar"</strong> en la barra superior. Escribe una descripción y envía. La URL de la página se adjunta automáticamente para ayudar a los administradores.</p>

      <h3>¿Con qué frecuencia debo usar la app?</h3>
      <p>Idealmente todos los días. Sesiones cortas de 15-30 minutos son más efectivas que sesiones largas esporádicas.</p>

      <h3>¿Cuántas palabras nuevas debo añadir por día?</h3>
      <p>Entre 5 y 10 para un ritmo cómodo. Añadir demasiadas de golpe acumula repasos abrumadores.</p>

      <h3>¿Qué pasa si no uso la app varios días?</h3>
      <p>Las palabras vencidas te esperan. Tendrás una sesión más larga para ponerte al día, pero no perderás el progreso.</p>

      <h3>¿Funciona sin internet?</h3>
      <p>Puedes continuar una sesión sin internet. Los cambios se sincronizan automáticamente cuando vuelve la conexión.</p>

      <h3>¿Qué significa el punto verde/rojo junto a mi nombre?</h3>
      <p>Verde = conectado a internet. Rojo = sin conexión (los cambios se guardan localmente y se sincronizan al recuperar conexión).</p>

      <h2>Glosario</h2>
      <table>
        <thead><tr><th>Término</th><th>Significado</th></tr></thead>
        <tbody>
          {[
            ['Kanji', 'Caracteres de escritura japonesa de origen chino.'],
            ['Hiragana', 'Silabario japonés básico (46 caracteres). Se usa para conjugaciones y palabras nativas.'],
            ['Katakana', 'Segundo silabario japonés (46 caracteres). Se usa para palabras extranjeras.'],
            ['Furigana', 'Pequeños hiragana sobre los kanji que indican su pronunciación.'],
            ['SRS', 'Spaced Repetition System. Método que programa los repasos en el momento óptimo.'],
            ['JLPT', 'Japanese Language Proficiency Test. Examen oficial de japonés con niveles N5-N1.'],
            ['Fill-in-the-blank', 'Ejercicio de rellenar un hueco en una frase.'],
            ['API Key', 'Contraseña especial para acceder a servicios externos como Gemini o WaniKani.'],
            ['WaniKani', 'Aplicación externa de aprendizaje de kanji por repetición espaciada.'],
            ['XP', 'Puntos de experiencia que ganas al practicar, sirven para subir de nivel.'],
            ['Snapshot', 'Copia de seguridad de tu progreso en un momento concreto.'],
            ['Quemado 🔥', 'Nivel máximo (9). La app no te vuelve a pedir esta palabra.'],
            ['他動詞', 'Verbo transitivo. Tiene objeto directo (ej: "comer algo").'],
            ['自動詞', 'Verbo intransitivo. No tiene objeto directo (ej: "correr").'],
          ].map(([term, def]) => (
            <tr key={term}><td><strong>{term}</strong></td><td>{def}</td></tr>
          ))}
        </tbody>
      </table>

      <div className="mt-16 text-center text-slate-400 text-xs print:mt-8">
        <p>🌸 Kanji SRS · Guía de Usuario · {new Date().getFullYear()}</p>
      </div>
    </article>
  )
}
