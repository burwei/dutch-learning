import { useEffect, useRef, useState } from 'react'
import type { Entry, Topic, Mark } from '../types'

interface Props {
  entry: Entry
  topic: Topic
  mark: Mark | undefined
  onRemember: () => void
  onForget: () => void
  onNext: () => void
  onPrev: () => void
}

export function Flashcard(props: Props) {
  const { entry, topic, mark } = props
  const [flipped, setFlipped] = useState(false)

  const front = topic.front(entry)
  const back = topic.back(entry)

  // Keyboard controls.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setFlipped((f) => !f)
          break
        case 'ArrowRight':
          e.preventDefault()
          props.onRemember()
          break
        case 'ArrowLeft':
          e.preventDefault()
          props.onForget()
          break
        case 'ArrowDown':
          e.preventDefault()
          props.onNext()
          break
        case 'ArrowUp':
          e.preventDefault()
          props.onPrev()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [props])

  // Swipe support.
  const touchX = useRef<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx > 60) props.onRemember()
    else if (dx < -60) props.onForget()
  }

  return (
    <div className="flashcard-wrap">
      <div className="card-row">
        <button
          className="zone zone-left"
          onClick={props.onForget}
          title="I don't remember (←)"
          aria-label="I don't remember"
        >
          ✗
        </button>

        <div
          className={`card ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {mark && <span className={`badge badge-${mark}`}>{mark}</span>}
          {!flipped ? (
            <>
              <span className="card-side-label">Dutch</span>
              <span className="card-text">{front}</span>
              <span className="card-hint-text">space / click to flip</span>
            </>
          ) : (
            <>
              <span className="card-side-label">{topic.label}</span>
              <span className="card-text">{back}</span>
            </>
          )}
        </div>

        <button
          className="zone zone-right"
          onClick={props.onRemember}
          title="I remember (→)"
          aria-label="I remember"
        >
          ✓
        </button>
      </div>
    </div>
  )
}
