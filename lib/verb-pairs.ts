// Curated transitive (他動詞) / intransitive (自動詞) verb pairs for the
// transitivity game. Each side carries its usual particle: transitive verbs
// take を (direct object), intransitive change-of-state verbs take が (subject).
// Pairs whose intransitive takes a path を (通る, 曲がる, 回る…) are intentionally
// left out to keep the を/が contrast clean for learners.

export interface VerbPairSide {
  w: string   // word (kanji form)
  r: string   // reading (hiragana)
  p: string   // typical particle
}
export interface VerbPair {
  id: string
  meaning_es: string
  meaning_en?: string
  trans: VerbPairSide      // 他動詞 (を)
  intrans: VerbPairSide    // 自動詞 (が)
}

const をが = (tw: string, tr: string, iw: string, ir: string, meaning_es: string, meaning_en?: string): VerbPair => ({
  id: tw,
  meaning_es,
  meaning_en,
  trans:   { w: tw, r: tr, p: 'を' },
  intrans: { w: iw, r: ir, p: 'が' },
})

export const VERB_PAIRS: VerbPair[] = [
  をが('開ける', 'あける', '開く', 'あく', 'abrir(se)', 'to open'),
  をが('閉める', 'しめる', '閉まる', 'しまる', 'cerrar(se)', 'to close'),
  をが('始める', 'はじめる', '始まる', 'はじまる', 'empezar', 'to begin'),
  をが('終える', 'おえる', '終わる', 'おわる', 'terminar', 'to finish'),
  をが('入れる', 'いれる', '入る', 'はいる', 'meter / entrar', 'to put in / enter'),
  をが('出す', 'だす', '出る', 'でる', 'sacar / salir', 'to take out / exit'),
  をが('付ける', 'つける', '付く', 'つく', 'encender / encenderse, pegar(se)', 'to attach / turn on'),
  をが('消す', 'けす', '消える', 'きえる', 'apagar(se), borrar(se)', 'to turn off / disappear'),
  をが('落とす', 'おとす', '落ちる', 'おちる', 'dejar caer / caer', 'to drop / fall'),
  をが('上げる', 'あげる', '上がる', 'あがる', 'subir', 'to raise / rise'),
  をが('下げる', 'さげる', '下がる', 'さがる', 'bajar', 'to lower / drop'),
  をが('集める', 'あつめる', '集まる', 'あつまる', 'reunir(se)', 'to gather'),
  をが('決める', 'きめる', '決まる', 'きまる', 'decidir(se)', 'to decide'),
  をが('変える', 'かえる', '変わる', 'かわる', 'cambiar', 'to change'),
  をが('止める', 'とめる', '止まる', 'とまる', 'parar(se)', 'to stop'),
  をが('続ける', 'つづける', '続く', 'つづく', 'continuar', 'to continue'),
  をが('並べる', 'ならべる', '並ぶ', 'ならぶ', 'alinear(se), poner en fila', 'to line up'),
  をが('割る', 'わる', '割れる', 'われる', 'romper(se), partir(se)', 'to break / split'),
  をが('折る', 'おる', '折れる', 'おれる', 'doblar(se), partir(se)', 'to fold / snap'),
  をが('切る', 'きる', '切れる', 'きれる', 'cortar(se)', 'to cut'),
  をが('売る', 'うる', '売れる', 'うれる', 'vender(se)', 'to sell'),
  をが('見つける', 'みつける', '見つかる', 'みつかる', 'encontrar(se)', 'to find'),
  をが('戻す', 'もどす', '戻る', 'もどる', 'devolver / volver', 'to return'),
  をが('起こす', 'おこす', '起きる', 'おきる', 'despertar / levantarse', 'to wake / get up'),
  をが('育てる', 'そだてる', '育つ', 'そだつ', 'criar(se), cultivar', 'to raise / grow'),
  をが('建てる', 'たてる', '建つ', 'たつ', 'construir(se)', 'to build'),
  をが('残す', 'のこす', '残る', 'のこる', 'dejar / quedar', 'to leave / remain'),
  をが('直す', 'なおす', '直る', 'なおる', 'arreglar(se), reparar(se)', 'to fix'),
  をが('治す', 'なおす', '治る', 'なおる', 'curar(se)', 'to cure / heal'),
  をが('増やす', 'ふやす', '増える', 'ふえる', 'aumentar', 'to increase'),
  をが('減らす', 'へらす', '減る', 'へる', 'reducir / disminuir', 'to decrease'),
  をが('進める', 'すすめる', '進む', 'すすむ', 'avanzar, hacer avanzar', 'to advance'),
  をが('動かす', 'うごかす', '動く', 'うごく', 'mover(se)', 'to move'),
  をが('冷やす', 'ひやす', '冷える', 'ひえる', 'enfriar(se)', 'to cool'),
  をが('温める', 'あたためる', '温まる', 'あたたまる', 'calentar(se)', 'to warm'),
  をが('乾かす', 'かわかす', '乾く', 'かわく', 'secar(se)', 'to dry'),
  をが('汚す', 'よごす', '汚れる', 'よごれる', 'ensuciar(se)', 'to dirty'),
  をが('届ける', 'とどける', '届く', 'とどく', 'entregar / llegar', 'to deliver / reach'),
  をが('助ける', 'たすける', '助かる', 'たすかる', 'salvar(se), ayudar', 'to save / help'),
  をが('倒す', 'たおす', '倒れる', 'たおれる', 'derribar / caerse', 'to knock down / fall'),
  をが('壊す', 'こわす', '壊れる', 'こわれる', 'romper(se), averiar(se)', 'to break'),
  をが('立てる', 'たてる', '立つ', 'たつ', 'poner de pie / ponerse de pie', 'to stand'),
  をが('当てる', 'あてる', '当たる', 'あたる', 'acertar / dar en, golpear', 'to hit / guess'),
  をが('焼く', 'やく', '焼ける', 'やける', 'quemar(se), asar(se)', 'to burn / grill'),
  をが('沸かす', 'わかす', '沸く', 'わく', 'hervir (agua)', 'to boil'),
  をが('流す', 'ながす', '流れる', 'ながれる', 'verter / fluir', 'to pour / flow'),
  をが('破る', 'やぶる', '破れる', 'やぶれる', 'rasgar(se), romper(se)', 'to tear'),
  をが('広げる', 'ひろげる', '広がる', 'ひろがる', 'extender(se), ampliar(se)', 'to spread'),
  をが('重ねる', 'かさねる', '重なる', 'かさなる', 'amontonar(se), superponer(se)', 'to pile up'),
  をが('つなぐ', 'つなぐ', 'つながる', 'つながる', 'conectar(se), unir(se)', 'to connect'),
  をが('かける', 'かける', 'かかる', 'かかる', 'colgar / tardar, costar', 'to hang / take (time)'),
  をが('育てる', 'そだてる', '育つ', 'そだつ', 'criar(se)', 'to raise'),
]

export function getVerbPairById(id: string) {
  return VERB_PAIRS.find(p => p.id === id)
}
