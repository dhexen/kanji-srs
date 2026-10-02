// Cómo se busca en el catálogo (copiado de Hellotalk, lib/buscar.ts).
//
//   · Sin tildes y en minúsculas: «de» y «dé» son la misma búsqueda.
//   · Por trozos sueltos y en cualquier orden: «presente subjuntivo» encuentra
//     «El presente de subjuntivo».

/** Sin tildes y en minúsculas. */
export function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Lo que hay que encontrar, ya normalizado y partido en trozos. */
export function trozos(q: string): string[] {
  return norm(q).split(/\s+/).filter(Boolean)
}

/** ¿Está TODO lo que se busca dentro de ese texto (ya normalizado)? */
export function casa(yaNormalizado: string, ts: string[]): boolean {
  return ts.every(t => yaNormalizado.includes(t))
}

export type Pedazo = { txt: string; marca: boolean }

/**
 * El texto partido en pedazos, marcando los que son lo que se busca. Hace falta
 * porque se busca dentro de las palabras y sin tildes: «llegue» encuentra
 * «llegué», y sin verlo marcado parece que la frase no tenga nada que ver.
 */
export function resalta(texto: string, ts: string[]): Pedazo[] {
  if (!ts.length) return [{ txt: texto, marca: false }]

  // Sin tildes el texto cambia de largo, así que se apunta de qué letra del
  // original sale cada letra del normalizado.
  let plano = ''
  const donde: number[] = []
  for (let i = 0; i < texto.length; i++) {
    const t = norm(texto[i])
    for (let k = 0; k < t.length; k++) donde.push(i)
    plano += t
  }
  donde.push(texto.length)

  const marcado = new Array<boolean>(texto.length).fill(false)
  for (const t of ts) {
    for (let at = plano.indexOf(t); at >= 0; at = plano.indexOf(t, at + 1)) {
      for (let i = donde[at]; i < donde[at + t.length]; i++) marcado[i] = true
    }
  }

  const pedazos: Pedazo[] = []
  for (let i = 0; i < texto.length; i++) {
    const ultimo = pedazos[pedazos.length - 1]
    if (ultimo && ultimo.marca === marcado[i]) ultimo.txt += texto[i]
    else pedazos.push({ txt: texto[i], marca: marcado[i] })
  }
  return pedazos
}

/**
 * De una frase que casa, qué se enseña: la versión donde está lo que se busca
 * y, si esa no es la primera (el japonés), también la primera.
 */
export function loQueSeVe(versiones: string[], ts: string[]): string[] {
  const casada = versiones.find(v => casa(norm(v), ts)) ?? versiones[0]
  const primera = versiones[0]
  return casada === primera ? [casada] : [casada, primera]
}
