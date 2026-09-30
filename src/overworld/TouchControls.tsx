import { useEffect, useState } from 'react'
import type { Direction } from './GridPlayer'

/**
 * On-screen controls for touch devices. The overworld is keyboard-driven on
 * desktop, which is unusable on a phone, so these drive the same movement and
 * interaction paths directly rather than synthesising key events.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false)
  useEffect(() => {
    const query = window.matchMedia('(pointer: coarse)')
    const update = () => setIsTouch(query.matches || window.innerWidth < 820)
    update()
    query.addEventListener('change', update)
    window.addEventListener('resize', update)
    return () => {
      query.removeEventListener('change', update)
      window.removeEventListener('resize', update)
    }
  }, [])
  return isTouch
}

interface TouchControlsProps {
  onHold: (direction: Direction | null) => void
  onAction: () => void
}

const padButton: React.CSSProperties = {
  width: 56,
  height: 56,
  border: '1px solid #4a4a66',
  borderRadius: 8,
  background: 'rgba(20,20,32,0.72)',
  color: '#e8e8f0',
  fontFamily: 'monospace',
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  touchAction: 'none',
}

export function TouchControls({ onHold, onAction }: TouchControlsProps) {
  const hold = (direction: Direction) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      onHold(direction)
    },
    onPointerUp: () => onHold(null),
    onPointerLeave: () => onHold(null),
    onPointerCancel: () => onHold(null),
  })

  return (
    <div
      data-testid="touch-controls"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 'max(16px, env(safe-area-inset-bottom))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        padding: '0 16px',
        pointerEvents: 'none',
      }}
    >
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 56px)', gap: 4, pointerEvents: 'auto' }}>
        <span />
        <div data-testid="pad-up" style={padButton} {...hold('up')}>▲</div>
        <span />
        <div data-testid="pad-left" style={padButton} {...hold('left')}>◀</div>
        <span />
        <div data-testid="pad-right" style={padButton} {...hold('right')}>▶</div>
        <span />
        <div data-testid="pad-down" style={padButton} {...hold('down')}>▼</div>
        <span />
      </div>

      <div
        data-testid="pad-action"
        style={{
          ...padButton,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(58,157,92,0.85)',
          fontSize: 22,
          pointerEvents: 'auto',
        }}
        onPointerDown={(e) => {
          e.preventDefault()
          onAction()
        }}
      >
        E
      </div>
    </div>
  )
}
