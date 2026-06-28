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
  const example = entry.example?.trim()

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
  const swiped = useRef(false)
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.changedTouches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return
    const dx = e.changedTouches[0].clientX - touchX.current
    touchX.current = null
    if (dx > 60) {
      swiped.current = true
      props.onRemember()
    } else if (dx < -60) {
      swiped.current = true
      props.onForget()
    }
  }
  const onCardClick = () => {
    // A swipe also fires a click on some browsers — don't flip in that case.
    if (swiped.current) {
      swiped.current = false
      return
    }
    setFlipped((f) => !f)
  }

  return (
    <div className="flashcard-wrap">
      <div
        className={`card ${flipped ? 'flipped' : ''}`}
        onClick={onCardClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {mark && <span className={`badge badge-${mark}`}>{mark}</span>}
        {!flipped ? (
          <>
            <span className="card-side-label">Dutch</span>
            <span className="card-text">{front}</span>
          </>
        ) : (
          <>
            <span className="card-side-label">{topic.label}</span>
            <span className="card-text">{back}</span>
            {example && <span className="card-example">{example}</span>}
          </>
        )}

        {/* Control hints, pinned to the bottom of the card. */}
        <span className="card-hint-text">
          <span className="hint-desktop">
            ← don't remember · → remember · space to flip
          </span>
          <span className="hint-mobile">
            swipe ← / → to mark · tap to flip
          </span>
        </span>
      </div>

      <div className="card-controls">
        <button className="nav-btn" onClick={props.onPrev} title="Previous (↑)">
          ← Previous
        </button>
        <button className="nav-btn" onClick={props.onNext} title="Next (↓)">
          Next →
        </button>
      </div>
    </div>
  )
}
