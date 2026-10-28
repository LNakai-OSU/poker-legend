import { useEffect, useRef, useState } from 'react'
import type { ReelLine } from '../world/events'
import { playSound } from '../audio/audio'
import { COMMENTATORS, commentatorFor, commentatorUrl, type Commentator } from './commentators'
import type { Expression } from './avatars'
import { isActionKey, useKeyLayer } from './keys'
import { useTouchFirst } from './device'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { Raster } from './pixel/raster'
import { drawText } from './pixel/font'

/**
 * The commentators' booth, in the game's own pixel art.
 *
 * A set drawn in a 256 by 144 grid — the LED wall with the table on it, the
 * truss and its lamps, the desk, the cameras with their tally lights — and the
 * two voices of the broadcast in the same portraits the players at a table
 * have, headsets on. Whoever is speaking has the lit frame and moves their
 * mouth while their line is set out letter by letter; the other one reacts.
 * The words are in the game's pixel type, in the lower third.
 */

const W = 256
const H = 144
const THEME = TABLE_THEMES.finale
/** Letters a second the line is set out at. */
const CPS = 46

/** The set, drawn once. */
function drawSet(): Raster {
  const r = new Raster(W, H)
  // The back wall: bands of dark blue, lighter toward the floor.
  const bands = ['#0a0c1e', '#0d1026', '#10142e', '#141836', '#181d3e', '#1c2246']
  bands.forEach((c, i) => r.rect(0, i * 14, W, 14, c))
  // The truss across the top, with lamps hanging from it.
  r.rect(0, 0, W, 5, '#23233a')
  r.rect(0, 5, W, 1, '#4a4a6a')
  for (let x = 4; x < W; x += 8) r.rect(x, 1, 1, 3, '#3a3a58')
  for (const x of [26, 78, 130, 182, 234]) {
    r.rect(x - 3, 6, 7, 5, '#14141e')
    r.rect(x - 2, 7, 5, 3, '#f4e8a0')
    r.set(x, 6, '#6a6a8a')
  }
  // The LED wall: a frame, a dark screen, and the table on it in miniature.
  r.rect(68, 14, 120, 66, '#0a0a14')
  r.rect(70, 16, 116, 62, '#101a2c')
  r.rect(70, 16, 116, 1, '#2c4468')
  r.rect(70, 77, 116, 1, '#08101e')
  r.ellipse(94, 30, 68, 36, '#2a1a10')
  r.ellipse(96, 32, 64, 32, '#1a5a3a')
  r.ellipse(100, 36, 56, 24, '#1f6b44')
  for (const [sx, sy] of [[112, 28], [128, 25], [144, 28], [112, 66], [128, 69], [144, 66]]) {
    r.rect(sx - 2, sy - 2, 5, 5, '#e8d8b8')
    r.rect(sx - 1, sy - 1, 3, 3, '#7a5a3a')
  }
  for (let i = 0; i < 5; i++) r.rect(112 + i * 7, 45, 5, 7, '#f4f0e0')
  drawText(r, 'LEGENDS INVITATIONAL', 84, 20, '#f8d048', '#5a3a10')
  // Side panels: stacked bars, like a graphics wall.
  for (const x0 of [8, 196]) {
    r.rect(x0, 14, 52, 66, '#0b0e1c')
    for (let i = 0; i < 9; i++) {
      const len = 12 + ((i * 17 + x0) % 32)
      r.rect(x0 + 4, 20 + i * 7, len, 4, i % 3 === 0 ? '#f8d048' : i % 3 === 1 ? '#4a8ad8' : '#d84848')
    }
    r.rect(x0, 14, 52, 1, '#2c3a5c')
  }
  // The floor, polished, taking the colour of the wall.
  r.rect(0, 112, W, 32, '#101428')
  r.rect(0, 112, W, 1, '#3a3f6a')
  for (let y = 116; y < H; y += 6) r.rect(0, y, W, 1, '#161b34')
  // Cameras, one either side, on tripods.
  for (const [cx, flip] of [[18, false], [238, true]] as const) {
    r.rect(cx - 8, 86, 16, 12, '#22222e')
    r.rect(cx - 7, 87, 14, 4, '#3a3a4c')
    r.rect(flip ? cx - 12 : cx + 8, 89, 4, 6, '#14141e')
    r.rect(cx - 1, 98, 2, 18, '#2a2a38')
    r.rect(cx - 8, 116, 16, 2, '#2a2a38')
  }
  // The desk: a long curve of wood with a brushed-metal edge and a plate.
  r.rect(30, 96, 196, 40, '#3a2414')
  r.rect(30, 96, 196, 3, '#7a5230')
  r.rect(30, 99, 196, 1, '#1a0e06')
  r.rect(26, 100, 4, 36, '#2a180c')
  r.rect(226, 100, 4, 36, '#2a180c')
  r.rect(30, 130, 196, 6, '#22140a')
  r.rect(30, 129, 196, 1, '#6a6a7a')
  r.rect(104, 108, 48, 16, '#1a1a26')
  r.rect(105, 109, 46, 14, '#2a2a3c')
  drawText(r, 'LIVE', 119, 113, '#f8f4e0')
  // Monitors on the desk, with traces on them.
  for (const mx of [52, 188]) {
    r.rect(mx, 82, 28, 18, '#0a0a12')
    r.rect(mx + 2, 84, 24, 14, '#12281e')
    for (let i = 0; i < 24; i++) r.set(mx + 2 + i, 92 - Math.round(Math.sin(i * 0.6 + mx) * 3), '#58e090')
    r.rect(mx + 12, 100, 4, 3, '#2a2a38')
  }
  // Mics on their stalks, a bottle of water each, a pad and a pen.
  for (const mx of [94, 162]) {
    r.rect(mx, 90, 1, 10, '#6a6a7a')
    r.rect(mx - 2, 88, 5, 3, '#14141e')
    r.rect(mx - 1, 88, 3, 1, '#7a7a8a')
  }
  for (const bx of [98, 154]) {
    r.rect(bx, 102, 4, 9, '#8ec8f0')
    r.rect(bx, 101, 4, 2, '#e8ecea')
  }
  r.rect(208, 104, 8, 6, '#f4f0d8')
  return r
}

const SET = drawSet()

/** What a commentator's face does at this moment of this line. */
function expressionFor(who: Commentator, text: string, speaking: boolean, mouth: boolean): Expression {
  if (!speaking) return who === 'chip' ? 'glance' : 'thinking'
  const sorry = /sorry|oh no|bad beat|lie|poor|unfortunate/i.test(text)
  const loud = /!/.test(text) && who === 'chip'
  if (mouth) return 'lip-twitch'
  if (sorry) return 'lost'
  if (loud) return 'won'
  return who === 'anand' ? 'thinking' : 'neutral'
}

export function BoothPanel({
  lines,
  ticker,
  onDone,
}: {
  lines: ReelLine[]
  ticker?: string
  onDone: () => void
}) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const [tick, setTick] = useState(0)
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const finished = useRef(false)
  const isTop = useKeyLayer(true)
  const touch = useTouchFirst()
  const line = lines[index]
  const speaker = commentatorFor(line?.who ?? '')
  const typing = line ? shown < line.text.length : false

  // The mouths and the prompt keep time whether or not a line is being set out.
  useEffect(() => {
    const timer = window.setInterval(() => setTick((t) => t + 1), 80)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // The line set out letter by letter; every line announces itself.
  useEffect(() => {
    if (!line) return
    setShown(0)
    playSound('dialogue')
    const start = performance.now()
    const timer = window.setInterval(() => {
      const n = Math.min(line.text.length, Math.floor(((performance.now() - start) / 1000) * CPS))
      setShown(n)
      if (n >= line.text.length) window.clearInterval(timer)
    }, 40)
    return () => window.clearInterval(timer)
  }, [index])

  const advance = () => {
    if (finished.current || !line) return
    if (shown < line.text.length) {
      setShown(line.text.length)
      return
    }
    playSound('dialogue')
    if (index + 1 < lines.length) setIndex(index + 1)
    else {
      finished.current = true
      onDone()
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) advance()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, shown])

  // Draw the set and the lights that move.
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    let frame = 0
    const t0 = performance.now()
    const draw = () => {
      const el = canvas.current
      if (el) {
        const t = performance.now() - t0
        SET.paint(el)
        const c = el.getContext('2d')!
        // Tally lights on the cameras, and the LIVE lamp.
        const on = Math.floor(t / 700) % 2 === 0
        c.fillStyle = on ? '#ff3a3a' : '#7a1818'
        c.fillRect(21, 89, 2, 2)
        c.fillRect(233, 89, 2, 2)
        c.fillRect(112, 112, 3, 3)
        // Stage-light shafts breathing down the wall.
        for (const x of [26, 78, 130, 182, 234]) {
          const a = 0.05 + 0.02 * Math.sin(t / 900 + x)
          c.fillStyle = `rgba(244,232,160,${a})`
          c.beginPath()
          c.moveTo(x - 2, 11)
          c.lineTo(x + 3, 11)
          c.lineTo(x + 16, 108)
          c.lineTo(x - 15, 108)
          c.closePath()
          c.fill()
        }
        // The graphics wall ticks over.
        const bar = Math.floor(t / 600) % 9
        c.fillStyle = '#f8f4e0'
        c.fillRect(12, 20 + bar * 7, 2, 4)
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  const P = Math.max(2, Math.floor(Math.min(size.w / W, size.h / (H + 66), 5)))
  const talk = Math.floor(tick / 3) % 2 === 0

  return (
    <div
      data-testid="booth"
      onClick={advance}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: 4, userSelect: 'none' }}
    >
      <div style={{ position: 'relative', width: W * P, height: H * P, flex: 'none' }}>
        <canvas
          ref={canvas}
          width={W}
          height={H}
          style={{ width: W * P, height: H * P, imageRendering: 'pixelated', display: 'block' }}
        />
        {(['chip', 'anand'] as Commentator[]).map((who) => {
          const speaking = speaker === who
          const left = who === 'chip' ? 40 : 168
          const face = commentatorUrl(who, expressionFor(who, line?.text ?? '', speaking, speaking && typing && talk))
          return (
            <div
              key={who}
              data-testid={`commentator-${who}`}
              data-speaking={speaking ? 'true' : 'false'}
              style={{ position: 'absolute', left: left * P, top: 44 * P, width: 48 * P }}
            >
              <Panel
                theme={THEME}
                scale={P}
                kind={speaking ? 'acting' : 'panel'}
                style={{ padding: 1 * P, filter: speaking ? undefined : 'brightness(0.7)', transition: 'filter 160ms' }}
              >
                <img
                  src={face}
                  alt={COMMENTATORS[who].name}
                  draggable={false}
                  style={{ display: 'block', width: 48 * P, height: 48 * P, imageRendering: 'pixelated' }}
                />
              </Panel>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 2 * P }}>
                <PixelText text={COMMENTATORS[who].name.toUpperCase()} scale={P} ink={speaking ? INK.gold : INK.dim} />
              </div>
            </div>
          )
        })}
      </div>
      {ticker && (
        <div
          data-testid="reel-ticker"
          style={{ width: W * P, boxSizing: 'border-box', background: '#a8281f', padding: `${P}px ${2 * P}px`, display: 'flex', justifyContent: 'space-between', gap: 3 * P }}
        >
          <PixelText text="LIVE" scale={P} ink={{ color: '#f8f4e0', shadow: '#5a1410' }} />
          <PixelText text={ticker} scale={P} ink={{ color: '#f8f4e0', shadow: '#5a1410' }} />
        </div>
      )}
      <Panel
        theme={THEME}
        scale={P}
        testId="booth-line"
        style={{ width: W * P, boxSizing: 'border-box', padding: `${3 * P}px ${4 * P}px`, minHeight: 36 * P, marginTop: 2 * P, flex: 'none' }}
      >
        {speaker && (
          <div style={{ marginBottom: 2 * P }}>
            <PixelText text={`${COMMENTATORS[speaker].name} · ${COMMENTATORS[speaker].tag}`} scale={P} ink={{ color: '#a8281f', shadow: '#e8c8c0' }} />
          </div>
        )}
        <PixelText text={line ? line.text.slice(0, shown) || ' ' : ' '} scale={P} wrap ink={INK.dark} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: P }}>
          {!typing && <PixelText text={touch ? 'tap ▸' : 'space ▸'} scale={P} ink={{ color: '#8a8a98', shadow: '#dcdce4' }} style={{ opacity: Math.floor(tick / 6) % 2 ? 0.3 : 1 }} />}
        </div>
      </Panel>
    </div>
  )
}
