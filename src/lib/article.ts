// Article rendering model.
//
// Turning raw article text into something readable means controlling where lines
// may break. The rule we want: a line may only break at a real space — never
// between a word and the punctuation hugging it. Otherwise a question mark slides
// to the start of the next line, or an opening quote is stranded at the end of
// the previous one.
//
// So we segment text into two kinds of pieces:
//   - space: a run of whitespace — the ONLY place a line is allowed to break.
//   - chunk: a run of non-space characters (a word plus any glued punctuation,
//     e.g. `"Meer`, `uitgeven?`, `bereikt",`). A chunk has no internal space, so
//     it never breaks; its punctuation can't be separated from its word.
//
// Each chunk is further split into tokens so the word cores stay tappable while
// the surrounding punctuation rides along inside the same unbreakable chunk.

// A word starts with a letter and may contain apostrophes / hyphens; anything
// else (punctuation, digits, symbols) is a non-word token.
const TOKEN = /\p{L}[\p{L}'’\-]*|[^\p{L}\s]+/gu

export interface Token {
  text: string
  // True for letter-bearing tokens, which are candidates for click-to-define.
  word: boolean
}

export type Segment =
  | { kind: 'space'; text: string }
  | { kind: 'chunk'; tokens: Token[] }

// Split one non-space chunk into word / non-word tokens.
function tokenizeChunk(chunk: string): Token[] {
  return [...chunk.matchAll(TOKEN)].map((m) => ({
    text: m[0],
    word: /\p{L}/u.test(m[0]),
  }))
}

// Segment a piece of text (a sentence) into break-safe pieces: alternating
// space runs (breakable) and chunks (unbreakable). Every character is kept, so
// the text still renders verbatim.
export function segment(text: string): Segment[] {
  const out: Segment[] = []
  // The capturing split keeps the whitespace runs as their own entries.
  for (const part of text.split(/(\s+)/)) {
    if (!part) continue
    if (/^\s+$/.test(part)) out.push({ kind: 'space', text: part })
    else out.push({ kind: 'chunk', tokens: tokenizeChunk(part) })
  }
  return out
}
