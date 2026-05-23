// Grammar data: Minna no Nihongo 1, Chapters 1-5
// Each grammar point has a visual structure breakdown and a tokenized example.

export type GrammarRole =
  | 'topic'       // は → indigo
  | 'subject'     // が → blue
  | 'object'      // を → orange
  | 'location'    // で → emerald
  | 'direction'   // に → teal
  | 'time'        // に/から/まで (time) → sky
  | 'verb'        // verbs → purple
  | 'key'         // the grammar pattern itself → rose
  | 'copula'      // です/だ → violet
  | 'particle'    // other particles → amber
  | 'noun'        // content nouns → slate
  | 'adjective'   // adjectives → pink
  | 'conjunction' // から/が/etc → gray
  | 'auxiliary'   // てください etc → fuchsia

export interface RoleColor { bg: string; text: string; border: string }

export const ROLE_COLORS: Record<GrammarRole, RoleColor> = {
  topic:       { bg: 'bg-indigo-100',  text: 'text-indigo-800',  border: 'border-indigo-400' },
  subject:     { bg: 'bg-blue-100',    text: 'text-blue-800',    border: 'border-blue-400' },
  object:      { bg: 'bg-orange-100',  text: 'text-orange-800',  border: 'border-orange-400' },
  location:    { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-400' },
  direction:   { bg: 'bg-teal-100',    text: 'text-teal-800',    border: 'border-teal-400' },
  time:        { bg: 'bg-sky-100',     text: 'text-sky-800',     border: 'border-sky-400' },
  verb:        { bg: 'bg-purple-100',  text: 'text-purple-800',  border: 'border-purple-400' },
  key:         { bg: 'bg-rose-100',    text: 'text-rose-800',    border: 'border-rose-400' },
  copula:      { bg: 'bg-violet-100',  text: 'text-violet-800',  border: 'border-violet-400' },
  particle:    { bg: 'bg-amber-100',   text: 'text-amber-800',   border: 'border-amber-400' },
  noun:        { bg: 'bg-slate-100',   text: 'text-slate-700',   border: 'border-slate-400' },
  adjective:   { bg: 'bg-pink-100',    text: 'text-pink-800',    border: 'border-pink-400' },
  conjunction: { bg: 'bg-gray-100',    text: 'text-gray-700',    border: 'border-gray-400' },
  auxiliary:   { bg: 'bg-fuchsia-100', text: 'text-fuchsia-800', border: 'border-fuchsia-400' },
}

export const ROLE_LABELS: Record<GrammarRole, { es: string; ca: string; en: string }> = {
  topic:       { es: 'tema',         ca: 'tema',          en: 'topic' },
  subject:     { es: 'sujeto',       ca: 'subjecte',      en: 'subject' },
  object:      { es: 'objeto',       ca: 'objecte',       en: 'object' },
  location:    { es: 'lugar',        ca: 'lloc',          en: 'place' },
  direction:   { es: 'dirección',    ca: 'direcció',      en: 'direction' },
  time:        { es: 'tiempo',       ca: 'temps',         en: 'time' },
  verb:        { es: 'verbo',        ca: 'verb',          en: 'verb' },
  key:         { es: 'gramática',    ca: 'gramàtica',     en: 'grammar' },
  copula:      { es: 'cópula',       ca: 'còpula',        en: 'copula' },
  particle:    { es: 'partícula',    ca: 'partícula',     en: 'particle' },
  noun:        { es: 'nombre',       ca: 'nom',           en: 'noun' },
  adjective:   { es: 'adjetivo',     ca: 'adjectiu',      en: 'adjective' },
  conjunction: { es: 'conjunción',   ca: 'conjunció',     en: 'conjunction' },
  auxiliary:   { es: 'auxiliar',     ca: 'auxiliar',      en: 'auxiliary' },
}

export interface StructurePart {
  text: string       // "N₁", "は", "です", "V", etc.
  role: GrammarRole
  isSlot: boolean    // true = placeholder (N / V / A)
  label_es?: string
  label_ca?: string
  label_en?: string
}

export interface ExampleToken {
  text: string
  furigana?: string
  role: GrammarRole
  gloss_es: string
  gloss_ca: string
  gloss_en: string
}

export interface GrammarPoint {
  id: string           // "mnn1-01-1"
  lesson: number       // 1-25
  number: number       // sequential overall
  jlpt: 'N5' | 'N4'
  pattern: string      // "N₁ は N₂ です"
  name_es: string
  name_ca: string
  name_en: string
  explanation_es: string
  explanation_ca: string
  explanation_en: string
  structure: StructurePart[]
  example: ExampleToken[]
  tip_es?: string
  tip_ca?: string
  tip_en?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 1
// ─────────────────────────────────────────────────────────────────────────────

const ch1: GrammarPoint[] = [
  {
    id: 'mnn1-01-1',
    lesson: 1, number: 1, jlpt: 'N5',
    pattern: 'N₁ は N₂ です',
    name_es: 'Frase copulativa afirmativa',
    name_ca: 'Frase copulativa afirmativa',
    name_en: 'Affirmative copula sentence',
    explanation_es: 'La estructura básica del japonés para decir que "A es B". は (wa) marca el tema de la frase y です es la forma educada de "ser/es/soy". El orden siempre es: Tema → Predicado.',
    explanation_ca: 'L\'estructura bàsica del japonès per dir que "A és B". は (wa) marca el tema de la frase i です és la forma educada de "ser/és/sóc". L\'ordre sempre és: Tema → Predicat.',
    explanation_en: '"A is B" — the most fundamental Japanese sentence. は (wa) marks the topic and です is the polite form of "to be". Word order is always: Topic → Predicate.',
    structure: [
      { text: 'N₁', role: 'topic',  isSlot: true,  label_es: 'tema',      label_ca: 'tema',     label_en: 'topic' },
      { text: 'は',  role: 'topic',  isSlot: false },
      { text: 'N₂', role: 'noun',   isSlot: true,  label_es: 'atributo',  label_ca: 'atribut',  label_en: 'predicate' },
      { text: 'です', role: 'copula', isSlot: false },
    ],
    example: [
      { text: '私',    furigana: 'わたし',   role: 'topic',  gloss_es: 'yo',          gloss_ca: 'jo',        gloss_en: 'I' },
      { text: 'は',                          role: 'topic',  gloss_es: '[tema]',      gloss_ca: '[tema]',    gloss_en: '[topic]' },
      { text: '学生',  furigana: 'がくせい', role: 'noun',   gloss_es: 'estudiante',  gloss_ca: 'estudiant', gloss_en: 'student' },
      { text: 'です',                        role: 'copula', gloss_es: 'soy',         gloss_ca: 'sóc',       gloss_en: 'am' },
    ],
    tip_es: 'は se pronuncia "wa" cuando actúa como partícula. No la confundas con la hiragana は (ha) de las palabras normales.',
    tip_ca: 'は es pronuncia "wa" quan actua com a partícula. No la confonguis amb la hiragana は (ha) de les paraules normals.',
    tip_en: 'は is pronounced "wa" when used as a particle — not "ha" like in regular words.',
  },
  {
    id: 'mnn1-01-2',
    lesson: 1, number: 2, jlpt: 'N5',
    pattern: 'N₁ は N₂ じゃ（では）ありません',
    name_es: 'Frase copulativa negativa',
    name_ca: 'Frase copulativa negativa',
    name_en: 'Negative copula sentence',
    explanation_es: 'La negación de "N es N". じゃありません es la forma hablada/informal; ではありません es más formal y escrita. Ambas son correctas.',
    explanation_ca: 'La negació de "N és N". じゃありません és la forma parlada/informal; ではありません és més formal i escrita. Les dues són correctes.',
    explanation_en: 'The negative of "N is N". じゃありません is colloquial; ではありません is more formal/written. Both are correct.',
    structure: [
      { text: 'N₁',         role: 'topic',  isSlot: true,  label_es: 'tema',     label_ca: 'tema',    label_en: 'topic' },
      { text: 'は',          role: 'topic',  isSlot: false },
      { text: 'N₂',         role: 'noun',   isSlot: true,  label_es: 'atributo', label_ca: 'atribut', label_en: 'predicate' },
      { text: 'じゃ',        role: 'key',    isSlot: false },
      { text: 'ありません',  role: 'key',    isSlot: false },
    ],
    example: [
      { text: '私',          furigana: 'わたし',    role: 'topic',  gloss_es: 'yo',         gloss_ca: 'jo',        gloss_en: 'I' },
      { text: 'は',                                 role: 'topic',  gloss_es: '[tema]',     gloss_ca: '[tema]',    gloss_en: '[topic]' },
      { text: '先生',        furigana: 'せんせい',  role: 'noun',   gloss_es: 'profesor',   gloss_ca: 'professor', gloss_en: 'teacher' },
      { text: 'じゃ',                               role: 'key',    gloss_es: 'no',         gloss_ca: 'no',        gloss_en: 'not' },
      { text: 'ありません',                         role: 'key',    gloss_es: 'soy',        gloss_ca: 'sóc',       gloss_en: 'am' },
    ],
    tip_es: 'じゃ es contracción de では. En situaciones formales (escritura, presentaciones) usa ではありません.',
    tip_ca: 'じゃ és contracció de では. En situacions formals (escriptura, presentacions) usa ではありません.',
    tip_en: 'じゃ is a contraction of では. Use ではありません in formal contexts like writing or presentations.',
  },
  {
    id: 'mnn1-01-3',
    lesson: 1, number: 3, jlpt: 'N5',
    pattern: 'N₁ は N₂ ですか',
    name_es: 'Pregunta con か',
    name_ca: 'Pregunta amb か',
    name_en: 'Question with か',
    explanation_es: 'Para hacer una pregunta de sí/no en japonés, simplemente añade か al final de la frase. No se necesita cambiar el orden de las palabras. La entonación sube ligeramente al final.',
    explanation_ca: 'Per fer una pregunta de sí/no en japonès, simplement afegeix か al final de la frase. No cal canviar l\'ordre de les paraules. L\'entonació puja lleugerament al final.',
    explanation_en: 'To form a yes/no question, add か at the end of the sentence. No word order change needed. The tone rises slightly at the end.',
    structure: [
      { text: 'N₁',  role: 'topic',  isSlot: true,  label_es: 'tema',     label_ca: 'tema',    label_en: 'topic' },
      { text: 'は',   role: 'topic',  isSlot: false },
      { text: 'N₂',  role: 'noun',   isSlot: true,  label_es: 'atributo', label_ca: 'atribut', label_en: 'predicate' },
      { text: 'です', role: 'copula', isSlot: false },
      { text: 'か',   role: 'key',    isSlot: false },
    ],
    example: [
      { text: 'これ',                               role: 'topic',  gloss_es: 'esto',        gloss_ca: 'això',    gloss_en: 'this' },
      { text: 'は',                                 role: 'topic',  gloss_es: '[tema]',      gloss_ca: '[tema]',  gloss_en: '[topic]' },
      { text: '本',   furigana: 'ほん',             role: 'noun',   gloss_es: 'libro',       gloss_ca: 'llibre',  gloss_en: 'book' },
      { text: 'です',                                role: 'copula', gloss_es: 'es',          gloss_ca: 'és',      gloss_en: 'is' },
      { text: 'か',                                 role: 'key',    gloss_es: '¿?',          gloss_ca: '¿?',      gloss_en: '?' },
    ],
    tip_es: 'En japonés formal no se usa el signo de interrogación (？). La partícula か ya indica que es pregunta.',
    tip_ca: 'En japonès formal no s\'usa el signe d\'interrogació (？). La partícula か ja indica que és pregunta.',
    tip_en: 'In formal Japanese, question marks (？) are not used. The particle か alone marks it as a question.',
  },
  {
    id: 'mnn1-01-4',
    lesson: 1, number: 4, jlpt: 'N5',
    pattern: 'N も ...',
    name_es: 'Partícula も (también)',
    name_ca: 'Partícula も (també)',
    name_en: 'Particle も (also/too)',
    explanation_es: 'も reemplaza a は (o a が / を) para indicar que algo comparte la misma característica que el tema anterior. Equivale a "también" o "tampoco" en negativo.',
    explanation_ca: 'も substitueix は (o が / を) per indicar que alguna cosa comparteix la mateixa característica que el tema anterior. Equivalent a "també" o "tampoc" en negatiu.',
    explanation_en: 'も replaces は (or が/を) to say that something also shares the same characteristic. It means "also" or "either" (in negatives).',
    structure: [
      { text: 'N₁',  role: 'topic',  isSlot: true,  label_es: 'tema ant.', label_ca: 'tema ant.', label_en: 'prev. topic' },
      { text: 'は',   role: 'topic',  isSlot: false },
      { text: '...',  role: 'noun',   isSlot: true,  label_es: 'predicado', label_ca: 'predicat',  label_en: 'predicate' },
      { text: 'N₂',  role: 'key',    isSlot: true,  label_es: 'también',   label_ca: 'també',     label_en: 'also' },
      { text: 'も',   role: 'key',    isSlot: false },
      { text: '...',  role: 'noun',   isSlot: true,  label_es: 'predicado', label_ca: 'predicat',  label_en: 'predicate' },
    ],
    example: [
      { text: 'マリア',  role: 'topic',  gloss_es: 'María',       gloss_ca: 'Maria',       gloss_en: 'Maria' },
      { text: 'さん',    role: 'particle', gloss_es: '[cortesía]', gloss_ca: '[cortesia]',  gloss_en: '[politeness]' },
      { text: 'も',      role: 'key',    gloss_es: 'también',     gloss_ca: 'també',       gloss_en: 'also' },
      { text: '学生',    furigana: 'がくせい', role: 'noun',  gloss_es: 'estudiante',  gloss_ca: 'estudiant', gloss_en: 'student' },
      { text: 'です',    role: 'copula', gloss_es: 'es',          gloss_ca: 'és',          gloss_en: 'is' },
    ],
    tip_es: 'も NUNCA aparece junto a は. Si el tema anterior usaba は, cámbialo por も.',
    tip_ca: 'も MAI apareix junt amb は. Si el tema anterior usava は, canvia\'l per も.',
    tip_en: 'も NEVER appears together with は. If the previous topic used は, replace it with も.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 2
// ─────────────────────────────────────────────────────────────────────────────

const ch2: GrammarPoint[] = [
  {
    id: 'mnn1-02-5',
    lesson: 2, number: 5, jlpt: 'N5',
    pattern: 'これ / それ / あれ は N です',
    name_es: 'Demostrativos (cosas)',
    name_ca: 'Demostratius (coses)',
    name_en: 'Demonstratives (things)',
    explanation_es: 'これ (esto) se usa para cosas cerca del hablante. それ (eso) para cosas cerca del oyente. あれ (aquello) para cosas lejos de ambos. Son pronombres: van solos, sin nombre después.',
    explanation_ca: 'これ (això) s\'usa per a coses properes al parlant. それ (allò proper) per a coses properes a l\'oient. あれ (allò llunyà) per a coses lluny dels dos. Són pronoms: van sols, sense nom al darrere.',
    explanation_en: 'これ (this) for things near the speaker. それ (that) for things near the listener. あれ (that over there) for things far from both. They are pronouns — used alone, not before a noun.',
    structure: [
      { text: 'これ/それ/あれ', role: 'key',    isSlot: false },
      { text: 'は',            role: 'topic',  isSlot: false },
      { text: 'N',             role: 'noun',   isSlot: true, label_es: 'nombre', label_ca: 'nom', label_en: 'noun' },
      { text: 'です',          role: 'copula', isSlot: false },
    ],
    example: [
      { text: 'あれ',                              role: 'key',    gloss_es: 'aquello',    gloss_ca: 'allò',     gloss_en: 'that (far)' },
      { text: 'は',                                role: 'topic',  gloss_es: '[tema]',     gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: '東京', furigana: 'とうきょう',      role: 'noun',   gloss_es: 'Tokio',      gloss_ca: 'Tòquio',   gloss_en: 'Tokyo' },
      { text: 'タワー',                            role: 'noun',   gloss_es: 'Torre',      gloss_ca: 'Torre',    gloss_en: 'Tower' },
      { text: 'です',                              role: 'copula', gloss_es: 'es',         gloss_ca: 'és',       gloss_en: 'is' },
    ],
    tip_es: 'これ/それ/あれ son PRONOMBRES. Para usar un demostrativo ANTES de un nombre, usa この/その/あの (ver siguiente gramática).',
    tip_ca: 'これ/それ/あれ són PRONOMS. Per usar un demostratiu DAVANT d\'un nom, usa この/その/あの (veure propera gramàtica).',
    tip_en: 'これ/それ/あれ are PRONOUNS. To use a demonstrative BEFORE a noun, use この/その/あの (see next pattern).',
  },
  {
    id: 'mnn1-02-6',
    lesson: 2, number: 6, jlpt: 'N5',
    pattern: 'この / その / あの N',
    name_es: 'Adjetivos demostrativos',
    name_ca: 'Adjectius demostratius',
    name_en: 'Demonstrative adjectives',
    explanation_es: 'この (este), その (ese), あの (aquel) van SIEMPRE seguidos de un nombre. Funcionan como adjetivos demostrativos en español. La misma lógica de distancia que これ/それ/あれ.',
    explanation_ca: 'この (aquest), その (aquell proper), あの (aquell llunyà) van SEMPRE seguits d\'un nom. Funcionen com adjectius demostratius. La mateixa lògica de distància que これ/それ/あれ.',
    explanation_en: 'この (this), その (that), あの (that over there) ALWAYS precede a noun. They work as demonstrative adjectives. Same distance logic as これ/それ/あれ.',
    structure: [
      { text: 'この/その/あの', role: 'key',  isSlot: false },
      { text: 'N',             role: 'noun', isSlot: true, label_es: 'nombre', label_ca: 'nom', label_en: 'noun' },
    ],
    example: [
      { text: 'この',                              role: 'key',    gloss_es: 'este',     gloss_ca: 'aquest',   gloss_en: 'this' },
      { text: '本',   furigana: 'ほん',            role: 'noun',   gloss_es: 'libro',    gloss_ca: 'llibre',   gloss_en: 'book' },
      { text: 'は',                                role: 'topic',  gloss_es: '[tema]',   gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: '山田', furigana: 'やまだ',          role: 'noun',   gloss_es: 'Yamada',   gloss_ca: 'Yamada',   gloss_en: 'Yamada' },
      { text: 'さん',                              role: 'particle', gloss_es: '[sra.]', gloss_ca: '[sra.]',   gloss_en: '[ms.]' },
      { text: 'の',                                role: 'particle', gloss_es: 'de',     gloss_ca: 'de',       gloss_en: '\'s' },
      { text: 'です',                              role: 'copula',   gloss_es: 'es',     gloss_ca: 'és',       gloss_en: 'is' },
    ],
    tip_es: 'Truco: この/その/あの siempre necesitan un nombre después. Si no hay nombre, usa これ/それ/あれ.',
    tip_ca: 'Truc: この/その/あの sempre necessiten un nom al darrere. Si no hi ha nom, usa これ/それ/あれ.',
    tip_en: 'Tip: この/その/あの always need a noun after them. Without a noun, use これ/それ/あれ instead.',
  },
  {
    id: 'mnn1-02-7',
    lesson: 2, number: 7, jlpt: 'N5',
    pattern: 'N₁ の N₂',
    name_es: 'Partícula の (posesión/relación)',
    name_ca: 'Partícula の (possessió/relació)',
    name_en: 'Particle の (possession/relation)',
    explanation_es: 'の conecta dos nombres y equivale al "de" del español. N₁ の N₂ significa "el N₂ de N₁". Sirve para posesión (mi libro), afiliación (alumno de la escuela), o categoría (libro de japonés).',
    explanation_ca: 'の connecta dos noms i equival al "de" del català. N₁ の N₂ significa "el N₂ de N₁". Serveix per a possessió (el meu llibre), afiliació (alumne de l\'escola) o categoria (llibre de japonès).',
    explanation_en: 'の links two nouns meaning "N₂ of N₁". It expresses possession (my book), affiliation (student of the school), or category (Japanese book).',
    structure: [
      { text: 'N₁', role: 'noun',     isSlot: true,  label_es: 'poseedor', label_ca: 'posseïdor', label_en: 'owner' },
      { text: 'の',  role: 'particle', isSlot: false },
      { text: 'N₂', role: 'noun',     isSlot: true,  label_es: 'poseído',  label_ca: 'posseït',   label_en: 'possessed' },
    ],
    example: [
      { text: 'これ',                              role: 'topic',    gloss_es: 'esto',       gloss_ca: 'això',     gloss_en: 'this' },
      { text: 'は',                                role: 'topic',    gloss_es: '[tema]',     gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: '私',   furigana: 'わたし',          role: 'noun',     gloss_es: 'yo/mi',      gloss_ca: 'jo/el meu', gloss_en: 'my' },
      { text: 'の',                                role: 'particle', gloss_es: 'de',         gloss_ca: 'de',       gloss_en: '\'s' },
      { text: 'かばん',                            role: 'noun',     gloss_es: 'bolsa',      gloss_ca: 'bossa',    gloss_en: 'bag' },
      { text: 'です',                              role: 'copula',   gloss_es: 'es',         gloss_ca: 'és',       gloss_en: 'is' },
    ],
    tip_es: 'の también puede ir al final de una frase en lugar de repetir el nombre: 「これはあなたのですか」→ "¿Este es tuyo?" (の reemplaza a "bolsa/libro/etc.").',
    tip_ca: 'の també pot anar al final d\'una frase en lloc de repetir el nom: 「これはあなたのですか」→ "Això és teu?" (の substitueix "bossa/llibre/etc.").',
    tip_en: 'の can also stand alone at the end of a sentence instead of repeating the noun: 「これはあなたのですか」→ "Is this yours?"',
  },
  {
    id: 'mnn1-02-8',
    lesson: 2, number: 8, jlpt: 'N5',
    pattern: 'そうです / そうじゃありません',
    name_es: 'Respuesta afirmativa/negativa',
    name_ca: 'Resposta afirmativa/negativa',
    name_en: 'Yes/No response',
    explanation_es: 'そうです ("sí, así es") y そうじゃありません ("no, no es así") son las respuestas cortas a preguntas ですか. Equivalen a confirmar o negar el predicado sin repetirlo.',
    explanation_ca: 'そうです ("sí, és així") i そうじゃありません ("no, no és així") són les respostes curtes a preguntes ですか. Equivalen a confirmar o negar el predicat sense repetir-lo.',
    explanation_en: 'そうです ("yes, that\'s right") and そうじゃありません ("no, that\'s not right") are short answers to ですか questions, confirming or denying the predicate.',
    structure: [
      { text: 'はい、',         role: 'key', isSlot: false },
      { text: 'そうです',       role: 'key', isSlot: false },
      { text: '／ いいえ、',    role: 'key', isSlot: false },
      { text: 'そうじゃ',      role: 'key', isSlot: false },
      { text: 'ありません',    role: 'key', isSlot: false },
    ],
    example: [
      { text: 'はい',   role: 'key',    gloss_es: 'sí',        gloss_ca: 'sí',       gloss_en: 'yes' },
      { text: '、',     role: 'noun',   gloss_es: ',',         gloss_ca: ',',        gloss_en: ',' },
      { text: 'そう',   role: 'key',    gloss_es: 'así',       gloss_ca: 'així',     gloss_en: 'so' },
      { text: 'です',   role: 'copula', gloss_es: 'es',        gloss_ca: 'és',       gloss_en: 'is' },
    ],
    tip_es: 'Para negar de forma más suave puedes decir 「ちがいます」(chigaimasu) que significa "es incorrecto / me equivoco".',
    tip_ca: 'Per negar de forma més suau pots dir 「ちがいます」(chigaimasu) que significa "és incorrecte / m\'equivoco".',
    tip_en: 'For a softer denial, you can say 「ちがいます」(chigaimasu) meaning "that\'s different / incorrect".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 3
// ─────────────────────────────────────────────────────────────────────────────

const ch3: GrammarPoint[] = [
  {
    id: 'mnn1-03-9',
    lesson: 3, number: 9, jlpt: 'N5',
    pattern: 'ここ / そこ / あそこ は N です',
    name_es: 'Demostrativos de lugar',
    name_ca: 'Demostratius de lloc',
    name_en: 'Place demonstratives',
    explanation_es: 'ここ (aquí), そこ (ahí/allí cerca del oyente), あそこ (allá lejos) se usan para indicar lugares. La lógica de distancia es la misma que con これ/それ/あれ.',
    explanation_ca: 'ここ (aquí), そこ (allà proper a l\'oient), あそこ (allà lluny) s\'usen per indicar llocs. La lògica de distància és la mateixa que amb これ/それ/あれ.',
    explanation_en: 'ここ (here), そこ (there, near listener), あそこ (over there, far from both) indicate places. Same distance logic as これ/それ/あれ.',
    structure: [
      { text: 'ここ/そこ/あそこ', role: 'key',    isSlot: false },
      { text: 'は',              role: 'topic',  isSlot: false },
      { text: 'N',               role: 'noun',   isSlot: true, label_es: 'lugar', label_ca: 'lloc', label_en: 'place' },
      { text: 'です',            role: 'copula', isSlot: false },
    ],
    example: [
      { text: 'ここ',                              role: 'key',    gloss_es: 'aquí',      gloss_ca: 'aquí',     gloss_en: 'here' },
      { text: 'は',                                role: 'topic',  gloss_es: '[tema]',    gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: '受付', furigana: 'うけつけ',        role: 'noun',   gloss_es: 'recepción', gloss_ca: 'recepció', gloss_en: 'reception' },
      { text: 'です',                              role: 'copula', gloss_es: 'es',        gloss_ca: 'és',       gloss_en: 'is' },
    ],
    tip_es: 'Para preguntar "¿dónde está X?", usa どこ (dónde): 「トイレはどこですか」 → "¿Dónde está el baño?"',
    tip_ca: 'Per preguntar "on és X?", usa どこ (on): 「トイレはどこですか」 → "On és el bany?"',
    tip_en: 'To ask "where is X?", use どこ (where): 「トイレはどこですか」 → "Where is the toilet?"',
  },
  {
    id: 'mnn1-03-10',
    lesson: 3, number: 10, jlpt: 'N5',
    pattern: 'N は どこ ですか',
    name_es: '¿Dónde está N? (どこ)',
    name_ca: 'On és N? (どこ)',
    name_en: 'Where is N? (どこ)',
    explanation_es: 'どこ es la palabra interrogativa para preguntar "¿dónde?". Se coloca en el lugar del predicado, igual que en las frases afirmativas. Añade か al final para indicar que es pregunta.',
    explanation_ca: 'どこ és la paraula interrogativa per preguntar "on?". Es col·loca al lloc del predicat, igual que a les frases afirmatives. Afegeix か al final per indicar que és pregunta.',
    explanation_en: 'どこ is the question word for "where". It takes the place of the predicate, just like in affirmative sentences. Add か at the end to mark it as a question.',
    structure: [
      { text: 'N',    role: 'topic',  isSlot: true,  label_es: 'cosa/lugar', label_ca: 'cosa/lloc', label_en: 'thing/place' },
      { text: 'は',   role: 'topic',  isSlot: false },
      { text: 'どこ', role: 'key',    isSlot: false },
      { text: 'です', role: 'copula', isSlot: false },
      { text: 'か',   role: 'key',    isSlot: false },
    ],
    example: [
      { text: 'エレベーター',                      role: 'topic',  gloss_es: 'el ascensor', gloss_ca: 'l\'ascensor', gloss_en: 'the elevator' },
      { text: 'は',                                role: 'topic',  gloss_es: '[tema]',      gloss_ca: '[tema]',     gloss_en: '[topic]' },
      { text: 'どこ',                              role: 'key',    gloss_es: 'dónde',       gloss_ca: 'on',         gloss_en: 'where' },
      { text: 'です',                              role: 'copula', gloss_es: 'está',        gloss_ca: 'és',         gloss_en: 'is' },
      { text: 'か',                                role: 'key',    gloss_es: '¿?',          gloss_ca: '¿?',         gloss_en: '?' },
    ],
    tip_es: 'Respuesta típica: 「あそこです」(allá está) o 「3階です」(está en el 3er piso). Las respuestas cortas sin は son muy naturales.',
    tip_ca: 'Resposta típica: 「あそこです」(allà és) o 「3階です」(és al 3r pis). Les respostes curtes sense は són molt naturals.',
    tip_en: 'Typical answers: 「あそこです」(it\'s over there) or 「3階です」(it\'s on the 3rd floor). Short answers without は are natural.',
  },
  {
    id: 'mnn1-03-11',
    lesson: 3, number: 11, jlpt: 'N5',
    pattern: 'N₁ は N₂ の N₃ です',
    name_es: 'Identificación con の (pertenencia)',
    name_ca: 'Identificació amb の (pertinença)',
    name_en: 'Identification with の (belonging)',
    explanation_es: 'Combina la estructura NはNです con の para explicar a qué organización, lugar o persona pertenece alguien o algo. Muy útil para presentarse o presentar cosas.',
    explanation_ca: 'Combina l\'estructura NはNです amb の per explicar a quina organització, lloc o persona pertany algú o alguna cosa. Molt útil per presentar-se o presentar coses.',
    explanation_en: 'Combines NはNです with の to explain what organization, place, or person something belongs to. Very useful for introductions.',
    structure: [
      { text: 'N₁',  role: 'topic',    isSlot: true,  label_es: 'tema',         label_ca: 'tema',        label_en: 'topic' },
      { text: 'は',   role: 'topic',    isSlot: false },
      { text: 'N₂',  role: 'noun',     isSlot: true,  label_es: 'organización', label_ca: 'organització', label_en: 'organization' },
      { text: 'の',   role: 'particle', isSlot: false },
      { text: 'N₃',  role: 'noun',     isSlot: true,  label_es: 'cargo/nombre', label_ca: 'càrrec/nom',   label_en: 'role/name' },
      { text: 'です', role: 'copula',   isSlot: false },
    ],
    example: [
      { text: '私',     furigana: 'わたし',    role: 'topic',    gloss_es: 'yo',         gloss_ca: 'jo',       gloss_en: 'I' },
      { text: 'は',                            role: 'topic',    gloss_es: '[tema]',     gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: 'IMC',                           role: 'noun',     gloss_es: 'IMC',        gloss_ca: 'IMC',      gloss_en: 'IMC' },
      { text: 'の',                            role: 'particle', gloss_es: 'de',         gloss_ca: 'de',       gloss_en: 'from' },
      { text: 'マリア',                         role: 'noun',     gloss_es: 'María',      gloss_ca: 'Maria',    gloss_en: 'Maria' },
      { text: 'です',                          role: 'copula',   gloss_es: 'soy',        gloss_ca: 'sóc',      gloss_en: 'am' },
    ],
    tip_es: 'Esta estructura es la base de las presentaciones formales en Japón: nombre + empresa + cargo.',
    tip_ca: 'Aquesta estructura és la base de les presentacions formals al Japó: nom + empresa + càrrec.',
    tip_en: 'This pattern is the basis of formal introductions in Japan: name + company + position.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 4
// ─────────────────────────────────────────────────────────────────────────────

const ch4: GrammarPoint[] = [
  {
    id: 'mnn1-04-12',
    lesson: 4, number: 12, jlpt: 'N5',
    pattern: 'N を ください',
    name_es: 'Pedir algo (ください)',
    name_ca: 'Demanar alguna cosa (ください)',
    name_en: 'Requesting something (ください)',
    explanation_es: 'を ください significa "deme N" o "quiero N, por favor". を marca el objeto directo. ください es una forma educada de pedir algo. Se usa en tiendas, restaurantes y situaciones cotidianas.',
    explanation_ca: 'を ください significa "doni\'m N" o "vull N, si us plau". を marca l\'objecte directe. ください és una forma educada de demanar alguna cosa. S\'usa a botigues, restaurants i situacions quotidianes.',
    explanation_en: '"Give me N please" / "I\'ll take N". を marks the direct object and ください is the polite request form. Common in shops, restaurants, everyday situations.',
    structure: [
      { text: 'N',          role: 'object',    isSlot: true,  label_es: 'cosa pedida', label_ca: 'cosa demanada', label_en: 'requested item' },
      { text: 'を',         role: 'object',    isSlot: false },
      { text: 'ください',   role: 'key',       isSlot: false },
    ],
    example: [
      { text: 'この',                               role: 'key',    gloss_es: 'este',       gloss_ca: 'aquest',    gloss_en: 'this' },
      { text: 'カメラ',                             role: 'object', gloss_es: 'cámara',     gloss_ca: 'càmera',    gloss_en: 'camera' },
      { text: 'を',                                 role: 'object', gloss_es: '[objeto]',   gloss_ca: '[objecte]', gloss_en: '[object]' },
      { text: 'ください',                           role: 'key',    gloss_es: 'deme',       gloss_ca: 'doni\'m',   gloss_en: 'give me' },
    ],
    tip_es: 'ください también se usa con verbos en forma て para pedir acciones: 「見せてください」→ "Por favor, muéstramelo".',
    tip_ca: 'ください també s\'usa amb verbs en forma て per demanar accions: 「見せてください」→ "Si us plau, mostra\'m-ho".',
    tip_en: 'ください also follows て-form verbs to request actions: 「見せてください」→ "Please show me".',
  },
  {
    id: 'mnn1-04-13',
    lesson: 4, number: 13, jlpt: 'N5',
    pattern: 'いくら ですか',
    name_es: '¿Cuánto cuesta? (いくら)',
    name_ca: 'Quant costa? (いくら)',
    name_en: 'How much is it? (いくら)',
    explanation_es: 'いくら es la palabra interrogativa para preguntar el precio o la cantidad. Se usa directamente antes de ですか. Los precios en japonés van en yenes (円 / えん).',
    explanation_ca: 'いくら és la paraula interrogativa per preguntar el preu o la quantitat. S\'usa directament abans de ですか. Els preus en japonès van en iens (円 / えん).',
    explanation_en: 'いくら asks for price or amount. It comes directly before ですか. Japanese prices are in yen (円 / えん).',
    structure: [
      { text: 'N',     role: 'topic',  isSlot: true,  label_es: 'artículo', label_ca: 'article', label_en: 'item' },
      { text: 'は',    role: 'topic',  isSlot: false },
      { text: 'いくら', role: 'key',   isSlot: false },
      { text: 'です',  role: 'copula', isSlot: false },
      { text: 'か',    role: 'key',    isSlot: false },
    ],
    example: [
      { text: 'この',                               role: 'key',    gloss_es: 'este',       gloss_ca: 'aquest',    gloss_en: 'this' },
      { text: 'とけい',                             role: 'topic',  gloss_es: 'reloj',      gloss_ca: 'rellotge',  gloss_en: 'watch' },
      { text: 'は',                                 role: 'topic',  gloss_es: '[tema]',     gloss_ca: '[tema]',    gloss_en: '[topic]' },
      { text: 'いくら',                             role: 'key',    gloss_es: 'cuánto',     gloss_ca: 'quant',     gloss_en: 'how much' },
      { text: 'です',                               role: 'copula', gloss_es: 'cuesta',     gloss_ca: 'costa',     gloss_en: 'is' },
      { text: 'か',                                 role: 'key',    gloss_es: '¿?',         gloss_ca: '¿?',        gloss_en: '?' },
    ],
    tip_es: 'Respuesta: 「3,000円です」(son 3.000 yenes). Los números en japonés: 100=百、1000=千、10000=万.',
    tip_ca: 'Resposta: 「3,000円です」(són 3.000 iens). Els números en japonès: 100=百、1000=千、10000=万.',
    tip_en: 'Answer: 「3,000円です」(it\'s 3,000 yen). Japanese numbers: 100=百, 1000=千, 10000=万.',
  },
  {
    id: 'mnn1-04-14',
    lesson: 4, number: 14, jlpt: 'N5',
    pattern: 'N₁ と N₂',
    name_es: 'Listar nombres con と',
    name_ca: 'Llistar noms amb と',
    name_en: 'Listing nouns with と',
    explanation_es: 'と conecta nombres para listarlos de forma exhaustiva, como "y" en español. A diferencia del español, と va DESPUÉS de cada elemento. Solo une nombres (no verbos ni frases).',
    explanation_ca: 'と connecta noms per llistar-los de forma exhaustiva, com "i" en català. A diferència del català, と va DESPRÉS de cada element. Només uneix noms (no verbs ni frases).',
    explanation_en: 'と links nouns exhaustively, like "and" in English. Unlike English "and", と follows each item. It only connects nouns (not verbs or clauses).',
    structure: [
      { text: 'N₁', role: 'noun',     isSlot: true,  label_es: 'nombre 1', label_ca: 'nom 1', label_en: 'noun 1' },
      { text: 'と',  role: 'particle', isSlot: false },
      { text: 'N₂', role: 'noun',     isSlot: true,  label_es: 'nombre 2', label_ca: 'nom 2', label_en: 'noun 2' },
    ],
    example: [
      { text: 'すし',                               role: 'noun',     gloss_es: 'sushi',    gloss_ca: 'sushi',    gloss_en: 'sushi' },
      { text: 'と',                                 role: 'particle', gloss_es: 'y',        gloss_ca: 'i',        gloss_en: 'and' },
      { text: 'てんぷら',                           role: 'noun',     gloss_es: 'tempura',  gloss_ca: 'tempura',  gloss_en: 'tempura' },
      { text: 'を',                                 role: 'object',   gloss_es: '[objeto]', gloss_ca: '[objecte]', gloss_en: '[object]' },
      { text: 'ください',                           role: 'key',      gloss_es: 'deme',     gloss_ca: 'doni\'m',  gloss_en: 'give me' },
    ],
    tip_es: 'Para listas no exhaustivas ("A, B y otras cosas más") usa や en lugar de と.',
    tip_ca: 'Per a llistes no exhaustives ("A, B i altres coses") usa や en lloc de と.',
    tip_en: 'For non-exhaustive lists ("A, B and other things") use や instead of と.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 5
// ─────────────────────────────────────────────────────────────────────────────

const ch5: GrammarPoint[] = [
  {
    id: 'mnn1-05-15',
    lesson: 5, number: 15, jlpt: 'N5',
    pattern: 'V ます / V ません',
    name_es: 'Forma ます (presente/futuro)',
    name_ca: 'Forma ます (present/futur)',
    name_en: 'ます form (present/future)',
    explanation_es: 'La forma ます es la forma educada del verbo. Expresa acciones presentes habituales o acciones futuras. ません es la negación. En japonés no hay distinción entre presente simple y futuro.',
    explanation_ca: 'La forma ます és la forma educada del verb. Expressa accions presents habituals o accions futures. ません és la negació. En japonès no hi ha distinció entre present simple i futur.',
    explanation_en: 'ます is the polite verb form. It expresses habitual present actions or future actions. ません is the negative. Japanese makes no distinction between simple present and future.',
    structure: [
      { text: 'V',    role: 'verb', isSlot: true,  label_es: 'verbo',     label_ca: 'verb',     label_en: 'verb' },
      { text: 'ます',  role: 'key',  isSlot: false },
      { text: '／',   role: 'noun', isSlot: false },
      { text: 'V',    role: 'verb', isSlot: true,  label_es: 'verbo',     label_ca: 'verb',     label_en: 'verb' },
      { text: 'ません', role: 'key', isSlot: false },
    ],
    example: [
      { text: '毎日', furigana: 'まいにち',          role: 'time',  gloss_es: 'cada día',     gloss_ca: 'cada dia',    gloss_en: 'every day' },
      { text: '日本語', furigana: 'にほんご',        role: 'object', gloss_es: 'japonés',     gloss_ca: 'japonès',     gloss_en: 'Japanese' },
      { text: 'を',                                  role: 'object', gloss_es: '[objeto]',    gloss_ca: '[objecte]',   gloss_en: '[object]' },
      { text: '勉強し', furigana: 'べんきょうし',    role: 'verb',  gloss_es: 'estudio',      gloss_ca: 'estudio',     gloss_en: 'study' },
      { text: 'ます',                                role: 'key',   gloss_es: '[presente]',   gloss_ca: '[present]',   gloss_en: '[present]' },
    ],
    tip_es: 'Los verbos en ます siempre terminan en -ます (positivo), -ません (negativo), -ました (pasado), -ませんでした (pasado negativo).',
    tip_ca: 'Els verbs en ます sempre acaben en -ます (positiu), -ません (negatiu), -ました (passat), -ませんでした (passat negatiu).',
    tip_en: 'ます-form verbs always end in: -ます (positive), -ません (negative), -ました (past), -ませんでした (past negative).',
  },
  {
    id: 'mnn1-05-16',
    lesson: 5, number: 16, jlpt: 'N5',
    pattern: 'N を V ます',
    name_es: 'Objeto directo con を',
    name_ca: 'Objecte directe amb を',
    name_en: 'Direct object with を',
    explanation_es: 'を marca el objeto directo del verbo transitivo (el verbo "hace algo A"). Va siempre DESPUÉS del nombre y ANTES del verbo. En español corresponde al complemento directo sin preposición.',
    explanation_ca: 'を marca l\'objecte directe del verb transitiu (el verb "fa alguna cosa a"). Va sempre DESPRÉS del nom i ABANS del verb. En català correspon al complement directe sense preposició.',
    explanation_en: 'を marks the direct object of a transitive verb (what the verb acts upon). It always comes AFTER the noun and BEFORE the verb.',
    structure: [
      { text: 'N',    role: 'object', isSlot: true,  label_es: 'objeto', label_ca: 'objecte', label_en: 'object' },
      { text: 'を',   role: 'object', isSlot: false },
      { text: 'V',    role: 'verb',   isSlot: true,  label_es: 'verbo',  label_ca: 'verb',    label_en: 'verb' },
      { text: 'ます',  role: 'key',   isSlot: false },
    ],
    example: [
      { text: '音楽', furigana: 'おんがく',          role: 'object', gloss_es: 'música',     gloss_ca: 'música',    gloss_en: 'music' },
      { text: 'を',                                  role: 'object', gloss_es: '[objeto]',   gloss_ca: '[objecte]', gloss_en: '[object]' },
      { text: '聞き', furigana: 'きき',              role: 'verb',   gloss_es: 'escucho',    gloss_ca: 'escolto',   gloss_en: 'listen to' },
      { text: 'ます',                                role: 'key',    gloss_es: '[presente]', gloss_ca: '[present]', gloss_en: '[present]' },
    ],
    tip_es: 'Verbos transitivos comunes: 食べます (comer), 飲みます (beber), 見ます (ver), 読みます (leer), 書きます (escribir), 買います (comprar).',
    tip_ca: 'Verbs transitius comuns: 食べます (menjar), 飲みます (beure), 見ます (veure), 読みます (llegir), 書きます (escriure), 買います (comprar).',
    tip_en: 'Common transitive verbs: 食べます (eat), 飲みます (drink), 見ます (see), 読みます (read), 書きます (write), 買います (buy).',
  },
  {
    id: 'mnn1-05-17',
    lesson: 5, number: 17, jlpt: 'N5',
    pattern: 'N で V ます',
    name_es: 'Lugar de la acción (で)',
    name_ca: 'Lloc de l\'acció (で)',
    name_en: 'Place of action (で)',
    explanation_es: 'で indica el lugar DONDE ocurre una acción. Es diferente de に (que indica existencia o dirección). で + lugar = "en/a [lugar]" cuando hay una acción activa.',
    explanation_ca: 'で indica el lloc ON ocorre una acció. És diferent de に (que indica existència o direcció). で + lloc = "a [lloc]" quan hi ha una acció activa.',
    explanation_en: 'で indicates WHERE an action takes place. It differs from に (which marks existence or destination). で + place = "at/in [place]" when an active action occurs.',
    structure: [
      { text: 'N',    role: 'location', isSlot: true,  label_es: 'lugar',     label_ca: 'lloc',     label_en: 'place' },
      { text: 'で',   role: 'location', isSlot: false },
      { text: 'V',    role: 'verb',     isSlot: true,  label_es: 'verbo',     label_ca: 'verb',     label_en: 'verb' },
      { text: 'ます',  role: 'key',     isSlot: false },
    ],
    example: [
      { text: '図書館', furigana: 'としょかん',       role: 'location', gloss_es: 'la biblioteca', gloss_ca: 'la biblioteca', gloss_en: 'the library' },
      { text: 'で',                                   role: 'location', gloss_es: 'en',           gloss_ca: 'a',            gloss_en: 'at' },
      { text: '本',    furigana: 'ほん',              role: 'object',   gloss_es: 'libro',        gloss_ca: 'llibre',       gloss_en: 'book' },
      { text: 'を',                                   role: 'object',   gloss_es: '[objeto]',     gloss_ca: '[objecte]',    gloss_en: '[object]' },
      { text: '読み',  furigana: 'よみ',              role: 'verb',     gloss_es: 'leo',          gloss_ca: 'llegeixo',     gloss_en: 'read' },
      { text: 'ます',                                 role: 'key',      gloss_es: '[presente]',   gloss_ca: '[present]',    gloss_en: '[present]' },
    ],
    tip_es: 'Clave: で = acción activa en un lugar. に = existencia ("está en") o dirección ("va a"). Ejemplo: 「学校で勉強します」(estudio en la escuela) vs 「学校にいます」(estoy en la escuela).',
    tip_ca: 'Clau: で = acció activa en un lloc. に = existència ("és a") o direcció ("va a"). Exemple: 「学校で勉強します」(estudio a l\'escola) vs 「学校にいます」(sóc a l\'escola).',
    tip_en: 'Key distinction: で = active action at a place. に = existence ("is at") or destination ("goes to"). Example: 「学校で勉強します」(study at school) vs 「学校にいます」(am at school).',
  },
  {
    id: 'mnn1-05-18',
    lesson: 5, number: 18, jlpt: 'N5',
    pattern: 'N に 行きます / 来ます / 帰ります',
    name_es: 'Dirección con に (ir/venir/volver)',
    name_ca: 'Direcció amb に (anar/venir/tornar)',
    name_en: 'Direction with に (go/come/return)',
    explanation_es: 'に indica el destino o dirección del movimiento. Los tres verbos de movimiento principales son: 行きます (ir), 来ます (venir), 帰ります (volver a casa/al origen). へ (e) también indica dirección pero es más literario.',
    explanation_ca: 'に indica el destí o direcció del moviment. Els tres verbs de moviment principals són: 行きます (anar), 来ます (venir), 帰ります (tornar a casa/l\'origen). へ (e) també indica direcció però és més literari.',
    explanation_en: 'に marks the destination of movement. The three main movement verbs are: 行きます (go), 来ます (come), 帰ります (return/go back home). へ (e) also marks direction but is more literary.',
    structure: [
      { text: 'N',        role: 'direction', isSlot: true,  label_es: 'destino',  label_ca: 'destinació', label_en: 'destination' },
      { text: 'に',       role: 'direction', isSlot: false },
      { text: '行き/来/帰り', role: 'verb',  isSlot: false },
      { text: 'ます',     role: 'key',       isSlot: false },
    ],
    example: [
      { text: '明日',   furigana: 'あした',           role: 'time',      gloss_es: 'mañana',   gloss_ca: 'demà',    gloss_en: 'tomorrow' },
      { text: '東京',   furigana: 'とうきょう',       role: 'direction', gloss_es: 'a Tokio',  gloss_ca: 'a Tòquio', gloss_en: 'to Tokyo' },
      { text: 'に',                                   role: 'direction', gloss_es: 'a',        gloss_ca: 'a',       gloss_en: 'to' },
      { text: '行き',   furigana: 'いき',             role: 'verb',      gloss_es: 'voy',      gloss_ca: 'vaig',    gloss_en: 'go' },
      { text: 'ます',                                 role: 'key',       gloss_es: '[futuro]', gloss_ca: '[futur]', gloss_en: '[future]' },
    ],
    tip_es: '来ます (kimasu) se usa desde la perspectiva del oyente o destino. Si el oyente está en casa, dices 「家に来ます」; si eres tú quien va, dices 「家に帰ります」.',
    tip_ca: '来ます (kimasu) s\'usa des de la perspectiva de l\'oient o destinació. Si l\'oient és a casa, dius 「家に来ます」; si ets tu qui hi vas, dius 「家に帰ります」.',
    tip_en: '来ます (kimasu) is used from the listener\'s or destination\'s perspective. If the listener is at home, say 「家に来ます」; if you\'re going there yourself, say 「家に帰ります」.',
  },
  {
    id: 'mnn1-05-19',
    lesson: 5, number: 19, jlpt: 'N5',
    pattern: 'N と 行きます / 来ます / 帰ります',
    name_es: 'Compañía con と (junto con)',
    name_ca: 'Companyia amb と (juntament amb)',
    name_en: 'Company with と (together with)',
    explanation_es: 'と después de un nombre de persona indica compañía: "con [persona]". Es diferente del と que une nombres en lista. Aquí と significa "junto con / acompañado de".',
    explanation_ca: 'と després d\'un nom de persona indica companyia: "amb [persona]". És diferent del と que uneix noms en llista. Aquí と significa "juntament amb / acompanyat de".',
    explanation_en: 'と after a person\'s name means "together with [person]". Different from the と that lists nouns. Here と means "with / accompanied by".',
    structure: [
      { text: 'N',    role: 'noun',      isSlot: true,  label_es: 'persona',   label_ca: 'persona',   label_en: 'person' },
      { text: 'と',   role: 'key',       isSlot: false },
      { text: 'V',    role: 'verb',      isSlot: true,  label_es: 'verbo mov.', label_ca: 'verb mov.', label_en: 'motion verb' },
      { text: 'ます',  role: 'key',      isSlot: false },
    ],
    example: [
      { text: '友達', furigana: 'ともだち',            role: 'noun',   gloss_es: 'amigos',     gloss_ca: 'amics',      gloss_en: 'friends' },
      { text: 'と',                                    role: 'key',    gloss_es: 'con',        gloss_ca: 'amb',        gloss_en: 'with' },
      { text: '映画館', furigana: 'えいがかん',        role: 'direction', gloss_es: 'al cine',  gloss_ca: 'al cinema',  gloss_en: 'to the cinema' },
      { text: 'に',                                    role: 'direction', gloss_es: 'a',        gloss_ca: 'a',          gloss_en: 'to' },
      { text: '行き',  furigana: 'いき',               role: 'verb',   gloss_es: 'voy',        gloss_ca: 'vaig',       gloss_en: 'go' },
      { text: 'ます',                                  role: 'key',    gloss_es: '[presente]', gloss_ca: '[present]',  gloss_en: '[present]' },
    ],
    tip_es: 'Para preguntar con quién: 「だれと行きましたか」→ "¿Con quién fuiste?" 一人で (hitori de) significa "solo/a".',
    tip_ca: 'Per preguntar amb qui: 「だれと行きましたか」→ "Amb qui has anat?" 一人で (hitori de) significa "sol/a".',
    tip_en: 'To ask who with: 「だれと行きましたか」→ "Who did you go with?" 一人で (hitori de) means "alone".',
  },
  {
    id: 'mnn1-05-20',
    lesson: 5, number: 20, jlpt: 'N5',
    pattern: 'N で 行きます (medio de transporte)',
    name_es: 'Medio de transporte (で)',
    name_ca: 'Mitjà de transport (で)',
    name_en: 'Means of transport (で)',
    explanation_es: 'で también indica el medio o herramienta usada para realizar una acción. Cuando se habla de transporte, で + vehículo significa "en/por [transporte]". Equivale a "en tren / en coche / en avión".',
    explanation_ca: 'で també indica el mitjà o eina usada per realitzar una acció. Quan es parla de transport, で + vehicle significa "en/per [transport]". Equivalent a "en tren / en cotxe / en avió".',
    explanation_en: 'で also marks the means or tool used for an action. For transport, で + vehicle means "by [transport]". It\'s equivalent to "by train / by car / by plane".',
    structure: [
      { text: 'N',    role: 'location', isSlot: true,  label_es: 'transporte', label_ca: 'transport', label_en: 'transport' },
      { text: 'で',   role: 'key',      isSlot: false },
      { text: 'V',    role: 'verb',     isSlot: true,  label_es: 'verbo mov.', label_ca: 'verb mov.', label_en: 'motion verb' },
      { text: 'ます',  role: 'key',     isSlot: false },
    ],
    example: [
      { text: '電車', furigana: 'でんしゃ',            role: 'location', gloss_es: 'tren',       gloss_ca: 'tren',       gloss_en: 'train' },
      { text: 'で',                                    role: 'key',      gloss_es: 'en',         gloss_ca: 'en',         gloss_en: 'by' },
      { text: '大阪', furigana: 'おおさか',            role: 'direction', gloss_es: 'a Osaka',   gloss_ca: 'a Osaka',    gloss_en: 'to Osaka' },
      { text: 'に',                                    role: 'direction', gloss_es: 'a',         gloss_ca: 'a',          gloss_en: 'to' },
      { text: '行き',  furigana: 'いき',               role: 'verb',     gloss_es: 'voy',        gloss_ca: 'vaig',       gloss_en: 'go' },
      { text: 'ます',                                  role: 'key',      gloss_es: '[presente]', gloss_ca: '[present]',  gloss_en: '[present]' },
    ],
    tip_es: 'A pie / andando: 「歩いて」(aruite) — se usa て, no で. Ej: 「歩いて行きます」→ "Voy andando".',
    tip_ca: 'A peu / caminant: 「歩いて」(aruite) — s\'usa て, no で. Ex: 「歩いて行きます」→ "Hi vaig a peu".',
    tip_en: 'On foot / walking: 「歩いて」(aruite) — uses て, not で. E.g.: 「歩いて行きます」→ "I go on foot".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 6
// ─────────────────────────────────────────────────────────────────────────────

const ch6: GrammarPoint[] = [
  {
    id: 'mnn1-06-21',
    lesson: 6, number: 21, jlpt: 'N5',
    pattern: 'Time に V ます',
    name_es: 'Partícula に con tiempo (cuándo)',
    name_ca: 'Partícula に amb temps (quan)',
    name_en: 'Particle に with time (when)',
    explanation_es: 'に se usa con horas exactas, días de la semana y meses para indicar cuándo ocurre una acción. NO se usa con palabras relativas como 今日 (hoy), 明日 (mañana) o 毎日 (cada día), que van sin partícula.',
    explanation_ca: 'に s\'usa amb hores exactes, dies de la setmana i mesos per indicar quan ocorre una acció. NO s\'usa amb paraules relatives com 今日 (avui), 明日 (demà) o 毎日 (cada dia), que van sense partícula.',
    explanation_en: 'に marks specific times: clock times, days of the week, months. It is NOT used with relative time words like 今日 (today), 明日 (tomorrow), 毎日 (every day) — those go without a particle.',
    structure: [
      { text: 'Time', role: 'time', isSlot: true,  label_es: 'hora/día', label_ca: 'hora/dia', label_en: 'time' },
      { text: 'に',   role: 'time', isSlot: false },
      { text: 'V',    role: 'verb', isSlot: true,  label_es: 'verbo',    label_ca: 'verb',     label_en: 'verb' },
      { text: 'ます',  role: 'key', isSlot: false },
    ],
    example: [
      { text: '月曜日', furigana: 'げつようび', role: 'time',   gloss_es: 'el lunes',   gloss_ca: 'el dilluns',  gloss_en: 'on Monday' },
      { text: 'に',                              role: 'time',   gloss_es: 'en',          gloss_ca: 'en',          gloss_en: 'on' },
      { text: '日本語', furigana: 'にほんご',   role: 'object', gloss_es: 'japonés',     gloss_ca: 'japonès',     gloss_en: 'Japanese' },
      { text: 'の',                              role: 'particle', gloss_es: 'de',        gloss_ca: 'de',          gloss_en: 'of' },
      { text: '授業', furigana: 'じゅぎょう',   role: 'object', gloss_es: 'clase',       gloss_ca: 'classe',      gloss_en: 'class' },
      { text: 'が',                              role: 'subject', gloss_es: '[sujeto]',   gloss_ca: '[subjecte]',  gloss_en: '[subject]' },
      { text: 'あり',                            role: 'verb',   gloss_es: 'hay/tengo',   gloss_ca: 'hi ha/tinc',  gloss_en: 'have/there is' },
      { text: 'ます',                            role: 'key',    gloss_es: '[presente]',  gloss_ca: '[present]',   gloss_en: '[present]' },
    ],
    tip_es: 'Regla fácil: si la expresión de tiempo incluye un número (3時、月曜日、10月…) → usa に. Si es una palabra sola como 今日、明日、毎日 → sin partícula.',
    tip_ca: 'Regla fàcil: si l\'expressió de temps inclou un número (3時、月曜日、10月…) → usa に. Si és una paraula sola com 今日、明日、毎日 → sense partícula.',
    tip_en: 'Easy rule: if the time expression includes a number (3時, 月曜日, 10月…) → use に. If it\'s a standalone word like 今日, 明日, 毎日 → no particle.',
  },
  {
    id: 'mnn1-06-22',
    lesson: 6, number: 22, jlpt: 'N5',
    pattern: 'N₁ から N₂ まで',
    name_es: 'Desde ~ hasta ~ (から・まで)',
    name_ca: 'Des de ~ fins a ~ (から・まで)',
    name_en: 'From ~ to ~ (から・まで)',
    explanation_es: 'から indica el punto de inicio (tiempo o lugar) y まで indica el punto final. Pueden usarse solos o juntos. "から" sola = "desde/a partir de". "まで" solo = "hasta".',
    explanation_ca: 'から indica el punt d\'inici (temps o lloc) i まで indica el punt final. Es poden usar sols o junts. "から" sol = "des de/a partir de". "まで" sol = "fins a".',
    explanation_en: 'から marks the starting point (time or place) and まで marks the endpoint. They can be used alone or together. から alone = "from/since". まで alone = "until/as far as".',
    structure: [
      { text: 'N₁',  role: 'time',     isSlot: true,  label_es: 'inicio',  label_ca: 'inici',   label_en: 'start' },
      { text: 'から', role: 'key',     isSlot: false },
      { text: 'N₂',  role: 'time',     isSlot: true,  label_es: 'fin',     label_ca: 'final',   label_en: 'end' },
      { text: 'まで', role: 'key',     isSlot: false },
      { text: 'V',   role: 'verb',     isSlot: true,  label_es: 'verbo',   label_ca: 'verb',    label_en: 'verb' },
      { text: 'ます', role: 'key',     isSlot: false },
    ],
    example: [
      { text: '9時',  furigana: 'くじ',  role: 'time', gloss_es: 'las 9',  gloss_ca: 'les 9',  gloss_en: '9 o\'clock' },
      { text: 'から',                    role: 'key',  gloss_es: 'desde',  gloss_ca: 'des de', gloss_en: 'from' },
      { text: '5時',  furigana: 'ごじ',  role: 'time', gloss_es: 'las 5',  gloss_ca: 'les 5',  gloss_en: '5 o\'clock' },
      { text: 'まで',                    role: 'key',  gloss_es: 'hasta',  gloss_ca: 'fins a', gloss_en: 'until' },
      { text: '働き', furigana: 'はたらき', role: 'verb', gloss_es: 'trabajo', gloss_ca: 'treballo', gloss_en: 'work' },
      { text: 'ます',                    role: 'key',  gloss_es: '[pres.]', gloss_ca: '[pres.]', gloss_en: '[pres.]' },
    ],
    tip_es: 'から/まで sirven igual para tiempo (9時から5時まで) y para lugar (東京から京都まで). La estructura es idéntica.',
    tip_ca: 'から/まで serveixen igual per a temps (9時から5時まで) i per a lloc (東京から京都まで). L\'estructura és idèntica.',
    tip_en: 'から/まで work the same for time (9時から5時まで) and place (東京から京都まで). The structure is identical.',
  },
  {
    id: 'mnn1-06-23',
    lesson: 6, number: 23, jlpt: 'N5',
    pattern: 'どのくらい かかりますか',
    name_es: '¿Cuánto tiempo/dinero se tarda?',
    name_ca: 'Quant de temps/diners es triga?',
    name_en: 'How long / how much does it take?',
    explanation_es: 'どのくらい (¿cuánto?) pregunta por duración o distancia. かかります significa "llevar tiempo / costar dinero / necesitar". Es un verbo muy útil para hablar de trayectos y esfuerzos.',
    explanation_ca: 'どのくらい (quant?) pregunta per durada o distància. かかります significa "trigar / costar diners / necessitar". És un verb molt útil per parlar de trajectes i esforços.',
    explanation_en: 'どのくらい (how much/how long?) asks about duration or distance. かかります means "to take (time/money/effort)". Very useful for talking about journeys.',
    structure: [
      { text: 'N',        role: 'direction', isSlot: true,  label_es: 'destino',  label_ca: 'destinació', label_en: 'destination' },
      { text: 'まで',      role: 'key',      isSlot: false },
      { text: 'どのくらい', role: 'key',     isSlot: false },
      { text: 'かかり',   role: 'verb',      isSlot: false },
      { text: 'ますか',   role: 'key',       isSlot: false },
    ],
    example: [
      { text: '大阪', furigana: 'おおさか', role: 'direction', gloss_es: 'a Osaka',    gloss_ca: 'a Osaka',    gloss_en: 'to Osaka' },
      { text: 'まで',                       role: 'key',       gloss_es: 'hasta',       gloss_ca: 'fins a',     gloss_en: 'until' },
      { text: 'どのくらい',                 role: 'key',       gloss_es: 'cuánto',      gloss_ca: 'quant',      gloss_en: 'how long' },
      { text: 'かかり',                     role: 'verb',      gloss_es: 'se tarda',    gloss_ca: 'es triga',   gloss_en: 'does it take' },
      { text: 'ますか',                     role: 'key',       gloss_es: '¿?',          gloss_ca: '¿?',         gloss_en: '?' },
    ],
    tip_es: 'Respuesta: 「2時間ぐらいかかります」(se tarda unas 2 horas). ぐらい/くらい = "aproximadamente".',
    tip_ca: 'Resposta: 「2時間ぐらいかかります」(es triga unes 2 hores). ぐらい/くらい = "aproximadament".',
    tip_en: 'Answer: 「2時間ぐらいかかります」(it takes about 2 hours). ぐらい/くらい = "approximately".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 7
// ─────────────────────────────────────────────────────────────────────────────

const ch7: GrammarPoint[] = [
  {
    id: 'mnn1-07-24',
    lesson: 7, number: 24, jlpt: 'N5',
    pattern: 'N が あります / います',
    name_es: 'Existencia: hay N (あります・います)',
    name_ca: 'Existència: hi ha N (あります・います)',
    name_en: 'Existence: there is N (あります・います)',
    explanation_es: 'あります expresa existencia de cosas inanimadas (objetos, plantas). います se usa para personas y animales. La distinción es fundamental: cosas → あります, seres vivos → います.',
    explanation_ca: 'あります expressa existència de coses inanimades (objectes, plantes). います s\'usa per a persones i animals. La distinció és fonamental: coses → あります, éssers vius → います.',
    explanation_en: 'あります expresses existence of inanimate things (objects, plants). います is for living beings (people, animals). The distinction is crucial: things → あります, living beings → います.',
    structure: [
      { text: 'N',   role: 'subject', isSlot: true,  label_es: 'cosa/persona', label_ca: 'cosa/persona', label_en: 'thing/person' },
      { text: 'が',  role: 'subject', isSlot: false },
      { text: 'あります', role: 'key', isSlot: false },
      { text: '／',  role: 'noun',   isSlot: false },
      { text: 'います', role: 'key',  isSlot: false },
    ],
    example: [
      { text: '公園', furigana: 'こうえん', role: 'location', gloss_es: 'en el parque', gloss_ca: 'al parc',       gloss_en: 'in the park' },
      { text: 'に',                          role: 'location', gloss_es: 'en',           gloss_ca: 'al',            gloss_en: 'in' },
      { text: '犬',   furigana: 'いぬ',      role: 'subject',  gloss_es: 'un perro',     gloss_ca: 'un gos',        gloss_en: 'a dog' },
      { text: 'が',                          role: 'subject',  gloss_es: '[sujeto]',     gloss_ca: '[subjecte]',    gloss_en: '[subject]' },
      { text: 'い',                          role: 'verb',     gloss_es: 'hay/está',     gloss_ca: 'hi ha/és',      gloss_en: 'there is' },
      { text: 'ます',                        role: 'key',      gloss_es: '[presente]',   gloss_ca: '[present]',     gloss_en: '[present]' },
    ],
    tip_es: 'Excepciones: el robot → あります (objeto). La tortuga → います (animal). Las flores → あります (planta). Si tienes dudas, pregúntate: ¿se mueve por sí solo? → います.',
    tip_ca: 'Excepcions: el robot → あります (objecte). La tortuga → います (animal). Les flors → あります (planta). Si tens dubtes, pregunta\'t: es mou per si sol? → います.',
    tip_en: 'Exceptions: robot → あります (object). Turtle → います (animal). Flowers → あります (plant). When in doubt: does it move on its own? → います.',
  },
  {
    id: 'mnn1-07-25',
    lesson: 7, number: 25, jlpt: 'N5',
    pattern: 'N₁ に N₂ が あります / います',
    name_es: 'Ubicación de existencia (に + が)',
    name_ca: 'Ubicació d\'existència (に + が)',
    name_en: 'Location of existence (に + が)',
    explanation_es: 'N₁ に N₂ が あります/います expresa que "N₂ está en N₁" — el lugar va ANTES con に, la cosa/persona va con が. Es la estructura para decir dónde existe algo.',
    explanation_ca: 'N₁ に N₂ が あります/います expressa que "N₂ és a N₁" — el lloc va ABANS amb に, la cosa/persona va amb が. És l\'estructura per dir on existeix alguna cosa.',
    explanation_en: 'N₁ に N₂ が あります/います means "N₂ is at N₁" — the location comes FIRST with に, the thing/person uses が. This is the structure for saying where something exists.',
    structure: [
      { text: 'N₁', role: 'location', isSlot: true,  label_es: 'lugar',    label_ca: 'lloc',    label_en: 'place' },
      { text: 'に',  role: 'location', isSlot: false },
      { text: 'N₂', role: 'subject',  isSlot: true,  label_es: 'cosa/pers.', label_ca: 'cosa/pers.', label_en: 'thing/person' },
      { text: 'が',  role: 'subject',  isSlot: false },
      { text: 'あります/います', role: 'key', isSlot: false },
    ],
    example: [
      { text: '机',   furigana: 'つくえ', role: 'location', gloss_es: 'en la mesa',  gloss_ca: 'a la taula', gloss_en: 'on the desk' },
      { text: 'の上', furigana: 'のうえ', role: 'location', gloss_es: 'encima',      gloss_ca: 'a sobre',    gloss_en: 'on top' },
      { text: 'に',                       role: 'location', gloss_es: 'en',           gloss_ca: 'a',          gloss_en: 'on' },
      { text: '本',   furigana: 'ほん',   role: 'subject',  gloss_es: 'un libro',    gloss_ca: 'un llibre',  gloss_en: 'a book' },
      { text: 'が',                       role: 'subject',  gloss_es: '[sujeto]',    gloss_ca: '[subjecte]', gloss_en: '[subject]' },
      { text: 'あり',                     role: 'verb',     gloss_es: 'hay/está',    gloss_ca: 'hi ha/és',   gloss_en: 'there is' },
      { text: 'ます',                     role: 'key',      gloss_es: '[presente]',  gloss_ca: '[present]',  gloss_en: '[present]' },
    ],
    tip_es: 'Comparar con "NはNにあります": el tema cambia. 「本はどこにありますか」(¿Dónde está el libro?) usa は porque el libro ya es conocido.',
    tip_ca: 'Comparar amb "NはNにあります": el tema canvia. 「本はどこにありますか」(On és el llibre?) usa は perquè el llibre ja és conegut.',
    tip_en: 'Compare with "NはNにあります": topic changes. 「本はどこにありますか」(Where is the book?) uses は because the book is already known.',
  },
  {
    id: 'mnn1-07-26',
    lesson: 7, number: 26, jlpt: 'N5',
    pattern: 'N₁ の [位置] に N₂ が あります',
    name_es: 'Palabras de posición (上・下・前・右…)',
    name_ca: 'Paraules de posició (上・下・前・右…)',
    name_en: 'Position words (上・下・前・右…)',
    explanation_es: 'El japonés usa palabras de posición después de の para indicar la ubicación relativa: 上 (arriba/encima), 下 (abajo/debajo), 前 (delante), 後ろ (detrás), 右 (derecha), 左 (izquierda), 中 (dentro), となり (al lado), そば (cerca de).',
    explanation_ca: 'El japonès usa paraules de posició després de の per indicar la ubicació relativa: 上 (a dalt/sobre), 下 (a baix/sota), 前 (davant), 後ろ (darrere), 右 (dreta), 左 (esquerra), 中 (dins), となり (al costat), そば (a prop de).',
    explanation_en: 'Japanese uses position words after の to indicate relative location: 上 (above/on top), 下 (below/under), 前 (in front), 後ろ (behind), 右 (right), 左 (left), 中 (inside), となり (next to), そば (near).',
    structure: [
      { text: 'N₁',  role: 'noun',     isSlot: true,  label_es: 'referencia', label_ca: 'referència', label_en: 'reference' },
      { text: 'の',   role: 'particle', isSlot: false },
      { text: '上/下/前…', role: 'key', isSlot: false },
      { text: 'に',   role: 'location', isSlot: false },
      { text: 'N₂',  role: 'subject',  isSlot: true,  label_es: 'cosa',   label_ca: 'cosa',    label_en: 'thing' },
      { text: 'が',   role: 'subject',  isSlot: false },
      { text: 'あります', role: 'verb', isSlot: false },
    ],
    example: [
      { text: 'テレビ',                    role: 'noun',     gloss_es: 'la tele',    gloss_ca: 'la tele',    gloss_en: 'the TV' },
      { text: 'の',                        role: 'particle', gloss_es: 'de/del',     gloss_ca: 'de/del',     gloss_en: 'of' },
      { text: '上',  furigana: 'うえ',    role: 'key',      gloss_es: 'encima',     gloss_ca: 'a sobre',    gloss_en: 'on top' },
      { text: 'に',                        role: 'location', gloss_es: 'en',         gloss_ca: 'a',          gloss_en: 'on' },
      { text: 'ねこ',                      role: 'subject',  gloss_es: 'un gato',    gloss_ca: 'un gat',     gloss_en: 'a cat' },
      { text: 'が',                        role: 'subject',  gloss_es: '[sujeto]',   gloss_ca: '[subjecte]', gloss_en: '[subject]' },
      { text: 'い',                        role: 'verb',     gloss_es: 'está/hay',   gloss_ca: 'hi ha/és',   gloss_en: 'there is' },
      { text: 'ます',                      role: 'key',      gloss_es: '[presente]', gloss_ca: '[present]',  gloss_en: '[present]' },
    ],
    tip_es: 'となり = al lado (de algo de la misma categoría). そば = cerca (más general). Ej: 「銀行のとなりにコンビニがあります」= "Hay un konbini al lado del banco".',
    tip_ca: 'となり = al costat (de quelcom de la mateixa categoria). そば = a prop (més general). Ex: 「銀行のとなりにコンビニがあります」= "Hi ha un konbini al costat del banc".',
    tip_en: 'となり = next to (same category). そば = nearby (more general). E.g.: 「銀行のとなりにコンビニがあります」= "There\'s a konbini next to the bank".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 8
// ─────────────────────────────────────────────────────────────────────────────

const ch8: GrammarPoint[] = [
  {
    id: 'mnn1-08-27',
    lesson: 8, number: 27, jlpt: 'N5',
    pattern: 'N は い-adj です',
    name_es: 'Adjetivos-い como predicado',
    name_ca: 'Adjectius-い com a predicat',
    name_en: 'い-adjective as predicate',
    explanation_es: 'Los adjetivos-い son una clase de adjetivos que terminan en い y funcionan directamente como predicado con です. No necesitan な entre el adjetivo y el nombre cuando modifican un nombre. Se conjugan ellos mismos (no el です).',
    explanation_ca: 'Els adjectius-い són una classe d\'adjectius que acaben en い i funcionen directament com a predicat amb です. No necessiten な entre l\'adjectiu i el nom quan modifiquen un nom. Es conjuguen ells mateixos (no el です).',
    explanation_en: 'い-adjectives end in い and work directly as predicates with です. They conjugate themselves (not です). When modifying a noun, they precede it directly without any extra particle.',
    structure: [
      { text: 'N',    role: 'topic',     isSlot: true,  label_es: 'tema',       label_ca: 'tema',       label_en: 'topic' },
      { text: 'は',   role: 'topic',     isSlot: false },
      { text: 'い-adj', role: 'adjective', isSlot: true, label_es: 'adjetivo-い', label_ca: 'adjectiu-い', label_en: 'い-adjective' },
      { text: 'です', role: 'copula',    isSlot: false },
    ],
    example: [
      { text: '富士山', furigana: 'ふじさん', role: 'topic',     gloss_es: 'el Fuji',   gloss_ca: 'el Fuji',   gloss_en: 'Mt. Fuji' },
      { text: 'は',                          role: 'topic',     gloss_es: '[tema]',    gloss_ca: '[tema]',    gloss_en: '[topic]' },
      { text: '高い', furigana: 'たかい',    role: 'adjective', gloss_es: 'es alto',   gloss_ca: 'és alt',    gloss_en: 'is tall' },
      { text: 'です',                        role: 'copula',    gloss_es: '[pol.]',    gloss_ca: '[pol.]',    gloss_en: '[polite]' },
    ],
    tip_es: 'Adjetivos-い comunes: 大きい (grande), 小さい (pequeño), 高い (caro/alto), 安い (barato), 新しい (nuevo), 古い (viejo), おいしい (delicioso), 難しい (difícil).',
    tip_ca: 'Adjectius-い comuns: 大きい (gran), 小さい (petit), 高い (car/alt), 安い (barat), 新しい (nou), 古い (vell), おいしい (deliciós), 難しい (difícil).',
    tip_en: 'Common い-adjectives: 大きい (big), 小さい (small), 高い (expensive/tall), 安い (cheap), 新しい (new), 古い (old), おいしい (delicious), 難しい (difficult).',
  },
  {
    id: 'mnn1-08-28',
    lesson: 8, number: 28, jlpt: 'N5',
    pattern: 'N は な-adj です',
    name_es: 'Adjetivos-な como predicado',
    name_ca: 'Adjectius-な com a predicat',
    name_en: 'な-adjective as predicate',
    explanation_es: 'Los adjetivos-な son la otra clase de adjetivos. Como predicado, van antes de です igual que los い-adj. Pero cuando MODIFICAN un nombre, necesitan な entre el adjetivo y el nombre: 「きれいな花」.',
    explanation_ca: 'Els adjectius-な són l\'altra classe d\'adjectius. Com a predicat, van davant de です igual que els い-adj. Però quan MODIFIQUEN un nom, necessiten な entre l\'adjectiu i el nom: 「きれいな花」.',
    explanation_en: 'な-adjectives are the other adjective class. As predicates, they precede です just like い-adj. But when MODIFYING a noun, they need な between the adjective and the noun: 「きれいな花」.',
    structure: [
      { text: 'N',     role: 'topic',     isSlot: true,  label_es: 'tema',       label_ca: 'tema',       label_en: 'topic' },
      { text: 'は',    role: 'topic',     isSlot: false },
      { text: 'な-adj', role: 'adjective', isSlot: true, label_es: 'adjetivo-な', label_ca: 'adjectiu-な', label_en: 'な-adjective' },
      { text: 'です',  role: 'copula',    isSlot: false },
    ],
    example: [
      { text: '東京', furigana: 'とうきょう', role: 'topic',     gloss_es: 'Tokio',      gloss_ca: 'Tòquio',     gloss_en: 'Tokyo' },
      { text: 'は',                          role: 'topic',     gloss_es: '[tema]',     gloss_ca: '[tema]',     gloss_en: '[topic]' },
      { text: 'にぎやか',                    role: 'adjective', gloss_es: 'es animado', gloss_ca: 'és animat',  gloss_en: 'is lively' },
      { text: 'です',                        role: 'copula',    gloss_es: '[pol.]',     gloss_ca: '[pol.]',     gloss_en: '[polite]' },
    ],
    tip_es: 'Cuidado: 好き (gustar) y 嫌い (no gustar) son adjetivos-な aunque no terminan en な. También きれい (bonito) aunque parece terminación い, es な-adj.',
    tip_ca: 'Compte: 好き (agradar) i 嫌い (no agradar) són adjectius-な tot i que no acaben en な. També きれい (bonic) tot i semblar terminació い, és な-adj.',
    tip_en: 'Watch out: 好き (to like) and 嫌い (to dislike) are な-adjectives even though they don\'t end in な. Also きれい (pretty), despite looking like い, is a な-adjective.',
  },
  {
    id: 'mnn1-08-29',
    lesson: 8, number: 29, jlpt: 'N5',
    pattern: 'い-adj → くないです / な-adj → じゃないです',
    name_es: 'Negación de adjetivos',
    name_ca: 'Negació d\'adjectius',
    name_en: 'Adjective negation',
    explanation_es: 'Los adjetivos-い se niegan cambiando い → くない: 高い → 高くない. Los adjetivos-な se niegan con じゃないです (igual que los nombres): きれい → きれいじゃない. Ambos pueden añadir です para mayor formalidad.',
    explanation_ca: 'Els adjectius-い es neguen canviant い → くない: 高い → 高くない. Els adjectius-な es neguen amb じゃないです (igual que els noms): きれい → きれいじゃない. Tots dos poden afegir です per major formalitat.',
    explanation_en: 'い-adjectives negate by changing い → くない: 高い → 高くない. な-adjectives negate with じゃないです (same as nouns): きれい → きれいじゃない. Both can add です for politeness.',
    structure: [
      { text: 'い-adj', role: 'adjective', isSlot: true,  label_es: 'adj-い',  label_ca: 'adj-い',  label_en: 'い-adj' },
      { text: 'く',     role: 'key',       isSlot: false },
      { text: 'ない',   role: 'key',       isSlot: false },
      { text: 'です',   role: 'copula',    isSlot: false },
      { text: '／ な-adj', role: 'adjective', isSlot: true, label_es: 'adj-な', label_ca: 'adj-な', label_en: 'な-adj' },
      { text: 'じゃないです', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'この',                        role: 'key',       gloss_es: 'esta',        gloss_ca: 'aquesta',   gloss_en: 'this' },
      { text: 'カバン',                       role: 'topic',     gloss_es: 'bolsa',       gloss_ca: 'bossa',     gloss_en: 'bag' },
      { text: 'は',                           role: 'topic',     gloss_es: '[tema]',      gloss_ca: '[tema]',    gloss_en: '[topic]' },
      { text: '高く', furigana: 'たかく',    role: 'adjective', gloss_es: 'cara',        gloss_ca: 'cara',      gloss_en: 'expensive' },
      { text: 'ない',                         role: 'key',       gloss_es: 'no es',       gloss_ca: 'no és',     gloss_en: 'not' },
      { text: 'です',                         role: 'copula',    gloss_es: '[pol.]',      gloss_ca: '[pol.]',    gloss_en: '[polite]' },
    ],
    tip_es: 'Resumen de conjugación い-adj: 高い (presente+) → 高くない (presente-) → 高かった (pasado+) → 高くなかった (pasado-). Es una conjugación propia del adjetivo.',
    tip_ca: 'Resum de conjugació adj-い: 高い (present+) → 高くない (present-) → 高かった (passat+) → 高くなかった (passat-). És una conjugació pròpia de l\'adjectiu.',
    tip_en: 'い-adj conjugation summary: 高い (present+) → 高くない (present-) → 高かった (past+) → 高くなかった (past-). The adjective itself conjugates.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 9
// ─────────────────────────────────────────────────────────────────────────────

const ch9: GrammarPoint[] = [
  {
    id: 'mnn1-09-30',
    lesson: 9, number: 30, jlpt: 'N5',
    pattern: 'N₁ と N₂ と どちらが adj ですか',
    name_es: 'Comparar dos cosas (どちら)',
    name_ca: 'Comparar dues coses (どちら)',
    name_en: 'Comparing two things (どちら)',
    explanation_es: 'どちら (¿cuál de los dos?) pregunta por la comparación entre dos opciones. Es más formal que どっち. La respuesta usa のほうが para señalar cuál de los dos tiene más la cualidad.',
    explanation_ca: 'どちら (quin dels dos?) pregunta per la comparació entre dues opcions. És més formal que どっち. La resposta usa のほうが per assenyalar quin dels dos té més la qualitat.',
    explanation_en: 'どちら (which of the two?) compares two options. More formal than どっち. The answer uses のほうが to indicate which of the two has more of the quality.',
    structure: [
      { text: 'N₁',    role: 'noun',      isSlot: true,  label_es: 'opción 1', label_ca: 'opció 1', label_en: 'option 1' },
      { text: 'と',     role: 'particle',  isSlot: false },
      { text: 'N₂',    role: 'noun',      isSlot: true,  label_es: 'opción 2', label_ca: 'opció 2', label_en: 'option 2' },
      { text: 'と',     role: 'particle',  isSlot: false },
      { text: 'どちら', role: 'key',       isSlot: false },
      { text: 'が',     role: 'subject',   isSlot: false },
      { text: 'adj',   role: 'adjective', isSlot: true,  label_es: 'adjetivo', label_ca: 'adjectiu', label_en: 'adjective' },
      { text: 'ですか', role: 'key',       isSlot: false },
    ],
    example: [
      { text: '日本語', furigana: 'にほんご', role: 'noun',      gloss_es: 'el japonés',   gloss_ca: 'el japonès',  gloss_en: 'Japanese' },
      { text: 'と',                          role: 'particle',  gloss_es: 'y',             gloss_ca: 'i',           gloss_en: 'and' },
      { text: '中国語', furigana: 'ちゅうごくご', role: 'noun', gloss_es: 'el chino',      gloss_ca: 'el xinès',    gloss_en: 'Chinese' },
      { text: 'と',                          role: 'particle',  gloss_es: 'y',             gloss_ca: 'i',           gloss_en: 'and' },
      { text: 'どちら',                       role: 'key',      gloss_es: '¿cuál',         gloss_ca: 'quin',        gloss_en: 'which' },
      { text: 'が',                           role: 'subject',  gloss_es: '[sujeto]',      gloss_ca: '[subjecte]',  gloss_en: '[subject]' },
      { text: '難しい', furigana: 'むずかしい', role: 'adjective', gloss_es: 'es más difícil', gloss_ca: 'és més difícil', gloss_en: 'is more difficult' },
      { text: 'ですか',                        role: 'key',      gloss_es: '¿?',            gloss_ca: '¿?',          gloss_en: '?' },
    ],
    tip_es: 'Respuesta: 「日本語のほうが難しいです」. Si ambas son iguales: 「どちらも同じです」(las dos son iguales) o 「どちらも難しいです」(las dos son difíciles).',
    tip_ca: 'Resposta: 「日本語のほうが難しいです」. Si totes dues són iguals: 「どちらも同じです」(les dues són iguals) o 「どちらも難しいです」(les dues són difícils).',
    tip_en: 'Answer: 「日本語のほうが難しいです」. If both are equal: 「どちらも同じです」(both are the same) or 「どちらも難しいです」(both are difficult).',
  },
  {
    id: 'mnn1-09-31',
    lesson: 9, number: 31, jlpt: 'N5',
    pattern: 'N の ほうが adj です',
    name_es: 'Comparativo: N es más adj (のほうが)',
    name_ca: 'Comparatiu: N és més adj (のほうが)',
    name_en: 'Comparative: N is more adj (のほうが)',
    explanation_es: 'のほうが marca cuál de dos elementos tiene más la cualidad en comparación. Equivale a "más" en español. No se necesita decir "que el otro"; el contexto ya lo establece.',
    explanation_ca: 'のほうが marca quin dels dos elements té més la qualitat en comparació. Equivalent a "més" en català. No cal dir "que l\'altre"; el context ja ho estableix.',
    explanation_en: 'のほうが marks which of two elements has more of the quality. Equivalent to "more" in English. You don\'t need to say "than the other"; context establishes it.',
    structure: [
      { text: 'N',    role: 'noun',      isSlot: true,  label_es: 'ganador', label_ca: 'guanyador', label_en: 'winner' },
      { text: 'の',   role: 'particle',  isSlot: false },
      { text: 'ほうが', role: 'key',     isSlot: false },
      { text: 'adj',  role: 'adjective', isSlot: true,  label_es: 'adjetivo', label_ca: 'adjectiu', label_en: 'adjective' },
      { text: 'です', role: 'copula',    isSlot: false },
    ],
    example: [
      { text: '夏',   furigana: 'なつ',  role: 'noun',      gloss_es: 'el verano',  gloss_ca: 'l\'estiu',  gloss_en: 'summer' },
      { text: 'の',                      role: 'particle',  gloss_es: 'de',          gloss_ca: 'de',        gloss_en: '\'s' },
      { text: 'ほう',                    role: 'key',       gloss_es: 'lado',        gloss_ca: 'costat',    gloss_en: 'side' },
      { text: 'が',                      role: 'subject',   gloss_es: '[sujeto]',    gloss_ca: '[subjecte]', gloss_en: '[subj]' },
      { text: '好き', furigana: 'すき',  role: 'adjective', gloss_es: 'me gusta más', gloss_ca: 'm\'agrada més', gloss_en: 'prefer' },
      { text: 'です',                    role: 'copula',    gloss_es: '[pol.]',      gloss_ca: '[pol.]',    gloss_en: '[polite]' },
    ],
    tip_es: 'Para comparar explícitamente: 「冬より夏のほうが好きです」= "Me gusta más el verano que el invierno". より = "que" (en comparaciones).',
    tip_ca: 'Per comparar explícitament: 「冬より夏のほうが好きです」= "M\'agrada més l\'estiu que l\'hivern". より = "que" (en comparacions).',
    tip_en: 'For explicit comparison: 「冬より夏のほうが好きです」= "I prefer summer to winter". より = "than" (in comparisons).',
  },
  {
    id: 'mnn1-09-32',
    lesson: 9, number: 32, jlpt: 'N5',
    pattern: 'N のなかで N が いちばん adj です',
    name_es: 'Superlativo: el más adj (いちばん)',
    name_ca: 'Superlatiu: el més adj (いちばん)',
    name_en: 'Superlative: the most adj (いちばん)',
    explanation_es: 'いちばん (el más / el número 1) forma el superlativo. のなかで indica el grupo dentro del que se hace la comparación. La pregunta superlativa usa なにが/どれが/どこが/いつが según lo que se pregunta.',
    explanation_ca: 'いちばん (el més / el número 1) forma el superlatiu. のなかで indica el grup dins del qual es fa la comparació. La pregunta superlativa usa なにが/どれが/どこが/いつが segons el que es pregunta.',
    explanation_en: 'いちばん (the most / number 1) forms the superlative. のなかで indicates the group being compared. Superlative questions use なにが/どれが/どこが/いつが depending on what is asked.',
    structure: [
      { text: 'Group', role: 'noun',      isSlot: true,  label_es: 'grupo',    label_ca: 'grup',     label_en: 'group' },
      { text: 'のなかで', role: 'key',    isSlot: false },
      { text: 'N',     role: 'subject',  isSlot: true,  label_es: 'cosa/pers.', label_ca: 'cosa/pers.', label_en: 'thing/person' },
      { text: 'が',    role: 'subject',  isSlot: false },
      { text: 'いちばん', role: 'key',   isSlot: false },
      { text: 'adj',   role: 'adjective', isSlot: true, label_es: 'adjetivo', label_ca: 'adjectiu', label_en: 'adjective' },
      { text: 'です',  role: 'copula',   isSlot: false },
    ],
    example: [
      { text: 'くだもの',                  role: 'noun',      gloss_es: 'de la fruta',  gloss_ca: 'de la fruita',  gloss_en: 'of fruit' },
      { text: 'のなかで',                  role: 'key',       gloss_es: 'entre',         gloss_ca: 'entre',         gloss_en: 'among' },
      { text: 'りんご',                    role: 'subject',   gloss_es: 'la manzana',   gloss_ca: 'la poma',       gloss_en: 'apples' },
      { text: 'が',                        role: 'subject',   gloss_es: '[sujeto]',     gloss_ca: '[subjecte]',    gloss_en: '[subj]' },
      { text: 'いちばん',                  role: 'key',       gloss_es: 'la más',       gloss_ca: 'la més',        gloss_en: 'the most' },
      { text: '好き', furigana: 'すき',    role: 'adjective', gloss_es: 'me gusta',     gloss_ca: 'm\'agrada',     gloss_en: 'liked' },
      { text: 'です',                      role: 'copula',    gloss_es: '[pol.]',       gloss_ca: '[pol.]',        gloss_en: '[polite]' },
    ],
    tip_es: 'Pregunta superlativa: 「スポーツの中で何がいちばん好きですか」→ "¿Cuál deporte te gusta más?" La respuesta sigue la misma estructura con いちばん.',
    tip_ca: 'Pregunta superlativa: 「スポーツの中で何がいちばん好きですか」→ "Quin esport t\'agrada més?" La resposta segueix la mateixa estructura amb いちばん.',
    tip_en: 'Superlative question: 「スポーツの中で何がいちばん好きですか」→ "Which sport do you like the most?" The answer follows the same structure with いちばん.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 10
// ─────────────────────────────────────────────────────────────────────────────

const ch10: GrammarPoint[] = [
  {
    id: 'mnn1-10-33',
    lesson: 10, number: 33, jlpt: 'N5',
    pattern: 'V て, V ます (forma て — secuencia)',
    name_es: 'Forma て: acciones secuenciales',
    name_ca: 'Forma て: accions seqüencials',
    name_en: 'て-form: sequential actions',
    explanation_es: 'La forma て conecta dos o más acciones en secuencia, como "y luego" en español. El tiempo (presente/pasado) lo marca el verbo FINAL. Los verbos intermedios solo usan て. También conecta estados y razones.',
    explanation_ca: 'La forma て connecta dues o més accions en seqüència, com "i llavors" en català. El temps (present/passat) el marca el verb FINAL. Els verbs intermedis només usen て. També connecta estats i raons.',
    explanation_en: 'The て-form connects two or more actions in sequence, like "and then". Tense is determined by the FINAL verb. Intermediate verbs use only て. It also connects states and reasons.',
    structure: [
      { text: 'V₁', role: 'verb', isSlot: true,  label_es: 'acción 1', label_ca: 'acció 1', label_en: 'action 1' },
      { text: 'て',  role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true,  label_es: 'acción 2', label_ca: 'acció 2', label_en: 'action 2' },
      { text: 'ます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '手',    furigana: 'て',      role: 'object', gloss_es: 'manos',        gloss_ca: 'mans',         gloss_en: 'hands' },
      { text: 'を',                         role: 'object', gloss_es: '[objeto]',      gloss_ca: '[objecte]',    gloss_en: '[object]' },
      { text: '洗って', furigana: 'あらって', role: 'verb',  gloss_es: 'lavo y…',      gloss_ca: 'rento i…',     gloss_en: 'wash and…' },
      { text: '食べ',  furigana: 'たべ',    role: 'verb',   gloss_es: 'como',          gloss_ca: 'menjo',        gloss_en: 'eat' },
      { text: 'ます',                       role: 'key',    gloss_es: '[presente]',   gloss_ca: '[present]',   gloss_en: '[present]' },
    ],
    tip_es: 'La forma て se forma según el grupo verbal: G1: く→いて, ぐ→いで, す→して, つ/る/う→って, ぬ/む/ぶ→んで, く→いて. G2: る→て. Irregular: する→して, くる→きて.',
    tip_ca: 'La forma て es forma segons el grup verbal: G1: く→いて, ぐ→いで, す→して, つ/る/う→って, ぬ/む/ぶ→んで. G2: る→て. Irregulars: する→して, くる→きて.',
    tip_en: 'て-form conjugation: G1: く→いて, ぐ→いで, す→して, つ/る/う→って, ぬ/む/ぶ→んで. G2: る→て. Irregular: する→して, くる→きて.',
  },
  {
    id: 'mnn1-10-34',
    lesson: 10, number: 34, jlpt: 'N5',
    pattern: 'V て ください',
    name_es: 'Petición educada: por favor haz V',
    name_ca: 'Petició educada: si us plau fes V',
    name_en: 'Polite request: please do V',
    explanation_es: 'V て ください es la forma estándar y educada de pedir a alguien que haga algo. Equivale a "por favor + imperativo" en español. Se usa en instrucciones, peticiones del día a día y situaciones formales.',
    explanation_ca: 'V て ください és la forma estàndard i educada de demanar a algú que faci alguna cosa. Equivalent a "si us plau + imperatiu" en català. S\'usa en instruccions, peticions del dia a dia i situacions formals.',
    explanation_en: 'V て ください is the standard polite way to ask someone to do something. Equivalent to "please + verb" in English. Used for instructions, everyday requests, and formal situations.',
    structure: [
      { text: 'V',         role: 'verb',      isSlot: true,  label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て',        role: 'key',       isSlot: false },
      { text: 'ください',  role: 'key',       isSlot: false },
    ],
    example: [
      { text: 'ここ',                          role: 'location',  gloss_es: 'aquí',         gloss_ca: 'aquí',        gloss_en: 'here' },
      { text: 'に',                            role: 'location',  gloss_es: 'en',            gloss_ca: 'a',           gloss_en: 'on' },
      { text: '名前', furigana: 'なまえ',      role: 'object',    gloss_es: 'nombre',        gloss_ca: 'nom',         gloss_en: 'name' },
      { text: 'を',                            role: 'object',    gloss_es: '[objeto]',      gloss_ca: '[objecte]',   gloss_en: '[object]' },
      { text: '書いて', furigana: 'かいて',    role: 'verb',      gloss_es: 'escriba',       gloss_ca: 'escrigui',    gloss_en: 'write' },
      { text: 'ください',                       role: 'key',       gloss_es: 'por favor',     gloss_ca: 'si us plau',  gloss_en: 'please' },
    ],
    tip_es: 'Para una petición más fuerte o en documentos: 「〜てくださいませ」. Para pedir que NO hagan algo: 「〜ないでください」(no hagas V).',
    tip_ca: 'Per a una petició més forta o en documents: 「〜てくださいませ」. Per demanar que NO facin alguna cosa: 「〜ないでください」(no facis V).',
    tip_en: 'For a stronger request or documents: 「〜てくださいませ」. To ask someone NOT to do something: 「〜ないでください」(please don\'t do V).',
  },
  {
    id: 'mnn1-10-35',
    lesson: 10, number: 35, jlpt: 'N5',
    pattern: 'V て もいいですか',
    name_es: '¿Puedo hacer V? (permiso)',
    name_ca: 'Puc fer V? (permís)',
    name_en: 'May I do V? (permission)',
    explanation_es: 'V て もいいですか pide permiso para hacer algo. もいいです sola significa "está bien / está permitido". La respuesta afirmativa es 「はい、どうぞ」(sí, adelante) o 「〜てもいいです」.',
    explanation_ca: 'V て もいいですか demana permís per fer alguna cosa. もいいです sola significa "està bé / és permès". La resposta afirmativa és 「はい、どうぞ」(sí, endavant) o 「〜てもいいです」.',
    explanation_en: 'V て もいいですか asks permission to do something. もいいです alone means "it\'s OK / it\'s allowed". Affirmative answer: 「はい、どうぞ」(yes, go ahead) or 「〜てもいいです」.',
    structure: [
      { text: 'V',      role: 'verb', isSlot: true,  label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て',     role: 'key',  isSlot: false },
      { text: 'も',     role: 'key',  isSlot: false },
      { text: 'いい',   role: 'key',  isSlot: false },
      { text: 'ですか', role: 'key',  isSlot: false },
    ],
    example: [
      { text: 'ここで',                         role: 'location', gloss_es: 'aquí',          gloss_ca: 'aquí',          gloss_en: 'here' },
      { text: '写真', furigana: 'しゃしん',     role: 'object',   gloss_es: 'fotos',         gloss_ca: 'fotos',         gloss_en: 'photos' },
      { text: 'を',                             role: 'object',   gloss_es: '[objeto]',      gloss_ca: '[objecte]',     gloss_en: '[object]' },
      { text: '撮って', furigana: 'とって',     role: 'verb',     gloss_es: 'sacar',         gloss_ca: 'fer',           gloss_en: 'take' },
      { text: 'も',                             role: 'key',      gloss_es: 'también está',  gloss_ca: 'també és',      gloss_en: 'also' },
      { text: 'いい',                           role: 'key',      gloss_es: 'bien',          gloss_ca: 'bé',            gloss_en: 'OK' },
      { text: 'ですか',                         role: 'key',      gloss_es: '¿?',            gloss_ca: '¿?',            gloss_en: '?' },
    ],
    tip_es: 'Respuesta negativa educada: 「すみません、ちょっと…」(lo siento, es un poco…) es más natural que negarlo directamente. Si quieres ser directo: 「〜てはいけません」.',
    tip_ca: 'Resposta negativa educada: 「すみません、ちょっと…」(ho sento, és una mica…) és més natural que negar-ho directament. Si vols ser directe: 「〜てはいけません」.',
    tip_en: 'Polite refusal: 「すみません、ちょっと…」(sorry, it\'s a bit…) is more natural than a direct no. For direct refusal: 「〜てはいけません」.',
  },
  {
    id: 'mnn1-10-36',
    lesson: 10, number: 36, jlpt: 'N5',
    pattern: 'V て はいけません',
    name_es: 'Prohibición: no se puede/debe hacer V',
    name_ca: 'Prohibició: no es pot/ha de fer V',
    name_en: 'Prohibition: must not do V',
    explanation_es: 'V て はいけません expresa prohibición: "no está permitido hacer V". Es la expresión de prohibición estándar. はいけない es la forma informal/llana. Se usa en señales, reglas, instrucciones.',
    explanation_ca: 'V て はいけません expressa prohibició: "no és permès fer V". És l\'expressió de prohibició estàndard. はいけない és la forma informal/plana. S\'usa en senyals, regles, instruccions.',
    explanation_en: 'V て はいけません expresses prohibition: "you must not do V". Standard prohibition expression. はいけない is the informal form. Used in signs, rules, and instructions.',
    structure: [
      { text: 'V',         role: 'verb', isSlot: true,  label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て',        role: 'key',  isSlot: false },
      { text: 'は',        role: 'key',  isSlot: false },
      { text: 'いけません', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'ここで',                           role: 'location', gloss_es: 'aquí',             gloss_ca: 'aquí',          gloss_en: 'here' },
      { text: 'たばこ',                            role: 'object',   gloss_es: 'tabaco',           gloss_ca: 'tabac',         gloss_en: 'tobacco' },
      { text: 'を',                               role: 'object',   gloss_es: '[objeto]',         gloss_ca: '[objecte]',     gloss_en: '[object]' },
      { text: '吸って', furigana: 'すって',        role: 'verb',     gloss_es: 'fumar',            gloss_ca: 'fumar',         gloss_en: 'smoke' },
      { text: 'は',                               role: 'key',      gloss_es: '[topic]',          gloss_ca: '[tema]',        gloss_en: '[topic]' },
      { text: 'いけません',                        role: 'key',      gloss_es: 'no se puede',      gloss_ca: 'no es pot',     gloss_en: 'must not' },
    ],
    tip_es: 'Comparar con てもいいですか (permiso) y てください (petición). Los tres usan la forma て. Resumen: ください = por favor haz. もいいです = puedes hacer. はいけません = no puedes hacer.',
    tip_ca: 'Comparar amb てもいいですか (permís) i てください (petició). Els tres usen la forma て. Resum: ください = si us plau fes. もいいです = pots fer. はいけません = no pots fer.',
    tip_en: 'Compare with てもいいですか (permission) and てください (request). All three use て-form. Summary: ください = please do. もいいです = you may. はいけません = you must not.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 11
// ─────────────────────────────────────────────────────────────────────────────

const ch11: GrammarPoint[] = [
  {
    id: 'mnn1-11-37',
    lesson: 11, number: 37, jlpt: 'N5',
    pattern: 'V ました / V ませんでした',
    name_es: 'Pasado del verbo (ました)',
    name_ca: 'Passat del verb (ました)',
    name_en: 'Verb past tense (ました)',
    explanation_es: 'ました es la forma pasada educada del verbo. Se forma sustituyendo ます → ました (afirmativo) y ません → ませんでした (negativo). En japonés el pasado y el pretérito perfecto compuesto son la misma forma.',
    explanation_ca: 'ました és la forma passada educada del verb. Es forma substituint ます → ました (afirmatiu) i ません → ませんでした (negatiu). En japonès el passat i el pretèrit perfet compost són la mateixa forma.',
    explanation_en: 'ました is the polite past verb form. Formed by replacing ます → ました (affirmative) and ません → ませんでした (negative). Japanese past and present perfect are the same form.',
    structure: [
      { text: 'V',           role: 'verb', isSlot: true,  label_es: 'verbo',   label_ca: 'verb',    label_en: 'verb' },
      { text: 'ました',      role: 'key',  isSlot: false },
      { text: '／',          role: 'noun', isSlot: false },
      { text: 'V',           role: 'verb', isSlot: true,  label_es: 'verbo',   label_ca: 'verb',    label_en: 'verb' },
      { text: 'ませんでした', role: 'key', isSlot: false },
    ],
    example: [
      { text: '昨日', furigana: 'きのう',    role: 'time',   gloss_es: 'ayer',         gloss_ca: 'ahir',         gloss_en: 'yesterday' },
      { text: '映画', furigana: 'えいが',    role: 'object', gloss_es: 'película',     gloss_ca: 'pel·lícula',   gloss_en: 'movie' },
      { text: 'を',                          role: 'object', gloss_es: '[objeto]',     gloss_ca: '[objecte]',    gloss_en: '[object]' },
      { text: '見',   furigana: 'み',        role: 'verb',   gloss_es: 'vi',           gloss_ca: 'vaig veure',   gloss_en: 'watched' },
      { text: 'ました',                      role: 'key',    gloss_es: '[pasado]',     gloss_ca: '[passat]',     gloss_en: '[past]' },
    ],
    tip_es: 'Resumen de ます-form: presente+ ます | presente- ません | pasado+ ました | pasado- ませんでした. Este sistema aplica a TODOS los verbos sin excepción.',
    tip_ca: 'Resum de ます-form: present+ ます | present- ません | passat+ ました | passat- ませんでした. Aquest sistema s\'aplica a TOTS els verbs sense excepció.',
    tip_en: 'ます-form summary: present+ ます | present- ません | past+ ました | past- ませんでした. This system applies to ALL verbs without exception.',
  },
  {
    id: 'mnn1-11-38',
    lesson: 11, number: 38, jlpt: 'N5',
    pattern: 'い-adj → かった / くなかった',
    name_es: 'Pasado de adjetivos-い',
    name_ca: 'Passat d\'adjectius-い',
    name_en: 'い-adjective past tense',
    explanation_es: 'Los adjetivos-い tienen su propio pasado: se quita い y se añade かった (positivo) o くなかった (negativo). El です al final es opcional pero añade formalidad. Nota: いい (bueno) es irregular: よかった / よくなかった.',
    explanation_ca: 'Els adjectius-い tenen el seu propi passat: es treu い i s\'afegeix かった (positiu) o くなかった (negatiu). El です al final és opcional però afegeix formalitat. Nota: いい (bo) és irregular: よかった / よくなかった.',
    explanation_en: 'い-adjectives have their own past tense: remove い and add かった (positive) or くなかった (negative). です at the end is optional but adds politeness. Note: いい (good) is irregular: よかった / よくなかった.',
    structure: [
      { text: 'い-adj[い→]', role: 'adjective', isSlot: true,  label_es: 'adj-い sin い', label_ca: 'adj-い sense い', label_en: 'い-adj stem' },
      { text: 'かった',       role: 'key',       isSlot: false },
      { text: 'です',         role: 'copula',    isSlot: false },
      { text: '／',           role: 'noun',      isSlot: false },
      { text: 'い-adj[い→]', role: 'adjective', isSlot: true,  label_es: 'adj-い sin い', label_ca: 'adj-い sense い', label_en: 'い-adj stem' },
      { text: 'くなかった',   role: 'key',       isSlot: false },
      { text: 'です',         role: 'copula',    isSlot: false },
    ],
    example: [
      { text: '試験', furigana: 'しけん',   role: 'topic',     gloss_es: 'el examen',   gloss_ca: 'l\'examen',   gloss_en: 'the exam' },
      { text: 'は',                         role: 'topic',     gloss_es: '[tema]',      gloss_ca: '[tema]',      gloss_en: '[topic]' },
      { text: '難し', furigana: 'むずかし', role: 'adjective', gloss_es: 'difícil',     gloss_ca: 'difícil',     gloss_en: 'difficult' },
      { text: 'かった',                     role: 'key',       gloss_es: 'era',         gloss_ca: 'era',         gloss_en: 'was' },
      { text: 'です',                       role: 'copula',    gloss_es: '[pol.]',      gloss_ca: '[pol.]',      gloss_en: '[polite]' },
    ],
    tip_es: '⚠ Excepción: いい → よかった (no いかった, que no existe). Otros: 楽しかった (fue divertido), 暑かった (hacía calor), 寒くなかった (no hacía frío).',
    tip_ca: '⚠ Excepció: いい → よかった (no いかった, que no existeix). Altres: 楽しかった (va ser divertit), 暑かった (feia calor), 寒くなかった (no feia fred).',
    tip_en: '⚠ Exception: いい → よかった (not いかった, which doesn\'t exist). Others: 楽しかった (was fun), 暑かった (was hot), 寒くなかった (wasn\'t cold).',
  },
  {
    id: 'mnn1-11-39',
    lesson: 11, number: 39, jlpt: 'N5',
    pattern: 'な-adj / N でした / じゃありませんでした',
    name_es: 'Pasado de adjetivos-な y nombres',
    name_ca: 'Passat d\'adjectius-な i noms',
    name_en: 'Past tense of な-adjectives and nouns',
    explanation_es: 'Los adjetivos-な y los nombres forman el pasado igual: です → でした (positivo) y じゃありません → じゃありませんでした (negativo). Idéntico al pasado de NはNです.',
    explanation_ca: 'Els adjectius-な i els noms formen el passat igual: です → でした (positiu) i じゃありません → じゃありませんでした (negatiu). Idèntic al passat de NはNです.',
    explanation_en: 'な-adjectives and nouns form the past identically: です → でした (positive) and じゃありません → じゃありませんでした (negative). Same as the past of NはNです.',
    structure: [
      { text: 'N / な-adj', role: 'adjective', isSlot: true,  label_es: 'adj-な/nombre', label_ca: 'adj-な/nom', label_en: 'な-adj/noun' },
      { text: 'でした',      role: 'key',       isSlot: false },
      { text: '／',          role: 'noun',      isSlot: false },
      { text: 'N / な-adj', role: 'adjective', isSlot: true,  label_es: 'adj-な/nombre', label_ca: 'adj-な/nom', label_en: 'な-adj/noun' },
      { text: 'じゃ',        role: 'key',       isSlot: false },
      { text: 'ありませんでした', role: 'key',  isSlot: false },
    ],
    example: [
      { text: '子供', furigana: 'こども',  role: 'time',      gloss_es: 'de niño/a',    gloss_ca: 'de nen/a',    gloss_en: 'as a child' },
      { text: 'の',                        role: 'particle',  gloss_es: 'de',            gloss_ca: 'de',          gloss_en: 'as a' },
      { text: 'ころ',                      role: 'time',      gloss_es: 'cuando era',    gloss_ca: 'quan era',    gloss_en: 'when' },
      { text: '、勉強', furigana: 'べんきょう', role: 'noun', gloss_es: 'los estudios',  gloss_ca: 'els estudis', gloss_en: 'studying' },
      { text: 'が',                        role: 'subject',   gloss_es: '[sujeto]',      gloss_ca: '[subjecte]',  gloss_en: '[subj]' },
      { text: '好き', furigana: 'すき',    role: 'adjective', gloss_es: 'me gustaba',    gloss_ca: 'm\'agradava', gloss_en: 'liked' },
      { text: 'でした',                    role: 'key',       gloss_es: '[pasado]',      gloss_ca: '[passat]',    gloss_en: '[past]' },
    ],
    tip_es: 'Tabla comparativa: い-adj: 高い→高かった/高くなかった. な-adj: 好き→好きでした/好きじゃなかった. Nombre: 学生→学生でした/学生じゃなかった.',
    tip_ca: 'Taula comparativa: adj-い: 高い→高かった/高くなかった. adj-な: 好き→好きでした/好きじゃなかった. Nom: 学生→学生でした/学生じゃなかった.',
    tip_en: 'Comparison table: い-adj: 高い→高かった/高くなかった. な-adj: 好き→好きでした/好きじゃなかった. Noun: 学生→学生でした/学生じゃなかった.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 12
// ─────────────────────────────────────────────────────────────────────────────

const ch12: GrammarPoint[] = [
  {
    id: 'mnn1-12-40',
    lesson: 12, number: 40, jlpt: 'N5',
    pattern: 'S₁ から、S₂',
    name_es: 'Razón/causa con から (porque)',
    name_ca: 'Raó/causa amb から (perquè)',
    name_en: 'Reason/cause with から (because)',
    explanation_es: 'から al final de una frase expresa la razón o causa: "porque S₁, S₂". S₁ siempre va en forma llana (no ます) o en cualquier forma seguida de から. La razón va ANTES de la consecuencia, al contrario que en español.',
    explanation_ca: 'から al final d\'una frase expressa la raó o causa: "perquè S₁, S₂". S₁ sempre va en forma plana (no ます) o en qualsevol forma seguida de から. La raó va ABANS de la conseqüència, al contrari que en català.',
    explanation_en: 'から at the end of a clause gives the reason: "because S₁, S₂". S₁ can be in plain or polite form followed by から. The reason comes BEFORE the consequence, opposite to English.',
    structure: [
      { text: 'S₁',  role: 'conjunction', isSlot: true,  label_es: 'razón',       label_ca: 'raó',         label_en: 'reason' },
      { text: 'から', role: 'key',         isSlot: false },
      { text: '、',   role: 'noun',        isSlot: false },
      { text: 'S₂',  role: 'verb',        isSlot: true,  label_es: 'consecuencia', label_ca: 'conseqüència', label_en: 'consequence' },
    ],
    example: [
      { text: '明日', furigana: 'あした',        role: 'time',        gloss_es: 'mañana',    gloss_ca: 'demà',       gloss_en: 'tomorrow' },
      { text: '試験', furigana: 'しけん',        role: 'subject',     gloss_es: 'examen',    gloss_ca: 'examen',     gloss_en: 'exam' },
      { text: 'が',                              role: 'subject',     gloss_es: '[sujeto]',  gloss_ca: '[subjecte]', gloss_en: '[subj]' },
      { text: 'あります',                        role: 'verb',        gloss_es: 'hay/tengo', gloss_ca: 'hi ha/tinc', gloss_en: 'have' },
      { text: 'から',                            role: 'key',         gloss_es: 'porque',    gloss_ca: 'perquè',     gloss_en: 'because' },
      { text: '、今日', furigana: 'きょう',      role: 'time',        gloss_es: 'hoy',       gloss_ca: 'avui',       gloss_en: 'today' },
      { text: '勉強し', furigana: 'べんきょうし', role: 'verb',       gloss_es: 'estudio',   gloss_ca: 'estudio',    gloss_en: 'study' },
      { text: 'ます',                            role: 'key',         gloss_es: '[pres.]',   gloss_ca: '[pres.]',    gloss_en: '[pres.]' },
    ],
    tip_es: 'El orden japonés es: RAZÓN から RESULTADO. En español es al revés: RESULTADO porque RAZÓN. Ej: 「雨が降っているから、傘を持ってください」= "Lleva un paraguas porque está lloviendo".',
    tip_ca: 'L\'ordre japonès és: RAÓ から RESULTAT. En català és al revés: RESULTAT perquè RAÓ. Ex: 「雨が降っているから、傘を持ってください」= "Porta un paraigua perquè plou".',
    tip_en: 'Japanese order: REASON から RESULT. English is reversed: RESULT because REASON. E.g.: 「雨が降っているから、傘を持ってください」= "Take an umbrella because it\'s raining".',
  },
  {
    id: 'mnn1-12-41',
    lesson: 12, number: 41, jlpt: 'N5',
    pattern: 'S₁ が、S₂',
    name_es: 'Contraste con が (pero / aunque)',
    name_ca: 'Contrast amb が (però / encara que)',
    name_en: 'Contrast with が (but / although)',
    explanation_es: 'が como conjunción entre dos frases expresa contraste o un preámbulo suave antes de la idea principal. Es menos abrupto que "pero" — a menudo funciona como "aunque" o para introducir contexto antes de pedir algo.',
    explanation_ca: 'が com a conjunció entre dues frases expressa contrast o un preàmbul suau abans de la idea principal. És menys abrupte que "però" — sovint funciona com "tot i que" o per introduir context abans de demanar alguna cosa.',
    explanation_en: 'が as a conjunction between clauses expresses contrast or a soft lead-in before the main point. Less abrupt than "but" — often works as "although" or to introduce context before a request.',
    structure: [
      { text: 'S₁',  role: 'conjunction', isSlot: true,  label_es: 'contexto',   label_ca: 'context',   label_en: 'context' },
      { text: 'が',  role: 'key',         isSlot: false },
      { text: '、',  role: 'noun',        isSlot: false },
      { text: 'S₂', role: 'verb',        isSlot: true,  label_es: 'contraste',  label_ca: 'contrast',  label_en: 'contrast' },
    ],
    example: [
      { text: 'この',                            role: 'key',         gloss_es: 'este',       gloss_ca: 'aquest',   gloss_en: 'this' },
      { text: 'レストラン',                       role: 'topic',       gloss_es: 'restaurante', gloss_ca: 'restaurant', gloss_en: 'restaurant' },
      { text: 'は',                              role: 'topic',       gloss_es: '[tema]',     gloss_ca: '[tema]',   gloss_en: '[topic]' },
      { text: '高い', furigana: 'たかい',        role: 'adjective',   gloss_es: 'caro',       gloss_ca: 'car',      gloss_en: 'expensive' },
      { text: 'です',                            role: 'copula',      gloss_es: 'es',         gloss_ca: 'és',       gloss_en: 'is' },
      { text: 'が',                              role: 'key',         gloss_es: 'pero',       gloss_ca: 'però',     gloss_en: 'but' },
      { text: '、おいしい',                      role: 'adjective',   gloss_es: 'delicioso',  gloss_ca: 'deliciós', gloss_en: 'delicious' },
      { text: 'です',                            role: 'copula',      gloss_es: '[pol.]',     gloss_ca: '[pol.]',   gloss_en: '[polite]' },
    ],
    tip_es: 'Uso diplomático: en japonés が introductorio se usa mucho para suavizar peticiones: 「予約したいんですが…」= "Quisiera hacer una reserva..." (la frase queda incompleta a propósito, sonando más educada).',
    tip_ca: 'Ús diplomàtic: en japonès が introductori s\'usa molt per suavitzar peticions: 「予約したいんですが…」= "Voldria fer una reserva..." (la frase queda incompleta a propòsit, sonant més educada).',
    tip_en: 'Diplomatic use: introductory が is often used to soften requests: 「予約したいんですが…」= "I\'d like to make a reservation..." (deliberately trailing off sounds more polite).',
  },
  {
    id: 'mnn1-12-42',
    lesson: 12, number: 42, jlpt: 'N5',
    pattern: 'V ましょう / V ましょうか',
    name_es: 'Propuesta: ¡Vamos a V! / ¿Hacemos V?',
    name_ca: 'Proposta: Anem a V! / Fem V?',
    name_en: 'Proposal: Let\'s V / Shall we V?',
    explanation_es: 'ましょう es una invitación o propuesta: "¡Vamos a hacer V!" Se forma sustituyendo ます → ましょう. ましょうか añade か para hacer la propuesta más suave y consultiva: "¿Hacemos V? / ¿Qué tal si...?"',
    explanation_ca: 'ましょう és una invitació o proposta: "Anem a fer V!" Es forma substituint ます → ましょう. ましょうか afegeix か per fer la proposta més suau i consultiva: "Fem V? / Què tal si...?"',
    explanation_en: 'ましょう is an invitation or proposal: "Let\'s do V!" Formed by replacing ます → ましょう. ましょうか adds か to make it softer and more consultive: "Shall we V? / How about V?"',
    structure: [
      { text: 'V',       role: 'verb', isSlot: true,  label_es: 'verbo', label_ca: 'verb', label_en: 'verb' },
      { text: 'ましょう', role: 'key', isSlot: false },
      { text: '(か)',    role: 'key', isSlot: false },
    ],
    example: [
      { text: 'そろそろ',                         role: 'time',   gloss_es: 'ya va siendo hora', gloss_ca: 'ja va sent hora', gloss_en: 'it\'s about time' },
      { text: '出発し', furigana: 'しゅっぱつし', role: 'verb',   gloss_es: 'salgamos',         gloss_ca: 'surtem',          gloss_en: 'depart' },
      { text: 'ましょう',                         role: 'key',    gloss_es: '¡venga!',          gloss_ca: 'va!',             gloss_en: 'let\'s' },
    ],
    tip_es: 'ましょうか también sirve para ofrecer ayuda: 「荷物を持ちましょうか」= "¿Le llevo el equipaje?" Diferente al ましょうか de propuesta mutua.',
    tip_ca: 'ましょうか també serveix per oferir ajuda: 「荷物を持ちましょうか」= "Li porto l\'equipatge?" Diferent del ましょうか de proposta mútua.',
    tip_en: 'ましょうか also offers help: 「荷物を持ちましょうか」= "Shall I carry your luggage?" Different from ましょうか as a mutual proposal.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 13
// ─────────────────────────────────────────────────────────────────────────────

const ch13: GrammarPoint[] = [
  {
    id: 'mnn1-13-43',
    lesson: 13, number: 43, jlpt: 'N5',
    pattern: 'V て います (progresivo)',
    name_es: 'ています: acción en progreso',
    name_ca: 'ています: acció en curs',
    name_en: 'ています: action in progress',
    explanation_es: 'V て います (te imasu) con verbos de acción expresa que la acción está ocurriendo ahora mismo, como el gerundio español "-ando/-iendo". Es el equivalente de "estar + gerundio".',
    explanation_ca: 'V て います (te imasu) amb verbs d\'acció expressa que l\'acció està ocorrent ara mateix, com el gerundi català "-ant/-ent". És l\'equivalent de "estar + gerundi".',
    explanation_en: 'V て います (te imasu) with action verbs expresses an action currently in progress — equivalent to the English "-ing" progressive form.',
    structure: [
      { text: 'V', role: 'verb', isSlot: true,  label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て', role: 'key', isSlot: false },
      { text: 'い', role: 'key', isSlot: false },
      { text: 'ます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '今',   furigana: 'いま',  role: 'time',   gloss_es: 'ahora',       gloss_ca: 'ara',         gloss_en: 'now' },
      { text: '雨',   furigana: 'あめ',  role: 'subject', gloss_es: 'lluvia',     gloss_ca: 'pluja',       gloss_en: 'rain' },
      { text: 'が',                      role: 'subject', gloss_es: '[sujeto]',   gloss_ca: '[subjecte]',  gloss_en: '[subj]' },
      { text: '降って', furigana: 'ふって', role: 'verb',  gloss_es: 'cayendo',   gloss_ca: 'caient',      gloss_en: 'falling' },
      { text: 'い',                      role: 'key',    gloss_es: 'está',        gloss_ca: 'està',        gloss_en: 'is' },
      { text: 'ます',                    role: 'key',    gloss_es: '[progresivo]', gloss_ca: '[progressiu]', gloss_en: '[progressive]' },
    ],
    tip_es: 'ています tiene dos usos principales: 1) Progresivo (acción en curso): 食べています (estoy comiendo). 2) Estado resultante: 結婚しています (estoy casado/a). El significado depende del tipo de verbo.',
    tip_ca: 'ています té dos usos principals: 1) Progressiu (acció en curs): 食べています (estic menjant). 2) Estat resultant: 結婚しています (estic casat/da). El significat depèn del tipus de verb.',
    tip_en: 'ています has two main uses: 1) Progressive (action in progress): 食べています (I\'m eating). 2) Resultant state: 結婚しています (I\'m married). Meaning depends on the verb type.',
  },
  {
    id: 'mnn1-13-44',
    lesson: 13, number: 44, jlpt: 'N5',
    pattern: 'V て います (estado resultante)',
    name_es: 'ています: estado resultante',
    name_ca: 'ています: estat resultant',
    name_en: 'ています: resultant state',
    explanation_es: 'Con verbos de cambio de estado (casarse, ponerse, llegar...) ています expresa el estado que resulta de esa acción completada. "Me casé → estoy casado". En español corresponde a "estar + participio".',
    explanation_ca: 'Amb verbs de canvi d\'estat (casar-se, posar-se, arribar...) ています expressa l\'estat que resulta d\'aquesta acció completada. "Em vaig casar → estic casat". En català correspon a "estar + participi".',
    explanation_en: 'With change-of-state verbs (marry, put on, arrive...) ています expresses the state resulting from a completed action. "Got married → am married". Corresponds to "have/be + past participle".',
    structure: [
      { text: 'V[cambio]', role: 'verb', isSlot: true,  label_es: 'v. cambio estado', label_ca: 'v. canvi estat', label_en: 'change-of-state verb' },
      { text: 'て',        role: 'key',  isSlot: false },
      { text: 'い',        role: 'key',  isSlot: false },
      { text: 'ます',      role: 'key',  isSlot: false },
    ],
    example: [
      { text: 'スミスさん',                      role: 'topic',   gloss_es: 'el Sr. Smith',  gloss_ca: 'el Sr. Smith',  gloss_en: 'Mr. Smith' },
      { text: 'は',                             role: 'topic',   gloss_es: '[tema]',        gloss_ca: '[tema]',        gloss_en: '[topic]' },
      { text: '結婚して', furigana: 'けっこんして', role: 'verb',  gloss_es: 'casado',       gloss_ca: 'casat',         gloss_en: 'married' },
      { text: 'い',                             role: 'key',     gloss_es: 'está',          gloss_ca: 'està',          gloss_en: 'is' },
      { text: 'ます',                           role: 'key',     gloss_es: '[estado]',      gloss_ca: '[estat]',       gloss_en: '[state]' },
    ],
    tip_es: 'Verbos de estado resultante comunes: 結婚しています (estar casado), 知っています (saber/conocer), 住んでいます (vivir en), 着ています (llevar puesto), 太っています (estar gordo).',
    tip_ca: 'Verbs d\'estat resultant comuns: 結婚しています (estar casat), 知っています (saber/conèixer), 住んでいます (viure a), 着ています (portar posat), 太っています (estar gras).',
    tip_en: 'Common resultant-state verbs: 結婚しています (be married), 知っています (know), 住んでいます (live in), 着ています (be wearing), 太っています (be overweight).',
  },
  {
    id: 'mnn1-13-45',
    lesson: 13, number: 45, jlpt: 'N5',
    pattern: 'もう V ました / まだ V ていません',
    name_es: 'もう (ya) y まだ (todavía no)',
    name_ca: 'もう (ja) i まだ (encara no)',
    name_en: 'もう (already) and まだ (not yet)',
    explanation_es: 'もう + pasado afirmativo = "ya hice V". まだ + ていません = "todavía no he hecho V". Son expresiones complementarias y muy frecuentes en conversación para hablar de tareas pendientes o completadas.',
    explanation_ca: 'もう + passat afirmatiu = "ja he fet V". まだ + ていません = "encara no he fet V". Són expressions complementàries i molt freqüents en conversa per parlar de tasques pendents o completades.',
    explanation_en: 'もう + past affirmative = "already did V". まだ + ていません = "haven\'t done V yet". Complementary expressions, very frequent in conversation for discussing pending or completed tasks.',
    structure: [
      { text: 'もう',  role: 'key',  isSlot: false },
      { text: 'V',    role: 'verb', isSlot: true, label_es: 'verbo',    label_ca: 'verb',     label_en: 'verb' },
      { text: 'ました', role: 'key', isSlot: false },
      { text: '／',   role: 'noun', isSlot: false },
      { text: 'まだ',  role: 'key', isSlot: false },
      { text: 'V',    role: 'verb', isSlot: true, label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て',   role: 'key',  isSlot: false },
      { text: 'いません', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'A:',                               role: 'noun',   gloss_es: 'A:',          gloss_ca: 'A:',           gloss_en: 'A:' },
      { text: '宿題', furigana: 'しゅくだい',     role: 'object', gloss_es: 'deberes',     gloss_ca: 'deures',       gloss_en: 'homework' },
      { text: 'は',                               role: 'topic',  gloss_es: '[tema]',      gloss_ca: '[tema]',       gloss_en: '[topic]' },
      { text: 'もう',                             role: 'key',    gloss_es: '¿ya',         gloss_ca: '¿ja',          gloss_en: 'already' },
      { text: 'し',   furigana: 'し',             role: 'verb',   gloss_es: 'hiciste',     gloss_ca: 'has fet',      gloss_en: 'did' },
      { text: 'ました',                           role: 'key',    gloss_es: '?',           gloss_ca: '?',            gloss_en: '?' },
      { text: 'B: まだ',                         role: 'key',    gloss_es: 'B: todavía no', gloss_ca: 'B: encara no', gloss_en: 'B: not yet' },
    ],
    tip_es: 'Pregunta: 「もうV ましたか」= "¿Ya hiciste V?" Respuesta afirmativa: 「はい、もうVました」. Negativa: 「いいえ、まだVていません」.',
    tip_ca: 'Pregunta: 「もうV ましたか」= "¿Ja has fet V?" Resposta afirmativa: 「はい、もうVました」. Negativa: 「いいえ、まだVていません」.',
    tip_en: 'Question: 「もうV ましたか」= "Have you done V yet?" Affirmative: 「はい、もうVました」. Negative: 「いいえ、まだVていません」.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 14
// ─────────────────────────────────────────────────────────────────────────────

const ch14: GrammarPoint[] = [
  {
    id: 'mnn1-14-46',
    lesson: 14, number: 46, jlpt: 'N4',
    pattern: 'あげます / もらいます / くれます',
    name_es: 'Verbos de dar y recibir',
    name_ca: 'Verbs de donar i rebre',
    name_en: 'Giving and receiving verbs',
    explanation_es: 'El japonés tiene tres verbos distintos según la dirección: あげます = dar (yo/otro → otro). もらいます = recibir (yo ← otro). くれます = dar a mí/grupo (otro → yo). La elección depende del punto de vista del hablante.',
    explanation_ca: 'El japonès té tres verbs distincts segons la direcció: あげます = donar (jo/altre → altre). もらいます = rebre (jo ← altre). くれます = donar a mi/grup (altre → jo). L\'elecció depèn del punt de vista del parlant.',
    explanation_en: 'Japanese has three verbs depending on direction: あげます = give (I/other → other). もらいます = receive (I ← other). くれます = give to me/in-group (other → me). Choice depends on the speaker\'s perspective.',
    structure: [
      { text: 'Donor', role: 'subject',  isSlot: true,  label_es: 'quien da',  label_ca: 'qui dona',  label_en: 'giver' },
      { text: 'が/は', role: 'subject',  isSlot: false },
      { text: 'Recip.', role: 'direction', isSlot: true, label_es: 'receptor', label_ca: 'receptor',  label_en: 'receiver' },
      { text: 'に',    role: 'direction', isSlot: false },
      { text: 'N',    role: 'object',   isSlot: true,  label_es: 'regalo',    label_ca: 'regal',     label_en: 'gift' },
      { text: 'を',   role: 'object',   isSlot: false },
      { text: 'あげます／もらいます／くれます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '私',   furigana: 'わたし', role: 'subject',   gloss_es: 'yo',           gloss_ca: 'jo',           gloss_en: 'I' },
      { text: 'は',                       role: 'topic',     gloss_es: '[tema]',        gloss_ca: '[tema]',       gloss_en: '[topic]' },
      { text: '田中', furigana: 'たなか', role: 'direction', gloss_es: 'a Tanaka',      gloss_ca: 'a Tanaka',     gloss_en: 'to Tanaka' },
      { text: 'さん',                     role: 'particle',  gloss_es: '[cortesía]',    gloss_ca: '[cortesia]',   gloss_en: '[polite]' },
      { text: 'に',                       role: 'direction', gloss_es: 'a',             gloss_ca: 'a',            gloss_en: 'to' },
      { text: '本',   furigana: 'ほん',   role: 'object',    gloss_es: 'un libro',      gloss_ca: 'un llibre',    gloss_en: 'a book' },
      { text: 'を',                       role: 'object',    gloss_es: '[objeto]',      gloss_ca: '[objecte]',    gloss_en: '[object]' },
      { text: 'あげ',                     role: 'verb',      gloss_es: 'di/regalé',     gloss_ca: 'vaig donar',   gloss_en: 'gave' },
      { text: 'ました',                   role: 'key',       gloss_es: '[pasado]',      gloss_ca: '[passat]',     gloss_en: '[past]' },
    ],
    tip_es: 'Truco visual: あげます → flecha hacia fuera (↗). もらいます → flecha hacia dentro (↙). くれます → flecha hacia mí específicamente (→ yo). くれます NUNCA tiene al hablante como sujeto.',
    tip_ca: 'Truc visual: あげます → fletxa cap enfora (↗). もらいます → fletxa cap endins (↙). くれます → fletxa cap a mi específicament (→ jo). くれます MAI té el parlant com a subjecte.',
    tip_en: 'Visual trick: あげます → outward arrow (↗). もらいます → inward arrow (↙). くれます → arrow toward me specifically (→ me). くれます NEVER has the speaker as subject.',
  },
  {
    id: 'mnn1-14-47',
    lesson: 14, number: 47, jlpt: 'N4',
    pattern: 'V てあげます / てもらいます / てくれます',
    name_es: 'Dar y recibir acciones',
    name_ca: 'Donar i rebre accions',
    name_en: 'Giving and receiving actions',
    explanation_es: 'La misma lógica de あげます/もらいます/くれます se aplica a acciones completas añadiendo て antes. てあげます = hacer algo por otro. てもらいます = recibir que otro haga algo por mí. てくれます = que otro hace algo por mí.',
    explanation_ca: 'La mateixa lògica d\'あげます/もらいます/くれます s\'aplica a accions completes afegint て davant. てあげます = fer alguna cosa per un altre. てもらいます = rebre que un altre faci alguna cosa per mi. てくれます = que un altre fa alguna cosa per mi.',
    explanation_en: 'The same logic of あげます/もらいます/くれます applies to full actions by adding て before. てあげます = do something for another. てもらいます = have someone do something for me. てくれます = someone does something for me.',
    structure: [
      { text: 'V',             role: 'verb', isSlot: true,  label_es: 'verbo (て)', label_ca: 'verb (て)', label_en: 'verb (て)' },
      { text: 'て',            role: 'key',  isSlot: false },
      { text: 'あげます／もらいます／くれます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '田中', furigana: 'たなか',  role: 'subject',   gloss_es: 'Tanaka',       gloss_ca: 'Tanaka',       gloss_en: 'Tanaka' },
      { text: 'さん',                      role: 'particle',  gloss_es: '[cortesía]',   gloss_ca: '[cortesia]',   gloss_en: '[polite]' },
      { text: 'が',                        role: 'subject',   gloss_es: '[sujeto]',     gloss_ca: '[subjecte]',   gloss_en: '[subj]' },
      { text: '駅',   furigana: 'えき',    role: 'direction', gloss_es: 'a la estación', gloss_ca: 'a l\'estació', gloss_en: 'to the station' },
      { text: 'まで',                      role: 'key',       gloss_es: 'hasta',        gloss_ca: 'fins a',       gloss_en: 'as far as' },
      { text: '送って', furigana: 'おくって', role: 'verb',    gloss_es: 'acompañar',    gloss_ca: 'acompanyar',   gloss_en: 'take/drive' },
      { text: 'くれ',                      role: 'key',       gloss_es: 'me',           gloss_ca: 'em',           gloss_en: 'for me' },
      { text: 'ました',                    role: 'key',       gloss_es: '[pasado]',     gloss_ca: '[passat]',     gloss_en: '[past]' },
    ],
    tip_es: 'てもらいます puede expresar petición indirecta: 「先生に説明してもらいました」= "Le pedí a la profesora que me lo explicara / La profesora me lo explicó (y se lo agradezco)".',
    tip_ca: 'てもらいます pot expressar petició indirecta: 「先生に説明してもらいました」= "Li vaig demanar a la professora que m\'ho expliqués / La professora m\'ho va explicar (i li ho agraeixo)".',
    tip_en: 'てもらいます can express an indirect request: 「先生に説明してもらいました」= "I had the teacher explain it to me / The teacher explained it to me (and I\'m grateful)".',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER 15
// ─────────────────────────────────────────────────────────────────────────────

const ch15: GrammarPoint[] = [
  {
    id: 'mnn1-15-48',
    lesson: 15, number: 48, jlpt: 'N4',
    pattern: 'V こと が できます',
    name_es: 'Potencial: poder hacer V (ことができます)',
    name_ca: 'Potencial: poder fer V (ことができます)',
    name_en: 'Potential: can do V (ことができます)',
    explanation_es: 'V ことができます expresa capacidad o posibilidad de hacer algo: "puedo/sé hacer V". V va en forma diccionario (forma llana). Es la forma larga del potencial — más formal que la forma potencial corta (食べられます).',
    explanation_ca: 'V ことができます expressa capacitat o possibilitat de fer alguna cosa: "puc/sé fer V". V va en forma diccionari (forma plana). És la forma llarga del potencial — més formal que la forma potencial curta (食べられます).',
    explanation_en: 'V ことができます expresses ability or possibility to do something: "can/be able to do V". V is in dictionary (plain) form. This is the long potential form — more formal than the short potential (食べられます).',
    structure: [
      { text: 'V[dict.]', role: 'verb', isSlot: true,  label_es: 'verbo (dict.)', label_ca: 'verb (dict.)', label_en: 'verb (dict.)' },
      { text: 'こと',      role: 'key', isSlot: false },
      { text: 'が',        role: 'subject', isSlot: false },
      { text: 'でき',      role: 'key', isSlot: false },
      { text: 'ます',      role: 'key', isSlot: false },
    ],
    example: [
      { text: '私',   furigana: 'わたし',  role: 'topic',   gloss_es: 'yo',              gloss_ca: 'jo',              gloss_en: 'I' },
      { text: 'は',                        role: 'topic',   gloss_es: '[tema]',           gloss_ca: '[tema]',          gloss_en: '[topic]' },
      { text: 'ピアノ',                    role: 'object',  gloss_es: 'piano',            gloss_ca: 'piano',           gloss_en: 'piano' },
      { text: 'を',                        role: 'object',  gloss_es: '[objeto]',         gloss_ca: '[objecte]',       gloss_en: '[object]' },
      { text: '弾く', furigana: 'ひく',    role: 'verb',    gloss_es: 'tocar',            gloss_ca: 'tocar',           gloss_en: 'play' },
      { text: 'こと',                      role: 'key',     gloss_es: 'cosa de',          gloss_ca: 'cosa de',         gloss_en: 'the act of' },
      { text: 'が',                        role: 'subject', gloss_es: '[sujeto]',         gloss_ca: '[subjecte]',      gloss_en: '[subj]' },
      { text: 'でき',                      role: 'key',     gloss_es: 'puedo',            gloss_ca: 'puc',             gloss_en: 'can' },
      { text: 'ます',                      role: 'key',     gloss_es: '[pres.]',          gloss_ca: '[pres.]',         gloss_en: '[pres.]' },
    ],
    tip_es: 'ことができます usa la forma diccionario del verbo (食べる、見る、する…). La negación es ことができません. Para preguntar: 「〜ことができますか」= "¿Puedes hacer 〜?"',
    tip_ca: 'ことができます usa la forma diccionari del verb (食べる、見る、する…). La negació és ことができません. Per preguntar: 「〜ことができますか」= "Pots fer 〜?"',
    tip_en: 'ことができます uses the dictionary form of the verb (食べる、見る、する…). Negative: ことができません. Question: 「〜ことができますか」= "Can you do 〜?"',
  },
  {
    id: 'mnn1-15-49',
    lesson: 15, number: 49, jlpt: 'N4',
    pattern: 'N が できます',
    name_es: 'Habilidad con sustantivo (Nができます)',
    name_ca: 'Habilitat amb substantiu (Nができます)',
    name_en: 'Ability with noun (Nができます)',
    explanation_es: 'N が できます expresa habilidad con un sustantivo (habilidad, deporte, idioma): "sé/puedo hacer N". できます también significa "terminarse/estar listo" según contexto. Es el uso más directo y natural del potencial.',
    explanation_ca: 'N が できます expressa habilitat amb un substantiu (habilitat, esport, idioma): "sé/puc fer N". できます també significa "acabar-se/estar llest" segons context. És l\'ús més directe i natural del potencial.',
    explanation_en: 'N が できます expresses ability with a noun (skill, sport, language): "I can do/speak N". できます also means "to be done/ready" in other contexts. The most direct and natural use of potential.',
    structure: [
      { text: 'N',    role: 'subject', isSlot: true,  label_es: 'habilidad', label_ca: 'habilitat', label_en: 'skill' },
      { text: 'が',   role: 'subject', isSlot: false },
      { text: 'でき', role: 'key',     isSlot: false },
      { text: 'ます', role: 'key',     isSlot: false },
    ],
    example: [
      { text: 'スミスさん',                     role: 'topic',   gloss_es: 'el Sr. Smith',  gloss_ca: 'el Sr. Smith',  gloss_en: 'Mr. Smith' },
      { text: 'は',                            role: 'topic',   gloss_es: '[tema]',        gloss_ca: '[tema]',        gloss_en: '[topic]' },
      { text: '日本語', furigana: 'にほんご',  role: 'subject', gloss_es: 'japonés',       gloss_ca: 'japonès',       gloss_en: 'Japanese' },
      { text: 'が',                            role: 'subject', gloss_es: '[sujeto]',      gloss_ca: '[subjecte]',    gloss_en: '[subj]' },
      { text: 'でき',                          role: 'key',     gloss_es: 'sabe',          gloss_ca: 'sap',           gloss_en: 'can speak' },
      { text: 'ます',                          role: 'key',     gloss_es: '[pres.]',       gloss_ca: '[pres.]',       gloss_en: '[pres.]' },
    ],
    tip_es: 'Habilidades comunes con できます: 日本語ができます (sé japonés), 料理ができます (sé cocinar), 運転ができます (sé conducir), テニスができます (sé jugar al tenis).',
    tip_ca: 'Habilitats comunes amb できます: 日本語ができます (sé japonès), 料理ができます (sé cuinar), 運転ができます (sé conduir), テニスができます (sé jugar a tennis).',
    tip_en: 'Common skills with できます: 日本語ができます (speak Japanese), 料理ができます (cook), 運転ができます (drive), テニスができます (play tennis).',
  },
]

// ─── CHAPTER 16 ───────────────────────────────────────────────────────────────
const ch16: GrammarPoint[] = [
  {
    id: 'mnn1-16-1', lesson: 16, number: 50, jlpt: 'N4',
    pattern: 'V 辞書形 (forma diccionario)',
    name_es: 'Forma diccionario (forma corta presente afirmativa)',
    name_ca: 'Forma diccionari (forma curta present afirmativa)',
    name_en: 'Dictionary form (plain affirmative present)',
    explanation_es: 'La forma corta del verbo es la forma básica del diccionario. Se usa en lenguaje informal, en oraciones subordinadas (と思います, と言います, etc.) y como base para construir otras formas. ます-form: 食べます / forma corta: 食べる.',
    explanation_ca: 'La forma curta del verb és la forma bàsica del diccionari. S\'usa en llenguatge informal, en oracions subordinades (と思います, と言います, etc.) i com a base per construir altres formes.',
    explanation_en: 'The plain form of a verb is the dictionary form. Used in casual speech, subordinate clauses (と思います, と言います, etc.) and as the base for other forms. ます-form: 食べます / plain form: 食べる.',
    structure: [
      { text: 'V', role: 'verb', isSlot: true, label_es: 'verbo (diccionario)', label_ca: 'verb (diccionari)', label_en: 'verb (dictionary)' },
      { text: '（る / u-sound）', role: 'key', isSlot: false },
    ],
    example: [
      { text: '毎日', furigana: 'まいにち', role: 'time', gloss_es: 'cada día', gloss_ca: 'cada dia', gloss_en: 'every day' },
      { text: '日本語', furigana: 'にほんご', role: 'object', gloss_es: 'japonés', gloss_ca: 'japonès', gloss_en: 'Japanese' },
      { text: 'を', role: 'object', gloss_es: 'obj.', gloss_ca: 'obj.', gloss_en: 'obj.' },
      { text: '勉強する', furigana: 'べんきょうする', role: 'verb', gloss_es: 'estudiar', gloss_ca: 'estudiar', gloss_en: 'study' },
    ],
    tip_es: 'Grupo 2 (ru-verbos) terminan en る. Grupo 1 (u-verbos): く, ぐ, す, つ, ぬ, ぶ, む, る, う. Irregulares: する→する, くる→くる.',
    tip_ca: 'Grup 2 (ru-verbs) acaben en る. Grup 1 (u-verbs): く, ぐ, す, つ, ぬ, ぶ, む, る, う. Irregulars: する→する, くる→くる.',
    tip_en: 'Group 2 (ru-verbs) end in る. Group 1 (u-verbs): く, ぐ, す, つ, ぬ, ぶ, む, る, う. Irregular: する→する, くる→くる.',
  },
  {
    id: 'mnn1-16-2', lesson: 16, number: 51, jlpt: 'N4',
    pattern: '普通形 + と思います',
    name_es: 'Creo que ~ / Pienso que ~',
    name_ca: 'Crec que ~ / Penso que ~',
    name_en: 'I think that ~',
    explanation_es: 'Usa la forma corta (plain form) seguida de と思います para expresar lo que uno piensa o cree. Con verbos, adjetivos-い, adjetivos-な (+ だ) y sustantivos (+ だ).',
    explanation_ca: 'Usa la forma curta (plain form) seguida de と思います per expressar el que un pensa o creu. Amb verbs, adjectius-い, adjectius-な (+ だ) i substantius (+ だ).',
    explanation_en: 'Use the plain form followed by と思います to express what you think. Works with verbs, い-adjectives, な-adjectives (+ だ) and nouns (+ だ).',
    structure: [
      { text: 'S', role: 'noun', isSlot: true, label_es: 'oración (forma corta)', label_ca: 'oració (forma curta)', label_en: 'clause (plain form)' },
      { text: 'と', role: 'key', isSlot: false },
      { text: '思います', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'あした', role: 'time', gloss_es: 'mañana', gloss_ca: 'demà', gloss_en: 'tomorrow' },
      { text: '雨が', furigana: 'あめが', role: 'subject', gloss_es: 'lluvia', gloss_ca: 'pluja', gloss_en: 'rain' },
      { text: '降る', furigana: 'ふる', role: 'verb', gloss_es: 'caerá', gloss_ca: 'caurà', gloss_en: 'will fall' },
      { text: 'と', role: 'key', gloss_es: '(que)', gloss_ca: '(que)', gloss_en: 'that' },
      { text: '思います', furigana: 'おもいます', role: 'key', gloss_es: 'creo', gloss_ca: 'crec', gloss_en: 'I think' },
    ],
    tip_es: 'と思っています indica una opinión más persistente/duradera. と思います es más puntual o inmediata.',
    tip_ca: 'と思っています indica una opinió més persistent/duradora. と思います és més puntual o immediata.',
    tip_en: 'と思っています indicates a more persistent/ongoing opinion. と思います is more immediate.',
  },
  {
    id: 'mnn1-16-3', lesson: 16, number: 52, jlpt: 'N4',
    pattern: '普通形 + と言っていました',
    name_es: 'Dijo que ~ / Me dijo que ~',
    name_ca: 'Va dir que ~ / Em va dir que ~',
    name_en: 'Said that ~ / Told me that ~',
    explanation_es: 'Se usa para citar lo que alguien dijo. La oración citada va en forma corta, seguida de と言っていました (dijo que) o と言いました (dijo). Use と言っていました para transmitir información a un tercero.',
    explanation_ca: 'S\'usa per citar el que algú va dir. L\'oració citada va en forma curta, seguida de と言っていました (va dir que) o と言いました (va dir).',
    explanation_en: 'Used to quote what someone said. The quoted clause uses the plain form + と言っていました (said that). Use と言っていました when relaying a message to a third party.',
    structure: [
      { text: 'N', role: 'topic', isSlot: true, label_es: 'persona', label_ca: 'persona', label_en: 'person' },
      { text: 'は', role: 'topic', isSlot: false },
      { text: 'S', role: 'noun', isSlot: true, label_es: 'cita (forma corta)', label_ca: 'cita (forma curta)', label_en: 'quote (plain form)' },
      { text: 'と', role: 'key', isSlot: false },
      { text: '言っていました', role: 'key', isSlot: false },
    ],
    example: [
      { text: '田中さんは', furigana: 'たなかさんは', role: 'topic', gloss_es: 'Tanaka', gloss_ca: 'Tanaka', gloss_en: 'Tanaka' },
      { text: '来ない', furigana: 'こない', role: 'verb', gloss_es: 'no vendrá', gloss_ca: 'no vindrà', gloss_en: "won't come" },
      { text: 'と', role: 'key', gloss_es: '(que)', gloss_ca: '(que)', gloss_en: 'that' },
      { text: '言っていました', furigana: 'いっていました', role: 'key', gloss_es: 'dijo', gloss_ca: 'va dir', gloss_en: 'said' },
    ],
  },
]

// ─── CHAPTER 17 ───────────────────────────────────────────────────────────────
const ch17: GrammarPoint[] = [
  {
    id: 'mnn1-17-1', lesson: 17, number: 53, jlpt: 'N4',
    pattern: 'V て みます',
    name_es: 'Intentar ~ / Probar a ~',
    name_ca: 'Intentar ~ / Provar de ~',
    name_en: 'Try doing ~',
    explanation_es: '「V て みます」 expresa la idea de intentar o probar una acción para ver qué pasa. Combina la forma て del verbo con みます (ver). "Lo probaré a ver cómo sale".',
    explanation_ca: '「V て みます」 expressa la idea d\'intentar o provar una acció per veure què passa. Combina la forma て del verb amb みます (veure). "Ho provaré a veure com surt".',
    explanation_en: '「V て みます」 expresses trying or attempting an action to see what happens. Combines the て-form with みます (to see). "I\'ll give it a try and see".',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo (forma て)', label_ca: 'verb (forma て)', label_en: 'verb (te-form)' },
      { text: 'みます', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'この料理を', furigana: 'このりょうりを', role: 'object', gloss_es: 'esta comida', gloss_ca: 'aquest plat', gloss_en: 'this dish' },
      { text: '食べて', furigana: 'たべて', role: 'verb', gloss_es: 'comer', gloss_ca: 'menjar', gloss_en: 'eat' },
      { text: 'みます', role: 'key', gloss_es: 'probaré', gloss_ca: 'provaré', gloss_en: "I'll try" },
    ],
    tip_es: 'てみます indica curiosidad o experimentación, no esfuerzo. Equivale a "lo probaré a ver" en español.',
    tip_ca: 'てみます indica curiositat o experimentació, no esforç. Equival a "ho provaré a veure" en català.',
    tip_en: 'てみます indicates curiosity or experimentation, not effort. It implies "I\'ll see what happens".',
  },
  {
    id: 'mnn1-17-2', lesson: 17, number: 54, jlpt: 'N4',
    pattern: 'V て おきます',
    name_es: 'Hacer algo de antemano / Dejar hecho',
    name_ca: "Fer alguna cosa d'antemà / Deixar fet",
    name_en: 'Do in advance / Leave as is',
    explanation_es: '「V て おきます」 indica hacer algo con anticipación para estar preparado, o dejar algo tal como está. Se usa cuando hay una razón o propósito claro. Coloquialmente: 〜とく.',
    explanation_ca: '「V て おきます」 indica fer alguna cosa amb anticipació per estar preparat, o deixar alguna cosa tal com està. S\'usa quan hi ha una raó o propòsit clar. Col·loquialment: 〜とく.',
    explanation_en: '「V て おきます」 indicates doing something in advance as preparation, or leaving something as it is on purpose. Colloquially shortened to 〜とく.',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo (forma て)', label_ca: 'verb (forma て)', label_en: 'verb (te-form)' },
      { text: 'おきます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '旅行の前に', furigana: 'りょこうのまえに', role: 'time', gloss_es: 'antes del viaje', gloss_ca: 'abans del viatge', gloss_en: 'before the trip' },
      { text: 'ホテルを', role: 'object', gloss_es: 'el hotel', gloss_ca: "l'hotel", gloss_en: 'the hotel' },
      { text: '予約して', furigana: 'よやくして', role: 'verb', gloss_es: 'reservar', gloss_ca: 'reservar', gloss_en: 'reserve' },
      { text: 'おきます', role: 'key', gloss_es: 'de antemano', gloss_ca: "d'antemà", gloss_en: 'in advance' },
    ],
  },
  {
    id: 'mnn1-17-3', lesson: 17, number: 55, jlpt: 'N4',
    pattern: 'V て しまいます',
    name_es: 'Acabar de ~ / Terminar completamente ~ (a veces con pesar)',
    name_ca: 'Acabar de ~ / Terminar completament ~ (de vegades amb penediment)',
    name_en: 'End up doing ~ / Do completely ~ (sometimes with regret)',
    explanation_es: '「V て しまいます」 tiene dos usos: (1) completar una acción del todo, (2) hacer algo involuntariamente o lamentablemente. Coloquialmente: 〜ちゃいます / 〜ちゃう.',
    explanation_ca: '「V て しまいます」 té dos usos: (1) completar una acció del tot, (2) fer alguna cosa involuntàriament o lamentablement. Col·loquialment: 〜ちゃいます / 〜ちゃう.',
    explanation_en: '「V て しまいます」 has two uses: (1) completing an action fully, (2) doing something unintentionally or regrettably. Colloquially: 〜ちゃいます / 〜ちゃう.',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo (forma て)', label_ca: 'verb (forma て)', label_en: 'verb (te-form)' },
      { text: 'しまいます', role: 'key', isSlot: false },
    ],
    example: [
      { text: '財布を', furigana: 'さいふを', role: 'object', gloss_es: 'la cartera', gloss_ca: 'la cartera', gloss_en: 'wallet' },
      { text: '忘れて', furigana: 'わすれて', role: 'verb', gloss_es: 'olvidar', gloss_ca: 'oblidar', gloss_en: 'forget' },
      { text: 'しまいました', role: 'key', gloss_es: '(con pesar)', gloss_ca: '(amb penediment)', gloss_en: '(regrettably)' },
    ],
    tip_es: 'Context determines meaning: "宿題をやってしまった" = lo terminé todo. "財布を忘れてしまった" = me olvidé (con pesar). Coloquial: 〜ちゃった.',
    tip_ca: 'El context determina el significat: "宿題をやってしまった" = ho vaig acabar tot. "財布を忘れてしまった" = me l\'he oblidat (amb penediment). Col·loquial: 〜ちゃった.',
    tip_en: 'Context determines meaning: "宿題をやってしまった" = finished it all. "財布を忘れてしまった" = forgot it (regrettably). Colloquial: 〜ちゃった.',
  },
]

// ─── CHAPTER 18 ───────────────────────────────────────────────────────────────
const ch18: GrammarPoint[] = [
  {
    id: 'mnn1-18-1', lesson: 18, number: 56, jlpt: 'N4',
    pattern: 'V た こと が あります',
    name_es: 'He hecho ~ / Tengo experiencia de ~',
    name_ca: 'He fet ~ / Tinc experiència de ~',
    name_en: 'Have done ~ / Have experience of ~',
    explanation_es: 'Expresa experiencias previas. Forma た del verbo + こと が あります. Negativa: た こと が ありません. こと nominaliza el verbo, convirtiéndolo en un "hecho/experiencia".',
    explanation_ca: 'Expressa experiències prèvies. Forma た del verb + こと が あります. Negativa: た こと が ありません. こと nominalitza el verb, convertint-lo en un "fet/experiència".',
    explanation_en: 'Expresses prior experiences. Uses the た form + こと が あります. Negative: た こと が ありません. こと nominalizes the verb into a "fact/experience".',
    structure: [
      { text: 'V た', role: 'verb', isSlot: true, label_es: 'verbo (forma た)', label_ca: 'verb (forma た)', label_en: 'verb (ta-form)' },
      { text: 'こと', role: 'key', isSlot: false },
      { text: 'が', role: 'key', isSlot: false },
      { text: 'あります', role: 'key', isSlot: false },
    ],
    example: [
      { text: '富士山に', furigana: 'ふじさんに', role: 'direction', gloss_es: 'al Fuji', gloss_ca: 'al Fuji', gloss_en: 'to Mt. Fuji' },
      { text: '登った', furigana: 'のぼった', role: 'verb', gloss_es: 'subir', gloss_ca: 'pujar', gloss_en: 'climbed' },
      { text: 'こと', role: 'key', gloss_es: 'experiencia', gloss_ca: 'experiència', gloss_en: 'experience' },
      { text: 'が', role: 'key', gloss_es: 'SUJ', gloss_ca: 'SUBJ', gloss_en: 'SUBJ' },
      { text: 'あります', role: 'key', gloss_es: 'tengo', gloss_ca: 'tinc', gloss_en: 'I have' },
    ],
    tip_es: 'Usa la forma た siempre, incluso en frases del presente. No confundir con ことができます (habilidad). たことがあります = "alguna vez hice X".',
    tip_ca: 'Usa la forma た sempre, fins i tot en frases del present. No confondre amb ことができます (habilitat). たことがあります = "alguna vegada vaig fer X".',
    tip_en: 'Always use the た form, even in present-tense sentences. Don\'t confuse with ことができます (ability). たことがあります = "I have once done X".',
  },
  {
    id: 'mnn1-18-2', lesson: 18, number: 57, jlpt: 'N4',
    pattern: 'V たり V たり します',
    name_es: 'Hacer cosas como ~ y ~',
    name_ca: 'Fer coses com ~ i ~',
    name_en: 'Do things like ~ and ~',
    explanation_es: 'Enumera acciones de forma no exhaustiva, como ejemplos. La forma たり se construye añadiendo り a la forma た. Al menos dos verbos, terminando con します. Implica que hay más actividades no mencionadas.',
    explanation_ca: 'Enumera accions de manera no exhaustiva, com a exemples. La forma たり es construeix afegint り a la forma た. Almenys dos verbs, acabant amb します. Implica que hi ha més activitats no esmentades.',
    explanation_en: 'Lists actions non-exhaustively, as examples. The たり form adds り to the た form. At least two verbs, ending with します. Implies there are more unmentioned activities.',
    structure: [
      { text: 'V₁ たり', role: 'key', isSlot: true, label_es: 'acción 1 (た→たり)', label_ca: 'acció 1 (た→たり)', label_en: 'action 1 (た→たり)' },
      { text: 'V₂ たり', role: 'key', isSlot: true, label_es: 'acción 2 (た→たり)', label_ca: 'acció 2 (た→たり)', label_en: 'action 2 (た→たり)' },
      { text: 'します', role: 'verb', isSlot: false },
    ],
    example: [
      { text: '週末は', furigana: 'しゅうまつは', role: 'time', gloss_es: 'el fin de semana', gloss_ca: 'el cap de setmana', gloss_en: 'on weekends' },
      { text: '映画を見たり', furigana: 'えいがをみたり', role: 'key', gloss_es: 'ver películas...', gloss_ca: 'veure pel·lícules...', gloss_en: 'watch movies...' },
      { text: '音楽を聴いたり', furigana: 'おんがくをきいたり', role: 'key', gloss_es: 'escuchar música...', gloss_ca: 'escoltar música...', gloss_en: 'listen to music...' },
      { text: 'します', role: 'verb', gloss_es: 'hago', gloss_ca: 'faig', gloss_en: 'do' },
    ],
    tip_es: 'たり〜たりします implica una lista incompleta. No confundir con てから (secuencia obligatoria) o て〜て (lista completa).',
    tip_ca: 'たり〜たりします implica una llista incompleta. No confondre amb てから (seqüència obligatòria) o て〜て (llista completa).',
    tip_en: 'たり〜たりします implies an incomplete list. Don\'t confuse with てから (obligatory sequence) or て〜て (complete list).',
  },
]

// ─── CHAPTER 19 ───────────────────────────────────────────────────────────────
const ch19: GrammarPoint[] = [
  {
    id: 'mnn1-19-1', lesson: 19, number: 58, jlpt: 'N4',
    pattern: 'V ながら',
    name_es: 'Mientras ~ / Al mismo tiempo que ~',
    name_ca: 'Mentre ~ / Al mateix temps que ~',
    name_en: 'While doing ~ / At the same time as ~',
    explanation_es: 'Indica que dos acciones ocurren simultáneamente. ながら se añade al stem del verbo (forma ます sin ます). La acción con ながら es la secundaria; la principal va al final.',
    explanation_ca: 'Indica que dues accions ocorren simultàniament. ながら s\'afegeix al stem del verb (forma ます sense ます). L\'acció amb ながら és la secundària; la principal va al final.',
    explanation_en: 'Indicates two actions happening simultaneously. ながら attaches to the verb stem (ます-form without ます). The ながら action is the secondary/background one; the main action comes last.',
    structure: [
      { text: 'V₁ stem', role: 'verb', isSlot: true, label_es: 'acción secundaria (stem)', label_ca: 'acció secundària (stem)', label_en: 'secondary action (stem)' },
      { text: 'ながら', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción principal', label_ca: 'acció principal', label_en: 'main action' },
    ],
    example: [
      { text: '音楽を', furigana: 'おんがくを', role: 'object', gloss_es: 'música', gloss_ca: 'música', gloss_en: 'music' },
      { text: '聴き', furigana: 'きき', role: 'verb', gloss_es: 'escuchando', gloss_ca: 'escoltant', gloss_en: 'listening' },
      { text: 'ながら', role: 'key', gloss_es: 'mientras', gloss_ca: 'mentre', gloss_en: 'while' },
      { text: '勉強します', furigana: 'べんきょうします', role: 'verb', gloss_es: 'estudio', gloss_ca: 'estudio', gloss_en: 'I study' },
    ],
    tip_es: 'El sujeto de ambas acciones debe ser el mismo. No puedes usar ながら si diferentes personas realizan las dos acciones.',
    tip_ca: 'El subjecte de les dues accions ha de ser el mateix. No pots usar ながら si persones diferents realitzen les dues accions.',
    tip_en: 'The subject of both actions must be the same. You cannot use ながら if different people perform the two actions.',
  },
  {
    id: 'mnn1-19-2', lesson: 19, number: 59, jlpt: 'N4',
    pattern: 'V て から',
    name_es: 'Después de hacer ~ / Una vez que ~',
    name_ca: "Després de fer ~ / Un cop que ~",
    name_en: 'After doing ~ / Once ~',
    explanation_es: 'Indica que una segunda acción ocurre después de completar la primera. てから enfatiza la secuencia directa e inmediata. La primera acción debe estar completada antes de la segunda.',
    explanation_ca: 'Indica que una segona acció ocorre després de completar la primera. てから emfatitza la seqüència directa i immediata. La primera acció ha d\'estar completada abans de la segona.',
    explanation_en: 'Indicates a second action occurring after completing the first. てから emphasizes direct, immediate sequence. The first action must be fully completed before the second.',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'primera acción (forma て)', label_ca: 'primera acció (forma て)', label_en: 'first action (te-form)' },
      { text: 'から', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'segunda acción', label_ca: 'segona acció', label_en: 'second action' },
    ],
    example: [
      { text: '手を', furigana: 'てを', role: 'object', gloss_es: 'las manos', gloss_ca: 'les mans', gloss_en: 'hands' },
      { text: '洗って', furigana: 'あらって', role: 'verb', gloss_es: 'lavar', gloss_ca: 'rentar', gloss_en: 'wash' },
      { text: 'から', role: 'key', gloss_es: 'después', gloss_ca: 'després', gloss_en: 'after' },
      { text: '食べます', furigana: 'たべます', role: 'verb', gloss_es: 'como', gloss_ca: 'menjo', gloss_en: 'I eat' },
    ],
    tip_es: 'Diferencia: てから = secuencia obligatoria/inmediata. あとで = en algún momento posterior. "歯を磨いてから寝ます" = primero me lavo los dientes, LUEGO duermo.',
    tip_ca: 'Diferència: てから = seqüència obligatòria/immediata. あとで = en algun moment posterior. "歯を磨いてから寝ます" = primer em rento les dents, LLAVORS dormo.',
    tip_en: 'Difference: てから = obligatory/immediate sequence. あとで = at some later point. "歯を磨いてから寝ます" = I brush teeth first, THEN sleep.',
  },
]

// ─── CHAPTER 20 ───────────────────────────────────────────────────────────────
const ch20: GrammarPoint[] = [
  {
    id: 'mnn1-20-1', lesson: 20, number: 60, jlpt: 'N4',
    pattern: 'もし〜たら、〜',
    name_es: 'Si (hipotético) ~ / En caso de que ~',
    name_ca: 'Si (hipotètic) ~ / En cas que ~',
    name_en: 'If (hypothetical) ~ / In case ~',
    explanation_es: 'La condicional たら expresa "si/cuando se cumple una condición". Se forma añadiendo ら a la forma た. もし (si acaso) se añade al inicio para enfatizar la hipótesis. La consecuencia puede ser deseo, pedido, sugerencia.',
    explanation_ca: 'La condicional たら expressa "si/quan es compleix una condició". Es forma afegint ら a la forma た. もし (si de cas) s\'afegeix al principi per emfatitzar la hipòtesi.',
    explanation_en: 'The たら conditional expresses "if/when a condition is met". Formed by adding ら to the た form. もし (if ever) at the start emphasizes the hypothetical. The result can be a wish, request, or suggestion.',
    structure: [
      { text: 'もし', role: 'conjunction', isSlot: false },
      { text: 'S (た→たら)', role: 'key', isSlot: true, label_es: 'condición (た→たら)', label_ca: 'condició (た→たら)', label_en: 'condition (た→たら)' },
      { text: '、', role: 'particle', isSlot: false },
      { text: 'S₂', role: 'verb', isSlot: true, label_es: 'resultado', label_ca: 'resultat', label_en: 'result' },
    ],
    example: [
      { text: 'もし', role: 'conjunction', gloss_es: 'si', gloss_ca: 'si', gloss_en: 'if' },
      { text: '時間が', furigana: 'じかんが', role: 'subject', gloss_es: 'tiempo', gloss_ca: 'temps', gloss_en: 'time' },
      { text: 'あったら', role: 'key', gloss_es: 'si hubiera', gloss_ca: 'si hagués', gloss_en: 'if there were' },
      { text: '映画を', furigana: 'えいがを', role: 'object', gloss_es: 'una peli', gloss_ca: 'una peli', gloss_en: 'a movie' },
      { text: '見ます', furigana: 'みます', role: 'verb', gloss_es: 'vería', gloss_ca: 'veuria', gloss_en: "I'd watch" },
    ],
    tip_es: 'たら es la condicional más versátil: sirve para hipótesis, condiciones futuras y descubrimientos sorprendentes. "家に帰ったら電話して" = "Cuando llegues a casa, llámame".',
    tip_ca: 'たら és la condicional més versàtil: serveix per a hipòtesis, condicions futures i descobriments sorprenents. "家に帰ったら電話して" = "Quan arribis a casa, truca\'m".',
    tip_en: 'たら is the most versatile conditional: works for hypotheticals, future conditions and surprising discoveries. "家に帰ったら電話して" = "Call me when you get home".',
  },
  {
    id: 'mnn1-20-2', lesson: 20, number: 61, jlpt: 'N4',
    pattern: 'V た あとで / N の あとで',
    name_es: 'Después de ~',
    name_ca: 'Després de ~',
    name_en: 'After ~',
    explanation_es: 'Expresa que una acción ocurre después que otra. Con verbos: forma た + あとで. Con sustantivos: N の + あとで. Énfasis en el momento posterior a completar la primera acción.',
    explanation_ca: 'Expressa que una acció ocorre després d\'una altra. Amb verbs: forma た + あとで. Amb substantius: N の + あとで. Èmfasi en el moment posterior a completar la primera acció.',
    explanation_en: 'Expresses an action that happens after another. With verbs: た form + あとで. With nouns: N の + あとで. Emphasis on the moment after completing the first action.',
    structure: [
      { text: 'V た / N の', role: 'verb', isSlot: true, label_es: 'V (た-form) / N の', label_ca: 'V (た-form) / N の', label_en: 'V (た-form) / N の' },
      { text: 'あとで', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción posterior', label_ca: 'acció posterior', label_en: 'subsequent action' },
    ],
    example: [
      { text: '仕事が', furigana: 'しごとが', role: 'subject', gloss_es: 'el trabajo', gloss_ca: 'la feina', gloss_en: 'work' },
      { text: '終わった', furigana: 'おわった', role: 'verb', gloss_es: 'terminó', gloss_ca: 'va acabar', gloss_en: 'finished' },
      { text: 'あとで', role: 'key', gloss_es: 'después de', gloss_ca: 'després de', gloss_en: 'after' },
      { text: '友達に', furigana: 'ともだちに', role: 'direction', gloss_es: 'a mi amigo', gloss_ca: 'al meu amic', gloss_en: 'to my friend' },
      { text: '電話します', furigana: 'でんわします', role: 'verb', gloss_es: 'llamaré', gloss_ca: 'trucaré', gloss_en: 'will call' },
    ],
    tip_es: 'Clave: てから = secuencia inmediata. あとで = en algún momento posterior. "食べてから行く" vs "食べたあとで行く".',
    tip_ca: 'Clau: てから = seqüència immediata. あとで = en algun moment posterior. "食べてから行く" vs "食べたあとで行く".',
    tip_en: 'Key: てから = immediate sequence. あとで = at some later point. "食べてから行く" vs "食べたあとで行く".',
  },
]

// ─── CHAPTER 21 ───────────────────────────────────────────────────────────────
const ch21: GrammarPoint[] = [
  {
    id: 'mnn1-21-1', lesson: 21, number: 62, jlpt: 'N4',
    pattern: 'V なければ なりません',
    name_es: 'Hay que ~ / Debo ~',
    name_ca: 'Cal ~ / He de ~',
    name_en: 'Must ~ / Have to ~',
    explanation_es: 'Expresa obligación. Se forma con la forma ない del verbo, cambiando ない→なければ + なりません. Coloquial: V なきゃ. También válido: V なければ いけません.',
    explanation_ca: "Expressa obligació. Es forma amb la forma ない del verb, canviant ない→なければ + なりません. Col·loquial: V なきゃ. També vàlid: V なければ いけません.",
    explanation_en: 'Expresses obligation. Formed from the ない form by changing ない→なければ + なりません. Colloquial: V なきゃ. Also valid: V なければ いけません.',
    structure: [
      { text: 'V ない→なければ', role: 'key', isSlot: true, label_es: 'verbo neg. (ない→なければ)', label_ca: 'verb neg. (ない→なければ)', label_en: 'neg. verb (ない→なければ)' },
      { text: 'なりません', role: 'key', isSlot: false },
    ],
    example: [
      { text: '明日', furigana: 'あした', role: 'time', gloss_es: 'mañana', gloss_ca: 'demà', gloss_en: 'tomorrow' },
      { text: '早く', furigana: 'はやく', role: 'adjective', gloss_es: 'pronto', gloss_ca: 'aviat', gloss_en: 'early' },
      { text: '起きなければ', furigana: 'おきなければ', role: 'key', gloss_es: 'si no me levanto', gloss_ca: "si no m'aixeco", gloss_en: "if I don't wake up" },
      { text: 'なりません', role: 'key', gloss_es: 'debo', gloss_ca: 'he de', gloss_en: 'must' },
    ],
    tip_es: 'Literalmente "si no hago X, no vale". La doble negación crea la obligación. Coloquialmente: 起きなきゃ (debes levantarte).',
    tip_ca: "Literalment \"si no faig X, no val\". La doble negació crea l'obligació. Col·loquialment: 起きなきゃ (has d'aixecar-te).",
    tip_en: 'Literally "if I don\'t do X, it won\'t do". The double negative creates obligation. Colloquially: 起きなきゃ.',
  },
  {
    id: 'mnn1-21-2', lesson: 21, number: 63, jlpt: 'N4',
    pattern: 'V なくても いいです',
    name_es: 'No hace falta ~ / No es necesario ~',
    name_ca: 'No cal ~ / No és necessari ~',
    name_en: "Don't have to ~ / No need to ~",
    explanation_es: 'Expresa que algo no es necesario. Forma: V ない→なくて + も いいです. Es la forma de dar permiso de NO hacer algo. Contrasta con なければなりません (obligación).',
    explanation_ca: "Expressa que alguna cosa no és necessària. Forma: V ない→なくて + も いいです. És la forma de donar permís de NO fer alguna cosa. Contrasta amb なければなりません (obligació).",
    explanation_en: 'Expresses that something is not necessary. Form: V ない→なくて + も いいです. This gives permission NOT to do something. Contrasts with なければなりません (obligation).',
    structure: [
      { text: 'V ない→なくて', role: 'verb', isSlot: true, label_es: 'verbo neg. (ない→なくて)', label_ca: 'verb neg. (ない→なくて)', label_en: 'neg. verb (ない→なくて)' },
      { text: 'も', role: 'key', isSlot: false },
      { text: 'いいです', role: 'key', isSlot: false },
    ],
    example: [
      { text: '今日は', furigana: 'きょうは', role: 'time', gloss_es: 'hoy', gloss_ca: 'avui', gloss_en: 'today' },
      { text: '来なくても', furigana: 'こなくても', role: 'key', gloss_es: 'aunque no vengas', gloss_ca: 'tot i que no vinguis', gloss_en: "even if you don't come" },
      { text: 'いいですよ', role: 'key', gloss_es: 'está bien', gloss_ca: 'està bé', gloss_en: "it's OK" },
    ],
    tip_es: 'Escala: なければなりません (debes) → てもいいです (puedes) → なくてもいいです (no es necesario) → てはいけません (no debes).',
    tip_ca: 'Escala: なければなりません (has de) → てもいいです (pots) → なくてもいいです (no cal) → てはいけません (no pots).',
    tip_en: 'Scale: なければなりません (must) → てもいいです (may) → なくてもいいです (don\'t have to) → てはいけません (must not).',
  },
  {
    id: 'mnn1-21-3', lesson: 21, number: 64, jlpt: 'N4',
    pattern: 'V ないで ください',
    name_es: 'Por favor, no hagas ~',
    name_ca: 'Si us plau, no facis ~',
    name_en: "Please don't ~",
    explanation_es: 'Pide a alguien que no realice una acción. Forma: V ないで (forma ない + で) + ください. Es la negación de V て ください (por favor, haz ~).',
    explanation_ca: "Demana a algú que no realitzi una acció. Forma: V ないで (forma ない + で) + ください. És la negació de V て ください (si us plau, fes ~).",
    explanation_en: 'Asks someone not to do something. Form: V ないで (ない form + で) + ください. This is the negative counterpart of V て ください (please do ~).',
    structure: [
      { text: 'V ないで', role: 'key', isSlot: true, label_es: 'verbo (ない + で)', label_ca: 'verb (ない + で)', label_en: 'verb (ない + で)' },
      { text: 'ください', role: 'auxiliary', isSlot: false },
    ],
    example: [
      { text: 'ここで', role: 'location', gloss_es: 'aquí', gloss_ca: 'aquí', gloss_en: 'here' },
      { text: '写真を', furigana: 'しゃしんを', role: 'object', gloss_es: 'fotos', gloss_ca: 'fotos', gloss_en: 'photos' },
      { text: '撮らないで', furigana: 'とらないで', role: 'key', gloss_es: 'no saques', gloss_ca: 'no facis', gloss_en: "don't take" },
      { text: 'ください', role: 'auxiliary', gloss_es: 'por favor', gloss_ca: 'si us plau', gloss_en: 'please' },
    ],
  },
]

// ─── CHAPTER 22 ───────────────────────────────────────────────────────────────
const ch22: GrammarPoint[] = [
  {
    id: 'mnn1-22-1', lesson: 22, number: 65, jlpt: 'N4',
    pattern: 'V 辞書形 まえに / N の まえに',
    name_es: 'Antes de ~',
    name_ca: 'Abans de ~',
    name_en: 'Before ~',
    explanation_es: 'Expresa una acción que ocurre antes que otra. Con verbos: V en forma diccionario (no た) + まえに. Con sustantivos: N の + まえに. El verbo de まえに siempre es forma diccionario, aunque la oración principal sea pasada.',
    explanation_ca: "Expressa una acció que ocorre abans que una altra. Amb verbs: V en forma diccionari (no た) + まえに. Amb substantius: N の + まえに. El verb de まえに sempre és forma diccionari, tot i que l'oració principal sigui passada.",
    explanation_en: 'Expresses an action that happens before another. With verbs: V in dictionary form (not た) + まえに. With nouns: N の + まえに. The まえに verb is ALWAYS in dictionary form, even if the main clause is past.',
    structure: [
      { text: 'V 辞書形 / N の', role: 'verb', isSlot: true, label_es: 'V (diccionario) / N の', label_ca: 'V (diccionari) / N の', label_en: 'V (dictionary) / N の' },
      { text: 'まえに', role: 'key', isSlot: false },
      { text: 'V₂', role: 'verb', isSlot: true, label_es: 'acción principal', label_ca: 'acció principal', label_en: 'main action' },
    ],
    example: [
      { text: '寝る', furigana: 'ねる', role: 'verb', gloss_es: 'dormir', gloss_ca: 'dormir', gloss_en: 'sleep' },
      { text: 'まえに', role: 'key', gloss_es: 'antes de', gloss_ca: 'abans de', gloss_en: 'before' },
      { text: '歯を', furigana: 'はを', role: 'object', gloss_es: 'los dientes', gloss_ca: 'les dents', gloss_en: 'teeth' },
      { text: '磨きます', furigana: 'みがきます', role: 'verb', gloss_es: 'me los lavo', gloss_ca: 'me les rento', gloss_en: 'I brush' },
    ],
    tip_es: 'IMPORTANTE: "食べるまえに手を洗いました" ← まえに siempre diccionario, aunque el resto sea pasado. No uses "食べたまえに".',
    tip_ca: "IMPORTANT: \"食べるまえに手を洗いました\" ← まえに sempre diccionari, tot i que la resta sigui passat. No facis servir \"食べたまえに\".",
    tip_en: 'IMPORTANT: "食べるまえに手を洗いました" ← まえに always dictionary form, even when the rest is past. Don\'t use "食べたまえに".',
  },
  {
    id: 'mnn1-22-2', lesson: 22, number: 66, jlpt: 'N4',
    pattern: 'N が わかります',
    name_es: 'Entender N / Comprender N',
    name_ca: 'Entendre N / Comprendre N',
    name_en: 'Understand N / Comprehend N',
    explanation_es: '「わかります」significa "entender/comprender". La cosa que se entiende va marcada con が, no を. Es un verbo de estado, por lo que no se usa en la forma ています progresiva.',
    explanation_ca: '「わかります」significa "entendre/comprendre". La cosa que s\'entén va marcada amb が, no を. És un verb d\'estat, per la qual cosa no s\'usa en la forma ています progressiva.',
    explanation_en: '「わかります」means "to understand". The thing understood is marked with が, not を. It is a stative verb, so it does not take the progressive ています form.',
    structure: [
      { text: 'N', role: 'subject', isSlot: true, label_es: 'lo que se entiende', label_ca: "el que s'entén", label_en: 'what is understood' },
      { text: 'が', role: 'subject', isSlot: false },
      { text: 'わかります', role: 'verb', isSlot: false },
    ],
    example: [
      { text: '日本語', furigana: 'にほんご', role: 'subject', gloss_es: 'japonés', gloss_ca: 'japonès', gloss_en: 'Japanese' },
      { text: 'が', role: 'subject', gloss_es: 'SUJ', gloss_ca: 'SUBJ', gloss_en: 'SUBJ' },
      { text: 'すこし', role: 'noun', gloss_es: 'un poco', gloss_ca: 'una mica', gloss_en: 'a little' },
      { text: 'わかります', role: 'verb', gloss_es: 'entiendo', gloss_ca: 'entenc', gloss_en: 'understand' },
    ],
    tip_es: 'わかります usa が porque es un verbo de "recepción/estado". Otros iguales: できます, あります, います. Nunca digas 日本語をわかります.',
    tip_ca: 'わかります usa が perquè és un verb de "recepció/estat". Altres iguals: できます, あります, います. Mai diguis 日本語をわかります.',
    tip_en: 'わかります uses が because it is a "reception/state" verb. Same pattern: できます, あります, います. Never say 日本語をわかります.',
  },
]

// ─── CHAPTER 23 ───────────────────────────────────────────────────────────────
const ch23: GrammarPoint[] = [
  {
    id: 'mnn1-23-1', lesson: 23, number: 67, jlpt: 'N4',
    pattern: 'N / adj に なります',
    name_es: 'Convertirse en ~ / Llegar a ser ~',
    name_ca: 'Convertir-se en ~ / Arribar a ser ~',
    name_en: 'Become ~ / Turn into ~',
    explanation_es: 'Expresa un cambio de estado. Con sustantivos: N に なります. Con adjetivos-な: adj に なります. Con adjetivos-い: adj く なります (大きい→大きく). Indica transición hacia un nuevo estado.',
    explanation_ca: "Expressa un canvi d'estat. Amb substantius: N に なります. Amb adjectius-な: adj に なります. Amb adjectius-い: adj く なります (大きい→大きく). Indica transició cap a un nou estat.",
    explanation_en: 'Expresses a change of state. Nouns: N に なります. な-adjectives: adj に なります. い-adjectives: adj く なります (大きい→大きく). Indicates a transition to a new state.',
    structure: [
      { text: 'N / adj', role: 'adjective', isSlot: true, label_es: 'N に / な-adj に / い-adj く', label_ca: 'N に / な-adj に / い-adj く', label_en: 'N に / な-adj に / い-adj く' },
      { text: 'に', role: 'direction', isSlot: false },
      { text: 'なります', role: 'key', isSlot: false },
    ],
    example: [
      { text: '春に', furigana: 'はるに', role: 'time', gloss_es: 'en primavera', gloss_ca: 'a la primavera', gloss_en: 'in spring' },
      { text: 'なると', role: 'conjunction', gloss_es: 'cuando llega', gloss_ca: 'quan arriba', gloss_en: 'when it becomes' },
      { text: '暖かく', furigana: 'あたたかく', role: 'adjective', gloss_es: 'cálido', gloss_ca: 'càlid', gloss_en: 'warm' },
      { text: 'なります', role: 'key', gloss_es: 'se pone', gloss_ca: 'es posa', gloss_en: 'becomes' },
    ],
    tip_es: 'Para adj-い: い→く antes de なります. 大きい→大きく, 寒い→寒く, 上手い→上手く. Para adj-な y N: usa に directamente.',
    tip_ca: 'Per adj-い: い→く abans de なります. 大きい→大きく, 寒い→寒く, 上手い→上手く. Per adj-な i N: usa に directament.',
    tip_en: 'For い-adj: い→く before なります. 大きい→大きく, 寒い→寒く, 上手い→上手く. For な-adj and N: use に directly.',
  },
  {
    id: 'mnn1-23-2', lesson: 23, number: 68, jlpt: 'N4',
    pattern: 'N は N に V られます (pasiva)',
    name_es: 'Voz pasiva: ~ es/fue ~-ado',
    name_ca: 'Veu passiva: ~ és/va ser ~-at',
    name_en: 'Passive voice: ~ is/was ~-ed',
    explanation_es: 'La voz pasiva se usa cuando el sujeto recibe la acción. Formación pasiva — Grupo 1: く→かれる, etc. Grupo 2: る→られる. Irregular: する→される, くる→こられる. El agente va marcado con に.',
    explanation_ca: "La veu passiva s'usa quan el subjecte rep l'acció. Formació passiva — Grup 1: く→かれる, etc. Grup 2: る→られる. Irregular: する→される, くる→こられる. L'agent va marcat amb に.",
    explanation_en: 'The passive is used when the subject receives the action. Formation — Group 1: く→かれる, etc. Group 2: る→られる. Irregular: する→される, くる→こられる. The agent is marked with に.',
    structure: [
      { text: 'N₁', role: 'topic', isSlot: true, label_es: 'receptor (は)', label_ca: 'receptor (は)', label_en: 'receiver (は)' },
      { text: 'は', role: 'topic', isSlot: false },
      { text: 'N₂', role: 'noun', isSlot: true, label_es: 'agente (に)', label_ca: 'agent (に)', label_en: 'agent (に)' },
      { text: 'に', role: 'direction', isSlot: false },
      { text: 'V られます', role: 'key', isSlot: true, label_es: 'verbo (pasiva)', label_ca: 'verb (passiva)', label_en: 'verb (passive)' },
    ],
    example: [
      { text: '私は', furigana: 'わたしは', role: 'topic', gloss_es: 'Yo', gloss_ca: 'Jo', gloss_en: 'I' },
      { text: '先生に', furigana: 'せんせいに', role: 'noun', gloss_es: 'por el profesor', gloss_ca: 'pel professor', gloss_en: 'by the teacher' },
      { text: 'ほめ', role: 'verb', gloss_es: 'alabar', gloss_ca: 'elogiar', gloss_en: 'praise' },
      { text: 'られました', role: 'key', gloss_es: 'fui ~-ado', gloss_ca: 'vaig ser ~-at', gloss_en: 'was ~-ed' },
    ],
    tip_es: 'La pasiva japonesa a menudo implica que la acción afecta negativamente al receptor. "雨に降られました" = "Me pilló la lluvia" (inconveniente para mí).',
    tip_ca: "La passiva japonesa sovint implica que l'acció afecta negativament el receptor. \"雨に降られました\" = \"Em va agafar la pluja\" (inconvenient per a mi).",
    tip_en: 'The Japanese passive often implies the action adversely affects the receiver. "雨に降られました" = "I got rained on" (an inconvenience to me).',
  },
]

// ─── CHAPTER 24 ───────────────────────────────────────────────────────────────
const ch24: GrammarPoint[] = [
  {
    id: 'mnn1-24-1', lesson: 24, number: 69, jlpt: 'N4',
    pattern: 'V させます (causativa)',
    name_es: 'Hacer que alguien haga ~ / Dejar hacer ~',
    name_ca: "Fer que algú faci ~ / Deixar fer ~",
    name_en: 'Make someone do ~ / Let someone do ~',
    explanation_es: 'La forma causativa indica que alguien hace que otra persona realice una acción. Formación — Grupo 1: く→かせる, etc. Grupo 2: る→させる. Irregular: する→させる, くる→こさせる.',
    explanation_ca: "La forma causativa indica que algú fa que una altra persona realitzi una acció. Formació — Grup 1: く→かせる, etc. Grup 2: る→させる. Irregular: する→させる, くる→こさせる.",
    explanation_en: 'The causative form indicates making or letting another person do an action. Formation — Group 1: く→かせる, etc. Group 2: る→させる. Irregular: する→させる, くる→こさせる.',
    structure: [
      { text: 'N₁ は', role: 'topic', isSlot: true, label_es: 'el que manda/permite', label_ca: 'el que mana/permet', label_en: 'the causer' },
      { text: 'N₂ を', role: 'object', isSlot: true, label_es: 'el que hace la acción (を coerción / に voluntad)', label_ca: "el que fa l'acció (を coacció / に voluntat)", label_en: 'the doer (を coercion / に willing)' },
      { text: 'V させます', role: 'key', isSlot: true, label_es: 'verbo (causativa)', label_ca: 'verb (causativa)', label_en: 'verb (causative)' },
    ],
    example: [
      { text: '先生は', furigana: 'せんせいは', role: 'topic', gloss_es: 'el profesor', gloss_ca: 'el professor', gloss_en: 'the teacher' },
      { text: '学生を', furigana: 'がくせいを', role: 'object', gloss_es: 'al estudiante', gloss_ca: "a l'estudiant", gloss_en: 'the student' },
      { text: '発表', furigana: 'はっぴょう', role: 'verb', gloss_es: 'presentar', gloss_ca: 'presentar', gloss_en: 'present' },
      { text: 'させました', role: 'key', gloss_es: 'le hizo', gloss_ca: 'va fer', gloss_en: 'made ... do' },
    ],
    tip_es: 'を → forzado/coerción. に → con cierta voluntad del sujeto. "子供に野菜を食べさせる" (hacer comer) vs "子供に好きな物を食べさせる" (dejar comer).',
    tip_ca: 'を → forçat/coacció. に → amb una mica de voluntat. "子供に野菜を食べさせる" (fer menjar) vs "子供に好きな物を食べさせる" (deixar menjar).',
    tip_en: 'を → coerced. に → some agency. "子供に野菜を食べさせる" (make eat vegetables) vs "子供に好きな物を食べさせる" (let eat what they like).',
  },
  {
    id: 'mnn1-24-2', lesson: 24, number: 70, jlpt: 'N4',
    pattern: 'V させて ください',
    name_es: 'Déjame ~ / Por favor, permíteme ~',
    name_ca: "Deixa'm ~ / Si us plau, permet-me ~",
    name_en: 'Please let me ~ / Allow me to ~',
    explanation_es: 'Pide permiso para hacer algo uno mismo. Forma causativa (させる) en て-form + ください. Es una forma educada de pedir permiso: "Déjame hacer X".',
    explanation_ca: "Demana permís per fer alguna cosa un mateix. Forma causativa (させる) en te-form + ください. És una forma educada de demanar permís: \"Deixa'm fer X\".",
    explanation_en: 'Requests permission to do something oneself. Causative form (させる) in て-form + ください. A polite way to ask permission: "Please let me do X".',
    structure: [
      { text: 'V させて', role: 'key', isSlot: true, label_es: 'verbo (causativa + て)', label_ca: 'verb (causativa + て)', label_en: 'verb (causative + て)' },
      { text: 'ください', role: 'auxiliary', isSlot: false },
    ],
    example: [
      { text: 'すみません、', role: 'noun', gloss_es: 'perdone,', gloss_ca: 'perdoni,', gloss_en: 'excuse me,' },
      { text: 'ちょっと', role: 'noun', gloss_es: 'un poco', gloss_ca: 'una mica', gloss_en: 'a moment' },
      { text: '考えさせて', furigana: 'かんがえさせて', role: 'key', gloss_es: 'déjeme pensar', gloss_ca: "deixi'm pensar", gloss_en: 'let me think' },
      { text: 'ください', role: 'auxiliary', gloss_es: 'por favor', gloss_ca: 'si us plau', gloss_en: 'please' },
    ],
  },
]

// ─── CHAPTER 25 ───────────────────────────────────────────────────────────────
const ch25: GrammarPoint[] = [
  {
    id: 'mnn1-25-1', lesson: 25, number: 71, jlpt: 'N4',
    pattern: 'V よう に なりました',
    name_es: 'Llegar a poder ~ / Ha llegado el punto en que ~',
    name_ca: 'Arribar a poder ~ / Ha arribat el punt en que ~',
    name_en: 'Come to be able to ~ / Have come to ~',
    explanation_es: 'Expresa un cambio gradual o la adquisición de una habilidad/costumbre con el tiempo. V en forma diccionario + ように なりました. Negativo: V ない + ように なりました (llegar a no poder/hacer).',
    explanation_ca: "Expressa un canvi gradual o l'adquisició d'una habilitat/costum amb el temps. V en forma diccionari + ように なりました. Negatiu: V ない + ように なりました (arribar a no poder/fer).",
    explanation_en: 'Expresses a gradual change or the acquisition of an ability/habit over time. V in dictionary form + ように なりました. Negative: V ない + ように なりました (came to stop doing).',
    structure: [
      { text: 'V 辞書形', role: 'verb', isSlot: true, label_es: 'verbo (diccionario)', label_ca: 'verb (diccionari)', label_en: 'verb (dictionary)' },
      { text: 'ように', role: 'key', isSlot: false },
      { text: 'なりました', role: 'key', isSlot: false },
    ],
    example: [
      { text: '日本語で', furigana: 'にほんごで', role: 'location', gloss_es: 'en japonés', gloss_ca: 'en japonès', gloss_en: 'in Japanese' },
      { text: '話せる', furigana: 'はなせる', role: 'verb', gloss_es: 'hablar', gloss_ca: 'parlar', gloss_en: 'speak' },
      { text: 'ように', role: 'key', gloss_es: 'hasta el punto de', gloss_ca: 'fins al punt de', gloss_en: 'to the point of' },
      { text: 'なりました', role: 'key', gloss_es: 'llegué a poder', gloss_ca: 'vaig arribar a poder', gloss_en: 'came to be able to' },
    ],
    tip_es: 'Compara: ことができます (habilidad estática) vs ように なりました (cambio/progreso). "話せるようになりました" = "He llegado a poder hablar" — énfasis en el proceso de aprendizaje.',
    tip_ca: 'Compara: ことができます (habilitat estàtica) vs ように なりました (canvi/progrés). "話せるようになりました" = "He arribat a poder parlar" — èmfasi en el procés d\'aprenentatge.',
    tip_en: 'Compare: ことができます (static ability) vs ように なりました (change/progress). "話せるようになりました" = "I have come to be able to speak" — emphasizes the learning process.',
  },
  {
    id: 'mnn1-25-2', lesson: 25, number: 72, jlpt: 'N4',
    pattern: 'V よう に して います',
    name_es: 'Procuro ~ / Me esfuerzo en ~ (hábito)',
    name_ca: 'Procuro ~ / M\'esforço en ~ (hàbit)',
    name_en: "I try to ~ / I make it a habit to ~",
    explanation_es: 'Expresa el esfuerzo deliberado y continuo de hacer (o no hacer) algo habitualmente. ように します = decisión puntual. ように して います = esfuerzo continuo/hábito en marcha.',
    explanation_ca: "Expressa l'esforç deliberat i continu de fer (o no fer) alguna cosa habitualment. ように します = decisió puntual. ように して います = esforç continu/hàbit en marxa.",
    explanation_en: 'Expresses deliberate, ongoing effort to (not) do something habitually. ように します = one-time decision. ように して います = continuous effort / ongoing habit.',
    structure: [
      { text: 'V 辞書形', role: 'verb', isSlot: true, label_es: 'verbo (diccionario)', label_ca: 'verb (diccionari)', label_en: 'verb (dictionary)' },
      { text: 'ように', role: 'key', isSlot: false },
      { text: 'して います', role: 'key', isSlot: false },
    ],
    example: [
      { text: '毎朝', furigana: 'まいあさ', role: 'time', gloss_es: 'cada mañana', gloss_ca: 'cada matí', gloss_en: 'every morning' },
      { text: '運動する', furigana: 'うんどうする', role: 'verb', gloss_es: 'hacer ejercicio', gloss_ca: 'fer exercici', gloss_en: 'exercise' },
      { text: 'ように', role: 'key', gloss_es: 'para', gloss_ca: 'per', gloss_en: 'so as to' },
      { text: 'して います', role: 'key', gloss_es: 'procuro', gloss_ca: 'procuro', gloss_en: 'I make it a habit' },
    ],
    tip_es: 'Negativo: V ないように して います = "Procuro no ~". "甘いものを食べないようにしています" = "Procuro no comer dulces".',
    tip_ca: 'Negatiu: V ないように して います = "Procuro no ~". "甘いものを食べないようにしています" = "Procuro no menjar dolços".',
    tip_en: 'Negative: V ないように して います = "I try not to ~". "甘いものを食べないようにしています" = "I try not to eat sweets".',
  },
  {
    id: 'mnn1-25-3', lesson: 25, number: 73, jlpt: 'N4',
    pattern: 'V て いただけませんか',
    name_es: '¿Podría ~ (por favor)? (muy formal)',
    name_ca: 'Podria ~ (si us plau)? (molt formal)',
    name_en: 'Could you please ~ ? (very formal)',
    explanation_es: 'Petición muy educada y formal. Más deferente que て ください o て もらえませんか. Te-form + いただけませんか (forma humilde de もらえませんか). Se usa en situaciones formales o favores especiales.',
    explanation_ca: "Petició molt educada i formal. Més deferent que て ください o て もらえませんか. Te-form + いただけませんか (forma humil de もらえませんか). S'usa en situacions formals o favors especials.",
    explanation_en: 'Very polite, formal request. More deferential than て ください or て もらえませんか. Te-form + いただけませんか (humble form of もらえませんか). Used in formal situations or special favors.',
    structure: [
      { text: 'V て', role: 'verb', isSlot: true, label_es: 'verbo (forma て)', label_ca: 'verb (forma て)', label_en: 'verb (te-form)' },
      { text: 'いただけませんか', role: 'key', isSlot: false },
    ],
    example: [
      { text: 'この書類に', furigana: 'このしょるいに', role: 'location', gloss_es: 'en este documento', gloss_ca: 'en aquest document', gloss_en: 'on this document' },
      { text: 'サインして', role: 'verb', gloss_es: 'firmar', gloss_ca: 'signar', gloss_en: 'sign' },
      { text: 'いただけませんか', role: 'key', gloss_es: '¿podría?', gloss_ca: 'podria?', gloss_en: 'could you?' },
    ],
    tip_es: 'Escala de formalidad: てください → てもらえませんか → ていただけませんか (más formal). Usa いただけませんか con superiores o en contextos muy formales.',
    tip_ca: "Escala de formalitat: てください → てもらえませんか → ていただけませんか (més formal). Usa いただけませんか amb superiors o en contextos molt formals.",
    tip_en: 'Formality scale: てください → てもらえませんか → ていただけませんか (most formal). Use いただけませんか with superiors or in very formal contexts.',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Full export
// ─────────────────────────────────────────────────────────────────────────────

export const GRAMMAR_POINTS: GrammarPoint[] = [
  ...ch1,
  ...ch2,
  ...ch3,
  ...ch4,
  ...ch5,
  ...ch6,
  ...ch7,
  ...ch8,
  ...ch9,
  ...ch10,
  ...ch11,
  ...ch12,
  ...ch13,
  ...ch14,
  ...ch15,
  ...ch16,
  ...ch17,
  ...ch18,
  ...ch19,
  ...ch20,
  ...ch21,
  ...ch22,
  ...ch23,
  ...ch24,
  ...ch25,
]

export function getGrammarByJlpt(jlpt: 'N5' | 'N4' | 'all'): GrammarPoint[] {
  if (jlpt === 'all') return GRAMMAR_POINTS
  return GRAMMAR_POINTS.filter(g => g.jlpt === jlpt)
}

export function getGrammarByLesson(lesson: number): GrammarPoint[] {
  return GRAMMAR_POINTS.filter(g => g.lesson === lesson)
}

export function searchGrammar(query: string): GrammarPoint[] {
  const q = query.toLowerCase().trim()
  if (!q) return GRAMMAR_POINTS
  return GRAMMAR_POINTS.filter(g =>
    g.pattern.toLowerCase().includes(q) ||
    g.name_es.toLowerCase().includes(q) ||
    g.name_ca.toLowerCase().includes(q) ||
    g.name_en.toLowerCase().includes(q) ||
    g.explanation_es.toLowerCase().includes(q)
  )
}
