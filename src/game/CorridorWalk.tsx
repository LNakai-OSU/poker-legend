import { useEffect, useRef, useState } from 'react'
import type { ReelLine } from '../world/events'
import { HERO_FIGURE } from '../overworld/casting'
import { drawPerson, type WalkFrame } from '../overworld/characterArt'
import { isActionKey, useKeyLayer } from './keys'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { Raster } from './pixel/raster'
import { drawText } from './pixel/font'
import { playSound } from '../audio/audio'

/**
 * The walk down the back corridor to the restroom, at the street's own pixel
 * density: a long hall that scrolls with you — brick over dark wainscot,
 * sconces throwing warm pools on a red runner, framed champions, a vending
 * machine and a fire extinguisher going by — and a door at the far end that
 * swings open on the light as you reach it. The sprite is the one you walk the
 * street in, at the same size, with its shadow and its walk cycle.
 */

const VIEW_W = 320
const VIEW_H = 180
const WORLD_W = 760
const FLOOR_Y = 124
const FEET_Y = 168
const DOOR_X = 668
const SPEED = 92 // art pixels a second
const START_X = 24
const THEME = TABLE_THEMES.finale

/** A cheap stable noise, so the bricks are never the same twice and never change. */
function noise(x: number, y: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
  h = (h ^ (h >>> 13)) >>> 0
  return (h % 1000) / 1000
}

function drawHall(): Raster {
  const r = new Raster(WORLD_W, VIEW_H)
  // Ceiling, and its moulding.
  r.rect(0, 0, WORLD_W, 16, '#17121f')
  r.rect(0, 14, WORLD_W, 3, '#3a2c44')
  r.rect(0, 17, WORLD_W, 1, '#0e0a14')
  for (let x = 40; x < WORLD_W; x += 120) {
    r.rect(x, 4, 60, 4, '#2a2236')
    r.rect(x + 2, 5, 56, 2, '#6a5a70')
  }
  // The brick wall, course by course, each brick its own shade.
  const brick = ['#4a2a2e', '#523036', '#44262c', '#5a3639']
  for (let row = 0; row < 18; row++) {
    const y = 18 + row * 6
    if (y >= 92) break
    for (let x = (row % 2 ? -7 : 0); x < WORLD_W; x += 15) {
      const n = noise(x, row)
      r.rect(x, y, 14, 5, brick[Math.floor(n * brick.length)])
      r.rect(x, y, 14, 1, '#6a4246')
      r.rect(x, y + 4, 14, 1, '#321c20')
    }
    r.rect(0, y + 5, WORLD_W, 1, '#241216')
  }
  // The wainscot: dark wood panels under a gold rail.
  r.rect(0, 92, WORLD_W, 2, '#c8a040')
  r.rect(0, 94, WORLD_W, 1, '#6a5018')
  r.rect(0, 95, WORLD_W, FLOOR_Y - 95, '#2a1a14')
  for (let x = 0; x < WORLD_W; x += 36) {
    r.rect(x + 3, 99, 30, 21, '#3a2418')
    r.rect(x + 3, 99, 30, 1, '#5a3a28')
    r.rect(x + 3, 119, 30, 1, '#1a0e0a')
    r.rect(x + 3, 99, 1, 21, '#5a3a28')
  }
  r.rect(0, FLOOR_Y - 3, WORLD_W, 3, '#1a0e0a')
  // The floor: dark marble, then the runner down the middle.
  for (let y = FLOOR_Y; y < VIEW_H; y += 8) {
    for (let x = 0; x < WORLD_W; x += 16) {
      const dark = ((x / 16 + y / 8) | 0) % 2 === 0
      r.rect(x, y, 16, 8, dark ? '#1c1a26' : '#24222e')
    }
  }
  r.rect(0, FLOOR_Y, WORLD_W, 1, '#3a3648')
  r.rect(0, 144, WORLD_W, 28, '#6a1620')
  r.rect(0, 144, WORLD_W, 2, '#c8a040')
  r.rect(0, 170, WORLD_W, 2, '#c8a040')
  for (let x = 0; x < WORLD_W; x += 20) {
    r.rect(x + 8, 154, 4, 8, '#8a2630')
    r.rect(x + 6, 156, 8, 4, '#8a2630')
  }
  r.rect(0, 146, WORLD_W, 1, '#4a0e16')
  // Framed champions on the brick: a head, a pair of shoulders, a brass plate.
  for (const [fx, skin, shirt] of [[110, '#e0b890', '#2a4a8a'], [200, '#8a5a3a', '#7a2a2a'], [310, '#c8905f', '#2a6a4a'], [440, '#5e3a22', '#6a6a2a'], [560, '#f2cfa8', '#4a3a6a']] as const) {
    r.rect(fx, 34, 28, 38, '#c8a040')
    r.rect(fx + 2, 36, 24, 34, '#14101a')
    r.ellipse(fx + 8, 42, 12, 13, skin)
    r.rect(fx + 5, 56, 18, 13, shirt)
    r.rect(fx + 9, 72, 10, 2, '#f8d048')
  }
  // The sconces: a brass bracket and a lamp on the brick.
  for (let x = 60; x < WORLD_W; x += 118) {
    r.rect(x - 1, 44, 6, 3, '#8a6a20')
    r.rect(x, 36, 4, 9, '#c8a040')
    r.rect(x - 2, 30, 8, 7, '#f8e8a0')
    r.rect(x - 2, 30, 8, 1, '#fffff0')
  }
  // A fire extinguisher, a plant, a vending machine, a staff door.
  r.rect(268, 74, 8, 22, '#c02020')
  r.rect(270, 70, 4, 4, '#2a2a34')
  r.rect(268, 80, 8, 3, '#f4f0d8')
  r.rect(480, 100, 18, 22, '#6a3a1a')
  for (let i = 0; i < 12; i++) {
    r.rect(484 + ((i * 5) % 14), 84 + ((i * 7) % 18), 3, 7, i % 2 ? '#2f8a3a' : '#48b050')
  }
  r.rect(372, 70, 34, 52, '#2a3a8a')
  r.rect(374, 72, 30, 34, '#10204a')
  for (let i = 0; i < 12; i++) r.rect(377 + (i % 3) * 9, 75 + Math.floor(i / 3) * 8, 7, 6, ['#e0605d', '#f8d048', '#58c8a0', '#e8e8f0'][i % 4])
  r.rect(374, 108, 30, 4, '#0a0a14')
  r.rect(392, 112, 10, 6, '#1a1a24')
  r.rect(158, 56, 26, 66, '#4a4a58')
  r.rect(160, 58, 22, 62, '#5a5a6a')
  r.rect(162, 76, 3, 5, '#c8a040')
  r.rect(160, 44, 22, 8, '#e8ecea')
  drawText(r, 'STAFF', 163, 46, '#a8281f')
  // The restroom door at the end of the hall.
  r.rect(DOOR_X - 8, 40, 44, 84, '#2a1a14')
  r.rect(DOOR_X - 6, 42, 40, 80, '#14101a')
  r.rect(DOOR_X - 10, 26, 48, 12, '#e8ecea')
  r.rect(DOOR_X - 10, 26, 48, 1, '#ffffff')
  drawText(r, 'RESTROOMS', DOOR_X - 6, 29, '#2a2a34')
  return r
}

const HALL = drawHall()
let hallCanvas: HTMLCanvasElement | null = null
const hallPicture = () => (hallCanvas ??= HALL.toCanvas())

export function CorridorWalk({ lines, onDone }: { lines: ReelLine[]; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [thought, setThought] = useState<ReelLine | null>(null)
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  const finished = useRef(false)
  const isTop = useKeyLayer(true)

  const done = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // What you are thinking stops you in the hall until you have read it: a
  // thought is turned with Space (or E, X, Enter, a tap), never by the clock.
  const pause = useRef<ReelLine | null>(null)
  const nextThought = useRef(0)
  const press = () => {
    if (!pause.current) return
    playSound('dialogue')
    pause.current = null
    setThought(null)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isActionKey(e) || !isTop()) return
      e.preventDefault()
      if (!e.repeat) press()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    let frame = 0
    let last = performance.now()
    // Time spent walking: it stops while a thought is up.
    let t = 0
    const draw = () => {
      const el = canvas.current
      const now = performance.now()
      if (!pause.current) t += now - last
      last = now
      if (el) {
        const c = el.getContext('2d')!
        c.imageSmoothingEnabled = false
        const reach = DOOR_X - 6
        const heroX = Math.min(reach + 16, START_X + (t / 1000) * SPEED)
        const arrived = heroX >= reach
        // A thought comes at set points along the hall, and holds you there.
        const stops = [START_X + 120, START_X + 400]
        const due = lines[nextThought.current]
        if (due && heroX >= stops[nextThought.current] && !pause.current) {
          pause.current = due
          nextThought.current += 1
          setThought(due)
          playSound('dialogue')
        }
        const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, heroX - 150))
        // The hall.
        c.clearRect(0, 0, VIEW_W, VIEW_H)
        c.drawImage(hallPicture(), camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H)
        // The door swings on its hinge as you reach it, and the room spills light.
        const open = Math.max(0, Math.min(1, (heroX - (reach - 40)) / 50))
        if (open > 0) {
          const dx = DOOR_X - 6 - camX
          c.fillStyle = '#e8f0e0'
          c.fillRect(dx, 42, 40, 80)
          c.fillStyle = '#9db3ae'
          for (let y = 42; y < 122; y += 10) c.fillRect(dx, y, 40, 1)
          const leaf = Math.round(40 * (1 - open))
          c.fillStyle = '#5a3a2a'
          c.fillRect(dx, 42, leaf, 80)
          c.fillStyle = '#3a2418'
          c.fillRect(dx + 2, 44, Math.max(0, leaf - 4), 76)
          c.fillStyle = 'rgba(232,240,224,0.18)'
          c.fillRect(dx - 40, FLOOR_Y, 80, VIEW_H - FLOOR_Y)
        }
        // Lamp glow: pools on the brick and the floor, in steps so it stays pixel art.
        for (let x = 60; x < WORLD_W; x += 118) {
          const sx = x + 2 - camX
          if (sx < -40 || sx > VIEW_W + 40) continue
          const flick = x === 178 && Math.floor(t / 110) % 9 === 0 ? 0.5 : 1
          for (const [rad, a] of [[44, 0.05], [32, 0.06], [20, 0.08]] as const) {
            c.fillStyle = `rgba(255,214,120,${a * flick})`
            c.beginPath()
            c.ellipse(sx, 36, rad, rad * 0.9, 0, 0, Math.PI * 2)
            c.fill()
          }
          c.fillStyle = `rgba(255,214,120,${0.07 * flick})`
          c.beginPath()
          c.ellipse(sx, 150, 40, 9, 0, 0, Math.PI * 2)
          c.fill()
        }
        // The emergency strip along the skirting, pulsing.
        const pulse = 0.5 + 0.5 * Math.sin(t / 380)
        c.fillStyle = `rgba(210,40,40,${0.35 + 0.4 * pulse})`
        c.fillRect(0, FLOOR_Y - 1, VIEW_W, 2)
        // You: shadow first, then the sprite, with a small bob on the steps.
        const walking = !arrived && !pause.current
        const frame3 = (walking ? Math.floor(t / 150) % 3 : 0) as WalkFrame
        const bob = walking && frame3 !== 0 ? 1 : 0
        const sx = Math.round(heroX - camX)
        c.fillStyle = 'rgba(0,0,0,0.35)'
        c.beginPath()
        c.ellipse(sx + 16, FEET_Y + 1, 14, 3, 0, 0, Math.PI * 2)
        c.fill()
        // Past the door frame you are in the room: the sprite fades into the light.
        const into = arrived ? Math.min(1, (heroX - reach) / 16) : 0
        c.globalAlpha = 1 - into
        drawPerson(c, HERO_FIGURE, 'right', frame3, { x: sx, y: FEET_Y - 48 - bob * 2, scale: 2 })
        c.globalAlpha = 1
        // Dust in the lamp light.
        for (let i = 0; i < 26; i++) {
          const px = (i * 47 + t / (30 + (i % 5) * 9)) % VIEW_W
          const py = 20 + ((i * 29 + Math.sin(t / 900 + i) * 6) % 100)
          c.fillStyle = `rgba(255,236,190,${0.18 + 0.15 * ((i + Math.floor(t / 300)) % 3 === 0 ? 1 : 0)})`
          c.fillRect(Math.floor(px), Math.floor(py), 1, 1)
        }
        // The edges of the screen fall into the dark.
        const g = c.createLinearGradient(0, 0, VIEW_W, 0)
        g.addColorStop(0, 'rgba(0,0,0,0.55)')
        g.addColorStop(0.2, 'rgba(0,0,0,0)')
        g.addColorStop(0.8, 'rgba(0,0,0,0)')
        g.addColorStop(1, 'rgba(0,0,0,0.55)')
        c.fillStyle = g
        c.fillRect(0, 0, VIEW_W, VIEW_H)
        if (arrived && t > ((reach + 16 - START_X) / SPEED) * 1000 + 900) done()
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  const P = Math.max(2, Math.floor(Math.min(size.w / VIEW_W, (size.h - 12 * 6) / VIEW_H, 5)))

  return (
    <div data-testid="corridor" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: 8 }}>
      <canvas
        ref={canvas}
        width={VIEW_W}
        height={VIEW_H}
        style={{ width: VIEW_W * P, height: VIEW_H * P, imageRendering: 'pixelated', display: 'block', flex: 'none' }}
      />
      <Panel
        theme={THEME}
        scale={P}
        testId="corridor-line"
        style={{ width: VIEW_W * P, boxSizing: 'border-box', padding: `${3 * P}px ${4 * P}px`, minHeight: 22 * P, marginTop: 2 * P, flex: 'none' }}
      >
        <PixelText text={thought ? `You: ${thought.text}` : ' '} scale={P} wrap ink={INK.dark} />
      </Panel>
    </div>
  )
}
