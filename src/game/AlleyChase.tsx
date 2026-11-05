import { useEffect, useRef, useState } from 'react'
import type { ReelLine } from '../world/events'
import { COLLECTOR_FIGURE, HERO_FIGURE } from '../overworld/casting'
import { drawPerson, type Figure, type WalkFrame } from '../overworld/characterArt'
import { isActionKey, useKeyLayer } from './keys'
import { TABLE_THEMES } from './tableThemes'
import { Panel } from './pixel/ui'
import { PixelText } from './pixel/PixelText'
import { INK } from './pixel/ink'
import { useCrispScale } from './useCrispScale'
import { Raster } from './pixel/raster'
import { drawText } from './pixel/font'
import { playSound } from '../audio/audio'

/**
 * Out the back of the casino with the sponsors' men behind you: a long wet
 * alley that scrolls past at a run, at the street's own pixel density. A far
 * skyline moves slower than the brick, the brick slower than the kerb; lamps
 * flicker over puddles, steam leaks from a vent, rain falls across it all. You
 * are the sprite you walk the street in, at a sprint with your feet kicking up
 * spray, and four men in suits come through the staff door after you.
 *
 * What you are thinking turns the world to slow motion rather than stopping it
 * dead, until you press a key to read on: nothing here moves on a clock the
 * player has not agreed to.
 */

const VIEW_W = 320
const VIEW_H = 180
const WORLD_W = 1040
const GROUND_Y = 122
const FEET_Y = 166
const DOOR_X = 26
const START_X = 56
const END_X = 960
const RUN_SPEED = 118 // art pixels a second
const SLOW = 0.07

/** A cheap stable noise, so the brick is never the same twice and never changes. */
function noise(x: number, y: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177)
  h = (h ^ (h >>> 13)) >>> 0
  return (h % 1000) / 1000
}

/** The far city: a sky going from violet to wine over a skyline with lit windows and a lit casino tower. */
function drawSky(): Raster {
  const w = Math.round(WORLD_W * 0.35) + VIEW_W
  const r = new Raster(w, VIEW_H)
  const bands = ['#0b0a1c', '#100d26', '#17112e', '#1f1536', '#291a3c', '#351f40', '#44244a']
  bands.forEach((c, i) => r.rect(0, i * 18, w, 19, c))
  for (let i = 0; i < 34; i++) r.rect(Math.floor(noise(i, 3) * w), Math.floor(noise(i, 9) * 50), 1, 1, i % 4 ? '#7a7aa8' : '#f4f0d8')
  // The moon, behind a thin cloud.
  r.ellipse(w - 70, 22, 11, 11, '#d8d4c0')
  r.ellipse(w - 67, 20, 9, 9, '#e8e4d0')
  r.rect(w - 90, 24, 40, 2, '#3a2c52')
  const base = GROUND_Y + 6
  for (let x = 0, i = 0; x < w; i++) {
    const bw = 14 + Math.floor(noise(i, 1) * 22)
    const bh = 34 + Math.floor(noise(i, 2) * 52)
    r.rect(x, base - bh, bw, bh, i % 2 ? '#1a1430' : '#150f28')
    r.rect(x, base - bh, bw, 1, '#2c2248')
    for (let wy = base - bh + 5; wy < base - 4; wy += 6) {
      for (let wx = x + 3; wx < x + bw - 3; wx += 5) if (noise(wx, wy) > 0.62) r.rect(wx, wy, 2, 3, noise(wx, wy) > 0.9 ? '#f2c14e' : '#6a5a3a')
    }
    x += bw + 1
  }
  // The casino tower, lit from its base, with the crest on its crown.
  const tx = Math.round(w * 0.58)
  r.rect(tx, base - 112, 22, 112, '#241a3e')
  r.rect(tx + 1, base - 112, 20, 112, '#2c2048')
  for (let y = base - 106; y < base - 8; y += 5) r.rect(tx + 3, y, 16, 2, y % 10 === 0 ? '#f2c14e' : '#c89a3a')
  r.rect(tx + 8, base - 122, 6, 10, '#f2c14e')
  r.rect(tx + 10, base - 130, 2, 8, '#f2c14e')
  return r
}

function drawBrick(r: Raster, x0: number, x1: number, y0: number, y1: number) {
  const brick = ['#3e2530', '#47293a', '#38202a', '#4e2c36']
  for (let row = 0; y0 + row * 6 < y1; row++) {
    const y = y0 + row * 6
    for (let x = x0 + (row % 2 ? -7 : 0); x < x1; x += 15) {
      const n = noise(x, row)
      r.rect(x, y, 14, 5, brick[Math.floor(n * brick.length)])
      r.rect(x, y, 14, 1, '#5c3a48')
      r.rect(x, y + 4, 14, 1, '#2a161e')
    }
    r.rect(x0, y + 5, x1 - x0, 1, '#1e1018')
  }
}

function drawDumpster(r: Raster, x: number, colour: string, lid: string) {
  const y = GROUND_Y + 6
  r.rect(x, y - 24, 46, 24, colour)
  r.rect(x, y - 24, 46, 2, lid)
  r.rect(x - 1, y - 28, 48, 5, lid)
  r.rect(x, y - 24, 46, 1, '#ffffff22')
  for (let i = 0; i < 4; i++) r.rect(x + 4 + i * 11, y - 20, 2, 18, '#00000033')
  r.rect(x + 4, y, 4, 3, '#14121a')
  r.rect(x + 38, y, 4, 3, '#14121a')
  r.rect(x + 10, y - 6, 20, 1, '#00000044')
}

function drawFireEscape(r: Raster, x: number, y0: number) {
  const iron = '#0e0c14'
  const lit = '#2a2638'
  // Landing, rail, and the zigzag stair.
  r.rect(x, y0, 120, 3, iron)
  r.rect(x, y0 - 12, 120, 1, iron)
  for (let i = 0; i <= 12; i++) r.rect(x + i * 10, y0 - 12, 1, 12, iron)
  for (let s = 0; s < 8; s++) {
    r.rect(x + 84 + s * 4, y0 + 3 + s * 6, 14, 2, iron)
    r.rect(x + 84 + s * 4, y0 + 3 + s * 6 - 1, 14, 1, lit)
  }
  r.rect(x + 80, y0 + 3, 2, 48, iron)
  r.rect(x + 98, y0 + 3, 2, 48, iron)
  r.rect(x + 4, y0 + 3, 2, 8, iron)
  r.rect(x + 114, y0 + 3, 2, 8, iron)
}

function drawAlley(): Raster {
  const r = new Raster(WORLD_W, VIEW_H)
  // The wall: a dark upper storey, then brick, then a damp course at the foot.
  r.rect(0, 0, WORLD_W, 30, '#120d1c')
  r.rect(0, 28, WORLD_W, 3, '#2e2240')
  drawBrick(r, 0, WORLD_W, 31, GROUND_Y)
  for (let x = 0; x < WORLD_W; x += 8) {
    const n = noise(x, 77)
    if (n > 0.55) r.rect(x, GROUND_Y - 8 - Math.floor(n * 10), 8, 12 + Math.floor(n * 10), '#2a1a22')
  }
  r.rect(0, GROUND_Y - 3, WORLD_W, 3, '#1a1018')
  // Barred windows, a drainpipe between each pair.
  for (let x = 230; x < END_X - 40; x += 170) {
    r.rect(x, 44, 22, 28, '#0a0812')
    r.rect(x - 2, 42, 26, 3, '#4a3a4a')
    for (let b = 0; b < 4; b++) r.rect(x + 3 + b * 5, 44, 1, 28, '#5a4a5a')
    r.rect(x + 28, 36, 3, GROUND_Y - 36, '#2a2832')
    r.rect(x + 28, 36, 1, GROUND_Y - 36, '#4a4858')
    for (let y = 48; y < GROUND_Y; y += 26) r.rect(x + 26, y, 7, 2, '#1a1820')
  }
  // The loading dock: a raised concrete lip and a shuttered bay.
  r.rect(76, GROUND_Y - 14, 140, 20, '#4a4452')
  r.rect(76, GROUND_Y - 14, 140, 2, '#6a6478')
  for (let y = 54; y < GROUND_Y - 16; y += 4) r.rect(92, y, 108, 3, y % 8 === 0 ? '#5a5a6a' : '#4a4a5a')
  r.rect(92, 50, 108, 3, '#2a2a34')
  r.rect(78, 40, 28, 7, '#e8e4d0')
  drawText(r, 'BAY 3', 82, 41, '#a8281f')
  // The staff door, standing open on the light.
  r.rect(DOOR_X - 4, 40, 40, 86, '#241a26')
  r.rect(DOOR_X, 44, 32, 80, '#f4e8a0')
  r.rect(DOOR_X + 4, 48, 24, 72, '#fff6cc')
  for (let y = 52; y < 120; y += 12) r.rect(DOOR_X, y, 32, 1, '#e8d890')
  r.rect(DOOR_X - 3, 36, 36, 4, '#2a2230')
  r.rect(DOOR_X + 8, 30, 16, 6, '#c82828')
  drawText(r, 'EXIT', DOOR_X + 10, 31, '#fff0e0')
  // Fire escapes, and a cage lamp on the wall every so often.
  drawFireEscape(r, 300, 40)
  drawFireEscape(r, 660, 34)
  for (let x = 150; x < END_X; x += 140) {
    r.rect(x, 60, 8, 10, '#2a2830')
    r.rect(x + 1, 61, 6, 8, '#f2c14e')
    r.rect(x + 3, 70, 2, 5, '#2a2830')
  }
  // Posters, peeling.
  for (const [x, c] of [[250, '#a8281f'], [520, '#2a4a7a'], [790, '#7a6a2a']] as const) {
    r.rect(x, 78, 20, 26, '#d8d0b8')
    r.rect(x + 2, 82, 16, 10, c)
    r.rect(x + 2, 95, 12, 2, '#3a3a44')
    r.rect(x + 2, 99, 8, 2, '#3a3a44')
  }
  // Dumpsters, crates and a stack of tyres standing on the kerb.
  drawDumpster(r, 232, '#2d4a3a', '#1c3226')
  drawDumpster(r, 470, '#3a3a52', '#26263a')
  drawDumpster(r, 740, '#2d4a3a', '#1c3226')
  for (const x of [330, 600, 880]) {
    r.rect(x, GROUND_Y - 16, 18, 22, '#6a4a2a')
    r.rect(x, GROUND_Y - 16, 18, 2, '#8a6a3a')
    r.rect(x + 2, GROUND_Y - 6, 14, 1, '#4a3018')
    r.rect(x + 20, GROUND_Y - 8, 14, 14, '#7a5a30')
  }
  for (let i = 0; i < 3; i++) r.rect(560, GROUND_Y + 2 - i * 5, 14, 5, i % 2 ? '#1a1a1e' : '#222228')
  // The ground: wet asphalt, a kerb, patched seams, puddles with the lamps in them.
  r.rect(0, GROUND_Y + 6, WORLD_W, VIEW_H - GROUND_Y - 6, '#1b1a24')
  r.rect(0, GROUND_Y + 6, WORLD_W, 3, '#3a3848')
  r.rect(0, GROUND_Y + 9, WORLD_W, 1, '#0e0d14')
  for (let y = GROUND_Y + 10; y < VIEW_H; y += 6) {
    for (let x = 0; x < WORLD_W; x += 10) {
      const n = noise(x, y)
      if (n > 0.5) r.rect(x, y, 6 + Math.floor(n * 6), 1, n > 0.8 ? '#2e2c3a' : '#16151e')
    }
  }
  for (let x = 20; x < WORLD_W; x += 56) r.rect(x, FEET_Y + 8, 28, 2, '#8a7a2a')
  for (const [x, y, w] of [[130, 150, 38], [310, 160, 28], [420, 146, 44], [610, 158, 34], [800, 150, 40]] as const) {
    r.rect(x, y, w, 5, '#101424')
    r.rect(x + 2, y, w - 6, 1, '#34406a')
    r.rect(x + 6, y + 2, 8, 1, '#f2c14e55')
  }
  // The mouth of the alley: the street beyond, neon-lit and wet.
  r.rect(END_X + 20, 0, WORLD_W - END_X - 20, VIEW_H, '#0a0614')
  r.rect(END_X + 20, 0, 2, VIEW_H, '#2e2240')
  for (let y = 0; y < VIEW_H; y += 4) r.rect(END_X + 22, y, WORLD_W - END_X - 22, 2, y % 8 ? '#3a1840' : '#5a2058')
  r.rect(END_X + 40, 36, 36, 14, '#ff5a8a')
  drawText(r, 'TAXI', END_X + 46, 40, '#fff0f6')
  r.rect(END_X + 48, 110, 60, 22, '#f2c14e')
  r.rect(END_X + 54, 102, 48, 10, '#f2c14e')
  r.rect(END_X + 58, 104, 18, 8, '#8ab8d8')
  r.rect(END_X + 80, 104, 18, 8, '#8ab8d8')
  r.rect(END_X + 54, 132, 12, 6, '#14121a')
  r.rect(END_X + 90, 132, 12, 6, '#14121a')
  return r
}

const SKY = drawSky()
const ALLEY = drawAlley()
let skyCanvas: HTMLCanvasElement | null = null
let alleyCanvas: HTMLCanvasElement | null = null
const skyPicture = () => (skyCanvas ??= SKY.toCanvas())
const alleyPicture = () => (alleyCanvas ??= ALLEY.toCanvas())

/** The four, a little different from one another, all in the colour the sponsors dress their people in. */
const PURSUERS: Array<{ figure: Figure; gap: number; lag: number }> = [
  { figure: COLLECTOR_FIGURE, gap: 52, lag: 0 },
  { figure: { ...COLLECTOR_FIGURE, look: { ...COLLECTOR_FIGURE.look, skin: '#e0b890', hair: '#2a2018', hairStyle: 'short' } }, gap: 80, lag: 90 },
  { figure: { ...COLLECTOR_FIGURE, look: { ...COLLECTOR_FIGURE.look, skin: '#8a5a3a', hair: '#0f0f0f' } }, gap: 108, lag: 40 },
  { figure: { ...COLLECTOR_FIGURE, look: { ...COLLECTOR_FIGURE.look, skin: '#f2cfa8', hair: '#a8281f', hairStyle: 'short', accessory: 'none' } }, gap: 138, lag: 150 },
]

function shadow(c: CanvasRenderingContext2D, x: number, y: number, w: number) {
  c.fillStyle = 'rgba(0,0,0,0.4)'
  c.beginPath()
  c.ellipse(x, y, w, 3, 0, 0, Math.PI * 2)
  c.fill()
}

export function AlleyChase({ lines, onDone }: { lines: ReelLine[]; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [thought, setThought] = useState<ReelLine | null>(null)
  const finished = useRef(false)
  const isTop = useKeyLayer(true)

  const done = () => {
    if (finished.current) return
    finished.current = true
    onDone()
  }

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
    // World time: it crawls while a thought is up, and the run waits on it.
    let t = 0
    let heroX = START_X
    let finishedAt = -1
    const stops = lines.map((_, i) => START_X + ((END_X - START_X) * (i + 0.6)) / (lines.length + 0.4))
    const draw = () => {
      const el = canvas.current
      const now = performance.now()
      const dt = Math.min(64, now - last)
      last = now
      const speedScale = pause.current ? SLOW : 1
      t += dt * speedScale
      // A thought comes at set points down the alley and slows the world until it is read.
      const due = lines[nextThought.current]
      if (due && heroX >= stops[nextThought.current] && !pause.current) {
        pause.current = due
        nextThought.current += 1
        setThought(due)
        playSound('dialogue')
      }
      const running = finishedAt < 0
      if (running) heroX = Math.min(END_X + 40, heroX + (dt / 1000) * RUN_SPEED * speedScale)
      if (el) {
        const c = el.getContext('2d')!
        c.imageSmoothingEnabled = false
        const camX = Math.max(0, Math.min(WORLD_W - VIEW_W, heroX - 156))
        c.clearRect(0, 0, VIEW_W, VIEW_H)
        // Three speeds of scenery: the city, then the wall, then (below) the rain in front.
        c.drawImage(skyPicture(), Math.round(camX * 0.35), 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H)
        c.drawImage(alleyPicture(), camX, 0, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H)
        // Light spilling out of the staff door, and the caged lamps' glow on the wall and the wet ground.
        const doorGlow = DOOR_X - camX
        if (doorGlow > -90 && doorGlow < VIEW_W + 90) {
          for (const [rad, a] of [[70, 0.05], [48, 0.07], [28, 0.09]] as const) {
            c.fillStyle = `rgba(255,236,160,${a})`
            c.beginPath()
            c.ellipse(doorGlow + 16, 86, rad, rad * 1.1, 0, 0, Math.PI * 2)
            c.fill()
          }
          c.fillStyle = 'rgba(255,236,160,0.12)'
          c.beginPath()
          c.ellipse(doorGlow + 40, 156, 64, 10, 0, 0, Math.PI * 2)
          c.fill()
        }
        for (let x = 150; x < END_X; x += 140) {
          const sx = x + 4 - camX
          if (sx < -50 || sx > VIEW_W + 50) continue
          // One of them is on its last legs.
          const flick = x === 430 && Math.floor(t / 90) % 7 < 2 ? 0.35 : 1
          for (const [rad, a] of [[40, 0.05], [28, 0.06], [16, 0.09]] as const) {
            c.fillStyle = `rgba(255,214,120,${a * flick})`
            c.beginPath()
            c.ellipse(sx, 66, rad, rad * 0.9, 0, 0, Math.PI * 2)
            c.fill()
          }
          c.fillStyle = `rgba(255,214,120,${0.08 * flick})`
          c.beginPath()
          c.ellipse(sx, 152, 36, 7, 0, 0, Math.PI * 2)
          c.fill()
        }
        // Steam leaking from the vent in the wall at the dock, rolling off sideways.
        for (let i = 0; i < 9; i++) {
          const age = ((t / 1200 + i / 9) % 1)
          const sx = 214 - camX + age * 30
          const sy = GROUND_Y - 6 - age * 46
          c.fillStyle = `rgba(210,206,230,${0.2 * (1 - age)})`
          c.beginPath()
          c.ellipse(sx, sy, 3 + age * 8, 2 + age * 5, 0, 0, Math.PI * 2)
          c.fill()
        }
        // The pursuers burst from the door and gain and lose a step as they come: they never quite fall away.
        const cycle = t / 95
        const figures = PURSUERS.map((p, i) => {
          const wobble = Math.sin(t / 700 + i * 1.7) * 7
          const x = Math.max(DOOR_X + 14, heroX - p.gap + wobble)
          const out = Math.max(0, Math.min(1, (heroX - START_X) / 22 - i * 0.25))
          return { ...p, x, out, frame: (Math.floor((cycle + p.lag) % 4) === 3 ? 2 : Math.floor((cycle + p.lag) % 4) % 3) as WalkFrame }
        })
        for (const f of [...figures].reverse()) {
          if (f.out <= 0) continue
          const sx = Math.round(f.x - camX)
          shadow(c, sx + 16, FEET_Y + 1, 13)
          c.globalAlpha = f.out
          const bob = f.frame === 1 ? 2 : 0
          drawPerson(c, f.figure, 'right', f.frame, { x: sx, y: FEET_Y - 48 - bob + (f.lag % 3) - 1, scale: 2 })
          c.globalAlpha = 1
        }
        // You. A sprint has a bigger bob than a walk, a lean's worth of speed lines behind, and spray at the heels.
        const frame3 = (finishedAt >= 0 ? 0 : Math.floor(cycle) % 4 === 3 ? 2 : Math.floor(cycle) % 4 % 3) as WalkFrame
        const bob = running && frame3 !== 0 ? 3 : 0
        const hx = Math.round(heroX - camX)
        shadow(c, hx + 16, FEET_Y + 1, 14)
        for (let i = 0; i < 6; i++) {
          const age = ((t / 260 + i / 6) % 1)
          c.fillStyle = `rgba(190,200,230,${0.45 * (1 - age)})`
          c.fillRect(Math.round(hx + 4 - age * 22), Math.round(FEET_Y - 1 - age * 8 - (i % 2) * 2), 2 + Math.round(age * 2), 1)
        }
        for (let i = 0; i < 5; i++) {
          const y = FEET_Y - 40 + i * 9
          const len = 10 + ((i * 7 + Math.floor(t / 70)) % 9)
          c.fillStyle = 'rgba(244,240,216,0.16)'
          c.fillRect(hx - len - 4, y, len, 1)
        }
        drawPerson(c, HERO_FIGURE, 'right', frame3, { x: hx, y: FEET_Y - 48 - bob, scale: 2 })
        // Rain: long streaks falling slantwise at two speeds, and a splash where it lands.
        for (let i = 0; i < 70; i++) {
          const speed = i % 3 === 0 ? 0.9 : 0.6
          const px = (i * 53 + t * 0.12 * speed + 400) % (VIEW_W + 40)
          const py = (i * 31 + t * 0.3 * speed) % VIEW_H
          c.fillStyle = i % 3 === 0 ? 'rgba(180,196,240,0.34)' : 'rgba(140,156,210,0.2)'
          c.fillRect(Math.floor(px) - 20, Math.floor(py), 1, i % 3 === 0 ? 5 : 3)
        }
        // Past the mouth of the alley the street light takes you.
        const into = Math.max(0, Math.min(1, (heroX - (END_X - 20)) / 60))
        if (into > 0) {
          c.fillStyle = `rgba(255,236,200,${into})`
          c.fillRect(0, 0, VIEW_W, VIEW_H)
        }
        // Flashes of the sign behind the door as the men come through, and the edges falling away.
        const g = c.createLinearGradient(0, 0, VIEW_W, 0)
        g.addColorStop(0, 'rgba(0,0,0,0.6)')
        g.addColorStop(0.2, 'rgba(0,0,0,0)')
        g.addColorStop(0.8, 'rgba(0,0,0,0)')
        g.addColorStop(1, 'rgba(0,0,0,0.5)')
        c.fillStyle = g
        c.fillRect(0, 0, VIEW_W, VIEW_H)
        if (finishedAt < 0 && heroX >= END_X + 40 && !pause.current && nextThought.current >= lines.length) finishedAt = t
        if (finishedAt >= 0 && t - finishedAt > 500) done()
      }
      frame = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [])

  const P = useCrispScale(VIEW_W, VIEW_H + 40, 5)

  return (
    <div data-testid="chase" onClick={press} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', paddingTop: 8 }}>
      <canvas
        ref={canvas}
        width={VIEW_W}
        height={VIEW_H}
        style={{ width: VIEW_W * P, height: VIEW_H * P, imageRendering: 'pixelated', display: 'block', flex: 'none' }}
      />
      <Panel
        theme={TABLE_THEMES.finale}
        scale={P}
        testId="chase-line"
        style={{ width: VIEW_W * P, boxSizing: 'border-box', padding: `${3 * P}px ${4 * P}px`, minHeight: 22 * P, marginTop: 2 * P, flex: 'none' }}
      >
        <PixelText text={thought ? (thought.who === 'You' ? `You: ${thought.text}` : thought.text) : ' '} scale={P} wrap ink={INK.dark} />
      </Panel>
    </div>
  )
}
