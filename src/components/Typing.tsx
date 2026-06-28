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
  const inputRef = useRef<HTMLInputElement>(null)

  const prompt = topic.typingPrompt(entry)
  const cell = topic.typingCell(entry)
  const pp = topic.isPresentPerfect ?? false

  // Focus the input for each new card.
  useEffect(() => {
    inputRef.current?.focus()
  }, [entry])

  const check = () => {
    if (!value.trim()) return
    const correct = isCorrect(value, cell, pp)
    setChecked(correct)
    props.onResult(correct)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (checked === null) {
      if (e.key === 'Enter') {
        e.preventDefault()
        check()
      }
      return
    }
    // Already checked: advance.
    if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault()
      props.onNext()
    }
  }

  return (
    <div className="typing">
      <div className="typing-prompt">
        <span className="card-side-label">Prompt</span>
        <span className="card-text">{prompt}</span>
      </div>

      <div className="typing-hint">hint: {hint(cell, pp)}</div>

      <input
        ref={inputRef}
        className={
          checked === null ? 'answer' : checked ? 'answer ok' : 'answer bad'
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="type your answer, then Enter"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        readOnly={checked !== null}
      />

      {checked !== null && (
        <div className={`result ${checked ? 'ok' : 'bad'}`}>
          <div className="result-mark">{checked ? '✅ Correct' : '❌ Incorrect'}</div>
          <div className="result-answer">
            Answer: <strong>{cell}</strong>
          </div>
          {entry.example?.trim() && (
            <div className="card-example">{entry.example.trim()}</div>
          )}
          <div className="result-hint">Enter / → for next card</div>
        </div>
      )}
    </div>
  )
}
