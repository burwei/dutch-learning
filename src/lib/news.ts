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
const TRANSLATIONS = '[TRANSLATIONS]'
const WORDDATA = '[WORDDATA]'

// Strip zero-width junk, collapse whitespace, trim — so a sentence read from
// the DOM keys the same way the pipeline wrote it. Keep in sync with
// translation_lines() in scripts/fetch_daily_news.py.
export function normSentence(s: string): string {
  return s
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// A sentence boundary: sentence-ending punctuation (with any closing quote /
// bracket), then whitespace, where the next sentence opens with a capital,
// quote, or paren. We split *after* the whitespace so an opening quote leads
// the next sentence. Mirrors split_sentences() in fetch_daily_news.py — the two
// must agree so stored translations line up with the sentences we render — and
// won't split inside numbers like "50.000" (no whitespace after the dot).
const SENTENCE_END = /[.!?]["'”’)\]]*\s+(?=["“„'(¿¡A-ZÀ-Þ])/g

// Split one block of text into sentence strings, keeping every character.
export function splitSentences(text: string): string[] {
  const out: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  SENTENCE_END.lastIndex = 0
  while ((m = SENTENCE_END.exec(text))) {
    const end = m.index + m[0].length
    out.push(text.slice(last, end))
    last = end
  }
  if (last < text.length) out.push(text.slice(last))
  return out.filter((s) => s.trim())
}

// Every sentence of the article in document order: title first, then each body
// paragraph. This is the order translations are stored in, and the order we
// render words in (see NewsView), so a translation lines up by index.
function articleSentences(title: string, body: string): string[] {
  return [title, ...body.split(/\n{2,}/)].flatMap(splitSentences)
}

function header(text: string, key: string): string {
  const m = text.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  return m ? m[1].trim() : ''
}

// The article body sits between [ARTICLE] and the next section marker
// ([TRANSLATIONS] if present, else [WORDDATA]).
function articleBody(text: string): string {
  const start = text.indexOf(ARTICLE)
  if (start < 0) return ''
  const from = start + ARTICLE.length
  let end = text.indexOf(TRANSLATIONS, from)
  if (end < 0) end = text.indexOf(WORDDATA, from)
  const to = end >= 0 ? end : text.length
  return text.slice(from, to).trim()
}

// The [TRANSLATIONS] section is English-only — one line per article sentence,
// in document order. The Dutch isn't repeated here (it already lives in
// [ARTICLE]); we recover each Dutch key by splitting the article ourselves.
function translationLines(text: string): string[] {
  const start = text.indexOf(TRANSLATIONS)
  if (start < 0) return []
  const from = start + TRANSLATIONS.length
  const end = text.indexOf(WORDDATA, from)
  const block = text.slice(from, end >= 0 ? end : text.length)
  // Drop the single newline after the marker and any trailing blanks, but keep
  // interior blank lines so the line index stays aligned with the sentences.
  return block.replace(/^\n/, '').replace(/\n+$/, '').split('\n')
}

// Zip the article's sentences (in order) with the English lines to rebuild the
// normalised-Dutch -> English map the rest of the app uses.
function buildTranslations(
  title: string,
  body: string,
  lines: string[],
): Record<string, string> {
  const map: Record<string, string> = {}
  articleSentences(title, body).forEach((sentence, i) => {
    const en = (lines[i] ?? '').trim()
    if (en) map[normSentence(sentence)] = en
  })
  return map
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
  const title = header(text, 'Title')
  const body = articleBody(text)
  return {
    date: header(text, 'Date') || fileDate,
    title,
    reporter: header(text, 'Reporter'),
    source: header(text, 'Source'),
    body,
    index: wordIndex(text),
    translations: buildTranslations(title, body, translationLines(text)),
  }
}

// Newest first.
export function listNews(): NewsDoc[] {
  return Object.entries(files)
    .map(([path, text]) => parse(path, text))
    .sort((a, b) => b.date.localeCompare(a.date))
}

// The set of lemmas (lowercased) taught by a set of finished articles — the
// union of every word in each completed article's index. This is what the
// dynamic "News" vocab level is built from.
export function newsLemmas(docs: NewsDoc[], completedDates: string[]): Set<string> {
  const done = new Set(completedDates)
  const out = new Set<string>()
  for (const doc of docs) {
    if (!done.has(doc.date)) continue
    for (const lemma of Object.values(doc.index)) {
      const k = lemma.trim().toLowerCase()
      if (k) out.add(k)
    }
  }
  return out
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

// English translation for a whole sentence (as read from the DOM), or null when
// the daily file predates translations / the sentence didn't match.
export function translate(doc: NewsDoc, sentence: string): string | null {
  return doc.translations[normSentence(sentence)] ?? null
}
