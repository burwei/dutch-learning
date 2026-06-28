import type { Progress, VocabType } from '../types'

const STORAGE_KEY = 'dutch-flashcards.progress'

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
