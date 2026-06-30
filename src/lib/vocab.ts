import Papa from 'papaparse'
import type { Entry, VocabType, Level, Topic, WordEntry } from '../types'
import { NEWS_LEVEL } from './storage'

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
        label: 'English',
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
        label: 'English',
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
        label: 'English',
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
        label: 'English',
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

// A "level" is just a CSV file: its id is the filename (without .csv), so anyone
// can clone the repo and add vocab/<type>/<level>.csv and it appears as a level.
function levelIdFromPath(path: string): Level {
  return path.split('/').pop()!.replace(/\.csv$/i, '')
}

// Pretty label for a level id: "a0-a2_core" -> "A0-A2 Core", "my_words" -> "My Words".
export function levelLabel(id: Level): string {
  return id
    .split('_')
    .map((t) =>
      /^[a-c]\d/i.test(t) || t.includes('-')
        ? t.toUpperCase()
        : t.charAt(0).toUpperCase() + t.slice(1),
    )
    .join(' ')
}

// Sort known CEFR bands first (and core before full), then anything else.
const BASE_ORDER = ['a0-a2', 'a0', 'a1', 'a2', 'b1', 'b2', 'c1', 'c2']
function levelSortKey(id: Level): [number, number, string] {
  const [base, variant = ''] = id.split('_')
  const b = BASE_ORDER.indexOf(base)
  const v = variant === 'core' ? 0 : variant === 'full' ? 1 : 2
  return [b < 0 ? 99 : b, v, id]
}

// Every level id present across the flashcard vocab folders, sorted, with
// labels. The vocab/other/ folder (function words, names) is dictionary-only —
// it backs click-to-define but is never a studyable level, so skip it here.
export function availableLevels(): { id: Level; label: string }[] {
  const ids = new Set<Level>()
  for (const path of Object.keys(csvFiles)) {
    if (/\/vocab\/(verb|noun|adj|adv)\//.test(path)) ids.add(levelIdFromPath(path))
  }
  return [...ids]
    .sort((a, b) => {
      const ka = levelSortKey(a)
      const kb = levelSortKey(b)
      return ka[0] - kb[0] || ka[1] - kb[1] || ka[2].localeCompare(kb[2])
    })
    .map((id) => ({ id, label: levelLabel(id) }))
}

function parse(text: string): Entry[] {
  const result = Papa.parse<Entry>(text, {
    header: true,
    skipEmptyLines: true,
    transform: (v) => v.trim(),
  })
  return result.data
}

// --- Click-to-define dictionary --------------------------------------------
//
// Every word the news reader can define lives once, in the vocab CSVs: verb/
// noun/adj/adv across all levels (including news.csv) are studyable, while
// vocab/other/*.csv holds function words and names — dictionary-only, not a
// flashcard level. A daily-news file only stores a surface-form -> lemma index;
// the definition is looked up here by lemma.

function emptyEntry(): WordEntry {
  return {
    pos: 'other',
    english: '',
    example: '',
    article: '',
    plural: '',
    present: '',
    simple_past: '',
    present_perfect: '',
  }
}

// lemma (lowercased) -> definition. Built once at load; first definition wins,
// so a curated core entry takes precedence over a later news/other one.
export const newsDictionary: Record<string, WordEntry> = (() => {
  const dict: Record<string, WordEntry> = {}
  const add = (lemma: string, entry: WordEntry) => {
    const key = lemma.trim().toLowerCase()
    if (key && !(key in dict)) dict[key] = entry
  }

  for (const [path, text] of Object.entries(csvFiles)) {
    const m = path.match(/\/vocab\/(verb|noun|adj|adv)\//)
    if (m) {
      const pos = m[1] as WordEntry['pos']
      for (const row of parse(text)) {
        const lemma = (row.infinitive || row.dutch || '').trim()
        if (!lemma) continue
        add(lemma, {
          pos,
          english: row.english || '',
          example: row.example || '',
          article: row.article || '',
          plural: row.plural || '',
          present: row.present || '',
          simple_past: row.simple_past || '',
          present_perfect: row.present_perfect || '',
        })
      }
      continue
    }
    if (path.includes('/vocab/other/')) {
      for (const row of parse(text)) {
        const lemma = (row.dutch || '').trim()
        if (!lemma) continue
        const entry = emptyEntry()
        entry.pos = (row.pos as WordEntry['pos']) || 'other'
        entry.english = row.english || ''
        entry.example = row.example || ''
        add(lemma, entry)
      }
    }
  }

  return dict
})()

// All entries for a vocab type, restricted to the chosen levels and merged
// across every matching CSV in the type's folder. Deduplicated by headword so a
// word that lives in two selected levels shows once.
//
// The "News" level is special: it isn't the whole vocab/<type>/news.csv file but
// only the words that appear in the daily-news articles the reader has finished
// (passed in as `newsLemmas`, lowercased lemmas). It also only contains words
// that are *new* — i.e. not already taught by a core CEFR level — so the reader
// practises the genuinely unfamiliar vocabulary an article introduced, not words
// they'd drill anyway. Such words live in vocab/<type>/news.csv, so we draw the
// News level from there and additionally exclude any lemma present in a core list.
export function loadVocab(
  type: VocabType,
  levels: Level[],
  newsLemmas?: Set<string>,
): Entry[] {
  const headword = VOCAB[type].headword
  const entries: Entry[] = []
  const seen = new Set<string>()
  const push = (e: Entry) => {
    const h = headword(e)?.trim()
    if (!h) return
    const k = h.toLowerCase()
    if (seen.has(k)) return
    seen.add(k)
    entries.push(e)
  }

  // Real CSV levels selected (everything except the synthetic News level).
  for (const [path, text] of Object.entries(csvFiles)) {
    if (!path.includes(`/vocab/${type}/`)) continue
    const id = levelIdFromPath(path)
    if (id === NEWS_LEVEL) continue // handled dynamically below
    if (!levels.includes(id)) continue
    for (const e of parse(text)) push(e)
  }

  // Dynamic News level: new words (only) from articles the reader has finished.
  if (levels.includes(NEWS_LEVEL) && newsLemmas && newsLemmas.size) {
    // Lemmas already covered by a core CEFR level — excluded from News.
    const coreLemmas = new Set<string>()
    for (const [path, text] of Object.entries(csvFiles)) {
      if (!path.includes(`/vocab/${type}/`)) continue
      if (levelIdFromPath(path) === NEWS_LEVEL) continue
      for (const e of parse(text)) {
        const h = headword(e)?.trim()
        if (h) coreLemmas.add(h.toLowerCase())
      }
    }
    for (const [path, text] of Object.entries(csvFiles)) {
      if (!path.includes(`/vocab/${type}/`)) continue
      if (levelIdFromPath(path) !== NEWS_LEVEL) continue // news.csv only
      for (const e of parse(text)) {
        const h = headword(e)?.trim()
        const k = h?.toLowerCase()
        if (k && newsLemmas.has(k) && !coreLemmas.has(k)) push(e)
      }
    }
  }

  return entries
}
