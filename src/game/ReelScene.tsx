import { useEffect, useRef, useState } from 'react'
import type { ReelPanel } from '../world/events'
import { CHARACTERS } from '../world/characters'
import { DialogueBox } from './DialogueBox'
import { REEL_H, REEL_W, drawReel } from './reelArt'

/**
 * A short film in front of the street: a set drawn at runtime, a ticker if it
 * is the broadcast, and its lines turned like any text box. Skippable — a
 * replayed final should not make the player sit through the road again.
 */
export function ReelScene({
  title,
  panels,
  onDone,
}: {
  title?: string
  panels: ReelPanel[]
  onDone: () => void
}) {
  const [at, setAt] = useState({ panel: 0, line: 0 })
  const finished = useRef(false)
  const panel = panels[at.panel]
  const line = panel?.lines[at.line]

  const done = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

  // An empty panel has nothing to turn; move past it rather than stall on it.
  useEffect(() => {
    if (!panel) done()
    else if (!line) next()
  })

  const next = () => {
    if (at.line + 1 < panel.lines.length) setAt({ panel: at.panel, line: at.line + 1 })
    else if (at.panel + 1 < panels.length) setAt({ panel: at.panel + 1, line: 0 })
    else done()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      done()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!panel || !line) return null
  const speaker = CHARACTERS[line.who]?.name ?? line.who
  // A line written "Marcus: …" is not introduced twice.
  const text = line.text.startsWith(`${speaker}: `) ? line.text.slice(speaker.length + 2) : line.text

  return (
    <div
      data-testid="reel"
      data-title={title ?? ''}
      data-scene={panel.scene}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 96,
        background: '#05040a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        animation: 'fade-in 420ms ease-out both',
      }}
    >
      <ReelCanvas key={at.panel} scene={panel.scene} />
      {panel.ticker && (
        <div
          data-testid="reel-ticker"
          style={{
            width: REEL_WIDTH,
            boxSizing: 'border-box',
            background: '#a8281f',
            color: '#f8f4e0',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            fontSize: 14,
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>● LIVE · LEGENDS INVITATIONAL</span>
          <span>{panel.ticker}</span>
        </div>
      )}
      {panel.caption && (
        <div
          data-testid="reel-caption"
          style={{ color: '#9a9ab0', fontFamily: 'monospace', fontStyle: 'italic', padding: '10px 16px', textAlign: 'center', maxWidth: 640 }}
        >
          {panel.caption}
        </div>
      )}
      <button
        data-testid="reel-skip"
        onClick={done}
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'rgba(10,10,16,0.8)',
          color: '#9a9ab0',
          border: '1px solid #4a4a66',
          borderRadius: 4,
          padding: '4px 10px',
          fontFamily: 'monospace',
          cursor: 'pointer',
        }}
      >
        Skip ▸▸
      </button>
      <DialogueBox key={`${at.panel}-${at.line}`} speaker={speaker} lines={[text]} onFinish={next} />
    </div>
  )
}

/** As wide as the picture can be and still leave the text box room beneath it. */
const REEL_WIDTH = `min(100vw, 960px, calc(55vh * ${REEL_W} / ${REEL_H}))`

/** One set, redrawn each frame so lights flicker and tears fall. */
function ReelCanvas({ scene }: { scene: ReelPanel['scene'] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = () => {
      if (ref.current) drawReel(ref.current, scene, performance.now() - start)
      frame = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(frame)
  }, [scene])
  return (
    <canvas
      ref={ref}
      width={REEL_W}
      height={REEL_H}
      style={{
        width: REEL_WIDTH,
        aspectRatio: `${REEL_W} / ${REEL_H}`,
        imageRendering: 'pixelated',
        background: '#000',
      }}
    />
  )
}
