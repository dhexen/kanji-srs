// Grammar data: Minna no Nihongo 2, Chapters 26-50
import type { GrammarPoint } from './grammar-mnn1'

// ─── CHAPTER 26 ───────────────────────────────────────────────────────────────
const ch26: GrammarPoint[] = [
  {
    id: 'mnn2-26-1', lesson: 26, number: 1, jlpt: 'N4',
    pattern: '普通形 + のです / んです',
    name_es: 'Dar una explicación / Pedir razón',
    name_ca: 'Donar una explicació / Demanar raó',
    name_en: 'Explanation / Asking for reason',
    explanation_es: '「のです/んです」 se usa para dar una explicación sobre una situación observable, o para pedir una. Muestra que el hablante tiene información de fondo que justifica lo que dice o pregunta. んです es la forma coloquial de のです.',
    explanation_ca: '「のです/んです」 s\'usa per donar una explicació sobre una situació observable, o per demanar-ne una. Mostra que el parlant té informació de fons que justifica el que diu o pregunta. んです és la forma col·loquial de のです.',
    explanation_en: '「のです/んです」 is used to give an explanation for an observable situation, or to ask for one. It signals that the speaker has background information justifying what they say or ask. んです is the colloquial form of のです.',
    structure: [
      { text: 'S', role: 'noun', isSlot: true, label_es: 'oración (forma corta)', label_ca: 'oració (forma curta)', label_en: 'clause (plain form)' },
      { text: 'のです', role: 'key', isSlot: false },
    ],
    example: [
      { text: '頭が', furigana: 'あたまが', role: 'subject', gloss_es: 'la cabeza', gloss_ca: 'el cap', gloss_en: 'head' },
      { text: '痛い', furigana: 'いたい', role: 'adjective', gloss_es: 'me duele', gloss_ca: 'em fa mal', gloss_en: 'hurts' },
      { text: 'んです', role: 'key', gloss_es: '(explicación)', gloss_ca: '(explicació)', gloss_en: '(explanation)' },
    ],
    tip_es: 'Compara: "頭が痛いです" (hecho neutro) vs "頭が痛いんです" (explicando por qué no puedes venir, etc.). Para preguntar: "どうしたんですか" = "¿qué te pasa?".',
    tip_ca: 'Compara: "頭が痛いです" (fet neutre) vs "頭が痛いんです" (explicant per què no pots venir, etc.). Per preguntar: "どうしたんですか" = "Què et passa?".',
    tip_en: 'Compare: "頭が痛いです" (neutral fact) vs "頭が痛いんです" (explaining why you can\'t come, etc.). To ask: "どうしたんですか" = "What\'s wrong?".',
  },
]

// ─── CHAPTER 27 ───────────────────────────────────────────────────────────────
const ch27: GrammarPoint[] = [
  {
    id: 'mnn2-27-1', lesson: 27, number: 2, jlpt: 'N4',
    pattern: 'V て あります',
    name_es: 'Estado resultante (intencional) ~ está hecho',
    name_ca: 'Estat resultant (intencional) ~ està fet',
    name_en: 'Resultant state (intentional) ~ has been done',
    explanation_es: '「V て あります」 describe un estado resultante de una acción intencional hecha por alguien. Se usa un verbo transitivo. La partícula suele ser が (no を). Contrasta con ています: あります implica intención previa.',
    explanation_ca: '「V て あります」 descriu un estat resultant d\'una acció intencional feta per algú. S\'usa un verb transitiu. La partícula sol ser が (no を). Contrasta amb ています: あります implica intenció prèvia.',
    explanation_en: '「V て あります」 describes a resultant state from an intentional action by someone. Uses a transitive verb. The particle is usually が (not を). Contrasts with ています: あります implies prior intention.',
    structure: [
      { text: 'N', role: 'subject', isSlot: true, label_es: 'objeto resultante (が)', label_ca: 'objecte resultant (が)', label_en: 'resultant object (が)' },
      { text: 'が', role: 'subject', isSlot: false },
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo transitivo (forma て)', label_ca: 'verb transitiu (forma て)', label_en: 'transitive verb (te-form)' },
      { text: 'あります', role: 'key', isSlot: false },
    ],
    example: [
      { text: '窓が', furigana: 'まどが', role: 'subject', gloss_es: 'la ventana', gloss_ca: 'la finestra', gloss_en: 'the window' },
      { text: '開けて', furigana: 'あけて', role: 'verb', gloss_es: 'abrir', gloss_ca: 'obrir', gloss_en: 'open' },
      { text: 'あります', role: 'key', gloss_es: 'está abierta (a propósito)', gloss_ca: 'és oberta (a propòsit)', gloss_en: 'has been left open' },
    ],
    tip_es: 'Diferencia clave: "窓が開いています" = la ventana está abierta (observación). "窓が開けてあります" = la ventana está abierta (alguien la dejó así a propósito).',
    tip_ca: "Diferència clau: \"窓が開いています\" = la finestra és oberta (observació). \"窓が開けてあります\" = la finestra és oberta (algú la va deixar oberta a propòsit).",
    tip_en: 'Key difference: "窓が開いています" = the window is open (observation). "窓が開けてあります" = the window has been opened [intentionally, by someone].',
  },
  {
    id: 'mnn2-27-2', lesson: 27, number: 3, jlpt: 'N4',
    pattern: 'V て いく / V て くる',
    name_es: 'Cambio que se aleja / se acerca (aspecto direccional)',
    name_ca: 'Canvi que s\'allunya / s\'acosta (aspecte direccional)',
    name_en: 'Change going away / coming toward (directional aspect)',
    explanation_es: '「V て いく」: la acción/cambio se desplaza o continúa hacia el futuro (alejándose del presente). 「V て くる」: la acción/cambio viene hacia el presente o el hablante (ha ido ocurriendo hasta ahora).',
    explanation_ca: '「V て いく」: l\'acció/canvi es desplaça o continua cap al futur (allunyant-se del present). 「V て くる」: l\'acció/canvi ve cap al present o el parlant (ha anat passant fins ara).',
    explanation_en: '「V て いく」: the action/change moves or continues away from the present (toward the future). 「V て くる」: the action/change moves toward the present or speaker (has been happening up to now).',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo (forma て)', label_ca: 'verb (forma て)', label_en: 'verb (te-form)' },
      { text: 'いく', role: 'key', isSlot: false },
      { text: '/ てくる', role: 'key', isSlot: false },
    ],
    example: [
      { text: '日本語が', furigana: 'にほんごが', role: 'subject', gloss_es: 'el japonés', gloss_ca: 'el japonès', gloss_en: 'Japanese' },
      { text: '上手に', furigana: 'じょうずに', role: 'adjective', gloss_es: 'mejor', gloss_ca: 'millor', gloss_en: 'better' },
      { text: 'なって', role: 'verb', gloss_es: 'volverse', gloss_ca: 'tornar-se', gloss_en: 'become' },
      { text: 'きました', role: 'key', gloss_es: 'ha ido (hasta ahora)', gloss_ca: 'ha anat (fins ara)', gloss_en: 'has been getting' },
    ],
    tip_es: 'てくる = cambio que llegó al presente ("cada vez mejor"). ていく = cambio que continuará ("seguirá mejorando"). Para movimiento físico: 持ってきて (trae) vs 持っていって (lleva).',
    tip_ca: 'てくる = canvi que ha arribat al present ("cada vegada millor"). ていく = canvi que continuarà ("continuarà millorant"). Per moviment físic: 持ってきて (porta) vs 持っていって (porta allà).',
    tip_en: 'てくる = change that has reached the present ("has been getting"). ていく = change that will continue ("will keep going"). For physical movement: 持ってきて (bring here) vs 持っていって (take there).',
  },
]

// ─── CHAPTER 28 ───────────────────────────────────────────────────────────────
const ch28: GrammarPoint[] = [
  {
    id: 'mnn2-28-1', lesson: 28, number: 4, jlpt: 'N4',
    pattern: '[V / adj 普通形] + N (oración de relativo)',
    name_es: 'Cláusula de relativo / Modificar sustantivos con verbos',
    name_ca: 'Clàusula de relatiu / Modificar substantius amb verbs',
    name_en: 'Relative clause / Modifying nouns with verbs',
    explanation_es: 'En japonés, la cláusula que modifica un sustantivo va ANTES del sustantivo. No hay "que/who/which". Verbo o adjetivo en forma corta + N directamente. El sujeto del relativo lleva が (no は).',
    explanation_ca: 'En japonès, la clàusula que modifica un substantiu va ABANS del substantiu. No hi ha "que/who/which". Verb o adjectiu en forma curta + N directament. El subjecte del relatiu porta が (no は).',
    explanation_en: 'In Japanese, the modifying clause comes BEFORE the noun. There is no "who/which/that" connector. Verb or adjective in plain form + N directly. The relative clause subject takes が (not は).',
    structure: [
      { text: '[V / adj 普通形]', role: 'verb', isSlot: true, label_es: 'verbo/adj (forma corta)', label_ca: 'verb/adj (forma curta)', label_en: 'verb/adj (plain form)' },
      { text: 'N', role: 'noun', isSlot: true, label_es: 'sustantivo modificado', label_ca: 'substantiu modificat', label_en: 'modified noun' },
    ],
    example: [
      { text: '昨日', furigana: 'きのう', role: 'time', gloss_es: 'ayer', gloss_ca: 'ahir', gloss_en: 'yesterday' },
      { text: '買った', furigana: 'かった', role: 'verb', gloss_es: 'compré', gloss_ca: 'vaig comprar', gloss_en: 'bought' },
      { text: '本は', furigana: 'ほんは', role: 'topic', gloss_es: 'el libro (que)', gloss_ca: 'el llibre (que)', gloss_en: 'the book (that)' },
      { text: 'おもしろかった', role: 'adjective', gloss_es: 'era interesante', gloss_ca: 'era interessant', gloss_en: 'was interesting' },
      { text: 'です', role: 'copula', gloss_es: 'era', gloss_ca: 'era', gloss_en: 'was' },
    ],
    tip_es: '"昨日買った本" = "el libro que compré ayer". El orden es inverso al español/catalán/inglés: toda la cláusula precede al sustantivo. El sujeto del relativo toma が: "田中さんが作った料理" (la comida que hizo Tanaka).',
    tip_ca: '"昨日買った本" = "el llibre que vaig comprar ahir". L\'ordre és invers al castellà/català/anglès: tota la clàusula precedeix el substantiu. El subjecte del relatiu pren が: "田中さんが作った料理" (el menjar que va fer Tanaka).',
    tip_en: '"昨日買った本" = "the book that I bought yesterday". Order is reversed: the entire clause precedes the noun. The relative clause subject takes が: "田中さんが作った料理" (the dish that Tanaka made).',
  },
]

// ─── CHAPTER 29 ───────────────────────────────────────────────────────────────
const ch29: GrammarPoint[] = [
  {
    id: 'mnn2-29-1', lesson: 29, number: 5, jlpt: 'N4',
    pattern: 'V 可能形 (forma potencial)',
    name_es: 'Forma potencial: poder hacer ~',
    name_ca: 'Forma potencial: poder fer ~',
    name_en: 'Potential form: can do ~',
    explanation_es: 'La forma potencial expresa habilidad o posibilidad. Formación — Grupo 1: く→ける, ぐ→げる, す→せる, つ→てる, ぬ→ねる, ぶ→べる, む→める, る→れる, う→える. Grupo 2: る→られる. Irregular: する→できる, くる→こられる.',
    explanation_ca: 'La forma potencial expressa habilitat o possibilitat. Formació — Grup 1: く→ける, ぐ→げる, す→せる, つ→てる, ぬ→ねる, ぶ→べる, む→める, る→れる, う→える. Grup 2: る→られる. Irregular: する→できる, くる→こられる.',
    explanation_en: 'The potential form expresses ability or possibility. Formation — Group 1: く→ける, ぐ→げる, す→せる, つ→てる, ぬ→ねる, ぶ→べる, む→める, る→れる, う→える. Group 2: る→られる. Irregular: する→できる, くる→こられる.',
    structure: [
      { text: 'V', role: 'verb', isSlot: true, label_es: 'verbo (forma potencial)', label_ca: 'verb (forma potencial)', label_en: 'verb (potential form)' },
      { text: 'られる / える', role: 'key', isSlot: false },
    ],
    example: [
      { text: '私は', furigana: 'わたしは', role: 'topic', gloss_es: 'Yo', gloss_ca: 'Jo', gloss_en: 'I' },
      { text: '漢字が', furigana: 'かんじが', role: 'subject', gloss_es: 'kanji', gloss_ca: 'kanji', gloss_en: 'kanji' },
      { text: '読め', furigana: 'よめ', role: 'verb', gloss_es: 'leer', gloss_ca: 'llegir', gloss_en: 'read' },
      { text: 'ます', role: 'key', gloss_es: 'puedo', gloss_ca: 'puc', gloss_en: 'can' },
    ],
    tip_es: 'Con la forma potencial, el objeto directo puede ser が o を. "日本語が話せます" / "日本語を話せます" — ambas son correctas. が es más frecuente en escrito formal.',
    tip_ca: 'Amb la forma potencial, l\'objecte directe pot ser が o を. "日本語が話せます" / "日本語を話せます" — totes dues són correctes. が és més freqüent en escrit formal.',
    tip_en: 'With the potential form, the direct object can be が or を. "日本語が話せます" / "日本語を話せます" — both are correct. が is more common in formal writing.',
  },
]

// ─── CHAPTER 30 ───────────────────────────────────────────────────────────────
const ch30: GrammarPoint[] = [
  {
    id: 'mnn2-30-1', lesson: 30, number: 6, jlpt: 'N4',
    pattern: 'V 辞書形 ために / N の ために',
    name_es: 'Para ~ / Con el objetivo de ~ (propósito intencional)',
    name_ca: 'Per ~ / Amb l\'objectiu de ~ (propòsit intencional)',
    name_en: 'In order to ~ / For the purpose of ~ (intentional goal)',
    explanation_es: '「ために」 expresa propósito intencional consciente. El sujeto de la cláusula ために y la principal suelen ser el mismo. Con verbos: V 辞書形 + ために. Con sustantivos: N の + ために. El sujeto hace A deliberadamente para conseguir B.',
    explanation_ca: '「ために」 expressa propòsit intencional conscient. El subjecte de la clàusula ために i la principal solen ser el mateix. Amb verbs: V 辞書形 + ために. Amb substantius: N の + ために. El subjecte fa A deliberadament per aconseguir B.',
    explanation_en: '「ために」 expresses a conscious, intentional purpose. The subject of the ために clause and main clause are usually the same. With verbs: V dictionary form + ために. With nouns: N の + ために. The subject deliberately does A to achieve B.',
    structure: [
      { text: 'V 辞書形 / N の', role: 'verb', isSlot: true, label_es: 'propósito (V dicc. / N の)', label_ca: 'propòsit (V dicc. / N の)', label_en: 'purpose (V dict. / N の)' },
      { text: 'ために', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción para lograr el propósito', label_ca: 'acció per assolir el propòsit', label_en: 'action to achieve the purpose' },
    ],
    example: [
      { text: '日本語を', furigana: 'にほんごを', role: 'object', gloss_es: 'japonés', gloss_ca: 'japonès', gloss_en: 'Japanese' },
      { text: '勉強する', furigana: 'べんきょうする', role: 'verb', gloss_es: 'estudiar', gloss_ca: 'estudiar', gloss_en: 'study' },
      { text: 'ために', role: 'key', gloss_es: 'para', gloss_ca: 'per', gloss_en: 'in order to' },
      { text: '日本に', furigana: 'にほんに', role: 'direction', gloss_es: 'a Japón', gloss_ca: 'al Japó', gloss_en: 'to Japan' },
      { text: '来ました', furigana: 'きました', role: 'verb', gloss_es: 'vine', gloss_ca: 'vaig venir', gloss_en: 'I came' },
    ],
    tip_es: 'ために vs ように: ために = sujeto elige activamente hacer A para lograr B (volitional). ように = hace A para que llegue a pasar B (non-volitional / state change). "泳げるように練習する" (ように) vs "泳ぐために練習する" (ために).',
    tip_ca: 'ために vs ように: ために = el subjecte tria activament fer A per aconseguir B (volitional). ように = fa A perquè passi B (no volitional / canvi d\'estat). "泳げるように練習する" (ように) vs "泳ぐために練習する" (ために).',
    tip_en: 'ために vs ように: ために = subject actively chooses to do A to achieve B (volitional). ように = does A so that B comes about (non-volitional / state change). "泳げるように練習する" (ように) vs "泳ぐために練習する" (ために).',
  },
  {
    id: 'mnn2-30-2', lesson: 30, number: 7, jlpt: 'N4',
    pattern: 'V 辞書形 / V ない + ように',
    name_es: 'Para que ~ / De modo que ~ (propósito no volitivo)',
    name_ca: 'Perquè ~ / De manera que ~ (propòsit no volitiu)',
    name_en: 'So that ~ / In order to ~ (non-volitional purpose)',
    explanation_es: '「ように」 expresa propósito orientado a un estado o habilidad, no a una acción directa. Se usa cuando el resultado es no volitivo o se desea que algo ocurra. V ないように = para evitar que...',
    explanation_ca: '「ように」 expressa propòsit orientat cap a un estat o habilitat, no cap a una acció directa. S\'usa quan el resultat és no volitiu o es desitja que passi alguna cosa. V ないように = per evitar que...',
    explanation_en: '「ように」 expresses purpose oriented toward a state or ability, not a direct action. Used when the result is non-volitional or when you want something to happen. V ないように = so as not to...',
    structure: [
      { text: 'V 辞書形 / V ない', role: 'verb', isSlot: true, label_es: 'V (dicc.) / V ない', label_ca: 'V (dicc.) / V ない', label_en: 'V (dict.) / V ない' },
      { text: 'ように', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción principal', label_ca: 'acció principal', label_en: 'main action' },
    ],
    example: [
      { text: '忘れない', furigana: 'わすれない', role: 'verb', gloss_es: 'no olvidar', gloss_ca: 'no oblidar', gloss_en: 'not forget' },
      { text: 'ように', role: 'key', gloss_es: 'para no', gloss_ca: 'per no', gloss_en: 'so as not to' },
      { text: 'メモを', role: 'object', gloss_es: 'notas', gloss_ca: 'notes', gloss_en: 'notes' },
      { text: '取ります', furigana: 'とります', role: 'verb', gloss_es: 'tomo', gloss_ca: 'prenc', gloss_en: 'I take' },
    ],
    tip_es: 'También se usa con imperativos/peticiones: "遅れないように来てください" (ven sin llegar tarde). O a los dioses: "試験に合格できるように祈ります" (rezo para poder aprobar).',
    tip_ca: 'També s\'usa amb imperatius/peticions: "遅れないように来てください" (vine sense arribar tard). O als déus: "試験に合格できるように祈ります" (reso per poder aprovar).',
    tip_en: 'Also used with commands/requests: "遅れないように来てください" (please come without being late). Or prayers: "試験に合格できるように祈ります" (I pray so that I can pass the exam).',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Export — batch 1: lessons 26-30
// ─────────────────────────────────────────────────────────────────────────────

export const MNN2_GRAMMAR_POINTS: GrammarPoint[] = [
  ...ch26,
  ...ch27,
  ...ch28,
  ...ch29,
  ...ch30,
]
