// One row of a CSV. Columns vary by vocab type, so it's a generic record.
export type Entry = Record<string, string>

export type VocabType = 'verb' | 'noun' | 'adj' | 'adv'

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

// Per-card mark, stored in localStorage.
export type Mark = 'known' | 'unknown'
export type Progress = Record<string, Mark>
