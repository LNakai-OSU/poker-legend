import { Texture } from 'pixi.js'
import { TILE_SIZE } from './tiles'
import { STAMP_BY_ID, stampSize } from '../world/stamps'
import { currentGlow, type Glow, type Px } from './pixelArt'
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
  /** What of it gives off light, one texture per frame, drawn over the dark after dusk. */
  litUnder: Texture[] | null
  litOver: Texture[] | null
  /** The first frame of everything lit, at canvas scale, for the light map's halos. */
  glow: HTMLCanvasElement | null
  /** Pools of light it throws on the ground after dark. */
  lights: StampLight[]
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
  // The night pass: the same drawings again, keeping only what glows.
  const lit = (draw: StampDraw) => Array.from({ length: frames }, (_, frame) => paintLit(draw, cols, rows, frame, bleed, tiles))
  const litUnder = lit(art.draw)
  const litOver = over ? lit(over) : null
  const toLitTextures = (canvases: Array<HTMLCanvasElement | null> | null) => {
    if (!canvases || canvases.every((canvas) => canvas === null)) return null
    return canvases.map((canvas) => {
      const texture = Texture.from(canvas ?? blankLike(litUnder.find((c) => c) ?? null, cols, rows, bleed))
      texture.source.scaleMode = 'nearest'
      return texture
    })
  }
  const layers: StampLayers = {
    under: Array.from({ length: frames }, (_, frame) => toTexture(art.draw, frame)),
    over: over ? Array.from({ length: frames }, (_, frame) => toTexture(over, frame)) : null,
    litUnder: toLitTextures(litUnder),
    litOver: toLitTextures(litOver),
    glow: litUnder[0] ?? litOver?.[0] ?? null,
    lights: art.lights ?? [],
    bleed,
  }
  layerCache.set(stampId, layers)
  return layers
}

/** An empty canvas the size of a stamp, for a frame of a lit stamp in which nothing happens to be lit. */
function blankLike(model: HTMLCanvasElement | null, cols: number, rows: number, bleed: StampBleed): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = model?.width ?? (cols * UNIT + bleed.left + bleed.right) * SCALE
  canvas.height = model?.height ?? (rows * UNIT + bleed.top + bleed.bottom) * SCALE
  return canvas
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

/**
 * Colours the buildings already paint lit glass in — the warm panes of a room
 * with the lights on, the frosted glass of a lantern. They were drawn lit by
 * day, so after dark they glow without having to be marked.
 */
const LIT_GLASS = new Set([
  '#ffd27a', '#ffe8a8', '#fff4cc', '#e8c068', '#f8dc90', '#ffe8a0', '#f8e0a0', '#e8b858', '#f8d888',
  '#ffe080', '#fff0c0', '#ffe07a', '#f4d68a',
])

function rgba(color: string): [number, number, number, number] {
  if (color.startsWith('#')) {
    const n = parseInt(color.slice(1), 16)
    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff, 1]
  }
  const parts = color.slice(color.indexOf('(') + 1, color.indexOf(')')).split(',').map((v) => parseFloat(v))
  return [parts[0], parts[1], parts[2], parts[3] ?? 1]
}

/**
 * The colour a lit thing is at night.
 *
 * - A window keeps its shading but turns from sky to lamplight: the lighter the
 *   glass was, the brighter the room behind it.
 * - A lamp's glass or a flame is pushed towards white-hot.
 * - Neon, bulbs and lit signs are exactly as drawn.
 */
export function litColor(kind: Glow, color: string): string {
  const [r, g, b, a] = rgba(color)
  if (kind === 'neon') return color
  if (kind === 'lamp') {
    const t = 0.5
    return `rgba(${Math.round(r + (255 - r) * t)}, ${Math.round(g + (246 - g) * t)}, ${Math.round(b + (220 - b) * t)}, ${a})`
  }
  const light = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  const warm = light > 0.82 ? [255, 244, 214] : light > 0.62 ? [255, 228, 158] : light > 0.4 ? [255, 210, 122] : [236, 172, 92]
  return `rgba(${warm[0]}, ${warm[1]}, ${warm[2]}, ${a})`
}

/**
 * A stamp's night pass: only what glows, at the colour it glows.
 *
 * The drawing runs as usual. Anything painted while marked with `glow` (or in
 * a lit-glass colour) is kept; anything painted afterwards over it — a glazing
 * bar, a curtain, a sign hung in front — cuts it back out, so a lit window
 * keeps its bars and a lantern its frame. Nothing marked at all: no canvas.
 */
function paintLit(
  draw: StampDraw,
  cols: number,
  rows: number,
  frame: number,
  bleed: StampBleed,
  tiles: string[],
): HTMLCanvasElement | null {
  const w = cols * UNIT
  const h = rows * UNIT
  const canvas = document.createElement('canvas')
  canvas.width = (w + bleed.left + bleed.right) * SCALE
  canvas.height = (h + bleed.top + bleed.bottom) * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  let glowed = false
  draw(
    (x, y, pw, ph, color) => {
      if (pw <= 0 || ph <= 0) return
      const kind: Glow | null = currentGlow() ?? (LIT_GLASS.has(color) ? 'neon' : null)
      if (kind) {
        ctx.globalCompositeOperation = 'source-over'
        ctx.fillStyle = litColor(kind, color)
        glowed = true
      } else {
        // Paint laid over something lit hides it, in proportion to how opaque it is.
        ctx.globalCompositeOperation = 'destination-out'
        ctx.fillStyle = color
      }
      ctx.fillRect((x + bleed.left) * SCALE, (y + bleed.top) * SCALE, pw * SCALE, ph * SCALE)
    },
    { cols, rows, w, h, frame, tiles },
  )
  return glowed ? canvas : null
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
