// ─────────────────────────────────────────────────────────────────────────────
// Kana data: hiragana + katakana con nemotécnica en español
// ─────────────────────────────────────────────────────────────────────────────

export type KanaScript = 'hiragana' | 'katakana'

export type KanaGroup =
  | 'vowels' | 'k' | 's' | 't' | 'n' | 'h' | 'm' | 'y' | 'r' | 'w' | 'n_particle'
  | 'g' | 'z' | 'd' | 'b' | 'p'

export type KanaChar = {
  kana: string
  romaji: string
  group: KanaGroup
  script: KanaScript
  mnemonic: string  // frase corta
  story: string     // historia completa
  emoji: string
}

export type KanaWord = {
  word: string
  reading: string
  meaning: string
  script: KanaScript
}

export const GROUP_LABELS: Record<KanaGroup, string> = {
  vowels:     'Vocales あ行',
  k:          'Fila K  か行',
  s:          'Fila S  さ行',
  t:          'Fila T  た行',
  n:          'Fila N  な行',
  h:          'Fila H  は行',
  m:          'Fila M  ま行',
  y:          'Fila Y  や行',
  r:          'Fila R  ら行',
  w:          'Fila W  わ行',
  n_particle: 'Nasal   ん',
  g:          'Fila G  が行',
  z:          'Fila Z  ざ行',
  d:          'Fila D  だ行',
  b:          'Fila B  ば行',
  p:          'Fila P  ぱ行',
}

export const BASIC_GROUPS: KanaGroup[] = ['vowels','k','s','t','n','h','m','y','r','w','n_particle']
export const DAKUTEN_GROUPS: KanaGroup[] = ['g','z','d','b','p']

// ─────────────────────────────────────────────────────────────────────────────
// HIRAGANA
// ─────────────────────────────────────────────────────────────────────────────
export const HIRAGANA: KanaChar[] = [
  // ── Vocales ─────────────────────────────────────────────────────────────
  { kana:'あ', romaji:'a',   group:'vowels',     script:'hiragana', emoji:'🙆',
    mnemonic: 'Brazos abiertos diciendo "¡AAH!"',
    story: 'Imagina a una persona con los brazos bien abiertos gritando "¡AAAH!" de sorpresa. La forma del trazo recuerda a alguien saludando con entusiasmo.' },
  { kana:'い', romaji:'i',   group:'vowels',     script:'hiragana', emoji:'🧑‍🤝‍🧑',
    mnemonic: 'Dos amigos diciendo "¡EEE!" para una foto',
    story: 'Dos palitos inclinados, como dos amigos poniéndose hombro con hombro y diciendo "¡EEE!" (el sonido de "i" en español) al sacarles la foto.' },
  { kana:'う', romaji:'u',   group:'vowels',     script:'hiragana', emoji:'🐟',
    mnemonic: 'Un pez asomándose con la boca en "U"',
    story: 'Un pequeño pez que saca la cabeza del agua con la boca en forma de "U", sorprendido. El gorrito del trazo superior es su aleta.' },
  { kana:'え', romaji:'e',   group:'vowels',     script:'hiragana', emoji:'🙋',
    mnemonic: 'Alguien levantando la mano diciendo "¡Eh!"',
    story: 'Una figura con el brazo levantado, como cuando en clase levantas la mano y dices "¡Eh, yo sé!" La barra horizontal es el suelo y el trazo vertical el brazo.' },
  { kana:'お', romaji:'o',   group:'vowels',     script:'hiragana', emoji:'🧘',
    mnemonic: 'Símbolo de meditación ohm "O"',
    story: 'Una figura en posición de meditación con un círculo de energía. Como el sonido "OHMMM" de la meditación. El trazo horizontal y la espiral forman la silueta del meditador.' },

  // ── Fila K ──────────────────────────────────────────────────────────────
  { kana:'か', romaji:'ka',  group:'k',          script:'hiragana', emoji:'⚔️',
    mnemonic: 'KArate con espada y escudo',
    story: 'Un guerrero de KArate con una espada (trazo vertical) y un escudo lateral. Los dos trazos cortos de la derecha son su posición de ataque.' },
  { kana:'き', romaji:'ki',  group:'k',          script:'hiragana', emoji:'🗝️',
    mnemonic: 'Una llave (KEY → KI)',
    story: 'き parece la forma de una llave antigua. La palabra inglesa "key" (llave) te recuerda el sonido "ki". Gira la llave e imagina el sonido "ki-rak".' },
  { kana:'く', romaji:'ku',  group:'k',          script:'hiragana', emoji:'🐦',
    mnemonic: 'El pico afilado de un CUervo',
    story: 'Un ángulo agudo como el pico de un cuervo. La KU (cuervo en onomatopeya) que abre el pico. Simple, un solo trazo en ángulo.' },
  { kana:'け', romaji:'ke',  group:'k',          script:'hiragana', emoji:'🪣',
    mnemonic: 'KEtchup en una botella (forma de F)',
    story: 'Parece una botella de KEtchup de lado: la barra vertical es la botella y los trazos laterales son el cuello y la base.' },
  { kana:'こ', romaji:'ko',  group:'k',          script:'hiragana', emoji:'🚦',
    mnemonic: 'KOntenido entre dos barras paralelas',
    story: 'Dos líneas paralelas como los barrotes de una valla o las líneas de un camino. KO de "confinado" entre dos barras.' },

  // ── Fila S ──────────────────────────────────────────────────────────────
  { kana:'さ', romaji:'sa',  group:'s',          script:'hiragana', emoji:'🕺',
    mnemonic: 'SAmbero bailando con bastón',
    story: 'Un hombre con bastón bailando la SAamba. El trazo superior es el sombrero, el cruce central el cuerpo y el trazo curvo de abajo la pierna en movimiento.' },
  { kana:'し', romaji:'shi', group:'s',          script:'hiragana', emoji:'🪝',
    mnemonic: 'Anzuelo de pesca (SHE is fishing)',
    story: 'Un anzuelo de pesca visto de lado. La curva ganchuda en la parte de abajo es el gancho. SHI-anzuelo: "she" cuelga el anzuelo al agua.' },
  { kana:'す', romaji:'su',  group:'s',          script:'hiragana', emoji:'🐌',
    mnemonic: 'Espiral de caracol SUper',
    story: 'Un caracol en espiral visto desde arriba. SU de "SUper caracol" que gira y gira. El trazo circular termina en una cola colgante.' },
  { kana:'せ', romaji:'se',  group:'s',          script:'hiragana', emoji:'🧳',
    mnemonic: 'SEñor con mochila cruzada',
    story: 'Una persona con una mochila cruzada en el pecho. SEñor paseando con equipaje. Los trazos recuerdan a un símbolo de "persona cargando algo".' },
  { kana:'そ', romaji:'so',  group:'s',          script:'hiragana', emoji:'🌀',
    mnemonic: 'SOmbra de una "Z" suavizada',
    story: 'Como una letra "Z" a la que se le han redondeado las esquinas. SO de "ZOmbra curva". Un trazo superior y uno inferior unidos por una curva.' },

  // ── Fila T ──────────────────────────────────────────────────────────────
  { kana:'た', romaji:'ta',  group:'t',          script:'hiragana', emoji:'🪧',
    mnemonic: 'TAbla de surf con bandera',
    story: 'Una TAabla de surf con una banderita clavada. La cruz del trazo izquierdo es la bandera y el trazo curvo inferior la tabla curvada por la ola.' },
  { kana:'ち', romaji:'chi', group:'t',          script:'hiragana', emoji:'🌶️',
    mnemonic: 'CHIle picante en forma de "5"',
    story: 'Un CHIle picante con la forma del número "5". La curva superior es la punta del chile y el rizo inferior la cola que se enrolla.' },
  { kana:'つ', romaji:'tsu', group:'t',          script:'hiragana', emoji:'🌊',
    mnemonic: 'Ola de TSUnami',
    story: 'Una ola pequeña pero poderosa. TSUnami: el nombre mismo te dice el sonido. La curva baja y sube como una ola que rompe en la orilla.' },
  { kana:'て', romaji:'te',  group:'t',          script:'hiragana', emoji:'✋',
    mnemonic: 'TEléfono / mano extendida (te = mano)',
    story: 'Una mano extendida con los dedos separados. En japonés "te" (手) significa mano, y este hiragana recuerda vagamente a unos dedos. TEléfono que se sostiene con la mano.' },
  { kana:'と', romaji:'to',  group:'t',          script:'hiragana', emoji:'📻',
    mnemonic: 'Aguja de TOcadiscos',
    story: 'El palito vertical es el brazo del TOcadiscos y la pequeña espiral en la punta es la aguja que toca el disco de vinilo. TOcadiscos de los años 70.' },

  // ── Fila N ──────────────────────────────────────────────────────────────
  { kana:'な', romaji:'na',  group:'n',          script:'hiragana', emoji:'🏊',
    mnemonic: 'NAdar con brazadas',
    story: 'Una persona NAadando: los trazos superiores son los brazos y la espiral del centro es el remolino de agua. NAdar, nadar.' },
  { kana:'に', romaji:'ni',  group:'n',          script:'hiragana', emoji:'2️⃣',
    mnemonic: 'NI = 2 en japonés (dos pilares)',
    story: '¡En japonés "ni" (に) significa el número 2! Dos palitos verticales con un puente horizontal, como el número II romano. Fácil: ni = 2.' },
  { kana:'ぬ', romaji:'nu',  group:'n',          script:'hiragana', emoji:'🍜',
    mnemonic: 'NUddles / fideos en espiral',
    story: 'Un bol de NOODLes (fideos). El trazo hace una espiral enrevesada como los fideos ramen. NUddles de noodles con espirales.' },
  { kana:'ね', romaji:'ne',  group:'n',          script:'hiragana', emoji:'😺',
    mnemonic: 'NEko (gato) enroscado durmiendo',
    story: 'Un gato enroscado para dormir. En japonés "neko" (猫) es gato, y "neru" es dormir. NE de NEko, el gato que duerme hecho un ovillo.' },
  { kana:'の', romaji:'no',  group:'n',          script:'hiragana', emoji:'🌀',
    mnemonic: 'NOpe — espiral de tornado',
    story: 'Un espiral simple y elegante, como un tornado pequeño. NO — el giro del tornado te dice "nope, no paso". Trazo único en círculo.' },

  // ── Fila H ──────────────────────────────────────────────────────────────
  { kana:'は', romaji:'ha',  group:'h',          script:'hiragana', emoji:'😄',
    mnemonic: 'HA: carcajada con brazos abiertos',
    story: 'Una persona riéndose a carcajadas: "¡HA HA HA!" con los brazos abiertos. Los trazos superiores son los brazos levantados de alegría.' },
  { kana:'ひ', romaji:'hi',  group:'h',          script:'hiragana', emoji:'😊',
    mnemonic: 'HIee-hee risita suave',
    story: 'La curva de ひ parece una sonrisa tímida: "hee-hee". Una risita suave con los labios curvados. HI de "heehee".' },
  { kana:'ふ', romaji:'fu',  group:'h',          script:'hiragana', emoji:'🗻',
    mnemonic: 'FUji: el monte Fuji nevado',
    story: 'El Monte FUji (富士山) visto desde lejos. Los cuatro trazos de ふ forman la silueta de la montaña con su pico nevado y las nubes a los lados.' },
  { kana:'へ', romaji:'he',  group:'h',          script:'hiragana', emoji:'⛰️',
    mnemonic: 'HE-colina: una montaña simple',
    story: 'Una colina o montaña vista de perfil: un solo trazo que sube y baja en ángulo. HE de "hill" (colina). Comparte forma con el katakana ヘ.' },
  { kana:'ほ', romaji:'ho',  group:'h',          script:'hiragana', emoji:'🎃',
    mnemonic: 'HOho-ho: espantapájaros de Navidad',
    story: 'Un espantapájaros en el campo, como Papá Noel: "¡HO HO HO!" Los trazos forman una figura de palo con brazos extendidos y una espiral.' },

  // ── Fila M ──────────────────────────────────────────────────────────────
  { kana:'ま', romaji:'ma',  group:'m',          script:'hiragana', emoji:'🤱',
    mnemonic: 'MAmá con brazos abiertos',
    story: 'MAamá esperando con los brazos abiertos para dar un abrazo. La barra horizontal es la cintura y los trazos superiores los brazos extendidos con amor.' },
  { kana:'み', romaji:'mi',  group:'m',          script:'hiragana', emoji:'🔲',
    mnemonic: 'MIrar por la reja / celosía',
    story: 'Una celosía o reja de ventana con tramas cruzadas. MI de "MIrar": asomarse entre las barras para espiar lo que pasa fuera.' },
  { kana:'む', romaji:'mu',  group:'m',          script:'hiragana', emoji:'🐄',
    mnemonic: 'MUuu: vaca mugiendo',
    story: 'Una vaca mugiendo "MUUU". La forma curva inferior es el hocico y el trazo superior la cornamenta. MU de "MUUU" (el sonido de la vaca).' },
  { kana:'め', romaji:'me',  group:'m',          script:'hiragana', emoji:'👁️',
    mnemonic: 'ME = ojo en japonés',
    story: '¡En japonés "me" (目) significa ojo! Este hiragana parece un ojo con una ceja y una lágrima. ME de ojo: perfecta nemotécnica integrada en el idioma.' },
  { kana:'も', romaji:'mo',  group:'m',          script:'hiragana', emoji:'🪝',
    mnemonic: 'MO ganchos (more hooks)',
    story: 'Como el hiragana し (anzuelo) pero con MO (más): dos barras encima del anzuelo, como tener más ganchos para pescar. MO de "more" ganchos.' },

  // ── Fila Y ──────────────────────────────────────────────────────────────
  { kana:'や', romaji:'ya',  group:'y',          script:'hiragana', emoji:'🪃',
    mnemonic: 'YA: boomerang que vuelve',
    story: 'Un boomerang lanzado al aire. YA — ¡ya está lanzado! La forma angulosa de や recuerda a un boomerang girando de vuelta.' },
  { kana:'ゆ', romaji:'yu',  group:'y',          script:'hiragana', emoji:'🐟',
    mnemonic: 'YUkata: pez danzando en el festival',
    story: 'Un pez exótico bailando en el festival de verano. YUkata es el kimono de verano que se lleva en los festivales. El pez nada entre los trazos curvos.' },
  { kana:'よ', romaji:'yo',  group:'y',          script:'hiragana', emoji:'🧘',
    mnemonic: 'YOga: postura de meditación',
    story: 'Una figura en postura de YOga sentada en meditación. Los trazos horizontales son las piernas cruzadas y el vertical el torso erguido. YO-ga.' },

  // ── Fila R ──────────────────────────────────────────────────────────────
  { kana:'ら', romaji:'ra',  group:'r',          script:'hiragana', emoji:'🐇',
    mnemonic: 'RAabbit: conejo corriendo',
    story: 'Un conejo (rabbit) corriendo a toda velocidad. RA de rabbit: las orejas largas son los trazos superiores y la curva inferior es el cuerpo saltando.' },
  { kana:'り', romaji:'ri',  group:'r',          script:'hiragana', emoji:'🏛️',
    mnemonic: 'RItual: dos columnas de templo',
    story: 'Dos columnas de un templo japonés, como las que se ven en los torii. RI de "RItual": los pilares del santuario invitan a entrar al ritual.' },
  { kana:'る', romaji:'ru',  group:'r',          script:'hiragana', emoji:'🐚',
    mnemonic: 'RUlo/caracol: espiral con cola',
    story: 'Un caracol visto de perfil con su espiral de concha. RU de "RUlo": el rulo de pelo que se enrolla igual que la concha del caracol.' },
  { kana:'れ', romaji:'re',  group:'r',          script:'hiragana', emoji:'🦎',
    mnemonic: 'REptil con cola larga',
    story: 'Un REptil — lagarto o salamandra — con la cola larga arrastrándose. El trazo curvo final es la cola característica del reptil.' },
  { kana:'ろ', romaji:'ro',  group:'r',          script:'hiragana', emoji:'🪢',
    mnemonic: 'ROpe: lazo de cuerda',
    story: 'Un lazo de ROpe (cuerda) enrollada, como la que usan los vaqueros. El espiral de ろ es la cuerda que se enrolla sobre sí misma. RO-pe.' },

  // ── Fila W ──────────────────────────────────────────────────────────────
  { kana:'わ', romaji:'wa',  group:'w',          script:'hiragana', emoji:'🛁',
    mnemonic: 'WAter: persona en la bañera',
    story: 'Una persona relajada en la bañera (WAter). El trazo vertical es el cuerpo sumergido y la curva el borde de la bañera. WA, que el agua esté caliente.' },
  { kana:'を', romaji:'wo',  group:'w',          script:'hiragana', emoji:'📌',
    mnemonic: 'WO: partícula de objeto directo',
    story: 'を (wo / o) es casi exclusivamente la partícula de objeto directo en japonés. Parece una persona con una curva adicional, "marcada" como objeto de la acción.' },

  // ── ん ──────────────────────────────────────────────────────────────────
  { kana:'ん', romaji:'n',   group:'n_particle', script:'hiragana', emoji:'🐛',
    mnemonic: 'N: gusano torcido que termina muchas palabras',
    story: 'Un gusano curvado que se arrastra solo. ん es el único hiragana que no empieza una sílaba; siempre va al final o en medio, como el gusano solitario que se cuela al final de la palabra.' },

  // ── Dakuten: Fila G ──────────────────────────────────────────────────────
  { kana:'が', romaji:'ga',  group:'g', script:'hiragana', emoji:'💥', mnemonic: 'GA: か + dakuten = sonido voiced', story: 'か (ka) + las dos rayitas (dakuten ゛) = が (ga). El dakuten activa el sonido voiced, como agregar vibración a las cuerdas vocales.' },
  { kana:'ぎ', romaji:'gi',  group:'g', script:'hiragana', emoji:'💥', mnemonic: 'GI: き + dakuten', story: 'き (ki) con dakuten. Igual que ki pero con vibración: gi.' },
  { kana:'ぐ', romaji:'gu',  group:'g', script:'hiragana', emoji:'💥', mnemonic: 'GU: く + dakuten', story: 'く (ku) con dakuten = gu. Como en "GUitarra".' },
  { kana:'げ', romaji:'ge',  group:'g', script:'hiragana', emoji:'💥', mnemonic: 'GE: け + dakuten', story: 'け (ke) con dakuten = ge. Como en "GElatina".' },
  { kana:'ご', romaji:'go',  group:'g', script:'hiragana', emoji:'💥', mnemonic: 'GO: こ + dakuten', story: 'こ (ko) con dakuten = go. ¡Como el juego de mesa GO!' },

  // ── Dakuten: Fila Z ──────────────────────────────────────────────────────
  { kana:'ざ', romaji:'za',  group:'z', script:'hiragana', emoji:'⚡', mnemonic: 'ZA: さ + dakuten', story: 'さ (sa) + dakuten = ざ (za). Como en "ZAmbia".' },
  { kana:'じ', romaji:'ji',  group:'z', script:'hiragana', emoji:'⚡', mnemonic: 'JI: し + dakuten', story: 'し (shi) con dakuten = じ (ji). Como en "Japón".' },
  { kana:'ず', romaji:'zu',  group:'z', script:'hiragana', emoji:'⚡', mnemonic: 'ZU: す + dakuten', story: 'す (su) con dakuten = ず (zu). Como en "ZUmo".' },
  { kana:'ぜ', romaji:'ze',  group:'z', script:'hiragana', emoji:'⚡', mnemonic: 'ZE: せ + dakuten', story: 'せ (se) con dakuten = ぜ (ze). Como en "ZEbra".' },
  { kana:'ぞ', romaji:'zo',  group:'z', script:'hiragana', emoji:'⚡', mnemonic: 'ZO: そ + dakuten', story: 'そ (so) con dakuten = ぞ (zo). Como en "ZOmbies".' },

  // ── Dakuten: Fila D ──────────────────────────────────────────────────────
  { kana:'だ', romaji:'da',  group:'d', script:'hiragana', emoji:'🔊', mnemonic: 'DA: た + dakuten', story: 'た (ta) con dakuten = だ (da). Como en "DAnce".' },
  { kana:'ぢ', romaji:'ji',  group:'d', script:'hiragana', emoji:'🔊', mnemonic: 'DI: ち + dakuten (pronunciado ji)', story: 'ち (chi) con dakuten = ぢ (ji). Se pronuncia igual que じ, es raro.' },
  { kana:'づ', romaji:'zu',  group:'d', script:'hiragana', emoji:'🔊', mnemonic: 'DU: つ + dakuten (pronunciado zu)', story: 'つ (tsu) con dakuten = づ (zu). Se pronuncia igual que ず, poco común.' },
  { kana:'で', romaji:'de',  group:'d', script:'hiragana', emoji:'🔊', mnemonic: 'DE: て + dakuten', story: 'て (te) con dakuten = で (de). Como en "DEporte".' },
  { kana:'ど', romaji:'do',  group:'d', script:'hiragana', emoji:'🔊', mnemonic: 'DO: と + dakuten', story: 'と (to) con dakuten = ど (do). Como en "DOmino".' },

  // ── Dakuten: Fila B ──────────────────────────────────────────────────────
  { kana:'ば', romaji:'ba',  group:'b', script:'hiragana', emoji:'🥁', mnemonic: 'BA: は + dakuten', story: 'は (ha) con dakuten = ば (ba). Como en "BAile".' },
  { kana:'び', romaji:'bi',  group:'b', script:'hiragana', emoji:'🥁', mnemonic: 'BI: ひ + dakuten', story: 'ひ (hi) con dakuten = び (bi). Como en "BIblioteca".' },
  { kana:'ぶ', romaji:'bu',  group:'b', script:'hiragana', emoji:'🥁', mnemonic: 'BU: ふ + dakuten', story: 'ふ (fu) con dakuten = ぶ (bu). Como en "BUzón".' },
  { kana:'べ', romaji:'be',  group:'b', script:'hiragana', emoji:'🥁', mnemonic: 'BE: へ + dakuten', story: 'へ (he) con dakuten = べ (be). Como en "BEso".' },
  { kana:'ぼ', romaji:'bo',  group:'b', script:'hiragana', emoji:'🥁', mnemonic: 'BO: ほ + dakuten', story: 'ほ (ho) con dakuten = ぼ (bo). Como en "BOla".' },

  // ── Handakuten: Fila P ───────────────────────────────────────────────────
  { kana:'ぱ', romaji:'pa',  group:'p', script:'hiragana', emoji:'⭕', mnemonic: 'PA: は + handakuten (circulito)', story: 'は (ha) con handakuten ゜(circulito) = ぱ (pa). El círculo pequeño es como una pompa de jabón. PA de "PAlomita".' },
  { kana:'ぴ', romaji:'pi',  group:'p', script:'hiragana', emoji:'⭕', mnemonic: 'PI: ひ + handakuten', story: 'ひ (hi) con circulito = ぴ (pi). Como en "PIpa".' },
  { kana:'ぷ', romaji:'pu',  group:'p', script:'hiragana', emoji:'⭕', mnemonic: 'PU: ふ + handakuten', story: 'ふ (fu) con circulito = ぷ (pu). Como en "PUlpo".' },
  { kana:'ぺ', romaji:'pe',  group:'p', script:'hiragana', emoji:'⭕', mnemonic: 'PE: へ + handakuten', story: 'へ (he) con circulito = ぺ (pe). Como en "PEineta".' },
  { kana:'ぽ', romaji:'po',  group:'p', script:'hiragana', emoji:'⭕', mnemonic: 'PO: ほ + handakuten', story: 'ほ (ho) con circulito = ぽ (po). Como en "POlo".' },
]

// ─────────────────────────────────────────────────────────────────────────────
// KATAKANA
// ─────────────────────────────────────────────────────────────────────────────
export const KATAKANA: KanaChar[] = [
  // ── Vocales ─────────────────────────────────────────────────────────────
  { kana:'ア', romaji:'a',   group:'vowels',     script:'katakana', emoji:'✈️',
    mnemonic: 'Avión cortando el aire en "A"',
    story: 'ア parece una "A" latina con una pata levantada, como un avión inclinado en pleno despegue. La raya diagonal es el ala y los trazos cortos la cola.' },
  { kana:'イ', romaji:'i',   group:'vowels',     script:'katakana', emoji:'🔢',
    mnemonic: 'II romano — dos líneas rectas',
    story: 'Dos líneas, como los números romanos II. イ (i) de "II" — muy simple y difícil de olvidar. Dos palitos que son el número dos en romano.' },
  { kana:'ウ', romaji:'u',   group:'vowels',     script:'katakana', emoji:'👑',
    mnemonic: 'Corona con punto: "U got crowned"',
    story: 'Una pequeña corona con un único punto central arriba. "U got crowned!" La base curva es la corona y el punto el diamante del centro.' },
  { kana:'エ', romaji:'e',   group:'vowels',     script:'katakana', emoji:'🪜',
    mnemonic: 'Escalera de dos peldaños (H de lado)',
    story: 'Una escalera o una letra "H" tumbada de lado. Dos barras horizontales unidas por una vertical en el centro: la escalera para llegar al "E".' },
  { kana:'オ', romaji:'o',   group:'vowels',     script:'katakana', emoji:'🥋',
    mnemonic: 'Movimiento de karate con raya diagonal',
    story: 'Una "T" con una raya diagonal de golpe de karate. El trazo cruzado es la mano que corta el aire: "¡O-SE!" (kiai de artes marciales).' },

  // ── Fila K ──────────────────────────────────────────────────────────────
  { kana:'カ', romaji:'ka',  group:'k',          script:'katakana', emoji:'🗡️',
    mnemonic: 'KAtana: un cuchillo samurái',
    story: 'カ parece una KAtana corta o un cuchillo samurái. El trazo vertical es la hoja y el trazo diagonal la empuñadura. KA de KAtana.' },
  { kana:'キ', romaji:'ki',  group:'k',          script:'katakana', emoji:'🪁',
    mnemonic: 'KIte (cometa) en forma de cruz con rayas',
    story: 'Una cometa (kite) vista de frente con sus barras cruzadas. KI de KIte: las líneas horizontales son las barras de la estructura de la cometa.' },
  { kana:'ク', romaji:'ku',  group:'k',          script:'katakana', emoji:'👄',
    mnemonic: 'KU: boca abierta en ángulo',
    story: 'Un ángulo que abre la boca, como cuando dices "KUu" con la boca en pico. El ángulo de ク recuerda a unos labios entreabiertos.' },
  { kana:'ケ', romaji:'ke',  group:'k',          script:'katakana', emoji:'🗄️',
    mnemonic: 'KEy on a shelf (estante con llaves)',
    story: 'Un estante de almacén con tres barras: la vertical es el poste y las horizontales los estantes donde guardas las KEys (llaves).' },
  { kana:'コ', romaji:'ko',  group:'k',          script:'katakana', emoji:'📐',
    mnemonic: 'KOrner: escuadra / ángulo recto',
    story: 'Una escuadra o ángulo recto, como la KOrner (esquina) de una habitación. Dos líneas perpendiculares formando la esquina de 90°.' },

  // ── Fila S ──────────────────────────────────────────────────────────────
  { kana:'サ', romaji:'sa',  group:'s',          script:'katakana', emoji:'3️⃣',
    mnemonic: 'SAanta tiene 3 sacos (el 3 con barras)',
    story: 'El número "3" con dos barras cruzadas. SAanta tiene tres sacos de regalos y las dos barras son la cuerda que los ata. SA-nta y sus 3 sacos.' },
  { kana:'シ', romaji:'shi', group:'s',          script:'katakana', emoji:'👁️‍🗨️',
    mnemonic: 'SHE tiene 3 pestañas (tres puntos y raya)',
    story: 'Tres puntitos y una raya diagonal, como tres pestañas en un ojo. "SHE" (ella) tiene tres grandes pestañas. Mira a la diagonal.' },
  { kana:'ス', romaji:'su',  group:'s',          script:'katakana', emoji:'🗡️',
    mnemonic: 'SUper-espada inclinada',
    story: 'Una espada (SUper-sword) inclinada con la punta hacia abajo. El trazo mayor es la hoja y el trazo menor la guarda o el pomo.' },
  { kana:'セ', romaji:'se',  group:'s',          script:'katakana', emoji:'🔧',
    mnemonic: 'SEt-square (escuadra al revés)',
    story: 'Una escuadra de dibujo técnico o una "F" al revés. SE de "SEt square": herramienta de ángulos rectos.' },
  { kana:'ソ', romaji:'so',  group:'s',          script:'katakana', emoji:'🌂',
    mnemonic: 'SOmbrilla en diagonal (dos rayas)',
    story: 'Dos rayas diagonales, como el perfil de una SOmbrilla abierta. El mango es el trazo vertical y la varilla diagonal el travesaño.' },

  // ── Fila T ──────────────────────────────────────────────────────────────
  { kana:'タ', romaji:'ta',  group:'t',          script:'katakana', emoji:'🐟',
    mnemonic: 'TAco con aleta de pez',
    story: 'Un pez visto de perfil con su aleta. TAco de atún con la aleta sobresaliendo. El trazo curvo es el cuerpo y la línea superior la aleta dorsal.' },
  { kana:'チ', romaji:'chi', group:'t',          script:'katakana', emoji:'5️⃣',
    mnemonic: 'CHInco: el número 5 angular',
    story: 'El número "5" dibujado de forma angular y geométrica. CHI de CHInco (cinco): el cinco que marca el compás del ritmo japonés.' },
  { kana:'ツ', romaji:'tsu', group:'t',          script:'katakana', emoji:'🌊',
    mnemonic: 'TSUnami: tres puntos + ola curva',
    story: 'Tres puntitos que caen sobre una curva, como las gotas de agua que preceden al TSUnami. Los tres puntos son las gotitas y la raya la ola.' },
  { kana:'テ', romaji:'te',  group:'t',          script:'katakana', emoji:'📡',
    mnemonic: 'TEléfono: poste de telecomunicaciones',
    story: 'Un poste de TEléfono o telecomunicaciones visto de frente: barra vertical central con brazos horizontales arriba y la línea de tierra abajo.' },
  { kana:'ト', romaji:'to',  group:'t',          script:'katakana', emoji:'🥢',
    mnemonic: 'TOothpick: palito con gancho',
    story: 'Un palillo (toothpick) con un gancho al lado. TO de TOothpick: el palito vertical y el pequeño trazo diagonal son el fósforo listo para encender.' },

  // ── Fila N ──────────────────────────────────────────────────────────────
  { kana:'ナ', romaji:'na',  group:'n',          script:'katakana', emoji:'✝️',
    mnemonic: 'NAil cross: una cruz / clavo',
    story: 'Una cruz simple como un clavo (NAil) clavado en la madera. Dos trazos perpendiculares. NA de NAil (clavo en inglés).' },
  { kana:'ニ', romaji:'ni',  group:'n',          script:'katakana', emoji:'2️⃣',
    mnemonic: 'NI = 2: dos líneas paralelas',
    story: 'Dos líneas horizontales paralelas. NI significa 2 en japonés, y ニ son literalmente dos líneas, ¡el número dos dibujado como dos rayas!' },
  { kana:'ヌ', romaji:'nu',  group:'n',          script:'katakana', emoji:'⚡',
    mnemonic: 'NUdge: una "Z" con rulo abajo',
    story: 'Una "Z" a la que se le ha añadido una curva abajo. NUdge (empujón en inglés): empujas la Z y se le hace un rulo en la base.' },
  { kana:'ネ', romaji:'ne',  group:'n',          script:'katakana', emoji:'🌳',
    mnemonic: 'NEt of roots: árbol con raíces',
    story: 'Un árbol visto de perfil con sus raíces extendidas. NE de "NExo de raíces": la red subterránea que conecta los árboles del bosque.' },
  { kana:'ノ', romaji:'no',  group:'n',          script:'katakana', emoji:'🚫',
    mnemonic: 'NO: una diagonal simple que niega',
    story: 'Una sola raya diagonal, como el tachón que dice "NO". Simple, directo, claro: ノ es un solo trazo que cruza y niega.' },

  // ── Fila H ──────────────────────────────────────────────────────────────
  { kana:'ハ', romaji:'ha',  group:'h',          script:'katakana', emoji:'😂',
    mnemonic: 'HA-ha: dos piernas de risa',
    story: 'Dos piernas abiertas de alguien riéndose a carcajadas (HA HA). Los dos trazos divergentes son las piernas de quien no puede contener la risa.' },
  { kana:'ヒ', romaji:'hi',  group:'h',          script:'katakana', emoji:'🔄',
    mnemonic: 'HIstory: "E" al revés',
    story: 'Una letra "E" girada 180°. HI de "reverse HIstory": la E del pasado al revés nos da el futuro. Gira la E y obtienes ヒ.' },
  { kana:'フ', romaji:'fu',  group:'h',          script:'katakana', emoji:'🪝',
    mnemonic: 'FUhook: gancho de colgar',
    story: 'Un gran gancho de colgar abrigos o pescado. FU de "FUerza del gancho" que aguanta el peso. La curva superior es el gancho y el trazo la barra.' },
  { kana:'ヘ', romaji:'he',  group:'h',          script:'katakana', emoji:'⛰️',
    mnemonic: 'HE-hill: idéntico al hiragana へ',
    story: 'Exactamente igual que el hiragana へ: una colina o montaña. Una de las pocas letras casi idénticas en ambos silabarios. HE de "HEllo hill".' },
  { kana:'ホ', romaji:'ho',  group:'h',          script:'katakana', emoji:'✨',
    mnemonic: 'HOly cross: una cruz con patas',
    story: 'Una cruz con dos patas abiertas abajo, como el símbolo sagrado con base. HO de "HOly cross": la cruz divina plantada en el suelo.' },

  // ── Fila M ──────────────────────────────────────────────────────────────
  { kana:'マ', romaji:'ma',  group:'m',          script:'katakana', emoji:'🪝',
    mnemonic: 'MAc hook: gancho angular de almacén',
    story: 'Un gancho de almacén visto desde arriba, angular y metálico. MA de "MAc hook": el gancho industrial del almacén de mamá.' },
  { kana:'ミ', romaji:'mi',  group:'m',          script:'katakana', emoji:'〰️',
    mnemonic: 'MI = me three lines (tres rayitas)',
    story: 'Tres líneas horizontales cortas. MI de "ME three": yo me llamo MI y tengo tres rayitas de identidad.' },
  { kana:'ム', romaji:'mu',  group:'m',          script:'katakana', emoji:'🔐',
    mnemonic: 'MUu-lock: ojo de cerradura mugiente',
    story: 'Un ojo de cerradura que parece una vaca mugiendo: MUU. La forma de ム recuerda al ojo de la cerradura. "MUUU" — abre la cerradura.' },
  { kana:'メ', romaji:'me',  group:'m',          script:'katakana', emoji:'❌',
    mnemonic: 'ME marks the spot: una X',
    story: 'Una X perfecta. ME de "ME marks the spot": X marca el lugar del tesoro. El tesoro está donde dice ME.' },
  { kana:'モ', romaji:'mo',  group:'m',          script:'katakana', emoji:'📊',
    mnemonic: 'MOre bars: una T con barras extra',
    story: 'Una "T" con barras adicionales arriba. MO de "MOre bars": tienes más barras de cobertura. Una "E" con el palo de arriba más largo.' },

  // ── Fila Y ──────────────────────────────────────────────────────────────
  { kana:'ヤ', romaji:'ya',  group:'y',          script:'katakana', emoji:'✌️',
    mnemonic: 'YA! Victory sign con palo',
    story: 'Un signo de victoria (V) con un palo vertical. YA de "YA! (sí, victoria)". Los dos trazos superiores son los cuernos del triunfo.' },
  { kana:'ユ', romaji:'yu',  group:'y',          script:'katakana', emoji:'🪑',
    mnemonic: 'YUke: U con estante / una silla',
    story: 'Una "U" con una barra horizontal en la parte superior, como un estante o el respaldo de una silla. YU de "YUke" (silla de diseño minimalista).' },
  { kana:'ヨ', romaji:'yo',  group:'y',          script:'katakana', emoji:'🪥',
    mnemonic: 'YO-comb: dientes de peine',
    story: 'Un peine visto de lado con sus dientes hacia la derecha. YO de "YOur comb": los dientes del peine que se clavan en el pelo.' },

  // ── Fila R ──────────────────────────────────────────────────────────────
  { kana:'ラ', romaji:'ra',  group:'r',          script:'katakana', emoji:'🎸',
    mnemonic: 'RAp: F girada tocando guitarra',
    story: 'Una "F" girada o inclinada con actitud de raper. RA de "RAp": el rapero hace el giro con su "F" al revés.' },
  { kana:'リ', romaji:'ri',  group:'r',          script:'katakana', emoji:'🏛️',
    mnemonic: 'RIgid II: dos palitos rígidos y rectos',
    story: 'Dos palitos muy rectos y rígidos, más formales que り (hiragana). RI de "RIgid": como columnas de mármol que no se doblan.' },
  { kana:'ル', romaji:'ru',  group:'r',          script:'katakana', emoji:'📐',
    mnemonic: 'RUler angle: ángulo de regla',
    story: 'Un ángulo en "L" como el de una regla (ruler). RU de "RUler angle": la regla que usas para medir y trazar líneas perfectas.' },
  { kana:'レ', romaji:'re',  group:'r',          script:'katakana', emoji:'🕴️',
    mnemonic: 'RE-L shape: una L elegante',
    story: 'Una "L" mayúscula elegante, casi perfecta. RE de "RE-L shape": recuerda a la L de una madera o tabla en escuadra.' },
  { kana:'ロ', romaji:'ro',  group:'r',          script:'katakana', emoji:'🟦',
    mnemonic: 'ROom: habitación cuadrada (cuadrado)',
    story: 'Un cuadrado perfecto, como el plano de una habitación (room). RO de "ROom": la planta cuadrada de la habitación japonesa.' },

  // ── Fila W ──────────────────────────────────────────────────────────────
  { kana:'ワ', romaji:'wa',  group:'w',          script:'katakana', emoji:'🍷',
    mnemonic: 'WAine glass: una copa elegante',
    story: 'Una copa de vino (wine glass) vista de perfil. WA de "WA-ine glass": la base curva es la copa y el trazo vertical el pie de la copa.' },
  { kana:'ヲ', romaji:'wo',  group:'w',          script:'katakana', emoji:'📌',
    mnemonic: 'WO: copa con línea extra (partícula)',
    story: 'ワ (wa) con una línea horizontal adicional en la parte superior. ヲ solo se usa como partícula de objeto directo en katakana, igual que を en hiragana.' },

  // ── ン ──────────────────────────────────────────────────────────────────
  { kana:'ン', romaji:'n',   group:'n_particle', script:'katakana', emoji:'7️⃣',
    mnemonic: 'N-seven: el 7 con un punto',
    story: 'Un "7" con un punto de acento. ン de "N-seven": el número siete con un punto extra que lo convierte en el nasal final. Diferente de ソ y ツ (cuidado).' },

  // ── Dakuten: Fila G ──────────────────────────────────────────────────────
  { kana:'ガ', romaji:'ga',  group:'g', script:'katakana', emoji:'💥', mnemonic: 'GA: カ + dakuten', story: 'カ (ka) con dakuten ゛= ガ (ga). El sonido voiced de ka.' },
  { kana:'ギ', romaji:'gi',  group:'g', script:'katakana', emoji:'💥', mnemonic: 'GI: キ + dakuten', story: 'キ (ki) con dakuten = ギ (gi). GI de "GIgante".' },
  { kana:'グ', romaji:'gu',  group:'g', script:'katakana', emoji:'💥', mnemonic: 'GU: ク + dakuten', story: 'ク (ku) con dakuten = グ (gu). GU de "GUrú".' },
  { kana:'ゲ', romaji:'ge',  group:'g', script:'katakana', emoji:'💥', mnemonic: 'GE: ケ + dakuten', story: 'ケ (ke) con dakuten = ゲ (ge). GE de "GElatina".' },
  { kana:'ゴ', romaji:'go',  group:'g', script:'katakana', emoji:'💥', mnemonic: 'GO: コ + dakuten', story: 'コ (ko) con dakuten = ゴ (go). ¡GO!' },

  // ── Dakuten: Fila Z ──────────────────────────────────────────────────────
  { kana:'ザ', romaji:'za',  group:'z', script:'katakana', emoji:'⚡', mnemonic: 'ZA: サ + dakuten', story: 'サ (sa) con dakuten = ザ (za). ZA de "ZAmbia".' },
  { kana:'ジ', romaji:'ji',  group:'z', script:'katakana', emoji:'⚡', mnemonic: 'JI: シ + dakuten', story: 'シ (shi) con dakuten = ジ (ji). JI de "Japón".' },
  { kana:'ズ', romaji:'zu',  group:'z', script:'katakana', emoji:'⚡', mnemonic: 'ZU: ス + dakuten', story: 'ス (su) con dakuten = ズ (zu). ZU de "ZUmo".' },
  { kana:'ゼ', romaji:'ze',  group:'z', script:'katakana', emoji:'⚡', mnemonic: 'ZE: セ + dakuten', story: 'セ (se) con dakuten = ゼ (ze). ZE de "ZEbra".' },
  { kana:'ゾ', romaji:'zo',  group:'z', script:'katakana', emoji:'⚡', mnemonic: 'ZO: ソ + dakuten', story: 'ソ (so) con dakuten = ゾ (zo). ZO de "ZOmbies".' },

  // ── Dakuten: Fila D ──────────────────────────────────────────────────────
  { kana:'ダ', romaji:'da',  group:'d', script:'katakana', emoji:'🔊', mnemonic: 'DA: タ + dakuten', story: 'タ (ta) con dakuten = ダ (da). DA de "DAnce".' },
  { kana:'ヂ', romaji:'ji',  group:'d', script:'katakana', emoji:'🔊', mnemonic: 'DI: チ + dakuten (ji)', story: 'チ (chi) con dakuten = ヂ (ji). Raro, pronunciado ji.' },
  { kana:'ヅ', romaji:'zu',  group:'d', script:'katakana', emoji:'🔊', mnemonic: 'DU: ツ + dakuten (zu)', story: 'ツ (tsu) con dakuten = ヅ (zu). Raro, pronunciado zu.' },
  { kana:'デ', romaji:'de',  group:'d', script:'katakana', emoji:'🔊', mnemonic: 'DE: テ + dakuten', story: 'テ (te) con dakuten = デ (de). DE de "DEporte".' },
  { kana:'ド', romaji:'do',  group:'d', script:'katakana', emoji:'🔊', mnemonic: 'DO: ト + dakuten', story: 'ト (to) con dakuten = ド (do). DO de "DOmino".' },

  // ── Dakuten: Fila B ──────────────────────────────────────────────────────
  { kana:'バ', romaji:'ba',  group:'b', script:'katakana', emoji:'🥁', mnemonic: 'BA: ハ + dakuten', story: 'ハ (ha) con dakuten = バ (ba). BA de "BAile".' },
  { kana:'ビ', romaji:'bi',  group:'b', script:'katakana', emoji:'🥁', mnemonic: 'BI: ヒ + dakuten', story: 'ヒ (hi) con dakuten = ビ (bi). BI de "BIcicle".' },
  { kana:'ブ', romaji:'bu',  group:'b', script:'katakana', emoji:'🥁', mnemonic: 'BU: フ + dakuten', story: 'フ (fu) con dakuten = ブ (bu). BU de "BUrro".' },
  { kana:'ベ', romaji:'be',  group:'b', script:'katakana', emoji:'🥁', mnemonic: 'BE: ヘ + dakuten', story: 'ヘ (he) con dakuten = ベ (be). BE de "BEso".' },
  { kana:'ボ', romaji:'bo',  group:'b', script:'katakana', emoji:'🥁', mnemonic: 'BO: ホ + dakuten', story: 'ホ (ho) con dakuten = ボ (bo). BO de "BOla".' },

  // ── Handakuten: Fila P ───────────────────────────────────────────────────
  { kana:'パ', romaji:'pa',  group:'p', script:'katakana', emoji:'⭕', mnemonic: 'PA: ハ + handakuten', story: 'ハ (ha) con circulito ゜= パ (pa). PA de "PAlomitas".' },
  { kana:'ピ', romaji:'pi',  group:'p', script:'katakana', emoji:'⭕', mnemonic: 'PI: ヒ + handakuten', story: 'ヒ (hi) con circulito = ピ (pi). PI de "PIano".' },
  { kana:'プ', romaji:'pu',  group:'p', script:'katakana', emoji:'⭕', mnemonic: 'PU: フ + handakuten', story: 'フ (fu) con circulito = プ (pu). PU de "PUlpo".' },
  { kana:'ペ', romaji:'pe',  group:'p', script:'katakana', emoji:'⭕', mnemonic: 'PE: ヘ + handakuten', story: 'ヘ (he) con circulito = ペ (pe). PE de "PEineta".' },
  { kana:'ポ', romaji:'po',  group:'p', script:'katakana', emoji:'⭕', mnemonic: 'PO: ホ + handakuten', story: 'ホ (ho) con circulito = ポ (po). PO de "POlo".' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Palabras simples en kana para el modo "reconocimiento de palabras"
// ─────────────────────────────────────────────────────────────────────────────
export const HIRAGANA_WORDS: KanaWord[] = [
  { word:'あめ',    reading:'ame',      meaning:'lluvia / caramelo',   script:'hiragana' },
  { word:'いぬ',    reading:'inu',      meaning:'perro',               script:'hiragana' },
  { word:'うみ',    reading:'umi',      meaning:'mar',                 script:'hiragana' },
  { word:'えき',    reading:'eki',      meaning:'estación (tren)',     script:'hiragana' },
  { word:'おかあさん', reading:'okaasan', meaning:'madre',             script:'hiragana' },
  { word:'かお',    reading:'kao',      meaning:'cara / rostro',       script:'hiragana' },
  { word:'きもの',  reading:'kimono',   meaning:'kimono',              script:'hiragana' },
  { word:'くも',    reading:'kumo',     meaning:'nube / araña',        script:'hiragana' },
  { word:'こえ',    reading:'koe',      meaning:'voz',                 script:'hiragana' },
  { word:'さかな',  reading:'sakana',   meaning:'pez',                 script:'hiragana' },
  { word:'しろ',    reading:'shiro',    meaning:'blanco / castillo',   script:'hiragana' },
  { word:'すし',    reading:'sushi',    meaning:'sushi',               script:'hiragana' },
  { word:'そら',    reading:'sora',     meaning:'cielo',               script:'hiragana' },
  { word:'つき',    reading:'tsuki',    meaning:'luna',                script:'hiragana' },
  { word:'てがみ',  reading:'tegami',   meaning:'carta (correo)',      script:'hiragana' },
  { word:'とり',    reading:'tori',     meaning:'pájaro',              script:'hiragana' },
  { word:'なまえ',  reading:'namae',    meaning:'nombre',              script:'hiragana' },
  { word:'にわ',    reading:'niwa',     meaning:'jardín',              script:'hiragana' },
  { word:'ねこ',    reading:'neko',     meaning:'gato',                script:'hiragana' },
  { word:'はな',    reading:'hana',     meaning:'flor / nariz',        script:'hiragana' },
  { word:'ひと',    reading:'hito',     meaning:'persona',             script:'hiragana' },
  { word:'ほし',    reading:'hoshi',    meaning:'estrella',            script:'hiragana' },
  { word:'まち',    reading:'machi',    meaning:'ciudad / pueblo',     script:'hiragana' },
  { word:'みず',    reading:'mizu',     meaning:'agua',                script:'hiragana' },
  { word:'めがね',  reading:'megane',   meaning:'gafas',               script:'hiragana' },
  { word:'もり',    reading:'mori',     meaning:'bosque',              script:'hiragana' },
  { word:'やま',    reading:'yama',     meaning:'montaña',             script:'hiragana' },
  { word:'ゆき',    reading:'yuki',     meaning:'nieve',               script:'hiragana' },
  { word:'よる',    reading:'yoru',     meaning:'noche',               script:'hiragana' },
  { word:'りんご',  reading:'ringo',    meaning:'manzana',             script:'hiragana' },
  { word:'わたし',  reading:'watashi',  meaning:'yo (pronombre)',      script:'hiragana' },
  { word:'くつ',    reading:'kutsu',    meaning:'zapato',              script:'hiragana' },
  { word:'せかい',  reading:'sekai',    meaning:'mundo',               script:'hiragana' },
  { word:'たべる',  reading:'taberu',   meaning:'comer',               script:'hiragana' },
  { word:'ふゆ',    reading:'fuyu',     meaning:'invierno',            script:'hiragana' },
  { word:'へや',    reading:'heya',     meaning:'habitación',          script:'hiragana' },
  { word:'むかし',  reading:'mukashi',  meaning:'hace mucho tiempo',   script:'hiragana' },
  { word:'のみもの', reading:'nomimono', meaning:'bebida',             script:'hiragana' },
  { word:'るす',    reading:'rusu',     meaning:'ausencia / fuera de casa', script:'hiragana' },
  { word:'ろうか',  reading:'rouka',    meaning:'pasillo',             script:'hiragana' },
]

export const KATAKANA_WORDS: KanaWord[] = [
  { word:'アイス',    reading:'aisu',     meaning:'helado',              script:'katakana' },
  { word:'イタリア',  reading:'itaria',   meaning:'Italia',              script:'katakana' },
  { word:'ウイスキー', reading:'uisukii',  meaning:'whisky',              script:'katakana' },
  { word:'エレベーター', reading:'erebeetaa', meaning:'ascensor',         script:'katakana' },
  { word:'オレンジ',  reading:'orenji',   meaning:'naranja',             script:'katakana' },
  { word:'コーヒー',  reading:'koohii',   meaning:'café',                script:'katakana' },
  { word:'テレビ',    reading:'terebi',   meaning:'televisión',          script:'katakana' },
  { word:'パン',      reading:'pan',      meaning:'pan',                 script:'katakana' },
  { word:'ラーメン',  reading:'raamen',   meaning:'ramen (fideos)',       script:'katakana' },
  { word:'スマホ',    reading:'sumaho',   meaning:'smartphone',          script:'katakana' },
  { word:'ケーキ',    reading:'keeki',    meaning:'pastel / tarta',      script:'katakana' },
  { word:'ピアノ',    reading:'piano',    meaning:'piano',               script:'katakana' },
  { word:'サッカー',  reading:'sakkaa',   meaning:'fútbol',              script:'katakana' },
  { word:'ロボット',  reading:'robotto',  meaning:'robot',               script:'katakana' },
  { word:'バナナ',    reading:'banana',   meaning:'plátano',             script:'katakana' },
  { word:'カメラ',    reading:'kamera',   meaning:'cámara',              script:'katakana' },
  { word:'ギター',    reading:'gitaa',    meaning:'guitarra',            script:'katakana' },
  { word:'スポーツ',  reading:'supootsu', meaning:'deporte',             script:'katakana' },
  { word:'ホテル',    reading:'hoteru',   meaning:'hotel',               script:'katakana' },
  { word:'ミルク',    reading:'miruku',   meaning:'leche',               script:'katakana' },
  { word:'ノート',    reading:'nooto',    meaning:'cuaderno',            script:'katakana' },
  { word:'ベッド',    reading:'beddo',    meaning:'cama',                script:'katakana' },
  { word:'マンガ',    reading:'manga',    meaning:'manga (cómic)',       script:'katakana' },
  { word:'タクシー',  reading:'takushii', meaning:'taxi',                script:'katakana' },
  { word:'アニメ',    reading:'anime',    meaning:'anime',               script:'katakana' },
  { word:'バス',      reading:'basu',     meaning:'autobús',             script:'katakana' },
  { word:'チョコ',    reading:'choko',    meaning:'chocolate',           script:'katakana' },
  { word:'フランス',  reading:'furansu',  meaning:'Francia',             script:'katakana' },
  { word:'ジュース',  reading:'juusu',    meaning:'zumo / jugo',         script:'katakana' },
  { word:'ポテト',    reading:'poteto',   meaning:'patata / papa',       script:'katakana' },
  { word:'レストラン', reading:'resutoran', meaning:'restaurante',       script:'katakana' },
  { word:'ワイン',    reading:'wain',     meaning:'vino',                script:'katakana' },
  { word:'エアコン',  reading:'eakon',    meaning:'aire acondicionado',  script:'katakana' },
  { word:'ドア',      reading:'doa',      meaning:'puerta',              script:'katakana' },
  { word:'ゲーム',    reading:'geemu',    meaning:'juego (videojuego)',  script:'katakana' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getAllKana(script: KanaScript): KanaChar[] {
  return script === 'hiragana' ? HIRAGANA : KATAKANA
}

export function getKanaByGroup(script: KanaScript, groups: KanaGroup[]): KanaChar[] {
  return getAllKana(script).filter(k => groups.includes(k.group))
}

export function getWords(script: KanaScript): KanaWord[] {
  return script === 'hiragana' ? HIRAGANA_WORDS : KATAKANA_WORDS
}

/** Romaji variants accepted as correct (e.g. 'shi' and 'si' are both valid) */
export function isCorrectRomaji(input: string, correct: string): boolean {
  const norm = (s: string) => s.trim().toLowerCase()
    .replace(/oo/g, 'ō').replace(/uu/g, 'ū')  // allow long vowel marks
  const aliases: Record<string, string[]> = {
    'shi': ['si'],
    'chi': ['ti', 'tchi'],
    'tsu': ['tu'],
    'ji':  ['zi', 'di'],
    'zu':  ['du'],
    'fu':  ['hu'],
    'sha': ['sya'],
    'shu': ['syu'],
    'sho': ['syo'],
    'cha': ['tya'],
    'chu': ['tyu'],
    'cho': ['tyo'],
    'ja':  ['zya','dya'],
    'ju':  ['zyu','dyu'],
    'jo':  ['zyo','dyo'],
  }
  const n = norm(input)
  const c = norm(correct)
  if (n === c) return true
  const alts = aliases[c] ?? []
  return alts.includes(n)
}

/** Order used in the gojuuon table */
export const GOJUUON_ORDER: Array<{ group: KanaGroup; label: string }> = [
  { group: 'vowels', label: 'あ行' },
  { group: 'k',      label: 'か行' },
  { group: 's',      label: 'さ行' },
  { group: 't',      label: 'た行' },
  { group: 'n',      label: 'な行' },
  { group: 'h',      label: 'は行' },
  { group: 'm',      label: 'ま行' },
  { group: 'y',      label: 'や行' },
  { group: 'r',      label: 'ら行' },
  { group: 'w',      label: 'わ行' },
  { group: 'n_particle', label: 'ん' },
]

export const DAKUTEN_ORDER: Array<{ group: KanaGroup; label: string }> = [
  { group: 'g', label: 'が行' },
  { group: 'z', label: 'ざ行' },
  { group: 'd', label: 'だ行' },
  { group: 'b', label: 'ば行' },
  { group: 'p', label: 'ぱ行' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Stroke-order animation (Wikimedia Commons, public domain)
// Uses Special:FilePath which redirects to the actual file without needing the
// internal MD5 hash path. If the file doesn't exist, the <img> onError hides it.
// ─────────────────────────────────────────────────────────────────────────────
export function strokeOrderUrl(kana: KanaChar): string {
  const prefix = kana.script === 'hiragana' ? 'Hiragana' : 'Katakana'
  // Wikimedia has no separate stroke animation for dakuten/handakuten, but the
  // stroke order is the base kana (か for が) plus the diacritic marks.
  // Unicode trick: dakuten = base + 1, handakuten = base + 2.
  let glyph = kana.kana
  if (DAKUTEN_GROUPS.includes(kana.group)) {
    const offset = kana.group === 'p' ? 2 : 1
    glyph = String.fromCharCode(kana.kana.charCodeAt(0) - offset)
  }
  const file = `${prefix}_${glyph}_stroke_order_animation.gif`
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Romaji normalisation — used to compare answers tolerantly.
// Collapses long-vowel marks (ō→oo, ī→ii…) and strips spaces/case so that
// コーヒー (koohii) and コオヒイ (koohii) compare equal.
// ─────────────────────────────────────────────────────────────────────────────
export function normalizeRomaji(s: string): string {
  return s.trim().toLowerCase()
    .replace(/ā/g, 'aa').replace(/ī/g, 'ii').replace(/ū/g, 'uu')
    .replace(/ē/g, 'ee').replace(/ō/g, 'oo')
    .replace(/\s+/g, '')
    // common alias normalisation so "si"/"shi" etc. compare equal
    .replace(/shi/g, 'si').replace(/chi/g, 'ti').replace(/tsu/g, 'tu')
    .replace(/fu/g, 'hu')
    .replace(/sha/g, 'sya').replace(/shu/g, 'syu').replace(/sho/g, 'syo')
    .replace(/cha/g, 'tya').replace(/chu/g, 'tyu').replace(/cho/g, 'tyo')
    .replace(/ja/g, 'zya').replace(/ju/g, 'zyu').replace(/jo/g, 'zyo')
    .replace(/ji/g, 'zi').replace(/zu/g, 'du')  // note: applied after tsu→tu
}

// ─────────────────────────────────────────────────────────────────────────────
// Test items: a unified pool of "syllables" + "words" used by the kana tests.
// Each item has a Japanese form (kana) and its romaji reading.
// ─────────────────────────────────────────────────────────────────────────────
export type KanaTestItem = {
  kana: string      // Japanese form (e.g. が, つくえ, コーヒー)
  romaji: string    // reading (e.g. ga, tsukue, koohii)
  kind: 'syllable' | 'word'
}

/** Build the syllable pool for a script (includes dakuten/handakuten). */
export function getSyllableItems(script: KanaScript): KanaTestItem[] {
  return getAllKana(script).map(k => ({ kana: k.kana, romaji: k.romaji, kind: 'syllable' as const }))
}

/** Build the word pool for a script. */
export function getWordItems(script: KanaScript): KanaTestItem[] {
  return getWords(script).map(w => ({ kana: w.word, romaji: w.reading, kind: 'word' as const }))
}
