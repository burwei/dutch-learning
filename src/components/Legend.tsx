import { useState } from 'react'
import type { Mode } from '../types'

export function Legend({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="legend">
      <button className="legend-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▾' : '▸'} Keyboard shortcuts
      </button>
      {open && (
        <ul className="legend-list">
          {mode === 'flashcard' ? (
            <>
              <li><kbd>Space</kbd> flip card</li>
              <li><kbd>→</kbd> I remember (next)</li>
              <li><kbd>←</kbd> I don't remember (next)</li>
              <li><kbd>↓</kbd> next card</li>
              <li><kbd>↑</kbd> previous card</li>
              <li>swipe / side zones work too</li>
            </>
          ) : (
            <>
              <li><kbd>Enter</kbd> check answer</li>
              <li><kbd>Enter</kbd> / <kbd>→</kbd> / <kbd>↓</kbd> next card (after checking)</li>
            </>
          )}
        </ul>
      )}
    </div>
  )
}
