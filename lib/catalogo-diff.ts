// Comparar tu frase con la de la ficha (copiado de Hellotalk, lib/diff.ts).
//
// En español se compara palabra a palabra; en japonés, carácter a carácter
// (no hay espacios). Ni la puntuación ni las mayúsculas cuentan como error: el
// punto final lo pone la ficha y no tú. Los acentos sí: «esta» ≠ «está».

export type DiffPart = { type: 'same' | 'del' | 'ins'; text: string }

const IGNORED = /[\p{P}\s]/gu

/** El texto reducido a lo que sí importa, para comparar. */
export const plain = (s: string) => (s ?? '').toLowerCase().replace(IGNORED, '')

/** ¿Dicen lo mismo, aunque no estén escritos igual? */
export const sameText = (a: string, b: string) => plain(a) === plain(b)

function tokenize(s: string, mode: 'word' | 'char'): string[] {
  if (mode === 'char') return Array.from(s)
  return s.split(/(\s+)/).filter(x => x.length > 0)
}

type Paso = { type: 'same' | 'del' | 'ins'; a?: string; b?: string }

function recorrido(original: string, corrected: string, mode: 'word' | 'char'): Paso[] {
  const a = tokenize(original, mode)
  const b = tokenize(corrected, mode)
  const ka = a.map(plain)
  const kb = b.map(plain)
  const eq = (i: number, j: number) => ka[i] === kb[j]

  // Subsecuencia común más larga (las frases son cortas: sobra con la tabla).
  const n = a.length
  const m = b.length
  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = eq(i, j) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
    }
  }

  const pasos: Paso[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (eq(i, j)) {
      pasos.push({ type: 'same', a: a[i], b: b[j] })
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      pasos.push({ type: 'del', a: a[i++] })
    } else {
      pasos.push({ type: 'ins', b: b[j++] })
    }
  }
  while (i < n) pasos.push({ type: 'del', a: a[i++] })
  while (j < m) pasos.push({ type: 'ins', b: b[j++] })
  return pasos
}

function pega(lista: DiffPart[], type: DiffPart['type'], text: string) {
  const last = lista[lista.length - 1]
  if (last && last.type === type) last.text += text
  else lista.push({ type, text })
}

/** Cada frase entera por su lado, con lo que cambia marcado. */
export function diffSides(tuya: string, suya: string, mode: 'word' | 'char'): { tuya: DiffPart[]; suya: DiffPart[] } {
  const izq: DiffPart[] = []
  const der: DiffPart[] = []
  for (const p of recorrido(tuya, suya, mode)) {
    if (p.type === 'same') {
      pega(izq, 'same', p.a ?? '')
      pega(der, 'same', p.b ?? '')
    } else if (p.type === 'del') {
      const t = p.a ?? ''
      pega(izq, plain(t) === '' ? 'same' : 'del', t)
    } else {
      const t = p.b ?? ''
      pega(der, plain(t) === '' ? 'same' : 'ins', t)
    }
  }
  return { tuya: izq, suya: der }
}
