import type { Fighter } from '../engine/boxing'
import { Raster } from './pixel/raster'
import { shade } from './pixel/color'

/** Art pixels. */
export const CW = 236
export const RING_H = 134
export const SPR_W = 34
export const SPR_H = 36
export const FIG_W = 16
export const FIG_H = 32
/**
 * The ring is a diamond seen from above and to one side: its centre, and how far
 * its left and right corners and its far and near corners are from it.
 */
export const RING_CX = 118
export const RING_CY = 70
export const RING_HW = 104
export const RING_HH = 46
/** Where a fighter's feet are at the far and near ends of the floor they use. */
export const FEET_BACK = 50
export const FEET_FRONT = 94
/** Where each man sits between rounds: red in the left-hand corner of the diamond, blue in the right. */
export const CORNER_A_X = 19
export const CORNER_B_X = 183

/** Feet y for a depth from 0 (far) to 1 (near). */
export const feetOf = (depth: number) => FEET_BACK + depth * (FEET_FRONT - FEET_BACK)

/** How far from the centre line a fighter's middle may be at this depth before he is in the ropes. */
export function reach(depth: number): number {
  const half = RING_HW * (1 - Math.abs(feetOf(depth) - RING_CY) / RING_HH)
  return Math.max(8, half - 16)
}

export type Pose =
  | 'guard0' | 'guard1' | 'jab' | 'cross' | 'hook' | 'upper' | 'body'
  | 'block' | 'slip' | 'duck' | 'clinch' | 'hit' | 'down' | 'sit' | 'win'
export const POSES: Pose[] = [
  'guard0', 'guard1', 'jab', 'cross', 'hook', 'upper', 'body',
  'block', 'slip', 'duck', 'clinch', 'hit', 'down', 'sit', 'win',
]

const INKED = '#120c0c'

/** A fighter facing right in one pose; the other corner is this, flipped. */
export function boxerRaster(f: Fighter, pose: Pose): Raster {
  const r = new Raster(SPR_W, SPR_H)
  const skin = f.skin
  const dim = shade(skin, 0.82)
  const tw = f.build === 'stocky' ? 13 : f.build === 'lean' ? 9 : 11
  const tx = 15 - Math.round(tw / 2)
  const glove = (x: number, y: number, s = 6) => {
    r.rect(x, y, s, s, f.gloves)
    r.rect(x, y, s, 1, shade(f.gloves, 1.3))
  }

  if (pose === 'down') {
    r.rect(1, 31, 11, 5, skin)
    r.rect(0, 28, 8, 8, skin)
    r.rect(0, 28, 8, 3, f.hair)
    r.set(5, 32, INKED)
    r.rect(10, 29, 14, 7, skin)
    r.rect(22, 30, 7, 6, f.trunks)
    r.rect(27, 31, 6, 4, dim)
    r.rect(8, 26, 6, 5, f.gloves)
    r.outline(INKED)
    return r
  }
  if (pose === 'sit') {
    // On the stool, gloves on the knees, head down for the towel.
    r.rect(8, 8, 8, 9, skin)
    r.rect(8, 8, 8, 3, f.hair)
    r.rect(tx, 17, tw, 9, skin)
    r.rect(tx, 25, tw + 2, 4, f.trunks)
    r.rect(tx + tw, 27, 9, 3, skin)
    r.rect(tx + tw + 7, 27, 3, 8, dim)
    r.rect(tx + tw + 5, 34, 7, 2, '#201818')
    glove(tx + 1, 22)
    glove(tx + tw - 6, 22)
    r.outline(INKED)
    return r
  }

  const by = pose === 'guard1' ? 1 : pose === 'duck' ? 5 : pose === 'body' ? 2 : 0
  let lean = pose === 'cross' ? 2 : pose === 'jab' || pose === 'hook' || pose === 'upper' || pose === 'body' ? 1 : pose === 'hit' ? -2 : pose === 'clinch' ? 3 : 0
  if (pose === 'slip') lean = -2
  // Legs and shoes: wider in a crouch, planted in a punch.
  const stance = pose === 'duck' || pose === 'body' ? 2 : 0
  r.rect(11 - stance, 27, 4, 7, dim)
  r.rect(19 + stance, 27, 4, 7, skin)
  r.rect(10 - stance, 34, 6, 2, '#201818')
  r.rect(18 + stance, 34, 6, 2, '#201818')
  r.rect(tx + lean, 21 + by, tw, 7, f.trunks)
  r.rect(tx + lean, 21 + by, tw, 2, '#f4f0e4')
  r.rect(tx + lean, 11 + by, tw, 10, skin)
  r.rect(tx + lean + 1, 13 + by, tw - 2, 1, dim)
  // Head: tucked in a slip, thrown back when hit, forward in a clinch.
  const hx = 13 + lean + (pose === 'hit' ? -1 : 0) + (pose === 'slip' ? -1 : 0)
  const hy = 2 + by + (pose === 'slip' ? 2 : 0)
  r.rect(hx, hy, 8, 9, skin)
  r.rect(hx, hy, 8, 3, f.hair)
  r.rect(hx + 5, hy + 3, 3, 1, f.hair)
  if (pose === 'hit') {
    r.set(hx + 5, hy + 4, INKED)
    r.set(hx + 6, hy + 5, INKED)
    r.set(hx + 5, hy + 6, '#c82828')
    r.set(hx + 9, 1, '#f8f8f0')
    r.set(hx - 2, 3, '#f8d048')
  } else {
    r.rect(hx + 5, hy + 4, 2, 1, INKED)
    r.rect(hx + 5, hy + 7, 3, 1, '#f4f0e4')
  }

  switch (pose) {
    case 'win':
      r.rect(tx + 1, 3, 3, 9, skin)
      r.rect(tx + tw - 3, 3, 3, 9, skin)
      glove(tx - 1, 0)
      glove(tx + tw - 4, 0)
      break
    case 'jab':
      r.rect(tx + tw - 1, 13, 10, 3, skin)
      glove(tx + tw + 8, 11)
      r.rect(13, 14, 4, 3, skin)
      glove(15, 9 + by)
      break
    case 'cross':
      r.rect(tx + tw - 1 + lean, 12, 11, 3, skin)
      glove(tx + tw + 9 + lean, 10)
      r.rect(13, 14, 4, 3, skin)
      glove(15, 10)
      break
    case 'hook':
      r.rect(tx + tw - 1, 11, 5, 3, skin)
      r.rect(tx + tw + 3, 7, 4, 6, skin)
      glove(tx + tw + 3, 3, 7)
      glove(15, 10)
      break
    case 'upper':
      // A dip, then the glove rising from the hip to the chin.
      r.rect(tx + tw, 18, 4, 3, skin)
      r.rect(tx + tw + 3, 12, 3, 8, skin)
      glove(tx + tw + 3, 7)
      glove(14, 10)
      break
    case 'body':
      r.rect(tx + tw - 1, 17, 9, 3, skin)
      glove(tx + tw + 7, 16 + by)
      glove(15, 8 + by)
      break
    case 'block':
      // Both gloves up over the face, elbows in.
      r.rect(tx + 1, 14, 3, 4, dim)
      r.rect(tx + tw - 3, 13, 4, 4, skin)
      glove(hx + 3, hy - 1)
      glove(hx + 6, hy + 3)
      break
    case 'clinch':
      r.rect(tx + tw - 1, 15, 8, 3, skin)
      glove(tx + tw + 6, 15)
      r.rect(tx + tw - 1, 18, 6, 3, dim)
      glove(tx + tw + 4, 19)
      break
    default:
      r.rect(tx + 2, 14 + by, 4, 3, dim)
      glove(14 + lean, 8 + by)
      r.rect(tx + tw - 2, 14 + by, 5, 3, skin)
      glove(tx + tw + 2 + lean, 11 + by)
  }
  r.outline(INKED)
  return r
}

export type FigureKind = 'ref' | 'trainerA' | 'trainerB' | 'girl'
/** 0 and 1 are a two-beat bob; 2 is the pose the figure is in when it matters (counting, leaning in, holding the card). */
export type FigurePose = 0 | 1 | 2

/** The people round the ring: the referee, a trainer in each corner, the ring girl. 16 wide, facing front. */
export function figureRaster(kind: FigureKind, pose: FigurePose): Raster {
  const r = new Raster(FIG_W, FIG_H)
  const bob = pose === 1 ? 1 : 0
  const head = (skin: string, hair: string, y: number, long = false) => {
    r.rect(5, y, 6, 7, skin)
    r.rect(5, y, 6, 2, hair)
    if (long) {
      r.rect(4, y, 1, 11, hair)
      r.rect(11, y, 1, 11, hair)
    }
    r.set(6, y + 4, INKED)
    r.set(9, y + 4, INKED)
  }
  if (kind === 'ref') {
    head('#d8a87a', '#8a8a90', 2 + bob)
    r.rect(4, 9 + bob, 8, 10, '#f4f0e4')
    r.rect(6, 9 + bob, 4, 2, '#14101c')
    r.rect(4, 19, 8, 9, '#14101c')
    r.rect(4, 28, 3, 3, '#14101c')
    r.rect(9, 28, 3, 3, '#14101c')
    if (pose === 2) {
      // Counting: one arm up, fingers out.
      r.rect(12, 3, 2, 10, '#f4f0e4')
      r.rect(11, 0, 4, 3, '#d8a87a')
      r.rect(2, 11, 2, 7, '#f4f0e4')
    } else {
      r.rect(2, 11 + bob, 2, 8, '#f4f0e4')
      r.rect(12, 11 + bob, 2, 8, '#f4f0e4')
    }
  } else if (kind === 'girl') {
    head('#e2b48c', '#d89a3a', 6 + bob, true)
    // A sequinned dress, arms up round the card.
    r.rect(4, 13 + bob, 8, 8, '#f2c84a')
    r.rect(3, 21 + bob, 10, 6, '#f2c84a')
    for (let i = 0; i < 6; i++) r.set(4 + ((i * 5) % 8), 14 + bob + ((i * 3) % 12), '#fff6c0')
    r.rect(4, 27, 3, 4, '#e2b48c')
    r.rect(9, 27, 3, 4, '#e2b48c')
    r.rect(2, 3, 2, 11, '#e2b48c')
    r.rect(12, 3, 2, 11, '#e2b48c')
    r.rect(4, 31, 3, 1, '#c82828')
    r.rect(9, 31, 3, 1, '#c82828')
  } else {
    const suit = kind === 'trainerA' ? '#c82828' : '#2a5ad8'
    head(kind === 'trainerA' ? '#cc9a6c' : '#8d5a3b', '#2e2018', 4 + bob)
    r.rect(4, 11 + bob, 8, 11, suit)
    r.rect(4, 11 + bob, 8, 2, '#f4f0e4')
    r.rect(4, 22, 8, 7, shade(suit, 0.7))
    r.rect(4, 29, 3, 3, '#201818')
    r.rect(9, 29, 3, 3, '#201818')
    // A towel on the shoulder; in a lean, a water bottle held up.
    r.rect(2, 11 + bob, 3, 7, '#f4f0e4')
    r.rect(12, 12 + bob, 2, 7, suit)
    if (pose === 2) {
      r.rect(13, 8, 2, 6, '#4fe8ff')
      r.rect(13, 7, 2, 1, '#f4f0e4')
    }
  }
  r.outline(INKED)
  return r
}

function line(r: Raster, x0: number, y0: number, x1: number, y1: number, ink: string, thick = 1): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= steps; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps)
    const y = Math.round(y0 + ((y1 - y0) * i) / steps)
    r.rect(x, y, 1, thick, ink)
  }
}

const ROPES = [['#d82a2a', 6], ['#f4f0e4', 12], ['#2a6ad8', 18]] as const

/** The half-width of the diamond at a height, or 0 outside it. */
function halfAt(y: number, grow = 0): number {
  const f = 1 - Math.abs(y - RING_CY) / (RING_HH + grow)
  return f > 0 ? (RING_HW + grow * 2) * f : 0
}

/**
 * The ring from above: a diamond of canvas on a red apron, ropes round all four
 * sides, a post at each corner padded red on the left and blue on the right, and
 * the crowd in the dark beyond. In two layers, because the near ropes go in front
 * of whoever is fighting and the far ones behind.
 */
export function paintRing(): { back: Raster; front: Raster } {
  const back = new Raster(CW, RING_H)
  const front = new Raster(CW, RING_H)
  const { CX, CY, HW, HH } = { CX: RING_CX, CY: RING_CY, HW: RING_HW, HH: RING_HH }
  back.rect(0, 0, CW, RING_H, '#0a0814')
  // The crowd everywhere outside the ring, in rows that tighten with distance.
  for (let y = 2; y < 118; y += 5) {
    for (let x = (y / 5) % 2 ? 2 : 5; x < CW; x += 7) {
      if (Math.abs(x + 2 - CX) < halfAt(y + 2, 12)) continue
      const v = (x * 7 + y * 13) % 5
      back.rect(x, y, 4, 4, ['#2a2240', '#3a2a50', '#4a3040', '#2a3050', '#40302a'][v])
      back.rect(x, y, 4, 1, ['#d8a87a', '#8d5a3b', '#f4d4b4', '#c08654', '#74482c'][(x + y) % 5])
    }
  }
  back.each(0, 0, CW, RING_H, (x, y) => {
    const d = Math.hypot((x - CX) / (CW * 0.7), (y - CY) / (RING_H * 0.9))
    return d > 0.45 ? `rgba(8, 6, 16, ${Math.min(0.6, (d - 0.45) * 1.1)})` : null
  })
  // A strip of ringside floor in front, where the ring girl walks.
  back.rect(0, 122, CW, 12, '#1a1424')
  back.rect(0, 122, CW, 1, '#3a2a50')
  // The apron: the platform's red skirt under the two near sides.
  for (let x = CX - HW; x <= CX + HW; x++) {
    const ye = CY + Math.round(HH * (1 - Math.abs(x - CX) / HW))
    back.rect(x, ye, 1, 7, '#8a1818')
    back.rect(x, ye, 1, 1, '#e8e0d0')
    back.rect(x, ye + 6, 1, 1, '#4a0c0c')
  }
  // The canvas, boards running along the ring.
  for (let y = CY - HH; y <= CY + HH; y++) {
    const half = Math.round(halfAt(y))
    for (let x = CX - half; x < CX + half; x++) {
      const u = ((x - CX) / HW + (y - CY) / HH) / 2
      const w = ((x - CX) / HW - (y - CY) / HH) / 2
      const plank = Math.floor((u + 1) * 7) % 2 === 0
      const edge = Math.abs(((u + 1) * 7) % 1) < 0.07 || Math.abs(((w + 1) * 5) % 1) < 0.05
      back.rect(x, y, 1, 1, edge ? '#a89e88' : plank ? '#d8d0b8' : '#cfc6b0')
    }
  }
  // The centre mark.
  back.ellipse(CX - 22, CY - 9, 44, 18, '#b83a3a')
  back.ellipse(CX - 18, CY - 7, 36, 14, '#f4f0e4')
  back.ellipse(CX - 8, CY - 3, 16, 6, '#d82a2a')
  // The red and blue corner pads on the floor, and a stool in each.
  for (const x of [CORNER_A_X + 8, CORNER_B_X + 14]) {
    const y = Math.round(feetOf(0.5)) - 8
    back.rect(x, y, 12, 2, '#8a8a98')
    back.rect(x + 1, y + 2, 2, 6, '#5a5a68')
    back.rect(x + 9, y + 2, 2, 6, '#5a5a68')
  }
  const top = [CX, CY - HH]
  const right = [CX + HW, CY]
  const bottom = [CX, CY + HH]
  const left = [CX - HW, CY]
  const rope = (layer: Raster, a: number[], b: number[]) => {
    for (const [color, h] of ROPES) {
      line(layer, a[0], a[1] - h, b[0], b[1] - h, color, 2)
      line(layer, a[0], a[1] - h + 2, b[0], b[1] - h + 2, 'rgba(0,0,0,0.3)')
    }
  }
  rope(back, left, top)
  rope(back, top, right)
  rope(front, left, bottom)
  rope(front, bottom, right)
  const post = (layer: Raster, [x, y]: number[], pad: string) => {
    layer.rect(x - 2, y - 26, 5, 28, '#3a3a48')
    layer.rect(x - 2, y - 26, 5, 3, '#d8d8e0')
    layer.rect(x - 1, y - 21, 3, 14, pad)
    layer.rect(x - 3, y + 1, 7, 2, 'rgba(0,0,0,0.35)')
  }
  post(back, top, '#f4f0e4')
  post(front, left, '#d82a2a')
  post(front, right, '#2a5ad8')
  post(front, bottom, '#f4f0e4')
  return { back, front }
}
