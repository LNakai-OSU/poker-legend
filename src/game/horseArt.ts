import { FIELD_SIZE, type Horse } from '../engine/horses'
import { dither, hash2 } from './pixel/color'
import { drawText } from './pixel/font'
import { Raster } from './pixel/raster'

/** Art pixels. The view is a window onto a long track that scrolls after the leader. */
export const CW = 236
export const LANE = 13
export const LANES_TOP = 34
export const TRACK_H = LANES_TOP + FIELD_SIZE * LANE + 14
export const SPR_W = 30
export const SPR_H = 22
export const START_X = 40
export const FINISH_X = 800
export const WORLD_W = FINISH_X + 90
/** How much slower the grandstand slides than the track: it is further away. */
export const FAR_PARALLAX = 0.35
export const FAR_W = Math.ceil(CW + (WORLD_W - CW) * FAR_PARALLAX)
export const FAR_H = LANES_TOP + 8

export const laneTop = (post: number) => LANES_TOP + post * LANE
/** Where a horse's top-left is, in track pixels, for how far round it has got (0 at the gate, 1 at the line). */
export function horseLeft(progress: number): number {
  const toLine = FINISH_X - SPR_W - START_X
  return START_X + Math.min(1, progress) * toLine + (progress > 1 ? (progress - 1) * 60 : 0)
}
export function horseTop(post: number): number {
  return laneTop(post) + LANE - SPR_H + 3
}

const COATS: Record<Horse['coat'], { body: string; light: string; dark: string; mane: string }> = {
  bay: { body: '#8a4a28', light: '#a8643a', dark: '#4a2412', mane: '#1e1008' },
  chestnut: { body: '#b0602c', light: '#cc7c44', dark: '#6a3414', mane: '#5a2a10' },
  grey: { body: '#b8bcc4', light: '#d8dce4', dark: '#6a6e78', mane: '#8a8e98' },
  black: { body: '#2c2a34', light: '#4a4858', dark: '#0c0a10', mane: '#0c0a10' },
  palomino: { body: '#d8b060', light: '#ecca80', dark: '#a8803c', mane: '#f0e0b0' },
}

const INKED = '#15101a'
const HOOF = '#1a1410'

/** Where each leg's hip, knee and hoof are in the four beats of a gallop: front pair, then back pair, near and far. */
const GAIT: Array<Array<[number, number, number, number]>> = [
  // [hipX, hipY, hoofX, hoofY]
  [[21, 13, 27, 19], [19, 13, 24, 20], [8, 13, 2, 18], [10, 13, 5, 20]],
  [[21, 13, 23, 20], [19, 13, 21, 20], [8, 13, 9, 20], [10, 13, 12, 20]],
  [[21, 13, 17, 19], [19, 13, 15, 20], [8, 13, 14, 19], [10, 13, 17, 20]],
  [[21, 13, 21, 20], [19, 13, 19, 20], [8, 13, 7, 20], [10, 13, 10, 20]],
]

function leg(r: Raster, [x0, y0, x1, y1]: [number, number, number, number], body: string, hoof: string): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps)
    const y = Math.round(y0 + ((y1 - y0) * i) / steps)
    r.rect(x, y, 2, 1, i >= steps - 1 ? hoof : body)
  }
}

/** A racehorse at full stretch in one of four beats of the gallop, a jockey crouched over it in the horse's silks. */
export function horseRaster(horse: Horse, frame: number): Raster {
  const r = new Raster(SPR_W, SPR_H)
  const c = COATS[horse.coat]
  const beat = ((frame % 4) + 4) % 4
  const gather = beat === 1 || beat === 3
  // Far legs first, in shadow, then the body, then the near legs.
  const g = GAIT[beat]
  leg(r, g[1], c.dark, HOOF)
  leg(r, g[3], c.dark, HOOF)
  // Tail streaming behind, longer at full stretch.
  r.rect(1, 5, 5, 2, c.mane)
  r.rect(0, gather ? 7 : 6, 3, 3, c.mane)
  // The body: haunch, barrel, chest.
  r.rect(5, 6, 5, 8, c.body)
  r.rect(8, 6, 11, 8, c.body)
  r.rect(18, 5, 5, 9, c.body)
  r.rect(8, 6, 11, 2, c.light)
  r.rect(6, 6, 3, 2, c.light)
  r.rect(7, 13, 12, 1, c.dark)
  // Neck, head and mane.
  r.rect(21, 3, 4, 4, c.body)
  r.rect(23, 1, 4, 4, c.body)
  r.rect(26, 2, 4, 3, c.body)
  r.rect(28, 4, 2, 2, c.dark)
  r.rect(22, 1, 2, 6, c.mane)
  r.set(25, 0, c.dark)
  r.set(26, 1, c.dark)
  r.set(27, 2, INKED)
  // The saddle cloth in the silks with its number.
  r.rect(10, 6, 7, 6, horse.silks)
  r.rect(10, 6, 7, 1, '#f4f0e4')
  drawText(r, `${horse.post + 1}`, 12, 7, '#15101a')
  // Near legs.
  leg(r, g[0], c.body, HOOF)
  leg(r, g[2], c.body, HOOF)
  // The jockey, lower at full stretch, whip up on alternate beats.
  const jy = gather ? 0 : 1
  r.rect(10, 1 + jy, 7, 4, horse.silks)
  r.rect(15, jy - 1, 4, 4, '#f0c8a0')
  r.rect(15, jy - 1, 4, 2, horse.silks)
  r.rect(17, 2 + jy, 7, 2, '#f0c8a0')
  if (beat % 2 === 0) {
    r.rect(7, jy - 1, 4, 1, '#f4f0e4')
    r.set(6, jy, '#f4f0e4')
  }
  r.set(11, 5 + jy, '#f4f0e4')
  r.outline(INKED)
  return r
}

// ---------------------------------------------------------------------------
// The track
// ---------------------------------------------------------------------------

/** The far side of the course: sky, hills, grandstands full of people, flags. Slides slowly. */
export function paintFar(): Raster {
  const r = new Raster(FAR_W, FAR_H)
  r.each(0, 0, FAR_W, FAR_H, (_x, y) => {
    const t = y / FAR_H
    return t < 0.4 ? '#78b4e8' : t < 0.7 ? '#9ccaf0' : '#bcdcf4'
  })
  // Rolling hills.
  for (let x = 0; x < FAR_W; x++) {
    const h = 10 + Math.round(5 * Math.sin(x / 31) + 3 * Math.sin(x / 13 + 2))
    r.rect(x, 24 - h, 1, h + 4, '#4a8a5a')
    r.rect(x, 24 - h, 1, 2, '#6aaa78')
  }
  // Grandstands with a striped roof, rows of spectators, a flag on each end.
  for (let x0 = -10; x0 < FAR_W; x0 += 150) {
    const w = 96
    r.rect(x0, 11, w, 17, '#4a4258')
    for (let row = 0; row < 3; row++) {
      for (let x = x0 + 2; x < x0 + w - 2; x += 3) {
        const v = hash2(x, row, x0)
        r.rect(x, 14 + row * 4, 2, 3, ['#d8a87a', '#8d5a3b', '#f4d4b4', '#c08654'][Math.floor(v * 4)])
        r.rect(x, 17 + row * 4, 2, 1, ['#d82a2a', '#2a6ad8', '#f2c84a', '#f4f0e4', '#30a050'][Math.floor(hash2(row, x, 3) * 5)])
      }
    }
    for (let x = x0; x < x0 + w; x += 6) r.rect(x, 7, 6, 4, (x - x0) % 12 === 0 ? '#d82a2a' : '#f4f0e4')
    r.rect(x0, 11, w, 1, '#2a2434')
    r.rect(x0, 27, w, 2, '#2a2434')
    r.rect(x0 + 2, 1, 1, 7, '#e8e8f0')
    r.rect(x0 + 3, 1, 5, 3, '#d82a2a')
    r.rect(x0 + w - 3, 1, 1, 7, '#e8e8f0')
    r.rect(x0 + w - 7, 1, 4, 3, '#2a6ad8')
  }
  // The infield hedge along the foot of it all.
  r.rect(0, FAR_H - 8, FAR_W, 8, '#2f6a34')
  r.each(0, FAR_H - 8, FAR_W, 8, (x, y) => (dither(x, y, 0.35) ? '#3a8040' : null))
  return r
}

/** The near side: the inner rail, six lanes of dirt, the outer rail and the hoardings, the gate, the furlong poles and the line. */
export function paintNear(): Raster {
  const r = new Raster(WORLD_W, TRACK_H)
  // The grass verge the rail stands in.
  r.rect(0, LANES_TOP - 8, WORLD_W, 8, '#3a8040')
  r.each(0, LANES_TOP - 8, WORLD_W, 8, (x, y) => (dither(x, y, 0.3) ? '#2f6a34' : null))
  // The inner rail: white posts and two rails.
  r.rect(0, LANES_TOP - 6, WORLD_W, 2, '#f4f0e4')
  r.rect(0, LANES_TOP - 4, WORLD_W, 1, '#a8a498')
  for (let x = 4; x < WORLD_W; x += 14) r.rect(x, LANES_TOP - 9, 2, 8, '#f4f0e4')
  // Lanes of dirt, each a shade apart, raked.
  for (let i = 0; i < FIELD_SIZE; i++) {
    const y = laneTop(i)
    r.each(0, y, WORLD_W, LANE, (x, py) => {
      const base = i % 2 ? '#a87c4c' : '#b88c58'
      if (hash2(x, py + i * 7) < 0.1) return '#8a6238'
      if (py % 4 === 1 && hash2(x >> 2, i) < 0.5) return '#c49c68'
      return base
    })
    if (i > 0) r.hline(0, y, WORLD_W, '#d8c8a0')
  }
  const lanesEnd = laneTop(FIELD_SIZE)
  // The outer rail and the hoardings in front of the crowd.
  r.rect(0, lanesEnd, WORLD_W, 2, '#f4f0e4')
  r.rect(0, lanesEnd + 2, WORLD_W, 1, '#a8a498')
  const ads = ['#d82a2a', '#2a6ad8', '#f2c84a', '#30a050', '#8a3ad0']
  for (let x = 0; x < WORLD_W; x += 40) {
    r.rect(x, lanesEnd + 4, 38, 9, ads[(x / 40) % 5 | 0])
    r.rect(x, lanesEnd + 4, 38, 1, 'rgba(255,255,255,0.2)')
    drawText(r, ['MESA', 'LUMINA', 'CAY', 'RIVER', 'LEGEND'][(x / 40) % 5 | 0], x + 4, lanesEnd + 6, '#f8f8f0')
  }
  // Furlong poles on the inner rail, numbered down to the line.
  for (let k = 1; k <= 7; k++) {
    const x = START_X + 30 + ((FINISH_X - START_X - 60) * k) / 8
    r.rect(Math.round(x), LANES_TOP - 18, 2, 12, k % 2 ? '#d82a2a' : '#f4f0e4')
    r.rect(Math.round(x) - 3, LANES_TOP - 22, 8, 6, '#14101c')
    drawText(r, `${8 - k}`, Math.round(x) - 1, LANES_TOP - 21, '#f2c84a')
  }
  // The starting gate: stalls across every lane, open at the front.
  r.rect(START_X - 10, LANES_TOP - 2, 3, FIELD_SIZE * LANE + 4, '#3a3a48')
  for (let i = 0; i <= FIELD_SIZE; i++) r.rect(START_X - 10, laneTop(i) - 1, 12, 2, '#6a6a78')
  r.rect(START_X - 12, LANES_TOP - 6, 14, 3, '#d82a2a')
  // The finish: a post at each rail and a chequered strip across the dirt.
  for (let y = LANES_TOP; y < lanesEnd; y += 2) {
    r.rect(FINISH_X, y, 2, 2, (y / 2) % 2 ? INKED : '#f4f0e4')
    r.rect(FINISH_X + 2, y, 2, 2, (y / 2) % 2 ? '#f4f0e4' : INKED)
  }
  r.rect(FINISH_X + 1, LANES_TOP - 24, 3, 18, '#f4f0e4')
  r.rect(FINISH_X - 10, LANES_TOP - 30, 24, 8, '#14101c')
  drawText(r, 'FINISH', FINISH_X - 8, LANES_TOP - 28, '#f2c84a')
  r.rect(FINISH_X + 1, lanesEnd - 2, 3, 12, '#f4f0e4')
  return r
}
