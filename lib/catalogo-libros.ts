// En qué lección de qué libro se estudia cada gramática del catálogo.
//
// Cada ficha guarda una clave de lección (migración 047):
//   '8'       → Minna no Nihongo Shokyū, lección 8 (1–50)
//   'C10'     → Minna no Nihongo Chūkyū, lección 10 (1–12 el tomo I, 13–24 el II)
//   'S2-3-3'  → 日本語総まとめ N2, semana 3, día 3 (igual S1 y S3)
//   'W'       → no es gramática: se aprende como vocabulario
//   'X'       → no sale en ningún libro
//
// Aquí está lo que no cambia: qué libro es cada clave, en qué orden se estudian
// y lo que enseña el libro en cada lección.

import type { CatalogoItem, CatalogoLeccion, Jlpt } from './catalogo'

export type Libro = 'sho' | 'c1' | 'c2' | 's3' | 's2' | 's1' | 'w' | 'x'

export const LIBRO_NOMBRE: Record<Libro, string> = {
  sho: 'Shokyū',
  c1: 'Chūkyū I',
  c2: 'Chūkyū II',
  s3: '総まとめ N3',
  s2: '総まとめ N2',
  s1: '総まとめ N1',
  w: 'Vocabulario',
  x: 'Sin referencia',
}

export const LIBRO_SUB: Record<Libro, string> = {
  sho: 'Minna no Nihongo I y II',
  c1: 'Minna no Nihongo Chūkyū I',
  c2: 'Minna no Nihongo Chūkyū II',
  s3: '日本語総まとめ N3',
  s2: '日本語総まとめ N2',
  s1: '日本語総まとめ N1',
  w: 'Adverbios y palabras sueltas',
  x: 'No salen en ningún libro',
}

export function libroDe(leccion: string | null | undefined): Libro | null {
  if (!leccion) return null
  if (/^\d+$/.test(leccion)) return 'sho'
  const c = leccion.match(/^C(\d+)$/)
  if (c) return +c[1] <= 12 ? 'c1' : 'c2'
  const s = leccion.match(/^S([123])-\d+-\d+$/)
  if (s) return `s${s[1]}` as Libro
  if (leccion === 'W') return 'w'
  if (leccion === 'X') return 'x'
  return null
}

/**
 * Los libros en el orden en que se estudian para un nivel: el Shokyū y el
 * Chūkyū primero; luego el 総まとめ del propio nivel y después los de los otros,
 * del más cercano al más lejano (a igual distancia, el más fácil antes). El
 * vocabulario y lo que no tiene referencia, al final.
 */
export function librosDelNivel(jlpt: Jlpt): Libro[] {
  const n = +jlpt[1]
  const soumatome = [3, 2, 1].sort((a, b) => Math.abs(a - n) - Math.abs(b - n) || b - a)
  return ['sho', 'c1', 'c2', ...soumatome.map(m => `s${m}` as Libro), 'w', 'x']
}

/** Para ordenar las lecciones de un nivel: [libro, lección o semana, día]. */
export function rangoLeccion(jlpt: Jlpt, leccion: string | null | undefined): number[] {
  const libro = libroDe(leccion)
  if (!libro || !leccion) return [99, 0, 0]
  const r = librosDelNivel(jlpt).indexOf(libro)
  if (libro === 'sho') return [r, +leccion, 0]
  if (libro === 'c1' || libro === 'c2') return [r, +leccion.slice(1), 0]
  if (libro[0] === 's') {
    const [, w, d] = leccion.split('-')
    return [r, +w, +d]
  }
  return [r, 0, 0]
}

export function comparaLecciones(jlpt: Jlpt, a: string | null, b: string | null) {
  const ra = rangoLeccion(jlpt, a)
  const rb = rangoLeccion(jlpt, b)
  return ra[0] - rb[0] || ra[1] - rb[1] || ra[2] - rb[2]
}

/** Cómo se nombra una lección: corta para la lista, larga para la ficha. */
export function nombreLeccion(leccion: string | null | undefined): { corta: string; larga: string } {
  const libro = libroDe(leccion)
  if (!libro || !leccion) return { corta: 'Sin colocar', larga: 'Sin colocar' }
  if (libro === 'sho') return { corta: `L${leccion}`, larga: `Shokyū · Lección ${leccion}` }
  if (libro === 'c1' || libro === 'c2') {
    const n = leccion.slice(1)
    return { corta: `L${n}`, larga: `${LIBRO_NOMBRE[libro]} · Lección ${n}` }
  }
  if (libro[0] === 's') {
    const [, w, d] = leccion.split('-')
    return { corta: `S${w}·D${d}`, larga: `${LIBRO_NOMBRE[libro]} · Semana ${w}, día ${d}` }
  }
  return { corta: LIBRO_NOMBRE[libro], larga: LIBRO_NOMBRE[libro] }
}

/** Todas las lecciones de un libro, en orden: para elegir dónde recolocar. */
export function leccionesDe(libro: Libro): string[] {
  if (libro === 'sho') return Array.from({ length: 50 }, (_, i) => String(i + 1))
  if (libro === 'c1') return Array.from({ length: 12 }, (_, i) => `C${i + 1}`)
  if (libro === 'c2') return Array.from({ length: 12 }, (_, i) => `C${i + 13}`)
  if (libro === 'w') return ['W']
  if (libro === 'x') return ['X']
  const pre = `S${libro[1]}-`
  return Object.keys(TEMAS).filter(k => k.startsWith(pre))
}

// ── El tipo: por qué está en esa lección ─────────────────────────────────────

export type TipoLeccion = 'p' | 'v' | 'f' | 'w' | 'x'

export const TIPOS_LECCION: TipoLeccion[] = ['p', 'v', 'f', 'w', 'x']

export const TIPO_LECCION: Record<TipoLeccion, { txt: string; cls: string }> = {
  p: { txt: 'Punto de la lección', cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300' },
  v: { txt: 'En el vocabulario', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' },
  f: { txt: 'Junto a lo más parecido', cls: 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300' },
  w: { txt: 'Vocabulario', cls: 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300' },
  x: { txt: 'Sin referencia', cls: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300' },
}

/** La lección de /grammar-test donde también está: '8' Shokyū, 'C12' Chūkyū. */
export function nombreGrammarTest(x: string | null | undefined): string | null {
  if (!x) return null
  return x.startsWith('C') ? `Chūkyū L${x.slice(1)}` : `L${x}`
}

// ── El orden de un nivel, y recolocar ────────────────────────────────────────

/** Dentro de una lección: su orden, y si no tiene, el de la web. */
export const porOrden = (a: CatalogoItem, b: CatalogoItem) =>
  (a.leccion_orden ?? 1e9) - (b.leccion_orden ?? 1e9) || a.position - b.position

/** Las fichas de un nivel en el orden en que se estudian. */
export function ordenaPorLibro(lista: CatalogoItem[], jlpt: Jlpt): CatalogoItem[] {
  return lista
    .filter(x => x.jlpt === jlpt)
    .sort((a, b) => comparaLecciones(jlpt, a.leccion, b.leccion) || porOrden(a, b))
}

/** Las otras fichas del nivel que están en una lección, en orden. */
export function enLeccion(lista: CatalogoItem[], jlpt: Jlpt, leccion: string, sin?: string): CatalogoItem[] {
  return lista.filter(x => x.jlpt === jlpt && x.leccion === leccion && x.id !== sin).sort(porOrden)
}

/**
 * Mueve una ficha a otra lección (o a otro sitio de la suya) y devuelve lo que
 * cambia: ella y las de las dos lecciones, renumeradas 1, 2, 3… sin huecos.
 * `posicion` empieza en 1.
 */
export function recoloca(
  lista: CatalogoItem[],
  x: CatalogoItem,
  destino: Pick<CatalogoLeccion, 'leccion' | 'leccion_tipo' | 'leccion_nota'> & { posicion: number },
): ({ id: string } & CatalogoLeccion)[] {
  const fila = (y: CatalogoItem): { id: string } & CatalogoLeccion => ({
    id: y.id, leccion: y.leccion, leccion_tipo: y.leccion_tipo, leccion_orden: y.leccion_orden,
    leccion_nota: y.leccion_nota, tambien: y.tambien, grammar_test: y.grammar_test,
  })
  const cambios = new Map<string, { id: string } & CatalogoLeccion>()
  const renumera = (ys: CatalogoItem[]) =>
    ys.forEach((y, i) => {
      if (y.leccion_orden !== i + 1) cambios.set(y.id, { ...(cambios.get(y.id) ?? fila(y)), leccion_orden: i + 1 })
    })

  if (x.leccion && x.leccion !== destino.leccion) renumera(enLeccion(lista, x.jlpt, x.leccion, x.id))
  const nueva = { ...x, leccion: destino.leccion, leccion_tipo: destino.leccion_tipo, leccion_nota: destino.leccion_nota }
  const otras = destino.leccion ? enLeccion(lista, x.jlpt, destino.leccion, x.id) : []
  const sitio = Math.max(0, Math.min(destino.posicion - 1, otras.length))
  cambios.set(x.id, { ...fila(nueva), leccion_orden: sitio + 1 })
  renumera([...otras.slice(0, sitio), { ...nueva, leccion_orden: sitio + 1 }, ...otras.slice(sitio)])
  return Array.from(cambios.values())
}

// ── Lo que enseña el libro en cada lección ───────────────────────────────────
// Shokyū: learnjapaneseaz.com. Chūkyū: índice oficial de 3A Corporation.
// 総まとめ: nihongobu.net, semana a semana.

export const TEMAS: Record<string, string[]> = {
  "1": ["N1 は N2 です", "N1 は N2 じゃありません", "N1 は N2 ですか", "N1 も N2 です", "N1 は N2 の N3 です"],
  "2": ["これ / それ / あれは N です", "そうです/そうじゃありません", "この/その/あの N1 は N2 のです", "これ/それ/あれ N1 ですか、N2 ですか", "これ/それ/あれは N1 の N2 です", "そうですか。"],
  "3": ["ここ / そこ / あそこは N (location) です", "N はどこ / どちらですか。", "N1 は N2 (LOCATION) です", "N1 の N2", "お国はどちらですか"],
  "4": ["いま(は) なんじ / なんぶんですか", "N (location) はいまなんじですか", "The verb ます", "N (indicating time) に＋ V ます", "～から～まで", "N1 と N2", "～ね"],
  "5": ["N (location) + へ + いきます / きます / かえります", "どこ「へ」もいきません / いきませんでした", "N (transportation) + で + いきます / きます/ かえります", "N (people / animals) + と + Verbs", "いつ", "よ"],
  "6": ["The noun + を + The verb", "The noun + を + します", "なん & なに", "Noun (location) + で + Verb", "The verb + ませんか", "The verb + ましょう", "お"],
  "7": ["Noun (tool / medium) + で + Verb", "“Word / sentence”は～ごでなんですか", "The noun (person) にあげます", "The noun (person) にもらいます", "もう Verb ました"],
  "8": ["The noun + the adjective な / い + です", "Adjectives ending な / い + Nouns", "とても and あまり", "The noun + は + どうですか", "Noun 1 + は + どんな Noun 2 ですか", "Question 1 が, Question 2", "どれ"],
  "9": ["The noun + が + あります / わかります", "Noun + が + すきです / きらいです/ じょうずです / へたです", "どんな + Noun", "よく／だいたい／たくさん／すこし／あまり／ぜんぜん", "Question 1, から verse 2", "どうして"],
  "10": ["The noun + が + あります／います", "Noun 1 (location) + に + Noun 2 + が + あります / います", "Noun 1 (place) に + なに/だれ + がありますか / いますか", "Noun 1 は Noun 2 (location) にあります/います", "Noun 1 (object, person, place) の N2 (nouns indicating a position)", "Noun 1 や Noun 2", "Word / phrase ですか？", "チリソースはありませんか"],
  "11": ["どのくらい", "Amount of words (period of time) + に + ~ かい + Verb", "Amount of words / nouns + だけ"],
  "12": ["Divide nouns and adjectives tails [な]", "Divide the time from the tail [い]", "Noun 1 は Noun 2 より + Adjective です", "Adjective 1 と noun 2 とどちらが Adjective ですか", "Noun 1 (のなか) で + なん／どこ／だれ／いつ + がいちばん Adjective ですか"],
  "13": ["The noun が + ほしい + です", "The verb form ます＋たいです", "nouns (places) + へ + nouns / verbs [ます] + にいきます/きます /かえります", "Verb + に + Verb / Verb を Verb", "どこか / なにか", "ごちゅうもんは"],
  "14": ["The verb form て", "The verb form [て] + ください", "The verb form [て] + います", "The verb form [ます] + ましょうか", "Question 1 が, sentence 2", "The noun [が] the verb"],
  "15": ["The verb form て + もいいです", "The verb form て + はいけません", "The verb form て + います", "The verb form て + います", "知（し）りません"],
  "16": ["The verb form て、 [verb form て、] ～", "The adjective ending い→～くて、～", "The noun / adjective ending な（omit な） + で、～", "The verb 1 form てから、 The verb 2", "Noun 1 は Noun 2 が Adjective", "どうやって", "どの"],
  "17": ["The ない form of the verb", "Share the verb [ない]", "The verb form [ない] + ないでください", "The verb form [ない] + なければなりません", "The verb [ない] + なくてもいいです", "Noun (object) は", "The noun (time) + までに + The verb"],
  "18": ["Dictionary form verb こと / noun + ができます", "わたしのしゅみは Dictionary – verb こと / noun です", "Noun の / Dictionary verb verb / Time indicating + まえに + ~", "なかなか + negative verb", "ぜひ"],
  "19": ["The verb form [た]", "The verb form [た]こと + があります", "The verb form [た] り、 The verb form [た] り + します", "なります", "そうですね"],
  "20": ["けど"],
  "21": ["The regular verb ＋と + おもいます", "「the sentence」 / regular form + と + いいます", "Regular verbs / adjectives / nouns + でしょう？", "Noun 1 (place) で Noun 2 があります", "The noun of events + で", "The noun + でも + the verb", "The verb form ないないと。。。"],
  "22": ["The noun + [が]", "The verb dictionary form + じかん / ようじ / やくそく"],
  "23": ["+ とき", "The dictionary verb / the verb た + とき", "The dictionary form verb / the verb form ない + と,~", "The noun が adjective ／ verbs", "Noun (great point) + を + verb"],
  "24": ["くれます", "The verb form て + あげます", "The verb form て + もらいます", "The verb form て + くれます", "The noun (person) が verb", "Question words が verbs"],
  "25": ["The regular form of past tense + ら、。。。", "The verb form た＋ら", "もし and いくら", "The noun + が"],
  "26": ["Normal form + んです", "~ んですか", "~んです", "～んですが～", "The verb form ていただけませんか", "The word in question + the verb form た + ら + いいですか"],
  "27": ["みえます and きこえます", "できます", "は", "も", "しか"],
  "28": ["The verb 1 ながら the verb 2", "verb form て + います", "Normal form し ,~", "それに", "それで"],
  "29": ["The verb form て + います", "The noun + が + the verb form ています", "The noun + は + The verb form ています", "The verb form てしまいます / てしまいました", "The verb form てしまいました", "ありました", "どこかで and どこかに"],
  "30": ["The verb form てあります", "The noun 1 + に + the noun 2 + the verb form てあります", "The noun 2 は the noun 1 に the verb form てあります", "The verb form ておきます", "まだ + verb (affirmative)", "それ"],
  "31": ["Fully noun / verb + よてい", "まだ + verb form て + いません"],
  "32": ["The verb form た / the verb form ない + ほうがいいです", "Verbs, the adjectives in the tail [い], the adjectives in the tail [な], and regular noun", "Verb, adjective adjective [い], adjective adjective [な], and ordinary nouns + かもしれません", "きっと / たぶん / もしかしたら", "Amount of words で"],
  "33": ["[～とよみますか] and [～とかきますか]", "Noun 1 は Noun 2 といういみです", "[Sentence] / ordinary form + と + いっていました", "[Sentence] / regular form + と＋つたえていただけませんか"],
  "34": ["The noun の / The verb + とおりに, The verb", "The noun の / the verb form た +, the verb 2", "The verb form て / the verb form （ない）ないで + Verb 2", "The verb form （ない）ないで, the verb 2"],
  "35": ["Differentiate conditionals with [と] and [たら]", "Interrogative word + conditional verb + いいですか", "Adjective tailed い / な conditional + verb forms ,adjective tailed い, adjective tailed な"],
  "36": ["Verb form / verb form ない + ように ~", "The verb in the form of ようになりました", "Verb form / verb form ない + ようにしています/ください", "とか"],
  "37": ["The noun 1 + は + the noun 2 に + The passive verb", "Noun 1 + は + noun 2 に + Noun 3 を Passive verb", "Noun 1 は Noun 2 によって + Passive verb"],
  "38": ["The regular verb の", "The infinitive verb のは + the adjective です", "The verb in the form of the verb のをわすれました", "The verb in the form of the verb のをしっています", "Ordinary form のは noun です", "～ときも/～ときの/～ときに/～ときや、。。"],
  "39": ["Verb / adjective / noun + て / で, ~", "The noun + で", "Regular form + ので, …", "とちゅうで"],
  "40": ["The word to ask + regular form + か, ~", "Regular form + かどうか,~", "The verb form て + みます", "Adjective ending い (remove [い]), add [さ]", "ハンスはがっこうでどうでしょうか"],
  "41": ["The verb form て + くださいませんか", "Noun に Verb"],
  "42": ["The noun の / the verb in the verb form + ために ,~", "the verb in the verb form / noun + に", "Amount of words は", "Amount of words も"],
  "43": ["そうです", "The verb form て + きます"],
  "44": ["すぎます", "The verb form ます + やすい / にくいです", "Adjectives, nouns + します", "The noun に + します"],
  "45": ["~ + ばあいは,~", "Regular form + のに、～", "The difference between [～のに] and [～が/～ても]"],
  "46": ["ところです", "The verb form た + ばかりです", "+ はずです"],
  "47": ["Regular form + そうです", "Regular form + ようです", "こえ / におい / おと / あじがします"],
  "48": ["Verbs dictate て + いただけませんか"],
  "49": ["Respectful speech (そんけいご)"],
  "C1": ["～てもらえませんか・～ていただけませんか", "～のようだ・～のような・～ように", "～ことは／が／を", "～を～と言う", "～という～", "いつ／どこ／何／だれ／どんなに～ても"],
  "C2": ["～たら、～た", "～というのは～のことだ", "…という～", "…ように言う／注意する／伝える／頼む", "～みたいだ・～みたいな・～みたいに"],
  "C3": ["～（さ）せてもらえませんか", "…ことにする・…ことにしている", "…ことになる・…ことになっている", "～てほしい・～ないでほしい", "～そうな・～なさそう・～そうもない"],
  "C4": ["…ということだ", "…の・…の？", "～ちゃう・～とく・～てる", "～（さ）せられる・～される", "～である", "連用中止", "～（た）がる・～（た）がっている", "…こと・…ということ"],
  "C5": ["あ～・そ～", "…んじゃない？", "～たところに／で", "～（よ）うとする／しない", "…のだろうか", "～との／での／からの／までの／への～", "…だろう・…だろうと思う"],
  "C6": ["…て…・…って…・～って…", "～つもりはない・～つもりだった・～たつもり", "～てばかりいる・～ばかり～ている", "…とか…", "～てくる", "～てくる・～ていく"],
  "C7": ["～なくてはならない／いけない・～なくてもかまわない", "～なくちゃ／～なきゃ", "…だけだ・ただ…だけでいい", "…かな", "～なんか…・…なんて…", "～（さ）せる・～（さ）せられる・～される", "…なら、…"],
  "C8": ["～あいだ、…・～あいだに、…", "～まで、…・～までに、…", "～た～", "～によって…", "～たまま、…・～のまま、…", "…からだ"],
  "C9": ["お～です", "～てもかまわない", "…ほど～ない・…ほどではない", "～ほど～はない／いない", "…ため［に］、…・…ためだ", "～たら／～ば、…た"],
  "C10": ["…はずだ・…はずが／はない・…はずだった", "…ことが／もある", "～た結果、…・～の結果、…", "～出す・～始める・～終わる・～続ける・～忘れる・～合う・～換える"],
  "C11": ["～てくる・～ていく", "～たら［どう］？", "…より…ほうが…", "～らしい", "…らしい", "～として", "～ず［に］…・～ず、…", "～ている"],
  "C12": ["…もの／もんだから", "～（ら）れる（2種）", "～たり～たり", "～っぱなし", "…おかげで・…せいで"],
  "C13": ["～たて", "たとえ～ても", "～たりしない", "～ほど", "…んだって？", "～ながら", "つまり、～と（って）いうことだ", "～よね"],
  "C14": ["～際", "～といった", "～に（も）わたって", "～うちに", "～にとって", "～とは", "～において", "～わけだ", "～のではないだろうか", "～っけ？", "～げ"],
  "C15": ["…という", "～たびに", "～に関する", "～わけではない", "～のではないか", "～のだ", "～ほどのものじゃない", "～だけでなく", "～といえば"],
  "C16": ["～に応じて", "～によって", "～とみられる", "～としている", "～にもかかわらず", "～とともに", "～たところ", "あんまり～から", "～ところだった", "～に限って"],
  "C17": ["～からなる", "～としては", "～上", "～により", "～ことから", "～ざるを得ない", "～てはじめて", "～ったら", "～にしては", "～からには", "～でしょ"],
  "C18": ["～に違いない", "～に比べて", "～ものだ・ものではない", "あった", "だって、…もの", "～たところで", "～だって", "～こそ"],
  "C19": ["～を対象に", "～ばかりでなく", "～にほかならない", "～を通して", "～から～にかけて", "～はともかく", "～ためには", "決して～ない"],
  "C20": ["～のもとで", "そう", "ぞ", "…と同時に", "～しかない", "～の末", "～て以来", "…くらい", "～をこめて", "～ば～だけ", "～たとたん（に）", "～からといって"],
  "C21": ["～もせずに", "～といえども", "よほど～でも", "いかに～か", "…とか。", "～に言わせれば", "～に基づいて", "～と言える", "一方（で）", "～に限らず"],
  "C22": ["～次第だ", "～をもって～とする", "～においては", "～うる", "…のであろう", "～と思われる", "～としても", "～（よ）うにも～ない", "～わりに", "～べきだ", "～というより"],
  "C23": ["～に及ぶ", "…可能性がある", "この～", "～上で", "～につれて", "～ことに", "～恐れのある／がある", "～までもない", "～がきっかけで・～をきっかけに", "～をはじめ"],
  "C24": ["～ざる～", "～から～に至るまで", "～きる", "～ならぬ～", "～さえ～ば", "～として～ない", "～以上（は）", "～ないかぎり", "～わけにはいかない", "～あまり（に）"],
  "S1-1-1": ["〜てこそ", "〜こそあれ", "〜こそすれ", "〜こそ〜が"],
  "S1-1-2": ["〜くらいなら", "〜ぐらいのものだ", "〜ものとして", "〜ものとする"],
  "S1-1-3": ["〜ことのないように", "〜ことなしに", "〜ことだから／〜ことだし", "〜たことにしてください"],
  "S1-1-4": ["〜とされる", "〜が〜される", "〜せられる（自発）", "〜に言わせれば"],
  "S1-1-5": ["〜とみえて", "〜とみられる", "〜とみると", "〜とすれば"],
  "S1-1-6": ["〜ところを", "〜というところだ", "〜たところで", "〜としたところで"],
  "S1-2-1": ["〜なり〜なり", "〜なら〜なりに", "〜なり（すぐ）"],
  "S1-2-2": ["〜であれ〜であれ", "〜ようが〜ようが", "どんなに〜うが"],
  "S1-2-3": ["〜というか、〜というか", "〜うと〜まいと", "〜うか〜まいか", "〜にせよ〜にせよ"],
  "S1-2-4": ["〜だの〜だの", "〜といい、〜といい", "〜が〜なら、〜も〜だ", "〜といわず、〜といわず"],
  "S1-2-5": ["〜ては（条件）", "〜ては〜（繰り返し）", "〜ては〜、〜ては〜", "〜つ〜つ"],
  "S1-2-6": ["〜とも〜とも", "〜たら〜たで", "〜のやら〜のやら", "（QW）〜のやら"],
  "S1-3-1": ["〜までだ", "〜ないまでも", "〜までもない"],
  "S1-3-2": ["〜限りだ", "〜を限りに", "〜に限る", "〜に限ったことではない"],
  "S1-3-3": ["〜とは", "〜とはいえ", "〜といえども", "〜との"],
  "S1-3-4": ["〜を皮切りに", "〜をもって（方法）", "〜をもって（期限）", "〜というもの"],
  "S1-3-5": ["〜や否や", "〜が早いか", "〜たが最後", "〜かと思いきや"],
  "S1-3-6": ["〜そばから", "〜かたわら", "〜がてら", "〜かたがた"],
  "S1-4-1": ["〜なくして〜はない", "〜なしに〜ない", "〜ともなく", "〜ば〜ものを"],
  "S1-4-2": ["〜すら", "〜にして", "〜ともあろう", "〜ともなると", "〜となると"],
  "S1-4-3": ["〜ずくめ", "〜まみれ", "〜ぐるみ", "〜並み"],
  "S1-4-4": ["〜とあって", "〜とあれば", "〜にあって", "〜あっての"],
  "S1-4-5": ["〜からする", "〜たりとも", "〜なりとも", "〜ならでは"],
  "S1-4-6": ["〜なくはない", "〜ないものでもない", "〜とは比べものにならない", "〜ないものか"],
  "S1-5-1": ["〜ずにすんだ", "〜ずにすまない", "〜だけではすまない", "〜ずにはおかない"],
  "S1-5-2": ["〜そうもない", "〜ようがない", "〜よう", "〜ようにも〜ない"],
  "S1-5-3": ["〜ときたら", "〜ときている", "〜ごとく", "〜ごとき"],
  "S1-5-4": ["〜に至った", "〜に至るまで", "〜いかんでは", "〜のいかんにかかわらず"],
  "S1-5-5": ["〜によらず", "〜にとどまらず", "〜と相まって"],
  "S1-5-6": ["〜べく", "〜べくもない", "〜べからず", "〜べからざる"],
  "S1-6-1": ["〜に先駆けて", "〜にもまして", "〜にひきかえ", "〜に即して"],
  "S1-6-2": ["〜つもりで", "〜ままに", "〜ずとも", "〜ずじまい"],
  "S1-6-3": ["〜ながらに", "〜ながらも", "〜もさることながら", "〜手前"],
  "S1-6-4": ["〜ゆえに", "〜んがために", "〜んばかりに", "〜とばかりに"],
  "S1-6-5": ["〜をおいてほかにない", "〜をよそに", "〜を経て", "〜と〜を兼ねて"],
  "S1-6-6": ["〜を踏まえて", "〜を前提として", "〜を境に", "〜折に", "〜を機に"],
  "S1-7-1": ["〜に〜", "〜に〜て／〜に〜た", "〜や〜", "〜という〜"],
  "S1-7-2": ["〜にして", "〜もしないで", "〜だに", "〜こととて"],
  "S1-7-3": ["〜めく", "〜びる", "〜ぶる", "〜ぶり"],
  "S1-7-4": ["〜に耐える", "〜に堪えない", "〜に足る", "〜に足りない"],
  "S1-7-5": ["〜てみせる", "〜もなんともない", "〜といったらない", "〜やしない"],
  "S1-7-6": ["〜ざる", "〜ざるを得ない", "〜には及ばない"],
  "S1-8-1": ["〜はさておき", "〜はどうあれ", "〜はおろか", "〜ならいざ知らず"],
  "S1-8-2": ["〜にはあたらない", "〜に難くない", "〜てやまない", "〜でなくてなんだろう"],
  "S1-8-3": ["〜でも差し支えない", "〜に越したことはない", "〜ばきりがない"],
  "S1-8-4": ["〜を禁じ得ない", "〜を余儀なくされた", "〜嫌いがある", "〜始末だ"],
  "S1-8-5": ["〜極まる／極まりない", "〜の極み", "〜の至り"],
  "S1-8-6": ["〜かれ〜かれ", "〜につけ〜につけ", "〜をものともせずに", "〜じゃあるまいし", "〜にあるまじき"],
  "S2-1-1": ["〜がち", "〜げ", "〜っぽい", "〜気味"],
  "S2-1-2": ["〜ものだから", "〜ものなら", "〜ものの", "〜もの／〜もん"],
  "S2-1-3": ["〜はともかく", "〜はまだしも", "〜はもとより〜も", "〜は抜きにして"],
  "S2-1-4": ["〜てかなわない", "〜てしょうがない", "〜てたまらない", "〜てならない"],
  "S2-1-5": ["〜ずにはいられない", "〜ないことはない", "〜ないこともない", "〜ないではいられない"],
  "S2-1-6": ["〜ていられない", "〜てはならない", "〜てばかりはいられない", "〜ねばならない"],
  "S2-2-1": ["〜かいがあって", "〜かいもなく", "〜がい", "〜てまで／〜まで〜て"],
  "S2-2-2": ["〜える／〜うる", "〜かける", "〜切る", "〜抜く"],
  "S2-2-3": ["〜うちに", "〜か〜ないかのうちに", "〜に限り／〜に限らず〜も／〜に限って", "〜限り"],
  "S2-2-4": ["〜からこそ", "〜さえ〜ば", "〜てこそ", "〜ばかりだ"],
  "S2-2-5": ["〜としたら", "〜としても", "〜にしたら", "〜を〜として"],
  "S2-2-6": ["〜とともに", "〜にしたがって", "〜につれて", "〜にともなって"],
  "S2-3-1": ["〜あまり", "〜ことに", "〜とおり", "〜まま（受身）"],
  "S2-3-2": ["〜わけがない", "〜わけだ", "〜わけではない", "〜わけにはいかない"],
  "S2-3-3": ["〜あげく", "〜かと思ったら", "〜たとたん", "〜末"],
  "S2-3-4": ["〜たところ（わかった）", "〜ところに／〜ところへ／〜ところを", "〜ところ（ちょうど）", "〜どころか", "〜どころではない"],
  "S2-3-5": ["〜きり", "〜だらけ", "〜っぱなし"],
  "S2-3-6": ["〜に反して", "〜一方だ（悪化）", "〜一方（反対）", "〜反面"],
  "S2-4-1": ["〜の上では", "〜上で", "〜上に", "〜上は"],
  "S2-4-2": ["〜向け", "〜次第だ（〜わけだ）", "〜次第で（決まる）", "〜次第（すぐに）"],
  "S2-4-3": ["〜にかかわって", "〜にこたえて", "〜により／〜によって（原因）", "〜により／〜によって（方法）", "〜により／〜によって（違う）", "〜に対して"],
  "S2-4-4": ["〜くせして", "〜つつ", "〜つつある", "〜ながら（逆接）"],
  "S2-4-5": ["〜ことになっている", "〜ざるをえない", "〜にすぎない", "〜べきではない"],
  "S2-4-6": ["〜にあたり", "〜にわたって", "〜に先立ち", "〜に沿って"],
  "S2-5-1": ["〜かねない", "〜かねる", "〜がたい", "〜っこない"],
  "S2-5-2": ["〜ことから", "〜ことなく", "〜ないことには〜ない", "〜のことだから"],
  "S2-5-3": ["〜だけましだ", "〜て当然だ", "〜のももっともだ", "〜も同然だ"],
  "S2-5-4": ["〜だけあって", "〜のみならず〜も", "〜ばかりか〜も", "〜ばかりに"],
  "S2-5-5": ["〜かのようだ", "〜そうにない", "〜ようがない", "〜ようではないか"],
  "S2-5-6": ["〜に基づいて", "〜に応じて", "〜に際して", "〜の下で"],
  "S2-6-1": ["〜からには", "〜以上", "〜以来（ずっと）", "〜折には"],
  "S2-6-2": ["〜からして", "〜からすると", "〜から見ると", "〜から言うと"],
  "S2-6-3": ["〜から〜にかけて", "〜からといって", "〜てからでないと", "〜にかけては"],
  "S2-6-4": ["〜か〜まいか", "〜とか（伝聞）", "〜まい", "〜まい（否定）"],
  "S2-6-5": ["〜とは限らない", "〜にほかならない", "〜に決まっている", "〜よりほかない"],
  "S2-6-6": ["〜において", "〜にて", "〜をはじめ", "〜をめぐって"],
  "S2-7-1": ["〜にかかわらず", "〜にもかかわらず", "〜もかまわず", "〜を問わず"],
  "S2-7-2": ["〜にしろ〜にしろ", "〜につけ〜につけ", "〜も〜ば〜も〜", "〜やら〜やら"],
  "S2-7-3": ["〜というものだ", "〜ものか", "〜ものだ（当然・希望）", "〜ものではない"],
  "S2-7-4": ["〜をこめて", "〜を中心に", "〜を通じて", "〜を頼りに"],
  "S2-7-5": ["〜ば〜というものでもない", "〜ものがある", "〜恐れがある", "どうにか〜ないものか"],
  "S2-7-6": ["〜につき", "〜をきっかけに", "〜をもとに", "〜際に"],
  "S2-8-1": ["それで", "それでも", "それなのに", "それなら"],
  "S2-8-2": ["そういえば", "そこで", "それが", "それはそうと"],
  "S2-8-3": ["あるいは", "すなわち", "だが", "だって"],
  "S2-8-4": ["〜ということは", "〜というのは", "したがって", "ただし"],
  "S2-8-5": ["さて", "すると", "なお", "もっとも"],
  "S2-8-6": ["おまけに", "しかも", "ちなみに", "要するに"],
  "S3-1-1": ["〜せてください", "〜に〜れた（迷惑受身）", "〜れている（非情の受身）"],
  "S3-1-2": ["〜ちゃった／〜じゃった", "〜とく／〜どく", "〜ないと／〜なくちゃ"],
  "S3-1-3": ["〜っぽい", "〜みたいだ（①よく似ている）", "〜みたいだ（②推察）", "〜みたいだ（③例示）", "〜らしい（典型的）"],
  "S3-1-4": ["〜ようにしましょう", "〜ようになった", "〜ように（目的）"],
  "S3-1-5": ["〜ように（前置き）", "〜ように（命令）", "〜ように（願望）"],
  "S3-1-6": ["〜ようとしない", "〜ようとする", "〜ようと思う"],
  "S3-2-1": ["〜こそ／〜からこそ", "〜さえ", "〜だけしか", "〜ばかり（だけ）"],
  "S3-2-2": ["〜について", "〜によって（①方法・手段）", "〜によって（②違う）", "〜によって（③原因）", "〜によれば／〜によると", "〜に関して"],
  "S3-2-3": ["〜こと（名詞化）", "〜の（名詞化）", "（形容詞）さ", "（形容詞）み"],
  "S3-2-4": ["〜という", "〜というのは", "〜というの／〜ということ"],
  "S3-2-5": ["〜というと／〜といえば／〜といったら", "〜というより／〜というか", "〜といっても"],
  "S3-2-6": ["〜てくれと頼まれる／言われる", "〜てごらん", "〜なと言われる", "〜ように言う／頼む"],
  "S3-3-1": ["〜ずに", "〜ても", "どんなに〜ても"],
  "S3-3-2": ["〜としたら", "〜として", "〜にしては", "〜にしても"],
  "S3-3-3": ["〜たものだ（回想）", "〜つもりでした", "〜はずがない", "〜はずだ", "〜べきだ"],
  "S3-3-4": ["〜たとたん", "〜たびに", "〜ついでに", "〜最中に"],
  "S3-3-5": ["〜きり", "〜っぱなし", "〜とおり／〜どおり", "〜まま"],
  "S3-3-6": ["〜がる／〜がらないで", "〜てほしい", "〜ふりをする"],
  "S3-4-1": ["〜くせに", "〜なんか／〜なんて／〜など", "〜にとって", "〜わりには"],
  "S3-4-2": ["〜おかげ", "〜かわりに", "〜せいで", "〜にかわって／〜にかわり"],
  "S3-4-3": ["〜くらい〜は〜ない", "〜くらい／〜ほど", "〜ば〜ほど", "〜ほど（比例）"],
  "S3-4-4": ["〜ことだ（アドバイス）", "〜ことはない", "〜ということだ（①伝聞）", "〜ということだ（②意味・言い換え）", "どんなに〜ことか"],
  "S3-4-5": ["〜しかない", "〜っけ", "〜んだって", "〜んだもん"],
  "S3-4-6": ["そのため（①原因）", "そのため（②目的）", "その結果", "つまり", "なぜなら"],
  "S3-5-1": ["〜に対して（①対象）", "〜に対して（②反対に）", "〜に比べて", "〜はもちろん", "〜ばかりか"],
  "S3-5-2": ["〜かけ", "〜たて", "〜上げる", "〜切る／切れない"],
  "S3-5-3": ["〜かなあ", "〜といいなあ／〜たらいいなあ", "〜ば〜のに／〜たら〜のに", "〜ばよかった／〜たらよかった"],
  "S3-5-4": ["〜から〜にかけて", "〜において", "〜まで（極端）", "〜まで（続く）"],
  "S3-5-5": ["たとえ〜ても", "まるで〜よう", "もしかすると／もしかしたら〜かもしれない", "必ずしも〜とは限らない"],
  "S3-5-6": ["だけど", "ですから", "ところが", "ところで"],
  "S3-6-1": ["もし〜たなら", "もし〜としても", "もしも"],
  "S3-6-2": ["〜ことなる／〜ことになっている", "〜ことにする／〜ことにしている", "〜ことは〜が", "〜ないことはない"],
  "S3-6-3": ["〜うちに", "〜たところ", "〜てはじめて", "〜ところだった"],
  "S3-6-4": ["〜わけがない", "〜わけだ", "〜わけではない（①特に〜じゃない）", "〜わけではない（②もちろん〜。ではない）", "〜わけにはいかない"],
  "S3-6-5": ["まったく〜ない", "めったに〜ない", "少しも〜ない", "決して〜ない"],
  "S3-6-6": ["その上", "それと", "それとも"],
}
