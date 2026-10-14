import {
  CARPET, CARPET_GREEN, CARPET_NEON, CARPET_ROYAL, CARPET_TEAL, CARPET_VIOLET, CHECKER, DECK, DOOR,
  LINO, MARBLE, PANEL_WOOD, PAPER_DAMASK, PAPER_STRIPE, TILE_FLOOR, WALL_BAIZE, WALL_BAMBOO, WALL_CABIN,
  WALL_MARBLE, WALL_NEON, WALL_PAINT, WALL_TILED, WALL_TOP, WOOD_FLOOR,
} from './tiles'
import { speck, type Px } from './pixelArt'

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

/** Small square tiles, grouted: the launderette and the corner shop. */
const tileFloor: Draw = (px) => {
  px(0, 0, 16, 16, '#d3dcdd')
  for (let i = 0; i < 16; i += 4) {
    px(i + 3, 0, 1, 16, '#a9b6b8')
    px(0, i + 3, 16, 1, '#a9b6b8')
  }
  for (const [x, y] of [[4, 0], [8, 8], [0, 12], [12, 4]]) px(x, y, 3, 3, '#c8d2d3')
  for (let x = 0; x < 16; x += 4) for (let y = 0; y < 16; y += 4) px(x, y, 1, 1, '#e8eeee')
}

/** Marble slabs, light and dark in a chequer, with veins: Porto Lumina. */
const marble = (dark: boolean): Draw => (px) => {
  const [base, vein, hi] = dark ? ['#aaa49b', '#8f897f', '#bcb6ad'] : ['#efe9df', '#d2c8b8', '#fbf8f2']
  px(0, 0, 16, 16, base)
  for (const [x, y, w] of [[2, 3, 2], [4, 4, 2], [6, 5, 1], [7, 6, 2], [9, 7, 1], [10, 8, 2], [12, 10, 1], [13, 11, 2]]) {
    px(x, y, w, 1, vein)
  }
  for (const [x, y] of [[11, 2], [12, 3], [3, 11], [4, 12], [5, 12]]) px(x, y, 1, 1, vein)
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

/** Speckled vinyl: the floor of a shop that sells things off shelves. */
const lino: Draw = (px) => {
  px(0, 0, 16, 16, '#d8d1c2')
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      if (speck(x, y, 7, 11)) px(x, y, 1, 1, '#c3bba9')
      else if (speck(x, y, 3, 17)) px(x, y, 1, 1, '#e9e3d6')
    }
  }
  px(0, 0, 16, 1, '#c9c1b0')
  px(0, 0, 1, 16, '#c9c1b0')
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

/** The Strip: black, with neon confetti that does not line up with anything. */
const carpetNeon = motif((x, y) => {
  const marks: Array<[number, number, string, string]> = [
    [3, 4, 'squiggle', '#ff4fd8'], [12, 2, 'dot', '#ffe14f'], [20, 6, 'tri', '#4fe8ff'],
    [27, 3, 'bar', '#ffe14f'], [7, 12, 'tri', '#ffe14f'], [16, 14, 'squiggle', '#4fe8ff'],
    [25, 11, 'dot', '#ff4fd8'], [2, 20, 'bar', '#4fe8ff'], [11, 22, 'dot', '#4fe8ff'],
    [19, 19, 'tri', '#ff4fd8'], [28, 21, 'squiggle', '#ffe14f'], [6, 28, 'dot', '#ff4fd8'],
    [14, 27, 'bar', '#ff4fd8'], [23, 28, 'dot', '#ffe14f'], [30, 15, 'dot', '#4fe8ff'],
  ]
  for (const [mx, my, shape, color] of marks) {
    const dx = x - mx
    const dy = y - my
    if (shape === 'dot' && dx >= 0 && dx < 2 && dy >= 0 && dy < 2) return color
    if (shape === 'bar' && dy === 0 && dx >= 0 && dx < 4) return color
    if (shape === 'tri' && dy >= 0 && dy < 3 && Math.abs(dx) <= dy) return color
    if (shape === 'squiggle' && ((dy === 0 && (dx === 0 || dx === 2)) || (dy === 1 && (dx === 1 || dx === 3)))) {
      return color
    }
  }
  if ((x * 7 + y * 13) % 31 === 0) return '#2a1a3a'
  return '#120c1a'
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

/** Ultraviolet: deep violet, stars and rings that would glow under a black light. */
const carpetViolet = motif((x, y) => {
  const star = (cx: number, cy: number) =>
    (x === cx && Math.abs(y - cy) <= 2) || (y === cy && Math.abs(x - cx) <= 2)
  if (star(7, 7) || star(23, 21)) return '#c890ff'
  const rx = x - 22
  const ry = y - 8
  const r2 = rx * rx + ry * ry
  if (r2 >= 6 && r2 <= 10) return '#5a78ff'
  const sx = x - 9
  const sy = y - 24
  const s2 = sx * sx + sy * sy
  if (s2 >= 3 && s2 <= 6) return '#ff9ef0'
  if ((x + y * 3) % 23 === 0) return '#3a1c5c'
  return '#24103e'
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
  [TILE_FLOOR]: { draws: [tileFloor], pick: () => 0 },
  [MARBLE]: { draws: [marble(false), marble(true)], pick: chequer },
  [DECK]: { draws: [deck(0), deck(1)], pick: byColumn },
  [LINO]: { draws: [lino], pick: () => 0 },
  [CARPET]: { draws: carpetDust, pick: quarter },
  [CARPET_GREEN]: { draws: carpetGreen, pick: quarter },
  [CARPET_TEAL]: { draws: carpetTeal, pick: quarter },
  [CARPET_NEON]: { draws: carpetNeon, pick: quarter },
  [CARPET_ROYAL]: { draws: carpetRoyal, pick: quarter },
  [CARPET_VIOLET]: { draws: carpetViolet, pick: quarter },
}

/** The band of a carpet's border: the outer line, the inner line, and the shade inside them. */
export const CARPET_BORDERS: Record<number, [string, string, string]> = {
  [CARPET]: ['#4a1a14', '#c08a3a', '#6a241c'],
  [CARPET_GREEN]: ['#0f2e20', '#c8a048', '#174230'],
  [CARPET_TEAL]: ['#2e7a74', '#efe0b0', '#368c85'],
  [CARPET_NEON]: ['#4fe8ff', '#ff4fd8', '#1c1028'],
  [CARPET_ROYAL]: ['#2e0810', '#d8b060', '#4a0e1c'],
  [CARPET_VIOLET]: ['#120820', '#b46cff', '#2e1450'],
}
