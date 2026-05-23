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

// ─── CHAPTER 31 ───────────────────────────────────────────────────────────────
const ch31: GrammarPoint[] = [
  {
    id: 'mnn2-31-1', lesson: 31, number: 8, jlpt: 'N4',
    pattern: '普通形 + かもしれません',
    name_es: 'Quizás ~ / Puede que ~',
    name_ca: 'Potser ~ / Pot ser que ~',
    name_en: 'Maybe ~ / Might ~',
    explanation_es: 'Expresa posibilidad o incertidumbre. La probabilidad es inferior a でしょう y no implica ninguna evidencia. Plain form + かもしれません. Para な-adj y N: sin だ en afirmativa.',
    explanation_ca: 'Expressa possibilitat o incertesa. La probabilitat és inferior a でしょう i no implica cap evidència. Forma curta + かもしれません. Per a な-adj i N: sense だ en afirmativa.',
    explanation_en: 'Expresses possibility or uncertainty. Lower probability than でしょう and implies no evidence. Plain form + かもしれません. For な-adj and N: no だ in affirmative.',
    structure: [
      { text: 'S (普通形)', role: 'noun', isSlot: true, label_es: 'oración (forma corta)', label_ca: 'oració (forma curta)', label_en: 'clause (plain form)' },
      { text: 'かもしれません', role: 'key', isSlot: false },
    ],
    example: [
      { text: '明日は', furigana: 'あしたは', role: 'time', gloss_es: 'mañana', gloss_ca: 'demà', gloss_en: 'tomorrow' },
      { text: '雨が', furigana: 'あめが', role: 'subject', gloss_es: 'lluvia', gloss_ca: 'pluja', gloss_en: 'rain' },
      { text: '降る', furigana: 'ふる', role: 'verb', gloss_es: 'caerá', gloss_ca: 'caurà', gloss_en: 'will fall' },
      { text: 'かもしれません', role: 'key', gloss_es: 'quizás', gloss_ca: 'potser', gloss_en: 'might' },
    ],
    tip_es: 'Escala de certeza: かもしれません (quizás, ~30%) < でしょう (probablemente, ~70%) < はずです (se supone que, expectativa lógica). Coloquial: かも。',
    tip_ca: 'Escala de certesa: かもしれません (potser, ~30%) < でしょう (probablement, ~70%) < はずです (se suposa que, expectativa lògica). Col·loquial: かも。',
    tip_en: 'Certainty scale: かもしれません (maybe, ~30%) < でしょう (probably, ~70%) < はずです (should/supposed to, logical expectation). Colloquial: かも。',
  },
  {
    id: 'mnn2-31-2', lesson: 31, number: 9, jlpt: 'N4',
    pattern: '普通形 + でしょう',
    name_es: 'Probablemente ~ / Creo que ~ (certeza alta)',
    name_ca: 'Probablement ~ / Crec que ~ (certesa alta)',
    name_en: 'Probably ~ / I think ~ (high certainty)',
    explanation_es: 'Expresa conjetura con mayor probabilidad que かもしれません. También se usa para pedir confirmación (con entonación ascendente: でしょう↗). Para な-adj y N: sin だ en afirmativa.',
    explanation_ca: 'Expressa conjectura amb major probabilitat que かもしれません. També s\'usa per demanar confirmació (amb entonació ascendent: でしょう↗). Per a な-adj i N: sense だ en afirmativa.',
    explanation_en: 'Expresses conjecture with higher probability than かもしれません. Also used to ask for confirmation (with rising intonation: でしょう↗). For な-adj and N: no だ in affirmative.',
    structure: [
      { text: 'S (普通形)', role: 'noun', isSlot: true, label_es: 'oración (forma corta)', label_ca: 'oració (forma curta)', label_en: 'clause (plain form)' },
      { text: 'でしょう', role: 'key', isSlot: false },
    ],
    example: [
      { text: '彼は', furigana: 'かれは', role: 'topic', gloss_es: 'él', gloss_ca: 'ell', gloss_en: 'he' },
      { text: 'もう', role: 'noun', gloss_es: 'ya', gloss_ca: 'ja', gloss_en: 'already' },
      { text: '家に', furigana: 'いえに', role: 'direction', gloss_es: 'a casa', gloss_ca: 'a casa', gloss_en: 'home' },
      { text: '帰った', furigana: 'かえった', role: 'verb', gloss_es: 'volvió', gloss_ca: 'va tornar', gloss_en: 'went home' },
      { text: 'でしょう', role: 'key', gloss_es: 'probablemente', gloss_ca: 'probablement', gloss_en: 'probably' },
    ],
    tip_es: 'Formal: でしょう. Casual/informal: だろう. Con entonación ascendente でしょう↗ = "¿verdad? ¿no?" (buscando confirmación).',
    tip_ca: 'Formal: でしょう. Col·loquial/informal: だろう. Amb entonació ascendent でしょう↗ = "oi? ¿oi que sí?" (buscant confirmació).',
    tip_en: 'Formal: でしょう. Casual/informal: だろう. With rising intonation でしょう↗ = "right? isn\'t it?" (seeking confirmation).',
  },
  {
    id: 'mnn2-31-3', lesson: 31, number: 10, jlpt: 'N4',
    pattern: '普通形 + はずです',
    name_es: 'Debería ~ / Se supone que ~ (expectativa lógica)',
    name_ca: 'Hauria de ~ / Se suposa que ~ (expectativa lògica)',
    name_en: 'Should ~ / Is supposed to ~ (logical expectation)',
    explanation_es: 'Expresa que el hablante espera algo basándose en evidencia o conocimiento previo. No es una orden, sino una deducción lógica. はずがありません = no puede ser que.',
    explanation_ca: 'Expressa que el parlant espera alguna cosa basant-se en evidència o coneixement previ. No és una ordre, sinó una deducció lògica. はずがありません = no pot ser que.',
    explanation_en: 'Expresses that the speaker expects something based on evidence or prior knowledge. Not an obligation, but a logical deduction. はずがありません = there is no way that.',
    structure: [
      { text: 'S (普通形)', role: 'noun', isSlot: true, label_es: 'oración (forma corta)', label_ca: 'oració (forma curta)', label_en: 'clause (plain form)' },
      { text: 'はずです', role: 'key', isSlot: false },
    ],
    example: [
      { text: '彼女は', furigana: 'かのじょは', role: 'topic', gloss_es: 'ella', gloss_ca: 'ella', gloss_en: 'she' },
      { text: 'もう', role: 'noun', gloss_es: 'ya', gloss_ca: 'ja', gloss_en: 'already' },
      { text: '知っている', furigana: 'しっている', role: 'verb', gloss_es: 'sabe', gloss_ca: 'sap', gloss_en: 'knows' },
      { text: 'はずです', role: 'key', gloss_es: 'debería (lo sé)', gloss_ca: 'hauria (ho sé)', gloss_en: 'should (I know so)' },
    ],
    tip_es: 'はずです vs でしょう: はずです se basa en evidencia o lógica concreta. でしょう es una suposición más vaga. "彼はもう知っているはずです" = tengo razón para creerlo.',
    tip_ca: 'はずです vs でしょう: はずです es basa en evidència o lògica concreta. でしょう és una suposició més vaga. "彼はもう知っているはずです" = tinc raó per creure-ho.',
    tip_en: 'はずです vs でしょう: はずです is based on concrete evidence or logic. でしょう is a vaguer assumption. "彼はもう知っているはずです" = I have reason to believe it.',
  },
]

// ─── CHAPTER 32 ───────────────────────────────────────────────────────────────
const ch32: GrammarPoint[] = [
  {
    id: 'mnn2-32-1', lesson: 32, number: 11, jlpt: 'N4',
    pattern: 'S₁ のに、S₂',
    name_es: 'Aunque ~ / A pesar de ~ (resultado inesperado / queja)',
    name_ca: 'Tot i que ~ / Malgrat ~ (resultat inesperat / queixa)',
    name_en: 'Although ~ / Despite ~ (unexpected result / complaint)',
    explanation_es: '「のに」 une dos oraciones cuando el resultado es inesperado o frustrante. Implica una queja o decepción del hablante. S₁ es la condición esperada, S₂ es la realidad contraria. S₁ va en forma corta.',
    explanation_ca: '「のに」 uneix dues oracions quan el resultat és inesperat o frustrant. Implica una queixa o decepció del parlant. S₁ és la condició esperada, S₂ és la realitat contrària. S₁ va en forma curta.',
    explanation_en: '「のに」 connects two clauses when the result is unexpected or frustrating. Implies the speaker\'s complaint or disappointment. S₁ is the expected condition; S₂ is the contrary reality. S₁ is in plain form.',
    structure: [
      { text: 'S₁ (普通形)', role: 'noun', isSlot: true, label_es: 'condición (forma corta)', label_ca: 'condició (forma curta)', label_en: 'condition (plain form)' },
      { text: 'のに', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado inesperado', label_ca: 'resultat inesperat', label_en: 'unexpected result' },
    ],
    example: [
      { text: '一生懸命', furigana: 'いっしょうけんめい', role: 'noun', gloss_es: 'con esfuerzo', gloss_ca: 'amb esforç', gloss_en: 'hard' },
      { text: '勉強した', furigana: 'べんきょうした', role: 'verb', gloss_es: 'estudié', gloss_ca: 'vaig estudiar', gloss_en: 'I studied' },
      { text: 'のに', role: 'key', gloss_es: 'aunque', gloss_ca: 'tot i que', gloss_en: 'despite' },
      { text: '試験に', furigana: 'しけんに', role: 'location', gloss_es: 'al examen', gloss_ca: "a l'examen", gloss_en: 'the exam' },
      { text: '落ちました', furigana: 'おちました', role: 'verb', gloss_es: 'suspendí', gloss_ca: 'vaig suspendre', gloss_en: 'I failed' },
    ],
    tip_es: 'のに siempre lleva emoción negativa (queja, decepción, sorpresa adversa). No uses のに para contraste neutro — en ese caso usa が o けど.',
    tip_ca: 'のに sempre porta emoció negativa (queixa, decepció, sorpresa adversa). No facis servir のに per a contrast neutre — en aquest cas usa が o けど.',
    tip_en: 'のに always carries negative emotion (complaint, disappointment, adverse surprise). Don\'t use のに for neutral contrast — use が or けど instead.',
  },
  {
    id: 'mnn2-32-2', lesson: 32, number: 12, jlpt: 'N4',
    pattern: 'V て form / adj + も',
    name_es: 'Aunque ~ / Incluso si ~ (concesivo)',
    name_ca: 'Encara que ~ / Fins i tot si ~ (concessiu)',
    name_en: 'Even if ~ / Even though ~ (concessive)',
    explanation_es: 'Expresa que la segunda acción/estado ocurre independientemente de la primera. V て form + も. い-adj: adj くても. な-adj/N: adj/N でも. Indica que la condición no cambia el resultado.',
    explanation_ca: "Expressa que la segona acció/estat ocorre independentment de la primera. V て form + も. い-adj: adj くても. な-adj/N: adj/N でも. Indica que la condició no canvia el resultat.",
    explanation_en: 'Expresses that the second action/state occurs regardless of the first. V て-form + も. い-adj: adj くても. な-adj/N: adj/N でも. Indicates the condition does not change the outcome.',
    structure: [
      { text: 'V て / adj く / N で', role: 'verb', isSlot: true, label_es: 'condición (て/く/で)', label_ca: 'condició (て/く/で)', label_en: 'condition (て/く/で)' },
      { text: 'も', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado (no cambia)', label_ca: 'resultat (no canvia)', label_en: 'result (unchanged)' },
    ],
    example: [
      { text: '雨が', furigana: 'あめが', role: 'subject', gloss_es: 'lluvia', gloss_ca: 'pluja', gloss_en: 'rain' },
      { text: '降っ', furigana: 'ふっ', role: 'verb', gloss_es: 'caiga', gloss_ca: 'caigui', gloss_en: 'falls' },
      { text: 'ても', role: 'key', gloss_es: 'aunque', gloss_ca: 'encara que', gloss_en: 'even if' },
      { text: '行きます', furigana: 'いきます', role: 'verb', gloss_es: 'iré', gloss_ca: 'aniré', gloss_en: "I'll go" },
    ],
    tip_es: 'のに vs ても: ても es neutro (hecho o hipótesis). のに lleva decepción/queja. "雨が降っても行きます" (ても, neutro) vs "雨が降ったのに行った" (のに, queja).',
    tip_ca: 'のに vs ても: ても és neutre (fet o hipòtesi). のに porta decepció/queixa. "雨が降っても行きます" (ても, neutre) vs "雨が降ったのに行った" (のに, queixa).',
    tip_en: 'のに vs ても: ても is neutral (fact or hypothesis). のに carries disappointment/complaint. "雨が降っても行きます" (ても, neutral) vs "雨が降ったのに行った" (のに, complaint).',
  },
]

// ─── CHAPTER 33 ───────────────────────────────────────────────────────────────
const ch33: GrammarPoint[] = [
  {
    id: 'mnn2-33-1', lesson: 33, number: 13, jlpt: 'N4',
    pattern: 'S なら / N なら',
    name_es: 'Si ~ (condicional de tema) / En el caso de que sea ~',
    name_ca: 'Si ~ (condicional de tema) / En el cas que sigui ~',
    name_en: 'If ~ (topic-based conditional) / In the case of ~',
    explanation_es: '「なら」 es una condicional que asume la situación del interlocutor como punto de partida. "Si es el caso de que X, entonces Y". Responde implícitamente a algo que se acaba de decir o que se sabe. S + なら o N + なら.',
    explanation_ca: '「なら」 és una condicional que assumeix la situació de l\'interlocutor com a punt de partida. "Si és el cas que X, aleshores Y". Respon implícitament a alguna cosa que s\'acaba de dir o que se sap. S + なら o N + なら.',
    explanation_en: '「なら」 is a conditional that takes the listener\'s situation as its starting point. "If that\'s the case, then Y". Implicitly responds to something just said or known. S + なら or N + なら.',
    structure: [
      { text: 'S / N', role: 'noun', isSlot: true, label_es: 'condición/tema asumido', label_ca: 'condició/tema assumit', label_en: 'assumed condition/topic' },
      { text: 'なら', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'recomendación / consecuencia', label_ca: 'recomanació / conseqüència', label_en: 'recommendation / consequence' },
    ],
    example: [
      { text: '京都に', furigana: 'きょうとに', role: 'direction', gloss_es: 'a Kioto', gloss_ca: 'a Kyoto', gloss_en: 'to Kyoto' },
      { text: '行く', furigana: 'いく', role: 'verb', gloss_es: 'vas a ir', gloss_ca: "vas anar", gloss_en: 'you\'re going' },
      { text: 'なら', role: 'key', gloss_es: 'si es así', gloss_ca: 'si és així', gloss_en: 'if that\'s the case' },
      { text: 'バスが', role: 'subject', gloss_es: 'el autobús', gloss_ca: "l'autobús", gloss_en: 'the bus' },
      { text: '便利ですよ', furigana: 'べんりですよ', role: 'adjective', gloss_es: 'es conveniente', gloss_ca: 'és convenient', gloss_en: 'is convenient' },
    ],
    tip_es: 'なら asume la premisa del oyente, no la del hablante. Si alguien dice "voy a Kioto", puedes responder "京都なら〜". Es una condicional reactiva, no hipotética.',
    tip_ca: 'なら assumeix la premissa de l\'oient, no la del parlant. Si algú diu "vaig a Kyoto", pots respondre "京都なら〜". És una condicional reactiva, no hipotètica.',
    tip_en: 'なら assumes the listener\'s premise, not the speaker\'s. If someone says "I\'m going to Kyoto", you can reply "京都なら〜". It\'s a reactive, not hypothetical, conditional.',
  },
  {
    id: 'mnn2-33-2', lesson: 33, number: 14, jlpt: 'N4',
    pattern: 'V ば / adj ければ / N であれば (condicional ば)',
    name_es: 'Si ~ (condicional hipotético / formal)',
    name_ca: 'Si ~ (condicional hipotètic / formal)',
    name_en: 'If ~ (hypothetical / formal conditional)',
    explanation_es: 'La condicional ば expresa "si X ocurre, entonces Y". Formación — Verbos: final う→えば (食べる→食べれば, 書く→書けば). い-adj: い→ければ. な-adj/N: であれば. Uso frecuente en proverbios y frases fijas.',
    explanation_ca: "La condicional ば expressa \"si X ocorre, aleshores Y\". Formació — Verbs: final う→えば (食べる→食べれば, 書く→書けば). い-adj: い→ければ. な-adj/N: であれば. Ús freqüent en proverbis i frases fixes.",
    explanation_en: 'The ば conditional expresses "if X happens, then Y". Formation — Verbs: final う→えば (食べる→食べれば, 書く→書けば). い-adj: い→ければ. な-adj/N: であれば. Common in proverbs and fixed phrases.',
    structure: [
      { text: 'V う→えば / adj い→ければ', role: 'key', isSlot: true, label_es: 'condición (forma ば)', label_ca: 'condició (forma ば)', label_en: 'condition (ば form)' },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado / consecuencia', label_ca: 'resultat / conseqüència', label_en: 'result / consequence' },
    ],
    example: [
      { text: '早く', furigana: 'はやく', role: 'adjective', gloss_es: 'pronto', gloss_ca: 'aviat', gloss_en: 'early' },
      { text: '起きれば', furigana: 'おきれば', role: 'key', gloss_es: 'si me levanto', gloss_ca: "si m'aixeco", gloss_en: 'if I get up' },
      { text: '電車に', furigana: 'でんしゃに', role: 'direction', gloss_es: 'el tren', gloss_ca: 'el tren', gloss_en: 'the train' },
      { text: '乗れます', furigana: 'のれます', role: 'verb', gloss_es: 'puedo coger', gloss_ca: 'puc agafar', gloss_en: 'I can catch' },
    ],
    tip_es: 'ば vs たら: ば es más formal y habitual en proverbios. たら es más versátil y cotidiana. "早く起きれば" (ば) vs "早く起きたら" (たら) — ambas correctas pero con matices.',
    tip_ca: 'ば vs たら: ば és més formal i habitual en proverbis. たら és més versàtil i quotidiana. "早く起きれば" (ば) vs "早く起きたら" (たら) — totes dues correctes però amb matisos.',
    tip_en: 'ば vs たら: ば is more formal and common in proverbs. たら is more versatile and everyday. "早く起きれば" (ば) vs "早く起きたら" (たら) — both correct with subtle differences.',
  },
]

// ─── CHAPTER 34 ───────────────────────────────────────────────────────────────
const ch34: GrammarPoint[] = [
  {
    id: 'mnn2-34-1', lesson: 34, number: 15, jlpt: 'N4',
    pattern: 'N しか V ません',
    name_es: 'Solo ~ (con verbo negativo)',
    name_ca: 'Només ~ (amb verb negatiu)',
    name_en: 'Only ~ (with negative verb)',
    explanation_es: '「しか〜ない」 significa "solo/únicamente". Siempre va con un verbo en forma negativa (ません, ない). しか reemplaza la partícula を/が. Tiene énfasis de LIMITACIÓN o INSUFICIENCIA, a diferencia de だけ (neutral).',
    explanation_ca: '「しか〜ない」 significa "només/únicament". Sempre va amb un verb en forma negativa (ません, ない). しか reemplaça la partícula を/が. Té èmfasi de LIMITACIÓ o INSUFICIÈNCIA, a diferència de だけ (neutre).',
    explanation_en: '「しか〜ない」 means "only/just". Always used with a negative verb (ません, ない). しか replaces the particle を/が. Emphasizes LIMITATION or INSUFFICIENCY, unlike だけ (neutral).',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'lo único', label_ca: "l'únic", label_en: 'the only thing' },
      { text: 'しか', role: 'key', isSlot: false },
      { text: 'V ません', role: 'verb', isSlot: true, label_es: 'verbo (negativo)', label_ca: 'verb (negatiu)', label_en: 'verb (negative)' },
    ],
    example: [
      { text: '財布に', furigana: 'さいふに', role: 'location', gloss_es: 'en la cartera', gloss_ca: 'a la cartera', gloss_en: 'in my wallet' },
      { text: '100円', furigana: 'ひゃくえん', role: 'noun', gloss_es: '100 yenes', gloss_ca: '100 yens', gloss_en: '100 yen' },
      { text: 'しか', role: 'key', gloss_es: 'solo', gloss_ca: 'només', gloss_en: 'only' },
      { text: 'ありません', role: 'verb', gloss_es: 'hay (neg.)', gloss_ca: 'hi ha (neg.)', gloss_en: 'there is (neg.)' },
    ],
    tip_es: 'しか vs だけ: "100円しかない" = solo 100 ¥ (poca cantidad, insuficiente). "100円だけある" = hay justo 100 ¥ (neutro). しか siempre requiere negativo.',
    tip_ca: 'しか vs だけ: "100円しかない" = només 100 ¥ (poca quantitat, insuficient). "100円だけある" = hi ha just 100 ¥ (neutre). しか sempre requereix negatiu.',
    tip_en: 'しか vs だけ: "100円しかない" = only 100 ¥ (small amount, insufficient). "100円だけある" = there are just 100 ¥ (neutral). しか always requires a negative verb.',
  },
  {
    id: 'mnn2-34-2', lesson: 34, number: 16, jlpt: 'N4',
    pattern: 'V 辞書形 こと に します / こと に なりました',
    name_es: 'Decidir hacer ~ / Se ha decidido que ~',
    name_ca: 'Decidir fer ~ / S\'ha decidit que ~',
    name_en: 'Decide to do ~ / It has been decided that ~',
    explanation_es: 'ことにします: decisión personal y voluntaria del hablante. ことになりました: decisión externa, circunstancial o impersonal (no del hablante). La diferencia está en quién decide.',
    explanation_ca: "ことにします: decisió personal i voluntària del parlant. ことになりました: decisió externa, circumstancial o impersonal (no del parlant). La diferència és qui decideix.",
    explanation_en: 'ことにします: personal, voluntary decision of the speaker. ことになりました: external, circumstantial or impersonal decision (not by the speaker). The difference is who decides.',
    structure: [
      { text: 'V 辞書形 / V ない', role: 'verb', isSlot: true, label_es: 'acción (V dicc. / V ない)', label_ca: 'acció (V dicc. / V ない)', label_en: 'action (V dict. / V ない)' },
      { text: 'ことに', role: 'key', isSlot: false },
      { text: 'します / なりました', role: 'key', isSlot: false },
    ],
    example: [
      { text: '来年', furigana: 'らいねん', role: 'time', gloss_es: 'el año que viene', gloss_ca: "l'any que ve", gloss_en: 'next year' },
      { text: '日本に', furigana: 'にほんに', role: 'direction', gloss_es: 'a Japón', gloss_ca: 'al Japó', gloss_en: 'to Japan' },
      { text: '行く', furigana: 'いく', role: 'verb', gloss_es: 'ir', gloss_ca: 'anar', gloss_en: 'go' },
      { text: 'ことにしました', role: 'key', gloss_es: 'he decidido', gloss_ca: 'he decidit', gloss_en: 'I have decided' },
    ],
    tip_es: '"ことにしました" = yo decidí. "ことになりました" = resultó que / fue decidido (por circunstancias o terceros). "転勤することになりました" = me trasladan (decisión de la empresa).',
    tip_ca: '"ことにしました" = jo vaig decidir. "ことになりました" = va resultar que / va ser decidit (per circumstàncies o tercers). "転勤することになりました" = em traslladen (decisió de l\'empresa).',
    tip_en: '"ことにしました" = I decided. "ことになりました" = it turned out / was decided (by circumstances or others). "転勤することになりました" = I\'m being transferred (company\'s decision).',
  },
]

// ─── CHAPTER 35 ───────────────────────────────────────────────────────────────
const ch35: GrammarPoint[] = [
  {
    id: 'mnn2-35-1', lesson: 35, number: 17, jlpt: 'N4',
    pattern: '〜 という N',
    name_es: 'Llamado ~ / Que se llama ~',
    name_ca: 'Anomenat ~ / Que es diu ~',
    name_en: 'Called ~ / Named ~ / A thing called ~',
    explanation_es: '「という」 se usa para presentar un nombre o definir una cosa. N₁ という N₂ = "N₂ que se llama N₁". También se usa para parafrasear: "〜というのは〜ということです" (lo que se llama X significa Y).',
    explanation_ca: '「という」 s\'usa per presentar un nom o definir una cosa. N₁ という N₂ = "N₂ que es diu N₁". També s\'usa per parafrasejar: "〜というのは〜ということです" (el que s\'anomena X significa Y).',
    explanation_en: '「という」 is used to introduce a name or define something. N₁ という N₂ = "an N₂ called N₁". Also used to paraphrase: "〜というのは〜ということです" (what is called X means Y).',
    structure: [
      { text: 'N₁ / S', role: 'noun', isSlot: true, label_es: 'nombre / contenido', label_ca: 'nom / contingut', label_en: 'name / content' },
      { text: 'という', role: 'key', isSlot: false },
      { text: 'N₂', role: 'noun', isSlot: true, label_es: 'sustantivo clasificado', label_ca: 'substantiu classificat', label_en: 'classified noun' },
    ],
    example: [
      { text: '「侘び寂び」', furigana: 'わびさび', role: 'noun', gloss_es: '"wabi-sabi"', gloss_ca: '"wabi-sabi"', gloss_en: '"wabi-sabi"' },
      { text: 'という', role: 'key', gloss_es: 'llamada', gloss_ca: 'anomenada', gloss_en: 'called' },
      { text: '日本の', furigana: 'にほんの', role: 'noun', gloss_es: 'filosofía japonesa', gloss_ca: 'filosofia japonesa', gloss_en: 'Japanese' },
      { text: '美意識', furigana: 'びいしき', role: 'noun', gloss_es: 'de la belleza', gloss_ca: 'de la bellesa', gloss_en: 'aesthetic sense' },
    ],
    tip_es: 'Otros usos: "〜ということを聞きました" (oí que...). "〜というのは" = en cuanto a lo que se llama X / el concepto de X. Muy útil para definiciones y explicaciones.',
    tip_ca: 'Altres usos: "〜ということを聞きました" (vaig sentir que...). "〜というのは" = pel que fa al que s\'anomena X / el concepte de X. Molt útil per a definicions i explicacions.',
    tip_en: 'Other uses: "〜ということを聞きました" (I heard that...). "〜というのは" = as for what is called X / the concept of X. Very useful for definitions and explanations.',
  },
  {
    id: 'mnn2-35-2', lesson: 35, number: 18, jlpt: 'N4',
    pattern: 'V stem + すぎます',
    name_es: 'Demasiado ~ / Exceso de ~',
    name_ca: 'Massa ~ / Excés de ~',
    name_en: 'Too much ~ / Excessively ~',
    explanation_es: '「すぎます」 indica exceso. Se añade al stem del verbo (forma ます sin ます) o al stem del adjetivo. い-adj: い→すぎます. な-adj: な→すぎます. Negativo: V すぎません (no demasiado).',
    explanation_ca: '「すぎます」 indica excés. S\'afegeix al stem del verb (forma ます sense ます) o al stem de l\'adjectiu. い-adj: い→すぎます. な-adj: な→すぎます. Negatiu: V すぎません (no massa).',
    explanation_en: '「すぎます」 indicates excess. Added to the verb stem (ます-form without ます) or adjective stem. い-adj: い→すぎます. な-adj: な→すぎます. Negative: V すぎません (not too much).',
    structure: [
      { text: 'V stem / adj stem', role: 'verb', isSlot: true, label_es: 'stem verbo / adj', label_ca: 'stem verb / adj', label_en: 'verb / adj stem' },
      { text: 'すぎます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '昨日', furigana: 'きのう', role: 'time', gloss_es: 'ayer', gloss_ca: 'ahir', gloss_en: 'yesterday' },
      { text: '食べ', furigana: 'たべ', role: 'verb', gloss_es: 'comer', gloss_ca: 'menjar', gloss_en: 'eat' },
      { text: 'すぎて', role: 'key', gloss_es: 'demasiado (por eso)', gloss_ca: 'massa (per això)', gloss_en: 'too much (so)' },
      { text: 'お腹が', furigana: 'おなかが', role: 'subject', gloss_es: 'barriga', gloss_ca: 'panxa', gloss_en: 'stomach' },
      { text: '痛いです', furigana: 'いたいです', role: 'adjective', gloss_es: 'me duele', gloss_ca: 'em fa mal', gloss_en: 'hurts' },
    ],
    tip_es: 'すぎて + consecuencia es muy natural: "食べすぎて気持ち悪い". Para adjetivos: "高すぎる" (demasiado caro), "難しすぎる" (demasiado difícil).',
    tip_ca: 'すぎて + conseqüència és molt natural: "食べすぎて気持ち悪い". Per a adjectius: "高すぎる" (massa car), "難しすぎる" (massa difícil).',
    tip_en: 'すぎて + consequence is very natural: "食べすぎて気持ち悪い" (ate too much and feel sick). For adjectives: "高すぎる" (too expensive), "難しすぎる" (too difficult).',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Export — batches 1-2: lessons 26-35
// ─────────────────────────────────────────────────────────────────────────────

export const MNN2_GRAMMAR_POINTS: GrammarPoint[] = [
  ...ch26,
  ...ch27,
  ...ch28,
  ...ch29,
  ...ch30,
  ...ch31,
  ...ch32,
  ...ch33,
  ...ch34,
  ...ch35,
]
