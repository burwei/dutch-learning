import { useEffect } from 'react'
import type {
  VocabType,
  Mode,
  Filter,
  SortMode,
  Level,
  Topic,
  Theme,
  TopView,
} from '../types'
import { VOCAB, VOCAB_TYPES, availableLevels } from '../lib/vocab'

interface Props {
  open: boolean
  onClose: () => void
  view: TopView
  onView: (v: TopView) => void
  vocabType: VocabType
  topicId: string
  topics: Topic[]
  mode: Mode
  filter: Filter
  sortMode: SortMode
  levels: Level[]
  theme: Theme
  fontScale: number
  fontMin: number
  fontMax: number
  fontStep: number
  onVocab: (t: VocabType) => void
  onTopic: (id: string) => void
  onMode: (m: Mode) => void
  onFilter: (f: Filter) => void
  onSort: (s: SortMode) => void
  onToggleLevel: (l: Level) => void
  onToggleTheme: () => void
  onFont: (delta: number) => void
  onReset: () => void
}

// A label with a row of pill buttons acting as a toggle.
function Toggle<T extends string>(props: {
  label: string
  value: T
  options: { value: T; text: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="toggle">
      <span className="toggle-label">{props.label}</span>
      <div className="toggle-buttons">
        {props.options.map((o) => (
          <button
            key={o.value}
            className={props.value === o.value ? 'pill active' : 'pill'}
            onClick={() => props.onChange(o.value)}
          >
            {o.text}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Drawer(props: Props) {
  // Close on Escape while open.
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  return (
    <>
      <div
        className={`drawer-backdrop ${props.open ? 'open' : ''}`}
        onClick={props.onClose}
      />
      <aside className={`drawer ${props.open ? 'open' : ''}`} aria-hidden={!props.open}>
        <div className="drawer-head">
          <span>Settings</span>
          <button className="drawer-close" onClick={props.onClose} aria-label="Close menu">
            ✕
          </button>
        </div>

        <Toggle
          label="View"
          value={props.view}
          onChange={props.onView}
          options={[
            { value: 'vocab', text: 'Vocab' },
            { value: 'news', text: 'News' },
          ]}
        />

        {props.view === 'vocab' && (
          <>
            <Toggle
              label="Vocab"
              value={props.vocabType}
              onChange={props.onVocab}
              options={VOCAB_TYPES.map((t) => ({ value: t, text: VOCAB[t].label }))}
            />

        <div className="toggle">
          <span className="toggle-label">Level</span>
          <div className="level-checks">
            {availableLevels().map(({ id, label }) => (
              <label
                key={id}
                className={`level-check ${props.levels.includes(id) ? 'on' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={props.levels.includes(id)}
                  onChange={() => props.onToggleLevel(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <Toggle
          label="Topic"
          value={props.topicId}
          onChange={props.onTopic}
          options={props.topics.map((t) => ({ value: t.id, text: t.label }))}
        />

        <Toggle
          label="Mode"
          value={props.mode}
          onChange={props.onMode}
          options={[
            { value: 'flashcard', text: 'Flashcard' },
            { value: 'typing', text: 'Typing' },
          ]}
        />

        <Toggle
          label="Filter"
          value={props.filter}
          onChange={props.onFilter}
          options={[
            { value: 'all', text: 'All' },
            { value: 'unknown', text: 'Only unknown' },
          ]}
        />

        <Toggle
          label="Order"
          value={props.sortMode}
          onChange={props.onSort}
          options={[
            { value: 'order', text: 'By order' },
            { value: 'random', text: 'Random' },
          ]}
        />
          </>
        )}

        <hr />

        <div className="drawer-row">
          <span className="toggle-label">Theme</span>
          <button className="theme-toggle" onClick={props.onToggleTheme}>
            {props.theme === 'dark' ? 'Light' : 'Dark'}
          </button>
        </div>

        <div className="drawer-row">
          <span className="toggle-label">Font size</span>
          <div className="font-stepper">
            <button
              onClick={() => props.onFont(-props.fontStep)}
              disabled={props.fontScale <= props.fontMin}
              aria-label="Smaller font"
            >
              A−
            </button>
            <span className="font-value">{Math.round(props.fontScale * 100)}%</span>
            <button
              onClick={() => props.onFont(props.fontStep)}
              disabled={props.fontScale >= props.fontMax}
              aria-label="Larger font"
            >
              A+
            </button>
          </div>
        </div>

        <button className="reset" onClick={props.onReset}>
          Reset progress
        </button>

        <div className="drawer-footer">
          <a
            className="repo-link"
            href="https://github.com/burwei/dutch-learning"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            GitHub repo
          </a>
          <span className="app-version">v{__APP_VERSION__}</span>
        </div>
      </aside>
    </>
  )
}
