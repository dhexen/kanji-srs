export type Theme = 'light' | 'dark' | 'system'
export const THEME_KEY = 'kanji-srs-theme'

export function getStoredTheme(): Theme {
  try {
    const v = localStorage.getItem(THEME_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

export function setStoredTheme(theme: Theme) {
  try { localStorage.setItem(THEME_KEY, theme) } catch {}
}

export function applyTheme(theme: Theme) {
  const dark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark)
}
