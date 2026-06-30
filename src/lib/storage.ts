import type { Progress, VocabType, Mode, Theme, Level } from '../types'

const STORAGE_KEY = 'dutch-flashcards.progress'
const THEME_KEY = 'dutch-flashcards.theme'
const FONT_KEY = 'dutch-flashcards.fontScale'
const POS_KEY = 'dutch-flashcards.position'
const LEVELS_KEY = 'dutch-flashcards.levels'
const COMPLETED_NEWS_KEY = 'dutch-flashcards.completedNews'

// The synthetic "News" level: not a real CSV you study wholesale, but the set of
// words drawn from the daily-news articles this reader has finished. See loadVocab.
export const NEWS_LEVEL = 'news'

// Font scale (multiplier on card text), clamped to a sensible range.
export const FONT_MIN = 0.7
export const FONT_MAX = 1.8
export const FONT_STEP = 0.1

// Progress is keyed per mode + vocab type + topic, so flashcard and typing
// progress are tracked separately, as is e.g. a noun's English vs its article.
export function progressKey(mode: Mode, type: VocabType, topicId: string): string {
  return `${mode}:${type}:${topicId}`
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

// Current card position, so a reload resumes where you left off. Stored as the
// headword + a signature of the deck context (vocab/topic/filter) so we only
// resume when the same deck is in view.
export function loadPosition(): { sig: string; head: string } | null {
  try {
    const raw = localStorage.getItem(POS_KEY)
    return raw ? (JSON.parse(raw) as { sig: string; head: string }) : null
  } catch {
    return null
  }
}

export function savePosition(sig: string, head: string): void {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify({ sig, head }))
  } catch {
    // ignore
  }
}

// Selected CEFR levels (multi-select). Defaults to the beginner band.
export function loadLevels(): Level[] {
  try {
    const raw = localStorage.getItem(LEVELS_KEY)
    const arr = raw ? (JSON.parse(raw) as Level[]) : null
    if (Array.isArray(arr) && arr.length) return arr
  } catch {
    // ignore
  }
  return ['a0-a2_core']
}

export function saveLevels(levels: Level[]): void {
  try {
    localStorage.setItem(LEVELS_KEY, JSON.stringify(levels))
  } catch {
    // ignore
  }
}

// Dates (YYYY-MM-DD) of daily-news articles the reader has finished (scrolled to
// the end). These drive the dynamic "News" vocab level: only words from articles
// you've actually read show up there.
export function loadCompletedNews(): string[] {
  try {
    const raw = localStorage.getItem(COMPLETED_NEWS_KEY)
    const arr = raw ? (JSON.parse(raw) as string[]) : null
    if (Array.isArray(arr)) return arr.filter((d) => typeof d === 'string')
  } catch {
    // ignore
  }
  return []
}

export function saveCompletedNews(dates: string[]): void {
  try {
    localStorage.setItem(COMPLETED_NEWS_KEY, JSON.stringify(dates))
  } catch {
    // ignore
  }
}

// --- Export / import -------------------------------------------------------
//
// A single portable snapshot of everything that represents a user's progress:
// their known/unknown marks, the news articles they've finished, and the levels
// they study. Theme/font/position are device preferences, not progress, so we
// leave them out. Serialised as compact JSON (a plain text file).

export interface ProgressBundle {
  v: 1
  progress: Progress
  completedNews: string[]
  levels: Level[]
}

export function exportProgress(): string {
  const bundle: ProgressBundle = {
    v: 1,
    progress: loadProgress(),
    completedNews: loadCompletedNews(),
    levels: loadLevels(),
  }
  return JSON.stringify(bundle)
}

// Parse + validate a snapshot and write it over the current progress. Throws on
// anything that isn't a recognisable bundle so the caller can warn the user.
export function importProgress(text: string): ProgressBundle {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('This file is not valid progress data.')
  }
  if (!data || typeof data !== 'object') {
    throw new Error('This file is not valid progress data.')
  }
  const d = data as Record<string, unknown>
  const progress =
    d.progress && typeof d.progress === 'object' ? (d.progress as Progress) : {}
  const completedNews = Array.isArray(d.completedNews)
    ? (d.completedNews as unknown[]).filter((x): x is string => typeof x === 'string')
    : []
  const levels =
    Array.isArray(d.levels) && d.levels.length
      ? (d.levels as unknown[]).filter((x): x is string => typeof x === 'string')
      : ['a0-a2_core']

  saveProgress(progress)
  saveCompletedNews(completedNews)
  saveLevels(levels)
  return { v: 1, progress, completedNews, levels }
}
