import { useEffect } from 'react'
import type { VocabType, Mode, Filter, Topic, Theme } from '../types'
import { VOCAB, VOCAB_TYPES } from '../lib/vocab'

interface Props {
  open: boolean
  onClose: () => void
  vocabType: VocabType
  topicId: string
  topics: Topic[]
  mode: Mode
  filter: Filter
  theme: Theme
  fontScale: number
  fontMin: number
  fontMax: number
  fontStep: number
  onVocab: (t: VocabType) => void
  onTopic: (id: string) => void
  onMode: (m: Mode) => void
  onFilter: (f: Filter) => void
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
          label="Vocab"
          value={props.vocabType}
          onChange={props.onVocab}
          options={VOCAB_TYPES.map((t) => ({ value: t, text: VOCAB[t].label }))}
        />

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

        <hr />

        <div className="drawer-row">
          <span className="toggle-label">Theme</span>
          <button className="theme-toggle" onClick={props.onToggleTheme}>
            {props.theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
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
      </aside>
    </>
  )
}
