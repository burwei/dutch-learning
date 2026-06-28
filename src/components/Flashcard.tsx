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

const SWIPE_THRESHOLD = 70

export function Flashcard(props: Props) {
  const { entry, topic, mark } = props
  const [flipped, setFlipped] = useState(false)

  // Drag offset while swiping, and the direction the card is flying off (if any).
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState<null | 'left' | 'right'>(null)
  const dragging = useRef(false)
  const startX = useRef(0)
  const moved = useRef(false)

  const front = topic.front(entry)
  const back = topic.back(entry)
  const example = entry.example?.trim()

  // Start the fly-off animation in a direction; the card advances when the
  // animation ends (see onTransitionEnd). Guard so it only triggers once.
  const leave = (dir: 'left' | 'right') => {
    if (leaving) return
    setLeaving(dir)
  }

  // Keep the latest handlers in a ref so the keyboard listener stays stable.
  const handlers = useRef({ leave, onNext: props.onNext, onPrev: props.onPrev })
  handlers.current = { leave, onNext: props.onNext, onPrev: props.onPrev }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          setFlipped((f) => !f)
          break
        case 'ArrowRight':
          e.preventDefault()
          handlers.current.leave('right')
          break
        case 'ArrowLeft':
          e.preventDefault()
          handlers.current.leave('left')
          break
        case 'ArrowDown':
          e.preventDefault()
          handlers.current.onNext()
          break
        case 'ArrowUp':
          e.preventDefault()
          handlers.current.onPrev()
          break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // --- Touch: drag the card with the finger, release to mark or snap back. ---
  const onTouchStart = (e: React.TouchEvent) => {
    if (leaving) return
    dragging.current = true
    moved.current = false
    startX.current = e.changedTouches[0].clientX
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const delta = e.changedTouches[0].clientX - startX.current
    if (Math.abs(delta) > 6) moved.current = true
    setDx(delta)
  }
  const onTouchEnd = () => {
    if (!dragging.current) return
    dragging.current = false
    if (dx > SWIPE_THRESHOLD) leave('right')
    else if (dx < -SWIPE_THRESHOLD) leave('left')
    else setDx(0) // snap back
  }

  const onCardClick = () => {
    // A drag/swipe also fires a click — don't flip in that case.
    if (moved.current) {
      moved.current = false
      return
    }
    setFlipped((f) => !f)
  }

  // When the fly-off transition finishes, actually mark + advance.
  const onTransitionEnd = () => {
    if (!leaving) return
    if (leaving === 'right') props.onRemember()
    else props.onForget()
  }

  // Card transform: flying off, dragging, or resting.
  const offX = leaving === 'right' ? '120%' : leaving === 'left' ? '-120%' : `${dx}px`
  const rot = leaving ? (leaving === 'right' ? 8 : -8) : dx * 0.04
  const style: React.CSSProperties = {
    transform: `translateX(${offX}) rotate(${rot}deg)`,
    opacity: leaving ? 0 : 1,
    transition: dragging.current ? 'none' : 'transform 0.25s ease, opacity 0.25s ease',
  }

  // Tint a hint of the pending decision while dragging.
  const intent = leaving ?? (dx > 24 ? 'right' : dx < -24 ? 'left' : null)

  return (
    <div className="flashcard-wrap">
      <div
        className={`card ${flipped ? 'flipped' : ''} ${intent ? `intent-${intent}` : ''}`}
        style={style}
        onClick={onCardClick}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTransitionEnd={onTransitionEnd}
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
          <span className="hint-mobile">swipe ← / → to mark · tap to flip</span>
        </span>
      </div>

      <div className="card-controls">
        <button className="nav-btn" onClick={props.onPrev} title="Previous (↑)">
          Previous
        </button>
        <button className="nav-btn" onClick={props.onNext} title="Next (↓)">
          Next
        </button>
      </div>
    </div>
  )
}
