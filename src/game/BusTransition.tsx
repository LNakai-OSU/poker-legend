import { useEffect, useState } from 'react'

/**
 * Inside the bus, rather than a caption about one.
 *
 * Travel used to be a paragraph of text and a button, and then a shot of the bus
 * from the outside — which is nobody's experience of a bus. Since the world is
 * one continuous place you could have walked, the ride has to feel like time
 * passing in it: you are sat in the gangway with other people, the town goes past
 * the windows, and it ends on its own.
 */

interface BusTransitionProps {
  /** Where the bus is going, for the destination blind at the front. */
  destination?: string
  /** A line to sit under the window while it moves. */
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

  // Arriving is automatic; the button is there for anyone who would rather not
  // wait, which is the same bargain the table makes between hands.
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
        // Without this the padding is added *to* the full viewport height, so the
        // scene is always exactly its own padding taller than the window.
        boxSizing: 'border-box',
        background: '#0a0d16',
        color: '#e8e8f0',
        fontFamily: 'monospace',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        textAlign: 'center',
        padding: 20,
        overflow: 'hidden',
      }}
    >
      <div style={{ letterSpacing: 2, color: '#8ad4ff', fontSize: 13 }}>
        {destination ? `THE 14 — ${destination.toUpperCase()}` : 'THE 14'}
      </div>

      <div className="bus-cabin" style={cabinStyle}>
        {/* Ceiling, with the grab rail running the length of it. */}
        <div style={ceilingStyle} />
        <div style={railStyle} />

        {/* The windows down the far side, with the town going past. */}
        <div style={windowBandStyle}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={windowStyle}>
              <div className="bus-scroll-far" style={scenerySlab('#1b2742', '#223055', 10, 40)} />
              <div className="bus-scroll-near" style={scenerySlab('#0b1220', '#151d33', 36, 34)} />
              <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 12, background: '#15161d' }} />
            </div>
          ))}
        </div>

        {/* The far row of seats, and the people in them. */}
        <div style={farSeatRowStyle}>
          <Passenger seat="#8a4fbd" skin="#8d5a3b" hair="#241a12" bob={0} />
          <Passenger seat="#2f6ea8" skin="#e0b48c" hair="#5c3a22" bob={1} asleep />
          <Passenger seat="#8a4fbd" skin="#c08552" hair="#141414" bob={2} />
        </div>

        {/* The gangway, running away from you down the bus. */}
        <div style={gangwayStyle} />

        {/* The near row: the backs of two seats, and you in the aisle one. */}
        <div style={nearSeatRowStyle}>
          <SeatBack />
          <You />
          <SeatBack />
        </div>
      </div>

      <p style={{ color: '#9aa4b8', maxWidth: 460, lineHeight: 1.6, margin: 0, fontSize: 13 }}>
        {caption ?? 'The window is cold. The town goes past in the dark.'}
      </p>

      <div style={progressTrackStyle}>
        <div
          className="deal-countdown"
          style={{ height: '100%', background: '#8ad4ff', animationDuration: `${RIDE_MS}ms` }}
        />
      </div>

      <button onClick={onArrive} style={skipButtonStyle}>
        {done ? 'Step off' : 'Skip the ride'}
      </button>
    </div>
  )
}

const cabinStyle: React.CSSProperties = {
  position: 'relative',
  width: 'min(94vw, 560px)',
  // Shrinks with the window: on a short screen a fixed 250px cabin pushed the
  // caption and the skip button off the bottom.
  height: 'clamp(150px, 34vh, 250px)',
  minHeight: 150,
  flexShrink: 0,
  borderRadius: 12,
  overflow: 'hidden',
  border: '3px solid #2a3348',
  background: 'linear-gradient(180deg, #1b2130 0%, #222a3c 45%, #171d2a 100%)',
  boxShadow: '0 14px 44px rgba(0,0,0,0.6)',
}

const ceilingStyle: React.CSSProperties = {
  position: 'absolute',
  inset: '0 0 auto 0',
  height: 22,
  background: 'linear-gradient(180deg, #2d3650 0%, #212938 100%)',
  borderBottom: '1px solid #171d2a',
}

const railStyle: React.CSSProperties = {
  position: 'absolute',
  top: 26,
  left: 18,
  right: 18,
  height: 3,
  borderRadius: 2,
  background: 'linear-gradient(180deg, #6a7693 0%, #3c4660 100%)',
}

const windowBandStyle: React.CSSProperties = {
  position: 'absolute',
  top: 36,
  left: 16,
  right: 16,
  height: 76,
  display: 'flex',
  gap: 10,
}

const windowStyle: React.CSSProperties = {
  position: 'relative',
  flex: 1,
  borderRadius: 6,
  overflow: 'hidden',
  border: '2px solid #3c4660',
  background: 'linear-gradient(180deg, #16213a 0%, #101828 100%)',
}

const farSeatRowStyle: React.CSSProperties = {
  position: 'absolute',
  top: 104,
  left: 16,
  right: 16,
  height: 58,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'flex-end',
}

const gangwayStyle: React.CSSProperties = {
  position: 'absolute',
  top: 158,
  left: 0,
  right: 0,
  height: 34,
  background: 'linear-gradient(180deg, #2a3142 0%, #1d2330 100%)',
  borderTop: '1px solid #39425a',
}

/**
 * Anchored from the top, not the bottom.
 *
 * The cabin shrinks on a short window, and a row pinned to the bottom would walk
 * up into the gangway and the far seats as it did. Measured from the top, a short
 * cabin simply crops the near row — which is what an interior shot looks like
 * anyway, since you are sitting in it.
 */
const nearSeatRowStyle: React.CSSProperties = {
  position: 'absolute',
  top: 186,
  left: 10,
  right: 10,
  height: 64,
  display: 'flex',
  justifyContent: 'space-around',
  alignItems: 'flex-end',
}

const progressTrackStyle: React.CSSProperties = {
  width: 'min(70vw, 320px)',
  height: 3,
  borderRadius: 2,
  background: '#223047',
  overflow: 'hidden',
}

const skipButtonStyle: React.CSSProperties = {
  background: 'transparent',
  color: '#bcc8da',
  border: '1px solid #35507a',
  borderRadius: 4,
  padding: '6px 14px',
  fontFamily: 'monospace',
  cursor: 'pointer',
  fontSize: 13,
}

/** A band of blocky buildings, repeated twice so it can scroll seamlessly. */
function scenerySlab(dark: string, light: string, top: number, height: number): React.CSSProperties {
  return {
    position: 'absolute',
    left: 0,
    top,
    height,
    width: '200%',
    backgroundImage: `repeating-linear-gradient(90deg,
      ${dark} 0 14px, transparent 14px 20px,
      ${light} 20px 40px, transparent 40px 50px,
      ${dark} 50px 74px, transparent 74px 84px)`,
    backgroundSize: '50% 100%',
  }
}

/** Somebody else on the bus, seen from behind and a little to the side. */
function Passenger({
  seat,
  skin,
  hair,
  bob,
  asleep,
}: {
  seat: string
  skin: string
  hair: string
  bob: number
  asleep?: boolean
}) {
  return (
    <div
      className="bus-bob"
      style={{ position: 'relative', width: 46, height: 54, animationDelay: `${bob * 190}ms` }}
    >
      {/* Head, tipped if they are asleep against the glass. */}
      <div
        style={{
          position: 'absolute',
          left: 13,
          top: 4,
          width: 20,
          height: 18,
          borderRadius: 4,
          background: skin,
          border: '2px solid #15151c',
          transform: asleep ? 'rotate(-14deg)' : undefined,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 1,
          width: 22,
          height: 7,
          background: hair,
          transform: asleep ? 'rotate(-14deg)' : undefined,
        }}
      />
      {/* Shoulders above the seat back. */}
      <div
        style={{
          position: 'absolute',
          left: 7,
          top: 22,
          width: 32,
          height: 14,
          borderRadius: '5px 5px 0 0',
          background: '#3a4256',
          border: '2px solid #15151c',
        }}
      />
      {/* The seat itself. */}
      <div
        style={{
          position: 'absolute',
          left: 4,
          bottom: 0,
          width: 38,
          height: 22,
          borderRadius: '4px 4px 0 0',
          background: seat,
          border: '2px solid #15151c',
        }}
      />
    </div>
  )
}

/** An empty seat in the near row, seen from behind. */
function SeatBack() {
  return (
    <div
      style={{
        width: 64,
        height: 46,
        borderRadius: '6px 6px 0 0',
        background: 'linear-gradient(180deg, #4a3f6b 0%, #332b4c 100%)',
        border: '2px solid #15151c',
        borderBottom: 'none',
      }}
    />
  )
}

/** You, in the aisle seat, with the night's money on your lap. */
function You() {
  return (
    <div className="bus-bob" style={{ position: 'relative', width: 72, height: 62 }}>
      <div
        style={{
          position: 'absolute',
          left: 23,
          top: 0,
          width: 26,
          height: 22,
          borderRadius: 5,
          background: '#d9a07a',
          border: '2px solid #15151c',
        }}
      />
      <div style={{ position: 'absolute', left: 21, top: -3, width: 30, height: 9, background: '#2b2118' }} />
      {/* Shoulders, in the green jacket the overworld sprite wears. */}
      <div
        style={{
          position: 'absolute',
          left: 12,
          top: 22,
          width: 48,
          height: 18,
          borderRadius: '6px 6px 0 0',
          background: '#3a9d5c',
          border: '2px solid #15151c',
        }}
      />
      {/* The bag, held on the lap. */}
      <div
        style={{
          position: 'absolute',
          left: 26,
          top: 34,
          width: 20,
          height: 12,
          borderRadius: 2,
          background: '#4a3324',
          border: '2px solid #15151c',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 4,
          bottom: 0,
          width: 64,
          height: 22,
          borderRadius: '6px 6px 0 0',
          background: 'linear-gradient(180deg, #5a4d80 0%, #3d3459 100%)',
          border: '2px solid #15151c',
          borderBottom: 'none',
        }}
      />
    </div>
  )
}
