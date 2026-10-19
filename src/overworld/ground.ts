import {
  CROSSWALK, DECK, DIRT, DOOR, FLOOR, FLOWER, FURNITURE, GRASS, PLAZA, PROP, ROAD, SAND, SIDEWALK, TREE, WALL, WATER,
  type TileGrid,
} from './tiles'
import { mix, tint, type Px } from './pixelArt'

/**
 * The ground outdoors: pavement, road, grass, sand, water and the trees a town
 * is fenced in with.
 *
 * Every square of a street used to be one of a dozen 16x16 pictures, the same
 * picture wherever that tile was, recoloured per town. A pavement was a grid of
 * identical slabs running flat into the road, grass was a green rectangle cut
 * out of it, and the water was a blue box. What a street in a GBA game has, and
 * this did not, is joins: the kerb where the pavement drops to the road, the
 * lane markings worked out from where the road is, the rim of a grass verge,
 * the stone lip and the foam where the quay meets the water.
 *
 * So a square is drawn from where it is, not only what it is:
 *
 *  - its eight neighbours decide its edges (a pavement with road below it has a
 *    kerb; water with a quay above it has a lip and foam);
 *  - a hash of its position picks one of a few variants (a cracked slab, a
 *    drain, a clump of clover), so a long pavement does not tile visibly;
 *  - a road knows how far down its run of road it is, so the centre line goes
 *    on the median and the edge lines go by the kerbs;
 *  - each town has its own palette and its own trees, drawn as themselves
 *    rather than a colour filter over one set of drawings.
 *
 * Everything a picture depends on goes into its key, so identical squares share
 * one texture and the renderer and the map editor draw exactly the same thing.
 */

// ---------------------------------------------------------------------------
// Where a cell is
// ---------------------------------------------------------------------------

export type GroundClass = 'road' | 'pave' | 'grass' | 'sand' | 'dirt' | 'water' | 'deck' | 'tree' | 'solid' | 'room'

const CLASS: Record<number, GroundClass> = {
  [ROAD]: 'road',
  [CROSSWALK]: 'road',
  [SIDEWALK]: 'pave',
  [PLAZA]: 'pave',
  [FLOOR]: 'pave',
  [GRASS]: 'grass',
  [FLOWER]: 'grass',
  [SAND]: 'sand',
  [DIRT]: 'dirt',
  [WATER]: 'water',
  [DECK]: 'deck',
  [TREE]: 'tree',
  [WALL]: 'solid',
  [DOOR]: 'solid',
  [PROP]: 'solid',
  [FURNITURE]: 'solid',
}

/** What kind of ground a tile is, for deciding how two of them meet. */
export function classOf(tile: number): GroundClass {
  return CLASS[tile] ?? 'room'
}

/** The tiles drawn here rather than as an interior. */
export function isGround(tile: number): boolean {
  const kind = classOf(tile)
  return kind !== 'room' && kind !== 'solid' && kind !== 'deck'
}

/** Neighbours, clockwise from north. */
export const N = 0
export const NE = 1
export const E = 2
export const SE = 3
export const S = 4
export const SW = 5
export const W = 6
export const NW = 7
const OFFSETS: Array<[number, number]> = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]]

export interface Cell {
  tile: number
  col: number
  row: number
  /** The eight tiles round it, clockwise from north. Off the map, the tile itself: a street runs on past the edge. */
  around: number[]
  /** For road: how far down its run of road this square is, and how long the run is. */
  band: { index: number; height: number }
}

export function cellAt(grid: TileGrid, col: number, row: number): Cell {
  const tile = grid[row][col]
  const around = OFFSETS.map(([dc, dr]) => grid[row + dr]?.[col + dc] ?? tile)
  let band = { index: 0, height: 1 }
  if (classOf(tile) === 'road') {
    let up = 0
    while (row - up - 1 >= 0 && classOf(grid[row - up - 1][col]) === 'road') up++
    let down = 0
    while (row + down + 1 < grid.length && classOf(grid[row + down + 1][col]) === 'road') down++
    band = { index: up, height: up + down + 1 }
  }
  return { tile, col, row, around, band }
}

/** A well-mixed hash of a position, so neighbouring squares do not pick neighbouring variants. */
export function hash(col: number, row: number, salt = 0): number {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263) + Math.imul(salt, 362437)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  h = Math.imul(h ^ (h >>> 16), 2246822519) >>> 0
  return (h ^ (h >>> 13)) >>> 0
}

/** A small seeded generator for laying out the detail inside one drawing. */
function seeded(seed: number): (n: number) => number {
  let state = seed >>> 0
  return (n: number) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return ((state >>> 8) % n + n) % n
  }
}

// ---------------------------------------------------------------------------
// Palettes: each town in its own materials
// ---------------------------------------------------------------------------

interface PavePalette { hi: string; base: string; alt: string; lo: string; seam: string; crack: string }
interface KerbPalette { lip: string; top: string; face: string; seam: string }
interface RoadPalette {
  base: string; grain: string; grainLo: string; edge: string; median: string; gutter: string; patch: string
}
interface GrassPalette { hi: string; base: string; lo: string; rim: string; blade: string; flowers: string[] }
interface SandPalette {
  hi: string; base: string; lo: string; wet: string; pebble: string; pebbleHi: string
  /** What turns up in it. */
  detail: 'gravel' | 'desert' | 'pebbles' | 'shells'
}
interface DirtPalette { hi: string; base: string; lo: string; rut: string; pebble: string }
interface WaterPalette {
  deep: string; base: string; hi: string; glint: string; foam: string; shallow: string
  lipHi: string; lipTop: string; lipFace: string
}

type PlazaStyle =
  | { kind: 'concrete'; hi: string; base: string; lo: string; seam: string; stain: string }
  | { kind: 'flags'; tones: string[]; hi: string; grout: string; accent: string }
  | { kind: 'setts'; tones: string[]; hi: string; grout: string }
  | { kind: 'terrazzo'; base: string; fleck: string; fleckHi: string; inlay: string; inlayHi: string; sheen: string[] }
  | { kind: 'marble'; base: string; hi: string; vein: string; border: string; gold: string; goldHi: string }

export type TreeStyle = 'round' | 'willow' | 'pine' | 'palm' | 'desert' | 'palm-planter' | 'cypress'

interface TreePalette {
  style: TreeStyle
  line: string; dark: string; base: string; hi: string; top: string
  trunk: string; trunkLo: string
  /** Rock, pot or planter, where the style has one. */
  stone: string; stoneHi: string; stoneLo: string
}

export interface GroundPalette {
  pave: PavePalette
  kerb: KerbPalette
  road: RoadPalette
  grass: GrassPalette
  sand: SandPalette
  dirt: DirtPalette
  water: WaterPalette
  plaza: PlazaStyle
  tree: TreePalette
  /** What a tree stands on when nothing walkable is next to it. */
  verge: 'grass' | 'sand' | 'pave'
  /** Whether weeds come up between the slabs: not in a town that pays someone to stop them. */
  weeds: boolean
}

const BASIN: GroundPalette = {
  pave: { hi: '#a7a8ae', base: '#999aa1', alt: '#95969d', lo: '#8d8e96', seam: '#7a7b84', crack: '#66676f' },
  kerb: { lip: '#d8d9de', top: '#bbbcc5', face: '#7b7c88', seam: '#5e5f6b' },
  road: {
    base: '#4b4b55', grain: '#56565f', grainLo: '#41414a', edge: '#dcdbd2', median: '#dcb444', gutter: '#3e3e47',
    patch: '#44444d',
  },
  grass: {
    hi: '#6c9c55', base: '#5a8a4a', lo: '#4c7a40', rim: '#2f5530', blade: '#80b362',
    flowers: ['#f2ead2', '#f2c94c', '#e8829e', '#9ab8f0'],
  },
  sand: {
    hi: '#b2a796', base: '#a39886', lo: '#8f8472', wet: '#8a7f6e', pebble: '#7f7668', pebbleHi: '#c4baaa',
    detail: 'gravel',
  },
  dirt: { hi: '#9c7c5a', base: '#8b6b4b', lo: '#76593e', rut: '#6a4f36', pebble: '#a89478' },
  water: {
    deep: '#2a4f63', base: '#335d74', hi: '#477a90', glint: '#b8dce8', foam: '#e2f0f4', shallow: '#3f6f84',
    lipHi: '#c8c9d0', lipTop: '#a9aab3', lipFace: '#6a6b77',
  },
  plaza: { kind: 'concrete', hi: '#b6b4ae', base: '#a8a6a0', lo: '#9a9892', seam: '#7f7d77', stain: '#8e8c86' },
  tree: {
    style: 'round', line: '#1a3624', dark: '#25503a', base: '#336c44', hi: '#4b8d52', top: '#68a85e',
    trunk: '#5c402b', trunkLo: '#3e2b1d', stone: '#8a8c96', stoneHi: '#a8aab4', stoneLo: '#6a6c76',
  },
  verge: 'grass',
  weeds: true,
}

const DUST: GroundPalette = {
  pave: { hi: '#dbc19b', base: '#ceb28c', alt: '#c8ab86', lo: '#bea17c', seam: '#9e8160', crack: '#8f7253' },
  kerb: { lip: '#eee0c6', top: '#dcc6a3', face: '#9b8163', seam: '#7f674d' },
  road: {
    base: '#5c5550', grain: '#68615b', grainLo: '#4f4944', edge: '#eee4ca', median: '#ebbb48', gutter: '#4d4742',
    patch: '#55504b',
  },
  grass: {
    hi: '#aaad60', base: '#979b53', lo: '#848949', rim: '#5a5e30', blade: '#c0bf70',
    flowers: ['#f2a03a', '#f4d24a', '#e8603e', '#f6ead0'],
  },
  sand: {
    hi: '#eed9ae', base: '#e2c797', lo: '#d0b384', wet: '#c2a274', pebble: '#a98d6c', pebbleHi: '#d8c19c',
    detail: 'desert',
  },
  dirt: { hi: '#c99f6e', base: '#b98e5f', lo: '#9f774e', rut: '#8e6844', pebble: '#d8b98e' },
  water: {
    deep: '#2f5e72', base: '#3a6e84', hi: '#5290a4', glint: '#cfeaf0', foam: '#eef6f6', shallow: '#4a8496',
    lipHi: '#efe0c6', lipTop: '#d6bf9c', lipFace: '#9a8064',
  },
  plaza: { kind: 'flags', tones: ['#caa37c', '#c39b74', '#d2ac85', '#bd946d'], hi: '#ddbc96', grout: '#9a7757', accent: '#b9724a' },
  tree: {
    style: 'desert', line: '#2a3a22', dark: '#3e5a32', base: '#587a44', hi: '#7a9a56', top: '#a0b46a',
    trunk: '#7a5a3a', trunkLo: '#5a3e26', stone: '#b4583a', stoneHi: '#d47a52', stoneLo: '#843e2a',
  },
  verge: 'sand',
  weeds: false,
}

const RIVER: GroundPalette = {
  pave: { hi: '#a8afa0', base: '#99a192', alt: '#949c8d', lo: '#8a9282', seam: '#6d7567', crack: '#5f675a' },
  kerb: { lip: '#d2d8ca', top: '#b8bfb1', face: '#757d70', seam: '#5b6357' },
  road: {
    base: '#4b4e4f', grain: '#565a5a', grainLo: '#404344', edge: '#dcdcd2', median: '#dab446', gutter: '#3e4142',
    patch: '#454849',
  },
  grass: {
    hi: '#76b25b', base: '#609b4b', lo: '#50873f', rim: '#2e5a2c', blade: '#8ec66c',
    flowers: ['#ffffff', '#f6dc4a', '#b48ae0', '#f4a0b0'],
  },
  sand: {
    hi: '#dac8a0', base: '#cdb88f', lo: '#bba37c', wet: '#a89070', pebble: '#8a8070', pebbleHi: '#c8c0b0',
    detail: 'pebbles',
  },
  dirt: { hi: '#9e8260', base: '#8c7050', lo: '#765c40', rut: '#6a5038', pebble: '#b0a088' },
  water: {
    deep: '#28505a', base: '#336268', hi: '#4a8282', glint: '#b8dece', foam: '#dcefe6', shallow: '#457a78',
    lipHi: '#c6ccbe', lipTop: '#a5ab9d', lipFace: '#6f7569',
  },
  plaza: { kind: 'flags', tones: ['#a4a699', '#9b9d90', '#adafa1', '#939589'], hi: '#babcaf', grout: '#73756a', accent: '#8f9a84' },
  tree: {
    style: 'willow', line: '#20402a', dark: '#2e5a34', base: '#4a8040', hi: '#6aa04c', top: '#94c262',
    trunk: '#5e4630', trunkLo: '#40301f', stone: '#8a8c80', stoneHi: '#aaac9e', stoneLo: '#6a6c60',
  },
  verge: 'grass',
  weeds: true,
}

const HARBOR: GroundPalette = {
  pave: { hi: '#a6abb7', base: '#979ca9', alt: '#9297a4', lo: '#888d9a', seam: '#6a6f7d', crack: '#5b606e' },
  kerb: { lip: '#d4d8e0', top: '#b5bac4', face: '#6e7381', seam: '#575c69' },
  road: {
    base: '#464a54', grain: '#50545e', grainLo: '#3d414a', edge: '#dcdee0', median: '#dab446', gutter: '#3a3e47',
    patch: '#40444d',
  },
  grass: {
    hi: '#62a066', base: '#518f58', lo: '#447e4b', rim: '#284e30', blade: '#78b474',
    flowers: ['#f4f4f8', '#e8d24a', '#c86ac8', '#6a8ae8'],
  },
  sand: {
    hi: '#d8ccb2', base: '#cbbda0', lo: '#b8a98c', wet: '#a0937a', pebble: '#888c94', pebbleHi: '#c4c8d0',
    detail: 'pebbles',
  },
  dirt: { hi: '#9a8468', base: '#887258', lo: '#725e48', rut: '#665240', pebble: '#a8a8a8' },
  water: {
    deep: '#173d50', base: '#1f4c62', hi: '#2e6980', glint: '#a8d6e4', foam: '#e2f0f4', shallow: '#295b70',
    lipHi: '#c6cad2', lipTop: '#a1a6b0', lipFace: '#5f6470',
  },
  plaza: { kind: 'setts', tones: ['#8f94a1', '#878c99', '#989daa', '#7f8491'], hi: '#a9aeba', grout: '#5f6471' },
  tree: {
    style: 'pine', line: '#142a26', dark: '#1d3d36', base: '#2a5446', hi: '#3c6e54', top: '#5a8e64',
    trunk: '#56402e', trunkLo: '#3a2a1e', stone: '#8a8e98', stoneHi: '#aab0b8', stoneLo: '#6a6e78',
  },
  verge: 'grass',
  weeds: false,
}

const ISLAND: GroundPalette = {
  pave: { hi: '#f4e6d8', base: '#ead6c6', alt: '#e6d0c0', lo: '#dec8b6', seam: '#c6aa96', crack: '#b8987e' },
  kerb: { lip: '#fdf8f0', top: '#f0e5d7', face: '#bca58f', seam: '#a28b77' },
  road: {
    base: '#6a6660', grain: '#77736c', grainLo: '#5d5954', edge: '#f6f2e8', median: '#f2c84a', gutter: '#5b5751',
    patch: '#625e58',
  },
  grass: {
    hi: '#6cc066', base: '#57ac55', lo: '#47964a', rim: '#2a6a36', blade: '#88d47c',
    flowers: ['#f0506a', '#ffd84a', '#f08ad0', '#ffffff'],
  },
  sand: {
    hi: '#fcf1d6', base: '#f3e1b6', lo: '#e3cc9c', wet: '#d6bc88', pebble: '#c9b08a', pebbleHi: '#fff8ea',
    detail: 'shells',
  },
  dirt: { hi: '#d8b88c', base: '#c8a67a', lo: '#b08c62', rut: '#9e7a52', pebble: '#f0e0c0' },
  water: {
    deep: '#1c889a', base: '#27a4ae', hi: '#4ac4c2', glint: '#e8fff8', foam: '#ffffff', shallow: '#5fd0c2',
    lipHi: '#fbf4e6', lipTop: '#e8dcc8', lipFace: '#b8a890',
  },
  plaza: { kind: 'flags', tones: ['#f0dccb', '#e8d2c0', '#f4e4d4', '#e2cab8'], hi: '#fbf0e4', grout: '#c8ac98', accent: '#e8b4a0' },
  tree: {
    style: 'palm', line: '#1e4a2a', dark: '#2a6a34', base: '#3e8c40', hi: '#5cae4e', top: '#8ed06a',
    trunk: '#9a7a52', trunkLo: '#6e5434', stone: '#d8c8a8', stoneHi: '#f0e4cc', stoneLo: '#b0a080',
  },
  verge: 'sand',
  weeds: false,
}

const NEON: GroundPalette = {
  pave: { hi: '#4c4759', base: '#3d3949', alt: '#393546', lo: '#353141', seam: '#26232f', crack: '#1f1d27' },
  kerb: { lip: '#d4d6e2', top: '#8a8a9c', face: '#2c2a36', seam: '#1e1c26' },
  road: {
    base: '#25222c', grain: '#2f2b37', grainLo: '#1e1c24', edge: '#eeeef6', median: '#f2c040', gutter: '#1c1a21',
    patch: '#2a2731',
  },
  grass: {
    hi: '#5cb07a', base: '#4a9a68', lo: '#3c845a', rim: '#1e4a36', blade: '#74c890',
    flowers: ['#ff5ad8', '#5ae8ff', '#ffe05a', '#ffffff'],
  },
  sand: {
    hi: '#d6b896', base: '#c8a886', lo: '#b49474', wet: '#a08262', pebble: '#8a6e56', pebbleHi: '#dcc4a8',
    detail: 'desert',
  },
  dirt: { hi: '#a8845e', base: '#967450', lo: '#7e6042', rut: '#6e5238', pebble: '#c0a07c' },
  water: {
    deep: '#1e4c98', base: '#2962b2', hi: '#4a8ee0', glint: '#dcf6ff', foam: '#eef8ff', shallow: '#3a7ac8',
    lipHi: '#dadce6', lipTop: '#4e4a5c', lipFace: '#2a2734',
  },
  plaza: {
    kind: 'terrazzo', base: '#2f2b3a', fleck: '#463f58', fleckHi: '#5e5574', inlay: '#a8863a', inlayHi: '#e2c262',
    sheen: ['#5a2c62', '#24505e'],
  },
  tree: {
    style: 'palm-planter', line: '#16301e', dark: '#1e4a2a', base: '#2e6a3a', hi: '#4a8e48', top: '#72b45e',
    trunk: '#8a7050', trunkLo: '#5e4a34', stone: '#2e2c38', stoneHi: '#c8cad6', stoneLo: '#1a1920',
  },
  verge: 'pave',
  weeds: false,
}

const MARBLE: GroundPalette = {
  pave: { hi: '#efe5d4', base: '#e2d6c2', alt: '#ddd1bd', lo: '#d4c7b2', seam: '#b6a792', crack: '#a8987f' },
  kerb: { lip: '#fdf9f0', top: '#ece4d6', face: '#a99b85', seam: '#8f826e' },
  road: {
    base: '#56545b', grain: '#615f66', grainLo: '#4b4950', edge: '#f4f0e6', median: '#e8c050', gutter: '#48464d',
    patch: '#504e55',
  },
  grass: {
    hi: '#6cae62', base: '#5c9e54', lo: '#4e8e48', rim: '#2c5a30', blade: '#82c06e',
    flowers: ['#ffffff', '#f6e06a', '#e87a9a', '#b08ae0'],
  },
  sand: {
    hi: '#efe4cc', base: '#e4d6b8', lo: '#d2c2a2', wet: '#c0ae8c', pebble: '#bcb4a6', pebbleHi: '#f4f0e8',
    detail: 'pebbles',
  },
  dirt: { hi: '#b8a080', base: '#a88e6e', lo: '#927858', rut: '#806848', pebble: '#d8ccb8' },
  water: {
    deep: '#1c486c', base: '#24587e', hi: '#38789e', glint: '#e4f2fa', foam: '#f4fafc', shallow: '#306c96',
    lipHi: '#fffaf0', lipTop: '#ece4d6', lipFace: '#b4a892',
  },
  plaza: { kind: 'marble', base: '#ebe5d9', hi: '#f7f3eb', vein: '#d2c9b8', border: '#8f877a', gold: '#c9a24a', goldHi: '#efd27a' },
  tree: {
    style: 'cypress', line: '#142a1c', dark: '#1c3c26', base: '#285232', hi: '#3a6e40', top: '#5a8e52',
    trunk: '#5a4430', trunkLo: '#3c2c1e', stone: '#e4dccc', stoneHi: '#fbf6ec', stoneLo: '#b4a890',
  },
  verge: 'pave',
  weeds: false,
}

export const GROUND_PALETTES: Record<string, GroundPalette> = {
  default: BASIN,
  home: BASIN,
  dust: DUST,
  river: RIVER,
  harbor: HARBOR,
  island: ISLAND,
  neon: NEON,
  marble: MARBLE,
}

export function groundPalette(themeId: string): GroundPalette {
  return GROUND_PALETTES[themeId] ?? BASIN
}

// ---------------------------------------------------------------------------
// The shape of a drawing
// ---------------------------------------------------------------------------

/** One square's picture: what it depends on, how many frames it has, and how to draw a frame. */
export interface GroundArt {
  key: string
  frames: number
  draw: (px: Px, frame: number) => void
}

const SHADE = (alpha: number) => `rgba(12, 10, 24, ${alpha})`

const at = (cell: Cell, side: number) => classOf(cell.around[side])

/** Tree shadow: light from the top-left, so a tree darkens the ground below it and to its right. */
function treeShadowKey(cell: Cell): string {
  const n = at(cell, N) === 'tree'
  const w = at(cell, W) === 'tree'
  const nw = at(cell, NW) === 'tree'
  return `${n ? 1 : 0}${w ? 1 : 0}${nw && !n && !w ? 1 : 0}`
}

function treeShadow(px: Px, key: string) {
  if (key[0] === '1') {
    px(0, 0, 16, 2, SHADE(0.3))
    px(0, 2, 16, 1, SHADE(0.14))
  }
  if (key[1] === '1') {
    px(0, key[0] === '1' ? 3 : 0, 2, key[0] === '1' ? 13 : 16, SHADE(0.26))
    px(2, key[0] === '1' ? 3 : 0, 1, key[0] === '1' ? 13 : 16, SHADE(0.12))
  }
  if (key[2] === '1') {
    px(0, 0, 2, 2, SHADE(0.26))
    px(2, 0, 1, 2, SHADE(0.12))
    px(0, 2, 2, 1, SHADE(0.12))
  }
}

/** Which sides are grass, as a string, for tufts spilling over a pavement's edge. */
function grassSides(cell: Cell): string {
  return [N, E, S, W].map((side) => (at(cell, side) === 'grass' ? 'g' : '.')).join('')
}

/** A few blades of a verge leaning out over the edge of whatever is next to it. */
function grassSpill(px: Px, sides: string, g: GrassPalette, seed: number) {
  const rand = seeded(seed)
  const along = () => 1 + rand(12)
  if (sides[0] === 'g') {
    for (const x of [along(), along()]) {
      px(x, 0, 1, 2, g.base)
      px(x + 1, 0, 1, 1, g.blade)
      px(x, 2, 2, 1, SHADE(0.22))
    }
  }
  if (sides[2] === 'g') {
    for (const x of [along(), along()]) {
      px(x, 14, 1, 2, g.base)
      px(x - 1, 15, 1, 1, g.blade)
    }
  }
  if (sides[3] === 'g') {
    for (const y of [along(), along()]) {
      px(0, y, 2, 1, g.base)
      px(0, y - 1, 1, 1, g.blade)
      px(2, y, 1, 1, SHADE(0.2))
    }
  }
  if (sides[1] === 'g') {
    for (const y of [along(), along()]) {
      px(14, y, 2, 1, g.base)
      px(15, y - 1, 1, 1, g.blade)
    }
  }
}

// ---------------------------------------------------------------------------
// Pavement
// ---------------------------------------------------------------------------

/**
 * Slab tones for the four slabs in a square, top-left first: 0 base, 1 alt, 2 lo.
 * Squares pick one of these by position, so a pavement is never one slab
 * repeated, but no slab is ever two colours where it crosses into the next square.
 */
const SLAB_TONES = [[0, 0, 0, 1], [1, 0, 2, 0], [0, 2, 1, 0], [2, 1, 0, 0], [0, 1, 0, 2], [1, 0, 0, 0]]

type PaveFeature = 'none' | 'crack' | 'cover' | 'gum' | 'weeds' | 'chip'

function slabs(px: Px, p: PavePalette, tones: number[]) {
  const toneOf = (t: number) => [p.base, p.alt, p.lo][t]
  const corners: Array<[number, number]> = [[0, 0], [8, 0], [0, 8], [8, 8]]
  corners.forEach(([x, y], i) => {
    const tone = toneOf(tones[i])
    px(x, y, 8, 8, tone)
    // Each slab's top and left arris catch the light; its joint is the shadow line.
    px(x, y, 7, 1, mix(tone, p.hi, 0.7))
    px(x, y + 1, 1, 6, mix(tone, p.hi, 0.45))
    px(x + 7, y, 1, 8, p.seam)
    px(x, y + 7, 8, 1, p.seam)
  })
}

function paveFeature(px: Px, feature: PaveFeature, p: PavePalette, g: GrassPalette, seed: number) {
  const rand = seeded(seed)
  if (feature === 'crack') {
    // A crack across one slab, wandering, with its lower lip catching the light.
    const fromLeft = rand(2) === 0
    let x = fromLeft ? 1 + rand(2) : 9 + rand(2)
    let y = 1 + rand(3)
    for (let i = 0; i < 6 && y < 7; i++) {
      px(x, y, 1, 1, p.crack)
      px(x + 1, y, 1, 1, p.hi)
      x += rand(3) === 0 ? 0 : 1
      y += 1
      if (x > (fromLeft ? 6 : 14)) break
    }
  } else if (feature === 'cover') {
    // A utility cover set into the middle slab.
    px(5, 9, 6, 5, p.seam)
    px(6, 10, 4, 3, p.lo)
    px(6, 10, 4, 1, p.alt)
    px(7, 11, 1, 1, p.seam)
    px(9, 11, 1, 1, p.seam)
  } else if (feature === 'gum') {
    // Old chewing gum, flattened black.
    for (let i = 0; i < 3; i++) {
      const x = 1 + rand(13)
      const y = 1 + rand(13)
      px(x, y, 1, 1, p.crack)
    }
  } else if (feature === 'weeds') {
    // Something green coming up where four slabs meet.
    const [x, y] = rand(2) === 0 ? [7, 6] : [11, 14]
    px(x, y, 1, 2, g.base)
    px(x - 1, y, 1, 1, g.blade)
    px(x + 1, y - 1, 1, 1, g.blade)
    px(x + 1, y + 1, 1, 1, SHADE(0.2))
  } else if (feature === 'chip') {
    // A corner knocked off a slab.
    px(6, 6, 1, 1, p.crack)
    px(5, 7, 2, 1, p.crack)
    px(5, 6, 1, 1, p.lo)
  }
}

/** Kerbs: the pavement's edge where it drops to the road, lit along its top, its face toward you in shade. */
function kerbKey(cell: Cell): string {
  return [N, E, S, W].map((side) => (at(cell, side) === 'road' ? 'r' : '.')).join('')
}

function kerbs(px: Px, key: string, k: KerbPalette) {
  if (key[2] === 'r') {
    // Road below: the kerb's top, then its face, which faces you.
    px(0, 11, 16, 1, k.seam)
    px(0, 12, 16, 1, k.lip)
    px(0, 13, 16, 1, k.top)
    px(0, 14, 16, 2, k.face)
    px(0, 15, 16, 1, tint(k.face, -0.18))
    for (const x of [7, 15]) {
      px(x, 12, 1, 2, k.seam)
      px(x, 14, 1, 2, tint(k.face, -0.3))
    }
  }
  if (key[0] === 'r') {
    // Road above: only the kerb's top shows; its face looks away from you.
    px(0, 0, 16, 1, k.lip)
    px(0, 1, 16, 2, k.top)
    px(0, 3, 16, 1, k.seam)
    for (const x of [3, 11]) px(x, 0, 1, 3, k.seam)
  }
  if (key[1] === 'r') {
    px(12, 0, 1, 16, k.seam)
    px(13, 0, 3, 16, k.top)
    px(13, 0, 1, 16, k.lip)
  }
  if (key[3] === 'r') {
    px(0, 0, 3, 16, k.top)
    px(0, 0, 1, 16, k.lip)
    px(3, 0, 1, 16, k.seam)
  }
}

/** Where a pavement meets loose ground, a row of edging stones holds it in. */
function edgingKey(cell: Cell): string {
  return [N, E, S, W].map((side) => {
    const kind = at(cell, side)
    return kind === 'sand' || kind === 'dirt' ? 'e' : '.'
  }).join('')
}

function edging(px: Px, key: string, k: KerbPalette) {
  if (key[2] === 'e') {
    px(0, 14, 16, 1, k.top)
    px(0, 15, 16, 1, k.face)
  }
  if (key[0] === 'e') {
    px(0, 0, 16, 1, k.face)
    px(0, 1, 16, 1, k.top)
  }
  if (key[1] === 'e') px(15, 0, 1, 16, k.face)
  if (key[3] === 'e') px(0, 0, 1, 16, k.top)
}

function pickPaveFeature(palette: GroundPalette, h: number): PaveFeature {
  const roll = h % 100
  if (roll < 8) return 'crack'
  if (roll < 10) return 'cover'
  if (roll < 15) return palette.weeds ? 'weeds' : 'chip'
  if (roll < 19) return palette.weeds ? 'gum' : 'none'
  if (roll < 22) return 'chip'
  return 'none'
}

function pavementArt(cell: Cell, palette: GroundPalette): GroundArt {
  const h = hash(cell.col, cell.row, 11)
  const tones = h % SLAB_TONES.length
  const feature = pickPaveFeature(palette, hash(cell.col, cell.row, 12))
  const kerb = kerbKey(cell)
  const edge = edgingKey(cell)
  const spill = grassSides(cell)
  const shadow = treeShadowKey(cell)
  const seed = hash(cell.col, cell.row, 13) % 64
  return {
    key: `pave:${tones}:${feature}:${feature === 'none' ? 0 : seed}:${kerb}:${edge}:${spill}:${spill === '....' ? 0 : seed}:${shadow}`,
    frames: 1,
    draw: (px) => {
      slabs(px, palette.pave, SLAB_TONES[tones])
      paveFeature(px, feature, palette.pave, palette.grass, seed)
      edging(px, edge, palette.kerb)
      kerbs(px, kerb, palette.kerb)
      grassSpill(px, spill, palette.grass, seed)
      treeShadow(px, shadow)
    },
  }
}

// ---------------------------------------------------------------------------
// Plazas: each town paves its forecourts its own way
// ---------------------------------------------------------------------------

/** A 32x32 pattern spread over a 2x2 block of squares, so the paving does not repeat every square. */
function blockQuarter(cell: Cell): number {
  return (cell.col & 1) + 2 * (cell.row & 1)
}

/**
 * Flagstones: courses of different heights, each course a run of stones of
 * different widths, offset so no joint runs straight through. Over 32x32, then
 * wrapped, so the pattern meets itself at the block's edges.
 */
const FLAG_COURSES: Array<{ y: number; h: number; offset: number; widths: number[] }> = [
  { y: 0, h: 11, offset: 0, widths: [13, 19] },
  { y: 11, h: 9, offset: 9, widths: [17, 15] },
  { y: 20, h: 12, offset: 4, widths: [11, 21] },
]

function flagstoneAt(x: number, y: number): { stone: number; dx: number; dy: number; w: number; h: number } {
  const course = FLAG_COURSES.findIndex((c) => y >= c.y && y < c.y + c.h)
  const c = FLAG_COURSES[course]
  const along = (x - c.offset + 64) % 32
  let start = 0
  for (let i = 0; i < c.widths.length; i++) {
    if (along < start + c.widths[i]) return { stone: course * 2 + i, dx: along - start, dy: y - c.y, w: c.widths[i], h: c.h }
    start += c.widths[i]
  }
  return { stone: course * 2, dx: 0, dy: y - c.y, w: c.widths[0], h: c.h }
}

/** Granite setts, four units square, each course offset by two. */
function settAt(x: number, y: number): { sett: number; dx: number; dy: number } {
  const course = Math.floor(y / 4)
  const shifted = x + (course % 2 === 0 ? 0 : 2)
  return { sett: course * 16 + Math.floor(((shifted % 32) + 32) % 32 / 4), dx: ((shifted % 4) + 4) % 4, dy: y % 4 }
}

function plazaArt(cell: Cell, palette: GroundPalette): GroundArt {
  const style = palette.plaza
  const quarter = blockQuarter(cell)
  const h = hash(cell.col, cell.row, 21)
  // Each 2x2 block of squares shuffles its stones' tones and picks its own odd
  // stone out, so the pattern never tiles across a whole forecourt.
  const block = hash(cell.col >> 1, cell.row >> 1, 22)
  // The terrazzo's brass runs on a grid four squares across.
  const big = { x: cell.col % 4, y: cell.row % 4 }
  const shift = block % 4
  const odd = (block >> 4) % 9
  const kerb = kerbKey(cell)
  const edge = edgingKey(cell)
  const spill = grassSides(cell)
  const shadow = treeShadowKey(cell)
  const seed = h % 61
  let feature = 'none'
  const roll = h % 100
  if (style.kind === 'concrete') feature = roll < 14 ? 'stain' : roll < 22 ? 'crack' : roll < 26 ? 'drain' : 'none'
  else if (style.kind === 'flags') feature = roll < 10 ? 'crack' : roll < 18 ? 'tuft' : 'none'
  else if (style.kind === 'setts') feature = roll < 4 ? 'puddle' : roll < 10 ? 'loose' : 'none'
  else if (style.kind === 'terrazzo') feature = roll < 9 ? 'sheen' : 'none'
  else if (style.kind === 'marble') feature = roll < 18 ? 'vein' : 'none'

  const draw: GroundArt['draw'] = (px) => {
    const ox = (quarter & 1) * 16
    const oy = (quarter >> 1) * 16
    if (style.kind === 'concrete') {
      px(0, 0, 16, 16, style.base)
      const rand = seeded(seed + quarter * 97)
      for (let i = 0; i < 9; i++) px(rand(16), rand(16), 1, 1, i % 3 === 0 ? style.hi : style.lo)
      // Expansion joints every two squares: a sawn line with a lit lip under it.
      if (ox === 0) {
        px(0, 0, 1, 16, style.seam)
        px(1, 0, 1, 16, style.hi)
      }
      if (oy === 0) {
        px(0, 0, 16, 1, style.seam)
        px(0, 1, 16, 1, style.hi)
      }
      if (feature === 'stain') {
        const x = 3 + rand(7)
        const y = 4 + rand(6)
        px(x, y, 5, 3, style.stain)
        px(x + 1, y - 1, 3, 1, style.stain)
        px(x + 1, y + 3, 4, 1, style.stain)
        px(x + 2, y + 1, 2, 1, tint(style.stain, -0.1))
      } else if (feature === 'crack') {
        let x = 4 + rand(6)
        for (let y = 3; y < 14; y++) {
          px(x, y, 1, 1, style.seam)
          if (rand(3) === 0) x += rand(2) === 0 ? -1 : 1
        }
      } else if (feature === 'drain') {
        px(4, 5, 8, 6, tint(style.seam, -0.2))
        px(5, 6, 6, 4, '#2a2a30')
        for (let x = 5; x < 11; x += 2) px(x, 6, 1, 4, tint(style.seam, -0.05))
        px(4, 11, 8, 1, style.hi)
      }
    } else if (style.kind === 'flags') {
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const stone = flagstoneAt(ox + x, oy + y)
          let color = style.tones[(stone.stone * 3 + 1 + shift) % style.tones.length]
          // Now and then a stone in the block is a different stone altogether.
          if (stone.stone === odd) color = style.accent
          if (stone.dx === stone.w - 1 || stone.dy === stone.h - 1) color = style.grout
          else if (stone.dy === 0) color = mix(color, style.hi, 0.55)
          else if (stone.dx === 0) color = mix(color, style.hi, 0.3)
          else if (stone.dx === stone.w - 2 || stone.dy === stone.h - 2) color = mix(color, style.grout, 0.25)
          px(x, y, 1, 1, color)
        }
      }
      const rand = seeded(seed)
      if (feature === 'crack') {
        let x = 3 + rand(9)
        for (let y = 2 + rand(3); y < 12; y++) {
          px(x, y, 1, 1, style.grout)
          if (rand(2) === 0) x += 1
        }
      } else if (feature === 'tuft') {
        // Dust and a scrap of something green in a joint.
        const x = 2 + rand(11)
        px(x, 8, 2, 1, palette.sand.lo)
        px(x + 1, 7, 1, 1, palette.grass.blade)
        px(x, 6, 1, 1, palette.grass.base)
      }
    } else if (style.kind === 'setts') {
      const rand = seeded(seed)
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          const sett = settAt(ox + x, oy + y)
          let color = style.tones[(sett.sett * 7 + (sett.sett >> 3) + shift) % style.tones.length]
          if (sett.dx === 3 || sett.dy === 3) color = mix(style.grout, color, 0.35)
          else if (sett.dy === 0) color = mix(color, style.hi, 0.5)
          else if (sett.dx === 0) color = mix(color, style.hi, 0.25)
          px(x, y, 1, 1, color)
        }
      }
      if (feature === 'puddle') {
        // Rain left in a dip between the stones, the sky in it.
        const x = 3 + rand(6)
        const y = 5 + rand(5)
        const water = mix(style.tones[1], '#3a4a66', 0.55)
        px(x, y, 7, 2, water)
        px(x + 1, y - 1, 5, 1, water)
        px(x + 1, y + 2, 4, 1, water)
        px(x + 1, y, 3, 1, mix(water, '#c8d8ec', 0.45))
      } else if (feature === 'loose') {
        const x = 4 * rand(4)
        const y = 4 * rand(4)
        px(x, y, 3, 3, tint(style.tones[0], -0.12))
        px(x, y + 3, 4, 1, SHADE(0.35))
      }
    } else if (style.kind === 'terrazzo') {
      px(0, 0, 16, 16, style.base)
      const rand = seeded(seed + quarter * 31)
      for (let i = 0; i < 18; i++) px(rand(16), rand(16), 1, 1, i % 4 === 0 ? style.fleckHi : style.fleck)
      if (feature === 'sheen') {
        // A neon sign's reflection lying across the polished stone.
        const color = mix(style.base, style.sheen[h % style.sheen.length], 0.6)
        const start = rand(6)
        for (let i = 0; i < 7; i++) px(start + i, 13 - i, 1, 1, color)
      }
      // Polished slab joints every square, and a brass inlay every fourth, a
      // stud where the brass lines cross.
      px(0, 0, 16, 1, tint(style.base, -0.3))
      px(0, 0, 1, 16, tint(style.base, -0.3))
      px(0, 1, 16, 1, tint(style.base, 0.06))
      if (big.x === 0) px(0, 0, 1, 16, mix(style.inlay, style.base, 0.35))
      if (big.y === 0) px(0, 0, 16, 1, mix(style.inlay, style.base, 0.2))
      if (big.x === 0 && big.y === 0) {
        px(0, 0, 2, 2, style.inlayHi)
        px(0, 0, 1, 1, '#fff2c0')
      }
    } else if (style.kind === 'marble') {
      // Slabs with a dark border inlaid round every block of four, a gold
      // diamond where four blocks meet, and veins wandering through.
      px(0, 0, 16, 16, style.base)
      const rand = seeded(seed + quarter * 13)
      let vx = rand(16)
      for (let y = 0; y < 16; y++) {
        if (rand(3) !== 0) px(vx, y, 1, 1, style.vein)
        vx = (vx + (rand(3) === 0 ? 0 : 1)) % 16
      }
      if (feature === 'vein') {
        let x = rand(10)
        for (let y = 2; y < 14; y++) {
          px(x, y, 2, 1, style.vein)
          x += rand(2)
        }
      }
      px(0, 0, 16, 1, style.hi)
      px(0, 0, 1, 16, style.hi)
      px(15, 0, 1, 16, tint(style.base, -0.08))
      px(0, 15, 16, 1, tint(style.base, -0.08))
      if (ox === 0) px(0, 0, 1, 16, style.border)
      if (oy === 0) px(0, 0, 16, 1, style.border)
      if (ox === 16) px(15, 0, 1, 16, style.border)
      if (oy === 16) px(0, 15, 16, 1, style.border)
      // The corners of the block: a quarter of a gold diamond in each.
      const cx = ox === 0 ? 0 : 15
      const cy = oy === 0 ? 0 : 15
      const sx = ox === 0 ? 1 : -1
      const sy = oy === 0 ? 1 : -1
      for (let i = 0; i < 4; i++) {
        for (let j = 0; i + j < 4; j++) {
          px(cx + sx * i, cy + sy * j, 1, 1, i + j < 2 ? style.goldHi : style.gold)
        }
      }
      px(cx + sx * 4, cy, 1, 1, style.border)
      px(cx, cy + sy * 4, 1, 1, style.border)
    }
    edging(px, edge, palette.kerb)
    kerbs(px, kerb, palette.kerb)
    grassSpill(px, spill, palette.grass, seed)
    treeShadow(px, shadow)
  }

  return {
    key: `plaza:${style.kind}:${quarter}:${style.kind === 'flags' || style.kind === 'setts' ? `${shift}.${odd}` : ''}:${style.kind === 'terrazzo' ? `${big.x === 0 ? 1 : 0}${big.y === 0 ? 1 : 0}` : ''}:${feature}:${feature === 'none' && style.kind !== 'concrete' && style.kind !== 'terrazzo' && style.kind !== 'marble' && style.kind !== 'setts' ? 0 : seed}:${kerb}:${edge}:${spill}:${shadow}`,
    frames: 1,
    draw,
  }
}

// ---------------------------------------------------------------------------
// Road
// ---------------------------------------------------------------------------

/** Dashes run along the road in world space, twelve units of paint in every thirty-two. */
function dashSpan(col: number): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  let start = -1
  for (let x = 0; x <= 16; x++) {
    const world = (col * 16 + x) % 32
    const on = x < 16 && world >= 6 && world < 18
    if (on && start < 0) start = x
    if (!on && start >= 0) {
      spans.push([start, x - start])
      start = -1
    }
  }
  return spans
}

function roadEdgesKey(cell: Cell): string {
  return [N, E, S, W].map((side) => (at(cell, side) === 'road' ? 'r' : '.')).join('')
}

function asphalt(px: Px, r: RoadPalette, variant: number) {
  px(0, 0, 16, 16, r.base)
  const rand = seeded(variant * 7919 + 17)
  for (let i = 0; i < 14; i++) px(rand(16), rand(16), 1, 1, i % 2 === 0 ? r.grain : r.grainLo)
}

function roadArt(cell: Cell, palette: GroundPalette): GroundArt {
  const r = palette.road
  const crossing = cell.tile === CROSSWALK
  const edges = roadEdgesKey(cell)
  const { index, height } = cell.band
  const first = index === 0
  const last = index === height - 1
  const h = hash(cell.col, cell.row, 31)
  const variant = h % 4
  // Things in a road: a patch of newer tarmac, a manhole in the lane, a drain in the gutter.
  const roll = hash(cell.col, cell.row, 32) % 100
  const outer = (first && edges[0] !== 'r') || (last && edges[2] !== 'r')
  const feature = crossing
    ? 'none'
    : outer && roll < 16 && cell.col % 3 === 0
      ? 'drain'
      : !outer && roll < 7
        ? 'manhole'
        : roll > 93
          ? 'oil'
          : roll > 86
            ? 'seal'
            : 'none'
  const dashes = crossing ? [] : dashSpan(cell.col)
  const dashKey = dashes.map(([x, w]) => `${x}+${w}`).join(',')
  const shadow = treeShadowKey(cell)

  const draw: GroundArt['draw'] = (px) => {
    asphalt(px, r, variant)
    if (feature === 'oil') {
      // Where a car stood with a leak.
      const rand = seeded(h)
      const x = 3 + rand(6)
      const y = 5 + rand(5)
      px(x, y, 5, 2, r.patch)
      px(x + 1, y - 1, 3, 1, r.patch)
      px(x + 1, y + 2, 2, 1, r.patch)
      px(x + 1, y, 2, 1, mix(r.patch, '#000000', 0.2))
    } else if (feature === 'seal') {
      // A crack somebody ran tar along.
      const rand = seeded(h)
      let x = rand(4)
      let y = 4 + rand(8)
      for (let i = 0; i < 12 && x < 16; i++) {
        px(x, y, 1, 1, r.grainLo)
        x += 1
        if (rand(3) === 0) y += rand(2) === 0 ? -1 : 1
      }
    }
    if (feature === 'manhole') {
      // Iron, round, with its pattern of ribs.
      px(5, 5, 6, 6, r.grainLo)
      px(4, 6, 8, 4, r.grainLo)
      px(5, 6, 6, 4, '#5a5a62')
      px(6, 5, 4, 6, '#5a5a62')
      px(6, 6, 4, 1, '#6e6e76')
      for (const y of [7, 9]) px(6, y, 4, 1, '#44444c')
      px(7, 6, 1, 4, '#44444c')
    }

    if (crossing) {
      // Zebra stripes across the road, a little worn where the wheels go.
      const top = first && edges[0] !== 'r' ? 2 : 0
      const bottom = last && edges[2] !== 'r' ? 13 : 16
      for (const x of [1, 5, 9, 13]) {
        px(x, top, 2, bottom - top, r.edge)
        px(x + 1, top, 1, bottom - top, tint(r.edge, -0.08))
      }
      const rand = seeded(h)
      for (let i = 0; i < 4; i++) px([1, 5, 9, 13][rand(4)] + rand(2), top + rand(Math.max(1, bottom - top)), 1, 1, r.grain)
    } else {
      const top = index * 16
      const span = height * 16
      const median = span / 2
      // The centre line. On a road an even number of squares deep it falls on
      // a join between squares, and each square draws its half of the dash.
      if (median % 16 === 0) {
        if (median === top) for (const [x, w] of dashes) px(x, 0, w, 1, r.median)
        if (median === top + 16) for (const [x, w] of dashes) px(x, 15, w, 1, r.median)
      } else if (median > top && median < top + 16) {
        // Odd: a double solid line down the middle of the middle lane.
        const y = Math.floor(median - top)
        px(0, y - 1, 16, 1, r.median)
        px(0, y + 1, 16, 1, r.median)
      }
      // Lane lines between squares that are not the centre, in white.
      for (let b = 16; b < span; b += 16) {
        if (b === median) continue
        if (b === top) for (const [x, w] of dashes) px(x, 0, w, 1, r.edge)
        if (b === top + 16) for (const [x, w] of dashes) px(x, 15, w, 1, r.edge)
      }
      // Edge lines just inside the kerbs.
      if (first && edges[0] !== 'r') px(0, 3, 16, 1, r.edge)
      if (last && edges[2] !== 'r') px(0, 12, 16, 1, r.edge)
    }

    if (feature === 'drain') {
      // A grate in the gutter, by the kerb it drains.
      const y = last && edges[2] !== 'r' ? 12 : 1
      px(4, y, 8, 3, '#2a2a30')
      for (let x = 5; x < 12; x += 2) px(x, y, 1, 3, '#55555c')
      px(4, y, 8, 1, '#6a6a72')
    }

    // Where the road meets the kerb: the kerb's shadow along the top, a darker gutter along the bottom.
    if (edges[0] !== 'r') {
      px(0, 0, 16, 1, SHADE(0.45))
      px(0, 1, 16, 1, SHADE(0.18))
    }
    if (edges[2] !== 'r') px(0, 15, 16, 1, r.gutter)
    if (edges[3] !== 'r') {
      px(0, 0, 1, 16, SHADE(0.45))
      px(1, 0, 1, 16, SHADE(0.18))
    }
    if (edges[1] !== 'r') px(15, 0, 1, 16, r.gutter)
    treeShadow(px, shadow)
  }

  return {
    key: `road:${crossing ? 'x' : 'r'}:${variant}:${feature}:${index}/${height}:${edges}:${dashKey}:${shadow}`,
    frames: 1,
    draw,
  }
}

// ---------------------------------------------------------------------------
// Grass and flowers
// ---------------------------------------------------------------------------

/** Blade marks for each texture variant: [x, y], laid out once so every variant is stable. */
const GRASS_MARKS: Array<Array<[number, number]>> = [0, 1, 2, 3].map((v) => {
  const rand = seeded(v * 101 + 7)
  const marks: Array<[number, number]> = []
  // A loose grid with jitter: spread out, never clumped, never in rows.
  for (let gy = 0; gy < 4; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (rand(5) === 0) continue
      marks.push([gx * 5 + rand(4), gy * 4 + rand(3)])
    }
  }
  return marks
})

function grassBase(px: Px, g: GrassPalette, texture: number) {
  px(0, 0, 16, 16, g.base)
  for (const [x, y] of GRASS_MARKS[texture]) {
    // A blade lit on its left, its shadow to the right.
    px(x, y, 1, 2, g.hi)
    px(x + 1, y + 1, 1, 1, g.lo)
  }
}

function tuft(px: Px, g: GrassPalette, x: number, y: number) {
  px(x, y + 1, 1, 2, g.blade)
  px(x + 1, y, 1, 3, g.hi)
  px(x + 2, y + 1, 1, 2, g.blade)
  px(x + 3, y + 2, 1, 1, g.hi)
  px(x, y + 3, 4, 1, g.lo)
}

/** The rim of a verge against whatever it is not. */
function grassRimKey(cell: Cell): string {
  const open = (side: number) => {
    const kind = at(cell, side)
    return kind !== 'grass' && kind !== 'tree' && kind !== 'solid' && kind !== 'room'
  }
  const sides = [N, E, S, W].map((side) => (open(side) ? 'o' : '.')).join('')
  // Inner corners: a diagonal that is open while the two sides either side of it are not.
  const corners = [[NE, N, E], [SE, S, E], [SW, S, W], [NW, N, W]]
    .map(([d, a, b]) => (open(d) && !open(a) && !open(b) ? 'c' : '.'))
    .join('')
  return sides + corners
}

function grassRim(px: Px, key: string, g: GrassPalette, seed: number) {
  const rand = seeded(seed)
  if (key[0] === 'o') {
    px(0, 0, 16, 1, g.rim)
    px(0, 1, 16, 1, g.lo)
    for (let x = rand(3); x < 16; x += 3 + rand(3)) px(x, 1, 1, 1, g.blade)
  }
  if (key[2] === 'o') {
    px(0, 15, 16, 1, g.rim)
    px(0, 14, 16, 1, g.lo)
    for (let x = rand(3); x < 16; x += 3 + rand(3)) {
      px(x, 13, 1, 2, g.blade)
      px(x, 15, 1, 1, g.lo)
    }
  }
  if (key[3] === 'o') {
    px(0, 0, 1, 16, g.rim)
    px(1, 0, 1, 16, g.lo)
    for (let y = rand(3); y < 16; y += 3 + rand(3)) px(1, y, 1, 1, g.blade)
  }
  if (key[1] === 'o') {
    px(15, 0, 1, 16, g.rim)
    px(14, 0, 1, 16, g.lo)
    for (let y = rand(3); y < 16; y += 3 + rand(3)) px(14, y, 1, 1, g.blade)
  }
  if (key[4] === 'c') px(15, 0, 1, 1, g.rim)
  if (key[5] === 'c') px(15, 15, 1, 1, g.rim)
  if (key[6] === 'c') px(0, 15, 1, 1, g.rim)
  if (key[7] === 'c') px(0, 0, 1, 1, g.rim)
}

/** A flower: four petals round a centre, on a stem. */
function flower(px: Px, x: number, y: number, petal: string, centre: string, stem: string) {
  px(x, y + 1, 1, 2, stem)
  px(x - 1, y - 1, 3, 1, petal)
  px(x, y - 2, 1, 3, petal)
  px(x, y - 1, 1, 1, centre)
  px(x + 1, y, 1, 1, SHADE(0.2))
}

function grassArt(cell: Cell, palette: GroundPalette): GroundArt {
  const g = palette.grass
  const h = hash(cell.col, cell.row, 41)
  const texture = h % GRASS_MARKS.length
  const isFlowerBed = cell.tile === FLOWER
  const roll = hash(cell.col, cell.row, 42) % 100
  const feature = isFlowerBed ? 'bed' : roll < 22 ? 'tuft' : roll < 34 ? 'flowers' : roll < 40 ? 'clover' : 'none'
  const rim = grassRimKey(cell)
  const shadow = treeShadowKey(cell)
  const seed = hash(cell.col, cell.row, 43) % 48
  const colours = (hash(cell.col, cell.row, 44) % g.flowers.length)

  const draw: GroundArt['draw'] = (px, frame) => {
    grassBase(px, g, texture)
    const rand = seeded(seed)
    if (feature === 'tuft') {
      tuft(px, g, 2 + rand(9), 3 + rand(8))
    } else if (feature === 'flowers') {
      // Two or three small wild flowers.
      for (let i = 0; i < 3; i++) {
        const x = 2 + rand(12)
        const y = 2 + rand(12)
        px(x, y, 1, 1, g.flowers[(colours + i) % g.flowers.length])
        px(x, y + 1, 1, 1, g.lo)
      }
    } else if (feature === 'clover') {
      const x = 3 + rand(8)
      const y = 4 + rand(7)
      for (const [dx, dy] of [[0, 0], [2, 0], [1, -1], [1, 1]]) px(x + dx, y + dy, 1, 1, g.blade)
      px(x + 1, y, 1, 1, g.lo)
    } else if (feature === 'bed') {
      // A bed of flowers that nod in the breeze, every other one each frame.
      const spots: Array<[number, number]> = [[3, 4], [10, 3], [6, 9], [13, 10], [2, 13], [9, 14]]
      spots.forEach(([x, y], i) => {
        const sway = frame === 1 && i % 2 === 0 ? 1 : 0
        const petal = g.flowers[(colours + (i % 2)) % g.flowers.length]
        const centre = petal === '#ffffff' || petal === '#f2ead2' || petal === '#f6ead0' ? '#f2c94c' : '#fff6d8'
        flower(px, x + sway, y, petal, centre, g.lo)
      })
    }
    grassRim(px, rim, g, seed)
    treeShadow(px, shadow)
  }

  return {
    key: `grass:${texture}:${feature}:${feature === 'none' ? 0 : seed}:${colours}:${rim}:${shadow}`,
    frames: isFlowerBed ? 2 : 1,
    draw,
  }
}

// ---------------------------------------------------------------------------
// Sand and dirt
// ---------------------------------------------------------------------------

function wetKey(cell: Cell): string {
  return [N, E, S, W].map((side) => (at(cell, side) === 'water' ? 'w' : '.')).join('')
}

function sandArt(cell: Cell, palette: GroundPalette): GroundArt {
  const s = palette.sand
  const h = hash(cell.col, cell.row, 51)
  const grain = h % 4
  const roll = hash(cell.col, cell.row, 52) % 100
  const feature = roll < 18 ? 'pebbles' : roll < 30 ? 'detail' : roll < 36 ? 'tuft' : 'none'
  const wet = wetKey(cell)
  const spill = grassSides(cell)
  const shadow = treeShadowKey(cell)
  const seed = hash(cell.col, cell.row, 53) % 64

  const draw: GroundArt['draw'] = (px) => {
    px(0, 0, 16, 16, s.base)
    const rand = seeded(grain * 131 + 5)
    for (let i = 0; i < 12; i++) px(rand(16), rand(16), 1, 1, i % 3 === 0 ? s.hi : s.lo)
    const r = seeded(seed)
    if (feature === 'pebbles') {
      for (let i = 0; i < 2 + r(2); i++) {
        const x = 1 + r(13)
        const y = 1 + r(13)
        px(x, y, 2, 2, s.pebble)
        px(x, y, 1, 1, s.pebbleHi)
        px(x + 2, y + 1, 1, 1, SHADE(0.18))
      }
    } else if (feature === 'detail') {
      const x = 2 + r(10)
      const y = 3 + r(9)
      if (s.detail === 'shells') {
        // A scallop shell, ribbed, and a smaller pink one.
        px(x, y, 3, 2, '#fff8ee')
        px(x + 1, y - 1, 1, 1, '#fff8ee')
        px(x, y + 1, 3, 1, '#e8c8b8')
        px(x + 1, y, 1, 2, '#e0b8a8')
        px(x + 5, y + 3, 2, 1, '#f4a8b8')
        px(x + 5, y + 4, 2, 1, '#d88898')
      } else if (s.detail === 'desert') {
        // Ripples the wind has left.
        for (const [dx, dy, w] of [[0, 0, 4], [1, 1, 5], [5, 2, 3], [3, 4, 5], [4, 5, 3]]) {
          px(x + dx - 1, y + dy, w, 1, dy % 2 === 0 ? s.lo : s.hi)
        }
      } else if (s.detail === 'gravel') {
        for (let i = 0; i < 8; i++) px(r(16), r(16), 1, 1, i % 2 ? s.pebble : s.pebbleHi)
      } else {
        // A flat stone and a twig.
        px(x, y, 4, 2, s.pebble)
        px(x, y, 3, 1, s.pebbleHi)
        px(x + 4, y + 1, 1, 1, SHADE(0.2))
        px(x + 6, y + 3, 4, 1, palette.dirt.rut)
      }
    } else if (feature === 'tuft') {
      // A clump of dry grass.
      const x = 3 + r(8)
      const y = 4 + r(8)
      const dry = s.detail === 'shells' ? palette.grass.base : mix(palette.grass.hi, s.lo, 0.35)
      px(x, y, 1, 3, dry)
      px(x + 2, y - 1, 1, 4, dry)
      px(x + 4, y + 1, 1, 2, dry)
      px(x + 1, y + 1, 1, 2, mix(dry, s.lo, 0.5))
      px(x, y + 3, 5, 1, SHADE(0.18))
    }
    // Wet sand where the water reaches it.
    if (wet[0] === 'w') px(0, 0, 16, 3, s.wet)
    if (wet[2] === 'w') {
      px(0, 13, 16, 3, s.wet)
      px(0, 12, 16, 1, mix(s.base, s.wet, 0.5))
    }
    if (wet[3] === 'w') px(0, 0, 3, 16, s.wet)
    if (wet[1] === 'w') px(13, 0, 3, 16, s.wet)
    grassSpill(px, spill, palette.grass, seed)
    treeShadow(px, shadow)
  }

  return {
    key: `sand:${grain}:${feature}:${feature === 'none' ? 0 : seed}:${wet}:${spill}:${spill === '....' ? 0 : seed}:${shadow}`,
    frames: 1,
    draw,
  }
}

function dirtArt(cell: Cell, palette: GroundPalette): GroundArt {
  const d = palette.dirt
  const h = hash(cell.col, cell.row, 61)
  const grain = h % 4
  const roll = hash(cell.col, cell.row, 62) % 100
  const feature = roll < 25 ? 'stones' : roll < 40 ? 'ruts' : 'none'
  const spill = grassSides(cell)
  const shadow = treeShadowKey(cell)
  const seed = hash(cell.col, cell.row, 63) % 64

  const draw: GroundArt['draw'] = (px) => {
    px(0, 0, 16, 16, d.base)
    const rand = seeded(grain * 59 + 3)
    for (let i = 0; i < 14; i++) px(rand(16), rand(16), 1, 1, i % 3 === 0 ? d.hi : d.lo)
    const r = seeded(seed)
    if (feature === 'stones') {
      for (let i = 0; i < 3; i++) {
        const x = 1 + r(13)
        const y = 1 + r(13)
        px(x, y, 2, 1, d.pebble)
        px(x, y + 1, 2, 1, d.lo)
      }
    } else if (feature === 'ruts') {
      // Tyre tracks, worn down a shade.
      px(0, 4, 16, 2, d.rut)
      px(0, 11, 16, 2, d.rut)
      px(0, 6, 16, 1, d.hi)
      px(0, 13, 16, 1, d.hi)
    }
    grassSpill(px, spill, palette.grass, seed)
    treeShadow(px, shadow)
  }

  return {
    key: `dirt:${grain}:${feature}:${feature === 'none' ? 0 : seed}:${spill}:${spill === '....' ? 0 : seed}:${shadow}`,
    frames: 1,
    draw,
  }
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

/** How long each frame of the water is held. Slower than the bulbs: water does not chase. */
export const WATER_FRAME_MS = 520

/** What each side of a square of water meets: a quay, a beach, a jetty, the bank under trees, a hull, more water. */
function shoreKey(cell: Cell): string {
  const side = (s: number) => {
    const kind = at(cell, s)
    if (kind === 'water') return '.'
    if (kind === 'sand' || kind === 'dirt') return 'b'
    if (kind === 'deck') return 'd'
    if (kind === 'tree' || kind === 'grass') return 't'
    if (kind === 'solid') return 'h'
    return 'q'
  }
  const sides = [N, E, S, W].map(side).join('')
  const corners = [[NE, N, E], [SE, S, E], [SW, S, W], [NW, N, W]]
    .map(([d, a, b]) => (at(cell, d) !== 'water' && at(cell, a) === 'water' && at(cell, b) === 'water' ? side(d) : '.'))
    .join('')
  return sides + corners
}

/** Ripples: [x, y, length]. Each one brightens, stretches and fades over the three frames. */
const RIPPLES: Array<Array<[number, number, number]>> = [
  [[2, 3, 4], [9, 6, 3], [4, 10, 5], [11, 13, 3]],
  [[8, 2, 3], [1, 7, 4], [10, 9, 4], [3, 13, 3]],
  [[5, 4, 5], [12, 7, 3], [1, 11, 3], [8, 14, 4]],
]

function waterArt(cell: Cell, palette: GroundPalette): GroundArt {
  const w = palette.water
  const variant = hash(cell.col, cell.row, 71) % RIPPLES.length
  const phase = hash(cell.col, cell.row, 72) % 3
  const shore = shoreKey(cell)
  const shadow = treeShadowKey(cell)

  const draw: GroundArt['draw'] = (px, frame) => {
    px(0, 0, 16, 16, w.base)
    // Swell: a couple of long, soft darker bands, placed per square so they
    // do not line up into stripes across the whole harbour.
    const swell = mix(w.base, w.deep, 0.55)
    const rows = [[4, 11], [6, 13], [3, 9]][variant]
    px(0, rows[0], 16, 1, swell)
    px(2 + variant * 3, rows[1], 9, 1, swell)
    px(9 - variant * 2, rows[0] + 1, 6, 1, mix(w.base, w.deep, 0.3))
    RIPPLES[variant].forEach(([x, y, len], i) => {
      const step = (frame + phase + i) % 3
      if (step === 0) px(x, y, len, 1, mix(w.base, w.hi, 0.7))
      else if (step === 1) {
        px(x - 1, y, len + 2, 1, w.hi)
        if (i === variant % 4) px(x + Math.floor(len / 2), y, 1, 1, w.glint)
      } else px(x + 1, y, Math.max(1, len - 2), 1, mix(w.base, w.hi, 0.35))
    })

    // Foam comes in short runs that shift along each frame.
    const foam = (i: number) => (Math.floor(i / 2) + frame) % 3 !== 0
    // Each side: a quay's stone lip and the foam at its foot; a beach's
    // shallows; the shadow under a jetty; the shade of a bank under trees.
    const side = (k: number) => shore[k]
    if (side(0) === 'q') {
      px(0, 0, 16, 1, w.lipHi)
      px(0, 1, 16, 1, w.lipTop)
      px(0, 2, 16, 2, w.lipFace)
      for (const x of [5, 13]) px(x, 2, 1, 2, tint(w.lipFace, -0.25))
      px(0, 4, 16, 1, mix(w.base, w.deep, 0.7))
      for (let x = 0; x < 16; x++) if (foam(x)) px(x, 4, 1, 1, w.foam)
    } else if (side(0) === 't') {
      px(0, 0, 16, 2, SHADE(0.38))
      px(0, 2, 16, 1, SHADE(0.18))
    } else if (side(0) === 'b') {
      px(0, 0, 16, 3, w.shallow)
      for (let x = 0; x < 16; x++) if (foam(x + 1)) px(x, 2 + ((x + frame) % 3 === 0 ? 1 : 0), 1, 1, w.foam)
    } else if (side(0) === 'd') {
      px(0, 0, 16, 3, SHADE(0.5))
      px(0, 3, 16, 1, SHADE(0.25))
    } else if (side(0) === 'h') {
      for (let x = 0; x < 16; x++) if (foam(x)) px(x, 0, 1, 1, w.foam)
      px(0, 1, 16, 1, SHADE(0.2))
    }
    if (side(2) === 'q') {
      px(0, 14, 16, 1, mix(w.base, w.deep, 0.6))
      px(0, 15, 16, 1, w.lipTop)
    } else if (side(2) === 'b') {
      px(0, 13, 16, 3, w.shallow)
      for (let x = 0; x < 16; x++) if (foam(x + 2)) px(x, 13 + ((x + frame) % 3 === 0 ? 1 : 0), 1, 1, w.foam)
    } else if (side(2) === 'h') {
      for (let x = 0; x < 16; x++) if (foam(x + 1)) px(x, 15, 1, 1, w.foam)
    }
    if (side(3) === 'q') {
      px(0, 0, 1, 16, w.lipHi)
      px(1, 0, 1, 16, w.lipTop)
      px(2, 0, 1, 16, SHADE(0.3))
    } else if (side(3) === 'b') {
      px(0, 0, 3, 16, w.shallow)
      for (let y = 0; y < 16; y++) if (foam(y)) px(2, y, 1, 1, w.foam)
    } else if (side(3) === 't' || side(3) === 'd') {
      px(0, 0, 2, 16, SHADE(0.35))
      px(2, 0, 1, 16, SHADE(0.15))
    } else if (side(3) === 'h') {
      for (let y = 0; y < 16; y++) if (foam(y)) px(0, y, 1, 1, w.foam)
    }
    if (side(1) === 'q') {
      px(15, 0, 1, 16, w.lipTop)
      px(14, 0, 1, 16, SHADE(0.2))
    } else if (side(1) === 'b') {
      px(13, 0, 3, 16, w.shallow)
      for (let y = 0; y < 16; y++) if (foam(y + 1)) px(13, y, 1, 1, w.foam)
    } else if (side(1) === 'h') {
      for (let y = 0; y < 16; y++) if (foam(y)) px(15, y, 1, 1, w.foam)
    }
    // Inner corners: a nib of the quay where two sides of water turn round it.
    const corner = (i: number, x: number, y: number) => {
      const kind = shore[4 + i]
      if (kind === '.') return
      const color = kind === 'q' ? w.lipTop : kind === 'b' ? w.shallow : SHADE(0.35)
      px(x, y, 2, 2, color)
      if (kind === 'q' && foam(i)) px(x === 0 ? 2 : 13, y === 0 ? 2 : 13, 1, 1, w.foam)
    }
    corner(0, 14, 0)
    corner(1, 14, 14)
    corner(2, 0, 14)
    corner(3, 0, 0)
    treeShadow(px, shadow)
  }

  return {
    key: `water:${variant}:${phase}:${shore}:${shadow}`,
    frames: 3,
    draw,
  }
}

// ---------------------------------------------------------------------------
// Trees: each town's own
// ---------------------------------------------------------------------------

/** Which sides of a tree open onto something that is not more trees (off the map counts as more trees). */
function openKey(cell: Cell): string {
  return [N, E, S, W].map((side) => (at(cell, side) === 'tree' ? '.' : 'o')).join('')
}

/** What a tree stands on: the ground of its first walkable neighbour, else the town's verge. */
function standsOn(cell: Cell, palette: GroundPalette): 'grass' | 'sand' | 'pave' | 'dirt' {
  for (const side of [S, W, E, N]) {
    const kind = at(cell, side)
    if (kind === 'grass' || kind === 'sand' || kind === 'pave' || kind === 'dirt') return kind
    if (kind === 'road') return 'pave'
  }
  return palette.verge
}

function underfoot(px: Px, ground: string, palette: GroundPalette) {
  if (ground === 'grass') grassBase(px, palette.grass, 1)
  else if (ground === 'sand') {
    px(0, 0, 16, 16, palette.sand.base)
    const rand = seeded(77)
    for (let i = 0; i < 10; i++) px(rand(16), rand(16), 1, 1, i % 2 ? palette.sand.lo : palette.sand.hi)
  } else if (ground === 'dirt') px(0, 0, 16, 16, palette.dirt.base)
  else {
    // A planting strip in the paving: soil, with the paving round it.
    px(0, 0, 16, 16, palette.pave.base)
    px(0, 0, 16, 1, palette.pave.hi)
    px(0, 15, 16, 1, palette.pave.seam)
  }
}

/** A leaf clump in a crown: centre and radius, in units, allowed to run off the square. */
type Clump = [number, number, number]

/** Three shapes of broadleaf crown, so a wood is not one tree stamped out. */
const CROWNS: Clump[][] = [
  [[8, 9.6, 5.2], [4.6, 8.2, 3.8], [11.4, 8.4, 3.8], [6.2, 5.4, 4.0], [10.4, 5.2, 3.6]],
  [[8, 9.6, 5.4], [4.2, 7.8, 3.6], [11.8, 8.8, 3.6], [8.2, 5.0, 4.4], [5.2, 6.2, 3.2]],
  [[7.6, 9.2, 5.5], [11.6, 7.2, 3.8], [4.4, 7.6, 3.6], [8.6, 4.8, 4.2]],
]

/**
 * A crown of leaves: round clumps drawn back to front, each lit from the
 * top-left, each front clump throwing a crease of shade on the one behind it,
 * and the outline only round the outside of the whole mass. Where a side of
 * the square is closed — another tree there — the mass runs off the edge with
 * no outline, to meet the crown next door.
 */
function crown(px: Px, clumps: Clump[], t: TreePalette, open: string) {
  const owner = (x: number, y: number) => {
    let found = -1
    clumps.forEach(([cx, cy, r], i) => {
      if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= r * r) found = i
    })
    return found
  }
  const tones = [t.dark, t.base, t.hi, t.top]
  const sideOpen = (dx: number, dy: number) =>
    (dy < 0 && open[0] === 'o') || (dx > 0 && open[1] === 'o') || (dy > 0 && open[2] === 'o') || (dx < 0 && open[3] === 'o')
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = owner(x, y)
      if (i < 0) continue
      const [cx, cy, r] = clumps[i]
      const dx = (x + 0.5 - cx) / r
      const dy = (y + 0.5 - cy) / r
      const light = -(dx * 0.55 + dy * 0.85)
      let tone = light > 0.5 ? 3 : light > 0.12 ? 2 : light > -0.42 ? 1 : 0
      // A clump in front casts a crease of shade down and to the right of it.
      const above = owner(x - 1, y - 1)
      if (above > i) tone = Math.max(0, tone - 1)
      const edge = ([[0, -1], [1, 0], [0, 1], [-1, 0]] as const).some(([ex, ey]) => {
        const nx = x + ex
        const ny = y + ey
        if (nx < 0 || ny < 0 || nx > 15 || ny > 15) return sideOpen(ex, ey)
        return owner(nx, ny) < 0
      })
      px(x, y, 1, 1, edge ? t.line : tones[tone])
    }
  }
}

/** A broadleaf tree: its crown, and its trunk where nothing stands in front of it. */
function roundTree(px: Px, t: TreePalette, open: string, variant: number, droop: boolean) {
  const n = open[0] === 'o'
  const e = open[1] === 'o'
  const s = open[2] === 'o'
  const w = open[3] === 'o'
  // The forest floor in the gaps where crowns meet.
  if (!n) px(0, 0, 16, 4, t.dark)
  if (!s) px(0, 12, 16, 4, t.dark)
  if (!w) px(0, 0, 4, 16, t.dark)
  if (!e) px(12, 0, 4, 16, t.dark)
  if (s) {
    // The crown's shadow on the ground and the trunk under it.
    px(3, 13, 10, 2, SHADE(0.32))
    px(5, 15, 6, 1, SHADE(0.2))
    px(6, 11, 4, 4, t.trunkLo)
    px(6, 11, 2, 4, t.trunk)
    px(5, 14, 1, 1, t.trunkLo)
    px(10, 14, 1, 1, t.trunkLo)
  }
  const drop = s ? 0 : 2
  const clumps: Clump[] = CROWNS[variant % CROWNS.length].map(([x, y, r]) => [x, y + drop, r] as Clump)
  // Clumps reaching across closed sides, to meet the next crown.
  if (!n) clumps.unshift([8, 0.5, 4.6])
  if (!s) clumps.unshift([8, 15.5, 4.8])
  if (!w) clumps.unshift([0.5, 8 + drop / 2, 4.4])
  if (!e) clumps.unshift([15.5, 8 + drop / 2, 4.4])
  crown(px, clumps, t, open)
  if (droop) {
    // Willow: a few long fronds trailing from the lower edge of the crown.
    const bottom = s ? 12 : 16
    for (const [x, len] of [[3, 4], [6, 2], [9, 5], [12, 3]] as const) {
      const fx = (x + variant) % 15
      px(fx, bottom - len - 2, 1, len, t.top)
      px(fx, bottom - 2, 1, 1, t.hi)
      px(fx + 1, bottom - len - 1, 1, len - 1, t.dark)
    }
  }
}

function pineTree(px: Px, t: TreePalette, open: string, variant: number) {
  const s = open[2] === 'o'
  if (open !== '....') px(0, 0, 16, 16, t.dark)
  if (open === '....') {
    px(0, 0, 16, 16, t.dark)
  }
  const tiers = s ? [[1, 5, 4], [4, 9, 6], [7, 12, 7]] : [[1, 5, 4], [4, 9, 6], [8, 14, 7]]
  const cx = 8 + (variant % 2 === 0 ? 0 : -1)
  for (const [y0, y1, half] of tiers) {
    for (let y = y0; y < y1; y++) {
      const width = Math.round(((y - y0 + 1) / (y1 - y0)) * half)
      px(cx - width - 1, y, width * 2 + 2, 1, t.line)
      px(cx - width, y, width * 2, 1, t.base)
      px(cx - width, y, Math.max(1, width), 1, t.hi)
      if (width > 2) px(cx - width + 1, y, 1, 1, t.top)
    }
    px(cx - half, y1 - 1, half * 2, 1, t.dark)
  }
  px(cx - 1, 0, 2, 1, t.line)
  if (s) {
    px(cx - 4, 14, 9, 2, SHADE(0.3))
    px(cx - 1, 12, 2, 4, t.trunk)
    px(cx, 12, 1, 4, t.trunkLo)
  }
}

function palmTree(px: Px, t: TreePalette, open: string, variant: number, planter: boolean) {
  const s = open[2] === 'o'
  if (planter) {
    // A chrome-rimmed planter, uplit.
    px(2, 11, 12, 5, t.stoneLo)
    px(2, 11, 12, 1, t.stoneHi)
    px(3, 12, 10, 3, t.stone)
    px(3, 15, 10, 1, SHADE(0.4))
    px(4, 12, 8, 1, t.dark)
  } else {
    // Undergrowth round the foot of the palm, so a line of them reads as a thicket.
    px(0, 10, 16, 6, t.dark)
    for (const [x, y, w] of [[0, 10, 5], [4, 11, 6], [10, 10, 6], [1, 13, 4], [8, 13, 5]]) {
      px(x, y, w, 2, t.base)
      px(x + 1, y, w - 2, 1, t.hi)
    }
    if (!s) px(0, 14, 16, 2, t.dark)
  }
  // The trunk, ringed, leaning a little.
  const lean = variant % 2 === 0 ? 1 : -1
  for (let y = 4; y < (planter ? 12 : 12); y++) {
    const x = 7 + (y < 8 ? lean : 0)
    px(x, y, 2, 1, (y % 2 === 0) ? t.trunk : t.trunkLo)
    px(x, y, 1, 1, tint(t.trunk, 0.15))
  }
  // Fronds: arching out from the crown, darker on their undersides.
  const cx = 7 + lean
  const fronds: Array<Array<[number, number]>> = [
    [[-1, 0], [-2, 0], [-3, 1], [-4, 1], [-5, 2], [-6, 3]],
    [[1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [6, 3], [6, 4]],
    [[-1, -1], [-2, -2], [-3, -2], [-4, -2], [-5, -1]],
    [[1, -1], [2, -2], [3, -2], [4, -2], [5, -1]],
    [[0, -1], [0, -2], [-1, -3], [0, -3]],
    [[-1, 1], [-2, 2], [-3, 3], [-3, 4]],
    [[2, 1], [3, 2], [4, 3], [4, 4]],
  ]
  for (const frond of fronds) {
    frond.forEach(([dx, dy], i) => {
      px(cx + dx, 4 + dy, 1, 1, i < 2 ? t.top : t.hi)
      px(cx + dx, 5 + dy, 1, 1, t.base)
    })
  }
  px(cx, 4, 2, 2, t.trunkLo)
  // Coconuts.
  px(cx - 1, 5, 1, 1, '#6a4a2a')
  px(cx + 2, 5, 1, 1, '#6a4a2a')
}

/** Sea grape and hibiscus: a big glossy bush, flowering, between the palms. */
function tropicalBush(px: Px, t: TreePalette, open: string) {
  const s = open[2] === 'o'
  if (s) px(2, 13, 12, 3, SHADE(0.28))
  const clumps: Clump[] = s
    ? [[8, 9.5, 5.4], [4.2, 8.5, 3.8], [11.8, 8.5, 3.8], [6, 5.5, 3.8], [10.5, 5.5, 3.6]]
    : [[8, 11, 5.6], [4, 9.5, 4], [12, 9.5, 4], [6, 6.5, 4], [10.5, 6.5, 3.8]]
  if (open[0] !== 'o') clumps.unshift([8, 0.5, 4.6])
  if (open[1] !== 'o') clumps.unshift([15.5, 9, 4.4])
  if (open[3] !== 'o') clumps.unshift([0.5, 9, 4.4])
  if (!s) clumps.unshift([8, 15.5, 4.8])
  crown(px, clumps, t, open)
  for (const [x, y] of [[5, 6], [11, 8], [7, 10]]) {
    px(x, y, 2, 1, '#f0506a')
    px(x, y + 1, 1, 1, '#c8304a')
    px(x + 1, y - 1, 1, 1, '#ffd84a')
  }
}

function cypressTree(px: Px, t: TreePalette, variant: number) {
  // A marble planter, then the cypress: a narrow flame of dark green.
  px(3, 12, 10, 4, t.stoneLo)
  px(3, 12, 10, 1, t.stoneHi)
  px(4, 13, 8, 2, t.stone)
  px(3, 15, 10, 1, SHADE(0.35))
  const widths = [1, 2, 3, 3, 4, 4, 4, 5, 5, 5, 4, 4, 3]
  const cx = 8
  widths.forEach((half, y) => {
    const width = variant % 2 === 0 ? half : Math.max(1, half - (y > 8 ? 1 : 0))
    px(cx - width - 1, y, width * 2 + 2, 1, t.line)
    px(cx - width, y, width * 2, 1, t.base)
    px(cx - width, y, Math.ceil(width / 2), 1, t.hi)
    if (y % 3 === 1) px(cx + width - 2, y, 2, 1, t.dark)
    if (y % 4 === 2) px(cx - width + 1, y, 1, 1, t.top)
  })
}

function desertPlant(px: Px, t: TreePalette, open: string, variant: number) {
  const s = open[2] === 'o'
  if (variant === 0) {
    // A saguaro: ribbed, two arms.
    const green = '#4a7a3a'
    const lit = '#6a9a4a'
    const dark = '#2e5226'
    px(6, 1, 4, 15, dark)
    px(7, 1, 2, 14, green)
    px(7, 1, 1, 14, lit)
    px(6, 0, 4, 1, dark)
    // Arms.
    px(2, 6, 4, 2, dark)
    px(2, 3, 2, 4, dark)
    px(3, 3, 1, 4, lit)
    px(3, 7, 3, 1, green)
    px(11, 8, 3, 2, dark)
    px(12, 4, 2, 5, dark)
    px(12, 4, 1, 5, lit)
    px(10, 9, 3, 1, green)
    for (const y of [3, 6, 9, 12]) px(8, y, 1, 1, '#f0e8c0')
    if (s) px(6, 15, 7, 1, SHADE(0.3))
  } else if (variant === 1) {
    // Juniper scrub: a scraggly olive mound.
    px(1, 6, 14, 9, t.line)
    px(2, 5, 12, 9, t.dark)
    px(3, 4, 10, 2, t.dark)
    for (const [x, y, w] of [[3, 5, 4], [8, 5, 4], [2, 8, 5], [9, 8, 4], [5, 10, 6]]) {
      px(x, y, w, 2, t.base)
      px(x, y, w - 1, 1, t.hi)
    }
    px(5, 6, 1, 1, t.top)
    px(10, 9, 1, 1, '#7a9ac8')
    px(4, 11, 1, 1, '#7a9ac8')
    px(2, 15, 13, 1, SHADE(0.3))
  } else if (variant === 2) {
    // Red rock: two sandstone boulders.
    px(1, 7, 10, 8, t.stoneLo)
    px(2, 6, 8, 8, t.stone)
    px(2, 6, 6, 2, t.stoneHi)
    px(2, 6, 2, 5, t.stoneHi)
    px(4, 10, 5, 1, t.stoneLo)
    px(8, 10, 7, 6, t.stoneLo)
    px(9, 9, 5, 6, t.stone)
    px(9, 9, 4, 1, t.stoneHi)
    px(1, 15, 15, 1, SHADE(0.32))
  } else {
    // Prickly pear and a tumble of small rocks.
    for (const [x, y] of [[3, 5], [7, 3], [9, 7], [4, 9]]) {
      px(x, y, 4, 5, '#2e5226')
      px(x + 1, y, 2, 5, '#5a8a40')
      px(x + 1, y + 1, 1, 2, '#7aaa52')
      px(x + 3, y + 1, 1, 1, '#e86a8a')
    }
    px(10, 12, 4, 3, t.stoneLo)
    px(10, 12, 3, 2, t.stone)
    px(10, 12, 2, 1, t.stoneHi)
    px(2, 14, 12, 2, SHADE(0.25))
  }
}

function treeArt(cell: Cell, palette: GroundPalette): GroundArt {
  const t = palette.tree
  const open = openKey(cell)
  const ground = standsOn(cell, palette)
  const variant = hash(cell.col, cell.row, 81) % (t.style === 'desert' ? 4 : t.style === 'round' || t.style === 'willow' ? 3 : 2)
  return {
    key: `tree:${t.style}:${open}:${ground}:${variant}`,
    frames: 1,
    draw: (px) => {
      underfoot(px, ground, palette)
      if (t.style === 'round') roundTree(px, t, open, variant, false)
      else if (t.style === 'willow') roundTree(px, t, open, variant, true)
      else if (t.style === 'pine') pineTree(px, t, open, variant)
      else if (t.style === 'palm' && variant === 1) tropicalBush(px, t, open)
      else if (t.style === 'palm') palmTree(px, t, open, variant, false)
      else if (t.style === 'palm-planter') palmTree(px, t, open, variant, true)
      else if (t.style === 'cypress') cypressTree(px, t, variant)
      else desertPlant(px, t, open, variant)
    },
  }
}

// ---------------------------------------------------------------------------
// The one entry point
// ---------------------------------------------------------------------------

/** The picture for an outdoor square, or null for anything drawn as an interior or covered by a building. */
export function groundArt(cell: Cell, themeId: string): GroundArt | null {
  const palette = groundPalette(themeId)
  switch (classOf(cell.tile)) {
    case 'pave':
      return cell.tile === PLAZA ? plazaArt(cell, palette) : pavementArt(cell, palette)
    case 'road':
      return roadArt(cell, palette)
    case 'grass':
      return grassArt(cell, palette)
    case 'sand':
      return sandArt(cell, palette)
    case 'dirt':
      return dirtArt(cell, palette)
    case 'water':
      return waterArt(cell, palette)
    case 'tree':
      return treeArt(cell, palette)
    default:
      return null
  }
}

/** Every key the ground is drawn under, prefixed with the town, so two towns never share a texture. */
export function groundKey(art: GroundArt, themeId: string): string {
  return `${GROUND_PALETTES[themeId] ? themeId : 'default'}|${art.key}`
}
