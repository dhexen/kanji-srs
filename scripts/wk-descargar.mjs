// Descarga de solo lectura de WaniKani: copia de seguridad de los study_materials
// del usuario y los subjects de los niveles pedidos. No escribe nada en WaniKani.
//
// Uso: WK_API_KEY=... node scripts/wk-descargar.mjs <carpeta-salida> [nivelMax=19] [nivelMin=1]
// La clave se lee solo del entorno para que no quede en el historial ni en el chat.
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const KEY = process.env.WK_API_KEY
const salida = process.argv[2]
const nivelMax = Number(process.argv[3] ?? 19)
const nivelMin = Number(process.argv[4] ?? 1)
if (!KEY || !salida) {
  console.error('Uso: WK_API_KEY=... node scripts/wk-descargar.mjs <carpeta-salida> [nivelMax]')
  process.exit(1)
}
mkdirSync(salida, { recursive: true })

const BASE = 'https://api.wanikani.com/v2'

// WaniKani permite 60 peticiones/minuto: ante un 429 esperamos lo que indique
// la cabecera y reintentamos, en vez de fallar a mitad de descarga.
async function pedir(url) {
  for (;;) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } })
    if (res.status === 429) {
      const reset = Number(res.headers.get('RateLimit-Reset')) * 1000
      const espera = Math.max(1000, reset - Date.now())
      await new Promise((r) => setTimeout(r, espera))
      continue
    }
    if (!res.ok) throw new Error(`${res.status} en ${url}`)
    return res.json()
  }
}

async function todo(url) {
  const items = []
  let siguiente = url
  while (siguiente) {
    const pagina = await pedir(siguiente)
    items.push(...pagina.data)
    siguiente = pagina.pages?.next_url ?? null
  }
  return items
}

const usuario = await pedir(`${BASE}/user`)
console.log(
  `Usuario nivel ${usuario.data.level}, nivel máximo concedido por la suscripción: ${usuario.data.subscription.max_level_granted}`,
)

const materiales = await todo(`${BASE}/study_materials`)
writeFileSync(join(salida, 'study_materials.backup.json'), JSON.stringify(materiales, null, 1))
console.log(`Copia de seguridad: ${materiales.length} study_materials`)

const niveles = Array.from({ length: nivelMax - nivelMin + 1 }, (_, i) => i + nivelMin).join(',')
const subjects = await todo(`${BASE}/subjects?levels=${niveles}`)
writeFileSync(join(salida, 'subjects.json'), JSON.stringify(subjects, null, 1))
const porTipo = subjects.reduce((acc, s) => ((acc[s.object] = (acc[s.object] ?? 0) + 1), acc), {})
console.log(`Subjects de los niveles ${nivelMin}-${nivelMax}:`, porTipo)
