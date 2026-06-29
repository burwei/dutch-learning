// One row of a CSV. Columns vary by vocab type, so it's a generic record.
export type Entry = Record<string, string>

export type VocabType = 'verb' | 'noun' | 'adj' | 'adv'

// A level id is simply a vocab CSV filename without the extension
// (e.g. "a0-a2_core"). Levels are discovered dynamically from the files.
export type Level = string

// A "topic" is one thing you can drill for a vocab type (e.g. a verb's English
// meaning, or its simple past). Defined per type in lib/vocab.ts.
export interface Topic {
  id: string
  label: string
  // Flashcard front (question) and back (answer).
  front: (e: Entry) => string
  back: (e: Entry) => string
  // Typing mode: the prompt shown and the raw CSV cell to check the input against.
  typingPrompt: (e: Entry) => string
  typingCell: (e: Entry) => string
  // Present-perfect cells accept the participle with or without the auxiliary.
  isPresentPerfect?: boolean
}

export type Mode = 'flashcard' | 'typing'
export type Filter = 'all' | 'unknown'
export type SortMode = 'order' | 'random'
export type Theme = 'light' | 'dark'

// Top-level section of the app: drill vocab, or read the daily news.
export type TopView = 'vocab' | 'news'

// One dictionary entry behind a clickable word. Built from the vocab CSVs and
// the lexicon, shared across all articles. Fields that don't apply to the word's
// type are empty strings.
export interface WordEntry {
  pos: 'verb' | 'noun' | 'adj' | 'adv' | 'other'
  english: string
  example: string
  article: string // nouns: de/het
  plural: string // nouns
  present: string // verbs: ik-form
  simple_past: string // verbs
  present_perfect: string // verbs (with auxiliary)
}

// A parsed daily-news file: the article plus a click-to-define index. `index`
// maps a lowercased surface form (as it appears in the text) to a lemma; the
// definition for that lemma is looked up from the shared dictionary.
export interface NewsDoc {
  date: string // YYYY-MM-DD
  title: string
  reporter: string
  source: string
  body: string
  index: Record<string, string>
}

// Per-card mark, stored in localStorage.
export type Mark = 'known' | 'unknown'
export type Progress = Record<string, Mark>
