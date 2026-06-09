'use client'
import { useEffect, useRef } from 'react'

interface Props {
  kanji: string
}

const HANZI_WRITER_CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer@3.5/dist/hanzi-writer.min.js'
const CHAR_DATA_URL = (char: string) =>
  `https://cdn.jsdelivr.net/npm/hanzi-writer-data@latest/${char}.json`

function isKanji(char: string) {
  const code = char.charCodeAt(0)
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff)
  )
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const el = document.createElement('script')
    el.src = src
    el.onload = () => resolve()
    el.onerror = reject
    document.head.appendChild(el)
  })
}

export default function KanjiStrokeOrder({ kanji }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const kanjiChars = Array.from(kanji).filter(isKanji)

  useEffect(() => {
    const container = containerRef.current
    if (!container || kanjiChars.length === 0) return

    let cancelled = false
    let loopTimer: ReturnType<typeof setTimeout> | null = null

    async function render() {
      await loadScript(HANZI_WRITER_CDN)
      if (cancelled || !container) return

      const HW = (window as any).HanziWriter
      container.innerHTML = ''

      const writers: any[] = []

      for (const char of kanjiChars) {
        const wrap = document.createElement('div')
        wrap.style.display = 'inline-block'
        container.appendChild(wrap)

        const writer = HW.create(wrap, char, {
          width: 90,
          height: 90,
          padding: 8,
          showOutline: true,
          strokeColor: '#334155',
          outlineColor: '#cbd5e1',
          charDataLoader(c: string, onLoad: (d: unknown) => void, onError: () => void) {
            fetch(CHAR_DATA_URL(c))
              .then(r => r.json())
              .then(onLoad)
              .catch(onError)
          },
        })
        writers.push(writer)
      }

      // Animate each character in sequence, then pause and loop forever so the
      // learner can watch the stroke order as many times as they want.
      const animateSequentially = (i: number) => {
        if (cancelled) return
        if (i >= writers.length) {
          loopTimer = setTimeout(() => { if (!cancelled) animateSequentially(0) }, 1400)
          return
        }
        writers[i].animateCharacter({ onComplete: () => animateSequentially(i + 1) })
      }
      animateSequentially(0)
    }

    render()
    return () => { cancelled = true; if (loopTimer) clearTimeout(loopTimer) }
  }, [kanji])

  if (kanjiChars.length === 0) return null

  return (
    <div className="flex justify-center gap-3" ref={containerRef} />
  )
}
