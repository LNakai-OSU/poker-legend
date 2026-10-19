import { Texture } from 'pixi.js'
import { TILE_SIZE } from './tiles'
import { STAMP_BY_ID, stampSize } from '../world/stamps'
import type { Px } from './pixelArt'
import { BUILDING_ART } from './art/buildingArt'
import { CASINO_ART } from './art/casinoArt'
import { FURNITURE_ART } from './art/furnitureArt'
import { STREET_ART } from './art/streetArt'
import { STREET_FURNITURE } from './art/streetFurniture'

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

export const UNIT = 16
export const SCALE = TILE_SIZE / UNIT

/** What a drawing is told about the stamp it is drawing. */
export interface ArtContext {
  cols: number
  rows: number
  /** The footprint in art units. */
  w: number
  h: number
  /** Which frame of an animated stamp this is; 0 for everything else. */
  frame: number
  /** The stamp's footprint, row by row, in map characters — where its doors are, and so on. */
  tiles: string[]
}

export type StampDraw = (px: Px, c: ArtContext) => void

/**
 * One stamp's art.
 *
 * Most stamps are a single picture under the people. Some need more:
 *
 * - `over` is drawn *above* whoever stands there — the front of a counter, so a
 *   clerk stands behind it instead of on top of it.
 * - `bleed` lets the picture spill past the footprint: a roof's eaves over the
 *   pavement, a casino's red carpet down its steps, a shadow on the ground. The
 *   footprint is still exactly the tiles the stamp writes; only the paint goes
 *   further.
 * - `frames` animates it, a few frames on a shared clock: marquee bulbs, the
 *   light on top of a slot machine.
 */
export interface StampArt {
  draw: StampDraw
  over?: StampDraw
  bleed?: { left?: number; top?: number; right?: number; bottom?: number }
  frames?: number
  /**
   * For something taller than the ground it stands on — a lamp post, a palm, a
   * parked car — how far down from the top of its footprint, in art units, the
   * picture belongs in front of whoever walks behind it. That much of the
   * picture (and everything that spills above the footprint) is also drawn in
   * the layer over the people, so you walk behind a lamp post, not over it.
   */
  standsUp?: number
  /** Where it throws light after dark: pools on the ground, in art units from the footprint's top-left. */
  lights?: StampLight[]
}

/** A pool of light a stamp throws on the ground after dark. */
export interface StampLight {
  x: number
  y: number
  /** How far it reaches, in art units: the long axis of the pool. */
  reach: number
  color: string
  /** 0..1: how bright the middle of the pool is. */
  strength?: number
}

const ART: Record<string, StampArt> = {
  ...BUILDING_ART,
  ...CASINO_ART,
  ...FURNITURE_ART,
  ...STREET_ART,
  ...STREET_FURNITURE,
}

/** How long each animation frame is held, in milliseconds. */
export const FRAME_MS = 420

export interface StampBleed {
  left: number
  top: number
  right: number
  bottom: number
}

function bleedOf(art: StampArt): StampBleed {
  return {
    left: art.bleed?.left ?? 0,
    top: art.bleed?.top ?? 0,
    right: art.bleed?.right ?? 0,
    bottom: art.bleed?.bottom ?? 0,
  }
}

/** Everything the renderer needs to draw one stamp. */
export interface StampLayers {
  /** One texture per frame, under the people. */
  under: Texture[]
  /** One texture per frame, over the people, if the stamp has a front to it. */
  over: Texture[] | null
  /** How far the art spills past the footprint, in art units. */
  bleed: StampBleed
}

const layerCache = new Map<string, StampLayers | null>()

/** The art for a stamp, or nothing when it has none and its tiles stand alone. */
export function stampLayers(stampId: string): StampLayers | null {
  if (layerCache.has(stampId)) return layerCache.get(stampId)!
  const stamp = STAMP_BY_ID[stampId]
  const art = ART[stampId]
  if (!stamp || !art) {
    layerCache.set(stampId, null)
    return null
  }
  const { cols, rows } = stampSize(stamp)
  const bleed = bleedOf(art)
  const frames = Math.max(1, art.frames ?? 1)
  const tiles = footprint(stampId)
  const toTexture = (draw: StampDraw, frame: number) => {
    const texture = Texture.from(paint(draw, cols, rows, frame, bleed, tiles))
    texture.source.scaleMode = 'nearest'
    return texture
  }
  const over = overDrawing(art)
  const layers: StampLayers = {
    under: Array.from({ length: frames }, (_, frame) => toTexture(art.draw, frame)),
    over: over ? Array.from({ length: frames }, (_, frame) => toTexture(over, frame)) : null,
    bleed,
  }
  layerCache.set(stampId, layers)
  return layers
}

/** The first frame of a stamp's art, under the people. Kept for callers that want one texture. */
export function stampTexture(stampId: string): Texture | null {
  return stampLayers(stampId)?.under[0] ?? null
}

/**
 * The same art as a plain canvas, for the editor.
 *
 * Exactly the footprint — what spills past it is left off — with the front
 * drawn over the back, so the tray and the map show the whole object at the
 * size the editor lays it out at.
 */
export function stampCanvas(stampId: string): HTMLCanvasElement | null {
  const stamp = STAMP_BY_ID[stampId]
  const art = ART[stampId]
  if (!stamp || !art) return null
  const { cols, rows } = stampSize(stamp)
  const none = { left: 0, top: 0, right: 0, bottom: 0 }
  const tiles = footprint(stampId)
  const canvas = paint(art.draw, cols, rows, 0, none, tiles)
  if (art.over) canvas.getContext('2d')!.drawImage(paint(art.over, cols, rows, 0, none, tiles), 0, 0)
  return canvas
}

/**
 * What of a stamp goes over the people: its own front, or for something that
 * stands up out of the ground, the top of its picture.
 */
function overDrawing(art: StampArt): StampDraw | null {
  if (art.over) return art.over
  if (art.standsUp === undefined) return null
  const top = art.standsUp
  const above = -(art.bleed?.top ?? 0)
  return (px, c) =>
    art.draw((x, y, w, h, color) => {
      // Only what lies above the cut, and nothing of the ground below it.
      const y0 = Math.max(y, above)
      const y1 = Math.min(y + h, top)
      if (y1 > y0) px(x, y0, w, y1 - y0, color)
    }, c)
}

function footprint(stampId: string): string[] {
  return STAMP_BY_ID[stampId].tiles.split('\n').filter((row) => row.length > 0)
}

function paint(
  draw: StampDraw,
  cols: number,
  rows: number,
  frame: number,
  bleed: StampBleed,
  tiles: string[],
): HTMLCanvasElement {
  const w = cols * UNIT
  const h = rows * UNIT
  const canvas = document.createElement('canvas')
  canvas.width = (w + bleed.left + bleed.right) * SCALE
  canvas.height = (h + bleed.top + bleed.bottom) * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  draw(
    (x, y, pw, ph, color) => {
      if (pw <= 0 || ph <= 0) return
      ctx.fillStyle = color
      ctx.fillRect((x + bleed.left) * SCALE, (y + bleed.top) * SCALE, pw * SCALE, ph * SCALE)
    },
    { cols, rows, w, h, frame, tiles },
  )
  return canvas
}

/**
 * One frame of a stamp exactly as the game composes it — spill and all, the
 * front over the back — with where the footprint starts inside it.
 */
export function stampPreview(stampId: string, frame = 0): { canvas: HTMLCanvasElement; bleed: StampBleed } | null {
  const stamp = STAMP_BY_ID[stampId]
  const art = ART[stampId]
  if (!stamp || !art) return null
  const { cols, rows } = stampSize(stamp)
  const bleed = bleedOf(art)
  const tiles = footprint(stampId)
  const canvas = paint(art.draw, cols, rows, frame, bleed, tiles)
  if (art.over) canvas.getContext('2d')!.drawImage(paint(art.over, cols, rows, frame, bleed, tiles), 0, 0)
  return { canvas, bleed }
}

/** Whether a stamp has art of its own, as opposed to only laying down tiles. */
export function hasStampArt(stampId: string): boolean {
  return stampId in ART
}

/** Every stamp id that has art, for tests that check the art and the footprints agree. */
export function stampArtIds(): string[] {
  return Object.keys(ART)
}
