import { FIELD_SIZE, type Horse } from '../engine/horses'
import { hash2, mix, shade } from './pixel/color'
import { Raster } from './pixel/raster'
import { DIGITS, drawTiny } from './pixel/tiny'
import type { TimePeriod } from './time'

/**
 * The racecourse, drawn live: a packed grandstand across the track that stands up
 * and roars as the field turns for home, an infield with a tote board that keeps
 * the running order, six lanes of dirt in perspective, and your own row of the
 * stand along the bottom of the picture. Horses and jockeys are drawn from joints
 * every frame, so the gait is locked to the speed over the ground.
 *
 * Everything is in art pixels; the scene scales the canvas up whole pixels at a time.
 */

export const CW = 236
export const VIEW_H = 150
export const START_X = 44
export const FINISH_X = 800
export const WORLD_W = FINISH_X + 90
/** Feet of the rail horse and the outside horse, and how big each lane's runner is drawn. */
const FEET_FAR = 76
const LANE_GAP = 9.6
export const feetY = (post: number) => Math.round(FEET_FAR + post * LANE_GAP)
const laneScale = (post: number) => 0.8 + 0.05 * post
const PAR_SKY = 0.06
const PAR_STAND = 0.3
const PAR_INFIELD = 0.62
const PAR_NEAR = 1.45
/** The widest the view ever is, in art pixels: the layers behind it are painted this wide. */
export const MAX_VIEW = 420
const layerW = (p: number) => Math.ceil(MAX_VIEW + (WORLD_W - MAX_VIEW) * p) + 8

export interface RaceFrame {
  /** How wide the view is, in art pixels. */
  w: number
  /** Wall clock, for everything that moves on its own: the crowd, the flags, the nodding. */
  t: number
  /** World x of every horse's centre. */
  xs: number[]
  /** Art pixels per second, each. */
  speeds: number[]
  cam: number
  gateOpen: number
  /** 0..1: the crowd's temper. */
  excite: number
  /** The whip comes out in the stretch. */
  stretch: boolean
  /** Front to back. */
  order: number[]
  /** Where each horse is round the track, 0..1+, for the map. */
  progress: number[]
  place: number[]
  mine: number | null
  running: boolean
  /** A finished race: -1 nothing, 1 the bet won, 0 it lost. */
  verdict: -1 | 0 | 1
  /** 0..1 white-out for the photograph, and the banner text. */
  flash: number
  banner: string | null
  shake: number
  /** Seconds since the verdict, for confetti. */
  since: number
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  size: number
  color: string
  g: number
  flutter?: boolean
}

interface Coat {
  body: string
  light: string
  dark: string
  mane: string
}
const COATS: Record<Horse['coat'], Coat> = {
  bay: { body: '#8a4a28', light: '#a8643a', dark: '#4a2412', mane: '#1e1008' },
  chestnut: { body: '#b0602c', light: '#cc7c44', dark: '#6a3414', mane: '#5a2a10' },
  grey: { body: '#b8bcc4', light: '#dcdfe6', dark: '#7a7e88', mane: '#8a8e98' },
  black: { body: '#2c2a34', light: '#4a4858', dark: '#0c0a10', mane: '#0c0a10' },
  palomino: { body: '#d8b060', light: '#ecca80', dark: '#a8803c', mane: '#f0e0b0' },
}

/** The silks, by post: main colour, second colour, and how they are cut. */
const SILKS: Array<{ a: string; b: string; cut: 'solid' | 'hoops' | 'halves' | 'sash' | 'cross' | 'spots' }> = [
  { a: '#d83030', b: '#f4f0e4', cut: 'sash' },
  { a: '#2a5ad8', b: '#f0c830', cut: 'hoops' },
  { a: '#f0c830', b: '#2a2a30', cut: 'halves' },
  { a: '#30a050', b: '#f4f0e4', cut: 'cross' },
  { a: '#f4f0e4', b: '#d83030', cut: 'spots' },
  { a: '#c050d0', b: '#f4f0e4', cut: 'solid' },
]

const SKY: Record<TimePeriod, { top: string; low: string; light: number; warm: number }> = {
  morning: { top: '#86c4f0', low: '#f6e2b8', light: 1, warm: 0.15 },
  afternoon: { top: '#58a6ec', low: '#cfe6f6', light: 1, warm: 0 },
  evening: { top: '#34336e', low: '#f08850', light: 0.78, warm: 0.3 },
  night: { top: '#080a22', low: '#262c5c', light: 0.5, warm: 0 },
}

const SHIRTS = ['#d84a4a', '#4a7ad8', '#e8c84a', '#48b068', '#f0ece0', '#c868c8', '#e88a3a', '#5ac8d8', '#8a8a98', '#d86a8a']
const SKINS = ['#f4d4b4', '#d8a87a', '#c08654', '#8d5a3b', '#5e3a22', '#ecc6a2']

type Ctx = CanvasRenderingContext2D

const rnd = (x: number, y: number, s = 0) => hash2(x, y, s)

export class Stadium {
  private readonly sky: HTMLCanvasElement
  private readonly stand: HTMLCanvasElement
  private readonly infield: HTMLCanvasElement
  private readonly track: HTMLCanvasElement
  private readonly names: HTMLCanvasElement[]
  private readonly field: Horse[]
  private readonly period: TimePeriod
  private parts: Particle[] = []
  private lastPhase: number[][] = []
  private phase: number[] = []
  private seen = 0
  private confettiAt = -1
  private lastT = 0

  constructor(field: Horse[], period: TimePeriod) {
    this.field = field
    this.period = period
    this.sky = this.paintSky()
    this.stand = this.paintStand()
    this.infield = this.paintInfield()
    this.track = this.paintTrack()
    this.names = field.map((h) => {
      const r = new Raster(44, 6)
      drawTiny(r, h.name.slice(0, 11), 0, 0, '#f4f0e4')
      return r.toCanvas()
    })
    const tt = new Raster(40, 5)
    drawTiny(tt, 'TOTE BOARD', 2, 0, '#f2c84a')
    this.toteTitle = tt.toCanvas()
    this.phase = field.map((_, i) => i * 0.13)
    this.lastPhase = field.map(() => [0, 0, 0, 0])
  }

  private tone(hex: string): string {
    const s = SKY[this.period]
    const lit = shade(hex, s.light)
    return s.warm ? mix(lit, '#ff9a50', s.warm * 0.4) : lit
  }

  // ------------------------------------------------------------------ static layers

  private paintSky(): HTMLCanvasElement {
    const w = layerW(PAR_SKY)
    const r = new Raster(w, 60)
    const s = SKY[this.period]
    for (let y = 0; y < 60; y++) {
      const c = mix(s.top, s.low, Math.pow(y / 60, 1.3))
      r.rect(0, y, w, 1, c)
    }
    if (this.period === 'night') {
      for (let i = 0; i < 70; i++) r.set(Math.floor(rnd(i, 1) * w), Math.floor(rnd(i, 2) * 30), rnd(i, 3) > 0.7 ? '#ffffff' : '#9aa0d0')
      r.ellipse(w - 70, 6, 8, 8, '#f0eed8')
      r.ellipse(w - 67, 5, 7, 7, '#080a22')
    } else {
      for (let i = 0; i < 6; i++) {
        const cx = Math.floor(rnd(i, 4) * w)
        const cy = 4 + Math.floor(rnd(i, 5) * 18)
        const cloud = this.period === 'evening' ? '#f0a070' : '#ffffff'
        r.ellipse(cx, cy, 24, 6, cloud)
        r.ellipse(cx + 6, cy - 3, 14, 6, cloud)
        r.rect(cx + 2, cy + 5, 20, 1, shade(cloud, 0.88))
      }
    }
    // A skyline behind the stand: towers with lit windows.
    for (let x = 0; x < w; x += 9) {
      const h = 12 + Math.floor(rnd(x, 7) * 22)
      const c = this.period === 'night' ? '#141836' : this.period === 'evening' ? '#3a2a4a' : '#8a9ab8'
      r.rect(x, 52 - h, 9, h + 8, c)
      for (let wy = 52 - h + 2; wy < 54; wy += 3) {
        for (let wx = x + 1; wx < x + 8; wx += 3) {
          if (rnd(wx, wy) > 0.55) r.set(wx, wy, this.period === 'night' || this.period === 'evening' ? '#f8e08a' : shade(c, 0.85))
        }
      }
    }
    return r.toCanvas()
  }

  private paintStand(): HTMLCanvasElement {
    const w = layerW(PAR_STAND)
    const r = new Raster(w, 56)
    const T = (c: string) => this.tone(c)
    // The back wall and the tiers: concrete steps with a rail along each.
    r.rect(0, 0, w, 56, T('#5a5470'))
    for (let tier = 0; tier < 3; tier++) {
      const y = 16 + tier * 12
      r.rect(0, y, w, 12, T(tier % 2 ? '#6a6482' : '#605a78'))
      r.rect(0, y + 10, w, 2, T('#3a3450'))
      r.rect(0, y, w, 1, T('#8a84a0'))
      // Seat backs in rows between the walkways.
      for (let x = 0; x < w; x += 4) r.rect(x, y + 8, 3, 2, T(['#a83030', '#3050a8', '#308048'][(x / 4 + tier) % 3 | 0]))
    }
    // A concourse of glass under the roof with lit boxes.
    r.rect(0, 8, w, 8, T('#2a2640'))
    for (let x = 2; x < w; x += 12) {
      r.rect(x, 9, 9, 6, this.period === 'night' || this.period === 'evening' ? '#f8dc7a' : T('#9ac8e0'))
      r.rect(x, 9, 9, 1, T('#d8e8f0'))
      r.rect(x + 4, 9, 1, 6, T('#2a2640'))
    }
    // The roof: a long cantilever with a bright trim, and the sponsors across it.
    r.rect(0, 2, w, 7, T('#2a2a3a'))
    r.rect(0, 2, w, 1, T('#d8d8e8'))
    r.rect(0, 8, w, 1, T('#c83a3a'))
    for (let x = 4; x < w; x += 66) {
      r.rect(x, 3, 54, 5, T('#14101c'))
      drawTiny(r, ['POKER LEGEND', 'ACES HIGH', 'THE RACEBOOK', 'RIVER RUN', 'ALL IN', 'NEON MESA'][Math.floor(x / 66) % 6], x + 4, 4, '#f2c84a')
    }
    // Floodlight towers along the roof line.
    for (let x = 30; x < w; x += 110) {
      r.rect(x, 0, 2, 3, '#3a3a48')
      r.rect(x - 4, 0, 10, 1, '#d8d8e0')
    }
    return r.toCanvas()
  }

  private paintInfield(): HTMLCanvasElement {
    const w = layerW(PAR_INFIELD)
    const r = new Raster(w, 22)
    const T = (c: string) => this.tone(c)
    r.rect(0, 12, w, 10, T('#3a8a40'))
    for (let x = 0; x < w; x += 2) r.rect(x, 14 + (x % 3), 1, 1, T('#2e7434'))
    // A hedge, a row of poplars, flower beds and a pond.
    r.rect(0, 9, w, 4, T('#245a30'))
    for (let x = 0; x < w; x += 3) r.rect(x, 9 + (x % 2), 2, 1, T('#3a8a40'))
    for (let x = 14; x < w; x += 37) {
      r.ellipse(x - 4, 0, 9, 12, T('#2a6a34'))
      r.ellipse(x - 2, 2, 5, 8, T('#3a8a40'))
      r.rect(x, 11, 1, 3, T('#4a3018'))
    }
    for (let x = 6; x < w; x += 53) {
      for (let i = 0; i < 10; i++) r.set(x + (i % 5) * 2, 15 + Math.floor(i / 5) * 2, [T('#f06080'), T('#f8e060'), T('#ffffff')][i % 3])
    }
    r.ellipse(w * 0.45, 16, 40, 6, T('#4a8ad0'))
    r.ellipse(w * 0.45 + 4, 17, 20, 2, T('#8ac4f0'))
    return r.toCanvas()
  }

  private paintTrack(): HTMLCanvasElement {
    const w = WORLD_W
    const h = 70
    const r = new Raster(w, h)
    const T = (c: string) => this.tone(c)
    // Inner rail and the strip of grass between it and the dirt.
    r.rect(0, 0, w, 3, T('#3a8a40'))
    r.rect(0, 3, w, 1, T('#f4f0e4'))
    r.rect(0, 4, w, 1, T('#9a96a8'))
    for (let x = 0; x < w; x += 16) {
      r.rect(x, 1, 2, 5, T('#f4f0e4'))
      r.rect(x, 5, 3, 1, 'rgba(0,0,0,0.3)')
    }
    // The dirt: banded where the harrow went, flecked, and darker where it was wetted.
    r.rect(0, 6, w, 62, T('#b88a58'))
    for (let y = 6; y < 68; y++) {
      const band = Math.sin(y * 0.9) > 0.55
      if (band) r.rect(0, y, w, 1, T('#c19462'))
    }
    r.each(0, 6, w, 62, (x, y) => {
      const v = rnd(x, y, 9)
      if (v > 0.965) return T('#8a6038')
      if (v < 0.025) return T('#d4a874')
      return null
    })
    // Furlong poles and the finish.
    const span = FINISH_X - START_X
    for (let k = 0; k <= 6; k++) {
      const x = Math.round(START_X + (span * k) / 6)
      const fin = k === 6
      r.rect(x, -1 < 0 ? 0 : 0, 1, 1, '#fff')
      r.rect(x, 0, 2, 6, fin ? '#f4f0e4' : '#f2c84a')
      for (let y = 0; y < 6; y += 2) if (fin) r.rect(x, y, 2, 1, '#d82a2a')
    }
    // The finish line across the dirt: a chequered strip.
    for (let y = 6; y < 68; y += 2) {
      r.rect(FINISH_X - 1, y, 2, 1, '#f4f0e4')
      r.rect(FINISH_X + 1, y + 1, 2, 1, '#14101c')
      r.rect(FINISH_X + 1, y, 2, 1, '#f4f0e4')
      r.rect(FINISH_X - 1, y + 1, 2, 1, '#14101c')
    }
    // Pools of floodlight on the dirt after dark.
    if (this.period === 'night' || this.period === 'evening') {
      for (let x = 20; x < w; x += 90) r.ellipse(x, 14, 80, 40, this.period === 'night' ? 'rgba(255,244,200,0.16)' : 'rgba(255,220,160,0.1)')
    }
    // The starting gate's bays are drawn live; the markers where it stands:
    r.rect(START_X - 6, 6, 1, 62, 'rgba(255,255,255,0.35)')
    return r.toCanvas()
  }

  // ------------------------------------------------------------------ the horse

  private seg(c: Ctx, x0: number, y0: number, x1: number, y1: number, th: number, color: string) {
    c.fillStyle = color
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))))
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n
      const y = y0 + ((y1 - y0) * i) / n
      c.fillRect(Math.round(x - th / 2), Math.round(y - th / 2), Math.max(1, Math.round(th)), Math.max(1, Math.round(th)))
    }
  }

  /** Two bones from a hip to a foot, the joint pushed out to `bend` (+ forward). */
  private leg(c: Ctx, hx: number, hy: number, fx: number, fy: number, l1: number, l2: number, bend: number, th: number, color: string, hoof: string) {
    const dx = fx - hx
    const dy = fy - hy
    const d = Math.min(l1 + l2 - 0.01, Math.hypot(dx, dy))
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d)
    const hh = Math.sqrt(Math.max(0, l1 * l1 - a * a))
    const ux = dx / (Math.hypot(dx, dy) || 1)
    const uy = dy / (Math.hypot(dx, dy) || 1)
    const mx = hx + ux * a + -uy * hh * bend
    const my = hy + uy * a + ux * hh * bend
    this.seg(c, hx, hy, mx, my, th, color)
    this.seg(c, mx, my, fx, fy, Math.max(1, th - 0.6), color)
    c.fillStyle = hoof
    c.fillRect(Math.round(fx - 1), Math.round(fy - 1), 3, 2)
  }

  private drawHorse(c: Ctx, h: Horse, x: number, speed: number, f: RaceFrame, extra: { standing: boolean; entering: boolean }) {
    const post = h.post
    const s = laneScale(post)
    const coat = COATS[h.coat]
    const silk = SILKS[post]
    const tone = (v: string) => v
    const fy = feetY(post)
    const sx = Math.round(x - f.cam)
    // The gallop cycle follows the ground: one stride is about 15 pixels at full speed.
    const gallop = !extra.standing
    const running = speed > 30
    const rate = running ? speed / 17 : speed / 7
    const dt = Math.min(0.05, (f.t - this.lastT) / 1000)
    this.phase[post] = (this.phase[post] + rate * dt) % 1
    const ph = this.phase[post]
    const amp = running ? 1 : 0.55
    const bob = running ? Math.abs(Math.sin(ph * Math.PI * 2)) * 1.3 : 0
    const idle = extra.standing ? Math.sin(f.t / 600 + post) * 0.5 : 0
    const lift = running ? 5 : 2.5
    c.save()
    c.translate(sx, fy)
    c.scale(s, s)
    // Ground shadow.
    c.fillStyle = 'rgba(40,20,0,0.28)'
    c.fillRect(-12, -1, 25, 2)

    const hip = (n: number) => (n < 2 ? -7 : 5)
    const OFF = [0.0, 0.12, 0.42, 0.54] // far hind, near hind, far fore, near fore
    const legs: Array<{ i: number; far: boolean }> = [
      { i: 0, far: true },
      { i: 2, far: true },
      { i: 1, far: false },
      { i: 3, far: false },
    ]
    const drawLeg = (i: number, far: boolean) => {
      const p = (ph + OFF[i]) % 1
      const hx = hip(i)
      const hy = -10 - bob * 0.4
      let lx: number
      let ly = 0
      if (!gallop && !extra.entering) {
        lx = (i === 3 ? 3 : i === 2 ? -1 : i === 1 ? -2 : 2) + (i === 3 && Math.sin(f.t / 900 + post) > 0.92 ? 2 : 0)
      } else if (p < 0.4) {
        lx = (4 - (p / 0.4) * 8) * amp
      } else {
        const q = (p - 0.4) / 0.6
        lx = (-4 + q * 8.5) * amp
        ly = -Math.sin(q * Math.PI) * lift
      }
      if (p < 0.03 && this.lastPhase[post][i] > 0.9 && running && !far) this.dust(x + hx * s + lx * s, fy - 1, speed, post)
      this.lastPhase[post][i] = p
      const fore = i >= 2
      const col = far ? shade(coat.dark, 1.25) : coat.body
      this.leg(c, hx, hy, hx + lx, ly - 0.5, 5.2, 5.2, fore ? 1 : -1, 2, col, '#1a1410')
      if (!far) {
        c.fillStyle = coat.light
        c.fillRect(Math.round(hx - 1), Math.round(hy - 1), 2, 1)
      }
    }
    for (const l of legs.filter((l) => l.far)) drawLeg(l.i, true)

    // The barrel, quarters and shoulder.
    const by = -bob - idle * 0.3
    c.fillStyle = coat.body
    c.fillRect(-9, Math.round(-17 + by), 17, 8)
    c.fillRect(-10, Math.round(-16 + by), 2, 6)
    c.fillRect(8, Math.round(-16 + by), 2, 6)
    c.fillStyle = coat.light
    c.fillRect(-8, Math.round(-17 + by), 15, 2)
    c.fillStyle = coat.dark
    c.fillRect(-9, Math.round(-10 + by), 17, 1)
    c.fillRect(-1, Math.round(-12 + by), 2, 2)
    // Neck, head and mane: the head nods with the stride.
    const nod = running ? Math.sin(ph * Math.PI * 2 + 1) * 1.4 : idle * 2
    const hxn = 9
    this.seg(c, 6, -15 + by, hxn + 3, -21 + by + nod * 0.4, 4, coat.body)
    this.seg(c, 5, -17 + by, hxn + 2, -22 + by + nod * 0.4, 1.5, coat.mane)
    c.fillStyle = coat.body
    c.fillRect(hxn + 3, Math.round(-23 + by + nod), 7, 4)
    c.fillRect(hxn + 8, Math.round(-21 + by + nod), 3, 3)
    c.fillStyle = coat.dark
    c.fillRect(hxn + 10, Math.round(-20 + by + nod), 2, 2)
    c.fillStyle = '#14101a'
    c.fillRect(hxn + 6, Math.round(-22 + by + nod), 1, 1)
    c.fillStyle = coat.mane
    c.fillRect(hxn + 4, Math.round(-25 + by + nod), 2, 2)
    // Bridle and a blaze on some.
    c.fillStyle = '#4a2a14'
    c.fillRect(hxn + 4, Math.round(-23 + by + nod), 1, 4)
    if (post % 2 === 0) {
      c.fillStyle = '#f4f0e4'
      c.fillRect(hxn + 7, Math.round(-23 + by + nod), 1, 3)
    }
    // Tail streaming out behind, waving with the stride.
    const tw = running ? Math.sin(ph * Math.PI * 4) * 1.5 : Math.sin(f.t / 700 + post) * 1.2
    const tl = running ? 9 : 4
    this.seg(c, -9, -16 + by, -9 - tl, -15 + by + tw, 2, coat.mane)
    this.seg(c, -9 - tl, -15 + by + tw, -9 - tl - 3, -13 + by + tw * 1.5 + (running ? 0 : 3), 1.5, coat.mane)

    for (const l of legs.filter((l) => !l.far)) drawLeg(l.i, false)

    // Saddle cloth with the number.
    c.fillStyle = silk.a
    c.fillRect(-3, Math.round(-17 + by), 6, 5)
    c.fillStyle = silk.b
    c.fillRect(-3, Math.round(-17 + by), 6, 1)
    const glyph = DIGITS[String(post + 1)]
    c.fillStyle = silk.a === '#f4f0e4' || silk.a === '#f0c830' ? '#14101c' : '#ffffff'
    glyph.forEach((row, gy) => {
      for (let gx = 0; gx < 3; gx++) if (row[gx] === '#') c.fillRect(-2 + gx + 1, Math.round(-16 + by) + gy * 0.8, 1, 1)
    })
    void tone

    // The jockey: crouched into the wind, hands low on the neck.
    const crouch = running ? 1 : 0.3
    const buttX = -3
    const buttY = -19 + by
    const shX = 3 + 2 * crouch
    const shY = -24 + by + (1 - crouch) * -1.5
    const bob2 = running ? Math.sin(ph * Math.PI * 2) * 0.6 : 0
    // Boot and knee, tucked.
    this.seg(c, buttX, buttY, 1, -16 + by, 2, shade(silk.b === '#2a2a30' ? '#f4f0e4' : '#f4f0e4', 0.95))
    this.seg(c, 1, -16 + by, 0, -12.5 + by, 1.5, '#f4f0e4')
    c.fillStyle = '#14101c'
    c.fillRect(-1, Math.round(-13 + by), 3, 2)
    // Torso, cut in silks.
    const parts = 6
    for (let i = 0; i < parts; i++) {
      const u = i / (parts - 1)
      const px = buttX + (shX - buttX) * u
      const py = buttY + (shY - buttY) * u + bob2
      let col = silk.a
      if (silk.cut === 'hoops') col = i % 2 ? silk.b : silk.a
      else if (silk.cut === 'halves') col = u < 0.5 ? silk.a : silk.b
      else if (silk.cut === 'sash') col = i === 2 || i === 3 ? silk.b : silk.a
      else if (silk.cut === 'cross') col = i === 2 ? silk.b : silk.a
      else if (silk.cut === 'spots') col = i % 2 ? silk.b : silk.a
      c.fillStyle = col
      c.fillRect(Math.round(px - 2), Math.round(py - 2), 4, 3)
    }
    // Head: helmet in the second colour with a peak.
    const hdx = shX + 2.5
    const hdy = shY - 2.5 + bob2
    c.fillStyle = '#e8b890'
    c.fillRect(Math.round(hdx - 1), Math.round(hdy), 3, 3)
    c.fillStyle = silk.cut === 'solid' ? silk.b : silk.b
    c.fillRect(Math.round(hdx - 2), Math.round(hdy - 2), 5, 3)
    c.fillStyle = shade(silk.b, 0.7)
    c.fillRect(Math.round(hdx + 2), Math.round(hdy), 2, 1)
    c.fillStyle = '#14101c'
    c.fillRect(Math.round(hdx + 1), Math.round(hdy + 1), 1, 1)
    // Goggles flash.
    c.fillStyle = '#9ad8ff'
    c.fillRect(Math.round(hdx + 1), Math.round(hdy), 2, 1)
    // Arms: reins to the hands, and the whip in the stretch.
    const whipOn = f.stretch && running
    const swing = whipOn ? Math.sin(f.t / 120 + post * 2) : -1
    if (whipOn && swing > -0.2) {
      const ex = shX + 2
      const ey = shY - 4
      this.seg(c, shX, shY, ex, ey, 1.5, '#e8b890')
      this.seg(c, ex, ey, ex - 3 + swing * 4, ey - 4 + swing * 2, 1, '#2a1a0a')
      c.fillStyle = '#2a1a0a'
      c.fillRect(Math.round(ex + 2), Math.round(ey), 1, 1)
    } else {
      this.seg(c, shX, shY, shX + 3, shY + 2.5, 1.5, '#e8b890')
      this.seg(c, shX + 3, shY + 2.5, hxn + 1, -19 + by, 1.2, '#e8b890')
    }
    c.fillStyle = '#4a2a14'
    c.fillRect(Math.round(hxn - 2), Math.round(-20 + by), 5, 1)
    c.restore()
  }

  private dust(x: number, y: number, speed: number, post: number) {
    for (let i = 0; i < 2; i++) {
      this.parts.push({
        x,
        y,
        vx: -speed * 0.012 - Math.random() * 0.6,
        vy: -0.2 - Math.random() * 0.5,
        life: 0,
        max: 18 + Math.random() * 12,
        size: 1 + Math.floor(Math.random() * 2),
        color: Math.random() > 0.4 ? '#d8b888' : '#a07848',
        g: 0.03,
      })
    }
    if (Math.random() < 0.3) {
      this.parts.push({ x, y, vx: -speed * 0.02 - Math.random(), vy: -1.2 - Math.random(), life: 0, max: 14, size: 1, color: '#6a4a2a', g: 0.18 })
    }
    void post
  }

  // ------------------------------------------------------------------ the crowd

  private crowd(c: Ctx, f: RaceFrame) {
    const off = Math.round(f.cam * PAR_STAND)
    const e = f.excite
    const T = (v: string) => this.tone(v)
    const x0 = Math.floor(off / 4) * 4
    for (let tier = 0; tier < 3; tier++) {
      const ybase = 24 + tier * 12
      for (let wx = x0 - 4; wx < off + f.w + 4; wx += 4) {
        const k = wx / 4
        const who = rnd(k, tier, 11)
        if (who < 0.06) continue
        const wave = f.verdict === 1 ? Math.max(0, Math.sin(f.t / 260 - wx / 22)) : 0
        const jump = e > 0.35 ? Math.abs(Math.sin(f.t / (120 + who * 90) + who * 40)) * (e * 3.2) : Math.sin(f.t / 700 + who * 30) * 0.5
        const dip = f.verdict === 0 ? 1 : 0
        const y = Math.round(ybase - jump - wave * 3 + dip)
        const sx = wx - off
        const shirt = T(SHIRTS[Math.floor(rnd(k, tier, 12) * SHIRTS.length)])
        const skin = T(SKINS[Math.floor(rnd(k, tier, 13) * SKINS.length)])
        c.fillStyle = shirt
        c.fillRect(sx, y + 2, 3, 3)
        c.fillStyle = skin
        c.fillRect(sx, y - 1, 3, 3)
        if (rnd(k, tier, 14) > 0.6) {
          c.fillStyle = T(SHIRTS[Math.floor(rnd(k, tier, 15) * SHIRTS.length)])
          c.fillRect(sx, y - 1, 3, 1)
        }
        // Arms in the air when it gets loud, a flag on a few.
        if ((e > 0.55 || wave > 0.4) && rnd(k, tier, 16) > 0.45) {
          c.fillStyle = skin
          const raise = Math.sin(f.t / 100 + who * 20) > 0 ? 4 : 3
          c.fillRect(sx - 1, y - raise, 1, raise)
          c.fillRect(sx + 3, y - raise + 1, 1, raise - 1)
        }
        if (rnd(k, tier, 17) > 0.96) {
          c.fillStyle = '#e8e0d0'
          c.fillRect(sx + 1, y - 7, 1, 7)
          c.fillStyle = SKINS.length ? T('#d83030') : '#fff'
          c.fillRect(sx + 2, y - 7, 3, 2 + Math.round(Math.sin(f.t / 120 + k) * 0.6))
        }
      }
    }
    // Camera flashes in the dark.
    if (e > 0.5 || f.flash > 0) {
      for (let i = 0; i < 4; i++) {
        if (Math.random() < 0.3 + e * 0.4) {
          c.fillStyle = '#fffbe0'
          const fx = Math.floor(Math.random() * f.w)
          const fy = 22 + Math.floor(Math.random() * 36)
          c.fillRect(fx, fy, 2, 2)
          c.fillRect(fx - 1, fy + 0, 1, 1)
        }
      }
    }
  }

  private foreground(c: Ctx, f: RaceFrame) {
    // The near rail along the bottom of the dirt.
    const off = Math.round(f.cam)
    c.fillStyle = '#e8e4f0'
    c.fillRect(0, 130, f.w, 2)
    c.fillStyle = '#8a86a0'
    c.fillRect(0, 132, f.w, 1)
    c.fillStyle = '#c8c4d8'
    for (let x = -(off % 18); x < f.w; x += 18) c.fillRect(x, 126, 2, 8)
    c.fillStyle = 'rgba(0,0,0,0.35)'
    c.fillRect(0, 133, f.w, 2)
    // Your row: heads and shoulders, close and dark against the track lights.
    const off2 = Math.round(f.cam * PAR_NEAR)
    for (let wx = -(off2 % 14) - 14; wx < f.w + 14; wx += 14) {
      const k = Math.floor((wx + off2) / 14)
      const who = rnd(k, 99, 3)
      const shirt = this.tone(SHIRTS[Math.floor(rnd(k, 99, 4) * SHIRTS.length)])
      const skin = this.tone(SKINS[Math.floor(rnd(k, 99, 5) * SKINS.length)])
      const hop = f.excite > 0.4 ? Math.abs(Math.sin(f.t / (140 + who * 80) + who * 30)) * f.excite * 5 : Math.sin(f.t / 900 + who * 9) * 0.8
      const y = Math.round(138 - hop + (f.verdict === 0 ? 3 : 0))
      const dark = shade(shirt, 0.55)
      c.fillStyle = dark
      c.fillRect(wx - 2, y + 6, 14, 20)
      c.fillStyle = shade(shirt, 0.75)
      c.fillRect(wx - 1, y + 6, 12, 2)
      c.fillStyle = shade(skin, 0.6)
      c.fillRect(wx + 2, y - 2, 7, 8)
      c.fillStyle = shade(['#2a1a10', '#141010', '#8a5a2a', '#c8a050', '#3a2a2a'][Math.floor(who * 5)] ?? '#141010', 1)
      c.fillRect(wx + 2, y - 3, 7, 3)
      if (who > 0.8) {
        c.fillStyle = shade(shirt, 0.5)
        c.fillRect(wx, y - 5, 11, 2)
        c.fillRect(wx + 3, y - 7, 5, 3)
      }
      if (f.excite > 0.6 && who > 0.4) {
        c.fillStyle = shade(skin, 0.6)
        c.fillRect(wx - 2, y - 8, 2, 12)
        if (who > 0.7) {
          c.fillStyle = '#f4f0e4'
          c.fillRect(wx - 3, y - 11, 4, 3)
        }
      }
    }
    // Vignette: the stand rolls in at the bottom corners.
    const g = c.createLinearGradient(0, 120, 0, VIEW_H)
    g.addColorStop(0, 'rgba(10,8,20,0)')
    g.addColorStop(1, 'rgba(10,8,20,0.45)')
    c.fillStyle = g
    c.fillRect(0, 120, f.w, 30)
  }

  // ------------------------------------------------------------------ the picture

  private gate(c: Ctx, f: RaceFrame, front: boolean) {
    const gx = Math.round(START_X + 2 - f.cam)
    if (gx < -60 || gx > f.w) return
    const open = f.gateOpen
    for (let post = 0; post < FIELD_SIZE; post++) {
      const s = laneScale(post)
      const fy = feetY(post)
      const top = Math.round(fy - 30 * s)
      const h = Math.round(31 * s)
      if (!front) {
        // The back of the stall and the side frame.
        c.fillStyle = '#4a4a5a'
        c.fillRect(gx - 4, top, 2, h)
        c.fillStyle = '#6a6a7a'
        c.fillRect(gx - 4, top, 48, 2)
      } else {
        // Front doors: a latticed gate that swings up and away.
        const doorH = Math.round(h * (1 - Math.min(1, open)))
        c.fillStyle = '#a8a8b8'
        c.fillRect(gx + 42, top, 2, h)
        if (doorH > 1) {
          c.fillStyle = '#d8d8e4'
          for (let y = 0; y < doorH; y += 3) c.fillRect(gx + 42, top + y, 1, 2)
          c.fillStyle = '#c83a3a'
          c.fillRect(gx + 41, top, 4, 2)
          c.fillStyle = 'rgba(255,255,255,0.3)'
          c.fillRect(gx + 42, top + doorH - 1, 1, 1)
        }
        c.fillStyle = '#7a7a8a'
        c.fillRect(gx + 42, fy - 1, 3, 2)
      }
    }
    if (front) {
      c.fillStyle = '#2a2a38'
      c.fillRect(gx - 5, feetY(0) - 34, 52, 3)
      c.fillStyle = '#f2c84a'
      c.fillRect(gx - 5, feetY(0) - 34, 52, 1)
    }
  }

  private tote(c: Ctx, f: RaceFrame) {
    const x = Math.round(560 * PAR_INFIELD - f.cam * PAR_INFIELD) - 20
    const bx = Math.round(300 - f.cam * PAR_INFIELD)
    void x
    if (bx < -70 || bx > f.w) return
    const by = 20
    c.fillStyle = '#14101c'
    c.fillRect(bx, by, 62, 42)
    c.fillStyle = '#f2c84a'
    c.fillRect(bx, by, 62, 1)
    c.fillRect(bx, by + 41, 62, 1)
    c.fillStyle = '#2a2a3a'
    c.fillRect(bx + 28, by + 42, 5, 4)
    c.fillStyle = '#f2c84a'
    c.fillRect(bx + 1, by + 1, 60, 6)
    c.fillStyle = '#14101c'
    c.fillRect(bx + 2, by + 2, 58, 4)
    const lit = Math.floor(f.t / 400) % 2 === 0
    c.fillStyle = lit ? '#e83a3a' : '#f2c84a'
    c.fillRect(bx + 4, by + 3, 2, 2)
    c.fillRect(bx + 56, by + 3, 2, 2)
    c.drawImage(this.toteTitle, bx + 12, by + 2)
    f.order.forEach((post, row) => {
      const y = by + 8 + row * 5.3
      const silk = SILKS[post]
      c.fillStyle = '#f2c84a'
      c.fillRect(bx + 3, Math.round(y), 5, 5)
      c.fillStyle = silk.a
      c.fillRect(bx + 4, Math.round(y) + 1, 3, 3)
      void silk
      c.drawImage(this.names[post], bx + 11, Math.round(y))
      if (f.place[post] >= 0) {
        c.fillStyle = f.place[post] === 0 ? '#f2c84a' : '#9ad8ff'
        c.fillRect(bx + 56, Math.round(y), 4, 5)
      }
    })
  }

  private hud(c: Ctx, f: RaceFrame) {
    if (f.running || f.verdict >= 0) {
      // Running order along the top: front of the field on the left.
      const w = FIELD_SIZE * 12 + 4
      c.fillStyle = 'rgba(10,8,20,0.7)'
      c.fillRect(3, 3, w, 11)
      f.order.forEach((post, i) => {
        const x = 5 + i * 12
        const silk = SILKS[post]
        c.fillStyle = f.mine === post ? '#f2c84a' : '#2a2a38'
        c.fillRect(x - 1, 4, 11, 9)
        c.fillStyle = silk.a
        c.fillRect(x, 5, 9, 7)
        c.fillStyle = silk.b
        c.fillRect(x, 5, 9, 1)
        c.fillStyle = silk.a === '#f4f0e4' || silk.a === '#f0c830' ? '#14101c' : '#ffffff'
        DIGITS[String(post + 1)].forEach((row, gy) => {
          for (let gx = 0; gx < 3; gx++) if (row[gx] === '#') c.fillRect(x + 3 + gx, 6 + gy * 1.2, 1, 1)
        })
      })
      // The map: an oval with a dot for every horse.
      const mx = f.w - 46
      c.fillStyle = 'rgba(10,8,20,0.7)'
      c.fillRect(mx - 2, 3, 44, 21)
      c.strokeStyle = '#8a7a58'
      c.lineWidth = 3
      c.beginPath()
      c.ellipse(mx + 20, 13.5, 16, 6, 0, 0, Math.PI * 2)
      c.stroke()
      c.strokeStyle = '#d8b888'
      c.lineWidth = 1
      c.beginPath()
      c.ellipse(mx + 20, 13.5, 16, 6, 0, 0, Math.PI * 2)
      c.stroke()
      c.fillStyle = '#f4f0e4'
      c.fillRect(mx + 20, 5, 1, 4)
      f.progress.forEach((p, post) => {
        const a = Math.PI / 2 + Math.min(1.02, p) * Math.PI * 2
        c.fillStyle = SILKS[post].a
        const px = Math.round(mx + 20 + Math.cos(a) * 16)
        const py = Math.round(13.5 + Math.sin(a) * 6)
        c.fillRect(px - 1, py - 1, 3, 3)
        if (f.mine === post) {
          c.fillStyle = '#f2c84a'
          c.fillRect(px - 2, py - 2, 5, 1)
          c.fillRect(px - 2, py + 2, 5, 1)
        }
      })
    }
  }

  private confetti(c: Ctx, f: RaceFrame) {
    if (f.verdict < 0) {
      this.confettiAt = -1
      return
    }
    if (this.confettiAt < 0) this.confettiAt = f.t
    const age = f.t - this.confettiAt
    const rate = f.verdict === 1 ? 6 : 2
    if (age < 3200) {
      for (let i = 0; i < rate; i++) {
        this.parts.push({
          x: Math.random() * f.w + f.cam,
          y: -4,
          vx: (Math.random() - 0.5) * 0.6,
          vy: 0.4 + Math.random() * 0.5,
          life: 0,
          max: 110,
          size: 1 + Math.floor(Math.random() * 2),
          color: f.verdict === 1 ? ['#f2c84a', '#e83a3a', '#4ac8ff', '#ffffff', '#6aff8a', '#ff6ac8'][Math.floor(Math.random() * 6)] : '#f4f0e4',
          g: 0.004,
          flutter: true,
        })
      }
    }
    void c
  }

  draw(c: Ctx, f: RaceFrame): void {
    c.imageSmoothingEnabled = false
    const shakeX = f.shake > 0 ? Math.round((Math.random() - 0.5) * f.shake * 3) : 0
    const shakeY = f.shake > 0 ? Math.round((Math.random() - 0.5) * f.shake * 3) : 0
    c.save()
    c.translate(shakeX, shakeY)
    c.fillStyle = '#100c14'
    c.fillRect(-4, -4, f.w + 8, VIEW_H + 8)
    // Back to front: sky, the stand and its crowd, the infield, the dirt.
    c.drawImage(this.sky, -Math.round(f.cam * PAR_SKY), 0)
    c.drawImage(this.stand, -Math.round(f.cam * PAR_STAND), 6)
    c.save()
    c.translate(0, 6)
    this.crowd(c, f)
    c.restore()
    c.drawImage(this.infield, -Math.round(f.cam * PAR_INFIELD), 46)
    this.tote(c, f)
    c.drawImage(this.track, -Math.round(f.cam), 58)
    // Night: the whole picture goes down a notch before the lights go on over the track.
    // The gate's back, then horses far to near, the gate's doors, then dust.
    this.gate(c, f, false)
    const order = [...this.field].sort((a, b) => a.post - b.post)
    for (const h of order) {
      const standing = f.speeds[h.post] < 3
      const entering = !standing && f.speeds[h.post] < 30 && !f.running
      this.drawHorse(c, h, f.xs[h.post], f.speeds[h.post], f, { standing, entering })
      if (h.post === 1 || h.post === 3) this.gate(c, f, true)
    }
    if (order.length < 2) this.gate(c, f, true)
    this.confetti(c, f)
    // Particles.
    this.parts = this.parts.filter((p) => p.life < p.max && p.y < VIEW_H + 4)
    for (const p of this.parts) {
      p.life++
      p.vy += p.g
      p.x += p.vx + (p.flutter ? Math.sin((p.life + p.max) / 7) * 0.5 : 0)
      p.y += p.vy
      const a = Math.max(0, 1 - p.life / p.max)
      c.globalAlpha = p.flutter ? 1 : a * 0.8
      c.fillStyle = p.color
      c.fillRect(Math.round(p.x - f.cam), Math.round(p.y), p.size, p.size)
    }
    c.globalAlpha = 1
    this.foreground(c, f)
    // After dark: a wash over everything and the lamps standing out of it.
    if (this.period === 'night') {
      c.fillStyle = 'rgba(8,10,40,0.18)'
      c.fillRect(0, 0, f.w, 58)
    }
    this.hud(c, f)
    // The photograph: a white flash, then a banner.
    if (f.flash > 0) {
      c.fillStyle = `rgba(255,255,255,${Math.min(0.9, f.flash)})`
      c.fillRect(0, 0, f.w, VIEW_H)
    }
    if (f.banner) {
      const w = f.banner.length * 8 + 12
      const bx = Math.round((f.w - w) / 2)
      const by = 34
      c.fillStyle = '#14101c'
      c.fillRect(bx - 1, by - 1, w + 2, 19)
      c.fillStyle = Math.floor(f.t / 220) % 2 ? '#f2c84a' : '#e83a3a'
      c.fillRect(bx, by, w, 17)
      c.fillStyle = '#14101c'
      c.fillRect(bx + 2, by + 2, w - 4, 13)
      if (!this.banners.has(f.banner)) {
        const r = new Raster(f.banner.length * 8 + 4, 10)
        drawTiny(r, f.banner, 0, 0, '#f4f0e4', 2)
        this.banners.set(f.banner, r.toCanvas())
      }
      const bc = this.banners.get(f.banner)!
      c.drawImage(bc, bx + 6, by + 3)
    }
    c.restore()
    this.lastT = f.t
    void this.seen
  }

  private banners = new Map<string, HTMLCanvasElement>()
  private readonly toteTitle: HTMLCanvasElement
}
