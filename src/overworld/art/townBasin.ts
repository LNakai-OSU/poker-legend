import type { ArtContext, StampArt } from '../stampArt'
import { icon, shadow, sprite, text, textCentred, textWidth, tint } from '../pixelArt'
import {
  acUnit, awning, barberPole, brickWall, bulbBorder, canopy, chimney, dish, displayWindow, doorAt, downpipe,
  eaveShadow, fanlight, fireEscape, flatRoof, glassDoors, groundShadow, lintel, plinth, puffs,
  rollerShutter, roundWindow, shingleRoof, sidingWall, signBoard, slateRoof, stoneWall, stuccoWall, tinRoof,
  wallLamp, washer, waterTower, windowAt,
  type DoorStyle, type RoofPalette, type WallPalette, type WindowStyle,
} from './buildingParts'

/**
 * Basin: your end of town.
 *
 * Soot-dark brick under red shingle, cream trim, and every second shop shut.
 * Three streets of it — Basin Street where you live, Seventh with the shops,
 * and Eastgate up the hill where Marcus deals on a Friday.
 */

/** The column of every doorway in a footprint, and the row it is on. */
export function doorTiles(c: ArtContext): Array<{ x: number; y: number }> {
  const doors: Array<{ x: number; y: number }> = []
  c.tiles.forEach((row, r) => {
    for (let col = 0; col < row.length; col++) if (row[col] === 'D') doors.push({ x: col * 16, y: r * 16 })
  })
  return doors
}

/** Eaves overhang both sides; the shadow falls to the right. */
export const EAVES = { left: 2, right: 3 }

export const BASIN_ROOF: RoofPalette = {
  line: '#3a1a16', ridge: '#b4604a', hi: '#c47058', a: '#8e4434', b: '#7e3a2e', seam: '#5a2820', fascia: '#e2d6bc',
}
const MOSS_ROOF: RoofPalette = {
  line: '#1e2a1a', ridge: '#6a845a', hi: '#7a9468', a: '#4e6a42', b: '#445e3a', seam: '#2e3e28', fascia: '#e2d6bc',
}
export const SLATE_ROOF: RoofPalette = {
  line: '#1e2028', ridge: '#7a8494', hi: '#8a94a4', a: '#5a6272', b: '#4e5666', seam: '#363c48', fascia: '#e2d6bc',
}
const TIN: RoofPalette = {
  line: '#3a3e44', ridge: '#a8aeb6', hi: '#b8c0c8', a: '#8a9098', b: '#9a6a48', seam: '#6a7078', fascia: '#5a5e64',
}
export const BASIN_BRICK: WallPalette = { hi: '#b25e44', base: '#a0503a', lo: '#8a4232', line: '#6e3a2c' }
const SOOT_BRICK: WallPalette = { hi: '#7e4a3e', base: '#6e4034', lo: '#5e362c', line: '#40241e' }
const BROWN_BRICK: WallPalette = { hi: '#8a5a42', base: '#7a4c38', lo: '#6a402e', line: '#4a2c20' }
const YELLOW_BRICK: WallPalette = { hi: '#e0c890', base: '#d0b47a', lo: '#b89c64', line: '#8a7048' }
const CREAM_SIDING: WallPalette = { hi: '#efe6cc', base: '#e0d4b4', lo: '#c4b694', line: '#8a7a60' }
const BLUE_SIDING: WallPalette = { hi: '#dae2ea', base: '#c4ced8', lo: '#a4b0bc', line: '#6a7684' }
const MINT_SIDING: WallPalette = { hi: '#cfe8d8', base: '#b8d8c4', lo: '#98bca6', line: '#5e8470' }
const BLOCK: WallPalette = { hi: '#c8c4b8', base: '#b4b0a4', lo: '#9e9a8e', line: '#7a766c' }

export const BASIN_WINDOW: WindowStyle = {
  frame: '#3a2820', trim: '#ece2c8', glass: '#7fbcd8', glassHi: '#a8daf0', sill: '#e2d6bc',
}
const DARK_WINDOW: WindowStyle = { ...BASIN_WINDOW, glass: '#3a4a5a', glassHi: '#5a6e80' }
const BASIN_DOOR: DoorStyle = { line: '#2a1a14', trim: '#ece2c8', leaf: '#2f5e44' }
const STONE = '#c4b8a4'

// ---------------------------------------------------------------------------
// Basin Street
// ---------------------------------------------------------------------------

/**
 * Your building: the bakery on the ground floor and the flats over it. The
 * bakery is shut by the time you are up; your door is the plain one beside it.
 */
const bakery: StampArt = {
  bleed: { ...EAVES, top: 12 },
  frames: 2,
  draw: (px, c) => {
    const roof = 24
    chimney(px, 84, -5, 9, '#8e4434', '#b0a898')
    puffs(px, 86, -8, c.frame)
    shingleRoof(px, -2, 0, c.w + 4, roof, BASIN_ROOF)
    brickWall(px, 0, roof, c.w, c.h - roof, BASIN_BRICK)
    eaveShadow(px, 0, roof, c.w)
    // The flats upstairs.
    for (const [x, extra] of [[8, {}], [48, { flowers: true }], [90, { curtain: '#6a8ac8' }]] as const) {
      lintel(px, x, roof + 5, 12, STONE)
      windowAt(px, x, roof + 5, 12, 9, { ...BASIN_WINDOW, ...extra })
    }
    // The bakery front: a painted timber shopfront with its own fascia.
    px(0, 38, 64, 26, '#24463a')
    px(0, 38, 64, 1, '#3a6a54')
    px(0, 38, 2, 26, '#e2d6bc')
    px(62, 38, 2, 26, '#e2d6bc')
    px(2, 39, 60, 7, '#1c382e')
    textCentred(px, 'BAKERY', 32, 40, '#f2c86a')
    px(8, 41, 3, 2, '#c88a48')
    px(53, 41, 3, 2, '#c88a48')
    awning(px, 2, 46, 60, 4, '#2f6a50', '#efe4c8')
    // Loaves and a cake in the window.
    px(4, 53, 38, 10, '#1a2a24')
    px(5, 54, 36, 8, '#e8d6a8')
    px(5, 54, 36, 1, '#fff0c8')
    px(5, 59, 36, 1, '#a8885a')
    for (let x = 6; x < 39; x += 7) {
      px(x, 56, 5, 3, '#b8743a')
      px(x + 1, 56, 3, 1, '#e0a060')
      px(x + 2, 57, 1, 1, '#8a5428')
    }
    px(30, 60, 6, 2, '#f4f0f0')
    px(30, 60, 6, 1, '#f08ab0')
    px(6, 60, 4, 2, '#d89a50')
    px(12, 60, 4, 2, '#d89a50')
    px(2, 63, 42, 1, '#1a2a24')
    // The bakery's own door, shut, with the card turned to CLOSED.
    px(46, 50, 14, 14, '#1c382e')
    px(47, 51, 12, 13, '#2f5e44')
    px(48, 52, 10, 6, '#a8d0c8')
    px(48, 52, 3, 1, '#ffffff')
    px(50, 55, 6, 3, '#f4f0e0')
    px(51, 56, 4, 1, '#c83a3a')
    px(56, 59, 1, 1, '#f2c14e')
    // Your door: plain, with a fanlight, the bells for the flats beside it.
    for (const door of doorTiles(c)) {
      fanlight(px, door.x, door.y, '#e2d6bc', '#ffd27a')
      doorAt(px, door.x, door.y, { ...BASIN_DOOR, leaf: '#7a2a26' })
    }
    px(82, 50, 5, 8, '#8a7a5a')
    px(83, 51, 3, 6, '#c8b888')
    for (const y of [52, 54, 56]) px(84, y, 1, 1, '#3a2a1a')
    lintel(px, 92, 51, 14, STONE)
    windowAt(px, 92, 51, 14, 9, { ...BASIN_WINDOW, curtain: '#d8c8a0', bars: 'vertical' })
    plinth(px, 64, c.h - 2, c.w - 64, '#7a6a5e')
    downpipe(px, c.w - 3, roof, c.h - roof - 2, '#3a3a42')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** A narrow red-brick terrace house with a chimney and a window box. */
const houseA: StampArt = {
  bleed: { ...EAVES, top: 4 },
  draw: (px, c) => {
    const roof = 28
    chimney(px, c.w - 22, -4, 8, '#8e4434', '#b0a898')
    shingleRoof(px, -2, 0, c.w + 4, roof, BASIN_ROOF)
    brickWall(px, 0, roof, c.w, c.h - roof, BASIN_BRICK)
    eaveShadow(px, 0, roof, c.w)
    downpipe(px, c.w - 3, roof, c.h - roof - 2, '#4a4a52')
    lintel(px, 9, roof + 5, 11, STONE)
    windowAt(px, 9, roof + 5, 11, 9, BASIN_WINDOW)
    lintel(px, c.w - 21, roof + 5, 11, STONE)
    windowAt(px, c.w - 21, roof + 5, 11, 9, { ...BASIN_WINDOW, curtain: '#c86a5a' })
    lintel(px, 6, c.h - 14, 13, STONE)
    windowAt(px, 6, c.h - 14, 13, 8, { ...BASIN_WINDOW, flowers: true })
    plinth(px, 0, c.h - 2, c.w, '#7a6a5e')
    fanlight(px, 32, c.h - 16, '#e2d6bc', '#9fd0e8')
    doorAt(px, 32, c.h - 16, BASIN_DOOR)
    wallLamp(px, 49, c.h - 13, '#ffd27a')
    lintel(px, c.w - 19, c.h - 14, 13, STONE)
    windowAt(px, c.w - 19, c.h - 14, 13, 8, BASIN_WINDOW)
    // A house number on the door frame.
    text(px, '12', 25, c.h - 13, '#ece2c8')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The pawnbroker: three gold balls and a grille over everything worth stealing. */
const pawn: StampArt = {
  bleed: { left: 1, right: 3 },
  draw: (px, c) => {
    const roof = 10
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#a89c8c', base: '#8a7e70', lo: '#5e554a' }, '#3a3640')
    brickWall(px, 0, roof, c.w, c.h - roof, SOOT_BRICK)
    eaveShadow(px, 0, roof, c.w)
    // The sign across the first floor.
    px(4, 13, c.w - 8, 16, '#14141a')
    px(5, 14, c.w - 10, 14, '#22222c')
    text(px, 'PAWN', 12, 16, '#2a2010', 2)
    text(px, 'PAWN', 11, 15, '#f2c84a', 2)
    px(5, 27, c.w - 10, 1, '#3a3a48')
    // Three gold balls hanging off a bracket.
    px(56, 31, 16, 1, '#2a2a30')
    px(70, 29, 1, 3, '#2a2a30')
    for (const [bx, by] of [[57, 33], [65, 33], [61, 38]]) {
      px(bx + 1, by - 1, 1, 1, '#2a2a30')
      px(bx, by, 4, 4, '#a8801e')
      px(bx, by, 3, 3, '#f2c84a')
      px(bx, by, 1, 1, '#fff2b0')
    }
    windowAt(px, 8, 31, 12, 9, { ...DARK_WINDOW, curtain: '#8a8a70', bars: 'none' })
    for (let y = 33; y < 38; y += 2) px(10, y, 8, 1, '#c8c0a0')
    // The shop window behind its grille: a guitar, a television, watches.
    px(3, 44, 41, 18, '#1a1a20')
    px(4, 45, 39, 16, '#3a3428')
    px(8, 48, 4, 10, '#c87a3a')
    px(9, 46, 2, 3, '#5a3a20')
    px(8, 54, 4, 4, '#a85a28')
    px(16, 50, 10, 8, '#2a2a30')
    px(17, 51, 8, 6, '#6a8aa8')
    px(17, 51, 3, 1, '#a8c8e8')
    for (let x = 29; x < 41; x += 4) {
      px(x, 55, 3, 3, '#f2c84a')
      px(x + 1, 56, 1, 1, '#ffffff')
    }
    for (let x = 4; x < 43; x += 3) px(x, 45, 1, 16, '#14141a')
    px(4, 52, 39, 1, '#14141a')
    // A shutter down over the door, and the sign that says what they do.
    px(50, 40, 26, 6, '#8a2020')
    textCentred(px, 'LOANS', 63, 40, '#f4ead0')
    rollerShutter(px, 49, 48, 14, 16)
    plinth(px, 0, c.h - 2, c.w, '#5a524a')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** A walk-up with a water tank on the roof and a fire escape down the front. */
const tenement: StampArt = {
  bleed: { left: 1, right: 3, top: 6 },
  draw: (px, c) => {
    const roof = 8
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#9a8a78', base: '#7a6c5e', lo: '#4e443a' }, '#3a3640')
    waterTower(px, 60, -6)
    brickWall(px, 0, roof, c.w, c.h - roof, BROWN_BRICK)
    eaveShadow(px, 0, roof, c.w)
    // A cornice of corbelled brick under the roof line.
    for (let x = 1; x < c.w; x += 4) px(x, roof + 2, 2, 2, '#5a3a2a')
    const floors = [13, 29]
    for (const y of floors) {
      lintel(px, 7, y, 11, STONE)
      windowAt(px, 7, y, 11, 10, BASIN_WINDOW)
      lintel(px, 34, y, 11, STONE)
      windowAt(px, 34, y, 11, 10, y === 13 ? { ...BASIN_WINDOW, curtain: '#d8a04a' } : DARK_WINDOW)
      lintel(px, 61, y, 11, STONE)
      windowAt(px, 61, y, 11, 10, y === 29 ? { ...BASIN_WINDOW, flowers: true } : BASIN_WINDOW)
    }
    fireEscape(px, 30, 20, 20, 12)
    fireEscape(px, 30, 36, 20, 0)
    // The stoop: a door up two steps, under a little stone hood.
    px(29, 45, 22, 2, STONE)
    px(29, 45, 22, 1, tint(STONE, 0.2))
    doorAt(px, 32, 48, { line: '#1a1a20', trim: '#4a3a30', leaf: '#3a2a22', glass: '#d8b860' })
    px(30, 62, 20, 2, '#9a9284')
    lintel(px, 8, 51, 11, STONE)
    windowAt(px, 8, 51, 11, 8, DARK_WINDOW)
    lintel(px, 61, 51, 11, STONE)
    windowAt(px, 61, 51, 11, 8, BASIN_WINDOW)
    plinth(px, 0, c.h - 2, 30, '#6a5e52')
    plinth(px, 50, c.h - 2, c.w - 50, '#6a5e52')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** CHECKS CASHED, in yellow, bars on the windows. Across the street from your door. */
const checks: StampArt = {
  bleed: { left: 1, right: 3 },
  frames: 2,
  draw: (px, c) => {
    const roof = 10
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#b0a898', base: '#908878', lo: '#605a50' }, '#403c46')
    acUnit(px, 70, 2)
    stuccoWall(px, 0, roof, c.w, c.h - roof, { hi: '#e4dcc4', base: '#d4cab0', lo: '#bcb298', line: '#8a8270' })
    eaveShadow(px, 0, roof, c.w)
    // The sign is the building.
    px(4, 12, c.w - 8, 26, '#1a1408')
    px(5, 13, c.w - 10, 24, '#f2c830')
    px(5, 13, c.w - 10, 1, '#fff08a')
    textCentred(px, 'CHECKS', c.w / 2 + 1, 15, '#8a6a10', 2)
    textCentred(px, 'CHECKS', c.w / 2, 14, '#1a1408', 2)
    textCentred(px, 'CASHED', c.w / 2 + 1, 27, '#8a6a10', 2)
    textCentred(px, 'CASHED', c.w / 2, 26, '#c83020', 2)
    // Barred window with a neon OPEN in it, buzzing on and off.
    px(6, 42, 36, 18, '#1a1a20')
    px(7, 43, 34, 16, '#2a3440')
    const lit = c.frame === 0
    px(12, 47, 17, 7, lit ? '#3a1018' : '#22161a')
    text(px, 'OPEN', 13, 48, lit ? '#ff5a6a' : '#6a2a30')
    for (let x = 7; x < 41; x += 3) px(x, 43, 1, 16, '#101014')
    px(7, 50, 34, 1, '#101014')
    // The door, with its own steel gate.
    px(60, 42, 22, 22, '#1a1a20')
    px(61, 43, 20, 21, '#3a4450')
    for (let x = 61; x < 81; x += 2) px(x, 43, 1, 21, '#14141a')
    px(61, 52, 20, 1, '#14141a')
    px(56, 38, 30, 3, '#5a5040')
    plinth(px, 0, c.h - 2, c.w, '#6a645a')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** Pale blue clapboard under slate, a dormer in the roof and a canopy over the door. */
const houseB: StampArt = {
  bleed: { ...EAVES, top: 2 },
  draw: (px, c) => {
    const roof = 30
    slateRoof(px, -2, 0, c.w + 4, roof, SLATE_ROOF)
    // A dormer window with a little roof of its own.
    px(31, 8, 18, 15, '#1e2028')
    px(32, 9, 16, 13, '#d8e0e8')
    windowAt(px, 35, 11, 10, 9, BASIN_WINDOW)
    px(29, 4, 22, 5, SLATE_ROOF.line)
    px(30, 5, 20, 3, SLATE_ROOF.ridge)
    px(31, 5, 18, 1, SLATE_ROOF.hi)
    shadow(px, 32, 22, 16, 1, 0.35)
    sidingWall(px, 0, roof, c.w, c.h - roof, BLUE_SIDING)
    eaveShadow(px, 0, roof, c.w)
    // Corner boards.
    px(0, roof, 2, c.h - roof, '#eef2f6')
    px(c.w - 2, roof, 2, c.h - roof, '#d8dee4')
    windowAt(px, 7, roof + 6, 13, 12, { ...BASIN_WINDOW, frame: '#2a3440', trim: '#ffffff', curtain: '#e8b0b0' })
    windowAt(px, c.w - 20, roof + 6, 13, 12, { ...BASIN_WINDOW, frame: '#2a3440', trim: '#ffffff' })
    canopy(px, 29, c.h - 21, 22, '#4e5666')
    doorAt(px, 32, c.h - 16, { line: '#2a3440', trim: '#ffffff', leaf: '#b03434' })
    plinth(px, 0, c.h - 2, c.w, '#8a8e94')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The bingo hall: a long shed of a building with a marquee that never stops chasing. */
const bingo: StampArt = {
  bleed: { left: 1, right: 3 },
  frames: 2,
  draw: (px, c) => {
    const roof = 12
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#b8b0a0', base: '#988e7e', lo: '#6a6256' }, '#46424c')
    acUnit(px, 16, 2)
    acUnit(px, 140, 3)
    px(100, 3, 4, 5, '#5a5a62')
    px(99, 2, 6, 2, '#7a7a84')
    stoneWall(px, 0, roof, c.w, c.h - roof, BLOCK, 12)
    eaveShadow(px, 0, roof, c.w)
    // The marquee.
    const mx = 38
    const mw = 100
    px(mx, 14, mw, 24, '#3a0a0a')
    px(mx + 1, 15, mw - 2, 22, '#a82020')
    px(mx + 1, 15, mw - 2, 1, '#d84040')
    bulbBorder(px, mx + 2, 16, mw - 4, 20, c.frame)
    const words = 'BINGO'
    const tw = textWidth(words, 3)
    text(px, words, mx + Math.round((mw - tw) / 2) + 1, 19, '#3a0a0a', 3)
    text(px, words, mx + Math.round((mw - tw) / 2), 18, '#ffd84a', 3)
    px(mx + 20, 39, mw - 40, 7, '#f4f0e4')
    textCentred(px, 'TUE THU 7PM', mx + mw / 2, 40, '#a82020')
    // Double doors (locked till seven), posters, little high windows.
    glassDoors(px, 80, 48, 16, '#2a2a30', '#5a7890', '#c8ccd4')
    px(82, 52, 5, 6, '#f2e0a0')
    px(89, 52, 5, 6, '#f2e0a0')
    for (const x of [8, 22, 148, 162]) windowAt(px, x, 42, 10, 7, { ...DARK_WINDOW, bars: 'vertical' })
    px(110, 46, 10, 13, '#f0e8d0')
    px(111, 47, 8, 4, '#d84040')
    px(111, 52, 8, 1, '#3a3a40')
    px(111, 54, 6, 1, '#3a3a40')
    px(124, 48, 9, 11, '#5ac0e0')
    px(125, 49, 7, 3, '#ffffff')
    plinth(px, 0, c.h - 2, c.w, '#6a665c')
    groundShadow(px, c.w, roof, c.h)
  },
}

// ---------------------------------------------------------------------------
// Seventh Street
// ---------------------------------------------------------------------------

/** Patel's: green awning, fruit out front, ice in the chest by the door. */
const patels: StampArt = {
  bleed: { left: 1, right: 3 },
  draw: (px, c) => {
    const roof = 12
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#c0a890', base: '#a08870', lo: '#6a5a48' }, '#3e3a44')
    brickWall(px, 0, roof, c.w, c.h - roof, BASIN_BRICK)
    eaveShadow(px, 0, roof, c.w)
    // A cornice of stone, then the flat above the shop.
    px(0, roof + 1, c.w, 2, STONE)
    for (const x of [10, 68]) {
      lintel(px, x, 18, 14, STONE)
      windowAt(px, x, 18, 14, 10, x === 10 ? { ...BASIN_WINDOW, curtain: '#e8a040' } : BASIN_WINDOW)
    }
    px(36, 18, 22, 9, '#8a4232')
    icon(px, 'star', 44, 20, '#f2c84a')
    // Fascia and awning.
    px(2, 31, c.w - 4, 10, '#6a1a14')
    px(3, 32, c.w - 6, 8, '#b8261c')
    px(3, 32, c.w - 6, 1, '#e04a3a')
    textCentred(px, "PATEL'S", c.w / 2 + 1, 34, '#5a0a08')
    textCentred(px, "PATEL'S", c.w / 2, 33, '#fff4e0')
    awning(px, 2, 41, c.w - 4, 5, '#2e7a4a', '#f0ead8')
    displayWindow(px, 4, 49, 40, 13, '#3a2a20', ['#e05a3a', '#f2c14e', '#4a8ad8', '#3a9d5c', '#f4f4f4', '#c84aa8'])
    // Crates of fruit on the pavement under the window.
    for (const [x, fruit] of [[5, '#e83a2a'], [17, '#f29a2a'], [29, '#9ad83a']] as const) {
      px(x, 57, 11, 7, '#7a5232')
      px(x, 57, 11, 1, '#a8784a')
      px(x + 1, 59, 9, 1, '#5a3a20')
      for (let fx = x + 1; fx < x + 10; fx += 2) {
        px(fx, 55, 2, 2, fruit)
        px(fx, 55, 1, 1, tint(fruit, 0.4))
      }
    }
    for (const door of doorTiles(c)) {
      doorAt(px, door.x, door.y, { line: '#2a1a14', trim: '#d8d0c0', leaf: '#4a4a52', glass: '#a8d8f0' })
      px(door.x + 6, door.y + 9, 5, 2, '#3aa860')
    }
    // The ice chest.
    px(68, 50, 22, 13, '#2a4a7a')
    px(69, 51, 20, 11, '#f0f4f8')
    px(69, 51, 20, 2, '#c8d8e8')
    textCentred(px, 'ICE', 79, 54, '#2a6ad8')
    px(69, 60, 20, 2, '#a8b8c8')
    plinth(px, 0, c.h - 2, c.w, '#7a6a5e')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The barber's: the pole turning, a chair in the window, back in ten minutes. */
const barber: StampArt = {
  bleed: { ...EAVES, top: 2 },
  frames: 2,
  draw: (px, c) => {
    const roof = 22
    shingleRoof(px, -2, 0, c.w + 4, roof, MOSS_ROOF)
    sidingWall(px, 0, roof, c.w, c.h - roof, CREAM_SIDING)
    eaveShadow(px, 0, roof, c.w)
    signBoard(px, 14, roof + 3, c.w - 28, 9, 'BARBER', '#1e2e5a', '#f4f0e0', '#0e1630')
    barberPole(px, 3, 38, 18, c.frame)
    awning(px, 10, 37, 36, 4, '#2a4aa8', '#f4f4f4', 4)
    // The window: a chair, a mirror, a towel over the back of it.
    px(10, 43, 36, 19, '#2a2a30')
    px(11, 44, 34, 17, '#c8d8e0')
    px(11, 44, 34, 6, '#e0eaf0')
    px(30, 45, 12, 8, '#a8c0d0')
    px(31, 46, 10, 6, '#d8e8f0')
    px(18, 50, 8, 5, '#b82a2a')
    px(17, 49, 2, 7, '#8a1a1a')
    px(20, 55, 4, 4, '#c8ccd4')
    px(18, 59, 8, 1, '#8a8e96')
    px(19, 48, 6, 2, '#f4f4f4')
    px(12, 45, 1, 14, 'rgba(255, 255, 255, 0.4)')
    // The door, with the card on its hook.
    doorAt(px, 48, 48, { line: '#2a2a30', trim: '#f4f0e0', leaf: '#1e2e5a', glass: '#a8d0e8' })
    px(54, 53, 5, 3, '#f4f0e0')
    px(55, 54, 3, 1, '#3a3a40')
    plinth(px, 0, c.h - 2, c.w, '#8a8478')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The launderette: a run of washers behind the glass, steam off the roof. */
const laundromat: StampArt = {
  bleed: { left: 1, right: 3, top: 9 },
  frames: 2,
  draw: (px, c) => {
    const roof = 11
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#b8c0c8', base: '#98a0a8', lo: '#68707a' }, '#3e4048')
    px(76, -1, 4, 6, '#7a8088')
    px(75, -2, 6, 2, '#9aa2aa')
    puffs(px, 77, -4, c.frame, 'rgba(240, 244, 250, 0.75)')
    brickWall(px, 0, roof, c.w, c.h - roof, YELLOW_BRICK)
    eaveShadow(px, 0, roof, c.w)
    for (const x of [8, 72]) {
      lintel(px, x, 15, 14, '#a8a090')
      windowAt(px, x, 15, 14, 8, x === 8 ? BASIN_WINDOW : { ...BASIN_WINDOW, curtain: '#7ab8d8' })
    }
    // The sign, big and blue.
    px(2, 25, c.w - 4, 14, '#123a6a')
    px(3, 26, c.w - 6, 12, '#2a6ab8')
    px(3, 26, c.w - 6, 1, '#5a9ae0')
    text(px, 'LAUNDROMAT', 6, 28, '#0a2448', 2, 0.5)
    text(px, 'LAUNDROMAT', 5, 27, '#ffffff', 2, 0.5)
    // Washers in a row behind the big window; one is going.
    px(48, 42, 46, 20, '#2a3038')
    px(49, 43, 44, 18, '#b8d0dc')
    px(49, 43, 44, 4, '#d8e8f0')
    for (let i = 0; i < 4; i++) washer(px, 49 + i * 11, 48, i === 1 ? (c.frame ? '#6aa8f0' : '#3a7ad0') : '#5a6a7a')
    px(50, 44, 1, 16, 'rgba(255, 255, 255, 0.45)')
    // A smaller window the other side of the door, with the price card.
    px(3, 42, 26, 20, '#2a3038')
    px(4, 43, 24, 18, '#b8d0dc')
    washer(px, 5, 48, '#5a6a7a')
    washer(px, 16, 48, '#5a6a7a')
    px(6, 44, 14, 3, '#ffffff')
    text(px, '2.50', 7, 44, '#c83030')
    for (const door of doorTiles(c)) {
      px(door.x, door.y - 6, 16, 6, '#2a6ab8')
      glassDoors(px, door.x + 1, door.y, 14, '#3a4450', '#a8d0e8', '#d8dce4')
    }
    plinth(px, 0, c.h - 2, c.w, '#8a8070')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** A cheap hotel with its name down the corner in red neon. */
const hotel: StampArt = {
  bleed: { left: 1, right: 3, top: 2 },
  frames: 2,
  draw: (px, c) => {
    const roof = 7
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#8a7a6a', base: '#6a5e52', lo: '#443c34' }, '#3a3640')
    brickWall(px, 0, roof, c.w, c.h - roof, SOOT_BRICK)
    eaveShadow(px, 0, roof, c.w)
    for (const y of [11, 26]) {
      for (const x of [20, 40, 60]) {
        lintel(px, x, y, 10, '#a89a86')
        const lit = (x + y + c.frame * 7) % 3 === 0
        windowAt(px, x, y, 10, 10, lit ? { ...BASIN_WINDOW, glass: '#e8c068', glassHi: '#f8dc90' } : DARK_WINDOW)
      }
    }
    // The vertical sign.
    px(2, 6, 12, 42, '#0e0e14')
    px(3, 7, 10, 40, '#1e1a24')
    const on = c.frame === 0 ? '#ff4a5a' : '#ff7a86'
    'HOTEL'.split('').forEach((letter, i) => text(px, letter, 7, 9 + i * 7, on))
    px(14, 14, 3, 1, '#2a2a30')
    px(14, 40, 3, 1, '#2a2a30')
    canopy(px, 26, 43, 28, '#6a1a2a', 'INN')
    doorAt(px, 32, 48, { line: '#14141a', trim: '#8a7a5a', leaf: '#4a2a1e', glass: '#e8c068' })
    windowAt(px, 58, 51, 12, 8, DARK_WINDOW)
    plinth(px, 0, c.h - 2, c.w, '#5a524a')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The Blue Plate: a stainless diner, its name on the roof, a booth in every window. */
const diner: StampArt = {
  bleed: { left: 2, right: 3, top: 6 },
  frames: 2,
  draw: (px, c) => {
    // The barrel roof seen from above, ribbed.
    px(-2, 0, c.w + 4, 17, '#6a7078')
    px(-1, 1, c.w + 2, 15, '#b8c0ca')
    for (let y = 2; y < 15; y += 2) px(-1, y, c.w + 2, 1, '#d4dae2')
    px(-1, 15, c.w + 2, 1, '#8a929c')
    acUnit(px, 92, 7)
    // The sign stands on the roof.
    px(30, 12, 2, 5, '#3a3a42')
    px(80, 12, 2, 5, '#3a3a42')
    px(18, -6, 76, 18, '#0e2a5a')
    px(19, -5, 74, 16, '#f4f6fa')
    px(19, -5, 74, 1, '#ffffff')
    roundWindow(px, 28, 3, 6, '#2a5ab0', '#f4f6fa')
    px(25, 1, 7, 5, '#e8eef8')
    text(px, 'BLUE PLATE', 38, -1, '#1a4aa8', 1)
    text(px, 'DINER', 47, 5, c.frame === 0 ? '#e83a4a' : '#ff8a96', 1)
    // The front: chrome, a blue stripe, a band of windows, a ribbed skirt.
    const top = 17
    px(0, top, c.w, 2, '#f0f4f8')
    px(0, top + 2, c.w, 1, '#8a929c')
    px(0, top + 3, c.w, 3, '#2a6ac8')
    px(0, top + 3, c.w, 1, '#6aa0e8')
    px(0, top + 6, c.w, 13, '#3a4048')
    for (let x = 1; x < c.w - 1; x += 10) {
      px(x, top + 7, 9, 11, '#ffe8a8')
      px(x, top + 7, 9, 4, '#fff4cc')
      px(x + 1, top + 13, 7, 5, '#b8262c')
      px(x + 1, top + 13, 7, 1, '#e04a50')
      px(x + 3, top + 8, 3, 3, '#7a5a4a')
      px(x + 1, top + 8, 1, 3, 'rgba(255, 255, 255, 0.6)')
    }
    px(0, top + 19, c.w, 1, '#f0f4f8')
    for (let y = top + 20; y < c.h - 2; y += 2) {
      px(0, y, c.w, 1, '#c8ced6')
      px(0, y + 1, c.w, 1, '#9aa2ae')
    }
    px(0, top + 23, c.w, 2, '#2a6ac8')
    for (const door of doorTiles(c)) {
      px(door.x + 1, door.y - 3, 14, 19, '#5a626c')
      px(door.x + 2, door.y - 2, 12, 17, '#d8dee6')
      roundWindow(px, door.x + 8, door.y + 2, 3, '#8a929c', '#ffe8a8')
      px(door.x + 4, door.y + 8, 8, 2, '#a8b0ba')
      px(door.x + 1, door.y + 14, 14, 2, '#e8ecf0')
    }
    plinth(px, 0, c.h - 2, c.w, '#7a828c')
    groundShadow(px, c.w, top, c.h)
  },
}

/** A doughnut shop with a giant doughnut on the roof. */
const donuts: StampArt = {
  bleed: { left: 1, right: 3, top: 8 },
  draw: (px, c) => {
    const roof = 15
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#e8c8d0', base: '#c8a0ac', lo: '#8a6a76' }, '#4a4250')
    // The doughnut: pink icing, sprinkles, a hole you can see the sky through.
    px(36, -8, 24, 18, '#7a4a2a')
    px(37, -7, 22, 16, '#c8884a')
    px(38, -7, 20, 11, '#f48ab8')
    px(38, -7, 20, 2, '#ffb8d8')
    px(45, -3, 6, 5, '#7a4a2a')
    px(46, -2, 4, 3, '#2a2a36')
    for (const [sx, sy, sc] of [[40, -5, '#ffffff'], [53, -4, '#4ac8f0'], [42, 0, '#f2e04a'], [55, 1, '#ffffff'], [49, -6, '#7ae05a']] as const) {
      px(sx, sy, 2, 1, sc)
    }
    px(46, 10, 2, 5, '#3a3a42')
    stuccoWall(px, 0, roof, c.w, c.h - roof, { hi: '#f8dce4', base: '#f0c8d4', lo: '#d8a8b8', line: '#a07888' })
    eaveShadow(px, 0, roof, c.w)
    px(0, roof + 1, c.w, 7, '#ffffff')
    textCentred(px, 'DONUTS', c.w / 2, roof + 2, '#d83a7a')
    // The display case through the glass, then a door that says SOLD OUT.
    px(4, 25, 52, 21, '#3a2a30')
    px(5, 26, 50, 19, '#fff4f0')
    for (let row = 0; row < 3; row++) {
      for (let x = 7; x < 52; x += 6) {
        const icing = ['#f48ab8', '#7a4a2a', '#f4f0e0', '#f2c14e'][(x / 6 + row) % 4 | 0]
        px(x, 28 + row * 6, 4, 3, '#c8884a')
        px(x, 28 + row * 6, 4, 2, icing)
      }
      px(5, 31 + row * 6, 50, 1, '#d8c8c0')
    }
    doorAt(px, 64, 32, { line: '#3a2a30', trim: '#ffffff', leaf: '#d83a7a', glass: '#f8e8e8' })
    plinth(px, 0, c.h - 2, c.w, '#a08890')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** The garage: two roll-up doors, one up far enough to show a bumper, and tyres stacked by the office. */
const garage: StampArt = {
  bleed: { left: 1, right: 3 },
  draw: (px, c) => {
    const roof = 15
    tinRoof(px, -1, 0, c.w + 2, roof, TIN)
    stoneWall(px, 0, roof, c.w, c.h - roof, BLOCK, 10)
    eaveShadow(px, 0, roof, c.w)
    signBoard(px, 46, roof + 2, 52, 9, 'AUTO REPAIR', '#b82a20', '#fff4e0', '#5a1410')
    // The bays.
    rollerShutter(px, 6, 27, 34, 21, '#9aa2a8')
    rollerShutter(px, 50, 27, 34, 10, '#9aa2a8')
    px(50, 37, 34, 11, '#1a1a20')
    px(53, 40, 28, 8, '#b82a2a')
    px(53, 40, 28, 2, '#e04a4a')
    px(55, 43, 4, 2, '#fff4c8')
    px(75, 43, 4, 2, '#fff4c8')
    px(60, 45, 14, 2, '#c8ccd4')
    // Tyres, and the office.
    for (const [tx, ty] of [[90, 40], [90, 34], [97, 40]]) {
      px(tx, ty, 7, 6, '#1a1a1e')
      px(tx + 2, ty + 2, 3, 2, '#4a4a52')
    }
    windowAt(px, 108, 30, 14, 9, DARK_WINDOW)
    doorAt(px, 124, 32, { line: '#2a2a30', trim: '#8a8e94', leaf: '#4a5a6a', glass: '#7fbcd8' })
    plinth(px, 0, c.h - 2, c.w, '#6a6a66')
    groundShadow(px, c.w, roof, c.h)
  },
}

// ---------------------------------------------------------------------------
// Eastgate
// ---------------------------------------------------------------------------

/** Cream clapboard with green shutters, a moss-green roof and a porch over the door. */
const houseC: StampArt = {
  bleed: { ...EAVES, top: 4 },
  draw: (px, c) => {
    const roof = 28
    chimney(px, 12, -4, 8, '#7a6a5a', '#a8a090')
    shingleRoof(px, -2, 0, c.w + 4, roof, MOSS_ROOF)
    sidingWall(px, 0, roof, c.w, c.h - roof, CREAM_SIDING)
    eaveShadow(px, 0, roof, c.w)
    const shut = { ...BASIN_WINDOW, shutters: '#3a6a4a' }
    windowAt(px, 10, roof + 5, 10, 9, shut)
    windowAt(px, c.w - 20, roof + 5, 10, 9, shut)
    // Porch: a small roof on two posts.
    px(26, c.h - 22, 28, 4, MOSS_ROOF.line)
    px(27, c.h - 22, 26, 3, MOSS_ROOF.a)
    px(27, c.h - 22, 26, 1, MOSS_ROOF.hi)
    shadow(px, 27, c.h - 18, 26, 2, 0.35)
    px(28, c.h - 18, 2, 18, '#f4f0e4')
    px(50, c.h - 18, 2, 18, '#d8d0c0')
    doorAt(px, 32, c.h - 16, { line: '#2a2a22', trim: '#f4f0e4', leaf: '#5a3a24' })
    windowAt(px, 7, c.h - 13, 12, 8, shut)
    windowAt(px, c.w - 19, c.h - 13, 12, 8, shut)
    plinth(px, 0, c.h - 2, c.w, '#8a8070')
    groundShadow(px, c.w, roof, c.h)
  },
}

/**
 * Marcus's: a gable-end house, side-on to nothing, the porch light on and a
 * note taped to the door. The only door on Eastgate that opens.
 */
const marcus: StampArt = {
  bleed: { ...EAVES, top: 2 },
  draw: (px, c) => {
    const wallTop = 30
    const mid = c.w / 2
    // The roof, two slopes meeting at a ridge that runs away from you.
    px(-2, 0, c.w + 4, wallTop, SLATE_ROOF.line)
    px(-1, 1, mid, wallTop - 2, SLATE_ROOF.a)
    px(mid, 1, mid + 1, wallTop - 2, SLATE_ROOF.b)
    for (let y = 3; y < wallTop - 1; y += 3) {
      px(-1, y, mid, 1, SLATE_ROOF.seam)
      px(mid, y, mid + 1, 1, tint(SLATE_ROOF.seam, -0.2))
    }
    px(mid - 1, 0, 2, wallTop, SLATE_ROOF.ridge)
    px(mid - 1, 0, 1, wallTop, SLATE_ROOF.hi)
    // The gable end: a triangle of clapboard with a round window in it.
    for (let row = 0; row < 22; row++) {
      const half = Math.round(row * 1.85)
      const y = wallTop - 22 + row
      px(mid - half - 1, y, half * 2 + 2, 1, '#3a2a22')
      if (half > 1) px(mid - half, y, half * 2, 1, row % 3 === 2 ? MINT_SIDING.lo : MINT_SIDING.base)
    }
    roundWindow(px, mid, wallTop - 10, 4, '#f4f0e4', '#ffd27a')
    // Bargeboards along the slopes.
    for (let row = 0; row < 22; row++) {
      const half = Math.round(row * 1.85)
      const y = wallTop - 22 + row
      px(mid - half - 2, y, 2, 1, '#f4f0e4')
      px(mid + half, y, 2, 1, '#d8d0c0')
    }
    sidingWall(px, 0, wallTop, c.w, c.h - wallTop, MINT_SIDING)
    px(0, wallTop, c.w, 1, '#3a2a22')
    shadow(px, 0, wallTop + 1, c.w, 1, 0.35)
    // Lit windows: there is a game on tonight.
    const lit = { ...BASIN_WINDOW, glass: '#e8b858', glassHi: '#f8d888', curtain: '#b84a3a' }
    windowAt(px, 8, wallTop + 5, 13, 9, lit)
    windowAt(px, c.w - 21, wallTop + 5, 13, 9, lit)
    windowAt(px, 6, c.h - 13, 13, 8, BASIN_WINDOW)
    for (const door of doorTiles(c)) {
      doorAt(px, door.x, door.y, { line: '#2a2a22', trim: '#f4f0e4', leaf: '#8a2a24' })
      // The note: GAME 8PM.
      px(door.x + 6, door.y + 4, 5, 4, '#f8f4e0')
      px(door.x + 7, door.y + 5, 3, 1, '#3a3a40')
      px(door.x + 7, door.y + 6, 2, 1, '#3a3a40')
      wallLamp(px, door.x + 16, door.y + 2, '#ffe080')
      px(door.x + 15, door.y + 1, 5, 7, 'rgba(255, 220, 120, 0.25)')
    }
    // Two crates of beer by the step, for later.
    px(c.w - 17, c.h - 7, 7, 5, '#c89a3a')
    px(c.w - 17, c.h - 7, 7, 1, '#e8c060')
    px(c.w - 9, c.h - 7, 7, 5, '#c89a3a')
    px(c.w - 9, c.h - 7, 7, 1, '#e8c060')
    plinth(px, 0, c.h - 2, c.w, '#7a7266')
    groundShadow(px, c.w, wallTop, c.h)
  },
}

/** Yellow-painted brick, red roof, a dish on the wall and a bay window. */
const houseD: StampArt = {
  bleed: { ...EAVES, top: 2 },
  draw: (px, c) => {
    const roof = 26
    shingleRoof(px, -2, 0, c.w + 4, roof, BASIN_ROOF)
    brickWall(px, 0, roof, c.w, c.h - roof, YELLOW_BRICK)
    eaveShadow(px, 0, roof, c.w)
    dish(px, c.w - 12, roof + 3)
    windowAt(px, 8, roof + 6, 11, 9, { ...BASIN_WINDOW, curtain: '#5a8ac8' })
    windowAt(px, 34, roof + 6, 11, 9, BASIN_WINDOW)
    // A bay window, standing proud of the wall.
    px(4, c.h - 17, 24, 15, '#6a5a48')
    px(5, c.h - 16, 22, 13, '#ece2c8')
    for (const x of [6, 13, 20]) {
      px(x, c.h - 15, 6, 10, '#7fbcd8')
      px(x, c.h - 15, 6, 4, '#a8daf0')
      px(x, c.h - 15, 2, 1, '#ffffff')
    }
    px(4, c.h - 19, 24, 2, BASIN_ROOF.a)
    px(4, c.h - 19, 24, 1, BASIN_ROOF.hi)
    doorAt(px, 48, c.h - 16, { line: '#3a2a20', trim: '#ece2c8', leaf: '#3a4a7a' })
    plinth(px, 0, c.h - 2, c.w, '#8a7a62')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** A small pink cottage with more roof than house. */
const cottage: StampArt = {
  bleed: { ...EAVES, top: 4 },
  draw: (px, c) => {
    const roof = 24
    chimney(px, c.w - 16, -4, 8, '#8e4434', '#b0a898')
    shingleRoof(px, -2, 0, c.w + 4, roof, BASIN_ROOF)
    stuccoWall(px, 0, roof, c.w, c.h - roof, { hi: '#f4dcd4', base: '#e8c4b8', lo: '#d0a89c', line: '#a07a70' })
    eaveShadow(px, 0, roof, c.w)
    windowAt(px, 5, roof + 5, 12, 9, { ...BASIN_WINDOW, flowers: true })
    doorAt(px, 32, c.h - 16, { line: '#3a2a22', trim: '#f4f0e4', leaf: '#4a7a5a' })
    plinth(px, 0, c.h - 2, c.w, '#8a7a72')
    groundShadow(px, c.w, roof, c.h)
  },
}

/** A row of lock-up garages with a tag sprayed across one of the doors. */
const lockup: StampArt = {
  bleed: { left: 1, right: 3 },
  draw: (px, c) => {
    const roof = 14
    flatRoof(px, -1, 0, c.w + 2, roof, { hi: '#a8a8a0', base: '#888880', lo: '#5a5a54' }, '#3a3a40')
    stoneWall(px, 0, roof, c.w, c.h - roof, BLOCK, 10)
    eaveShadow(px, 0, roof, c.w)
    rollerShutter(px, 3, 22, 27, 26, '#8a8a7a')
    rollerShutter(px, 34, 22, 27, 26, '#7a8a9a')
    sprite(px, ['.##...##.', '#..#.#..#', '#.##.##.#', '.#..#..#.'], 8, 32, { '#': '#d83aa8' })
    sprite(px, ['##.#.#', '#..##.', '##.#.#'], 40, 34, { '#': '#3ac8e0' })
    plinth(px, 0, c.h - 2, c.w, '#6a6a64')
    groundShadow(px, c.w, roof, c.h)
  },
}

export const BASIN_BUILDINGS: Record<string, StampArt> = {
  'bakery-basin': bakery,
  'house-basin-a': houseA,
  'pawn-basin': pawn,
  'tenement-basin': tenement,
  'checks-basin': checks,
  'house-basin-b': houseB,
  'bingo-basin': bingo,
  patels,
  'barber-seventh': barber,
  laundromat,
  'hotel-seventh': hotel,
  'diner-blueplate': diner,
  'donuts-seventh': donuts,
  'garage-seventh': garage,
  'house-eastgate-a': houseC,
  'house-marcus': marcus,
  'house-eastgate-b': houseD,
  'cottage-eastgate': cottage,
  'lockup-eastgate': lockup,
}
