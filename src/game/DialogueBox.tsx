import { useEffect, useRef, useState } from 'react'
import { playSound } from '../audio/audio'
import { isActionKey, useKeyLayer } from './keys'
import { useTouchFirst } from './device'

interface DialogueBoxProps {
  speaker: string
  lines: string[]
  onFinish: () => void
}

export function DialogueBox({ speaker, lines, onFinish }: DialogueBoxProps) {
  const [index, setIndex] = useState(0)
  const isLast = index === lines.length - 1
  const isTop = useKeyLayer()
  const touch = useTouchFirst()
  // The last page is turned once. A double click, or a click and a key in the
  // same frame, used to finish the box twice — and the second finish turned the
  // first page of the *next* box, so a line of the story went unread.
  const finished = useRef(false)

  const advance = () => {
    if (finished.current) return
    playSound('dialogue')
    if (isLast) {
      finished.current = true
      onFinish()
    } else setIndex(index + 1)
  }

  // Space, E and Enter turn the page, as in any game with a text box: whichever
  // key opened the conversation carries it on. Space would otherwise scroll the
  // page, so it's swallowed here. A held key's auto-repeat is not a page each.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (e.repeat) return
      advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, isLast])

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        margin: '0 auto',
        maxWidth: 640,
        background: 'rgba(10, 10, 16, 0.92)',
        border: '2px solid #4a4a66',
        borderRadius: 8,
        padding: '16px 20px',
        color: '#e8e8f0',
        fontFamily: 'monospace',
      }}
    >
      <div style={{ color: '#f2c14e', fontWeight: 'bold', marginBottom: 6 }}>{speaker}</div>
      <div style={{ minHeight: 40 }}>{lines[index]}</div>
      <button
        data-testid="dialogue-advance"
        onClick={advance}
        style={{
          marginTop: 12,
          background: '#3a9d5c',
          color: '#fff',
          border: 'none',
          borderRadius: 4,
          padding: '6px 14px',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        {isLast ? "Let's go" : 'Continue'}
        {!touch && <span style={{ opacity: 0.7 }}> (space / E)</span>}
      </button>
    </div>
  )
}
