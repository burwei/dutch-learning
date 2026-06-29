import { useEffect, useMemo, useRef, useState } from 'react'
import type { NewsDoc, WordEntry } from '../types'
import { lookup } from '../lib/news'

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

// Split a paragraph into word / non-word runs, keeping everything so the text
// renders verbatim. Words become clickable; punctuation/spaces stay inert.
const TOKEN = /\p{L}[\p{L}'’\-]*|[^\p{L}]+/gu

function Word({
  token,
  doc,
  onPick,
}: {
  token: string
  doc: NewsDoc
  onPick: (sel: Selection) => void
}) {
  const hit = lookup(doc, token)
  if (!hit) return <>{token}</>
  return (
    <button
      type="button"
      className="news-word"
      onClick={(e) => {
        const r = (e.target as HTMLElement).getBoundingClientRect()
        onPick({
          word: token,
          lemma: hit.lemma,
          entry: hit.entry,
          x: r.left + r.width / 2,
          y: r.bottom,
        })
      }}
    >
      {token}
    </button>
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

export function NewsView({ docs, date, onSelectDate }: Props) {
  const [sel, setSel] = useState<Selection | null>(null)
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
        <h1 className="news-title">{doc.title}</h1>
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
        <p className="news-tip">Tap any word to see what it means.</p>

        {paragraphs.map((para, pi) => (
          <p key={pi} className="news-para">
            {[...para.matchAll(TOKEN)].map((m, ti) => (
              <Word key={ti} token={m[0]} doc={doc} onPick={setSel} />
            ))}
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
    </div>
  )
}
