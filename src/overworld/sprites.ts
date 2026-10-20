import { Texture } from 'pixi.js'
import { FLOOR, FLOWER, FURNITURE, GRASS, PLAZA, PROP, ROAD, SAND, SIDEWALK, TILE_SIZE, TREE, WALL, WATER } from './tiles'
import { CARPET_BORDERS, INTERIOR_TILES, WALL_TOP_COLORS } from './interiorTiles'

/**
 * Sprites are authored on a 16x16 grid and blown up to the tile size with
 * nearest-neighbour scaling, which is what gives the chunky GBA-era look.
 */
const ART_SIZE = 16
const SCALE = TILE_SIZE / ART_SIZE

export type Draw = (px: (x: number, y: number, w: number, h: number, color: string) => void) => void

/** A square's canvas, at the size the game draws it, painted by one drawing. */
export function makeCanvas(draw: Draw): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = ART_SIZE * SCALE
  canvas.height = ART_SIZE * SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  draw((x, y, w, h, color) => {
    if (w <= 0 || h <= 0) return
    ctx.fillStyle = color
    ctx.fillRect(x * SCALE, y * SCALE, w * SCALE, h * SCALE)
  })
  return canvas
}

export function makeTexture(draw: Draw): Texture {
  const texture = Texture.from(makeCanvas(draw))
  texture.source.scaleMode = 'nearest'
  return texture
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

const FLOOR_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#24243a')
  px(0, 0, 16, 1, '#2b2b44')
  // Scattered speckle so large rooms don't read as flat colour.
  for (const [x, y] of [[2, 4], [11, 3], [6, 9], [13, 11], [4, 13], [9, 6]]) {
    px(x, y, 1, 1, '#2d2d48')
  }
}

const WALL_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#121218')
  px(0, 0, 16, 7, '#1b1b26')
  px(0, 8, 16, 7, '#191922')
  // Offset brick courses.
  px(0, 7, 16, 1, '#0d0d12')
  px(0, 15, 16, 1, '#0d0d12')
  px(7, 0, 1, 7, '#0d0d12')
  px(3, 8, 1, 7, '#0d0d12')
  px(12, 8, 1, 7, '#0d0d12')
}

const WATER_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#16344a')
  px(0, 3, 16, 1, '#1d4260')
  px(2, 5, 6, 1, '#20496b')
  px(10, 7, 5, 1, '#20496b')
  px(0, 10, 16, 1, '#1d4260')
  px(4, 12, 7, 1, '#20496b')
}

const ROAD_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#2b2b30')
  px(0, 0, 16, 1, '#35353c')
  px(0, 15, 16, 1, '#232328')
  px(3, 7, 5, 2, '#5a5a48')
  for (const [x, y] of [[1, 3], [12, 5], [6, 12], [14, 11]]) px(x, y, 1, 1, '#33333a')
}

/**
 * Something solid standing on the floor.
 *
 * Every piece of furniture in the game is a stamp drawn over these tiles, so on
 * its own this only shows in the editor — and it is drawn as a low dark plinth
 * rather than a crate, so that a tile nobody has put an object on yet reads as
 * "something goes here" instead of as a box.
 */
const FURNITURE_TILE: Draw = (px) => {
  px(1, 3, 14, 12, 'rgba(10, 8, 20, 0.25)')
  px(1, 2, 14, 11, '#4a3e36')
  px(1, 2, 14, 1, '#6a5a4e')
  px(1, 12, 14, 1, '#2e2620')
  px(3, 5, 10, 5, '#54473e')
}

const SIDEWALK_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#3c3c46')
  px(0, 0, 16, 1, '#4a4a56')
  // Paving slab seams.
  px(0, 7, 16, 1, '#32323c')
  px(7, 0, 1, 7, '#32323c')
  px(3, 8, 1, 8, '#32323c')
  px(12, 8, 1, 8, '#32323c')
}

const GRASS_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#24402c')
  for (const [x, y] of [[2, 3], [7, 2], [12, 5], [4, 9], [10, 11], [14, 8], [6, 13]]) {
    px(x, y, 1, 2, '#2f5237')
  }
}

/** A full, round tree — what an open map is fenced with instead of walls. */
const TREE_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#24402c')
  px(3, 1, 10, 11, '#1e5c32')
  px(2, 3, 12, 8, '#1e5c32')
  px(4, 2, 8, 3, '#2a7a44')
  px(3, 5, 4, 3, '#2a7a44')
  px(5, 9, 6, 3, '#17431f')
  px(7, 12, 2, 3, '#4a3426') // trunk
  px(5, 14, 6, 1, '#1a3020')
}

/** Dry ground: verges, beaches and the lots behind a casino. */
const SAND_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#d8c28e')
  px(0, 0, 16, 1, '#e2cf9e')
  for (const [x, y] of [[3, 4], [11, 2], [6, 9], [13, 12], [2, 13], [9, 6]]) {
    px(x, y, 1, 1, '#c9b07a')
  }
}

/** Planting along a path. Walkable, and the only bright colour in a street. */
const FLOWER_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#24402c')
  px(0, 0, 16, 1, '#2f5237')
  for (const [x, y, color] of [
    [2, 3, '#e05a7a'], [9, 2, '#f2c14e'], [12, 7, '#e05a7a'],
    [5, 10, '#f2c14e'], [10, 12, '#d96ad9'], [3, 7, '#d96ad9'],
  ] as [number, number, string][]) {
    px(x, y, 2, 2, color)
    px(x, y + 2, 1, 1, '#2f5237')
  }
}

/** Paved forecourt: the apron in front of a casino, lighter than a pavement. */
const PLAZA_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#565566')
  px(0, 0, 16, 1, '#656475')
  px(0, 7, 16, 1, '#4a4958')
  px(7, 0, 1, 7, '#4a4958')
  px(3, 8, 1, 8, '#4a4958')
  px(11, 8, 1, 8, '#4a4958')
  px(1, 1, 2, 1, '#6e6d80')
}

/** Street furniture: a planter, a barrier, the plinth of a sign. Solid. */
const PROP_TILE: Draw = (px) => {
  px(0, 0, 16, 16, '#565566')
  px(2, 3, 12, 11, '#3c3b4a')
  px(2, 3, 12, 2, '#514f62')
  px(3, 5, 10, 2, '#2a7a44')
  px(4, 6, 3, 2, '#e05a7a')
  px(9, 6, 3, 2, '#f2c14e')
  px(2, 13, 12, 1, '#2a2936')
}

/**
 * A town's colour, applied to every tile as a per-channel transform.
 *
 * There was one tile palette for the entire world, baked into the draw functions
 * as literal hex, so Porto Lumina and the street outside your flat were the same
 * grey — climbing the ladder changed a number rather than taking you somewhere.
 * Recolouring the generated art keeps one set of tile drawings (which carry the
 * detail) while letting each town look like itself.
 */
export interface TileTheme {
  /** Per-channel multipliers, then a flat lift toward white. */
  r: number
  g: number
  b: number
  lift: number
}

export const TILE_THEMES: Record<string, TileTheme> = {
  // The baseline the art was drawn in.
  default: { r: 1, g: 1, b: 1, lift: 0 },
  /** Your flat and the blocks around it: cold, under-lit, nothing spent on it. */
  home: { r: 0.9, g: 0.92, b: 1.02, lift: -4 },
  /** Reservation casino: dust, warm lamps, brown carpet. */
  dust: { r: 1.2, g: 1.02, b: 0.78, lift: 4 },
  /** River town: damp green and silt. */
  river: { r: 0.92, g: 1.12, b: 0.9, lift: 2 },
  /** Harbour city: cold blue, wet stone. */
  harbor: { r: 0.85, g: 0.98, b: 1.22, lift: 3 },
  /** Island resort: bleached sand and shallow water. */
  island: { r: 1.18, g: 1.14, b: 0.95, lift: 12 },
  /** The strip: magenta and electric purple. */
  neon: { r: 1.25, g: 0.82, b: 1.3, lift: 6 },
  /** Marble and gold, and far too much of both. */
  marble: { r: 1.22, g: 1.16, b: 1.0, lift: 18 },
}

function recolor(hex: string, theme: TileTheme): string {
  // Translucent shading is a shadow, not a colour of the town.
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex
  const n = parseInt(hex.slice(1), 16)
  const channel = (value: number, factor: number) =>
    Math.max(0, Math.min(255, Math.round(value * factor + theme.lift)))
  const r = channel((n >> 16) & 0xff, theme.r)
  const g = channel((n >> 8) & 0xff, theme.g)
  const b = channel(n & 0xff, theme.b)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/** Wraps a tile drawing so every colour it asks for is themed first. */
function themed(draw: Draw, theme: TileTheme): Draw {
  return (px) => draw((x, y, w, h, color) => px(x, y, w, h, recolor(color, theme)))
}

/** Every outdoor tile and the drawing for it, in one place so nothing can be forgotten. */
const TILE_DRAWINGS: Record<number, Draw> = {
  [FLOOR]: FLOOR_TILE,
  [WALL]: WALL_TILE,
  [FURNITURE]: FURNITURE_TILE,
  [WATER]: WATER_TILE,
  [ROAD]: ROAD_TILE,
  [SIDEWALK]: SIDEWALK_TILE,
  [GRASS]: GRASS_TILE,
  [TREE]: TREE_TILE,
  [SAND]: SAND_TILE,
  [FLOWER]: FLOWER_TILE,
  [PLAZA]: PLAZA_TILE,
  [PROP]: PROP_TILE,
}

/**
 * The picture of a tile on its own, before anything round it is considered.
 *
 * Interior tiles carry their own palettes and are never put through a town's
 * colour filter: a marble floor is marble in any town, and a room's identity
 * comes from which wall and floor it is built from, not from a tint. Outdoor
 * ground is drawn per town in `ground.ts`; what is left here — a bare wall, a
 * furniture plinth, a prop nobody has put an object on — takes the town's tint.
 */
export function baseDrawing(tile: number, col: number, row: number, themeId = 'default'): { draw: Draw; variant: number } {
  const interior = INTERIOR_TILES[tile]
  if (interior) {
    const variant = interior.pick(col, row) % interior.draws.length
    return { draw: interior.draws[variant], variant }
  }
  const theme = TILE_THEMES[themeId] ?? TILE_THEMES.default
  return { draw: themed(TILE_DRAWINGS[tile] ?? FLOOR_TILE, theme), variant: 0 }
}

// ---------------------------------------------------------------------------
// Where one tile meets another
// ---------------------------------------------------------------------------

/** A side of a tile. */
export type Side = 'n' | 'e' | 's' | 'w'

/** A band `thickness` wide along one side of a tile, `inset` in from the edge. */
function band(px: Parameters<Draw>[0], side: Side, inset: number, thickness: number, color: string) {
  if (side === 'n') px(0, inset, 16, thickness, color)
  if (side === 's') px(0, 16 - inset - thickness, 16, thickness, color)
  if (side === 'w') px(inset, 0, thickness, 16, color)
  if (side === 'e') px(16 - inset - thickness, 0, thickness, 16, color)
}

/**
 * The pieces laid over a tile where it meets something else.
 *
 * - `lip`: the rounded edge of a wall top, on the side that faces the room.
 * - `shade`: the shadow a wall throws on the floor at its foot. Light comes from
 *   the top-left, so walls shade the floor below and to the right of them.
 * - `border-<carpet>`: the bound edge of a carpet, where it stops at a wall or
 *   meets a different floor. Furniture standing on a carpet does not stop it.
 */
const EDGE_DRAWINGS: Record<string, Draw> = {}
for (const side of ['n', 'e', 's', 'w'] as Side[]) {
  EDGE_DRAWINGS[`lip-${side}`] = (px) => {
    band(px, side, 0, 1, WALL_TOP_COLORS.lip)
    band(px, side, 1, 1, WALL_TOP_COLORS.lipInner)
  }
  EDGE_DRAWINGS[`shade-${side}`] = (px) => {
    band(px, side, 0, 1, 'rgba(14, 8, 24, 0.42)')
    band(px, side, 1, 1, 'rgba(14, 8, 24, 0.26)')
    band(px, side, 2, 1, 'rgba(14, 8, 24, 0.12)')
  }
  for (const [carpet, [outer, inner, shade]] of Object.entries(CARPET_BORDERS)) {
    EDGE_DRAWINGS[`border-${carpet}-${side}`] = (px) => {
      band(px, side, 0, 1, outer)
      band(px, side, 1, 1, inner)
      band(px, side, 2, 1, shade)
    }
  }
}

/** One edge piece, by the key `EDGE_DRAWINGS` files it under. */
export function edgeDrawing(key: string): Draw | undefined {
  return EDGE_DRAWINGS[key]
}

// ---------------------------------------------------------------------------
// Characters
// ---------------------------------------------------------------------------
//
// People are drawn in characterArt.ts: 16x24 figures built from layered pixel
// maps, which outgrew this file's one-rectangle-per-part approach.

const OUTLINE = '#15151c'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export type PropKind =
  | 'slot' | 'craps' | 'counter' | 'sign' | 'lift' | 'window'

const PROPS: Record<PropKind, Draw> = {
  // Scenery, not a person: a sash window with the brick wall four feet behind it.
  window: (px) => {
    px(1, 1, 14, 13, '#3a2a22') // frame
    px(2, 2, 12, 11, '#1a1f2a') // glass
    px(3, 3, 10, 4, '#2c2420') // the brick outside, lit by nothing
    px(3, 3, 10, 1, '#352b26')
    px(3, 8, 10, 4, '#242a36')
    px(7, 2, 2, 11, '#3a2a22') // mullion
    px(2, 7, 12, 2, '#3a2a22') // sash rail
    px(3, 3, 3, 1, '#4a5466') // a weak gleam on the top pane
  },
  slot: (px) => {
    px(2, 1, 12, 14, OUTLINE)
    px(3, 2, 10, 5, '#5a3a6e') // screen bezel
    px(4, 3, 8, 3, '#d9c46a')
    px(5, 4, 1, 1, '#e05a5a')
    px(7, 4, 1, 1, '#3a9d5c')
    px(9, 4, 1, 1, '#6ea8fe')
    px(3, 8, 10, 6, '#7a4a3a') // cabinet
    px(4, 9, 8, 1, '#8f5a46')
    px(13, 8, 2, 3, '#c0c0c8') // lever
    px(13, 7, 2, 1, '#e05a5a')
  },
  craps: (px) => {
    px(1, 3, 14, 11, OUTLINE)
    px(2, 4, 12, 9, '#1e5c3a') // felt
    px(3, 5, 10, 1, '#2a7a4e')
    px(3, 11, 10, 1, '#17472d')
    px(5, 7, 2, 2, '#f0f0f0') // dice
    px(5, 7, 1, 1, '#1a1a1a')
    px(9, 8, 2, 2, '#f0f0f0')
    px(10, 9, 1, 1, '#1a1a1a')
  },
  counter: (px) => {
    px(1, 4, 14, 10, OUTLINE)
    px(2, 5, 12, 8, '#6b4a30')
    px(2, 5, 12, 1, '#8a6240')
    px(2, 9, 12, 1, '#5a3d27')
    px(4, 6, 3, 2, '#c9b07a') // goods on the shelf
    px(9, 6, 3, 2, '#7a94c9')
  },
  sign: (px) => {
    px(6, 8, 4, 8, OUTLINE) // post
    px(7, 9, 2, 6, '#5a5a66')
    px(2, 1, 12, 8, OUTLINE)
    px(3, 2, 10, 6, '#2f4f6e')
    px(4, 3, 8, 1, '#8ad4ff')
    px(4, 5, 5, 1, '#8ad4ff')
    px(4, 6, 7, 1, '#6ea8fe')
  },
  lift: (px) => {
    px(2, 1, 12, 14, OUTLINE)
    px(3, 2, 10, 12, '#3a3a4a')
    px(7, 2, 2, 12, '#20202c') // door split
    px(4, 3, 3, 3, '#d9c46a')
    px(9, 3, 3, 3, '#d9c46a')
    px(4, 11, 8, 1, '#55556a')
  },
}

const propCache = new Map<PropKind, Texture>()

export function propTexture(kind: PropKind): Texture {
  const cached = propCache.get(kind)
  if (cached) return cached
  const texture = makeTexture(PROPS[kind])
  propCache.set(kind, texture)
  return texture
}
