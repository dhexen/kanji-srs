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
// Full export
// ─────────────────────────────────────────────────────────────────────────────

export const GRAMMAR_POINTS: GrammarPoint[] = [
  ...ch1,
  ...ch2,
  ...ch3,
  ...ch4,
  ...ch5,
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
