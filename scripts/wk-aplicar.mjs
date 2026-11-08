// Aplica a WaniKani los sinónimos y notas traducidos (study_materials).
// Por defecto es un ensayo en seco: solo escribe si se pasa --aplicar.
//
// Uso: WK_API_KEY=... node scripts/wk-aplicar.mjs <cambios.json> <backup.json> [--ids=6,447] [--revision=revision.json] [--aplicar]
//
// Con --revision (objeto {id: {quitar:[], add:[]}}) se SUSTITUYEN sinónimos: se quitan
// los de «quitar» (los que el usuario aceptó revisar y descartar) y se añaden los de «add».
// Sin esa opción nunca se borra nada.
//
// Es idempotente: si la nota ya empieza por «[ES]» no se vuelve a añadir, y los
// sinónimos se unen con los que haya ahora en WaniKani (nunca se borra ninguno).
import { existsSync, readFileSync } from 'node:fs'

const KEY = process.env.WK_API_KEY
const [cambiosPath, backupPath, ...flags] = process.argv.slice(2)
const aplicar = flags.includes('--aplicar')
const revisionPath = flags.find((f) => f.startsWith('--revision='))?.slice(11)
const revision = revisionPath ? JSON.parse(readFileSync(revisionPath, 'utf8')) : {}
const soloIds = flags.find((f) => f.startsWith('--ids='))?.slice(6).split(',').map(Number)

if (!KEY || !cambiosPath || !backupPath) {
  console.error('Uso: WK_API_KEY=... node scripts/wk-aplicar.mjs <cambios.json> <backup.json> [--ids=1,2] [--aplicar]')
  process.exit(1)
}
// Un update puede borrar datos y WaniKani no permite deshacerlo: sin copia no se escribe.
if (aplicar && !existsSync(backupPath)) {
  console.error(`No existe la copia de seguridad en ${backupPath}; no escribo nada.`)
  process.exit(1)
}

const BASE = 'https://api.wanikani.com/v2'
const MARCA = '[ES]'
const LIMITE_NOTA = 500

async function pedir(url, opciones = {}) {
  for (;;) {
    const res = await fetch(url, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${KEY}`,
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
      },
    })
    if (res.status === 429) {
      const reset = Number(res.headers.get('RateLimit-Reset')) * 1000
      await new Promise((r) => setTimeout(r, Math.max(1000, reset - Date.now())))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} ${opciones.method ?? 'GET'} ${url}: ${await res.text()}`)
    return res.json()
  }
}

// Estado actual (no el de la copia): así no pisamos nada que hayas cambiado después.
const actuales = new Map()
let siguiente = `${BASE}/study_materials`
while (siguiente) {
  const pagina = await pedir(siguiente)
  for (const m of pagina.data) actuales.set(m.data.subject_id, { id: m.id, ...m.data })
  siguiente = pagina.pages?.next_url ?? null
}

const cambios = JSON.parse(readFileSync(cambiosPath, 'utf8')).filter(
  (c) => !soloIds || soloIds.includes(c.subject_id),
)
let escritas = 0
let saltadas = 0

for (const c of cambios) {
  const actual = actuales.get(c.subject_id)
  let sinonimos = [...(actual?.meaning_synonyms ?? [])]
  const rev = revision[c.subject_id]
  const quitar = (rev?.quitar ?? []).map((q) => q.toLowerCase())
  for (const s of [...c.meaning_synonyms, ...(rev?.add ?? [])]) {
    if (!sinonimos.some((x) => x.toLowerCase() === s.toLowerCase())) sinonimos.push(s)
  }
  sinonimos = sinonimos.filter((x) => !quitar.includes(x.toLowerCase()))
  // WaniKani admite como máximo 8 sinónimos (422 si no): se conservan los primeros,
  // que son los que ya tenía el usuario, y se descartan los añadidos que sobran.
  if (sinonimos.length > 8) {
    console.warn(`  ⚠ #${c.subject_id}: ${sinonimos.length} sinónimos (máx. 8), se descartan: ${sinonimos.slice(8).join(', ')}`)
    sinonimos = sinonimos.slice(0, 8)
  }

  // WaniKani rechaza con 422 las notas de más de 500 caracteres; mejor avisar y
  // saltar esa nota que abortar a mitad de lote.
  const cabe = (nombre, texto) => {
    if (texto.length <= LIMITE_NOTA) return true
    console.warn(`  ⚠ #${c.subject_id}: ${nombre} de ${texto.length} caracteres (máx. ${LIMITE_NOTA}), se salta`)
    return false
  }

  const material = { meaning_synonyms: sinonimos }
  // c.meaning_note ya incluye la nota que tenías antes seguida de la traducción.
  if (!(actual?.meaning_note ?? '').includes(MARCA) && cabe('nota de significado', c.meaning_note)) {
    material.meaning_note = c.meaning_note
  }
  if (c.reading_note && !(actual?.reading_note ?? '').includes(MARCA)) {
    const lectura = actual?.reading_note ? `${actual.reading_note}\n\n${c.reading_note}` : c.reading_note
    if (cabe('nota de lectura', lectura)) material.reading_note = lectura
  }

  const sinCambios =
    material.meaning_note === undefined &&
    material.reading_note === undefined &&
    sinonimos.join('\u0000') === (actual?.meaning_synonyms ?? []).join('\u0000')
  if (sinCambios) {
    saltadas++
    continue
  }

  const accion = actual ? 'PUT' : 'POST'
  console.log(`${aplicar ? '' : '[seco] '}${accion} #${c.subject_id}: ${Object.keys(material).join(', ')}`)
  if (!aplicar) continue

  if (actual) {
    await pedir(`${BASE}/study_materials/${actual.id}`, {
      method: 'PUT',
      body: JSON.stringify({ study_material: material }),
    })
  } else {
    await pedir(`${BASE}/study_materials`, {
      method: 'POST',
      body: JSON.stringify({ study_material: { subject_id: c.subject_id, ...material } }),
    })
  }
  escritas++
}
console.log(`${aplicar ? 'Escritas' : 'Se escribirían'}: ${aplicar ? escritas : cambios.length - saltadas} · saltadas (ya hechas): ${saltadas}`)
