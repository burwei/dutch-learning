import { useEffect, useMemo, useRef, useState } from 'react'
import type { NewsDoc, WordEntry } from '../types'
import { lookup, translate, normSentence } from '../lib/news'

interface Props {
  docs: NewsDoc[]
  date: string
  onSelectDate: (date: string) => void
}

interface Selection {
  word: string
  lemma: string
  entry: WordEntry
  x: number
  y: number
}

interface Translation {
  dutch: string
  english: string | null
  x: number
  y: number
}

// Split a piece of text into word / non-word runs, keeping everything so the
// text renders verbatim. Words become tappable; punctuation/spaces stay inert.
const TOKEN = /\p{L}[\p{L}'’\-]*|[^\p{L}]+/gu

// A sentence boundary: sentence-ending punctuation (with any closing quote /
// bracket), then whitespace, where the next sentence opens with a capital,
// quote, or paren. We split *after* the whitespace so an opening quote leads
// the next sentence. This mirrors the splitter in scripts/fetch_daily_news.py
// (so a tapped sentence matches a stored translation) and won't split inside
// numbers like "50.000" (no whitespace after the dot).
const SENTENCE_END = /[.!?]["'”’)\]]*\s+(?=["“„'(¿¡A-ZÀ-Þ])/g

// Split text into sentence strings, keeping every character.
function splitSentences(text: string): string[] {
  const sentences: string[] = []
  let last = 0
  let m: RegExpExecArray | null
  SENTENCE_END.lastIndex = 0
  while ((m = SENTENCE_END.exec(text))) {
    const end = m.index + m[0].length
    sentences.push(text.slice(last, end))
    last = end
  }
  if (last < text.length) sentences.push(text.slice(last))
  return sentences.filter((s) => s.trim())
}

// One sentence: inert text with tappable words inside, plus the gesture model.
// - single tap on a word  -> word definition (debounced so a double-tap wins)
// - double tap            -> select + translate the whole sentence
// - long-press / drag     -> native text selection & copy (we stay out of the way)
function Sentence({
  text,
  doc,
  onDefine,
  onTranslate,
}: {
  text: string
  doc: NewsDoc
  onDefine: (token: string, x: number, y: number) => void
  onTranslate: (el: HTMLElement) => void
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | null>(null)
  const tokens = useMemo(() => [...text.matchAll(TOKEN)].map((m) => m[0]), [text])

  useEffect(() => () => {
    if (timer.current != null) window.clearTimeout(timer.current)
  }, [])

  const handleClick = (e: React.MouseEvent) => {
    // A second tap before the timer fires is a double-tap -> translate the whole
    // sentence. (Timer-based rather than e.detail, which mobile browsers report
    // inconsistently for touch.)
    if (timer.current != null) {
      window.clearTimeout(timer.current)
      timer.current = null
      if (ref.current) onTranslate(ref.current)
      return
    }

    // A non-collapsed selection means the user is selecting text to copy
    // (long-press / drag) — stay out of the way and let the native copy UI run.
    const seln = window.getSelection()
    if (seln && !seln.isCollapsed) return

    const wordEl = (e.target as HTMLElement).closest<HTMLElement>('.news-word')
    const token = wordEl?.dataset.token ?? ''
    const r = wordEl?.getBoundingClientRect()
    const x = r ? r.left + r.width / 2 : 0
    const y = r ? r.bottom : 0
    timer.current = window.setTimeout(() => {
      timer.current = null
      if (token) onDefine(token, x, y)
    }, 250)
  }

  return (
    <span className="news-sentence" ref={ref} onClick={handleClick}>
      {tokens.map((tok, i) =>
        lookup(doc, tok) ? (
          <span key={i} className="news-word" data-token={tok}>
            {tok}
          </span>
        ) : (
          <span key={i}>{tok}</span>
        ),
      )}
    </span>
  )
}

// Render any block of text (title or paragraph) as a run of sentences.
function Block({
  text,
  doc,
  onDefine,
  onTranslate,
}: {
  text: string
  doc: NewsDoc
  onDefine: (token: string, x: number, y: number) => void
  onTranslate: (el: HTMLElement) => void
}) {
  const sentences = useMemo(() => splitSentences(text), [text])
  return (
    <>
      {sentences.map((sentence, i) => (
        <Sentence
          key={i}
          text={sentence}
          doc={doc}
          onDefine={onDefine}
          onTranslate={onTranslate}
        />
      ))}
    </>
  )
}

function Detail({ sel, onClose }: { sel: Selection; onClose: () => void }) {
  const { entry } = sel
  // Anchor under the tapped word, clamped to the viewport. On phones, CSS turns
  // this into a bottom sheet (the inline left/top are overridden).
  const left = Math.min(Math.max(sel.x, 150), window.innerWidth - 150)
  const top = Math.min(sel.y + 8, window.innerHeight - 40)

  const rows: [string, string][] = []
  if (entry.pos === 'verb') {
    if (entry.present) rows.push(['Present', entry.present])
    if (entry.simple_past) rows.push(['Simple past', entry.simple_past])
    if (entry.present_perfect) rows.push(['Present perfect', entry.present_perfect])
  } else if (entry.pos === 'noun') {
    if (entry.article) rows.push(['Article', `${entry.article} ${sel.lemma}`])
    if (entry.plural) rows.push(['Plural', entry.plural])
  }

  return (
    <>
      <div className="news-pop-backdrop" onClick={onClose} />
      <div
        className="news-pop"
        style={{ left, top }}
        role="dialog"
        aria-label={`Definition of ${sel.lemma}`}
      >
        <div className="news-pop-head">
          <span className="news-pop-word">{sel.lemma}</span>
          <span className="news-pop-pos">{entry.pos}</span>
          <button className="news-pop-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="news-pop-english">{entry.english}</div>
        {rows.length > 0 && (
          <dl className="news-pop-forms">
            {rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
        {entry.example && <p className="news-pop-example">{entry.example}</p>}
      </div>
    </>
  )
}

function TranslateDetail({
  trans,
  onClose,
}: {
  trans: Translation
  onClose: () => void
}) {
  const left = Math.min(Math.max(trans.x, 150), window.innerWidth - 150)
  const top = Math.min(trans.y + 8, window.innerHeight - 40)
  return (
    <>
      <div className="news-pop-backdrop" onClick={onClose} />
      <div
        className="news-pop"
        style={{ left, top }}
        role="dialog"
        aria-label="Sentence translation"
      >
        <div className="news-pop-head">
          <span className="news-pop-pos">Translation</span>
          <button className="news-pop-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <p className="news-pop-sentence">{trans.dutch}</p>
        {trans.english ? (
          <p className="news-pop-translation">{trans.english}</p>
        ) : (
          <p className="news-pop-translation news-pop-muted">
            No translation available for this article yet.
          </p>
        )}
      </div>
    </>
  )
}

export function NewsView({ docs, date, onSelectDate }: Props) {
  const [sel, setSel] = useState<Selection | null>(null)
  const [trans, setTrans] = useState<Translation | null>(null)
  const [progress, setProgress] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const doc = useMemo(
    () => docs.find((d) => d.date === date) ?? docs[0],
    [docs, date],
  )

  // Replaces the scrollbar: a reading-progress bar pinned to the top.
  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setProgress(max > 0 ? el.scrollTop / max : 0)
  }

  // Reset to the top when switching to a different day.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    setProgress(0)
  }, [doc?.date])

  const clearSelection = () => window.getSelection()?.removeAllRanges()

  const onDefine = (token: string, x: number, y: number) => {
    if (!doc) return
    const hit = lookup(doc, token)
    if (!hit) return
    setTrans(null)
    setSel({ word: token, lemma: hit.lemma, entry: hit.entry, x, y })
  }

  const onTranslate = (el: HTMLElement) => {
    if (!doc) return
    // Highlight the whole sentence natively, then show its translation.
    const seln = window.getSelection()
    if (seln) {
      const range = document.createRange()
      range.selectNodeContents(el)
      seln.removeAllRanges()
      seln.addRange(range)
    }
    const dutch = normSentence(el.textContent || '')
    const r = el.getBoundingClientRect()
    setSel(null)
    setTrans({
      dutch,
      english: translate(doc, dutch),
      x: r.left + r.width / 2,
      y: r.bottom,
    })
  }

  if (!doc) {
    return (
      <p className="status">
        No news yet. Run <code>python3 scripts/fetch_daily_news.py</code> to fetch
        today's NOS headline.
      </p>
    )
  }

  const paragraphs = doc.body.split(/\n{2,}/)

  // docs are newest-first, so the older day sits at the next index.
  const idx = docs.findIndex((d) => d.date === doc.date)
  const older = docs[idx + 1]
  const newer = docs[idx - 1]

  return (
    <div className="news" ref={scrollRef} onScroll={onScroll}>
      <div className="news-progress" aria-hidden="true">
        <div
          className="news-progress-fill"
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>

      <article className="news-article">
        <h1 className="news-title">
          <Block
            text={doc.title}
            doc={doc}
            onDefine={onDefine}
            onTranslate={onTranslate}
          />
        </h1>
        <div className="news-meta">
          <span>{doc.date}</span>
          <span>·</span>
          <span>{doc.reporter}</span>
          {doc.source && (
            <>
              <span>·</span>
              <a href={doc.source} target="_blank" rel="noopener noreferrer">
                NOS
              </a>
            </>
          )}
        </div>
        <p className="news-tip">
          Tap a word for its meaning · double-tap a sentence to translate ·
          long-press to select &amp; copy.
        </p>

        {paragraphs.map((para, pi) => (
          <p key={pi} className="news-para">
            <Block
              text={para}
              doc={doc}
              onDefine={onDefine}
              onTranslate={onTranslate}
            />
          </p>
        ))}
      </article>

      <div className="news-nav">
        <button
          className="nav-btn"
          disabled={!older}
          onClick={() => older && onSelectDate(older.date)}
        >
          ← Previous{older ? ` · ${older.date}` : ''}
        </button>
        <button
          className="nav-btn"
          disabled={!newer}
          onClick={() => newer && onSelectDate(newer.date)}
        >
          Next{newer ? ` · ${newer.date}` : ''} →
        </button>
      </div>

      {sel && <Detail sel={sel} onClose={() => setSel(null)} />}
      {trans && (
        <TranslateDetail
          trans={trans}
          onClose={() => {
            setTrans(null)
            clearSelection()
          }}
        />
      )}
    </div>
  )
}
