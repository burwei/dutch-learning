import { useEffect, useRef, useState } from 'react'
import type { Entry, Topic } from '../types'
import { isCorrect, hint } from '../lib/answer'

interface Props {
  entry: Entry
  topic: Topic
  onResult: (correct: boolean) => void
  onNext: () => void
}

export function Typing(props: Props) {
  const { entry, topic } = props
  const [value, setValue] = useState('')
  const [checked, setChecked] = useState<null | boolean>(null)
  const [gaveUp, setGaveUp] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nextRef = useRef<HTMLButtonElement>(null)

  const prompt = topic.typingPrompt(entry)
  const cell = topic.typingCell(entry)
  const pp = topic.isPresentPerfect ?? false
  const done = checked !== null

  // Focus the input for each new card.
  useEffect(() => {
    inputRef.current?.focus()
  }, [entry])

  // Once answered, focus Next so Enter advances (and it's reachable on mobile).
  useEffect(() => {
    if (done) nextRef.current?.focus()
  }, [done])

  const check = () => {
    if (done || !value.trim()) return
    const correct = isCorrect(value, cell, pp)
    setChecked(correct)
    props.onResult(correct)
  }

  const dontKnow = () => {
    if (done) return
    setGaveUp(true)
    setChecked(false)
    props.onResult(false)
  }

  // Enter / the mobile keyboard action key submits the form -> check.
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    check()
  }

  // After answering, Enter / → / ↓ advance (desktop).
  useEffect(() => {
    if (!done) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        props.onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [done, props])

  const inputClass =
    checked === null ? 'answer' : checked ? 'answer ok' : 'answer bad'

  return (
    <div className="typing">
      <div className="typing-prompt">
        <span className="card-side-label">Prompt</span>
        <span className="card-text">{prompt}</span>
      </div>

      <div className="typing-hint">hint: {hint(cell, pp)}</div>

      <form className="typing-form" onSubmit={onSubmit}>
        <input
          ref={inputRef}
          className={inputClass}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="type your answer…"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          readOnly={done}
        />
      </form>

      {!done ? (
        <div className="typing-actions">
          <button className="btn-secondary" onClick={dontKnow}>
            Don't know
          </button>
          <button
            className="btn-primary check-btn"
            onClick={check}
            disabled={!value.trim()}
          >
            Check
          </button>
        </div>
      ) : (
        <>
          <div className={`result ${checked ? 'ok' : 'bad'}`}>
            <div className="result-mark">
              {gaveUp ? 'Answer' : checked ? '✅ Correct' : '❌ Incorrect'}
            </div>
            <div className="result-answer">
              <strong>{cell}</strong>
            </div>
            {entry.example?.trim() && (
              <div className="card-example">{entry.example.trim()}</div>
            )}
          </div>
          <div className="typing-actions">
            <button ref={nextRef} className="btn-primary" onClick={props.onNext}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  )
}
