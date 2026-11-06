import { useRef, useState } from 'react'
import type { Direction } from './GridPlayer'
import { useTouchFirst } from '../game/device'
import { UI_FONT } from '../game/pixel/webFont'

/**
 * On-screen controls for touch devices. The overworld is keyboard-driven on
 * desktop, which is unusable on a phone, so these drive the same movement and
 * interaction paths directly rather than synthesising key events.
 *
 * Whether they show is decided by the device, not the window's width: a small
 * desktop window keeps its keyboard (see `src/game/device.ts`).
 */
export const useIsTouchDevice = useTouchFirst

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
  fontFamily: UI_FONT,
  fontSize: 20,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  userSelect: 'none',
  touchAction: 'none',
}

/** Thumb travel before a direction registers, and how far the base trails behind. */
const DEAD_ZONE = 14
const BASE_RADIUS = 46

/** Four-way direction of a thumb offset, or null inside the dead zone. */
export function stickDirection(dx: number, dy: number, current: Direction | null): Direction | null {
  if (Math.hypot(dx, dy) < DEAD_ZONE) return null
  const horizontal = Math.abs(dx) > Math.abs(dy)
  // Hold the current axis until the other clearly wins, so a diagonal doesn't flicker.
  if (current) {
    const onX = current === 'left' || current === 'right'
    if (onX && Math.abs(dx) * 1.3 >= Math.abs(dy)) return dx < 0 ? 'left' : 'right'
    if (!onX && Math.abs(dy) * 1.3 >= Math.abs(dx)) return dy < 0 ? 'up' : 'down'
  }
  return horizontal ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down'
}

export function TouchControls({ onHold, onAction }: TouchControlsProps) {
  // A floating stick: it appears where the thumb lands and the base trails the
  // thumb, so reversing never needs a long drag. `stick` is only for drawing.
  const [stick, setStick] = useState<{ bx: number; by: number; kx: number; ky: number } | null>(null)
  const grip = useRef<{ id: number; bx: number; by: number; dir: Direction | null } | null>(null)

  const move = (e: React.PointerEvent) => {
    const g = grip.current
    if (!g || e.pointerId !== g.id) return
    let dx = e.clientX - g.bx
    let dy = e.clientY - g.by
    const len = Math.hypot(dx, dy)
    if (len > BASE_RADIUS) {
      g.bx += (dx / len) * (len - BASE_RADIUS)
      g.by += (dy / len) * (len - BASE_RADIUS)
      dx = e.clientX - g.bx
      dy = e.clientY - g.by
    }
    const dir = stickDirection(dx, dy, g.dir)
    if (dir !== g.dir) {
      g.dir = dir
      onHold(dir)
      if (dir && 'vibrate' in navigator) navigator.vibrate(8)
    }
    setStick({ bx: g.bx, by: g.by, kx: e.clientX, ky: e.clientY })
  }
  const release = (e: React.PointerEvent) => {
    if (!grip.current || e.pointerId !== grip.current.id) return
    grip.current = null
    onHold(null)
    setStick(null)
  }

  return (
    <div
      data-testid="touch-controls"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 'min(46vh, 300px)',
        pointerEvents: 'none',
      }}
    >
      {/* The whole lower-left of the screen is the stick's touch surface. */}
      <div
        data-testid="touch-stick-zone"
        style={{
          position: 'absolute',
          left: 0,
          bottom: 0,
          width: '62%',
          height: '100%',
          pointerEvents: 'auto',
          touchAction: 'none',
          userSelect: 'none',
        }}
        onPointerDown={(e) => {
          if (grip.current) return
          e.preventDefault()
          e.currentTarget.setPointerCapture(e.pointerId)
          grip.current = { id: e.pointerId, bx: e.clientX, by: e.clientY, dir: null }
          setStick({ bx: e.clientX, by: e.clientY, kx: e.clientX, ky: e.clientY })
        }}
        onPointerMove={move}
        onPointerUp={release}
        onPointerCancel={release}
        onLostPointerCapture={release}
      >
        {!stick && (
          <div
            style={{
              position: 'absolute',
              left: 24,
              bottom: 'max(24px, env(safe-area-inset-bottom))',
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              borderRadius: '50%',
              border: '2px dashed rgba(232,232,240,0.28)',
              color: 'rgba(232,232,240,0.35)',
              fontFamily: UI_FONT,
              fontSize: 11,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            drag to walk
          </div>
        )}
      </div>
      {stick && (
        <>
          <div
            data-testid="touch-stick-base"
            style={{
              position: 'fixed',
              left: stick.bx - BASE_RADIUS,
              top: stick.by - BASE_RADIUS,
              width: BASE_RADIUS * 2,
              height: BASE_RADIUS * 2,
              borderRadius: '50%',
              border: '2px solid rgba(232,232,240,0.5)',
              background: 'rgba(20,20,32,0.35)',
              pointerEvents: 'none',
            }}
          />
          <div
            style={{
              position: 'fixed',
              left: stick.kx - 22,
              top: stick.ky - 22,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(232,232,240,0.55)',
              pointerEvents: 'none',
            }}
          />
        </>
      )}

      <div
        data-testid="pad-action"
        style={{
          ...padButton,
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'rgba(58,157,92,0.85)',
          fontSize: 20,
          position: 'absolute',
          right: 16,
          bottom: 'max(16px, env(safe-area-inset-bottom))',
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
