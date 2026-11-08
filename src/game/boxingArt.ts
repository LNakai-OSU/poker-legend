import { Raster } from './pixel/raster'
import { drawTiny } from './pixel/tiny'

/** Art pixels. */
export const CW = 236
export const RING_H = 150
/**
 * The ring is a diamond seen from above and to one side: its centre, and how far
 * its left and right corners and its far and near corners are from it.
 */
export const RING_CX = 118
export const RING_CY = 78
export const RING_HW = 104
export const RING_HH = 46
/** Where a fighter's feet are at the far and near ends of the floor they use. */
export const FEET_BACK = 58
export const FEET_FRONT = 102
/** Where each man sits between rounds: red in the left-hand corner of the diamond, blue in the right. */
export const CORNER_A_X = 34
export const CORNER_B_X = 202

/** Feet y for a depth from 0 (far) to 1 (near). */
export const feetOf = (depth: number) => FEET_BACK + depth * (FEET_FRONT - FEET_BACK)

/** How far from the centre line a fighter's middle may be at this depth before he is in the ropes. */
export function reach(depth: number): number {
  const half = RING_HW * (1 - Math.abs(feetOf(depth) - RING_CY) / RING_HH)
  return Math.max(8, half - 12)
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
export function halfAt(y: number, grow = 0): number {
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
  // Beyond the ring: the hall, dark, with the floor ringside a shade lighter where the tables are.
  back.rect(0, 112, CW, RING_H - 112, '#1a1424')
  back.rect(0, 112, CW, 1, '#3a2a50')
  for (let x = 0; x < CW; x += 10) back.rect(x, 113, 1, RING_H - 113, '#1e182a')
  // Ringside: the timekeeper with the bell on the left, the three judges on the right.
  back.rect(8, 126, 44, 12, '#5a3a22')
  back.rect(8, 126, 44, 2, '#8a5a32')
  back.rect(8, 138, 44, 2, '#2a1a0e')
  back.rect(12, 120, 5, 6, '#c8a040')
  back.rect(13, 118, 3, 2, '#e8c860')
  drawTiny(back, 'TIME', 26, 130, '#f2c84a')
  back.rect(CW - 112, 126, 104, 12, '#5a3a22')
  back.rect(CW - 112, 126, 104, 2, '#8a5a32')
  back.rect(CW - 112, 138, 104, 2, '#2a1a0e')
  drawTiny(back, 'JUDGES', CW - 64, 130, '#f2c84a')
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
