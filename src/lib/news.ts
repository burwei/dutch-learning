import type { NewsDoc, WordEntry } from '../types'
import { newsDictionary } from './vocab'

// Bundle every daily-news .txt at build time (same pattern as the vocab CSVs).
// Drop a new daily-news/YYYY-MM-DD.txt in and it appears after a reload.
const files = import.meta.glob('/daily-news/*.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// Section markers — must match scripts/fetch_daily_news.py.
const ARTICLE = '[ARTICLE]'
const WORDDATA = '[WORDDATA]'

function header(text: string, key: string): string {
  const m = text.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}

// The article body sits between [ARTICLE] and the next section marker.
function articleBody(text: string): string {
  const start = text.indexOf(ARTICLE)
  if (start < 0) return ''
  const from = start + ARTICLE.length
  const end = text.indexOf(WORDDATA, from)
  const to = end >= 0 ? end : text.length
  return text.slice(from, to).trim()
}

// The surface-form -> lemma index lives in the single ```json fenced block.
function wordIndex(text: string): Record<string, string> {
  const m = text.match(/```json\s*([\s\S]*?)```/)
  if (!m) return {}
  try {
    return JSON.parse(m[1]).index ?? {}
  } catch {
    return {}
  }
}

function parse(path: string, text: string): NewsDoc {
  const fileDate = path.split('/').pop()!.replace(/\.txt$/i, '')
  return {
    date: header(text, 'Date') || fileDate,
    title: header(text, 'Title'),
    reporter: header(text, 'Reporter'),
    source: header(text, 'Source'),
    body: articleBody(text),
    index: wordIndex(text),
  }
}

// Newest first.
export function listNews(): NewsDoc[] {
  return Object.entries(files)
    .map(([path, text]) => parse(path, text))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// Look up the entry for a single token (the raw word as it appears in the text):
// normalise -> lemma (via the file's index) -> definition (via the shared dict).
export function lookup(
  doc: NewsDoc,
  token: string,
): { lemma: string; entry: WordEntry } | null {
  const key = token.toLowerCase().replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
  if (!key) return null
  const lemma = doc.index[key]
  if (!lemma) return null
  const entry = newsDictionary[lemma.toLowerCase()]
  return entry ? { lemma, entry } : null
}
