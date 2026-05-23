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

// ─── CHAPTER 36 ───────────────────────────────────────────────────────────────
const ch36: GrammarPoint[] = [
  {
    id: 'mnn2-36-1', lesson: 36, number: 19, jlpt: 'N4',
    pattern: 'N について',
    name_es: 'Sobre ~ / Acerca de ~ / Respecto a ~',
    name_ca: 'Sobre ~ / Pel que fa a ~ / Respecte a ~',
    name_en: 'About ~ / Regarding ~ / Concerning ~',
    explanation_es: '「について」 indica el tema de una acción como hablar, escribir, pensar, preguntar, etc. Se adjunta directamente al sustantivo. についての + N = sustantivo modificado por el tema.',
    explanation_ca: '「について」 indica el tema d\'una acció com parlar, escriure, pensar, preguntar, etc. S\'adjunta directament al substantiu. についての + N = substantiu modificat pel tema.',
    explanation_en: '「について」 indicates the topic of an action like speaking, writing, thinking, asking, etc. Attaches directly to a noun. についての + N = noun modified by the topic.',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'tema', label_ca: 'tema', label_en: 'topic' },
      { text: 'について', role: 'key', isSlot: false },
      { text: 'V', role: 'verb', isSlot: true, label_es: 'hablar / escribir / pensar...', label_ca: 'parlar / escriure / pensar...', label_en: 'speak / write / think...' },
    ],
    example: [
      { text: '日本の文化', furigana: 'にほんのぶんか', role: 'noun', gloss_es: 'cultura japonesa', gloss_ca: 'cultura japonesa', gloss_en: 'Japanese culture' },
      { text: 'について', role: 'key', gloss_es: 'sobre', gloss_ca: 'sobre', gloss_en: 'about' },
      { text: '調べました', furigana: 'しらべました', role: 'verb', gloss_es: 'investigué', gloss_ca: 'vaig investigar', gloss_en: 'I researched' },
    ],
    tip_es: 'についての + N: "日本の文化についての本" (un libro sobre la cultura japonesa). に関して (にかんして) es sinónimo más formal. について modifica acciones, no atributos.',
    tip_ca: 'についての + N: "日本の文化についての本" (un llibre sobre la cultura japonesa). に関して (にかんして) és sinònim més formal. について modifica accions, no atributs.',
    tip_en: 'についての + N: "日本の文化についての本" (a book about Japanese culture). に関して (にかんして) is a more formal synonym. について modifies actions, not attributes.',
  },
  {
    id: 'mnn2-36-2', lesson: 36, number: 20, jlpt: 'N4',
    pattern: 'N によって',
    name_es: 'Dependiendo de ~ / Por medio de ~ / Según ~',
    name_ca: 'Depenent de ~ / Per mitjà de ~ / Segons ~',
    name_en: 'Depending on ~ / By means of ~ / According to ~',
    explanation_es: '「によって」 tiene varios usos: (1) agente en pasiva formal (〜によって作られた), (2) medio o método (〜によって解決する), (3) variación según condición (人によって違う).',
    explanation_ca: '「によって」 té diversos usos: (1) agent en passiva formal (〜によって作られた), (2) mitjà o mètode (〜によって解決する), (3) variació segons condició (人によって違う).',
    explanation_en: '「によって」 has several uses: (1) agent in formal passive (〜によって作られた), (2) means or method (〜によって解決する), (3) variation depending on condition (人によって違う).',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'agente / medio / factor', label_ca: 'agent / mitjà / factor', label_en: 'agent / means / factor' },
      { text: 'によって', role: 'key', isSlot: false },
    ],
    example: [
      { text: '人', furigana: 'ひと', role: 'noun', gloss_es: 'persona', gloss_ca: 'persona', gloss_en: 'person' },
      { text: 'によって', role: 'key', gloss_es: 'según', gloss_ca: 'segons', gloss_en: 'depending on' },
      { text: '考え方が', furigana: 'かんがえかたが', role: 'subject', gloss_es: 'la forma de pensar', gloss_ca: 'la manera de pensar', gloss_en: 'way of thinking' },
      { text: '違います', furigana: 'ちがいます', role: 'verb', gloss_es: 'varía', gloss_ca: 'varia', gloss_en: 'differs' },
    ],
    tip_es: 'Tres usos: (1) Pasiva: "ピカソによって描かれた" (pintado por Picasso). (2) Método: "練習によって上手になる" (mejorar mediante la práctica). (3) Variación: "季節によって変わる" (cambia según la estación).',
    tip_ca: 'Tres usos: (1) Passiva: "ピカソによって描かれた" (pintat per Picasso). (2) Mètode: "練習によって上手になる" (millorar mitjançant la pràctica). (3) Variació: "季節によって変わる" (canvia segons l\'estació).',
    tip_en: 'Three uses: (1) Passive: "ピカソによって描かれた" (painted by Picasso). (2) Method: "練習によって上手になる" (improve through practice). (3) Variation: "季節によって変わる" (changes depending on the season).',
  },
]

// ─── CHAPTER 37 ───────────────────────────────────────────────────────────────
const ch37: GrammarPoint[] = [
  {
    id: 'mnn2-37-1', lesson: 37, number: 21, jlpt: 'N4',
    pattern: 'V stem + やすい / にくい',
    name_es: 'Fácil de ~ / Difícil de ~',
    name_ca: 'Fàcil de ~ / Difícil de ~',
    name_en: 'Easy to ~ / Difficult to ~',
    explanation_es: 'やすい / にくい se añaden al stem del verbo (forma ます sin ます). Expresan facilidad o dificultad para realizar una acción. Se conjugan como adjetivos-い.',
    explanation_ca: 'やすい / にくい s\'afegeixen al stem del verb (forma ます sense ます). Expressen facilitat o dificultat per realitzar una acció. Es conjuguen com a adjectius-い.',
    explanation_en: 'やすい / にくい attach to the verb stem (ます-form without ます). Express ease or difficulty of an action. They conjugate as い-adjectives.',
    structure: [
      { text: 'V stem', role: 'verb', isSlot: true, label_es: 'stem del verbo', label_ca: 'stem del verb', label_en: 'verb stem' },
      { text: 'やすい', role: 'key', isSlot: false },
      { text: '/ にくい', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'この本は', furigana: 'このほんは', role: 'topic', gloss_es: 'este libro', gloss_ca: 'aquest llibre', gloss_en: 'this book' },
      { text: '読み', furigana: 'よみ', role: 'verb', gloss_es: 'leer', gloss_ca: 'llegir', gloss_en: 'read' },
      { text: 'やすい', role: 'key', gloss_es: 'fácil de', gloss_ca: 'fàcil de', gloss_en: 'easy to' },
      { text: 'です', role: 'copula', gloss_es: 'es', gloss_ca: 'és', gloss_en: 'is' },
    ],
    tip_es: '"読みやすい本" (un libro fácil de leer). Pasado: やすかった / にくかった. "このペンは書きにくい" (este bolígrafo es difícil de escribir con).',
    tip_ca: '"読みやすい本" (un llibre fàcil de llegir). Passat: やすかった / にくかった. "このペンは書きにくい" (aquest bolígraf és difícil d\'escriure).',
    tip_en: '"読みやすい本" (a book that is easy to read). Past: やすかった / にくかった. "このペンは書きにくい" (this pen is difficult to write with).',
  },
  {
    id: 'mnn2-37-2', lesson: 37, number: 22, jlpt: 'N4',
    pattern: 'S₁ 間 / 間に、S₂',
    name_es: 'Mientras ~ / Durante ~',
    name_ca: 'Mentre ~ / Durant ~',
    name_en: 'While ~ / During ~',
    explanation_es: '「間」(あいだ): S₁ y S₂ ocurren durante el mismo período. 「間に」(あいだに): S₂ ocurre en algún momento DENTRO del período de S₁ (cambio de foco). V ている間 = mientras está V-ando.',
    explanation_ca: '「間」(あいだ): S₁ i S₂ ocorren durant el mateix període. 「間に」(あいだに): S₂ ocorre en algun moment DINS del període de S₁ (canvi de focus). V ている間 = mentre està V-ant.',
    explanation_en: '「間」(あいだ): S₁ and S₂ occur throughout the same period. 「間に」(あいだに): S₂ occurs at some point WITHIN the period of S₁ (focus shift). V ている間 = while V-ing.',
    structure: [
      { text: 'V ている / N の', role: 'verb', isSlot: true, label_es: 'período (V ている / N の)', label_ca: 'període (V ている / N の)', label_en: 'period (V ている / N の)' },
      { text: '間（に）', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'acción durante el período', label_ca: 'acció durant el període', label_en: 'action during the period' },
    ],
    example: [
      { text: '先生が', furigana: 'せんせいが', role: 'subject', gloss_es: 'el profesor', gloss_ca: 'el professor', gloss_en: 'the teacher' },
      { text: '説明している', furigana: 'せつめいしている', role: 'verb', gloss_es: 'estaba explicando', gloss_ca: 'estava explicant', gloss_en: 'was explaining' },
      { text: '間に', role: 'key', gloss_es: 'durante / mientras', gloss_ca: 'durant / mentre', gloss_en: 'while / during' },
      { text: '寝て', furigana: 'ねて', role: 'verb', gloss_es: 'me dormí', gloss_ca: 'em vaig adormir', gloss_en: 'I fell asleep' },
      { text: 'しまいました', role: 'auxiliary', gloss_es: '(sin querer)', gloss_ca: '(sense voler)', gloss_en: '(accidentally)' },
    ],
    tip_es: '間 = todo el rato durante S₁. 間に = en algún punto dentro de S₁. "寝ている間" (todo el tiempo que duerme) vs "寝ている間に" (en algún momento mientras dormía).',
    tip_ca: '間 = tot el temps durant S₁. 間に = en algun punt dins de S₁. "寝ている間" (tot el temps que dorm) vs "寝ている間に" (en algun moment mentre dormia).',
    tip_en: '間 = throughout all of S₁. 間に = at some point within S₁. "寝ている間" (the whole time sleeping) vs "寝ている間に" (at some point while sleeping).',
  },
]

// ─── CHAPTER 38 ───────────────────────────────────────────────────────────────
const ch38: GrammarPoint[] = [
  {
    id: 'mnn2-38-1', lesson: 38, number: 23, jlpt: 'N4',
    pattern: 'N の よう に / N みたいに',
    name_es: 'Como ~ / A la manera de ~ / Parecido a ~',
    name_ca: 'Com ~ / A la manera de ~ / Semblant a ~',
    name_en: 'Like ~ / In the manner of ~ / Similar to ~',
    explanation_es: '「Nのように」 compara la manera de hacer algo con N. ように = "de la misma manera que". みたいに es la forma coloquial. ようなN/みたいなN cuando modifica un sustantivo.',
    explanation_ca: '「Nのように」 compara la manera de fer alguna cosa amb N. ように = "de la mateixa manera que". みたいに és la forma col·loquial. ようなN/みたいなN quan modifica un substantiu.',
    explanation_en: '「Nのように」 compares the manner of doing something with N. ように = "in the same way as". みたいに is the colloquial form. ようなN/みたいなN when modifying a noun.',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'referencia de comparación', label_ca: 'referència de comparació', label_en: 'comparison reference' },
      { text: 'の よう に', role: 'key', isSlot: false },
      { text: 'V', role: 'verb', isSlot: true, label_es: 'acción similar', label_ca: 'acció similar', label_en: 'similar action' },
    ],
    example: [
      { text: '鳥の', furigana: 'とりの', role: 'noun', gloss_es: 'de pájaro', gloss_ca: "d'ocell", gloss_en: "bird's" },
      { text: 'ように', role: 'key', gloss_es: 'como', gloss_ca: 'com', gloss_en: 'like' },
      { text: '空を', furigana: 'そらを', role: 'object', gloss_es: 'el cielo', gloss_ca: 'el cel', gloss_en: 'the sky' },
      { text: '飛びたい', furigana: 'とびたい', role: 'verb', gloss_es: 'quiero volar', gloss_ca: 'vull volar', gloss_en: 'I want to fly' },
    ],
    tip_es: 'ようなN: "鳥のような自由" (libertad como la de un pájaro). ように + verbo: describe cómo se hace algo. みたいに es más informal y oral.',
    tip_ca: 'ようなN: "鳥のような自由" (llibertat com la d\'un ocell). ように + verb: descriu com es fa alguna cosa. みたいに és més informal i oral.',
    tip_en: 'ようなN: "鳥のような自由" (freedom like a bird\'s). ように + verb: describes how something is done. みたいに is more informal and spoken.',
  },
  {
    id: 'mnn2-38-2', lesson: 38, number: 24, jlpt: 'N4',
    pattern: 'V た まま / N の まま',
    name_es: 'Tal como está ~ / Sin cambiar ~',
    name_ca: 'Tal com està ~ / Sense canviar ~',
    name_en: 'As is / Without changing ~',
    explanation_es: '「まま」 indica que un estado persiste sin cambiar mientras ocurre otra acción. V た form + まま = "habiendo hecho V, y sin cambiar ese estado". N の まま = "quedándose como N".',
    explanation_ca: '「まま」 indica que un estat persisteix sense canviar mentre passa una altra acció. V た form + まま = "havent fet V, i sense canviar aquell estat". N の まま = "quedant-se com N".',
    explanation_en: '「まま」 indicates a state persists unchanged while another action occurs. V た form + まま = "having done V, and without that state changing". N の まま = "staying as N".',
    structure: [
      { text: 'V た / N の', role: 'verb', isSlot: true, label_es: 'V (た-form) / N の', label_ca: 'V (た-form) / N の', label_en: 'V (た-form) / N の' },
      { text: 'まま', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'otra acción que ocurre', label_ca: 'altra acció que ocorre', label_en: 'another action that occurs' },
    ],
    example: [
      { text: '靴を', furigana: 'くつを', role: 'object', gloss_es: 'los zapatos', gloss_ca: 'les sabates', gloss_en: 'shoes' },
      { text: '履いた', furigana: 'はいた', role: 'verb', gloss_es: 'con puestos', gloss_ca: 'posats', gloss_en: 'with on' },
      { text: 'まま', role: 'key', gloss_es: 'tal como están', gloss_ca: 'tal com estan', gloss_en: 'as they are' },
      { text: '寝ました', furigana: 'ねました', role: 'verb', gloss_es: 'me dormí', gloss_ca: 'em vaig adormir', gloss_en: 'fell asleep' },
    ],
    tip_es: '"眼鏡をかけたまま寝た" (dormí con las gafas puestas). まま connota que el estado debería haber cambiado pero no lo hizo. "そのままにしてください" = déjalo tal como está.',
    tip_ca: '"眼鏡をかけたまま寝た" (vaig dormir amb les ulleres posades). まま connota que l\'estat hauria d\'haver canviat però no va canviar. "そのままにしてください" = deixa\'l tal com està.',
    tip_en: '"眼鏡をかけたまま寝た" (fell asleep with glasses on). まま often connotes the state should have changed but didn\'t. "そのままにしてください" = leave it as it is.',
  },
]

// ─── CHAPTER 39 ───────────────────────────────────────────────────────────────
const ch39: GrammarPoint[] = [
  {
    id: 'mnn2-39-1', lesson: 39, number: 25, jlpt: 'N4',
    pattern: 'V て はじめて',
    name_es: 'No hasta que ~ / Solo después de ~ (primer logro)',
    name_ca: 'No fins que ~ / Només després de ~ (primera fita)',
    name_en: 'Not until ~ / Only after ~ (first realization)',
    explanation_es: '「てはじめて」 expresa que algo se comprende o logra por primera vez, y solo después de que ocurra la condición. Implica que antes de ese momento era imposible o desconocido.',
    explanation_ca: '「てはじめて」 expressa que alguna cosa s\'entén o s\'aconsegueix per primera vegada, i només després que ocorri la condició. Implica que abans d\'aquell moment era impossible o desconegut.',
    explanation_en: '「てはじめて」 expresses that something is understood or achieved for the first time, and only after the condition occurs. Implies it was impossible or unknown before that moment.',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'condición previa (forma て)', label_ca: 'condició prèvia (forma て)', label_en: 'prior condition (te-form)' },
      { text: 'はじめて', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'primera vez / primera comprensión', label_ca: 'primera vegada / primera comprensió', label_en: 'first time / first realization' },
    ],
    example: [
      { text: '日本に', furigana: 'にほんに', role: 'direction', gloss_es: 'a Japón', gloss_ca: 'al Japó', gloss_en: 'to Japan' },
      { text: '来て', furigana: 'きて', role: 'verb', gloss_es: 'venir', gloss_ca: 'venir', gloss_en: 'coming' },
      { text: 'はじめて', role: 'key', gloss_es: 'solo entonces', gloss_ca: 'només aleshores', gloss_en: 'only then' },
      { text: '文化の違いが', furigana: 'ぶんかのちがいが', role: 'subject', gloss_es: 'diferencias culturales', gloss_ca: 'diferències culturals', gloss_en: 'cultural differences' },
      { text: 'わかりました', role: 'verb', gloss_es: 'entendí', gloss_ca: 'vaig entendre', gloss_en: 'I understood' },
    ],
    tip_es: '"親になってはじめて親の気持ちがわかる" = Solo cuando uno mismo se convierte en padre/madre entiende los sentimientos de los padres. Expresa un antes y un después claro.',
    tip_ca: '"親になってはじめて親の気持ちがわかる" = Només quan un mateix es converteix en pare/mare entén els sentiments dels pares. Expressa un abans i un després clar.',
    tip_en: '"親になってはじめて親の気持ちがわかる" = Only when you become a parent yourself do you understand your parents\' feelings. Expresses a clear before and after.',
  },
  {
    id: 'mnn2-39-2', lesson: 39, number: 26, jlpt: 'N4',
    pattern: 'V 辞書形 こと に して います',
    name_es: 'Tengo por norma ~ / Me he propuesto ~',
    name_ca: 'Tinc per norma ~ / M\'he proposat ~',
    name_en: 'I have made it a rule to ~ / I always make sure to ~',
    explanation_es: '「ことにしています」 indica que uno tiene establecida una regla o hábito personal deliberado. Más fuerte que ようにしています: es una norma que uno se impone conscientemente.',
    explanation_ca: '「ことにしています」 indica que hom té establerta una regla o hàbit personal deliberat. Més fort que ようにしています: és una norma que hom s\'imposa conscientment.',
    explanation_en: '「ことにしています」 indicates a self-imposed personal rule or deliberate habit. Stronger than ようにしています: it is a rule one consciously sets for oneself.',
    structure: [
      { text: 'V 辞書形 / V ない', role: 'verb', isSlot: true, label_es: 'V (dicc.) / V ない', label_ca: 'V (dicc.) / V ない', label_en: 'V (dict.) / V ない' },
      { text: 'ことに', role: 'key', isSlot: false },
      { text: 'して います', role: 'key', isSlot: false },
    ],
    example: [
      { text: '毎朝', furigana: 'まいあさ', role: 'time', gloss_es: 'cada mañana', gloss_ca: 'cada matí', gloss_en: 'every morning' },
      { text: '30分', furigana: 'さんじっぷん', role: 'time', gloss_es: '30 minutos', gloss_ca: '30 minuts', gloss_en: '30 minutes' },
      { text: '走る', furigana: 'はしる', role: 'verb', gloss_es: 'correr', gloss_ca: 'córrer', gloss_en: 'run' },
      { text: 'ことにして います', role: 'key', gloss_es: 'tengo por norma', gloss_ca: 'tinc per norma', gloss_en: 'I make it a rule to' },
    ],
    tip_es: 'ことにしています (norma consciente, firme) vs ようにしています (esfuerzo para el hábito). "お酒を飲まないことにしています" = tengo por norma no beber (decisión firme).',
    tip_ca: 'ことにしています (norma conscient, ferma) vs ようにしています (esforç per a l\'hàbit). "お酒を飲まないことにしています" = tinc per norma no beure (decisió ferma).',
    tip_en: 'ことにしています (firm, conscious rule) vs ようにしています (effort toward a habit). "お酒を飲まないことにしています" = I make it a rule not to drink (firm decision).',
  },
]

// ─── CHAPTER 40 ───────────────────────────────────────────────────────────────
const ch40: GrammarPoint[] = [
  {
    id: 'mnn2-40-1', lesson: 40, number: 27, jlpt: 'N4',
    pattern: 'お / ご + V stem + に なります (尊敬語)',
    name_es: 'Forma honorífica (keigo) — respetuosa',
    name_ca: 'Forma honorífica (keigo) — respectuosa',
    name_en: 'Honorific form (keigo) — respectful',
    explanation_es: 'La forma 尊敬語 (sonkeigo) se usa para hablar con respeto de las acciones de otra persona (superior/cliente). Formación: お + V stem + になります. Excepciones: いらっしゃいます (いる/いく/くる), おっしゃいます (言う), なさいます (する).',
    explanation_ca: 'La forma 尊敬語 (sonkeigo) s\'usa per parlar amb respecte de les accions d\'una altra persona (superior/client). Formació: お + V stem + になります. Excepcions: いらっしゃいます (いる/いく/くる), おっしゃいます (言う), なさいます (する).',
    explanation_en: 'The 尊敬語 (sonkeigo) form is used to respectfully describe another person\'s actions (superior/customer). Formation: お + V stem + になります. Exceptions: いらっしゃいます (いる/いく/くる), おっしゃいます (言う), なさいます (する).',
    structure: [
      { text: 'お', role: 'key', isSlot: false },
      { text: 'V stem', role: 'verb', isSlot: true, label_es: 'stem del verbo', label_ca: 'stem del verb', label_en: 'verb stem' },
      { text: 'に なります', role: 'key', isSlot: false },
    ],
    example: [
      { text: '先生は', furigana: 'せんせいは', role: 'topic', gloss_es: 'el profesor', gloss_ca: 'el professor', gloss_en: 'the teacher' },
      { text: 'もうお', role: 'key', gloss_es: 'ya (hon.)', gloss_ca: 'ja (hon.)', gloss_en: 'already (hon.)' },
      { text: '帰り', furigana: 'かえり', role: 'verb', gloss_es: 'regresar', gloss_ca: 'tornar', gloss_en: 'leave' },
      { text: 'に なりました', role: 'key', gloss_es: 'se fue (honorífico)', gloss_ca: 'se\'n va anar (honorífic)', gloss_en: 'has left (honorific)' },
    ],
    tip_es: 'Verbos especiales: いる/いく/くる → いらっしゃいます. 言う → おっしゃいます. する → なさいます. 食べる/飲む → 召し上がります (めしあがります). くれる → くださいます.',
    tip_ca: 'Verbs especials: いる/いく/くる → いらっしゃいます. 言う → おっしゃいます. する → なさいます. 食べる/飲む → 召し上がります (めしあがります). くれる → くださいます.',
    tip_en: 'Special verbs: いる/いく/くる → いらっしゃいます. 言う → おっしゃいます. する → なさいます. 食べる/飲む → 召し上がります (めしあがります). くれる → くださいます.',
  },
  {
    id: 'mnn2-40-2', lesson: 40, number: 28, jlpt: 'N4',
    pattern: 'お / ご + V stem + します (謙譲語)',
    name_es: 'Forma humilde (keigo) — para hablar de uno mismo',
    name_ca: 'Forma humil (keigo) — per parlar d\'un mateix',
    name_en: 'Humble form (keigo) — for speaking of oneself',
    explanation_es: 'La forma 謙譲語 (kenjōgo) se usa para hablar humildemente de las propias acciones ante un superior. Formación: お + V stem + します / いたします. Excepciones: おります (いる), まいります (いく/くる), もうします (言う), いたします (する).',
    explanation_ca: 'La forma 謙譲語 (kenjōgo) s\'usa per parlar humilment de les pròpies accions davant d\'un superior. Formació: お + V stem + します / いたします. Excepcions: おります (いる), まいります (いく/くる), もうします (言う), いたします (する).',
    explanation_en: 'The 謙譲語 (kenjōgo) form is used to humbly describe one\'s own actions to a superior. Formation: お + V stem + します / いたします. Exceptions: おります (いる), まいります (いく/くる), もうします (言う), いたします (する).',
    structure: [
      { text: 'お / ご', role: 'key', isSlot: false },
      { text: 'V stem', role: 'verb', isSlot: true, label_es: 'stem del verbo', label_ca: 'stem del verb', label_en: 'verb stem' },
      { text: 'します / いたします', role: 'key', isSlot: false },
    ],
    example: [
      { text: '私が', furigana: 'わたしが', role: 'subject', gloss_es: 'yo', gloss_ca: 'jo', gloss_en: 'I' },
      { text: 'ご説明', furigana: 'ごせつめい', role: 'verb', gloss_es: 'la explicación', gloss_ca: "l'explicació", gloss_en: 'the explanation' },
      { text: 'いたします', role: 'key', gloss_es: 'daré (humilde)', gloss_ca: 'donaré (humil)', gloss_en: 'will give (humble)' },
    ],
    tip_es: 'Resumen keigo: 尊敬語 habla de OTROS (los eleva). 謙譲語 habla de UNO MISMO (se rebaja). 丁寧語 es el lenguaje educado básico (です/ます). Los tres niveles coexisten en conversaciones formales.',
    tip_ca: 'Resum keigo: 尊敬語 parla dels ALTRES (els eleva). 謙譲語 parla d\'UN MATEIX (es rebaixa). 丁寧語 és el llenguatge educat bàsic (です/ます). Els tres nivells coexisteixen en converses formals.',
    tip_en: 'Keigo summary: 尊敬語 speaks of OTHERS (elevates them). 謙譲語 speaks of ONESELF (lowers oneself). 丁寧語 is basic polite language (です/ます). All three coexist in formal conversations.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Export — batches 1-3: lessons 26-40
// ─────────────────────────────────────────────────────────────────────────────

// ─── CHAPTER 41 ───────────────────────────────────────────────────────────────
const ch41: GrammarPoint[] = [
  {
    id: 'mnn2-41-1', lesson: 41, number: 29, jlpt: 'N4',
    pattern: 'V ば〜ほど',
    name_es: 'Cuanto más ~ más ~',
    name_ca: 'Com més ~ més ~',
    name_en: 'The more ~ the more ~',
    explanation_es: '「ば〜ほど」 expresa que a medida que aumenta una acción/estado, aumenta el resultado. Se usa la misma palabra dos veces: V ば + V ほど o adj ければ + adj ほど.',
    explanation_ca: '「ば〜ほど」 expressa que a mesura que augmenta una acció/estat, augmenta el resultat. S\'usa la mateixa paraula dues vegades: V ば + V ほど o adj ければ + adj ほど.',
    explanation_en: '「ば〜ほど」 expresses that as an action/state increases, the result increases too. The same word is used twice: V ば + V ほど or adj ければ + adj ほど.',
    structure: [
      { text: 'V ば', role: 'key', isSlot: true, label_es: 'V (forma ば)', label_ca: 'V (forma ば)', label_en: 'V (ば form)' },
      { text: 'V ほど', role: 'key', isSlot: true, label_es: 'V (mismo) + ほど', label_ca: 'V (mateix) + ほど', label_en: 'V (same) + ほど' },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado proporcional', label_ca: 'resultat proporcional', label_en: 'proportional result' },
    ],
    example: [
      { text: '練習すれば', furigana: 'れんしゅうすれば', role: 'key', gloss_es: 'cuanto más practicas', gloss_ca: 'com més practiques', gloss_en: 'the more you practice' },
      { text: 'するほど', role: 'key', gloss_es: '(proporción)', gloss_ca: '(proporció)', gloss_en: '(proportion)' },
      { text: '上手に', furigana: 'じょうずに', role: 'adjective', gloss_es: 'mejor', gloss_ca: 'millor', gloss_en: 'better' },
      { text: 'なります', role: 'verb', gloss_es: 'te vuelves', gloss_ca: 'et tornes', gloss_en: 'you become' },
    ],
    tip_es: '"勉強すればするほど面白くなる" = cuanto más estudias, más interesante se vuelve. Simplificación coloquial: "〜ほど〜" sin la parte ば. "多ければ多いほど" = cuantos más, mejor.',
    tip_ca: '"勉強すればするほど面白くなる" = com més estudies, més interessant es torna. Simplificació col·loquial: "〜ほど〜" sense la part ば. "多ければ多いほど" = com més, millor.',
    tip_en: '"勉強すればするほど面白くなる" = the more you study, the more interesting it becomes. Colloquial simplification: "〜ほど〜" without the ば part. "多ければ多いほど" = the more the better.',
  },
  {
    id: 'mnn2-41-2', lesson: 41, number: 30, jlpt: 'N4',
    pattern: 'N / V 普通形 + らしい',
    name_es: 'Parece ~ / Tiene aspecto de ~ / Es propio de ~',
    name_ca: 'Sembla ~ / Té aspecte de ~ / És propi de ~',
    name_en: 'Seems ~ / Looks like ~ / Typical of ~',
    explanation_es: '「らしい」 tiene dos usos distintos: (1) inferencia basada en evidencia indirecta/información: Plain form + らしい ("parece que", "he oído que"). (2) típico de: N + らしい ("propio de N", "como corresponde a N").',
    explanation_ca: '「らしい」 té dos usos distints: (1) inferència basada en evidència indirecta/informació: Forma curta + らしい ("sembla que", "he sentit que"). (2) típic de: N + らしい ("propi de N", "com correspon a N").',
    explanation_en: '「らしい」 has two distinct uses: (1) inference based on indirect evidence/information: Plain form + らしい ("it seems that", "I\'ve heard that"). (2) typical of: N + らしい ("typical of N", "as befits N").',
    structure: [
      { text: 'N / S 普通形', role: 'noun', isSlot: true, label_es: 'fuente o referencia', label_ca: 'font o referència', label_en: 'source or reference' },
      { text: 'らしい', role: 'key', isSlot: false },
    ],
    example: [
      { text: '彼は', furigana: 'かれは', role: 'topic', gloss_es: 'él', gloss_ca: 'ell', gloss_en: 'he' },
      { text: '来ない', furigana: 'こない', role: 'verb', gloss_es: 'no vendrá', gloss_ca: 'no vindrà', gloss_en: "won't come" },
      { text: 'らしい', role: 'key', gloss_es: 'parece que', gloss_ca: 'sembla que', gloss_en: 'it seems' },
    ],
    tip_es: 'Tipo 1 (inferencia): "雨が降るらしい" = parece que va a llover. Tipo 2 (típico): "男らしい" = varonil, como corresponde a un hombre. "子供らしい" = infantil/como un niño.',
    tip_ca: 'Tipus 1 (inferència): "雨が降るらしい" = sembla que plourà. Tipus 2 (típic): "男らしい" = varonil, com correspon a un home. "子供らしい" = infantil/com un nen.',
    tip_en: 'Type 1 (inference): "雨が降るらしい" = it seems it will rain. Type 2 (typical): "男らしい" = manly, as befits a man. "子供らしい" = childlike/typical of a child.',
  },
]

// ─── CHAPTER 42 ───────────────────────────────────────────────────────────────
const ch42: GrammarPoint[] = [
  {
    id: 'mnn2-42-1', lesson: 42, number: 31, jlpt: 'N4',
    pattern: 'S 普通形 + そうです (伝聞)',
    name_es: 'He oído que ~ / Dicen que ~ (información de segunda mano)',
    name_ca: "He sentit que ~ / Diuen que ~ (informació de segona mà)",
    name_en: 'I heard that ~ / They say ~ (hearsay)',
    explanation_es: 'La forma そうです con plain form expresa información de segunda mano (伝聞, でんぶん). El hablante cita lo que oyó o leyó. Para な-adj y N: sin だ. Para い-adj: adj + そうです (sin cambio).',
    explanation_ca: 'La forma そうです amb forma curta expressa informació de segona mà (伝聞, でんぶん). El parlant cita el que va sentir o llegir. Per a な-adj i N: sense だ. Per a い-adj: adj + そうです (sense canvi).',
    explanation_en: 'そうです with plain form expresses hearsay (伝聞, でんぶん). The speaker quotes what they heard or read. For な-adj and N: no だ. For い-adj: adj + そうです (no change).',
    structure: [
      { text: 'S (普通形)', role: 'noun', isSlot: true, label_es: 'información oída (forma corta)', label_ca: 'informació sentida (forma curta)', label_en: 'heard information (plain form)' },
      { text: 'そうです', role: 'key', isSlot: false },
    ],
    example: [
      { text: '明日は', furigana: 'あしたは', role: 'time', gloss_es: 'mañana', gloss_ca: 'demà', gloss_en: 'tomorrow' },
      { text: '台風が', furigana: 'たいふうが', role: 'subject', gloss_es: 'tifón', gloss_ca: 'tifó', gloss_en: 'typhoon' },
      { text: '来る', furigana: 'くる', role: 'verb', gloss_es: 'vendrá', gloss_ca: 'vindrà', gloss_en: 'is coming' },
      { text: 'そうです', role: 'key', gloss_es: 'he oído que', gloss_ca: 'he sentit que', gloss_en: 'I heard' },
    ],
    tip_es: 'そうです (伝聞) vs そうです (様態): "雨が降るそうです" (he oído que llueve) vs "雨が降りそうです" (parece que va a llover, por V stem). El stem-そうです describe apariencia; el plain form-そうです cita información.',
    tip_ca: 'そうです (伝聞) vs そうです (様態): "雨が降るそうです" (he sentit que plou) vs "雨が降りそうです" (sembla que plourà, per V stem). El stem-そうです descriu aparença; el plain form-そうです cita informació.',
    tip_en: 'そうです (hearsay) vs そうです (appearance): "雨が降るそうです" (I heard it will rain) vs "雨が降りそうです" (it looks like rain, V stem). Stem-そうです describes appearance; plain form-そうです quotes information.',
  },
  {
    id: 'mnn2-42-2', lesson: 42, number: 32, jlpt: 'N4',
    pattern: 'V stem / adj stem + そうです (様態)',
    name_es: 'Parece que ~ / Tiene pinta de ~ (apariencia)',
    name_ca: 'Sembla que ~ / Té pinta de ~ (aparença)',
    name_en: 'Looks like ~ / Seems about to ~ (appearance)',
    explanation_es: 'La forma そうです con V stem / adj stem describe apariencia visual o impresión directa (様態, ようたい). Indica que algo parece estar a punto de suceder o tener cierta cualidad. Adjetivos: い→そう, な→そう.',
    explanation_ca: "La forma そうです amb V stem / adj stem descriu aparença visual o impressió directa (様態, ようたい). Indica que alguna cosa sembla estar a punt de passar o tenir certa qualitat. Adjectius: い→そう, な→そう.",
    explanation_en: 'そうです with V stem / adj stem describes visual appearance or direct impression (様態, ようたい). Indicates something looks about to happen or has a certain quality. Adjectives: い→そう, な→そう.',
    structure: [
      { text: 'V stem / adj stem', role: 'verb', isSlot: true, label_es: 'stem (verbo/adj)', label_ca: 'stem (verb/adj)', label_en: 'verb/adj stem' },
      { text: 'そうです', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'この料理は', furigana: 'このりょうりは', role: 'topic', gloss_es: 'este plato', gloss_ca: 'aquest plat', gloss_en: 'this dish' },
      { text: 'おいし', role: 'adjective', gloss_es: '(adj stem)', gloss_ca: '(stem adj)', gloss_en: '(adj stem)' },
      { text: 'そうです', role: 'key', gloss_es: 'tiene buena pinta', gloss_ca: 'té bona pinta', gloss_en: 'looks delicious' },
    ],
    tip_es: 'Excepciones: いい → よさそう (no いそう). ない → なさそう (no ないそう). "落ちそう" = parece que va a caer. "元気そう" = parece estar bien. Modifica N: そうな + N.',
    tip_ca: 'Excepcions: いい → よさそう (no いそう). ない → なさそう (no ないそう). "落ちそう" = sembla que caurà. "元気そう" = sembla estar bé. Modifica N: そうな + N.',
    tip_en: 'Exceptions: いい → よさそう (not いそう). ない → なさそう (not ないそう). "落ちそう" = looks like it will fall. "元気そう" = looks fine/healthy. Modifies N: そうな + N.',
  },
]

// ─── CHAPTER 43 ───────────────────────────────────────────────────────────────
const ch43: GrammarPoint[] = [
  {
    id: 'mnn2-43-1', lesson: 43, number: 33, jlpt: 'N4',
    pattern: 'N に よると / N に よれば',
    name_es: 'Según ~ / De acuerdo con ~',
    name_ca: 'Segons ~ / D\'acord amb ~',
    name_en: 'According to ~ / Based on ~',
    explanation_es: '「によると / によれば」 indica la fuente de información. Se usa normalmente con そうです o らしいです en la conclusión: "Nによると、〜そうです" (según N, parece que...).',
    explanation_ca: '「によると / によれば」 indica la font d\'informació. S\'usa normalment amb そうです o らしいです a la conclusió: "Nによると、〜そうです" (segons N, sembla que...).',
    explanation_en: '「によると / によれば」 indicates the source of information. Usually used with そうです or らしいです in the conclusion: "Nによると、〜そうです" (according to N, it seems...).',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'fuente de información', label_ca: "font d'informació", label_en: 'information source' },
      { text: 'によると', role: 'key', isSlot: false },
      { text: 'S + そうです / らしいです', role: 'verb', isSlot: true, label_es: 'información citada', label_ca: 'informació citada', label_en: 'quoted information' },
    ],
    example: [
      { text: '天気予報によると', furigana: 'てんきよほうによると', role: 'key', gloss_es: 'según el tiempo', gloss_ca: 'segons la previsió', gloss_en: 'according to the forecast' },
      { text: '明日は', furigana: 'あしたは', role: 'time', gloss_es: 'mañana', gloss_ca: 'demà', gloss_en: 'tomorrow' },
      { text: '雪が降る', furigana: 'ゆきがふる', role: 'verb', gloss_es: 'nevará', gloss_ca: 'nevarà', gloss_en: 'it will snow' },
      { text: 'そうです', role: 'key', gloss_es: 'dicen que', gloss_ca: 'diuen que', gloss_en: 'apparently' },
    ],
  },
  {
    id: 'mnn2-43-2', lesson: 43, number: 34, jlpt: 'N4',
    pattern: 'V 辞書形 / V ている / V た + ところです',
    name_es: 'Estar a punto de ~ / Estar haciendo ~ / Acaba de ~',
    name_ca: 'Estar a punt de ~ / Estar fent ~ / Acaba de ~',
    name_en: 'About to ~ / In the middle of ~ / Just finished ~',
    explanation_es: '「ところです」 expresa el momento exacto de una acción. V 辞書形 + ところ = a punto de. V ている + ところ = en este preciso momento haciendo. V た + ところ = justo acaba de terminar.',
    explanation_ca: '「ところです」 expressa el moment exacte d\'una acció. V 辞書形 + ところ = a punt de. V ている + ところ = en aquest precís moment fent. V た + ところ = just acaba de terminar.',
    explanation_en: '「ところです」 expresses the exact moment of an action. V dictionary + ところ = about to. V ている + ところ = doing right now. V た + ところ = just finished.',
    structure: [
      { text: 'V 辞書形 / ている / た', role: 'verb', isSlot: true, label_es: 'V (dicc. / ている / た)', label_ca: 'V (dicc. / ている / た)', label_en: 'V (dict. / ている / た)' },
      { text: 'ところです', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'ちょうど', role: 'noun', gloss_es: 'justo', gloss_ca: 'just', gloss_en: 'just' },
      { text: '出かける', furigana: 'でかける', role: 'verb', gloss_es: 'salir', gloss_ca: 'sortir', gloss_en: 'go out' },
      { text: 'ところです', role: 'key', gloss_es: 'estoy a punto de', gloss_ca: 'estic a punt de', gloss_en: "I'm about to" },
    ],
    tip_es: '"今食べているところです" = estoy comiendo ahora mismo. "食べたところです" = acabo de comer (muy reciente). "食べるところです" = estoy a punto de comer. La diferencia de tiempo verbal cambia el significado.',
    tip_ca: '"今食べているところです" = estic menjant ara mateix. "食べたところです" = acabo de menjar (molt recent). "食べるところです" = estic a punt de menjar. La diferència de temps verbal canvia el significat.',
    tip_en: '"今食べているところです" = I\'m eating right now. "食べたところです" = I just ate (very recent). "食べるところです" = I\'m about to eat. The tense difference changes the meaning.',
  },
]

// ─── CHAPTER 44 ───────────────────────────────────────────────────────────────
const ch44: GrammarPoint[] = [
  {
    id: 'mnn2-44-1', lesson: 44, number: 35, jlpt: 'N4',
    pattern: 'N さえ〜ば / N さえあれば',
    name_es: 'Con solo ~ / Si tan solo hubiera ~',
    name_ca: 'Amb només ~ / Si tan sols hi hagués ~',
    name_en: 'If only ~ / As long as ~ / Even just ~',
    explanation_es: '「さえ〜ば」 indica que una sola condición es suficiente para lograr algo. さえ enfatiza la mínima condición necesaria. Con verbos: V stem + さえすれば. Con N: Nさえあれば.',
    explanation_ca: '「さえ〜ば」 indica que una sola condició és suficient per aconseguir alguna cosa. さえ emfatitza la condició mínima necessària. Amb verbs: V stem + さえすれば. Amb N: Nさえあれば.',
    explanation_en: '「さえ〜ば」 indicates that a single condition is enough to achieve something. さえ emphasizes the minimum necessary condition. With verbs: V stem + さえすれば. With N: Nさえあれば.',
    structure: [
      { text: 'N / V stem', role: 'noun', isSlot: true, label_es: 'condición mínima', label_ca: 'condició mínima', label_en: 'minimum condition' },
      { text: 'さえ〜ば', role: 'key', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado suficiente', label_ca: 'resultat suficient', label_en: 'sufficient result' },
    ],
    example: [
      { text: 'お金さえ', furigana: 'おかねさえ', role: 'noun', gloss_es: 'con solo dinero', gloss_ca: 'amb sols diners', gloss_en: 'if only money' },
      { text: 'あれば', role: 'key', gloss_es: 'si hubiera', gloss_ca: 'si hi hagués', gloss_en: 'if there were' },
      { text: '旅行できます', furigana: 'りょこうできます', role: 'verb', gloss_es: 'puedo viajar', gloss_ca: 'puc viatjar', gloss_en: 'I can travel' },
    ],
    tip_es: '"勉強さえすれば合格できる" = con solo estudiar, puedes aprobar. さえ también intensifica negaciones: "水さえない" = ni siquiera hay agua. Implica sorpresa de que algo tan básico falte.',
    tip_ca: '"勉強さえすれば合格できる" = amb sols estudiar, pots aprovar. さえ també intensifica negacions: "水さえない" = ni tan sols hi ha aigua. Implica sorpresa que quelcom tan bàsic falti.',
    tip_en: '"勉強さえすれば合格できる" = if you only study, you can pass. さえ also intensifies negations: "水さえない" = there isn\'t even water. Implies surprise that something so basic is absent.',
  },
  {
    id: 'mnn2-44-2', lesson: 44, number: 36, jlpt: 'N4',
    pattern: 'V ずに / V ないで',
    name_es: 'Sin hacer ~ / Sin V',
    name_ca: 'Sense fer ~ / Sense V',
    name_en: 'Without doing ~ / Without V-ing',
    explanation_es: 'Dos formas de decir "sin hacer V". ずに es la forma más formal/literaria; ないで es más coloquial. Formación de ずに: V ない stem + ずに. Excepciones: する → せずに, くる → こずに.',
    explanation_ca: "Dues formes de dir \"sense fer V\". ずに és la forma més formal/literària; ないで és més col·loquial. Formació de ずに: V ない stem + ずに. Excepcions: する → せずに, くる → こずに.",
    explanation_en: 'Two ways to say "without doing V". ずに is more formal/literary; ないで is more colloquial. Formation of ずに: V negative stem + ずに. Exceptions: する → せずに, くる → こずに.',
    structure: [
      { text: 'V ない stem', role: 'verb', isSlot: true, label_es: 'verbo (stem neg.)', label_ca: 'verb (stem neg.)', label_en: 'verb (neg. stem)' },
      { text: 'ずに', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción principal', label_ca: 'acció principal', label_en: 'main action' },
    ],
    example: [
      { text: '朝ごはんを', furigana: 'あさごはんを', role: 'object', gloss_es: 'el desayuno', gloss_ca: "l'esmorzar", gloss_en: 'breakfast' },
      { text: '食べ', furigana: 'たべ', role: 'verb', gloss_es: 'desayunar', gloss_ca: 'esmorzar', gloss_en: 'eat' },
      { text: 'ずに', role: 'key', gloss_es: 'sin', gloss_ca: 'sense', gloss_en: 'without' },
      { text: '学校に行きました', furigana: 'がっこうにいきました', role: 'verb', gloss_es: 'fui al cole', gloss_ca: 'vaig anar a escola', gloss_en: 'went to school' },
    ],
    tip_es: '"食べずに行く" (formal) = "食べないで行く" (coloquial). ずに a menudo aparece en texto escrito, discursos formales y proverbs. En la vida cotidiana usa ないで.',
    tip_ca: '"食べずに行く" (formal) = "食べないで行く" (col·loquial). ずに sovint apareix en text escrit, discursos formals i proverbis. En la vida quotidiana usa ないで.',
    tip_en: '"食べずに行く" (formal) = "食べないで行く" (colloquial). ずに often appears in written text, formal speeches and proverbs. In everyday speech use ないで.',
  },
]

// ─── CHAPTER 45 ───────────────────────────────────────────────────────────────
const ch45: GrammarPoint[] = [
  {
    id: 'mnn2-45-1', lesson: 45, number: 37, jlpt: 'N4',
    pattern: 'たとえ〜ても / たとえ〜でも',
    name_es: 'Aunque ~ / Incluso si ~ (hipótesis extrema)',
    name_ca: 'Encara que ~ / Fins i tot si ~ (hipòtesi extrema)',
    name_en: 'Even if ~ / No matter how ~ (extreme hypothesis)',
    explanation_es: '「たとえ〜ても」 es una forma reforzada de ても. たとえ (por ejemplo, supongamos que) introduce una hipótesis extrema, indicando que el resultado no cambia bajo ninguna circunstancia.',
    explanation_ca: '「たとえ〜ても」 és una forma reforçada de ても. たとえ (per exemple, suposem que) introdueix una hipòtesi extrema, indicant que el resultat no canvia sota cap circumstància.',
    explanation_en: '「たとえ〜ても」 is a reinforced form of ても. たとえ (for example, suppose that) introduces an extreme hypothesis, indicating the result does not change under any circumstances.',
    structure: [
      { text: 'たとえ', role: 'conjunction', isSlot: false },
      { text: 'S ても / でも', role: 'key', isSlot: true, label_es: 'hipótesis extrema (ても)', label_ca: 'hipòtesi extrema (ても)', label_en: 'extreme hypothesis (ても)' },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado invariable', label_ca: 'resultat invariable', label_en: 'invariable result' },
    ],
    example: [
      { text: 'たとえ', role: 'conjunction', gloss_es: 'aunque', gloss_ca: 'encara que', gloss_en: 'even if' },
      { text: '失敗して', furigana: 'しっぱいして', role: 'verb', gloss_es: 'fallara', gloss_ca: 'fallés', gloss_en: 'I fail' },
      { text: 'も', role: 'key', gloss_es: 'aunque', gloss_ca: 'encara que', gloss_en: 'even if' },
      { text: 'あきらめません', role: 'verb', gloss_es: 'no me rendiré', gloss_ca: 'no em rendiré', gloss_en: "I won't give up" },
    ],
    tip_es: '"たとえ雨が降っても行きます" vs "雨が降っても行きます": たとえ añade énfasis dramático. Se usa para mostrar determinación o dar un ejemplo hipotético extremo.',
    tip_ca: '"たとえ雨が降っても行きます" vs "雨が降っても行きます": たとえ afegeix èmfasi dramàtic. S\'usa per mostrar determinació o donar un exemple hipotètic extrem.',
    tip_en: '"たとえ雨が降っても行きます" vs "雨が降っても行きます": たとえ adds dramatic emphasis. Used to show determination or give an extreme hypothetical.',
  },
  {
    id: 'mnn2-45-2', lesson: 45, number: 38, jlpt: 'N4',
    pattern: 'N として',
    name_es: 'Como ~ / En calidad de ~ / En el papel de ~',
    name_ca: 'Com a ~ / En qualitat de ~ / En el paper de ~',
    name_en: 'As ~ / In the capacity of ~ / In the role of ~',
    explanation_es: '「として」 indica el papel, función o categoría en que algo/alguien actúa. Se adjunta al sustantivo. Diferente de ように (forma similar a): として implica función real o rol asignado.',
    explanation_ca: '「として」 indica el paper, funció o categoria en que alguna cosa/algú actua. S\'adjunta al substantiu. Diferent de ように (forma similar a): として implica funció real o rol assignat.',
    explanation_en: '「として」 indicates the role, function or category in which something/someone acts. Attaches to a noun. Different from ように (similar form to): として implies actual function or assigned role.',
    structure: [
      { text: 'N', role: 'noun', isSlot: true, label_es: 'rol / función / categoría', label_ca: 'rol / funció / categoria', label_en: 'role / function / category' },
      { text: 'として', role: 'key', isSlot: false },
    ],
    example: [
      { text: '彼は', furigana: 'かれは', role: 'topic', gloss_es: 'él', gloss_ca: 'ell', gloss_en: 'he' },
      { text: '医者として', furigana: 'いしゃとして', role: 'key', gloss_es: 'como médico', gloss_ca: 'com a metge', gloss_en: 'as a doctor' },
      { text: '働いて います', furigana: 'はたらいています', role: 'verb', gloss_es: 'trabaja', gloss_ca: 'treballa', gloss_en: 'works' },
    ],
    tip_es: '"ボランティアとして参加した" (participé como voluntario). "日本語の教科書として使える" (puede usarse como libro de texto de japonés). としては = "como/en cuanto a la categoría de".',
    tip_ca: '"ボランティアとして参加した" (vaig participar com a voluntari). "日本語の教科書として使える" (es pot usar com a llibre de text de japonès). としては = "com a / pel que fa a la categoria de".',
    tip_en: '"ボランティアとして参加した" (participated as a volunteer). "日本語の教科書として使える" (can be used as a Japanese textbook). としては = "as for / in terms of the category of".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Export — batches 1-4: lessons 26-45
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
  ...ch36,
  ...ch37,
  ...ch38,
  ...ch39,
  ...ch40,
  ...ch41,
  ...ch42,
  ...ch43,
  ...ch44,
  ...ch45,
]
