import type { StampArt } from '../stampArt'
import { icon, shadow, sprite, text, textCentred, textWidth, tint, type Px } from '../pixelArt'
import {
  archedWindow, awning, barrelRoof, brickWall, bulbs, doorAt, eaveShadow, flatRoof, glassDoors,
  groundShadow, plinth, puffs, roundWindow, sidingWall, slateRoof, stoneWall, stuccoWall, tinRoof, wallLamp,
  windowAt,
  type RoofPalette, type WallPalette, type WindowStyle,
} from './buildingParts'
import { doorTiles } from './townBasin'

/**
 * Crescent Harbor and Palm Cay: the coast.
 *
 * The harbour is a real city — dressed stone, slate mansards with dormers in
 * them, brass and black paint — and every frontage on the boulevard is a
 * different trade. Palm Cay is a resort island in pastel render under barrel
 * tiles, with thatch on the beach and tiki torches burning outside the casino.
 */

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

/** A classical column: base, fluted shaft lit down its left side, a capital. */
export function column(px: Px, x: number, y: number, h: number, stone: string, capital: string) {
  px(x - 1, y, 7, 2, capital)
  px(x - 1, y, 7, 1, tint(capital, 0.3))
  px(x, y + 2, 5, h - 4, stone)
  px(x, y + 2, 1, h - 4, tint(stone, 0.25))
  px(x + 2, y + 2, 1, h - 4, tint(stone, -0.12))
  px(x + 4, y + 2, 1, h - 4, tint(stone, -0.3))
  px(x - 1, y + h - 2, 7, 2, tint(stone, -0.15))
  px(x - 1, y + h - 2, 7, 1, tint(stone, 0.1))
}

/** A triangular pediment over a portico. */
export function pediment(px: Px, x: number, y: number, w: number, h: number, stone: string, line: string) {
  for (let row = 0; row < h; row++) {
    const half = Math.round(((row + 1) / h) * (w / 2))
    px(x + w / 2 - half, y + row, half * 2, 1, row === h - 1 ? line : stone)
    px(x + w / 2 - half, y + row, 1, 1, line)
    px(x + w / 2 + half - 1, y + row, 1, 1, line)
  }
  px(x, y + h, w, 2, tint(stone, 0.15))
  px(x, y + h + 2, w, 1, line)
}

/** A mansard roof: a steep slate slope with dormer windows set into it. */
export function mansard(px: Px, x: number, y: number, w: number, h: number, p: RoofPalette, dormers: number[], cresting?: string) {
  slateRoof(px, x, y, w, h, p)
  if (cresting) {
    for (let cx = x + 2; cx < x + w - 2; cx += 3) px(cx, y - 2, 1, 2, cresting)
    px(x + 1, y - 1, w - 2, 1, cresting)
  }
  for (const dx of dormers) {
    px(dx - 1, y + 3, 14, h - 6, p.line)
    px(dx, y + 4, 12, h - 8, '#d8d4cc')
    windowAt(px, dx + 2, y + 6, 8, h - 13, { frame: '#2a2a30', trim: '#f4f0e8', glass: '#5a7a98', glassHi: '#8aaac8', sill: '#d8d4cc' })
    px(dx - 2, y + 1, 16, 3, p.line)
    px(dx - 1, y + 1, 14, 2, p.ridge)
    px(dx, y + 1, 12, 1, p.hi)
  }
}

/** A torch on a pole, its flame flickering between two shapes. */
export function torch(px: Px, x: number, y: number, h: number, frame: number) {
  px(x, y + 4, 2, h - 4, '#6a4a2a')
  px(x, y + 4, 1, h - 4, '#8a6a3a')
  px(x - 1, y + 3, 4, 2, '#4a3a2a')
  const flame = frame % 2 === 0
    ? ['.#.', '###', '#o#']
    : ['#..', '##.', '#o#']
  sprite(px, flame, x - 1, y, { '#': '#ff8a2a', o: '#ffe060' })
}

/** A potted palm, for either side of a door. */
export function pottedPalm(px: Px, x: number, y: number) {
  px(x + 3, y + 10, 6, 6, '#b8603a')
  px(x + 3, y + 10, 6, 1, '#d8804a')
  px(x + 5, y + 4, 2, 6, '#7a5a30')
  for (const [lx, ly, lw] of [[0, 2, 5], [7, 2, 5], [2, 0, 3], [7, 0, 3], [1, 4, 3], [8, 4, 3]]) {
    px(x + lx, y + ly, lw, 2, '#2e8a4a')
    px(x + lx, y + ly, lw, 1, '#4aaa62')
  }
}

/** A car seen side-on through a showroom window. */
export function carSide(px: Px, x: number, y: number, body: string) {
  px(x + 4, y, 14, 5, tint(body, -0.3))
  px(x + 5, y + 1, 12, 4, '#7fbcd8')
  px(x + 10, y + 1, 1, 4, tint(body, -0.3))
  px(x, y + 4, 24, 6, tint(body, -0.35))
  px(x + 1, y + 4, 22, 5, body)
  px(x + 1, y + 4, 22, 1, tint(body, 0.35))
  px(x + 1, y + 7, 22, 1, '#e8eef4')
  for (const wx of [x + 3, x + 16]) {
    px(wx, y + 8, 5, 5, '#1a1a1e')
    px(wx + 1, y + 9, 3, 3, '#a8b0b8')
    px(wx + 2, y + 10, 1, 1, '#4a4e54')
  }
  px(x + 22, y + 5, 2, 1, '#fff4c8')
}

// ---------------------------------------------------------------------------
// Crescent Harbor
// ---------------------------------------------------------------------------

const HARBOR_SLATE: RoofPalette = {
  line: '#1a2030', ridge: '#6a7c96', hi: '#7a8ca6', a: '#4a5a72', b: '#5a6c86', seam: '#36425a', fascia: '#d8d4cc',
}
const LIMESTONE: WallPalette = { hi: '#dcd4c4', base: '#c8bfae', lo: '#b2a894', line: '#8a8070' }
const OXBLOOD: WallPalette = { hi: '#7a3a32', base: '#6a302a', lo: '#5a2622', line: '#3a1814' }
const HARBOR_BRICK: WallPalette = { hi: '#9a5a48', base: '#8a4e3e', lo: '#7a4232', line: '#5a2e22' }
const HARBOR_WINDOW: WindowStyle = {
  frame: '#1e2430', trim: '#f4f0e8', glass: '#5a7a98', glassHi: '#8aaac8', sill: '#d8d4cc',
}
const LIT: Partial<WindowStyle> = { glass: '#e8b858', glassHi: '#f8d888' }
const BRASS = '#c8a040'

/** The Harbour Room: oxblood brick, no name on the door, brass lamps and black railings. */
const club: StampArt = {
  bleed: { left: 2, right: 3, top: 3 },
  draw: (px, c) => {
    const { w, h } = c
    mansard(px, -2, 0, w + 4, 24, HARBOR_SLATE, [w / 2 - 6], '#2a2a30')
    brickWall(px, 0, 24, w, h - 24, OXBLOOD)
    eaveShadow(px, 0, 24, w)
    px(0, 24, w, 3, LIMESTONE.base)
    px(0, 24, w, 1, LIMESTONE.hi)
    for (const x of [8, w - 22]) {
      windowAt(px, x, 32, 14, 15, { ...HARBOR_WINDOW, ...LIT, curtain: '#8a1a24' })
      px(x - 1, 44, 16, 1, '#14141a')
      for (let bx = x; bx < x + 14; bx += 2) px(bx, 44, 1, 4, '#14141a')
    }
    // Stone surround, the door, its lamps, and a plaque that does not say what this is.
    for (const door of doorTiles(c)) {
      px(door.x - 3, door.y - 6, 22, 22, LIMESTONE.line)
      px(door.x - 2, door.y - 5, 20, 21, LIMESTONE.base)
      px(door.x - 2, door.y - 5, 20, 1, LIMESTONE.hi)
      doorAt(px, door.x, door.y, { line: '#0e0e12', trim: '#2a2a30', leaf: '#16241e', knob: BRASS })
      px(door.x + 7, door.y + 5, 2, 2, BRASS)
      for (const lx of [door.x - 8, door.y > 0 ? door.x + 21 : 0]) wallLamp(px, lx, door.y - 2, '#ffe080')
      px(door.x + 20, door.y + 6, 5, 4, BRASS)
      px(door.x + 21, door.y + 7, 3, 1, '#8a6a20')
    }
    // Area railings, spear-topped.
    for (const [x0, x1] of [[2, 26], [w - 26, w - 2]]) {
      px(x0, h - 8, x1 - x0, 1, '#14141a')
      for (let x = x0; x < x1; x += 3) {
        px(x, h - 9, 1, 8, '#14141a')
        px(x, h - 10, 1, 1, BRASS)
      }
    }
    plinth(px, 0, h - 2, w, '#7a7268')
    groundShadow(px, w, 24, h)
  },
}

/** Bellweather Supper Club: art deco limestone, a blade sign, a marquee in bulbs. */
const supper: StampArt = {
  bleed: { left: 2, right: 3, top: 6 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // A stepped deco crown with a sunburst.
    px(-1, 6, w + 2, 10, LIMESTONE.line)
    px(0, 7, w, 9, LIMESTONE.base)
    px(16, 0, w - 32, 8, LIMESTONE.line)
    px(17, 1, w - 34, 7, LIMESTONE.base)
    px(28, -5, w - 56, 7, LIMESTONE.line)
    px(29, -4, w - 58, 6, LIMESTONE.hi)
    for (let i = 0; i < 7; i++) px(w / 2 - 6 + i * 2, -3, 1, 4, '#d8b048')
    px(w / 2 - 2, -2, 5, 2, '#f2d068')
    stoneWall(px, 0, 16, w, h - 16, LIMESTONE, 16)
    // Fluted pilasters.
    for (const x of [0, w - 6]) {
      px(x, 8, 6, h - 10, LIMESTONE.hi)
      for (let fx = x + 1; fx < x + 6; fx += 2) px(fx, 10, 1, h - 14, LIMESTONE.lo)
    }
    // Round deco windows.
    roundWindow(px, 22, 30, 6, '#1e2430', '#e8b858')
    roundWindow(px, w - 22, 30, 6, '#1e2430', '#e8b858')
    // The blade sign down the middle.
    px(w / 2 - 6, 16, 12, 34, '#14141a')
    px(w / 2 - 5, 17, 10, 32, '#2a1a22')
    'SUPPER'.split('').forEach((letter, i) => text(px, letter, w / 2 - 1, 18 + i * 5, frame ? '#ff6a8a' : '#ff9ab0'))
    // The marquee over the door, curved at the ends.
    px(14, 50, w - 28, 6, '#14141a')
    px(15, 50, w - 30, 5, '#2a2a36')
    px(15, 50, w - 30, 1, '#d8b048')
    bulbs(px, 16, 54, Math.floor((w - 32) / 3) + 1, 3, frame)
    shadow(px, 14, 56, w - 28, 2, 0.35)
    for (const door of doorTiles(c)) {
      doorAt(px, door.x, door.y, { line: '#0e0e12', trim: '#d8b048', leaf: '#14141a', glass: '#e8b858', knob: BRASS })
    }
    windowAt(px, 6, 60, 14, 10, { ...HARBOR_WINDOW, ...LIT, bars: 'vertical' })
    windowAt(px, w - 20, 60, 14, 10, { ...HARBOR_WINDOW, ...LIT, bars: 'vertical' })
    plinth(px, 0, h - 2, w, '#8a8070')
    groundShadow(px, w, 16, h)
  },
}

/**
 * Harbor Card Room: a stone house of cards with a mansard of three dormers,
 * arched windows lit upstairs, and a portico with its name on the frieze.
 */
const cardroom: StampArt = {
  bleed: { left: 2, right: 3, top: 4, bottom: 4 },
  draw: (px, c) => {
    const { w, h } = c
    mansard(px, -2, 0, w + 4, 24, HARBOR_SLATE, [12, w / 2 - 6, w - 24], '#4a9a8a')
    stoneWall(px, 0, 24, w, h - 24, LIMESTONE, 10)
    eaveShadow(px, 0, 24, w)
    // Cornice with dentils.
    px(0, 24, w, 3, LIMESTONE.hi)
    for (let x = 1; x < w; x += 3) px(x, 27, 2, 1, LIMESTONE.line)
    // Upstairs: tall arched windows between pilasters.
    for (const x of [6, 26, w - 36, w - 16]) archedWindow(px, x, 31, 10, 17, { ...HARBOR_WINDOW, ...LIT })
    for (const x of [2, 20, w - 22, w - 4]) {
      px(x, 29, 2, 22, LIMESTONE.hi)
      px(x + 2, 29, 1, 22, LIMESTONE.lo)
    }
    // The portico: pediment, frieze with the name, two columns each side of the doors.
    const px0 = 36
    const pw = w - 72
    pediment(px, px0 - 2, 26, pw + 4, 9, LIMESTONE.hi, LIMESTONE.line)
    icon(px, 'spade', w / 2 - 2, 29, '#2a3a5a')
    px(px0, 38, pw, 8, '#2a2a30')
    px(px0 + 1, 39, pw - 2, 6, '#3a3a44')
    textCentred(px, 'CARD ROOM', w / 2, 40, '#e8c868')
    for (const x of [px0 + 1, px0 + 9, w - px0 - 15, w - px0 - 7]) column(px, x, 46, h - 48, '#e4dccc', '#d8b048')
    shadow(px, px0 + 14, 46, pw - 28, h - 48, 0.35)
    for (const door of doorTiles(c)) {
      px(door.x - 2, door.y - 4, 20, 20, '#2a2018')
      for (const dx of [door.x - 1, door.x + 8]) {
        px(dx, door.y - 3, 8, 19, '#5a3420')
        px(dx + 1, door.y - 2, 6, 7, '#e8b858')
        px(dx + 1, door.y - 2, 2, 1, '#fff4c8')
        px(dx + 1, door.y + 7, 6, 6, '#4a2a18')
      }
      px(door.x + 6, door.y + 6, 1, 2, BRASS)
      px(door.x + 9, door.y + 6, 1, 2, BRASS)
    }
    // Lanterns on posts, and stone steps down to the quay.
    for (const x of [10, w - 13]) {
      px(x + 1, 56, 2, h - 58, '#14141a')
      px(x, 52, 4, 5, '#14141a')
      px(x + 1, 53, 2, 3, '#ffe080')
    }
    plinth(px, 0, h - 2, w, '#8a8070')
    px(px0 + 4, h, pw - 8, 2, LIMESTONE.hi)
    px(px0 + 4, h + 2, pw - 8, 2, LIMESTONE.base)
    px(px0 + 4, h + 3, pw - 8, 1, LIMESTONE.lo)
    groundShadow(px, w, 24, h)
  },
}

/** Harbor Menswear: a narrow green shopfront, two dummies in suits, TAILOR in gold leaf. */
const menswear: StampArt = {
  bleed: { left: 2, right: 3, top: 3 },
  draw: (px, c) => {
    const { w, h } = c
    mansard(px, -2, 0, w + 4, 22, HARBOR_SLATE, [w / 2 - 6])
    brickWall(px, 0, 22, w, h - 22, HARBOR_BRICK)
    eaveShadow(px, 0, 22, w)
    // A bay window upstairs, proud of the wall.
    px(14, 27, w - 28, 18, '#1e2430')
    px(15, 28, w - 30, 16, '#f4f0e8')
    for (let x = 16; x < w - 16; x += 13) {
      px(x, 29, 11, 13, '#5a7a98')
      px(x, 29, 11, 5, '#8aaac8')
      px(x, 29, 3, 1, '#ffffff')
    }
    px(12, 45, w - 24, 2, HARBOR_SLATE.a)
    px(12, 45, w - 24, 1, HARBOR_SLATE.hi)
    // Shopfront.
    px(0, 48, w, h - 48, '#14261e')
    px(0, 48, w, 8, '#1e3a2e')
    px(0, 48, w, 1, '#3a6a54')
    textCentred(px, 'TAILOR', w / 2, 50, '#e8c868')
    px(2, 57, 30, 21, '#0e1a14')
    px(3, 58, 28, 19, '#c8d0d0')
    px(3, 58, 28, 3, '#e4ecec')
    // Two dummies: charcoal and navy.
    for (const [mx, suit] of [[7, '#3a3a44'], [19, '#1e2e5a']] as const) {
      px(mx + 2, 60, 3, 3, '#d8c8b0')
      px(mx, 63, 7, 9, suit)
      px(mx + 3, 63, 1, 5, '#f4f4f4')
      px(mx + 3, 64, 1, 2, '#b82a2a')
      px(mx + 3, 72, 1, 4, '#8a8e94')
      px(mx + 1, 76, 5, 1, '#8a8e94')
    }
    px(4, 59, 1, 17, 'rgba(255, 255, 255, 0.5)')
    for (const door of doorTiles(c)) {
      doorAt(px, door.x, door.y, { line: '#0e1a14', trim: '#3a6a54', leaf: '#1e3a2e', glass: '#c8d0d0', knob: BRASS })
    }
    // A hanging pair of scissors on a bracket.
    px(w - 12, 58, 8, 1, '#14141a')
    sprite(px, ['#.#', '#.#', '.#.', '#.#', '#.#'], w - 10, 60, { '#': '#c8ccd4' })
    plinth(px, 0, h - 2, w, '#5a5a56')
    groundShadow(px, w, 22, h)
  },
}

/** Auto Row: a sawtooth showroom, flags on a string, a red convertible behind the glass. */
const autorow: StampArt = {
  bleed: { left: 2, right: 3 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // Sawtooth roof: north-light skylights in a row.
    px(-2, 0, w + 4, 20, '#2a2e36')
    for (let x = -1; x < w + 1; x += 16) {
      px(x, 2, 15, 16, '#7a8290')
      px(x, 2, 15, 1, '#a8b0bc')
      px(x + 1, 4, 8, 12, '#8ab8d8')
      px(x + 1, 4, 8, 3, '#b8dcf0')
      px(x + 10, 4, 4, 12, '#5a6270')
    }
    px(-2, 18, w + 4, 2, '#1a1e26')
    // White-painted brick band with the name on it.
    brickWall(px, 0, 20, w, 20, { hi: '#f4f4f0', base: '#e8e8e2', lo: '#d4d4cc', line: '#b8b8b0' })
    eaveShadow(px, 0, 20, w)
    const tw = textWidth('AUTO ROW', 2)
    text(px, 'AUTO ROW', Math.round((w - tw) / 2) + 1, 25, '#5a0a0a', 2)
    text(px, 'AUTO ROW', Math.round((w - tw) / 2), 24, '#c82a2a', 2)
    // Bunting.
    for (let x = 2; x < w - 2; x += 6) {
      const sag = Math.round(Math.sin((x / w) * Math.PI) * 3)
      const color = ['#d83a2a', '#f2c84a', '#2a6ad8', '#3aa860'][(x / 6 + frame) % 4 | 0]
      px(x, 36 + sag, 4, 1, color)
      px(x + 1, 37 + sag, 2, 1, color)
    }
    // The showroom: one great window and a convertible in it.
    px(0, 40, w, h - 40, '#c8ccd4')
    px(50, 42, w - 54, h - 46, '#1e2430')
    px(51, 43, w - 56, h - 48, '#a8c8dc')
    px(51, 43, w - 56, 10, '#c8e0ec')
    carSide(px, 64, 58, '#d82a2a')
    carSide(px, 96, 60, '#2a6ad8')
    px(52, 44, 1, h - 50, 'rgba(255, 255, 255, 0.55)')
    px(56, 44, 1, 14, 'rgba(255, 255, 255, 0.35)')
    px(4, 44, 24, 12, '#f2c84a')
    text(px, 'SALE', 8, 47, '#c82a2a')
    for (const door of doorTiles(c)) glassDoors(px, door.x + 1, door.y - 1, 14, '#5a6270', '#a8c8dc', '#e8eef4')
    plinth(px, 0, h - 2, w, '#7a7e86')
    groundShadow(px, w, 20, h)
  },
}

// ---------------------------------------------------------------------------
// Palm Cay
// ---------------------------------------------------------------------------

const TERRACOTTA: RoofPalette = {
  line: '#6a2a18', ridge: '#e8885a', hi: '#f09868', a: '#d06a42', b: '#b85a36', seam: '#8a3a22', fascia: '#f4ece0',
}
const BLUE_TIN: RoofPalette = {
  line: '#1a2a4a', ridge: '#7aa0d8', hi: '#8ab0e8', a: '#4a78c0', b: '#c8604a', seam: '#2a4a80', fascia: '#ffffff',
}
const PINK: WallPalette = { hi: '#fcd4cc', base: '#f2b8b0', lo: '#dc9c94', line: '#a8706a' }
const MINT: WallPalette = { hi: '#dcf4e8', base: '#bfe8d4', lo: '#9cd0b8', line: '#5e9a80' }
const LEMON: WallPalette = { hi: '#fcf0c0', base: '#f4e0a0', lo: '#dcc684', line: '#a8945a' }
const WEATHERBOARD: WallPalette = { hi: '#ffffff', base: '#eef2f4', lo: '#cdd6dc', line: '#8a9aa4' }
const TEAL = '#2a9a9a'
const CORAL = '#f0786a'
const ISLAND_WINDOW: WindowStyle = {
  frame: '#2a5a5a', trim: '#ffffff', glass: '#6ac8d8', glassHi: '#a8e8f0', sill: '#ffffff',
}

/** Marina Motors: a white boathouse with blue trim, life rings, and a speedboat in the bay. */
const marina: StampArt = {
  bleed: { left: 2, right: 3, top: 2 },
  draw: (px, c) => {
    const { w, h } = c
    tinRoof(px, -2, 0, w + 4, 20, BLUE_TIN)
    sidingWall(px, 0, 20, w, h - 20, WEATHERBOARD)
    eaveShadow(px, 0, 20, w)
    px(6, 22, w - 12, 10, '#1a3a6a')
    px(7, 23, w - 14, 8, '#2a5aa8')
    textCentred(px, 'MARINA MOTORS', w / 2 + 4, 25, '#ffffff')
    // An anchor at the start of the board.
    sprite(px, ['.#.', '###', '.#.', '#.#', '.#.'], 10, 24, { '#': '#f2c84a' })
    // Life rings either side.
    for (const lx of [4, w - 14]) {
      roundWindow(px, lx + 5, 40, 4, '#e83a2a', '#eef2f4')
      px(lx + 1, 39, 2, 2, '#ffffff')
      px(lx + 8, 39, 2, 2, '#ffffff')
    }
    // The boat bay, door rolled up, a speedboat on its trailer.
    px(2, 47, 40, 17, '#1a2a3a')
    px(2, 46, 40, 2, '#5a6a7a')
    px(5, 54, 32, 6, '#f4f4f4')
    px(5, 54, 32, 1, '#ffffff')
    px(5, 57, 32, 1, CORAL)
    px(9, 51, 10, 4, '#7fbcd8')
    px(9, 51, 10, 1, '#ffffff')
    px(3, 60, 36, 1, '#5a5e64')
    for (const tx of [9, 29]) px(tx, 60, 4, 3, '#1a1a1e')
    for (const door of doorTiles(c)) glassDoors(px, door.x + 1, door.y - 1, 14, '#2a5aa8', '#a8e8f0', '#ffffff')
    roundWindow(px, w - 18, 54, 4, '#2a5aa8', '#a8e8f0')
    plinth(px, 0, h - 2, w, '#9aa8b0')
    groundShadow(px, w, 20, h)
  },
}

/**
 * The Cay Room: pink render under terracotta, a curved Mission gable with the
 * name on it, an arcade of white arches, palms in pots and torches burning.
 */
const casinoCay: StampArt = {
  bleed: { left: 2, right: 3, top: 6, bottom: 8 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    barrelRoof(px, -2, 0, w + 4, 22, TERRACOTTA)
    stuccoWall(px, 0, 22, w, h - 22, PINK, 4)
    eaveShadow(px, 0, 22, w)
    // The Mission gable rising over the middle, with the name and a sun.
    const gx = 40
    const gw = w - 80
    for (let row = 0; row < 14; row++) {
      const inset = Math.round(Math.max(0, 6 - row) * 1.5)
      px(gx + inset, -6 + row, gw - inset * 2, 1, row === 0 ? PINK.line : PINK.base)
      px(gx + inset, -6 + row, 1, 1, PINK.line)
      px(gx + gw - inset - 1, -6 + row, 1, 1, PINK.line)
    }
    px(gx, 8, gw, 16, PINK.base)
    px(gx - 1, -6 + 6, 1, 30, PINK.line)
    px(gx + gw, -6 + 6, 1, 30, PINK.line)
    roundWindow(px, w / 2, 1, 4, '#f2c84a', '#ffe680')
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2
      px(w / 2 + Math.round(Math.cos(a) * 6), 1 + Math.round(Math.sin(a) * 6), 1, 1, '#f2c84a')
    }
    px(gx + 6, 10, gw - 12, 11, '#1e6a6a')
    px(gx + 7, 11, gw - 14, 9, TEAL)
    textCentred(px, 'CAY ROOM', w / 2, 13, '#ffffff')
    // Upstairs windows with shutters.
    for (const x of [10, 26, w - 36, w - 20]) windowAt(px, x, 28, 10, 11, { ...ISLAND_WINDOW, shutters: TEAL })
    // The arcade: white arches on columns, deep teal shade inside.
    px(0, 44, w, h - 46, '#ffffff')
    for (let x = 2; x < w - 2; x += 18) {
      px(x + 3, 48, 12, h - 50, '#1e5a5a')
      px(x + 4, 46, 10, 2, '#1e5a5a')
      px(x + 3, 48, 12, 4, '#164848')
      px(x, 46, 3, h - 48, '#f4ece0')
      px(x, 46, 1, h - 48, '#ffffff')
    }
    // Inside the arches: windows lit gold, machines glinting.
    for (let x = 6; x < w - 8; x += 18) {
      px(x, 56, 8, 10, '#e8b858')
      px(x, 56, 8, 3, '#f8d888')
      px(x + 3, 56, 1, 10, '#a8804a')
    }
    for (const door of doorTiles(c)) {
      px(door.x - 4, door.y - 2, 24, 18, '#1e5a5a')
      glassDoors(px, door.x - 3, door.y, 22, '#164848', '#6ac8d8', '#f2c84a')
      for (const tx of [door.x - 12, door.x + 25]) torch(px, tx, door.y - 6, 22, frame + (tx % 2))
      pottedPalm(px, door.x - 26, door.y)
      pottedPalm(px, door.x + 30, door.y)
    }
    plinth(px, 0, h - 2, w, '#d8b0a8')
    // A strip of red carpet across the sand to the door.
    for (const door of doorTiles(c)) {
      px(door.x, h, 16, 8, '#b82424')
      px(door.x, h, 1, 8, '#f2c84a')
      px(door.x + 15, h, 1, 8, '#f2c84a')
    }
    groundShadow(px, w, 22, h)
  },
}

/** A lemon-yellow resort hotel with striped balcony awnings. */
const hotelCay: StampArt = {
  bleed: { left: 2, right: 3, top: 4 },
  draw: (px, c) => {
    const { w, h } = c
    flatRoof(px, -1, 0, w + 2, 12, { hi: '#ffffff', base: '#e8e0c8', lo: '#b8ae96' }, '#5a8a9a')
    px(10, -4, 40, 9, '#1e6a6a')
    px(11, -3, 38, 7, TEAL)
    text(px, 'HOTEL', 20, -2, '#ffffff')
    stuccoWall(px, 0, 12, w, h - 12, LEMON, 6)
    eaveShadow(px, 0, 12, w)
    for (const y of [16, 34]) {
      for (let x = 6; x < w - 14; x += 24) {
        awning(px, x - 2, y, 18, 3, x % 48 === 6 ? CORAL : TEAL, '#ffffff', 2)
        windowAt(px, x + 2, y + 5, 10, 9, ISLAND_WINDOW)
        // Balcony rail.
        px(x - 2, y + 15, 18, 1, '#ffffff')
        for (let bx = x - 2; bx < x + 16; bx += 2) px(bx, y + 15, 1, 3, '#ffffff')
      }
    }
    doorAt(px, w / 2 - 8, h - 16, { line: '#2a5a5a', trim: '#ffffff', leaf: TEAL, glass: '#a8e8f0' })
    plinth(px, 0, h - 2, w, '#c8b88a')
    groundShadow(px, w, 12, h)
  },
}

/** Cay Boutique: mint render, a scalloped teal awning, a sun hat in the window. */
const boutique: StampArt = {
  bleed: { left: 2, right: 3 },
  draw: (px, c) => {
    const { w, h } = c
    barrelRoof(px, -2, 0, w + 4, 15, TERRACOTTA)
    stuccoWall(px, 0, 15, w, h - 15, MINT, 8)
    eaveShadow(px, 0, 15, w)
    textCentred(px, 'BOUTIQUE', w / 2, 18, '#1e6a6a')
    awning(px, 2, 24, w - 4, 4, TEAL, '#ffffff', 3)
    px(4, 32, 24, 14, '#2a5a5a')
    px(5, 33, 22, 12, '#f4fafa')
    // A sun hat on a stand, a straw bag, a dress.
    px(8, 35, 9, 2, '#e8c878')
    px(10, 33, 5, 2, '#e8c878')
    px(10, 35, 5, 1, CORAL)
    px(12, 37, 1, 6, '#8a8e94')
    px(19, 36, 6, 8, '#f48ab8')
    px(20, 35, 4, 1, '#f48ab8')
    px(6, 34, 1, 10, 'rgba(255, 255, 255, 0.6)')
    for (const door of doorTiles(c)) doorAt(px, door.x, door.y, { line: '#2a5a5a', trim: '#ffffff', leaf: TEAL, glass: '#a8e8f0' })
    windowAt(px, w - 26, 33, 20, 10, { ...ISLAND_WINDOW, flowers: true })
    plinth(px, 0, h - 2, w, '#a8c8b8')
    groundShadow(px, w, 15, h)
  },
}

/** Shoreline Grill: a thatched beach shack, a surfboard for a sign, the grill smoking. */
const grill: StampArt = {
  bleed: { left: 3, right: 4, top: 10 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // Thatch, with a ragged fringe.
    px(-3, 0, w + 6, 18, '#7a5a2a')
    for (let y = 0; y < 17; y += 2) {
      for (let x = -3; x < w + 3; x += 3) {
        px(x + (y % 4 === 0 ? 0 : 1), y, 2, 2, y % 4 === 0 ? '#c8a050' : '#a8823e')
      }
    }
    for (let x = -3; x < w + 3; x += 2) px(x, 17, 1, 2 + (x % 3), '#a8823e')
    // Bamboo walls.
    px(0, 18, w, h - 18, '#b89c58')
    for (let x = 0; x < w; x += 3) {
      px(x, 18, 1, h - 18, '#6a5428')
      px(x + 1, 18, 1, h - 18, '#dcc47c')
    }
    shadow(px, 0, 18, w, 3, 0.4)
    // The surfboard sign.
    px(10, 21, 44, 9, '#1e5a7a')
    px(12, 20, 40, 11, '#1e5a7a')
    px(13, 21, 38, 9, '#f4f0e0')
    px(13, 25, 38, 1, CORAL)
    textCentred(px, 'GRILL', 32, 22, '#1e5a7a')
    windowAt(px, 6, 33, 20, 10, { ...ISLAND_WINDOW, bars: 'none' })
    for (const door of doorTiles(c)) {
      px(door.x + 2, door.y - 2, 12, 18, '#4a3418')
      px(door.x + 3, door.y - 1, 10, 17, '#8a6a30')
      for (let y = door.y; y < door.y + 16; y += 3) px(door.x + 3, y, 10, 1, '#6a5024')
    }
    // The grill, smoking, and torches.
    px(w - 16, h - 10, 12, 4, '#2a2a30')
    px(w - 15, h - 11, 10, 2, '#e85a2a')
    px(w - 14, h - 6, 1, 6, '#2a2a30')
    px(w - 6, h - 6, 1, 6, '#2a2a30')
    puffs(px, w - 11, h - 14, frame)
    torch(px, -2, h - 22, 22, frame)
    torch(px, w + 1, h - 22, 22, frame + 1)
    plinth(px, 0, h - 2, w, '#8a7a50')
  },
}

export const COAST_BUILDINGS: Record<string, StampArt> = {
  'club-harbor': club,
  'supper-harbor': supper,
  'cardroom-harbor': cardroom,
  'menswear-harbor': menswear,
  'autorow-harbor': autorow,
  'marina-palmcay': marina,
  'casino-palmcay': casinoCay,
  'hotel-palmcay': hotelCay,
  'boutique-palmcay': boutique,
  'grill-palmcay': grill,
}

