import type { Progress, VocabType, Theme } from '../types'

const STORAGE_KEY = 'dutch-flashcards.progress'
const THEME_KEY = 'dutch-flashcards.theme'
const FONT_KEY = 'dutch-flashcards.fontScale'

// Font scale (multiplier on card text), clamped to a sensible range.
export const FONT_MIN = 0.7
export const FONT_MAX = 1.8
export const FONT_STEP = 0.1

// Progress is keyed per vocab type + topic, so e.g. knowing a noun's English
// meaning is tracked separately from knowing its article.
export function progressKey(type: VocabType, topicId: string): string {
  return `${type}:${topicId}`
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Progress) : {}
  } catch {
    return {}
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage unavailable (private mode, quota) — progress just won't persist.
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Theme: stored choice, falling back to the OS preference on first visit.
export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY)
    if (t === 'light' || t === 'dark') return t
  } catch {
    // ignore
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function saveTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore
  }
}

export function loadFontScale(): number {
  try {
    const n = Number(localStorage.getItem(FONT_KEY))
    if (n >= FONT_MIN && n <= FONT_MAX) return n
  } catch {
    // ignore
  }
  return 1
}

export function saveFontScale(scale: number): void {
  try {
    localStorage.setItem(FONT_KEY, String(scale))
  } catch {
    // ignore
  }
}
