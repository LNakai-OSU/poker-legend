import { Texture } from 'pixi.js'
import { TILE_SIZE } from './tiles'
import { STAMP_BY_ID, stampSize, type StampDef } from '../world/stamps'

/**
 * The art for things bigger than a tile.
 *
 * Drawn across the whole footprint as one picture rather than as a grid of
 * repeated textures, which is the entire point: a poker table drawn four tiles
 * at a time is four patches of furniture, and a poker table drawn as a poker
 * table is a poker table.
 *
 * Same technique as everything else here — a 16-unit grid per tile, filled with
 * rectangles, scaled up with nearest-neighbour. No asset files.
 */

const UNIT = 16
const SCALE = TILE_SIZE / UNIT

type Px = (x: number, y: number, w: number, h: number, color: string) => void
type StampDraw = (px: Px, cols: number, rows: number) => void

const OUTLINE = '#15151d'

/** An oval of `color`, by rows, so felt and basins read as round not boxy. */
function oval(px: Px, x: number, y: number, w: number, h: number, color: string) {
  for (let row = 0; row < h; row++) {
    const t = (row + 0.5) / h
    const half = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) / 2
    const inset = Math.round(w * (0.5 - half))
    px(x + inset, y + row, Math.max(1, w - inset * 2), 1, color)
  }
}

const DRAWINGS: Record<string, StampDraw> = {
  'poker-table': (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    // Chairs first, so the table sits over them.
    for (const cx of [w * 0.22, w * 0.5, w * 0.78]) {
      px(Math.round(cx) - 5, 2, 10, 7, '#4a3524')
      px(Math.round(cx) - 5, h - 9, 10, 7, '#4a3524')
    }
    oval(px, 4, 8, w - 8, h - 16, OUTLINE)
    oval(px, 6, 10, w - 12, h - 20, '#6b4a2a')
    oval(px, 9, 13, w - 18, h - 26, '#1f6b3a')
    oval(px, 11, 15, w - 22, h - 30, '#2a7f49')
    // Chips and two cards in the middle, so it reads as a game in progress.
    const mx = Math.round(w / 2)
    const my = Math.round(h / 2)
    px(mx - 7, my - 1, 4, 3, '#d8d8de')
    px(mx - 7, my - 2, 4, 1, '#b02a2a')
    px(mx + 2, my - 2, 3, 4, '#f4f4f8')
    px(mx + 6, my - 2, 3, 4, '#f4f4f8')
  },

  'slot-bank': (px, cols) => {
    const w = cols * UNIT
    for (let i = 0; i < cols; i++) {
      const x = i * UNIT
      px(x + 1, 2, UNIT - 2, 14, OUTLINE)
      px(x + 2, 3, UNIT - 4, 12, '#5a3a6b')
      px(x + 3, 5, UNIT - 6, 5, '#120f18')
      px(x + 4, 6, 3, 3, '#f2c14e')
      px(x + 7, 6, 2, 3, '#e05a5a')
      px(x + 10, 6, 3, 3, '#8ad4ff')
      px(x + 4, 11, UNIT - 8, 2, '#f2c14e')
    }
    px(0, 16, w, 2, '#2a2a36')
  },

  'craps-pit': (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    px(8, 12, w - 16, h - 24, OUTLINE)
    px(10, 14, w - 20, h - 28, '#4a3524')
    px(13, 17, w - 26, h - 34, '#1f4f7a')
    px(15, 19, w - 30, h - 38, '#2a6b9c')
    // The layout printed on the felt, and two dice.
    for (let i = 0; i < cols - 2; i++) px(20 + i * UNIT, 22, 9, 1, '#cfe0f0')
    px(w - 30, h - 26, 5, 5, '#f4f4f8')
    px(w - 23, h - 24, 5, 5, '#f4f4f8')
  },

  bar: (px, cols) => {
    const w = cols * UNIT
    // Bottles on a back shelf, then the counter in front of them.
    px(0, 1, w, 7, '#241a12')
    for (let i = 2; i < w - 2; i += 5) {
      px(i, 2, 2, 5, i % 3 === 0 ? '#3a9d5c' : '#b02a2a')
    }
    px(0, 8, w, 3, '#6b4a2a')
    px(0, 11, w, 5, '#4a3524')
    px(0, 8, w, 1, '#8a6a3a')
  },

  townhouse: (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    px(0, 0, w, h, OUTLINE)
    px(1, 6, w - 2, h - 6, '#5a4038')
    // Roof, overhanging slightly.
    px(0, 2, w, 5, '#2f2a33')
    px(2, 0, w - 4, 3, '#3a333f')
    for (let row = 0; row < 2; row++) {
      for (let i = 0; i < 2; i++) {
        const x = 6 + i * (w - 20)
        px(x, 12 + row * 14, 9, 10, '#1a2230')
        px(x + 1, 13 + row * 14, 7, 4, '#8ad4ff')
      }
    }
    // The doorstep, under the door tile the stamp also writes.
    px(Math.round(w / 2) - 7, h - 14, 14, 14, '#241a12')
    px(Math.round(w / 2) - 5, h - 12, 10, 12, '#6b4a2a')
    px(Math.round(w / 2) + 2, h - 7, 2, 2, '#f2c14e')
  },

  shopfront: (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    px(0, 0, w, h, OUTLINE)
    px(1, 8, w - 2, h - 8, '#4a4458')
    px(0, 3, w, 6, '#7a3fa0')
    px(2, 1, w - 4, 3, '#44215c')
    // A wide window either side of the door.
    for (const x of [5, w - 26]) {
      px(x, 14, 21, 16, '#13161f')
      px(x + 2, 16, 17, 12, '#2a3a52')
      px(x + 3, 17, 7, 5, '#8ad4ff')
    }
    const dx = Math.round(w / 2) - 7
    px(dx, h - 18, 14, 18, '#241a12')
    px(dx + 2, h - 16, 10, 16, '#6b4a2a')
    px(dx + 9, h - 9, 2, 2, '#f2c14e')
  },

  'bus-shelter': (px, cols) => {
    const w = cols * UNIT
    px(0, 2, w, 3, '#3a4350')
    px(1, 5, 3, 11, '#2a3240')
    px(w - 4, 5, 3, 11, '#2a3240')
    px(5, 5, w - 10, 9, '#1a2230')
    px(6, 6, w - 12, 7, '#2a3a52')
    // The route list, pasted inside.
    px(8, 7, 7, 1, '#cfe0f0')
    px(8, 9, 5, 1, '#cfe0f0')
    px(8, 11, 6, 1, '#cfe0f0')
  },

  fountain: (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    oval(px, 2, 2, w - 4, h - 4, '#6a6a7a')
    oval(px, 5, 5, w - 10, h - 10, '#8a8a9a')
    oval(px, 8, 8, w - 16, h - 16, '#2a5f8a')
    oval(px, 11, 11, w - 22, h - 22, '#3f84bd')
    const mx = Math.round(w / 2)
    px(mx - 2, 10, 4, h - 20, '#8a8a9a')
    px(mx - 4, 8, 8, 3, '#b8c8d8')
  },

  'parked-car': (px, _cols, rows) => {
    const h = rows * UNIT
    px(2, 1, 12, h - 2, OUTLINE)
    px(3, 2, 10, h - 4, '#b02a2a')
    px(4, 4, 8, 6, '#1a2230')
    px(5, 5, 6, 4, '#8ad4ff')
    px(4, h - 12, 8, 6, '#8a1f1f')
    px(1, 4, 2, 4, '#2a2a36')
    px(13, 4, 2, 4, '#2a2a36')
    px(1, h - 9, 2, 4, '#2a2a36')
    px(13, h - 9, 2, 4, '#2a2a36')
  },

  planter: (px, cols, rows) => {
    const w = cols * UNIT
    const h = rows * UNIT
    px(1, 3, w - 2, h - 4, '#6a5a4a')
    px(2, 4, w - 4, h - 6, '#3a2a1c')
    for (let i = 3; i < w - 4; i += 6) {
      for (let j = 5; j < h - 6; j += 6) {
        px(i, j, 4, 4, '#2f6b3a')
        px(i + 1, j + 1, 2, 2, (i + j) % 4 === 0 ? '#e8d26a' : '#d96c9c')
      }
    }
  },
}

const cache = new Map<string, Texture>()

/** The art for a stamp, or nothing when it has none and its tiles stand alone. */
export function stampTexture(stampId: string): Texture | null {
  const cached = cache.get(stampId)
  if (cached) return cached

  const stamp = STAMP_BY_ID[stampId]
  const draw = DRAWINGS[stampId]
  if (!stamp || !draw) return null

  const texture = Texture.from(drawStamp(stamp, draw))
  texture.source.scaleMode = 'nearest'
  cache.set(stampId, texture)
  return texture
}

/** The same art as a plain canvas, for the editor's tray. */
export function stampCanvas(stampId: string): HTMLCanvasElement | null {
  const stamp = STAMP_BY_ID[stampId]
  const draw = DRAWINGS[stampId]
  if (!stamp || !draw) return null
  return drawStamp(stamp, draw)
}

function drawStamp(stamp: StampDef, draw: StampDraw): HTMLCanvasElement {
  const { cols, rows } = stampSize(stamp)
  const canvas = document.createElement('canvas')
  canvas.width = cols * UNIT * SCALE
  canvas.height = rows * UNIT * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw(
    (x, y, w, h, color) => {
      ctx.fillStyle = color
      ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE)
    },
    cols,
    rows,
  )
  return canvas
}

/** Whether a stamp has art of its own, as opposed to only laying down tiles. */
export function hasStampArt(stampId: string): boolean {
  return stampId in DRAWINGS
}
