// Answer-checking and hint helpers for typing mode.

// Strip diacritics (ë→e, ï→i, é→e, …) so the user never has to type accents.
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Canonicalize for comparison: lowercase, no accents, trimmed, single spaces.
export function normalize(s: string): string {
  return stripDiacritics(s.toLowerCase()).trim().replace(/\s+/g, ' ')
}

// Expand one CSV cell into every acceptable spelling.
//
// A cell may contain space-separated words, and any word may hold "/"-separated
// alternatives. We take the cartesian product of those per-word choices, e.g.
//   "heb/is aangeboden" -> ["heb aangeboden", "is aangeboden"]
//   "woei/waaide"       -> ["woei", "waaide"]
//
// For present perfect we also accept the form without its leading auxiliary
// (heb/ben/is/…), so "heb/ben gelopen" also accepts "gelopen".
export function acceptableAnswers(cell: string, isPresentPerfect = false): string[] {
  const words = cell.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  // Cartesian product across each word's "/"-alternatives.
  let combos: string[] = ['']
  for (const word of words) {
    const options = word.split('/').filter(Boolean)
    const next: string[] = []
    for (const prefix of combos) {
      for (const opt of options) {
        next.push(prefix ? `${prefix} ${opt}` : opt)
      }
    }
    combos = next
  }

  if (isPresentPerfect) {
    // Also accept the participle alone (drop the auxiliary first word).
    for (const combo of [...combos]) {
      const parts = combo.split(' ')
      if (parts.length > 1) combos.push(parts.slice(1).join(' '))
    }
  }

  // De-duplicate on the normalized form.
  const seen = new Set<string>()
  const result: string[] = []
  for (const combo of combos) {
    const key = normalize(combo)
    if (key && !seen.has(key)) {
      seen.add(key)
      result.push(combo)
    }
  }
  return result
}

// Is the typed answer correct for this cell?
export function isCorrect(input: string, cell: string, isPresentPerfect = false): boolean {
  const target = normalize(input)
  if (!target) return false
  return acceptableAnswers(cell, isPresentPerfect).some((a) => normalize(a) === target)
}

// Build a masked hint from the primary answer: first + last letter shown,
// middle masked with "_", spaces preserved. "liep af" -> "l _ _ _   _ f".
export function hint(cell: string, isPresentPerfect = false): string {
  const primary = acceptableAnswers(cell, isPresentPerfect)[0] ?? ''
  const chars = [...primary]
  const letterIdx = chars
    .map((c, i) => (c === ' ' ? -1 : i))
    .filter((i) => i >= 0)
  const first = letterIdx[0]
  const last = letterIdx[letterIdx.length - 1]

  const glyphs = chars.map((c, i) => {
    if (c === ' ') return ' '
    if (i === first || i === last) return c
    return '_'
  })
  return glyphs.join(' ')
}
