import type { VocabType, Mode, Filter, Topic } from '../types'
import { VOCAB, VOCAB_TYPES } from '../lib/vocab'

interface Props {
  vocabType: VocabType
  topicId: string
  topics: Topic[]
  mode: Mode
  filter: Filter
  onVocab: (t: VocabType) => void
  onTopic: (id: string) => void
  onMode: (m: Mode) => void
  onFilter: (f: Filter) => void
  onReset: () => void
}

// A row of pill buttons acting as a toggle.
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

export function Header(props: Props) {
  return (
    <header className="header">
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

      <button className="reset" onClick={props.onReset}>
        Reset progress
      </button>
    </header>
  )
}
