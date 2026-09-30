import { useEffect, useState } from 'react'
import { playSound } from '../audio/audio'

interface DialogueBoxProps {
  speaker: string
  lines: string[]
  onFinish: () => void
}

export function DialogueBox({ speaker, lines, onFinish }: DialogueBoxProps) {
  const [index, setIndex] = useState(0)
  const isLast = index === lines.length - 1

  const advance = () => {
    playSound('dialogue')
    if (isLast) onFinish()
    else setIndex(index + 1)
  }

  // Space and Enter advance the conversation, as in any game with a text box.
  // Space would otherwise scroll the page, so it's swallowed here.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== ' ' && e.key !== 'Spacebar' && e.key !== 'Enter') return
      e.preventDefault()
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
        {isLast ? "Let's go" : 'Continue'} <span style={{ opacity: 0.7 }}>(space)</span>
      </button>
    </div>
  )
}
