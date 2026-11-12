// Rutina diaria: busca en WaniKani las fichas (niveles 1-60) que aún no tienen notas
// o sinónimos en español, las traduce con Claude (CLI `claude -p`) y las escribe con
// wk-aplicar.mjs. Si no falta ninguna, no gasta nada de Claude.
//
// Uso: node scripts/wk-diario.mjs [--seco] [--max=40]
//   --seco  solo lista lo que falta; no llama a Claude ni escribe en WaniKani.
//
// La clave se toma de WK_API_KEY o, si no está, de env.WK_API_KEY en
// .claude/settings.local.json (nunca se imprime).
// Se ejecuta a diario en GitHub Actions (.github/workflows/wk-diario.yml), con los
// secretos WK_API_KEY y CLAUDE_CODE_OAUTH_TOKEN. En local también vale: node scripts/wk-diario.mjs
import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')
const seco = process.argv.includes('--seco')
const maxPorTanda = 20
const maxTotal = Number(process.argv.find((a) => a.startsWith('--max='))?.slice(6) ?? 40)
const MARCA = '[ES] '
const LIMITE = 500

// WaniKani rechaza el 401 sin avisar de por qué; mejor fallar claro si no hay clave.
function leerClave() {
  if (process.env.WK_API_KEY) return process.env.WK_API_KEY
  try {
    const ajustes = JSON.parse(readFileSync(join(raiz, '.claude/settings.local.json'), 'utf8'))
    return ajustes?.env?.WK_API_KEY
  } catch {
    return undefined
  }
}
// Con cron el PATH es mínimo y `claude` puede no estar: se admite CLAUDE_BIN y, si no,
// se usa el binario de la extensión de VS Code más reciente (su ruta cambia con cada versión).
function binarioClaude() {
  if (process.env.CLAUDE_BIN) return process.env.CLAUDE_BIN
  if (spawnSync('claude', ['--version']).status === 0) return 'claude'
  const ext = join(homedir(), '.vscode/extensions')
  const ultima = existsSync(ext)
    ? readdirSync(ext).filter((n) => n.startsWith('anthropic.claude-code-')).sort().pop()
    : undefined
  const ruta = ultima && join(ext, ultima, 'resources/native-binary/claude')
  return ruta && existsSync(ruta) ? ruta : 'claude'
}
const CLAUDE = binarioClaude()
const clave = leerClave()
if (!clave) {
  console.error('Falta WK_API_KEY (variable de entorno o .claude/settings.local.json).')
  process.exit(1)
}
const env = { ...process.env, WK_API_KEY: clave }

const dir = mkdtempSync(join(tmpdir(), 'wk-diario-'))
const desc = spawnSync('node', [join(raiz, 'scripts/wk-descargar.mjs'), dir, '60'], { env, encoding: 'utf8' })
if (desc.status !== 0) {
  console.error('Falló la descarga de WaniKani:\n' + desc.stderr)
  process.exit(1)
}
const materiales = JSON.parse(readFileSync(join(dir, 'study_materials.backup.json'), 'utf8'))
const subjects = JSON.parse(readFileSync(join(dir, 'subjects.json'), 'utf8'))
const porSubject = new Map(materiales.map((m) => [m.data.subject_id, m.data]))

const pendientes = []
for (const s of subjects) {
  const d = s.data
  const m = porSubject.get(s.id) ?? {}
  const falta =
    (d.meaning_mnemonic && !(m.meaning_note ?? '').includes('[ES]')) ||
    (d.reading_mnemonic && !(m.reading_note ?? '').includes('[ES]')) ||
    !(m.meaning_synonyms ?? []).length
  if (!falta) continue
  pendientes.push({
    id: s.id,
    t: s.object,
    c: d.characters ?? d.slug,
    m: d.meanings.map((x) => x.meaning),
    r: (d.readings ?? []).find((x) => x.primary)?.reading,
    sin: m.meaning_synonyms ?? [],
    notaM: m.meaning_note ?? '',
    notaR: m.reading_note ?? '',
    mm: d.meaning_mnemonic,
    rm: d.reading_mnemonic,
    nivel: d.level,
  })
}
console.log(`${new Date().toISOString()} · fichas sin traducir: ${pendientes.length}`)
if (!pendientes.length || seco) {
  for (const p of pendientes.slice(0, 20)) console.log(`  #${p.id} ${p.c} (nivel ${p.nivel}, ${p.t})`)
  process.exit(0)
}

const REGLAS = `Traduces al español mnemotécnicos de WaniKani. Recibes un array JSON de fichas con
id, t (tipo), c (caracteres), m (significados en inglés), r (lectura), sin (sinónimos en español que ya tiene
el usuario), notaM/notaR (notas que ya tiene), mm (mnemotécnico de significado), rm (de lectura).
Responde SOLO con un objeto JSON {"<id>": {"add": [...], "m": "...", "r": "..."}} con todas las fichas.
- m: traducción de mm (obligatoria si hay mm). r: traducción de rm (solo si hay rm).
- Español neutro, tuteo, tono ligero como el original, texto plano sin Markdown, saltos con \\n. No inventes contenido.
- Límite DURO: 500 caracteres por nota (apunta a ≤450; cuenta el prefijo "[ES] " y la nota previa del usuario). Condensa
  quitando relleno y conserva siempre el gancho mnemotécnico.
- Conserva las etiquetas <radical>, <kanji>, <reading>, <vocabulary>, <em>, <i>. Dentro, traduce los significados
  (<radical>suelo</radical>) pero deja en inglés la palabra de un juego de sonidos (<reading>knee</reading>).
- Cuando la mnemotecnia se apoya en una palabra o sonido inglés, déjala y añade la traducción entre paréntesis:
  <reading>knee</reading> («rodilla», en inglés) (に).
- Nombres propios, marcas y la mención a Tofugu/WaniKani se dejan igual.
- add: sinónimos en español que falten (máximo 3, una palabra o expresión corta). Si sin está vacío, 1-3 que sean la
  traducción natural de m. Si sin ya es correcto, []. Nunca repitas los que ya hay. Para vocabulario/kanji con
  varios significados, cubre los importantes.`

const conv = (t) => t?.replace(/<\/?(radical|kanji|reading|vocabulary|em|i)>/g, '«').replace(/«([^«]*)«/g, '«$1»')

function pedirTraduccion(tanda) {
  const entrada = tanda.map(({ nivel, ...resto }) => resto)
  const r = spawnSync(CLAUDE, ['-p', '--model', 'sonnet', '--output-format', 'text'], {
    input: `${REGLAS}\n\nFICHAS:\n${JSON.stringify(entrada)}`,
    encoding: 'utf8',
    cwd: dir, // fuera del proyecto: no hace falta su contexto
    timeout: 20 * 60 * 1000,
    maxBuffer: 64 * 1024 * 1024,
  })
  if (r.status !== 0) throw new Error(`claude terminó con ${r.status}: ${(r.stderr || r.stdout).slice(0, 300)}`)
  const texto = r.stdout
  return JSON.parse(texto.slice(texto.indexOf('{'), texto.lastIndexOf('}') + 1))
}

function construir(p, t) {
  if (!t) return { error: 'sin traducción' }
  const sinonimos = (t.add ?? []).filter((x) => typeof x === 'string' && x.trim()).slice(0, 3)
  const c = { subject_id: p.id, meaning_synonyms: sinonimos }
  if (p.mm) {
    if (!t.m) return { error: 'falta m' }
    const nota = p.notaM.includes('[ES]') ? p.notaM : (p.notaM ? p.notaM + '\n\n' : '') + MARCA + conv(t.m)
    if (nota.length > LIMITE) return { error: `nota de significado de ${nota.length}` }
    c.meaning_note = nota
  } else {
    c.meaning_note = p.notaM
  }
  if (p.rm) {
    if (!t.r) return { error: 'falta r' }
    const propia = MARCA + conv(t.r)
    if ((p.notaR ? p.notaR + '\n\n' : '').length + propia.length > LIMITE) return { error: 'nota de lectura larga' }
    c.reading_note = propia
  }
  if (!p.sin.length && !sinonimos.length) return { error: 'sin sinónimos' }
  return { c }
}

const cambios = []
let resto = pendientes.slice(0, maxTotal)
for (let intento = 0; intento < 2 && resto.length; intento++) {
  const falladas = []
  for (let i = 0; i < resto.length; i += maxPorTanda) {
    const tanda = resto.slice(i, i + maxPorTanda)
    let respuesta = {}
    try {
      respuesta = pedirTraduccion(tanda)
    } catch (e) {
      console.error('  ⚠ ' + e.message)
    }
    for (const p of tanda) {
      const { c, error } = construir(p, respuesta[p.id])
      if (c) cambios.push(c)
      else {
        console.warn(`  ⚠ #${p.id} ${p.c}: ${error}${intento ? ' (se deja para mañana)' : ' (reintento)'}`)
        falladas.push(p)
      }
    }
  }
  resto = falladas
}

if (!cambios.length) process.exit(0)
// En GitHub Actions el runner es efímero: WK_BACKUP_DIR apunta a una carpeta que el workflow sube como artefacto.
const copias = process.env.WK_BACKUP_DIR ?? join(homedir(), 'Documentos/wk-backup')
mkdirSync(copias, { recursive: true })
const copia = join(copias, `study_materials.${new Date().toISOString().slice(0, 10)}-diario.json`)
copyFileSync(join(dir, 'study_materials.backup.json'), copia)
const fichero = join(dir, 'cambios.json')
writeFileSync(fichero, JSON.stringify(cambios))
const ap = spawnSync('node', [join(raiz, 'scripts/wk-aplicar.mjs'), fichero, copia, '--aplicar'], { env, encoding: 'utf8' })
console.log(ap.stdout.trim().split('\n').slice(-3).join('\n'))
if (ap.status !== 0) {
  console.error(ap.stderr.slice(0, 500))
  process.exit(1)
}
