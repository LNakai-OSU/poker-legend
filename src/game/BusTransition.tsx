import { useEffect, useState } from 'react'

/**
 * The ride itself, rather than a caption about it.
 *
 * Travel used to be a paragraph of text and a button. Since the world is now one
 * continuous place you could have walked, the bus has to feel like a shortcut
 * through it — so you watch yourself sitting in the window while the town goes
 * past, and it ends on its own.
 */

interface BusTransitionProps {
  /** Where the bus is going, for the sign in the window. */
  destination?: string
  /** A line to sit under the bus while it moves. */
  caption?: string
  onArrive: () => void
}

/** How long the ride lasts. Long enough to feel like distance, short enough to sit through. */
const RIDE_MS = 4200

export function BusTransition({ destination, caption, onArrive }: BusTransitionProps) {
  const [done, setDone] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDone(true), RIDE_MS)
    return () => window.clearTimeout(timer)
  }, [])

  // Arriving is automatic; the button is only there for anyone who would rather
  // not wait, which is the same bargain the table makes between hands.
  useEffect(() => {
    if (!done) return
    const timer = window.setTimeout(onArrive, 450)
    return () => window.clearTimeout(timer)
  }, [done])

  return (
    <div
      data-testid="bus-ride"
      style={{
        width: '100vw',
        height: '100vh',
        background: 'linear-gradient(180deg, #0b1020 0%, #141a2c 60%, #0a0d16 100%)',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        textAlign: 'center',
        padding: 24,
        overflow: 'hidden',
      }}
    >
      <div style={{ letterSpacing: 2, color: '#8ad4ff', fontSize: 13 }}>
        {destination ? `THE 14 — ${destination.toUpperCase()}` : 'THE 14'}
      </div>

      {/* The window: scenery scrolls behind, the bus body sits in front. */}
      <div
        style={{
          position: 'relative',
          width: 'min(92vw, 520px)',
          height: 190,
          borderRadius: 10,
          overflow: 'hidden',
          border: '3px solid #2a3348',
          boxShadow: '0 12px 40px rgba(0,0,0,0.55)',
          background: 'linear-gradient(180deg, #16213a 0%, #1d2a45 55%, #101828 100%)',
        }}
      >
        {/* Far skyline, moving slowly. */}
        <div className="bus-scroll-far" style={scenerySlab(['#1b2742', '#223055'], 54, 86)} />
        {/* Near buildings and poles, moving fast. */}
        <div className="bus-scroll-near" style={scenerySlab(['#0e1526', '#17203a'], 92, 128)} />

        {/* Road. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 46,
            background: '#15161d',
            borderTop: '2px solid #2a2b36',
          }}
        />
        <div className="bus-scroll-near" style={roadDashes()} />

        {/* The window frame and you in it. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 104,
            height: 108,
            borderRadius: 8,
            border: '3px solid #3c4660',
            background: 'rgba(10,14,24,0.35)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <Passenger />
        </div>
      </div>

      <p style={{ color: '#9aa4b8', maxWidth: 460, lineHeight: 1.6, margin: 0 }}>
        {caption ?? 'The window is cold. The town goes past in the dark.'}
      </p>

      <div
        style={{
          width: 'min(70vw, 320px)',
          height: 3,
          borderRadius: 2,
          background: '#223047',
          overflow: 'hidden',
        }}
      >
        <div
          className="deal-countdown"
          style={{
            height: '100%',
            background: '#8ad4ff',
            animationDuration: `${RIDE_MS}ms`,
          }}
        />
      </div>

      <button
        onClick={onArrive}
        style={{
          background: 'transparent',
          color: '#bcc8da',
          border: '1px solid #35507a',
          borderRadius: 4,
          padding: '6px 14px',
          fontFamily: 'monospace',
          cursor: 'pointer',
          fontSize: 13,
        }}
      >
        {done ? 'Step off' : 'Skip the ride'}
      </button>
    </div>
  )
}

/** A band of blocky buildings, repeated twice so it can scroll seamlessly. */
function scenerySlab(colors: [string, string] | string[], top: number, height: number) {
  const [dark, light] = colors
  // Drawn as a repeating gradient so no images are needed, matching the way the
  // rest of the game generates its art at runtime.
  return {
    position: 'absolute' as const,
    left: 0,
    top,
    height,
    width: '200%',
    backgroundImage: `repeating-linear-gradient(90deg,
      ${dark} 0 18px, transparent 18px 26px,
      ${light} 26px 52px, transparent 52px 64px,
      ${dark} 64px 96px, transparent 96px 108px)`,
    backgroundSize: '50% 100%',
  }
}

function roadDashes() {
  return {
    position: 'absolute' as const,
    left: 0,
    bottom: 20,
    height: 4,
    width: '200%',
    backgroundImage:
      'repeating-linear-gradient(90deg, #4a4a58 0 26px, transparent 26px 56px)',
    backgroundSize: '50% 100%',
  }
}

/** You, seen through the window: head, shoulders, and a bag on your lap. */
function Passenger() {
  return (
    <div className="bus-bob" style={{ width: 52, height: 72, position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: 13,
          top: 6,
          width: 26,
          height: 24,
          borderRadius: 5,
          background: '#d9a07a',
          border: '2px solid #15151c',
        }}
      />
      <div
        style={{ position: 'absolute', left: 11, top: 2, width: 30, height: 9, background: '#2b2118' }}
      />
      <div style={{ position: 'absolute', left: 19, top: 16, width: 4, height: 3, background: '#15151c' }} />
      <div style={{ position: 'absolute', left: 29, top: 16, width: 4, height: 3, background: '#15151c' }} />
      <div
        style={{
          position: 'absolute',
          left: 6,
          top: 32,
          width: 40,
          height: 34,
          borderRadius: '6px 6px 0 0',
          background: '#3a9d5c',
          border: '2px solid #15151c',
        }}
      />
      {/* The night's money, held on the lap. */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          top: 48,
          width: 20,
          height: 13,
          borderRadius: 2,
          background: '#4a3324',
          border: '2px solid #15151c',
        }}
      />
    </div>
  )
}
