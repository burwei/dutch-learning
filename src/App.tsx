import { useEffect, useMemo, useState } from 'react'
import type {
  Entry,
  VocabType,
  Mode,
  Filter,
  SortMode,
  Level,
  Mark,
  Progress,
  Theme,
  TopView,
} from './types'
import { VOCAB, loadVocab } from './lib/vocab'
import { listNews } from './lib/news'
import { relevantEntries, shuffle } from './lib/deck'
import {
  loadProgress,
  saveProgress,
  clearProgress,
  progressKey,
  loadTheme,
  saveTheme,
  loadFontScale,
  saveFontScale,
  loadPosition,
  savePosition,
  loadLevels,
  saveLevels,
  FONT_MIN,
  FONT_MAX,
  FONT_STEP,
} from './lib/storage'
import { Drawer } from './components/Drawer'
import { Flashcard } from './components/Flashcard'
import { Typing } from './components/Typing'
import { NewsView } from './components/NewsView'

export default function App() {
  // Settings drawer + reset confirmation dialog.
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  // Top-level section: vocab drills or the daily news reader. The view and the
  // open article are mirrored in the URL hash (e.g. #/news/2026-06-29) so an
  // article is shareable and survives a refresh. Hash routing needs no server
  // config, so it works on GitHub Pages.
  const news = useMemo(() => listNews(), [])
  const newsDates = useMemo(() => news.map((n) => n.date), [news])
  const parseHash = (): { view: TopView; date: string } => {
    const [section, d] = window.location.hash.replace(/^#\/?/, '').split('/')
    if (section === 'news') {
      return { view: 'news', date: newsDates.includes(d) ? d : newsDates[0] ?? '' }
    }
    return { view: 'vocab', date: newsDates[0] ?? '' }
  }
  const [view, setView] = useState<TopView>(() => parseHash().view)
  const [newsDate, setNewsDate] = useState<string>(() => parseHash().date)

  useEffect(() => {
    const target = view === 'news' ? `#/news/${newsDate}` : '#/vocab'
    if (window.location.hash !== target) window.location.hash = target
  }, [view, newsDate])
  useEffect(() => {
    const onHash = () => {
      const p = parseHash()
      setView(p.view)
      setNewsDate(p.date)
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newsDates])

  // Top-level selections.
  const [vocabType, setVocabType] = useState<VocabType>('verb')
  const [topicId, setTopicId] = useState<string>('english')
  const [mode, setMode] = useState<Mode>('flashcard')
  const [filter, setFilter] = useState<Filter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('order')
  const [levels, setLevels] = useState<Level[]>(loadLevels)
  useEffect(() => {
    saveLevels(levels)
  }, [levels])

  // Progress + session score.
  const [progress, setProgress] = useState<Progress>(loadProgress)
  const [score, setScore] = useState({ correct: 0, attempted: 0 })

  // Light/dark theme, applied to <html> and persisted.
  const [theme, setTheme] = useState<Theme>(loadTheme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    saveTheme(theme)
  }, [theme])

  // Adjustable card font size, applied as a CSS variable and persisted.
  const [fontScale, setFontScale] = useState<number>(loadFontScale)
  useEffect(() => {
    document.documentElement.style.setProperty('--font-scale', String(fontScale))
    saveFontScale(fontScale)
  }, [fontScale])
  const round1 = (n: number) => Math.round(n * 10) / 10
  const changeFont = (delta: number) =>
    setFontScale((s) => round1(Math.min(FONT_MAX, Math.max(FONT_MIN, s + delta))))

  // Current deck (ordered) and position.
  const [order, setOrder] = useState<Entry[]>([])
  const [index, setIndex] = useState(0)

  const config = VOCAB[vocabType]
  const topic = config.topics.find((t) => t.id === topicId) ?? config.topics[0]

  const key = progressKey(mode, vocabType, topic.id)
  const idOf = (e: Entry) => `${key}:${config.headword(e)}`
  const markOf = (e: Entry): Mark | undefined => progress[idOf(e)]

  // Switching vocab type resets to that type's first topic.
  const changeVocab = (t: VocabType) => {
    setVocabType(t)
    setTopicId(VOCAB[t].topics[0].id)
  }

  // Signature of the current deck context — position is only resumed when this
  // matches what was saved.
  const sig = `${mode}:${vocabType}:${topicId}:${filter}`

  // Rebuild the deck whenever the selection changes. We deliberately do NOT
  // rebuild on every mark, so drilling doesn't reshuffle under you — toggle the
  // filter again to refresh the "only unknown" set. On (re)build we resume the
  // last viewed card for this context if we can still find it.
  useEffect(() => {
    let pool = relevantEntries(loadVocab(vocabType, levels), topic)
    if (filter === 'unknown') {
      pool = pool.filter((e) => progress[`${key}:${config.headword(e)}`] !== 'known')
    }
    if (sortMode === 'random') pool = shuffle(pool)
    const saved = loadPosition()
    let start = 0
    if (saved && saved.sig === sig) {
      const i = pool.findIndex((e) => config.headword(e) === saved.head)
      if (i >= 0) start = i
    }
    setOrder(pool)
    setIndex(start)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabType, topicId, filter, sortMode, mode, levels])

  const current = order[index]

  // Remember the current card so a reload resumes here.
  useEffect(() => {
    if (current) savePosition(sig, config.headword(current))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, sig])

  const setMark = (e: Entry, mark: Mark) => {
    setProgress((prev) => {
      const next = { ...prev, [idOf(e)]: mark }
      saveProgress(next)
      return next
    })
  }

  const next = () => setIndex((i) => (order.length ? (i + 1) % order.length : 0))
  const prev = () =>
    setIndex((i) => (order.length ? (i - 1 + order.length) % order.length : 0))

  // Only ever called from the confirmation dialog — progress is never cleared
  // by any other code path.
  const resetProgress = () => {
    clearProgress()
    setProgress({})
    setScore({ correct: 0, attempted: 0 })
    setConfirmReset(false)
  }

  const recordResult = (e: Entry, correct: boolean) => {
    setMark(e, correct ? 'known' : 'unknown')
    setScore((s) => ({
      correct: s.correct + (correct ? 1 : 0),
      attempted: s.attempted + 1,
    }))
  }

  const knownCount = useMemo(
    () => order.filter((e) => markOf(e) === 'known').length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, progress, key],
  )

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="menu-btn"
          onClick={() => setMenuOpen(true)}
          aria-label="Open settings menu"
        >
          ☰
        </button>
        <div className="topbar-context">
          {view === 'vocab' ? (
            <>
              <span className="ctx-main">
                {config.label} · {topic.label}
              </span>
              <span className="ctx-sub">
                {mode === 'flashcard' ? 'Flashcard' : 'Typing'}
                {filter === 'unknown' ? ' · only unknown' : ''}
              </span>
            </>
          ) : (
            <>
              <span className="ctx-main">Daily news</span>
              <span className="ctx-sub">NOS headline · tap a word</span>
            </>
          )}
        </div>
      </header>

      <Drawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        view={view}
        onView={setView}
        vocabType={vocabType}
        topicId={topic.id}
        topics={config.topics}
        mode={mode}
        filter={filter}
        sortMode={sortMode}
        levels={levels}
        theme={theme}
        fontScale={fontScale}
        fontMin={FONT_MIN}
        fontMax={FONT_MAX}
        fontStep={FONT_STEP}
        onVocab={changeVocab}
        onTopic={setTopicId}
        onMode={setMode}
        onFilter={setFilter}
        onSort={setSortMode}
        onToggleLevel={(lvl) =>
          setLevels((cur) =>
            cur.includes(lvl) ? cur.filter((l) => l !== lvl) : [...cur, lvl],
          )
        }
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
        onFont={(delta) => changeFont(delta)}
        onReset={() => {
          setMenuOpen(false)
          setConfirmReset(true)
        }}
      />

      <main className="main">
        {view === 'news' ? (
          <NewsView docs={news} date={newsDate} onSelectDate={setNewsDate} />
        ) : (
         <>
        {order.length === 0 && (
          <p className="status">
            No cards to show.{' '}
            {filter === 'unknown' &&
              'Everything here is marked known — switch the filter to “All”.'}
          </p>
        )}

        {current && (
          <>
            <div className="counter">
              <span>
                {index + 1} / {order.length}
              </span>
              <span className="counter-known">{knownCount} known</span>
              {mode === 'typing' && (
                <span className="counter-score">
                  score {score.correct}/{score.attempted}
                </span>
              )}
            </div>

            {mode === 'flashcard' ? (
              <Flashcard
                key={idOf(current)}
                entry={current}
                topic={topic}
                mark={markOf(current)}
                onRemember={() => {
                  setMark(current, 'known')
                  next()
                }}
                onForget={() => {
                  setMark(current, 'unknown')
                  next()
                }}
                onNext={next}
                onPrev={prev}
              />
            ) : (
              <Typing
                key={idOf(current)}
                entry={current}
                topic={topic}
                onResult={(correct) => recordResult(current, correct)}
                onNext={next}
              />
            )}
          </>
        )}
         </>
        )}
      </main>

      {confirmReset && (
        <div className="modal-backdrop" onClick={() => setConfirmReset(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Reset progress?</h2>
            <p className="modal-text">
              This permanently clears every known/unknown mark across all vocab
              types and the current session score. This cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={resetProgress}>
                Reset progress
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
