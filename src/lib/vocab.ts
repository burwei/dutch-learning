import Papa from 'papaparse'
import type { Entry, VocabType, Topic } from '../types'

// --- Config: one block per vocab type ---------------------------------------
//
// To add words: drop a CSV into vocab/<type>/ (e.g. vocab/verb/my_list.csv).
// All CSVs in a type's folder are merged. Dev server picks up new files on
// reload. Schemas:
//   verb: infinitive,english,present,simple_past,present_perfect
//   noun: dutch,english,article,plural
//   adj : dutch,english
//   adv : dutch,english

interface VocabConfig {
  label: string
  // The Dutch headword for an entry — also the identity used for progress.
  headword: (e: Entry) => string
  topics: Topic[]
}

export const VOCAB_TYPES: VocabType[] = ['verb', 'noun', 'adj', 'adv']

export const VOCAB: Record<VocabType, VocabConfig> = {
  verb: {
    label: 'Verbs',
    headword: (e) => e.infinitive,
    topics: [
      {
        id: 'english',
        label: 'NL → English',
        front: (e) => e.infinitive,
        back: (e) => e.english,
        // Typing flips direction: show English, type the Dutch infinitive.
        typingPrompt: (e) => e.english,
        typingCell: (e) => e.infinitive,
      },
      {
        id: 'simple_past',
        label: 'Simple past',
        front: (e) => e.infinitive,
        back: (e) => e.simple_past,
        typingPrompt: (e) => e.infinitive,
        typingCell: (e) => e.simple_past,
      },
      {
        id: 'present_perfect',
        label: 'Present perfect',
        front: (e) => e.infinitive,
        back: (e) => e.present_perfect,
        typingPrompt: (e) => e.infinitive,
        typingCell: (e) => e.present_perfect,
        isPresentPerfect: true,
      },
    ],
  },

  noun: {
    label: 'Nouns',
    headword: (e) => e.dutch,
    topics: [
      {
        id: 'english',
        label: 'NL → English',
        front: (e) => e.dutch,
        back: (e) => e.english,
        typingPrompt: (e) => e.english,
        typingCell: (e) => e.dutch,
      },
      {
        id: 'article',
        label: 'Article (de/het)',
        front: (e) => e.dutch,
        back: (e) => `${e.article} ${e.dutch}`,
        typingPrompt: (e) => e.dutch,
        typingCell: (e) => e.article,
      },
      {
        id: 'plural',
        label: 'Plural',
        front: (e) => e.dutch,
        back: (e) => e.plural,
        typingPrompt: (e) => e.dutch,
        typingCell: (e) => e.plural,
      },
    ],
  },

  adj: {
    label: 'Adjectives',
    headword: (e) => e.dutch,
    topics: [
      {
        id: 'english',
        label: 'NL → English',
        front: (e) => e.dutch,
        back: (e) => e.english,
        typingPrompt: (e) => e.english,
        typingCell: (e) => e.dutch,
      },
    ],
  },

  adv: {
    label: 'Adverbs',
    headword: (e) => e.dutch,
    topics: [
      {
        id: 'english',
        label: 'NL → English',
        front: (e) => e.dutch,
        back: (e) => e.english,
        typingPrompt: (e) => e.english,
        typingCell: (e) => e.dutch,
      },
    ],
  },
}

// --- Loading ----------------------------------------------------------------

// Bundle every CSV under vocab/ at build time. The path embeds the type folder,
// so we can group files by vocab type. ?raw gives us the file text to parse.
const csvFiles = import.meta.glob('/vocab/**/*.csv', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

function parse(text: string): Entry[] {
  const result = Papa.parse<Entry>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  })
  return result.data
}

// All entries for a vocab type, merged across every CSV in its folder.
export function loadVocab(type: VocabType): Entry[] {
  const entries: Entry[] = []
  for (const [path, text] of Object.entries(csvFiles)) {
    if (path.includes(`/vocab/${type}/`)) entries.push(...parse(text))
  }
  // Drop rows without a headword.
  return entries.filter((e) => VOCAB[type].headword(e)?.trim())
}
