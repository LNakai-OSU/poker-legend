import { useEffect, useRef } from 'react'
import { HERO_FIGURE, figureForCharacter } from '../overworld/casting'
import { CHARACTERS } from '../world/characters'
import { drawPerson, type WalkFrame } from '../overworld/characterArt'
import { useCrispScale } from './useCrispScale'

/**
 * The rig has failed and the room is dark. You are in your chair at the final
 * table with five other shapes round it, and you get up: out of the chair,
 * down on your heels, and along behind the chairs toward the green EXIT sign,
 * freezing when the stagehand's torch sweeps across the floor, and out through
 * the door into the corridor. Drawn at runtime, art pixel by art pixel.
 *
 * `go` holds the scene on its first frame (you in the chair) while you say your
 * excuse, then lets it run; `onDone` fires when the door has closed behind you.
 */

const W = 320
const H = 180
const TABLE = { cx: 190, cy: 92, rx: 92, ry: 30 }
const DOOR = { x: 14, y: 66, w: 26, h: 50 }
const CHAIR = { x: 190, y: 138 }
const FLOOR_Y = 128

/** Seconds of the run: up out of the chair, creep, wait for the torch, creep, through the door. */
const TIMELINE = { rise: 1.0, creep1: 3.2, freeze: 1.4, creep2: 3.0, door: 1.2 }
const TOTAL = Object.values(TIMELINE).reduce((a, b) => a + b, 0)

const OTHERS = ['nadia', 'gaines', 'contessa', 'bernard', 'zeke'] as const
/** Where the others sit: round the far side and the ends of the table. */
const SEATS: Array<{ x: number; y: number; facing: 'down' | 'left' | 'right' | 'up' }> = [
  { x: 110, y: 52, facing: 'down' },
  { x: 160, y: 40, facing: 'down' },
  { x: 224, y: 40, facing: 'down' },
  { x: 274, y: 54, facing: 'down' },
  { x: 296, y: 96, facing: 'left' },
]

const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

function drawRoom(c: CanvasRenderingContext2D, t: number) {
  // The ballroom, nearly black: a back wall, a darker floor.
  c.fillStyle = '#06060e'
  c.fillRect(0, 0, W, H)
  c.fillStyle = '#0b0b18'
  c.fillRect(0, 0, W, 60)
  c.fillStyle = '#0d0c16'
  c.fillRect(0, FLOOR_Y - 40, W, H - FLOOR_Y + 40)
  // Floor boards in perspective, barely there.
  c.fillStyle = '#12111e'
  for (let y = FLOOR_Y - 36; y < H; y += 9) c.fillRect(0, y, W, 1)
  // The dead rig: truss across the top, dark lamps hanging on it.
  c.fillStyle = '#15152a'
  c.fillRect(0, 0, W, 5)
  for (let x = 12; x < W; x += 40) {
    c.fillStyle = '#0f0f1c'
    c.fillRect(x, 5, 9, 6)
    c.fillStyle = '#1c1c30'
    c.fillRect(x + 2, 9, 5, 2)
  }
  // The crowd behind the rail: a row of heads and one phone light.
  c.fillStyle = '#0a0a14'
  for (let x = 50; x < W; x += 13) c.fillRect(x, 46 + ((x * 7) % 5), 8, 14)
  for (let i = 0; i < 6; i++) {
    const on = (Math.floor(t * 3 + i * 1.7) % 5) !== 0
    if (!on) continue
    c.fillStyle = '#9ab8e8'
    c.fillRect(60 + i * 41 + ((i * 13) % 7), 42 + ((i * 5) % 6), 2, 3)
  }
  // The table: a dark oval of felt with a rim, a dim edge-light of the LED wall on it.
  c.fillStyle = '#1a0f0a'
  c.beginPath()
  c.ellipse(TABLE.cx, TABLE.cy + 3, TABLE.rx + 4, TABLE.ry + 4, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#10301f'
  c.beginPath()
  c.ellipse(TABLE.cx, TABLE.cy, TABLE.rx, TABLE.ry, 0, 0, Math.PI * 2)
  c.fill()
  c.fillStyle = '#0c2418'
  c.beginPath()
  c.ellipse(TABLE.cx, TABLE.cy + 2, TABLE.rx - 12, TABLE.ry - 8, 0, 0, Math.PI * 2)
  c.fill()
  // Chips and cards left where they were.
  for (const [x, y, col] of [[150, 90, '#8a2a2a'], [153, 90, '#2a4a8a'], [226, 96, '#c8a030'], [229, 95, '#8a2a2a'], [190, 84, '#e8e0cc']] as const) {
    c.fillStyle = col
    c.fillRect(x, y, 5, 3)
  }
  // The emergency strip along the floor, pulsing.
  const pulse = 0.5 + 0.5 * Math.sin(t * 4.2)
  c.fillStyle = `rgba(200,40,40,${0.16 + 0.12 * pulse})`
  c.fillRect(0, H - 6, W, 6)
  c.fillStyle = `rgba(230,70,60,${0.35 + 0.25 * pulse})`
  c.fillRect(0, H - 6, W, 1)
}

function drawFigureDim(
  c: CanvasRenderingContext2D,
  who: Parameters<typeof drawPerson>[1],
  facing: Parameters<typeof drawPerson>[2],
  frame: WalkFrame,
  x: number,
  y: number,
  dim: number,
) {
  drawPerson(c, who, facing, frame, { x: Math.round(x), y: Math.round(y) })
  c.fillStyle = `rgba(2,2,12,${dim})`
  c.fillRect(Math.round(x), Math.round(y), 16, 24)
}

export function SneakOut({ go, onDone }: { go: boolean; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const scale = useCrispScale(W, H, 8, 1)
  const goRef = useRef(go)
  const startRef = useRef<number | null>(null)
  const doneRef = useRef(false)
  goRef.current = go

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const c = canvas.getContext('2d')!
    c.imageSmoothingEnabled = false
    const others = OTHERS.map((id) => figureForCharacter(id, CHARACTERS[id]))
    let raf = 0
    const t0 = performance.now()
    const tick = () => {
      const now = performance.now()
      const clock = (now - t0) / 1000
      if (goRef.current && startRef.current == null) startRef.current = now
      const t = startRef.current == null ? 0 : (now - startRef.current) / 1000

      drawRoom(c, clock)

      // The shapes round the table, still, turning to look as the torch passes.
      others.forEach((fig, i) => {
        const seat = SEATS[i]
        drawFigureDim(c, fig, seat.facing, 0, seat.x - 8, seat.y - 12, 0.78)
      })

      // Your timeline.
      const { rise, creep1, freeze, creep2, door } = TIMELINE
      const tRise = rise
      const tC1 = tRise + creep1
      const tF = tC1 + freeze
      const tC2 = tF + creep2
      const path = { x0: CHAIR.x - 8, x1: 118, x2: DOOR.x + 14 }
      let x = path.x0
      let y = CHAIR.y - 28
      let facing: 'up' | 'left' | 'down' = 'up'
      let frame: WalkFrame = 0
      let stoop = 0
      let alpha = 1
      if (t < tRise) {
        // Up out of the chair, then a half crouch.
        const u = clamp01(t / rise)
        y = lerp(CHAIR.y - 28, CHAIR.y - 40, u)
        stoop = u
      } else if (t < tC1) {
        const u = (t - tRise) / creep1
        x = lerp(path.x0, path.x1, u)
        y = lerp(CHAIR.y - 40, FLOOR_Y + 2, clamp01(u * 3)) + Math.sin(u * 22) * 0.8
        facing = 'left'
        frame = (Math.floor(u * 22) % 3) as WalkFrame
        stoop = 1
      } else if (t < tF) {
        x = path.x1
        y = FLOOR_Y + 2
        facing = 'left'
        stoop = 1
      } else if (t < tC2) {
        const u = (t - tF) / creep2
        x = lerp(path.x1, path.x2, u)
        y = FLOOR_Y + 2 + Math.sin(u * 20) * 0.8
        facing = 'left'
        frame = (Math.floor(u * 20) % 3) as WalkFrame
        stoop = 1
      } else {
        const u = clamp01((t - tC2) / door)
        x = path.x2
        y = FLOOR_Y + 2
        facing = 'left'
        stoop = 0
        alpha = 1 - clamp01((u - 0.35) / 0.65)
        frame = 0
      }
      const heroDim = 0.45
      // A crouch: the sprite is drawn a little lower and squashed by redrawing its lower rows.
      c.save()
      c.globalAlpha = alpha
      if (stoop > 0 && t >= rise * 0.4) {
        // Squash toward the feet.
        const h = 24 - Math.round(4 * stoop)
        const tmp = document.createElement('canvas')
        tmp.width = 16
        tmp.height = 24
        const tc = tmp.getContext('2d')!
        drawPerson(tc, HERO_FIGURE, facing, frame, { x: 0, y: 0 })
        c.drawImage(tmp, 0, 0, 16, 24, Math.round(x), Math.round(y + (24 - h)), 16, h)
        c.fillStyle = `rgba(2,2,12,${heroDim})`
        c.fillRect(Math.round(x), Math.round(y + (24 - h)), 16, h)
      } else {
        drawFigureDim(c, HERO_FIGURE, facing, frame, x, y, heroDim)
      }
      c.restore()

      // The vacated chair stays in front of the table, back to us.
      c.fillStyle = '#16121c'
      c.fillRect(CHAIR.x - 9, CHAIR.y - 6, 18, 9)
      c.fillRect(CHAIR.x - 9, CHAIR.y - 12, 18, 2)

      // The stagehand's torch: a cone that sweeps the floor, and when it crosses you, you stand stock still.
      const sweep = clamp01((t - tC1 + 0.6) / (freeze + 0.9))
      if (t > tC1 - 0.6 && t < tF + 0.4 && sweep < 1) {
        const tx = lerp(310, 40, sweep)
        const g = c.createRadialGradient(tx, FLOOR_Y + 8, 2, tx, FLOOR_Y + 8, 46)
        g.addColorStop(0, 'rgba(255,244,200,0.42)')
        g.addColorStop(1, 'rgba(255,244,200,0)')
        c.fillStyle = g
        c.fillRect(0, FLOOR_Y - 40, W, 80)
      }

      // The green EXIT sign and the door, which opens when you reach it.
      c.fillStyle = '#0e0e1a'
      c.fillRect(DOOR.x - 3, DOOR.y - 3, DOOR.w + 6, DOOR.h + 6)
      const open = t > tC2 ? clamp01((t - tC2) / 0.4) : 0
      c.fillStyle = open ? '#cfe6d8' : '#1c1a26'
      c.fillRect(DOOR.x, DOOR.y, DOOR.w, DOOR.h)
      if (open) {
        // The corridor's light on the floor.
        const g = c.createLinearGradient(DOOR.x, 0, DOOR.x + 90, 0)
        g.addColorStop(0, `rgba(220,240,226,${0.35 * open})`)
        g.addColorStop(1, 'rgba(220,240,226,0)')
        c.fillStyle = g
        c.fillRect(DOOR.x, FLOOR_Y - 10, 90, 48)
      }
      c.fillStyle = '#18b060'
      c.fillRect(DOOR.x + 2, DOOR.y - 14, 22, 9)
      c.fillStyle = '#d8ffe8'
      c.fillRect(DOOR.x + 4, DOOR.y - 12, 18, 5)
      c.fillStyle = '#0a5a30'
      c.fillRect(DOOR.x + 6, DOOR.y - 10, 14, 1)
      const glow = c.createRadialGradient(DOOR.x + 12, DOOR.y + 10, 4, DOOR.x + 12, DOOR.y + 10, 70)
      glow.addColorStop(0, 'rgba(40,220,120,0.16)')
      glow.addColorStop(1, 'rgba(40,220,120,0)')
      c.fillStyle = glow
      c.fillRect(0, 0, 120, 160)

      // A vignette, so the edges fall away.
      const v = c.createRadialGradient(W / 2, H / 2, 70, W / 2, H / 2, 200)
      v.addColorStop(0, 'rgba(0,0,0,0)')
      v.addColorStop(1, 'rgba(0,0,0,0.6)')
      c.fillStyle = v
      c.fillRect(0, 0, W, H)

      if (t >= TOTAL && !doneRef.current) {
        doneRef.current = true
        onDone()
      }
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={ref}
      data-testid="walk-off"
      width={W}
      height={H}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: W * scale,
        height: H * scale,
        transform: 'translate(-50%, -50%)',
        imageRendering: 'pixelated',
      }}
    />
  )
}
