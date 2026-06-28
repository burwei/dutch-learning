import type { Entry, Topic } from '../types'

// Entries usable for a topic: rows whose answer cell is empty are skipped
// (e.g. some verbs have no simple past).
export function relevantEntries(entries: Entry[], topic: Topic): Entry[] {
  return entries.filter((e) => topic.back(e)?.trim() !== '')
}

// Fisher–Yates shuffle (returns a new array).
export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}
