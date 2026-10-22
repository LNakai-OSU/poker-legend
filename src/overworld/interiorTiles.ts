import {
  CARPET, CARPET_GREEN, CARPET_NAVY, CARPET_NEON, CARPET_ROYAL, CARPET_TEAL, CARPET_VIOLET, CHECKER, DECK, DINER_LINO, DOOR,
  LINO, MARBLE, PANEL_WOOD, PAPER_DAMASK, PAPER_STRIPE, PARQUET, SALTILLO, SEAGRASS, SHAG, SHOWROOM, SLATE, TILE_FLOOR, VINYL,
  WALL_BAIZE, WALL_BAMBOO, WALL_CABIN, WALL_MARBLE, WALL_NEON, WALL_PAINT, WALL_TILED, WALL_TOP, WOOD_FLOOR,
} from './tiles'
import { mix, speck, type Px } from './pixelArt'

/**
 * The inside of buildings.
 *
 * Every room in the game used to be exterior brick round a speckled blue floor,
 * so a laundromat, a riverboat and a marble casino were the same dark box with
 * different crates in it. A GBA room is a back wall two tiles tall — the top of
 * the wall seen from above, then the face of it with a cornice and a skirting
 * board — over a floor that says where you are: planks, chequerboard, marble,
 * carpet.
 *
 * Tiles here can come in variants. A carpet whose motif sits in the middle of
 * every tile draws the tile grid on the floor for you, so carpets are drawn as
 * one 32x32 motif split across a 2x2 block of tiles, and the renderer picks the
 * quarter from where the tile is.
 */

type Draw = (px: Px) => void

/** A tile that comes in several pictures, and how to pick one for a position. */
export interface TileVariants {
  draws: Draw[]
  pick: (col: number, row: number) => number
}

const quarter = (col: number, row: number) => (col & 1) + 2 * (row & 1)
/** One of n variants for a square, scattered by position with no pattern to it. */
const scatter = (col: number, row: number, n: number) => {
  let h = (Math.imul(col, 374761393) + Math.imul(row, 668265263)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) % n
}
const byColumn = (col: number) => col & 1
const chequer = (col: number, row: number) => (col + row) & 1

/** Draws a 32x32 motif, given colour-per-pixel, as four 16x16 quarters. */
function motif(colorAt: (x: number, y: number) => string): Draw[] {
  return [0, 1, 2, 3].map((q) => (px: Px) => {
    const ox = (q & 1) * 16
    const oy = (q >> 1) * 16
    for (let y = 0; y < 16; y++) {
      // Runs of one colour as one rectangle, which keeps the canvas calls down.
      let runStart = 0
      let runColor = colorAt(ox, oy + y)
      for (let x = 1; x <= 16; x++) {
        const color = x < 16 ? colorAt(ox + x, oy + y) : ''
        if (color !== runColor) {
          px(runStart, y, x - runStart, 1, runColor)
          runStart = x
          runColor = color
        }
      }
    }
  })
}

/** Distance in a 32-wide wrapping motif, so patterns join up across blocks. */
const wrap = (d: number) => Math.min(Math.abs(d), 32 - Math.abs(d))

// ---------------------------------------------------------------------------
// The wall: its top, and the doorway through it
// ---------------------------------------------------------------------------

export const WALL_TOP_COLORS = { base: '#2a2333', hi: '#332b3e', lo: '#211b29', lip: '#57496a', lipInner: '#3d3349' }

const wallTop: Draw = (px) => {
  px(0, 0, 16, 16, WALL_TOP_COLORS.base)
  // A faint grain, so a long band of it is not a dead flat colour.
  for (const [x, y] of [[3, 3], [11, 6], [6, 11], [13, 13], [1, 8]]) px(x, y, 2, 1, WALL_TOP_COLORS.hi)
  for (const [x, y] of [[8, 2], [2, 13], [12, 9]]) px(x, y, 2, 1, WALL_TOP_COLORS.lo)
}

/**
 * The way out of a room, seen from inside: a gap in the bottom wall with a mat
 * in it and daylight past the mat. Every door on a street is drawn by the
 * building it belongs to, so this tile only ever reads as the inside of one.
 */
const doorway: Draw = (px) => {
  px(0, 0, 16, 16, WALL_TOP_COLORS.base)
  // Jambs, seen from above.
  px(2, 0, 2, 16, '#6a4a30')
  px(12, 0, 2, 16, '#6a4a30')
  px(2, 0, 1, 16, '#86603e')
  px(13, 0, 1, 16, '#4a3020')
  // Daylight through the opening, brightest furthest out.
  px(4, 0, 8, 16, '#c8b88e')
  px(4, 10, 8, 6, '#e0d2a6')
  px(4, 13, 8, 3, '#f2e8c4')
  // The mat, with a fringe at each end.
  px(4, 1, 8, 10, '#7e3428')
  px(5, 2, 6, 8, '#9a4434')
  px(6, 4, 4, 4, '#7e3428')
  for (let x = 4; x < 12; x += 2) {
    px(x, 0, 1, 1, '#c8a878')
    px(x, 11, 1, 1, '#c8a878')
  }
}

// ---------------------------------------------------------------------------
// Back-wall faces
//
// Each is a cornice along the top (a dark line, then the light lip of the
// moulding), the material, and a skirting board along the bottom. The floor in
// front of it gets a contact shadow from the renderer.
// ---------------------------------------------------------------------------

function cornice(px: Px, line: string, lip: string, under: string) {
  px(0, 0, 16, 1, line)
  px(0, 1, 16, 1, lip)
  px(0, 2, 16, 1, under)
}

function skirting(px: Px, top: string, base: string, bottom: string, from = 12) {
  px(0, from, 16, 1, top)
  px(0, from + 1, 16, 15 - from - 1, base)
  px(0, 15, 16, 1, bottom)
}

/** Faded stripes: the flat above the bakery, and anywhere else nobody has redecorated. */
const paperStripe: Draw = (px) => {
  px(0, 0, 16, 16, '#d6cba0')
  for (const x of [1, 9]) {
    px(x, 2, 2, 10, '#bfb488')
    px(x + 2, 2, 1, 10, '#cdc297')
  }
  // Little sprigs between the stripes, alternating height.
  for (const [x, y] of [[5, 4], [13, 8]]) {
    px(x, y, 1, 2, '#8f9a62')
    px(x - 1, y + 1, 1, 1, '#a8b07a')
    px(x + 1, y, 1, 1, '#c07a6a')
  }
  // A water stain, because it is that kind of flat.
  px(10, 3, 3, 1, '#cbbf92')
  cornice(px, '#4a3a2a', '#e8dfbc', '#c4b88c')
  skirting(px, '#b07e50', '#8a5e38', '#3e2818')
}

/** Saloon panelling: the reservation casino and the river outfitters. */
const panelWood: Draw = (px) => {
  px(0, 0, 16, 16, '#96643a')
  for (let x = 0; x < 16; x += 4) {
    px(x, 0, 1, 16, '#4e2e18')
    px(x + 1, 0, 1, 16, '#b07a48')
  }
  // Grain.
  for (const [x, y, h] of [[2, 4, 3], [7, 6, 2], [11, 3, 4], [14, 8, 2], [6, 10, 2]]) px(x, y, 1, h, '#845630')
  cornice(px, '#3a2414', '#c89058', '#6e4628')
  // A dado rail and the skirting under it.
  px(0, 9, 16, 1, '#c89058')
  px(0, 10, 16, 1, '#5e3a20')
  skirting(px, '#b07a48', '#6e4628', '#2e1a0c', 13)
}

/** Damask: the supper club and the members' room. */
const paperDamask: Draw = (px) => {
  px(0, 0, 16, 16, '#6a1e2c')
  // A diamond in the middle of the tile and quarters of one at the corners, so
  // the pattern runs on across a wall without a seam.
  const motifRows = [[0, 1], [1, 3], [2, 5], [3, 3], [4, 1]] as const
  for (const [dy, w] of motifRows) {
    px(8 - Math.floor(w / 2), 3 + dy, w, 1, '#86303e')
  }
  px(7, 5, 2, 1, '#c9a050')
  for (const [cx, cy] of [[0, 3], [16, 3], [0, 9], [16, 9]]) {
    px(cx - 1, cy, 2, 1, '#86303e')
  }
  px(3, 8, 1, 1, '#a8803e')
  px(12, 8, 1, 1, '#a8803e')
  cornice(px, '#2a0c14', '#d8b060', '#8a6a2a')
  // Gold rail over a dark wainscot.
  px(0, 10, 16, 1, '#c9a050')
  px(0, 11, 16, 4, '#4a2a1c')
  px(0, 11, 16, 1, '#5e3826')
  px(3, 12, 1, 2, '#3a2016')
  px(11, 12, 1, 2, '#3a2016')
  px(0, 15, 16, 1, '#200a08')
}

/** White subway tile with a blue band: the diner and the launderette. */
const wallTiled: Draw = (px) => {
  px(0, 0, 16, 16, '#e6ebe7')
  for (let row = 0; row < 3; row++) {
    const y = 3 + row * 3
    px(0, y + 2, 16, 1, '#b9c3bf')
    const offset = row % 2 === 0 ? 0 : 4
    for (let x = offset; x < 16; x += 8) px(x, y, 1, 2, '#b9c3bf')
    for (let x = offset + 1; x < 16; x += 8) px(x, y, 3, 1, '#f6f8f6')
  }
  // The coloured band, a row of darker tiles.
  px(0, 9, 16, 2, '#3f8fb0')
  px(0, 9, 16, 1, '#5aa8c8')
  px(7, 9, 1, 2, '#2f6f8a')
  px(15, 9, 1, 2, '#2f6f8a')
  cornice(px, '#5a6a6a', '#f4f6f4', '#cfd8d4')
  px(0, 11, 16, 1, '#b9c3bf')
  skirting(px, '#8aa0a8', '#5e7480', '#2a343c', 12)
}

/** Bamboo poles over woven rattan: the island. */
const wallBamboo: Draw = (px) => {
  px(0, 0, 16, 16, '#b89c58')
  for (let i = 0; i < 4; i++) {
    const x = i * 4
    px(x, 0, 1, 16, '#6a5428')
    px(x + 1, 0, 1, 16, '#dcc47c')
    px(x + 2, 0, 1, 16, '#c4a862')
    px(x + 3, 0, 1, 16, '#a28a48')
    // Each pole's joints at its own height.
    const node = 3 + ((i * 5) % 7)
    px(x + 1, node, 3, 1, '#8a7234')
    px(x + 1, node + 1, 3, 1, '#e6d08c')
  }
  cornice(px, '#4a3a1a', '#d4b46a', '#7a6230')
  // Woven skirting.
  px(0, 12, 16, 4, '#8a6c34')
  for (let x = 0; x < 16; x += 2) {
    px(x, 12 + (x % 4 === 0 ? 0 : 1), 1, 2, '#b08c4a')
    px(x + 1, 13 + (x % 4 === 0 ? 1 : 0), 1, 2, '#6a5226')
  }
  px(0, 15, 16, 1, '#3a2c10')
}

/** Black panels with neon tubes running the length of the room: the Strip. */
const wallNeon = (pink: boolean): Draw => (px) => {
  px(0, 0, 16, 16, '#150e20')
  px(7, 0, 1, 16, '#1d1530')
  px(15, 0, 1, 16, '#1d1530')
  const tube = (y: number, core: string, glow: string, halo: string) => {
    px(0, y - 2, 16, 1, halo)
    px(0, y - 1, 16, 1, glow)
    px(0, y, 16, 1, core)
    px(0, y + 1, 16, 1, glow)
    px(0, y + 2, 16, 1, halo)
  }
  const magenta: [string, string, string] = ['#ffd2f6', '#e04cc4', '#3e1a44']
  const cyan: [string, string, string] = ['#d2fbff', '#2fb8d8', '#14304a']
  const [a, b] = pink ? [magenta, cyan] : [cyan, magenta]
  tube(5, a[0], a[1], a[2])
  tube(10, b[0], b[1], b[2])
  // The tube clips, every other tile.
  px(3, 4, 1, 3, '#9aa0b0')
  px(11, 9, 1, 3, '#9aa0b0')
  cornice(px, '#000000', '#3a3050', '#0e0a16')
  px(0, 13, 16, 1, '#b8bec8')
  px(0, 14, 16, 1, '#6a7080')
  px(0, 15, 16, 1, '#20202a')
}

/** White marble with a gold dado: Porto Lumina, where everything is like this. */
const wallMarble: Draw = (px) => {
  px(0, 0, 16, 16, '#ebe3d4')
  // Veins, wandering diagonally.
  for (const [x, y] of [[1, 3], [2, 4], [3, 4], [4, 5], [9, 3], [10, 4], [12, 6], [13, 7], [6, 7], [7, 8]]) {
    px(x, y, 1, 1, '#cfc3b0')
  }
  px(8, 2, 1, 7, '#ddd2c0')
  cornice(px, '#8a7a5a', '#fbf6ea', '#d6ccb8')
  // Gold rail, then a darker panel of veined stone.
  px(0, 9, 16, 1, '#f0cf6a')
  px(0, 10, 16, 1, '#a8842c')
  px(0, 11, 16, 3, '#bdb09a')
  px(2, 12, 3, 1, '#a89a82')
  px(10, 11, 4, 1, '#a89a82')
  px(0, 14, 16, 1, '#6e624e')
  px(0, 15, 16, 1, '#3a3226')
}

/** Varnished planking with a brass rail: the riverboat's saloon. */
const wallCabin: Draw = (px) => {
  px(0, 0, 16, 16, '#8a4c26')
  for (let y = 3; y < 15; y += 3) {
    px(0, y, 16, 1, '#a46032')
    px(0, y + 2, 16, 1, '#5a3016')
  }
  px(5, 3, 1, 2, '#5a3016')
  px(12, 6, 1, 2, '#5a3016')
  px(2, 12, 1, 2, '#5a3016')
  cornice(px, '#2a160a', '#c07a44', '#5a3016')
  // Brass rail on its stanchions.
  px(0, 8, 16, 1, '#f0c860')
  px(0, 9, 16, 1, '#a07820')
  px(4, 10, 1, 2, '#a07820')
  px(12, 10, 1, 2, '#a07820')
  px(0, 15, 16, 1, '#20100a')
}

/** Green baize above mahogany: the card room. */
const wallBaize: Draw = (px) => {
  px(0, 0, 16, 7, '#1e4a36')
  for (let x = 1; x < 16; x += 4) px(x, 3, 1, 4, '#235440')
  cornice(px, '#0a1a12', '#c8a048', '#163a2a')
  // Brass picture rail, then the wainscot with a raised panel in it.
  px(0, 7, 16, 1, '#e0bc5c')
  px(0, 8, 16, 1, '#7a5a1e')
  px(0, 9, 16, 7, '#4a2618')
  px(2, 10, 12, 4, '#5a3020')
  px(2, 10, 12, 1, '#6e3e28')
  px(2, 13, 12, 1, '#341a10')
  px(13, 10, 1, 4, '#341a10')
  px(0, 15, 16, 1, '#1a0c06')
}

/** Plain paint with a chair rail: a shop that wants you to look at the stock. */
const wallPaint: Draw = (px) => {
  px(0, 0, 16, 16, '#c4ccd0')
  px(0, 3, 16, 1, '#b6bec4')
  cornice(px, '#4a5058', '#eef2f4', '#aab4ba')
  px(0, 8, 16, 1, '#f4f6f8')
  px(0, 9, 16, 1, '#8c969e')
  px(0, 10, 16, 3, '#a8b4bc')
  skirting(px, '#f4f6f8', '#d8dee2', '#5a646c', 13)
}

// ---------------------------------------------------------------------------
// Floors
// ---------------------------------------------------------------------------

/** Planks, four to a tile, the joints staggered so the tile grid does not show. */
const woodFloor = (shift: number): Draw => (px) => {
  const tones = ['#b98450', '#ad7a48', '#b47f4c', '#a87444']
  const joints = [5, 12, 2, 9]
  for (let plank = 0; plank < 4; plank++) {
    const y = plank * 4
    px(0, y, 16, 3, tones[(plank + shift) % 4])
    px(0, y, 16, 1, '#c8955e')
    px(0, y + 3, 16, 1, '#6e4626')
    const joint = (joints[plank] + shift * 8) % 16
    px(joint, y, 1, 3, '#7a4e2c')
    // A little grain in each board.
    const grain = (joint + 6) % 16
    px(grain, y + 1, 3, 1, '#9a6a3e')
  }
}

/** Black and white chequerboard: a diner, the way diners are. */
const checker: Draw = (px) => {
  for (const [x, y, dark] of [[0, 0, true], [8, 0, false], [0, 8, false], [8, 8, true]] as const) {
    if (dark) {
      px(x, y, 8, 8, '#272733')
      px(x, y, 8, 1, '#33333f')
    } else {
      px(x, y, 8, 8, '#e9e3d2')
      px(x, y, 8, 1, '#fbf7ec')
      px(x, y, 1, 8, '#fbf7ec')
      px(x + 7, y + 1, 1, 7, '#d4ccb8')
      px(x + 1, y + 7, 7, 1, '#d4ccb8')
    }
  }
  px(10, 2, 2, 1, '#ffffff')
  px(2, 10, 2, 1, '#ffffff')
}

/** Small square tiles, grouted: the launderette and the corner shop. A few worn darker, never the same few. */
const TILE_WEAR: Array<Array<[number, number]>> = [
  [[4, 0], [8, 8], [0, 12], [12, 4]],
  [[0, 4], [12, 12], [8, 0]],
  [[4, 8], [12, 0], [0, 0], [8, 12]],
]
const tileFloor = (variant: number): Draw => (px) => {
  px(0, 0, 16, 16, '#d3dcdd')
  for (let i = 0; i < 16; i += 4) {
    px(i + 3, 0, 1, 16, '#a9b6b8')
    px(0, i + 3, 16, 1, '#a9b6b8')
  }
  for (const [x, y] of TILE_WEAR[variant]) px(x, y, 3, 3, '#c8d2d3')
  for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y += 4) px(x, y, 1, 1, '#e8eeee')
}

/** Marble slabs, light and dark in a chequer, with veins: Porto Lumina. */
const marble = (dark: boolean, flip = false): Draw => (px) => {
  const [base, vein, hi] = dark ? ['#aaa49b', '#8f897f', '#bcb6ad'] : ['#efe9df', '#d2c8b8', '#fbf8f2']
  px(0, 0, 16, 16, base)
  // The vein runs one way across this slab and the other way across the next.
  const at = (x: number) => (flip ? 15 - x : x)
  for (const [x, y, w] of [[2, 3, 2], [4, 4, 2], [6, 5, 1], [7, 6, 2], [9, 7, 1], [10, 8, 2], [12, 10, 1], [13, 11, 2]]) {
    px(flip ? at(x) - w + 1 : x, y, w, 1, vein)
  }
  for (const [x, y] of [[11, 2], [12, 3], [3, 11], [4, 12], [5, 12]]) px(at(x), y, 1, 1, vein)
  px(1, 1, 3, 1, hi)
  px(1, 2, 1, 2, hi)
  px(0, 0, 16, 1, '#c4baa8')
  px(0, 0, 1, 16, '#c4baa8')
}

/** Deck boards with black caulking between them: the riverboat. */
const deck = (shift: number): Draw => (px) => {
  for (let board = 0; board < 4; board++) {
    const y = board * 4
    px(0, y, 16, 3, board % 2 === 0 ? '#93653a' : '#8a5d34')
    px(0, y, 16, 1, '#a8774a')
    px(0, y + 3, 16, 1, '#2e1e10')
    const butt = (board * 7 + shift * 8) % 16
    px(butt, y, 1, 3, '#2e1e10')
    // Nail heads either side of the butt joint.
    px((butt + 15) % 16, y + 1, 1, 1, '#d8b080')
    px((butt + 1) % 16, y + 1, 1, 1, '#d8b080')
  }
}

/**
 * Speckled vinyl: the floor of a shop that sells things off shelves. Four
 * speckles, so the floor does not show the same square over and over, and the
 * odd scuff where the trolleys turn.
 */
const lino = (variant: number): Draw => (px) => {
  px(0, 0, 16, 16, '#d8d1c2')
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (speck(x, y, 7 + variant * 5, 11)) px(x, y, 1, 1, '#c3bba9')
      else if (speck(x, y, 3 + variant * 3, 17)) px(x, y, 1, 1, '#e9e3d6')
    }
  }
  if (variant === 3) {
    px(4, 9, 6, 1, '#b8b09e')
    px(9, 10, 3, 1, '#b8b09e')
  }
  px(0, 0, 16, 1, '#cec6b5')
  px(0, 0, 1, 16, '#cec6b5')
}

/**
 * Seagrass matting, woven in a basket weave: the Cay Boutique, where the floor
 * should feel like a beach house rather than a shop.
 */
const seagrass: Draw = (px) => {
  for (let by = 0; by < 16; by += 4) {
    for (let bx = 0; bx < 16; bx += 4) {
      const across = ((bx + by) / 4) % 2 === 0
      for (let i = 0; i < 4; i += 2) {
        if (across) {
          px(bx, by + i, 4, 1, '#e4d3aa')
          px(bx, by + i + 1, 4, 1, '#cdb688')
        } else {
          px(bx + i, by, 1, 4, '#e4d3aa')
          px(bx + i + 1, by, 1, 4, '#cdb688')
        }
      }
      // Where one block of strands tucks under the next.
      px(bx + 3, by + 3, 1, 1, '#b09868')
    }
  }
}

/**
 * Slate flags in blue-grey, laid in two patterns: an outfitters' floor that
 * wet boots and dripping waders have walked across for forty years.
 */
const SLATE_STONES: Array<Array<[number, number, number, number]>> = [
  [[0, 0, 9, 7], [9, 0, 7, 5], [9, 5, 7, 11], [0, 7, 4, 9], [4, 7, 5, 9]],
  [[0, 0, 6, 10], [6, 0, 10, 6], [6, 6, 6, 10], [12, 6, 4, 10], [0, 10, 6, 6]],
  [[0, 0, 16, 6], [0, 6, 7, 10], [7, 6, 9, 5], [7, 11, 9, 5]],
]
const SLATE_TONES = ['#8a929a', '#7e8890', '#949ca2', '#868e96', '#8a948e']
const slate = (variant: number): Draw => (px) => {
  px(0, 0, 16, 16, '#5a5e66')
  SLATE_STONES[variant].forEach(([x, y, w, h], i) => {
    const tone = SLATE_TONES[(i + variant * 2) % SLATE_TONES.length]
    px(x, y, w - 1, h - 1, tone)
    px(x, y, w - 1, 1, mix(tone, '#ffffff', 0.18))
    px(x, y + h - 2, w - 1, 1, mix(tone, '#000000', 0.15))
    // A chip off one corner, a darker patch where water stood.
    if (w > 5 && h > 5) px(x + 2, y + h - 4, 2, 1, mix(tone, '#000000', 0.1))
  })
}

/**
 * A showroom's polished concrete: pale, in big slabs, with the windows
 * reflected in it — Marina Motors, where the boat on its trailer is the thing
 * to look at.
 */
const showroom = (variant: number): Draw => (px) => {
  px(0, 0, 16, 16, '#c9cfd4')
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (speck(x, y, 11 + variant, 23)) px(x, y, 1, 1, '#bcc3c9')
      else if (speck(x, y, 5 + variant, 41)) px(x, y, 1, 1, '#d8dde1')
    }
  }
  if (variant === 1) {
    // The sea window, reflected, lying across the floor.
    for (let i = 0; i < 9; i++) px(3 + i, 12 - i, 3, 1, 'rgba(232, 244, 252, 0.7)')
  }
  // Sawn joints at the edge of every slab.
  px(0, 0, 16, 1, '#a9b0b6')
  px(0, 0, 1, 16, '#a9b0b6')
  px(0, 1, 16, 1, '#dde2e6')
}

/**
 * Saltillo: hand-made terracotta squares, no two quite the same colour, and a
 * painted tile set in now and then — the trading post at Silver Creek.
 */
const SALTILLO_TONES = ['#c8743e', '#bc6a36', '#d2824c', '#b8623a']
const saltillo = (variant: number): Draw => (px) => {
  px(0, 0, 16, 16, '#9a6644')
  for (const [x, y, i] of [[0, 0, 0], [8, 0, 1], [0, 8, 2], [8, 8, 3]] as const) {
    const tone = SALTILLO_TONES[(i + variant) % 4]
    px(x, y, 7, 7, tone)
    px(x, y, 7, 1, mix(tone, '#ffe8c8', 0.25))
    px(x, y, 1, 7, mix(tone, '#ffe8c8', 0.15))
    px(x + 1, y + 6, 6, 1, mix(tone, '#3a1a08', 0.15))
    if (speck(x, y, 9 + variant, 3)) px(x + 3, y + 2, 2, 1, mix(tone, '#3a1a08', 0.1))
  }
  if (variant === 2) {
    // A talavera tile: blue and white, in one corner of the square.
    px(8, 8, 7, 7, '#f4eee0')
    px(11, 9, 1, 5, '#2a5aa8')
    px(9, 11, 5, 1, '#2a5aa8')
    px(10, 10, 3, 3, '#3a7ac8')
    px(11, 11, 1, 1, '#f2c84a')
  }
}

/**
 * Vinyl composition tiles, cream and sage in a chequer, the shine worn off
 * where the queue for the till stands: Patel's corner shop.
 */
const vinyl = (variant: number): Draw => (px) => {
  for (const [x, y, sage] of [[0, 0, true], [8, 0, false], [0, 8, false], [8, 8, true]] as const) {
    const base = sage ? '#9fb89a' : '#e6dfcc'
    px(x, y, 8, 8, base)
    for (let yy = 0; yy < 8; yy++) {
      for (let xx = 0; xx < 8; xx++) {
        if (speck(x + xx, y + yy, 17 + variant, 9)) px(x + xx, y + yy, 1, 1, mix(base, '#4a4a3a', 0.12))
      }
    }
    px(x, y, 8, 1, mix(base, '#ffffff', 0.3))
    px(x + 7, y, 1, 8, mix(base, '#3a3a2a', 0.15))
  }
  if (variant === 1) {
    // Scuffed by a trolley wheel.
    px(3, 11, 6, 1, '#c4bca8')
    px(8, 12, 3, 1, '#c4bca8')
  }
}

// ---------------------------------------------------------------------------
// Carpets — each a 32x32 motif over four tiles
// ---------------------------------------------------------------------------

/** The reservation: dusty red-brown with big diamonds and brass studs where they meet. */
const carpetDust = motif((x, y) => {
  const dx = wrap(x - 16)
  const dy = wrap(y - 16)
  const d = dx + dy
  if (wrap(x) + wrap(y) <= 2) return '#c08a3a'
  if (d <= 1) return '#d8a24a'
  if (d <= 4) return '#963a2c'
  if (d === 14) return '#a2483a'
  if (d === 15) return '#5e1f18'
  if (d >= 26 && d <= 27) return '#8e3528'
  return '#7a2b22'
})

/** The card room: bottle green with a gold trellis. */
const carpetGreen = motif((x, y) => {
  const a = (x + y) % 16
  const b = (x - y + 32) % 16
  if ((a === 0 || b === 0) && (x + y) % 2 === 0) return '#b8913e'
  const cx = wrap(x - 8) % 16
  const cy = wrap(y - 8) % 16
  if ((cx === 0 && cy <= 1) || (cy === 0 && cx <= 1)) return '#d4ad55'
  if (a === 1 || b === 1) return '#163f2b'
  return '#1c4f36'
})

/** The island: shallow-water teal with scalloped waves and the odd shell. */
const carpetTeal = motif((x, y) => {
  const row = Math.floor(y / 8)
  const phase = (x + (row % 2) * 4) % 8
  const yy = y % 8
  const crest = [3, 2, 1, 1, 1, 1, 2, 3][phase]
  if (yy === crest) return '#7ccbbe'
  if (yy === crest + 1) return '#4faea3'
  if ((x === 6 && y === 21) || (x === 22 && y === 5) || (x === 27 && y === 26)) return '#efe0b0'
  if (yy === 7) return '#348a84'
  return '#3f9e96'
})

/**
 * The Strip: near-black pile with a faint diagonal lattice, and a small neon
 * medallion where every other pair of lines cross.
 *
 * It used to be neon confetti, and however far the confetti was sunk it was
 * still the loudest thing in the room: a floor of sparkle reads as noise, and
 * the machines and the felt are what should glow. Now the floor is quiet and
 * dark, and the neon in it is trim — one thin ring and one bright point every
 * two tiles — so it is still unmistakably the Strip's carpet.
 */
const carpetNeon = motif((x, y) => {
  const corner = wrap(x) + wrap(y)
  const centre = wrap(x - 16) + wrap(y - 16)
  if (corner === 0) return '#46b0c0'
  if (corner === 3) return '#6a2864'
  if (corner < 3) return '#261832'
  if (centre === 0) return '#6a2a64'
  if (centre === 1) return '#211629'
  if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) return '#211829'
  if ((x * 7 + y * 13) % 37 === 0) return '#1c1524'
  return '#16101d'
})

/** The high-limit rooms: burgundy, with gold medallions. */
const carpetRoyal = motif((x, y) => {
  const ring = (cx: number, cy: number) => {
    const d = Math.max(wrap(x - cx), wrap(y - cy)) + Math.min(wrap(x - cx), wrap(y - cy)) / 2
    return d
  }
  const big = ring(8, 8)
  const small = ring(24, 24)
  if (big >= 4 && big < 5) return '#c9a050'
  if (big < 1.5) return '#e0bc68'
  if (small < 2) return '#c9a050'
  if ((x + y) % 16 === 0 && (x - y + 32) % 16 === 0) return '#7a2034'
  if (big >= 5 && big < 6) return '#460c1a'
  return '#5a1222'
})

/**
 * Ultraviolet: deep plum pile in broad diagonal bands, and a thin ring here
 * and there that would glow under the black light. Quiet, so the dance floor
 * and the bar are what light up.
 */
const carpetViolet = motif((x, y) => {
  const ring = (cx: number, cy: number) => {
    const dx = wrap(x - cx)
    const dy = wrap(y - cy)
    return dx * dx + dy * dy
  }
  const r = ring(8, 8)
  if (r >= 6 && r <= 9) return '#5a3a9a'
  if (r === 0) return '#c890ff'
  const s2 = ring(24, 24)
  if (s2 === 0) return '#ff9ef0'
  if (s2 === 1) return '#3a1c5c'
  const band = Math.floor(((x + y) % 32) / 8)
  if ((x + y) % 8 === 0) return '#2a1646'
  return band % 2 === 0 ? '#1e1034' : '#221238'
})

/**
 * Dark oak parquet laid in a chevron: strips three pixels wide running down to
 * the right in one band and down to the left in the next, a seam between each.
 * The Harbour Room, where the floor is older than the members.
 */
const parquet = motif((x, y) => {
  const band = Math.floor(x / 8)
  const across = band % 2 === 0 ? x % 8 : 7 - (x % 8)
  const run = y + across
  if (x % 8 === 0) return '#3e2414'
  if (run % 3 === 0) return '#4a2a16'
  const strip = Math.floor(run / 3) + band * 2
  return ['#7a4a28', '#6c4022', '#84522e', '#724626'][strip % 4]
})

/** Mint and cream lino in diamonds, scuffed where the stools turn: the Landing Diner. */
const dinerLino = motif((x, y) => {
  const a = Math.floor((x + y) / 8)
  const b = Math.floor((x - y + 32) / 8)
  const mint = (a + b) % 2 === 0
  if ((x + y) % 8 === 0 || (x - y + 32) % 8 === 0) return mint ? '#86b8a0' : '#d6cfb8'
  if (speck(x, y, 5, 29)) return mint ? '#b2dcc6' : '#f6f0de'
  return mint ? '#9ccab2' : '#e8e1cb'
})

/**
 * Wall-to-wall carpet in a brown that was orange once, a darker trellis in it
 * and the pile flecked: Marcus's front room.
 */
const shag = motif((x, y) => {
  if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) return '#6a4226'
  if ((x + y) % 16 === 8 && (x - y + 32) % 16 === 8) return '#a8743e'
  if (speck(x, y, 11, 7)) return '#8e5e34'
  if (speck(x, y, 4, 13)) return '#6e4628'
  return '#7c5030'
})

/** The riverboat saloon: navy pile, a gold lattice, a fleuron in every diamond. */
const carpetNavy = motif((x, y) => {
  const d = wrap(x - 8) + wrap(y - 8)
  const e = wrap(x - 24) + wrap(y - 24)
  if ((x + y) % 16 === 0 || (x - y + 32) % 16 === 0) return '#2e3c6a'
  if (d < 2 || e < 2) return '#d8b058'
  if (d === 2 || e === 2) return '#8a6a2e'
  return (x * 7 + y * 3) % 23 === 0 ? '#22305a' : '#1c2850'
})

// ---------------------------------------------------------------------------
// The table the renderer reads
// ---------------------------------------------------------------------------

export const INTERIOR_TILES: Record<number, TileVariants> = {
  [WALL_TOP]: { draws: [wallTop], pick: () => 0 },
  [DOOR]: { draws: [doorway], pick: () => 0 },
  [PAPER_STRIPE]: { draws: [paperStripe], pick: () => 0 },
  [PANEL_WOOD]: { draws: [panelWood], pick: () => 0 },
  [PAPER_DAMASK]: { draws: [paperDamask], pick: () => 0 },
  [WALL_TILED]: { draws: [wallTiled], pick: () => 0 },
  [WALL_BAMBOO]: { draws: [wallBamboo], pick: () => 0 },
  [WALL_NEON]: { draws: [wallNeon(true), wallNeon(false)], pick: (col) => (col >> 2) & 1 },
  [WALL_MARBLE]: { draws: [wallMarble], pick: () => 0 },
  [WALL_CABIN]: { draws: [wallCabin], pick: () => 0 },
  [WALL_BAIZE]: { draws: [wallBaize], pick: () => 0 },
  [WALL_PAINT]: { draws: [wallPaint], pick: () => 0 },
  [WOOD_FLOOR]: { draws: [woodFloor(0), woodFloor(1)], pick: (col, row) => (col + (row >> 1)) & 1 },
  [CHECKER]: { draws: [checker], pick: () => 0 },
  [TILE_FLOOR]: { draws: [tileFloor(0), tileFloor(1), tileFloor(2)], pick: (col, row) => scatter(col, row, 3) },
  [MARBLE]: {
    draws: [marble(false), marble(true), marble(false, true), marble(true, true)],
    pick: (col, row) => chequer(col, row) + 2 * scatter(col, row, 2),
  },
  [DECK]: { draws: [deck(0), deck(1)], pick: byColumn },
  [LINO]: { draws: [lino(0), lino(1), lino(2), lino(3)], pick: (col, row) => scatter(col, row, 4) },
  [SEAGRASS]: { draws: [seagrass], pick: () => 0 },
  [SLATE]: { draws: [slate(0), slate(1), slate(2)], pick: (col, row) => scatter(col, row, 3) },
  [SHOWROOM]: { draws: [showroom(0), showroom(1)], pick: (col, row) => (scatter(col, row, 5) === 0 ? 1 : 0) },
  [SALTILLO]: {
    draws: [saltillo(0), saltillo(1), saltillo(2)],
    pick: (col, row) => (scatter(col, row, 11) === 0 ? 2 : (col + row) & 1),
  },
  [VINYL]: { draws: [vinyl(0), vinyl(1)], pick: (col, row) => (scatter(col, row, 9) === 0 ? 1 : 0) },
  [CARPET]: { draws: carpetDust, pick: quarter },
  [CARPET_GREEN]: { draws: carpetGreen, pick: quarter },
  [CARPET_TEAL]: { draws: carpetTeal, pick: quarter },
  [CARPET_NEON]: { draws: carpetNeon, pick: quarter },
  [CARPET_ROYAL]: { draws: carpetRoyal, pick: quarter },
  [CARPET_VIOLET]: { draws: carpetViolet, pick: quarter },
  [CARPET_NAVY]: { draws: carpetNavy, pick: quarter },
  [PARQUET]: { draws: parquet, pick: quarter },
  [DINER_LINO]: { draws: dinerLino, pick: quarter },
  [SHAG]: { draws: shag, pick: quarter },
}

/** The band of a carpet's border: the outer line, the inner line, and the shade inside them. */
export const CARPET_BORDERS: Record<number, [string, string, string]> = {
  [CARPET]: ['#4a1a14', '#c08a3a', '#6a241c'],
  [CARPET_GREEN]: ['#0f2e20', '#c8a048', '#174230'],
  [CARPET_TEAL]: ['#2e7a74', '#efe0b0', '#368c85'],
  [CARPET_NEON]: ['#0e0a14', '#a03894', '#1c1426'],
  [CARPET_ROYAL]: ['#2e0810', '#d8b060', '#4a0e1c'],
  [CARPET_VIOLET]: ['#120820', '#b46cff', '#2e1450'],
  [CARPET_NAVY]: ['#0e1428', '#c8a048', '#18223e'],
}
