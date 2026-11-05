import type { TimePeriod } from './time'
import { KAPPA, ROAD_HALF, SEG, heightAt, curveAt, type DecoKind, type Theme } from './raceTrack'
import {
  CONE_HALF_W,
  OIL_HALF_L,
  OIL_HALF_W,
  hazardAt,
  threatOf,
  topSpeedOf,
  type Race,
  type Racer,
  type Threat,
} from './race'

/**
 * The picture of a race, drawn the way the best arcade racers do: the road is
 * projected in depth, so bends curve away from you and hills hide what is behind
 * their crest; cars and roadside things are flat sprites scaled by distance; the
 * far backdrop moves slower than the road. Speed is *felt* from what passes you:
 * kerbs, posts and lamps streaming by, the field of view opening up, the edges of
 * the screen streaking, a shake on the kerb.
 *
 * Everything is drawn from code at a small size and shown scaled up with
 * nearest-neighbour filtering, like the rest of the game. No art assets.
 */

export const VIEW_W = 320
export const VIEW_H = 200
const HORIZON = 78
/** Metres of road a slice is cut into on screen. */
const RS = 1.5
const SLICES = 200
/** How far ahead of the camera the player's car is. */
const PLAYER_Z = 9
const CAM_H = ROAD_HALF * 0.62

// --- light ------------------------------------------------------------------

interface Light {
  skyTop: string
  skyBottom: string
  haze: string
  /** Multiplied over the road and the scenery: how dim the hour is. */
  dark: number
  tint: string
  night: boolean
  sun: { x: number; y: number; color: string } | null
}

function lightFor(period: TimePeriod): Light {
  switch (period) {
    case 'morning':
      return { skyTop: '#6fb2e8', skyBottom: '#d8ecf4', haze: '#e4f0f0', dark: 0, tint: '', night: false, sun: { x: 0.74, y: 0.3, color: '#fff6c8' } }
    case 'afternoon':
      return { skyTop: '#4fa0e8', skyBottom: '#c8e4f4', haze: '#dcecf0', dark: 0, tint: 'rgba(255,230,160,0.07)', night: false, sun: { x: 0.45, y: 0.12, color: '#fffbe0' } }
    case 'evening':
      return { skyTop: '#46306e', skyBottom: '#f09050', haze: '#e8a070', dark: 0.18, tint: 'rgba(255,140,60,0.16)', night: false, sun: { x: 0.28, y: 0.62, color: '#ffd890' } }
    default:
      return { skyTop: '#05061a', skyBottom: '#201a48', haze: '#2a2252', dark: 0.5, tint: 'rgba(10,16,70,0.3)', night: true, sun: null }
  }
}

interface Palette {
  grass: [string, string]
  road: [string, string]
  rumble: [string, string]
  lane: string
  /** The distant silhouette. */
  far: string
  far2: string
}

const PALETTES: Record<Theme, Palette> = {
  harbor: { grass: ['#5e6e72', '#566668'], road: ['#3b3e48', '#363944'], rumble: ['#d84a3a', '#e8e4d8'], lane: '#e8e4d0', far: '#34424e', far2: '#46586a' },
  coast: { grass: ['#d6c288', '#cdb97c'], road: ['#4c4854', '#46424e'], rumble: ['#f4f0e0', '#e0705a'], lane: '#f4f0dc', far: '#3c8e94', far2: '#5ab0a8' },
  strip: { grass: ['#1f1434', '#1a102c'], road: ['#2a2432', '#252030'], rumble: ['#e048b8', '#38d8f0'], lane: '#f0e8f8', far: '#241448', far2: '#3a2068' },
}

export function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16)
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * f)))
  return `#${((1 << 24) | (ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).slice(1)}`
}

// --- sprites ----------------------------------------------------------------

interface Sprite {
  img: HTMLCanvasElement
  /** Real size in metres. */
  wM: number
  hM: number
}

function canvasOf(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  return [el, el.getContext('2d')!]
}

const cache = new Map<string, Sprite>()

function sprite(key: string, w: number, h: number, wM: number, hM: number, paint: (c: CanvasRenderingContext2D) => void): Sprite {
  const hit = cache.get(key)
  if (hit) return hit
  const [img, c] = canvasOf(w, h)
  paint(c)
  const made = { img, wM, hM }
  cache.set(key, made)
  return made
}

const TINTS = ['#e0503c', '#3c8ae0', '#e0b83c', '#48b868']
const NEONS = ['#ff3cb8', '#38e8ff', '#ffd23c', '#7a5cff']

/** A car seen from behind: the one picture used for traffic and rivals both. */
function carRear(paint: string, o: { braking?: boolean; wrecked?: boolean; lean?: number; big?: boolean; dent?: number } = {}): Sprite {
  const w = o.big ? 44 : 26
  const h = o.big ? 26 : 15
  const key = `car:${paint}:${o.braking ? 'b' : ''}${o.wrecked ? 'w' : ''}:${o.lean ?? 0}:${o.big ? 'L' : 'S'}:${o.dent ?? 0}`
  return sprite(key, w, h, 2.1, (2.1 * h) / w, (c) => {
    const k = o.big ? 1.7 : 1
    const R = (x: number, y: number, ww: number, hh: number, col: string) => {
      c.fillStyle = col
      c.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(ww * k)), Math.max(1, Math.round(hh * k)))
    }
    const body = o.wrecked ? shade(paint, 0.45) : shade(paint, 1 - 0.1 * (o.dent ?? 0))
    const lean = o.lean ?? 0
    // Shadow and tyres.
    R(1, 12, 24, 3, 'rgba(0,0,0,0.38)')
    R(1, 8, 4, 6, '#0c0c14')
    R(21, 8, 4, 6, '#0c0c14')
    R(2, 9, 2, 1, '#2a2a38')
    R(22, 9, 2, 1, '#2a2a38')
    // Body: lower shell, cabin, roof.
    R(2 + lean * 0.3, 6, 22, 6, shade(body, 0.8))
    R(3 + lean * 0.3, 5, 20, 5, body)
    R(5 + lean * 0.6, 1, 16, 5, shade(body, 0.9))
    R(6 + lean * 0.6, 0, 14, 2, shade(body, 1.2))
    // Rear window.
    R(7 + lean * 0.6, 2, 12, 3, '#162034')
    R(8 + lean * 0.6, 2, 4, 1, 'rgba(160,200,255,0.35)')
    // Spoiler.
    R(4 + lean * 0.4, 4, 18, 1, shade(body, 0.6))
    // Lamps.
    const lamp = o.braking ? '#ff6a5a' : '#b82828'
    R(3 + lean * 0.3, 7, 5, 2, lamp)
    R(18 + lean * 0.3, 7, 5, 2, lamp)
    if (o.braking) {
      R(3, 7, 5, 1, '#ffd0c0')
      R(18, 7, 5, 1, '#ffd0c0')
    }
    // Plate and bumper.
    R(10 + lean * 0.3, 9, 6, 2, '#e8e8d8')
    R(3 + lean * 0.3, 11, 20, 1, shade(body, 0.5))
    // What it has been through: a scuff, a dent, a smashed lamp and a cracked screen.
    const dent = o.dent ?? 0
    if (dent >= 1) {
      R(14, 6, 5, 1, shade(body, 0.45))
      R(5, 10, 3, 1, '#d8d8d0')
    }
    if (dent >= 2) {
      R(18, 7, 5, 2, '#3a1414')
      R(8, 2, 1, 3, '#a8c0e0')
      R(9, 4, 3, 1, '#a8c0e0')
      R(11, 7, 3, 2, shade(body, 0.4))
    }
    if (dent >= 3) {
      R(3, 7, 5, 2, '#220c0c')
      R(13, 1, 1, 4, '#a8c0e0')
      R(4, 5, 6, 3, shade(body, 0.35))
      R(15, 9, 7, 2, '#18181e')
    }  })
}

/** A roadside thing, drawn once per tint. */
function decoSprite(kind: DecoKind, tint: number): Sprite {
  const key = `deco:${kind}:${tint}`
  switch (kind) {
    case 'lamp':
      return sprite(key, 14, 48, 0.8, 5.6, (c) => {
        c.fillStyle = '#10101a'
        c.fillRect(6, 6, 2, 42)
        c.fillRect(2, 4, 10, 2)
        c.fillStyle = '#f4e4a8'
        c.fillRect(1, 5, 4, 2)
        c.fillStyle = '#555a68'
        c.fillRect(6, 40, 2, 8)
      })
    case 'palm':
      return sprite(key, 34, 52, 5, 7.6, (c) => {
        c.fillStyle = '#6a4a2c'
        for (let y = 20; y < 52; y++) c.fillRect(16 + Math.round(Math.sin(y / 9) * 2), y, 3, 1)
        const frond = (dx: number, dy: number, len: number) => {
          for (let i = 0; i < len; i++) {
            c.fillStyle = i % 3 === 0 ? '#2e7a3c' : '#3a9a4a'
            c.fillRect(17 + Math.round(dx * i), 18 + Math.round(dy * i + i * i * 0.04), 2, 2)
          }
        }
        for (const [dx, dy] of [[1, -0.2], [-1, -0.2], [0.8, 0.2], [-0.8, 0.2], [0.4, -0.7], [-0.4, -0.7]] as const) frond(dx, dy, 14)
        c.fillStyle = '#7a5a30'
        c.fillRect(15, 21, 2, 2)
        c.fillRect(18, 21, 2, 2)
      })
    case 'umbrella':
      return sprite(key, 26, 22, 3.2, 2.7, (c) => {
        const col = TINTS[tint % TINTS.length]
        c.fillStyle = '#f0ece0'
        c.fillRect(12, 6, 2, 16)
        for (let i = 0; i < 26; i++) {
          const h = Math.round(7 * Math.sin((i / 25) * Math.PI))
          c.fillStyle = i % 6 < 3 ? col : '#f4f0e4'
          c.fillRect(i, 7 - h, 1, h + 1)
        }
      })
    case 'container':
      return sprite(key, 34, 20, 6, 3.4, (c) => {
        const col = ['#b84a38', '#3a6aa8', '#c89a38', '#4a8a5a'][tint % 4]
        c.fillStyle = shade(col, 0.55)
        c.fillRect(0, 0, 34, 20)
        c.fillStyle = col
        c.fillRect(1, 1, 32, 18)
        for (let x = 3; x < 32; x += 3) {
          c.fillStyle = shade(col, 0.78)
          c.fillRect(x, 2, 1, 16)
        }
        c.fillStyle = '#f0f0e8'
        c.fillRect(5, 4, 8, 2)
      })
    case 'crate':
      return sprite(key, 14, 14, 1.5, 1.5, (c) => {
        c.fillStyle = '#6a4a2a'
        c.fillRect(0, 0, 14, 14)
        c.fillStyle = '#a07a44'
        c.fillRect(1, 1, 12, 12)
        c.fillStyle = '#6a4a2a'
        c.fillRect(1, 6, 12, 1)
        c.fillRect(6, 1, 1, 12)
      })
    case 'bollard':
      return sprite(key, 6, 10, 0.45, 0.8, (c) => {
        c.fillStyle = '#10101a'
        c.fillRect(0, 0, 6, 10)
        c.fillStyle = '#e8c83a'
        c.fillRect(1, 1, 4, 3)
        c.fillStyle = '#a8a8b0'
        c.fillRect(1, 5, 4, 4)
      })
    case 'sign':
      return sprite(key, 30, 32, 5, 5.3, (c) => {
        const col = TINTS[tint % TINTS.length]
        c.fillStyle = '#10101a'
        c.fillRect(13, 14, 3, 18)
        c.fillRect(0, 0, 30, 16)
        c.fillStyle = col
        c.fillRect(1, 1, 28, 14)
        c.fillStyle = '#f4f0e0'
        for (let x = 4; x < 26; x += 4) c.fillRect(x, 5, 2, 6)
      })
    case 'neon':
      return sprite(key, 30, 40, 4.6, 6.1, (c) => {
        const col = NEONS[tint % NEONS.length]
        c.fillStyle = '#10101a'
        c.fillRect(13, 24, 3, 16)
        c.fillStyle = '#18102a'
        c.fillRect(0, 0, 30, 26)
        c.fillStyle = col
        c.fillRect(1, 1, 28, 1)
        c.fillRect(1, 24, 28, 1)
        c.fillRect(1, 1, 1, 24)
        c.fillRect(28, 1, 1, 24)
        c.fillStyle = shade(col, 1.2)
        for (let x = 5; x < 25; x += 5) c.fillRect(x, 6 + (x % 10), 3, 9)
        c.fillStyle = col
        c.fillRect(6, 19, 18, 2)
      })
    case 'tower':
      return sprite(key, 32, 90, 12, 33, (c) => {
        c.fillStyle = '#120c24'
        c.fillRect(0, 0, 32, 90)
        c.fillStyle = '#1e1438'
        c.fillRect(2, 0, 28, 90)
        for (let y = 4; y < 86; y += 5) {
          for (let x = 4; x < 28; x += 5) {
            c.fillStyle = (x * 7 + y * 3) % 11 < 5 ? NEONS[(x + y) % 4] : '#2a1e48'
            c.fillRect(x, y, 3, 3)
          }
        }
        c.fillStyle = NEONS[tint % 4]
        c.fillRect(0, 0, 32, 2)
      })
    default:
      return sprite(key, 14, 6, 1.3, 0.55, (c) => {
        c.fillStyle = '#9a9ea8'
        c.fillRect(0, 1, 14, 3)
        c.fillStyle = '#6a6e78'
        c.fillRect(0, 4, 14, 1)
        c.fillStyle = '#c8ccd4'
        c.fillRect(0, 1, 14, 1)
        c.fillStyle = '#10101a'
        c.fillRect(6, 4, 2, 2)
      })
  }
}

/** A triangular warning sign on a post, with a picture of what is ahead: an oil drop or a cone. */
function warningSign(what: 'oil' | 'cone'): Sprite {
  return sprite(`sign:${what}`, 22, 34, 1.8, 2.8, (c) => {
    c.fillStyle = '#10101a'
    c.fillRect(10, 17, 2, 17)
    // The triangle: a red border round a yellow face.
    for (let y = 0; y < 18; y++) {
      const half = Math.round(1 + (y * 10) / 17)
      c.fillStyle = '#d83a2a'
      c.fillRect(11 - half - 1, y, half * 2 + 2, 1)
      if (y > 1 && y < 16) {
        c.fillStyle = '#ffd23c'
        c.fillRect(11 - half + 1, y, Math.max(0, half * 2 - 1), 1)
      }
    }
    c.fillStyle = '#10101a'
    if (what === 'oil') {
      // A drop.
      c.fillRect(10, 5, 2, 2)
      c.fillRect(9, 7, 4, 3)
      c.fillRect(8, 10, 6, 3)
      c.fillRect(9, 13, 4, 1)
    } else {
      // A cone.
      c.fillRect(10, 5, 2, 2)
      c.fillRect(9, 7, 4, 3)
      c.fillRect(8, 10, 6, 2)
      c.fillRect(7, 13, 8, 1)
    }
  })
}

/** One traffic cone, standing and knocked over. */
const CONE = sprite('cone', 10, 15, 0.5, 0.75, (c) => {
  c.fillStyle = '#10101a'
  c.fillRect(0, 12, 10, 3)
  c.fillStyle = '#f07828'
  c.fillRect(2, 1, 6, 12)
  c.fillStyle = '#ff9a48'
  c.fillRect(2, 1, 2, 11)
  c.fillStyle = '#f4f0e0'
  c.fillRect(2, 5, 6, 2)
  c.fillStyle = '#10101a'
  c.fillRect(4, 0, 2, 1)
})
const CONE_DOWN = sprite('cone-down', 16, 9, 0.8, 0.45, (c) => {
  c.fillStyle = 'rgba(0,0,0,0.35)'
  c.fillRect(0, 7, 16, 2)
  c.fillStyle = '#f07828'
  c.fillRect(1, 2, 12, 5)
  c.fillStyle = '#f4f0e0'
  c.fillRect(5, 2, 2, 5)
  c.fillStyle = '#10101a'
  c.fillRect(12, 1, 3, 7)
})

// --- backdrop ----------------------------------------------------------------

const BACKDROP_W = 640
const BACKDROP_H = 70

function backdrop(theme: Theme, night: boolean): HTMLCanvasElement {
  const key = `back:${theme}:${night}`
  return sprite(key, BACKDROP_W, BACKDROP_H, 1, 1, (c) => {
    const p = PALETTES[theme]
    const noise = (n: number) => {
      const s = Math.sin(n * 91.7) * 43758.5453
      return s - Math.floor(s)
    }
    c.fillStyle = p.far2
    if (theme === 'harbor') {
      // Hills of containers and the gantry cranes behind them.
      for (let x = 0; x < BACKDROP_W; x += 8) {
        const h = 8 + Math.round(noise(x) * 14)
        c.fillStyle = shade(p.far2, 0.9 + noise(x + 3) * 0.2)
        c.fillRect(x, BACKDROP_H - h, 8, h)
      }
      c.fillStyle = p.far
      for (const cx of [80, 250, 430, 570]) {
        c.fillRect(cx, 8, 3, BACKDROP_H - 8)
        c.fillRect(cx - 22, 10, 56, 3)
        c.fillRect(cx - 22, 10, 2, 16)
        c.fillRect(cx + 18, 10, 2, 22)
      }
    } else if (theme === 'coast') {
      // Headlands and a long low island, the sea in front.
      for (let x = 0; x < BACKDROP_W; x++) {
        const h = 16 + 10 * Math.sin(x / 55) + 6 * Math.sin(x / 17 + 2) + noise(Math.floor(x / 5)) * 3
        c.fillStyle = x % 120 < 70 ? p.far : p.far2
        c.fillRect(x, BACKDROP_H - Math.max(8, h), 1, Math.max(8, h))
      }
      c.fillStyle = night ? '#101840' : '#3aa0c8'
      c.fillRect(0, BACKDROP_H - 6, BACKDROP_W, 6)
    } else {
      // The Strip: towers lit window by window.
      for (let x = 0; x < BACKDROP_W; ) {
        const bw = 10 + Math.round(noise(x + 1) * 18)
        const bh = 18 + Math.round(noise(x + 2) * 46)
        c.fillStyle = noise(x) > 0.5 ? p.far : shade(p.far2, 0.8)
        c.fillRect(x, BACKDROP_H - bh, bw, bh)
        for (let wy = BACKDROP_H - bh + 3; wy < BACKDROP_H - 3; wy += 4) {
          for (let wx = x + 2; wx < x + bw - 2; wx += 4) {
            if (noise(wx * 3 + wy) > 0.45) {
              c.fillStyle = NEONS[Math.floor(noise(wx + wy * 5) * 4)]
              c.fillRect(wx, wy, 2, 2)
            }
          }
        }
        x += bw + 1
      }
    }
  }).img
}

// --- the view's own memory ---------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

export interface View {
  particles: Particle[]
  shake: number
  flash: { color: string; a: number }
  skyX: number
  spin: number
  /** Smoothed field of view: opens up as you speed up. */
  fov: number
  messages: Array<{ text: string; t: number; color: string }>
  lastY: number
  tick: number
}

export function createView(): View {
  return { particles: [], shake: 0, flash: { color: '#ffffff', a: 0 }, skyX: 0, spin: 0, fov: 64, messages: [], lastY: 0, tick: 0 }
}

// --- the frame ---------------------------------------------------------------

interface Slice {
  /** World offset of the road's centre at the near edge, metres: bend and camera combined. */
  x: number
  /** Height of the road above the camera, metres. */
  y: number
  z: number
  /** Screen. */
  sx: number
  sy: number
  sw: number
  scale: number
  /** The highest row of anything nearer, below which this slice is hidden. */
  clip: number
}

export interface FrameOptions {
  period: TimePeriod
  /** 3,2,1 then 0 for GO; null once under way. */
  countdown: number | null
  dt: number
  /** The beat of the car's tyres on the road, in seconds; drives the little bounce. */
  time: number
  /** How long the player has been wrecked. */
  wreckedFor: number
}

export function drawRace(c: CanvasRenderingContext2D, race: Race, me: Racer, view: View, o: FrameOptions) {
  const { track } = race
  const theme = track.spec.theme
  const light = lightFor(o.period)
  const pal = PALETTES[theme]
  const vFrac = me.v / topSpeedOf(me.stats)
  view.tick++

  // Speed opens the view; boost opens it more.
  // A narrow view, so what is on the road is big enough to read in time to do something about it.
  const fovWant = 64 + 12 * Math.min(1, vFrac) + (me.boosting ? 8 : 0)
  view.fov += (fovWant - view.fov) * Math.min(1, 5 * o.dt)
  const depth = 1 / Math.tan((view.fov * Math.PI) / 360)
  const k = VIEW_W / 2

  // Camera.
  const baseDist = me.dist - PLAYER_Z
  const playerXm = me.x * ROAD_HALF
  const camY = heightAt(race.track, Math.max(0, me.dist)) + CAM_H
  const i0 = Math.floor(baseDist / RS)
  const frac = baseDist / RS - i0

  // Shake: the kerb, the grass, a hit.
  const rumble = Math.abs(me.x) > 1 ? 1.2 : 0
  view.shake = Math.max(view.shake - 14 * o.dt, rumble)
  const sx0 = view.shake > 0.05 ? Math.round((Math.random() - 0.5) * view.shake * 2) : 0
  const sy0 = view.shake > 0.05 ? Math.round((Math.random() - 0.5) * view.shake * 2) : 0
  c.save()
  c.translate(sx0, sy0)

  // Sky, sun, backdrop.
  const bands = 9
  for (let b = 0; b < bands; b++) {
    c.fillStyle = mix(light.skyTop, light.skyBottom, b / (bands - 1))
    c.fillRect(0, Math.floor((b * HORIZON) / bands), VIEW_W, Math.ceil(HORIZON / bands) + 1)
  }
  if (light.night) {
    for (let i = 0; i < 36; i++) {
      c.fillStyle = i % 5 === 0 ? '#f4f0d8' : '#8a8ab8'
      c.fillRect((i * 83) % VIEW_W, (i * 37) % (HORIZON - 20), 1, 1)
    }
    c.fillStyle = '#e8e4d0'
    c.beginPath()
    c.arc(250, 24, 8, 0, Math.PI * 2)
    c.fill()
    c.fillStyle = light.skyTop
    c.beginPath()
    c.arc(254, 22, 7, 0, Math.PI * 2)
    c.fill()
  } else if (light.sun) {
    const sx = light.sun.x * VIEW_W
    const sy = light.sun.y * HORIZON
    for (const [r, a] of [[26, 0.12], [18, 0.2], [11, 0.4]] as const) {
      c.fillStyle = withAlpha(light.sun.color, a)
      c.beginPath()
      c.arc(sx, sy, r, 0, Math.PI * 2)
      c.fill()
    }
    c.fillStyle = light.sun.color
    c.beginPath()
    c.arc(sx, sy, 7, 0, Math.PI * 2)
    c.fill()
  }
  // The backdrop turns with the road: the bend ahead slides it the other way.
  view.skyX += (curveAt(race.track, me.dist + 40) * me.v * o.dt * 0.14) + me.steer * 0.05
  const bd = backdrop(theme, light.night)
  const bx = ((-view.skyX % BACKDROP_W) + BACKDROP_W) % BACKDROP_W
  c.drawImage(bd, bx - BACKDROP_W, HORIZON - BACKDROP_H + 4)
  c.drawImage(bd, bx, HORIZON - BACKDROP_H + 4)
  c.drawImage(bd, bx + BACKDROP_W, HORIZON - BACKDROP_H + 4)
  // Haze at the horizon.
  c.fillStyle = withAlpha(light.haze, 0.5)
  c.fillRect(0, HORIZON - 3, VIEW_W, 5)

  // The ground and the road, nearest first, with a clip line that rises as hills hide what is behind them.
  c.fillStyle = pal.grass[0]
  c.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON)
  const slices: Slice[] = []
  let x = 0
  let dx = -frac * curveStep(race, i0)
  let clip = VIEW_H
  for (let n = 0; n < SLICES; n++) {
    const i = i0 + n
    const z1 = Math.max(0.6, i * RS - baseDist)
    const z2 = Math.max(0.6, (i + 1) * RS - baseDist)
    const h1 = heightAt(track, Math.max(0, i * RS)) - camY
    const h2 = heightAt(track, Math.max(0, (i + 1) * RS)) - camY
    const cs = curveStep(race, i)
    const near = project(x - playerXm, h1, z1, depth, k)
    const far = project(x + dx - playerXm, h2, z2, depth, k)
    slices.push({ x, y: h1, z: z1, sx: near.x, sy: near.y, sw: ROAD_HALF * near.scale * k, scale: near.scale, clip })
    x += dx
    dx += cs
    // Hidden behind a nearer crest, or facing away.
    if (far.y >= clip || near.y <= far.y) continue
    const yTop = Math.max(0, far.y)
    const yBottom = Math.min(clip, near.y)
    const band = pmod(Math.floor(i / 2), 2)
    const roadBand = pmod(Math.floor(i / 4), 2)
    c.fillStyle = shade(pal.grass[band], 1 - light.dark * 0.5)
    c.fillRect(0, yTop, VIEW_W, yBottom - yTop)
    const wn = ROAD_HALF * near.scale * k
    const wf = ROAD_HALF * far.scale * k
    const lane = pmod(Math.floor(i / 5), 2) === 0
    const roadCol = shade(pal.road[roadBand], 1 - light.dark * 0.5)
    const rumbleCol = shade(pal.rumble[band], 1 - light.dark * 0.45)
    const laneCol = shade(pal.lane, 1 - light.dark * 0.4)
    for (let y = yTop; y < yBottom; y++) {
      const t = near.y === far.y ? 0 : (y - far.y) / (near.y - far.y)
      const cx = far.x + (near.x - far.x) * t
      const w = wf + (wn - wf) * t
      const kerb = Math.max(1, w * 0.055)
      c.fillStyle = rumbleCol
      c.fillRect(Math.round(cx - w - kerb), y, Math.max(1, Math.round(kerb)), 1)
      c.fillRect(Math.round(cx + w), y, Math.max(1, Math.round(kerb)), 1)
      c.fillStyle = roadCol
      c.fillRect(Math.round(cx - w), y, Math.max(1, Math.round(w * 2)), 1)
      if (lane) {
        c.fillStyle = laneCol
        const lw = Math.max(1, w * 0.035)
        // Two lane lines, a third of the way in each side.
        c.fillRect(Math.round(cx - w * 0.33 - lw / 2), y, Math.max(1, Math.round(lw)), 1)
        c.fillRect(Math.round(cx + w * 0.33 - lw / 2), y, Math.max(1, Math.round(lw)), 1)
      }
    }
    // The start line and the finish.
    for (const [mark, chequer] of [[0, false], [race.length, true]] as const) {
      if (mark >= i * RS && mark < (i + 1) * RS) {
        for (let y = yTop; y < yBottom; y++) {
          const t = near.y === far.y ? 0 : (y - far.y) / (near.y - far.y)
          const cx = far.x + (near.x - far.x) * t
          const w = wf + (wn - wf) * t
          const cells = 10
          for (let q = 0; q < cells; q++) {
            c.fillStyle = chequer ? ((q + y) % 2 ? '#f4f0e0' : '#10101a') : '#f4f0e0'
            c.fillRect(Math.round(cx - w + (q * 2 * w) / cells), y, Math.max(1, Math.round((2 * w) / cells)), 1)
          }
        }
      }
    }
    clip = yTop
  }

  // Everything that stands on the road, furthest first.
  interface Draw {
    z: number
    run: () => void
  }
  const drawn: Draw[] = []
  const ground: Draw[] = []
  const threat = threatOf(race, me)
  const MAXZ = SLICES * RS - RS

  /** Where a point on the road is on the screen, or null if it is behind the camera or beyond sight. */
  const at = (dist: number, lateralM: number) => {
    const z = dist - baseDist
    if (z < 1.2 || z > MAXZ) return null
    const n = Math.min(SLICES - 2, Math.floor(z / RS))
    const a = slices[n]
    const b = slices[n + 1]
    if (!a || !b) return null
    const f = Math.max(0, Math.min(1, (z - n * RS) / RS))
    const p = project(a.x + (b.x - a.x) * f + lateralM - playerXm, a.y + (b.y - a.y) * f, z, depth, k)
    return { x: p.x, y: p.y, scale: p.scale, clip: a.clip, z }
  }
  /** Far things come in out of the haze instead of popping in. */
  const fade = (z: number) => (z > MAXZ - 55 ? Math.max(0, (MAXZ - z) / 55) : 1)

  /** The outline of a flat shape lying on the road: its middle, its half sizes in metres, and how much of it. */
  const flat = (dist: number, latM: number, halfW: number, halfL: number, scale = 1, dx = 0, dy = 0) => {
    const pts: Array<[number, number]> = []
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2
      const q = at(dist + dy + Math.sin(a) * halfL * scale, latM + dx + Math.cos(a) * halfW * scale)
      if (!q) return null
      pts.push([q.x, q.y])
    }
    return pts
  }
  const fill = (pts: Array<[number, number]>, style: string) => {
    c.fillStyle = style
    c.beginPath()
    pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
    c.closePath()
    c.fill()
  }
  const onGround = (dist: number, latM: number, z: number, paint: (clipY: number) => void) => {
    const q = at(dist, latM)
    if (!q) return
    ground.push({
      z,
      run: () => {
        c.save()
        c.beginPath()
        c.rect(0, 0, VIEW_W, q.clip)
        c.clip()
        c.globalAlpha = fade(z)
        paint(q.clip)
        c.restore()
      },
    })
  }

  /** The brackets round a thing you are about to hit, or have just hit, and what they say about it. */
  const ring = (left: number, top: number, w: number, h: number, mark: 'danger' | 'caution' | 'hit') => {
    const pulse = 0.55 + 0.45 * Math.sin(view.tick * 0.45)
    c.fillStyle = mark === 'danger' ? `rgba(255,70,50,${0.55 + pulse * 0.45})` : mark === 'hit' ? 'rgba(255,255,255,0.95)' : 'rgba(255,205,60,0.85)'
    const x0 = left - 3
    const y0 = top - 3
    const ww = Math.round(w) + 6
    const hh = Math.round(h) + 6
    const L = Math.max(3, Math.round(ww * 0.24))
    c.fillRect(x0, y0, L, 1)
    c.fillRect(x0, y0, 1, L)
    c.fillRect(x0 + ww - L, y0, L, 1)
    c.fillRect(x0 + ww - 1, y0, 1, L)
    c.fillRect(x0, y0 + hh - 1, L, 1)
    c.fillRect(x0, y0 + hh - L, 1, L)
    c.fillRect(x0 + ww - L, y0 + hh - 1, L, 1)
    c.fillRect(x0 + ww - 1, y0 + hh - L, 1, L)
    if (mark === 'danger') {
      // A warning triangle over it.
      const cx = Math.round(x0 + ww / 2)
      for (let r = 0; r < 5; r++) c.fillRect(cx - r, y0 - 8 + r, 1 + r * 2, 1)
      c.fillStyle = '#10101a'
      c.fillRect(cx, y0 - 7, 1, 2)
      c.fillRect(cx, y0 - 4, 1, 1)
    }
  }

  const place = (dist: number, lateralM: number, s: Sprite, opts: { alpha?: number; glow?: string; mark?: 'danger' | 'caution' | 'hit' } = {}) => {
    const q = at(dist, lateralM)
    if (!q) return
    const w = Math.max(1, s.wM * q.scale * k)
    const h = Math.max(1, s.hM * q.scale * k)
    const left = Math.round(q.x - w / 2)
    const top = Math.round(q.y - h)
    if (left > VIEW_W || left + w < 0) return
    drawn.push({
      z: q.z,
      run: () => {
        const vis = Math.min(h, q.clip - top)
        if (vis <= 0) return
        const srcH = (vis / h) * s.img.height
        c.globalAlpha = (opts.alpha ?? 1) * fade(q.z)
        c.drawImage(s.img, 0, 0, s.img.width, srcH, left, top, Math.round(w), Math.max(1, Math.round(vis)))
        c.globalAlpha = 1
        if (opts.glow && light.night) {
          c.globalCompositeOperation = 'lighter'
          c.fillStyle = opts.glow
          c.beginPath()
          c.arc(q.x, top + h * 0.12, Math.max(2, w * 1.2), 0, Math.PI * 2)
          c.fill()
          c.globalCompositeOperation = 'source-over'
        }
        if (opts.mark && q.z < 150) ring(left, top, w, h, opts.mark)
      },
    })
  }

  const startSeg = Math.max(0, Math.floor(baseDist / SEG))
  const endSeg = Math.min(track.segs.length - 1, Math.ceil((baseDist + SLICES * RS) / SEG))
  for (let j = startSeg; j <= endSeg; j++) {
    for (const d of track.segs[j].deco) {
      const s = decoSprite(d.kind, d.tint)
      const lateral = d.side * (ROAD_HALF * (1 + d.off) + s.wM / 2)
      place(j * SEG, lateral, s, { glow: d.kind === 'lamp' ? 'rgba(255,230,150,0.22)' : d.kind === 'neon' ? 'rgba(255,80,200,0.2)' : undefined })
    }
  }
  const markOf = (kind: Threat['kind'], id: number | string) => {
    if (me.lastHit && me.lastHit.id === id && race.t - me.lastHit.t < 0.8) return 'hit' as const
    return threat && threat.kind === kind && threat.id === id ? threat.level : undefined
  }
  const carShadow = (dist: number, latM: number) =>
    onGround(dist, latM, dist - baseDist + 0.1, () => {
      const sh = flat(dist, latM, 1.15, 2.5)
      if (sh) fill(sh, 'rgba(0,0,0,0.36)')
    })
  for (const h of race.hazards) {
    const pos = hazardAt(h, race.t)
    if (h.kind === 'traffic') {
      carShadow(pos, h.lat * ROAD_HALF)
      place(pos, h.lat * ROAD_HALF, carRear(['#7a8a9a', '#8a7a6a', '#6a8a7a', '#9a8aa0', '#a09a68'][h.id % 5]), { mark: markOf('traffic', h.id) })
    } else if (h.kind === 'oil') {
      // A sign each side of the road well before it, because a flat stain is a pixel tall from far off.
      for (const side of [-1, 1]) place(pos - 72, side * ROAD_HALF * 1.32, warningSign('oil'))
      // A stain lying on the road, as wide and as long as the part of it that takes your grip.
      const latM = h.lat * ROAD_HALF
      const halfW = OIL_HALF_W * ROAD_HALF
      onGround(pos, latM, pos - baseDist, () => {
        const edge = flat(pos, latM, halfW, OIL_HALF_L, 1.14)
        const base = flat(pos, latM, halfW, OIL_HALF_L)
        if (!edge || !base) return
        fill(edge, 'rgba(6,6,14,0.34)')
        fill(base, 'rgba(6,6,14,0.93)')
        const wob = Math.sin(view.tick * 0.06)
        const sheens: Array<[string, number, number]> = [['rgba(150,90,255,0.34)', 0.78, 0.4], ['rgba(60,210,200,0.3)', 0.58, -0.3], ['rgba(255,90,200,0.24)', 0.38, 0.2]]
        for (const [col, sc, off] of sheens) {
          const sh = flat(pos, latM, halfW, OIL_HALF_L, sc, wob * off * halfW * 0.35, off * OIL_HALF_L * 0.3)
          if (sh) fill(sh, col)
        }
        // The sky in it, a pale band along the far edge: what makes a dark stain read as wet.
        const sky = flat(pos, latM, halfW * 0.8, OIL_HALF_L * 0.34, 1, 0, OIL_HALF_L * 0.42)
        if (sky) fill(sky, 'rgba(190,212,255,0.4)')
        const spec = flat(pos, latM, halfW, OIL_HALF_L, 0.16, -halfW * 0.34, -OIL_HALF_L * 0.34)
        if (spec) fill(spec, 'rgba(255,255,255,0.5)')
        const mark = markOf('oil', h.id)
        if (mark && mark !== 'hit') {
          const big = flat(pos, latM, halfW, OIL_HALF_L, 1.28)
          if (big) {
            c.strokeStyle = mark === 'danger' ? 'rgba(255,70,50,0.9)' : 'rgba(255,205,60,0.85)'
            c.lineWidth = 1
            c.setLineDash([3, 3])
            c.beginPath()
            big.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)))
            c.closePath()
            c.stroke()
            c.setLineDash([])
          }
        }
      })
    } else {
      for (const side of [-1, 1]) place(pos - 62, side * ROAD_HALF * 1.32, warningSign('cone'))
      // Three cones across the lane, each a cone. Hit them and they are knocked over and flung aside.
      const knocked = me.struck.includes(h.id)
      for (let i = 0; i < 3; i++) {
        const side = i - 1
        const lat = h.lat * ROAD_HALF + side * CONE_HALF_W * ROAD_HALF * 0.66 + (knocked ? side * 2.4 : 0)
        const dist = pos + (i === 1 ? -0.4 : 0.35) + (knocked ? 1.6 + i * 0.8 : 0)
        place(dist, lat, knocked ? CONE_DOWN : CONE, { mark: i === 1 ? markOf('cone', h.id) : undefined })
      }
    }
  }
  for (const r of race.racers) {
    if (r === me) continue
    carShadow(r.dist, r.x * ROAD_HALF)
    place(r.dist, r.x * ROAD_HALF, carRear(r.paint, { braking: r.braking, wrecked: r.wrecked }), { mark: markOf(r.wrecked ? 'wreck' : 'car', r.id) })
  }
  ground.sort((a, b) => b.z - a.z)
  for (const d of ground) d.run()
  drawn.sort((a, b) => b.z - a.z)
  for (const d of drawn) d.run()

  // The player's car, bobbing on its springs, leaning into the wheel.
  drawPlayer(c, race, me, view, o, depth, k, slices[0], light)

  // Particles.
  updateParticles(c, view, o.dt)

  // Light.
  if (light.tint) {
    c.fillStyle = light.tint
    c.fillRect(0, 0, VIEW_W, VIEW_H)
  }
  if (light.night) drawHeadlights(c, me)

  // The edges of the screen streak with speed.
  if (vFrac > 0.62 || me.boosting) {
    const strength = Math.min(1, (vFrac - 0.55) * 2.2) + (me.boosting ? 0.5 : 0)
    c.fillStyle = `rgba(255,255,255,${0.1 + strength * 0.14})`
    for (let i = 0; i < 18; i++) {
      const a = ((view.tick * 0.07 + i * 0.137) % 1)
      const side = i % 2 ? 1 : -1
      const sx = VIEW_W / 2 + side * (70 + a * 120)
      const sy = HORIZON + 6 + ((i * 53) % (VIEW_H - HORIZON - 20)) * (0.3 + a * 0.7)
      c.fillRect(Math.round(sx), Math.round(sy), 1, Math.round(2 + a * 10 * strength))
    }
  }
  if (me.boosting) {
    // A pulse of zoom: the cheapest honest motion blur.
    c.globalAlpha = 0.16
    c.drawImage(c.canvas, -6, -4, VIEW_W + 12, VIEW_H + 8)
    c.globalAlpha = 1
  }
  // A vignette keeps the eye on the road.
  const vg = c.createRadialGradient(VIEW_W / 2, VIEW_H * 0.55, VIEW_H * 0.35, VIEW_W / 2, VIEW_H * 0.55, VIEW_W * 0.72)
  vg.addColorStop(0, 'rgba(0,0,0,0)')
  vg.addColorStop(1, 'rgba(0,0,0,0.38)')
  c.fillStyle = vg
  c.fillRect(0, 0, VIEW_W, VIEW_H)
  c.restore()

  if (view.flash.a > 0.01) {
    c.fillStyle = withAlpha(view.flash.color, view.flash.a)
    c.fillRect(0, 0, VIEW_W, VIEW_H)
    view.flash.a *= Math.pow(0.02, o.dt)
  }
  if (o.countdown !== null) drawLights(c, o.countdown)
  readEvents(race, me, view)
}

/** A remainder that is never negative: the camera starts behind the line, where slices count from below zero. */
function pmod(n: number, m: number): number {
  return ((n % m) + m) % m
}

function curveStep(race: Race, i: number): number {
  return curveAt(race.track, Math.max(0, i * RS)) * KAPPA * RS * RS
}

function project(x: number, y: number, z: number, depth: number, k: number) {
  const scale = depth / z
  return { x: VIEW_W / 2 + scale * x * k, y: HORIZON - scale * y * k, scale }
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16)
  const pb = parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`
}

function withAlpha(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

function drawLights(c: CanvasRenderingContext2D, countdown: number) {
  // The gantry over the road: three red lamps going out one by one, then green.
  const y = 20
  c.fillStyle = '#10101a'
  c.fillRect(VIEW_W / 2 - 40, y - 8, 80, 22)
  c.fillStyle = '#2a2a38'
  c.fillRect(VIEW_W / 2 - 38, y - 6, 76, 18)
  for (let i = 0; i < 3; i++) {
    const on = countdown > 0 ? i >= 3 - countdown : true
    const go = countdown === 0
    c.fillStyle = go ? '#48e070' : on ? '#ff3a30' : '#4a1a1a'
    c.beginPath()
    c.arc(VIEW_W / 2 - 22 + i * 22, y + 3, 7, 0, Math.PI * 2)
    c.fill()
    if (on || go) {
      c.fillStyle = go ? 'rgba(72,224,112,0.35)' : 'rgba(255,58,48,0.35)'
      c.beginPath()
      c.arc(VIEW_W / 2 - 22 + i * 22, y + 3, 11, 0, Math.PI * 2)
      c.fill()
    }
  }
}

function drawHeadlights(c: CanvasRenderingContext2D, me: Racer) {
  c.globalCompositeOperation = 'lighter'
  const x = VIEW_W / 2 + me.steer * 6
  const g = c.createRadialGradient(x, VIEW_H - 20, 4, x, VIEW_H - 50, 120)
  g.addColorStop(0, 'rgba(255,240,190,0.5)')
  g.addColorStop(0.5, 'rgba(255,240,190,0.16)')
  g.addColorStop(1, 'rgba(255,240,190,0)')
  c.fillStyle = g
  c.fillRect(0, HORIZON, VIEW_W, VIEW_H - HORIZON)
  c.globalCompositeOperation = 'source-over'
}

function drawPlayer(
  c: CanvasRenderingContext2D,
  race: Race,
  me: Racer,
  view: View,
  o: FrameOptions,
  depth: number,
  k: number,
  here: Slice,
  light: Light,
) {
  const w = 2.1 * (depth / PLAYER_Z) * k
  const lean = me.steer > 0.25 ? 3 : me.steer < -0.25 ? -3 : 0
  const dent = me.damage < 0.2 ? 0 : me.damage < 0.45 ? 1 : me.damage < 0.7 ? 2 : 3
  const s = carRear(me.paint, { braking: me.braking, wrecked: me.wrecked, lean, big: true, dent })
  const bob = me.v > 5 && !me.wrecked ? Math.sin(o.time * 38) * (0.4 + me.slide * 1.2) : 0
  const px = VIEW_W / 2 + me.steer * 4 + (me.slide > 0 ? Math.sin(o.time * 50) * me.slide : 0)
  const py = here.sy ? Math.min(VIEW_H - 4, here.sy + 6) : VIEW_H - 14
  const h = (w * s.img.height) / s.img.width

  // Shadow.
  c.fillStyle = 'rgba(0,0,0,0.35)'
  c.fillRect(Math.round(px - w / 2), Math.round(py + bob) - 2, Math.round(w), 3)

  // Boost flames out of the exhaust.
  if (me.boosting && !me.wrecked) {
    for (let i = 0; i < 2; i++) {
      c.fillStyle = i ? '#ffb030' : '#48b8ff'
      const fl = 6 + Math.random() * 7
      for (const sx of [-0.28, 0.28]) c.fillRect(Math.round(px + sx * w - 2), Math.round(py - h * 0.3 + bob), 4, Math.round(fl) * (i ? 0.6 : 1) * 0.5 + 1)
    }
  }
  c.save()
  if (me.wrecked) {
    view.spin += (me.v > 4 ? 9 : 0) * o.dt
    c.translate(px, py - h / 2)
    c.rotate(view.spin * Math.min(1, o.wreckedFor * 1.4))
    c.drawImage(s.img, -w / 2, -h / 2, w, h)
  } else {
    // A car in a skid points where it is sliding from: the nose swings the way it is being thrown.
    const yaw = Math.max(-0.4, Math.min(0.4, me.skid * 0.22 + (me.oil > 0 ? Math.sin(o.time * 22) * 0.08 : 0)))
    if (Math.abs(yaw) > 0.01) {
      c.translate(px, py - h * 0.3 + bob)
      c.rotate(yaw)
      c.drawImage(s.img, -w / 2, -h * 0.7, Math.round(w), Math.round(h))
    } else {
      c.drawImage(s.img, Math.round(px - w / 2), Math.round(py - h + bob), Math.round(w), Math.round(h))
    }
  }
  c.restore()
  if (light.night && me.braking && !me.wrecked) {
    c.globalCompositeOperation = 'lighter'
    c.fillStyle = 'rgba(255,60,40,0.3)'
    c.fillRect(Math.round(px - w / 2) - 2, Math.round(py - h * 0.5), Math.round(w) + 4, 8)
    c.globalCompositeOperation = 'source-over'
  }

  // Particles from the tyres and the body.
  const wheelY = py - 2
  if (!me.wrecked && me.v > 12) {
    if (me.slide > 0.1 || Math.abs(me.x) > 1.04 || me.oil > 0 || Math.abs(me.skid) > 0.4) {
      const col = Math.abs(me.x) > 1.04 ? '#9a8a60' : 'rgba(230,230,240,0.8)'
      for (const sx of [-0.4, 0.4]) {
        if (Math.random() < 0.7) view.particles.push({ x: px + sx * w, y: wheelY, vx: (Math.random() - 0.5) * 20 + sx * 30, vy: -10 - Math.random() * 16, life: 0.5, max: 0.5, color: col, size: 2 + Math.random() * 3 })
      }
    }
  }
  if (!me.wrecked && me.damage > 0.45 && Math.random() < 0.25 + me.damage * 0.4) {
    // A hurt car smokes from under the bonnet, and the worse it is the blacker.
    const black = me.damage > 0.7
    view.particles.push({ x: px + (Math.random() - 0.5) * w * 0.3, y: py - h * 0.75, vx: (Math.random() - 0.5) * 8, vy: -16 - Math.random() * 14, life: 0.8, max: 0.8, color: black ? 'rgba(20,20,26,0.75)' : 'rgba(200,200,210,0.6)', size: 2 + Math.random() * 3 })
  }
  if (me.wrecked && Math.random() < 0.6) {
    view.particles.push({ x: px + (Math.random() - 0.5) * w, y: py - h * 0.5, vx: (Math.random() - 0.5) * 18, vy: -30 - Math.random() * 20, life: 0.9, max: 0.9, color: 'rgba(60,60,70,0.7)', size: 3 + Math.random() * 4 })
  }
  if (race.t > 0 && me.dist < 3 && me.v > 3 && me.v < 25 && !me.wrecked) {
    for (const sx of [-0.4, 0.4]) view.particles.push({ x: px + sx * w, y: wheelY, vx: (Math.random() - 0.5) * 20, vy: -8 - Math.random() * 10, life: 0.4, max: 0.4, color: 'rgba(230,230,240,0.6)', size: 2 + Math.random() * 3 })
  }
}

function updateParticles(c: CanvasRenderingContext2D, view: View, dt: number) {
  const keep: Particle[] = []
  for (const p of view.particles) {
    p.life -= dt
    if (p.life <= 0) continue
    p.x += p.vx * dt
    p.y += p.vy * dt
    const a = p.life / p.max
    c.globalAlpha = Math.min(1, a * 1.4)
    c.fillStyle = p.color
    const s = p.size * (p.color.startsWith('rgba') ? 1.6 - a * 0.6 : 1)
    c.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)))
    keep.push(p)
  }
  c.globalAlpha = 1
  view.particles = keep.slice(-160)
}

/** Turns what the sim noted this tick into shakes, flashes, sparks and words. */
function readEvents(race: Race, me: Racer, view: View) {
  const pct = (d: number) => `-${Math.max(1, Math.round(d * 100))}%`
  const say = (text: string, t: number, color: string) => view.messages.push({ text, t, color })
  for (const e of me.events) {
    if (e.kind === 'hit') {
      view.shake = Math.max(view.shake, 3 + e.strength * 7)
      view.flash = { color: '#ffffff', a: 0.3 + e.strength * 0.4 }
      const what = e.cause === 'traffic' ? 'REAR-ENDED TRAFFIC' : e.cause === 'wreck' ? 'HIT A WRECK' : 'CONTACT'
      say(`${what} ${pct(e.damage)}`, 1.6, '#ff6a5a')
      burst(view, '#ffd860', 14)
    } else if (e.kind === 'wall') {
      view.shake = Math.max(view.shake, 2 + e.strength * 6)
      view.flash = { color: '#ffd860', a: 0.2 }
      say(`HIT THE WALL ${pct(e.damage)}`, 1.4, '#ffb040')
      burst(view, '#ffe888', 18)
    } else if (e.kind === 'scrape') {
      view.shake = Math.max(view.shake, 1.5)
      say(`KNOCKED A CONE ${pct(e.damage)}`, 1.1, '#f09040')
      burst(view, '#f09040', 5)
    } else if (e.kind === 'nearMiss') {
      say('NEAR MISS +BOOST', 0.9, '#58e8ff')
    } else if (e.kind === 'oil') {
      view.shake = Math.max(view.shake, 1)
      say('OIL! EASE OFF THE WHEEL', 1.6, '#c0a0ff')
    } else if (e.kind === 'wreck') {
      view.shake = 9
      view.flash = { color: '#ff3a30', a: 0.6 }
      say('WRECKED', 2, '#ff4a3a')
      burst(view, '#ffb030', 30)
    }
  }
  me.events.length = 0
  for (const r of race.racers) if (r !== me) r.events.length = 0
}

function burst(view: View, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 30 + Math.random() * 70
    view.particles.push({ x: VIEW_W / 2 + (Math.random() - 0.5) * 24, y: VIEW_H - 20, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30, life: 0.5 + Math.random() * 0.4, max: 0.9, color, size: 1 + Math.random() * 2 })
  }
}

