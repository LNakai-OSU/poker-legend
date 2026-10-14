import type { StampArt } from '../stampArt'
import { neonText, shadow, sprite, text, textCentred, textWidth, tint, type Px } from '../pixelArt'
import {
  archedWindow, awning, barrelRoof, bulbs, eaveShadow, flatRoof, glassDoors, groundShadow,
  plinth, roundWindow, stoneWall, windowAt,
  type RoofPalette, type WallPalette, type WindowStyle,
} from './buildingParts'
import { doorTiles } from './townBasin'
import { column, mansard, pediment, pottedPalm } from './townCoast'

/**
 * Neon Mesa and Porto Lumina: the top of the ladder.
 *
 * The Strip is black glass, gold and neon tubing, and every frontage is trying
 * to be the loudest thing in the desert. Porto Lumina is white marble, gold and
 * verdigris copper — columns, a dome, a tower with a penthouse on top — and
 * very quiet about how much it all cost.
 */

// ---------------------------------------------------------------------------
// Neon Mesa
// ---------------------------------------------------------------------------

const PINK_NEON = { core: '#ffd2f6', tube: '#ff4fd8', glow: '#7a1a6a' }
const CYAN_NEON = { core: '#d2fbff', tube: '#4fe8ff', glow: '#145a6a' }
const GOLD = '#f2c84a'
const GOLD_DARK = '#a8801e'

/** A curtain wall of dark glass in a grid, with a glint running across it. */
function glassGrid(px: Px, x: number, y: number, w: number, h: number, glass: string, frame: string, pane = 8) {
  px(x, y, w, h, frame)
  for (let gy = y + 1; gy < y + h - 1; gy += 6) {
    for (let gx = x + 1; gx < x + w - 1; gx += pane) {
      const pw = Math.min(pane - 1, x + w - 1 - gx)
      const ph = Math.min(5, y + h - 1 - gy)
      px(gx, gy, pw, ph, glass)
      px(gx, gy, pw, 1, tint(glass, 0.18))
    }
  }
  // A reflection sliding diagonally across the panes.
  for (let i = 0; i < Math.min(w, h); i += 1) {
    if ((i + Math.floor(w / 3)) % 1 === 0 && x + i + Math.floor(w / 3) < x + w - 1) {
      px(x + Math.floor(w / 3) + i, y + 1 + i, 2, 1, 'rgba(255, 255, 255, 0.12)')
    }
  }
}

/** A neon tube along an edge: a bright core with a dim glow either side. */
function tube(px: Px, x: number, y: number, w: number, h: number, n: { core: string; tube: string; glow: string }) {
  if (w >= h) {
    px(x, y - 1, w, 1, n.glow)
    px(x, y, w, h, n.tube)
    px(x, y + h, w, 1, n.glow)
    px(x, y, w, 1, n.core)
  } else {
    px(x - 1, y, 1, h, n.glow)
    px(x, y, w, h, n.tube)
    px(x + w, y, 1, h, n.glow)
    px(x, y, 1, h, n.core)
  }
}

/** A starburst that flips between a cross and a saltire. */
function starburst(px: Px, cx: number, cy: number, frame: number, color: string) {
  const shape = frame % 2 === 0
    ? ['...#...', '...#...', '...#...', '###o###', '...#...', '...#...', '...#...']
    : ['#.....#', '.#...#.', '..#.#..', '...o...', '..#.#..', '.#...#.', '#.....#']
  sprite(px, shape, cx - 3, cy - 3, { '#': color, o: '#ffffff' })
}

/**
 * The Mesa Casino: a sign the width of the building with MESA in pink neon,
 * gold glass above a marquee that runs the whole frontage, and a red carpet.
 */
const casinoMesa: StampArt = {
  bleed: { left: 2, right: 3, bottom: 12 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // The sign.
    px(-2, 0, w + 4, 32, '#08060e')
    px(-1, 1, w + 2, 30, '#140c1e')
    tube(px, 2, 3, w - 4, 1, PINK_NEON)
    tube(px, 2, 27, w - 4, 1, PINK_NEON)
    tube(px, 2, 3, 1, 25, PINK_NEON)
    tube(px, w - 3, 3, 1, 25, PINK_NEON)
    const word = 'MESA'
    const ww = textWidth(word, 4)
    neonText(px, word, Math.round((w - ww) / 2), 6, frame ? '#ffe0fa' : PINK_NEON.tube, PINK_NEON.glow, 4)
    starburst(px, 22, 15, frame, '#ffe14f')
    starburst(px, w - 22, 15, frame + 1, CYAN_NEON.tube)
    starburst(px, 40, 9, frame + 1, CYAN_NEON.tube)
    starburst(px, w - 40, 21, frame, '#ffe14f')
    // Gold glass.
    px(0, 32, w, 2, GOLD)
    glassGrid(px, 0, 34, w, 26, '#3a2a18', GOLD_DARK)
    for (let y = 35; y < 59; y += 6) {
      for (let x = 1; x < w - 1; x += 8) if ((x * 7 + y + frame * 5) % 11 === 0) px(x, y, 7, 5, '#ffd27a')
    }
    tube(px, 1, 34, 1, 26, CYAN_NEON)
    tube(px, w - 2, 34, 1, 26, CYAN_NEON)
    // The marquee: gold edges, two rows of chasing bulbs, CASINO on white.
    px(0, 58, w, 16, '#1a1024')
    px(4, 58, w - 8, 16, '#2a1a08')
    px(5, 59, w - 10, 14, '#f4f0e4')
    px(5, 59, w - 10, 1, GOLD)
    px(5, 72, w - 10, 1, GOLD)
    bulbs(px, 6, 60, Math.floor((w - 12) / 3) + 1, 3, frame)
    bulbs(px, 7, 71, Math.floor((w - 12) / 3), 3, frame + 1)
    const cw = textWidth('CASINO', 2)
    text(px, 'CASINO', Math.round((w - cw) / 2) + 1, 62, '#7a1010', 2)
    text(px, 'CASINO', Math.round((w - cw) / 2), 61, '#d8202a', 2)
    text(px, 'OPEN 24 HRS', 10, 63, '#3a3a48')
    text(px, 'POKER  CRAPS', w - 10 - textWidth('POKER  CRAPS'), 63, '#3a3a48')
    shadow(px, 4, 74, w - 8, 2, 0.4)
    // The floor through the glass: machines, glowing.
    px(0, 73, w, h - 73, '#1a1024')
    for (let x = 4; x < w - 4; x += 7) {
      px(x, 78, 5, 12, '#5a2a7a')
      px(x, 78, 5, 2, (x + frame) % 2 ? '#ffe14f' : '#ff8a3a')
      px(x + 1, 81, 3, 2, '#e8e8f0')
    }
    for (const x of [58, w - 62]) {
      px(x, 73, 4, h - 75, GOLD_DARK)
      px(x + 1, 73, 1, h - 75, GOLD)
    }
    for (const door of doorTiles(c)) {
      px(door.x - 10, door.y - 2, 36, 18, '#2a1a08')
      glassDoors(px, door.x - 9, door.y - 1, 16, GOLD_DARK, '#3a2a4a', GOLD)
      glassDoors(px, door.x + 9, door.y - 1, 16, GOLD_DARK, '#3a2a4a', GOLD)
    }
    // A neon cactus on the left, a pair of dice on the right.
    sprite(px, ['..#..', '#.#..', '#.#.#', '###.#', '..###', '..#..', '..#..', '..#..'], 6, 77, { '#': '#5aff7a' })
    px(w - 18, 78, 7, 7, '#f4f4f4')
    px(w - 16, 80, 1, 1, '#d8202a')
    px(w - 14, 82, 1, 1, '#d8202a')
    px(w - 11, 82, 6, 6, '#f4f4f4')
    px(w - 9, 84, 1, 1, '#d8202a')
    plinth(px, 0, h - 2, w, '#3a2a18')
    // Red carpet and its ropes.
    for (const door of doorTiles(c)) {
      px(door.x - 6, h, 28, 12, '#7a1414')
      px(door.x - 5, h, 26, 12, '#c82424')
      px(door.x - 5, h, 1, 12, GOLD)
      px(door.x + 20, h, 1, 12, GOLD)
      for (const post of [door.x - 10, door.x + 24]) {
        for (const py of [h + 2, h + 9]) {
          px(post, py, 2, 3, GOLD_DARK)
          px(post, py, 2, 1, '#ffe080')
        }
        px(post, h + 4, 1, 5, '#8a1a2a')
      }
    }
    groundShadow(px, w, 32, h)
  },
}

/** Mesa Luxury: black glass ruled in gold, a watch and a handbag spot-lit in the window. */
const luxury: StampArt = {
  bleed: { left: 1, right: 3 },
  draw: (px, c) => {
    const { w, h } = c
    px(-1, 0, w + 2, 7, GOLD_DARK)
    px(0, 0, w, 2, GOLD)
    px(4, 2, w - 8, 3, '#1a1408')
    glassGrid(px, 0, 7, w, 52, '#0e0e16', GOLD_DARK, 10)
    for (const [x, y] of [[11, 14], [41, 26], [21, 38], [61, 44]]) px(x, y, 9, 5, '#f8e0a0')
    px(0, 59, w, 12, '#08080c')
    px(0, 59, w, 1, GOLD)
    px(0, 70, w, 1, GOLD)
    const lw = textWidth('LUXURY', 2)
    text(px, 'LUXURY', Math.round((w - lw) / 2), 60, GOLD, 2)
    px(0, 71, w, h - 71, '#14141a')
    for (const [x, item] of [[3, 'watch'], [52, 'bag']] as const) {
      px(x, 74, 25, 19, GOLD_DARK)
      px(x + 1, 75, 23, 17, '#1a1a22')
      px(x + 7, 75, 11, 17, 'rgba(255, 240, 200, 0.12)')
      px(x + 8, 87, 9, 4, '#e8e4dc')
      if (item === 'watch') {
        px(x + 10, 81, 5, 5, GOLD)
        px(x + 11, 82, 3, 3, '#f4f4f4')
        px(x + 12, 82, 1, 2, '#1a1a22')
        px(x + 11, 79, 3, 2, '#2a2a30')
        px(x + 11, 86, 3, 1, '#2a2a30')
      } else {
        px(x + 9, 81, 8, 6, '#b82a3a')
        px(x + 10, 79, 6, 1, '#8a1a2a')
        px(x + 10, 79, 1, 2, '#8a1a2a')
        px(x + 15, 79, 1, 2, '#8a1a2a')
        px(x + 12, 83, 2, 1, GOLD)
      }
    }
    for (const door of doorTiles(c)) {
      px(door.x - 4, door.y - 4, 24, 3, '#08080c')
      px(door.x - 4, door.y - 2, 24, 1, GOLD)
      glassDoors(px, door.x + 1, door.y, 14, GOLD_DARK, '#2a2a3a', GOLD)
    }
    plinth(px, 0, h - 2, w, '#2a2a30')
    groundShadow(px, w, 7, h)
  },
}

/** Mesa Motors: parking decks over a showroom, a yellow car turning on a plinth. */
const motors: StampArt = {
  bleed: { left: 1, right: 3 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    px(-1, 0, w + 2, 16, '#08080e')
    const mw = textWidth('MOTORS', 2)
    neonText(px, 'MOTORS', Math.round((w - mw) / 2), 3, CYAN_NEON.core, CYAN_NEON.glow, 2)
    for (const y of [5, 9, 13]) {
      px(4, y, 8 + (y % 3) * 2, 1, CYAN_NEON.tube)
      px(w - 12 - (y % 3) * 2, y, 8 + (y % 3) * 2, 1, CYAN_NEON.tube)
    }
    // Two decks of parking, cars seen from above.
    for (const [y, seed] of [[16, 1], [32, 2]]) {
      px(0, y, w, 16, '#3a3a44')
      px(0, y, w, 3, '#b8bcc4')
      px(0, y, w, 1, '#d8dce4')
      px(0, y + 3, w, 11, '#1e1e26')
      for (let x = 3; x < w - 8; x += 13) {
        const color = ['#d82a2a', '#2a6ad8', '#f2c84a', '#e8e8f0', '#3aa860'][(x + seed * 3) % 5]
        if ((x + seed) % 3 === 0) continue
        px(x, y + 5, 10, 7, tint(color, -0.4))
        px(x + 1, y + 5, 8, 6, color)
        px(x + 2, y + 6, 6, 2, '#2a3440')
        px(x + 1, y + 5, 8, 1, tint(color, 0.4))
      }
    }
    // The showroom.
    px(0, 48, w, h - 48, '#c8ccd4')
    px(2, 50, w - 4, h - 54, '#14141c')
    // Spotlights on the turntable.
    for (const [sx, dir] of [[64, 1], [w - 8, -1]] as const) {
      for (let i = 0; i < 26; i++) {
        px(sx + dir * Math.round(i * 0.6), 51 + i, 2 + Math.round(i / 4), 1, 'rgba(255, 250, 220, 0.08)')
      }
    }
    // The turntable, right of the door, and the car turning on it.
    const tx = 84
    px(tx - 22, 80, 44, 8, '#2a2a36')
    px(tx - 20, 80, 40, 6, '#4a4a5a')
    px(tx - 20, 80, 40, 1, '#7a7a8a')
    const shift = frame ? 1 : 0
    px(tx - 16 + shift, 70, 32, 9, '#a87a10')
    px(tx - 15 + shift, 70, 30, 8, '#ffd21e')
    px(tx - 15 + shift, 70, 30, 1, '#fff08a')
    px(tx - 9 + shift, 66, 16, 5, '#ffd21e')
    px(tx - 8 + shift, 67, 14, 3, '#2a3440')
    px(tx - 12 + shift, 77, 6, 4, '#14141a')
    px(tx + 6 + shift, 77, 6, 4, '#14141a')
    // A sales desk the other side, with its price board.
    px(10, 76, 24, 10, '#3a3a48')
    px(10, 76, 24, 2, '#c8ccd4')
    px(12, 58, 20, 12, '#f4f0e4')
    px(12, 58, 20, 1, CYAN_NEON.tube)
    text(px, '0 DOWN', 13, 61, '#d8202a')
    px(4, 52, 1, h - 58, 'rgba(255, 255, 255, 0.35)')
    for (const door of doorTiles(c)) glassDoors(px, door.x + 1, door.y - 1, 14, '#5a6270', '#3a4a5a', '#e8eef4')
    plinth(px, 0, h - 2, w, '#5a5e66')
    groundShadow(px, w, 16, h)
  },
}

/** Ultraviolet: black, lightning in UV neon, searchlights, and a rope to queue behind. */
const ultraviolet: StampArt = {
  bleed: { left: 1, right: 3, top: 14, bottom: 10 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // Searchlights sweeping the sky.
    for (const [bx, lean] of [[18, frame ? -1 : 1], [w - 20, frame ? 1 : -1]] as const) {
      for (let i = 0; i < 24; i++) {
        px(bx + Math.round(lean * i * 0.5), -i + 6, 3 + Math.round(i / 6), 1, 'rgba(200, 160, 255, 0.16)')
      }
      px(bx - 1, 6, 6, 4, '#3a3a48')
      px(bx, 6, 4, 2, '#e8e0ff')
    }
    flatRoof(px, -1, 0, w + 2, 10, { hi: '#3a3050', base: '#2a2238', lo: '#14101e' }, '#1a1424')
    px(0, 10, w, h - 10, '#0e0818')
    for (let y = 12; y < 58; y += 4) px(0, y, w, 1, '#140c22')
    const violet = { core: '#f0d8ff', tube: '#b46cff', glow: '#3a1a6a' }
    const uw = textWidth('ULTRA', 2)
    const vw = textWidth('VIOLET', 2)
    neonText(px, 'ULTRA', Math.round((w - uw) / 2), 16, frame ? violet.core : violet.tube, violet.glow, 2)
    neonText(px, 'VIOLET', Math.round((w - vw) / 2), 30, frame ? violet.tube : violet.core, violet.glow, 2)
    // Lightning either side.
    const bolt = ['..##', '.##.', '####', '.##.', '##..', '#...']
    sprite(px, bolt, 6, 22, { '#': '#4f6bff' })
    sprite(px, bolt, w - 10, 22, { '#': '#4f6bff' })
    tube(px, 4, 46, w - 8, 1, { core: '#f0d8ff', tube: '#b46cff', glow: '#3a1a6a' })
    // The door in a frame of light, round windows, a board for tonight.
    for (const door of doorTiles(c)) {
      px(door.x - 2, door.y - 12, 20, 28, '#b46cff')
      px(door.x - 1, door.y - 11, 18, 27, '#2a1440')
      px(door.x + 1, door.y - 9, 14, 25, '#08060c')
      px(door.x + 7, door.y - 2, 1, 6, '#b46cff')
      px(door.x + 8, door.y - 2, 1, 6, '#b46cff')
    }
    roundWindow(px, 18, 66, 5, '#b46cff', '#3a1a6a')
    roundWindow(px, w - 18, 66, 5, '#b46cff', '#3a1a6a')
    px(14, 78, 16, 12, '#2a2a30')
    px(15, 79, 14, 10, '#1a2a1a')
    text(px, 'DJ', 18, 80, '#f4f4f4')
    px(16, 86, 11, 1, '#ff9ef0')
    plinth(px, 0, h - 2, w, '#2a2238')
    // The rope, and the queue's chrome posts.
    for (const door of doorTiles(c)) {
      for (const post of [door.x - 14, door.x - 4, door.x + 18, door.x + 28]) {
        px(post, h + 2, 2, 6, '#c8ccd4')
        px(post, h + 2, 2, 1, '#ffffff')
      }
      px(door.x - 12, h + 4, 8, 1, '#8a2ad8')
      px(door.x + 20, h + 4, 8, 1, '#8a2ad8')
    }
    groundShadow(px, w, 10, h)
  },
}

/** A hotel tower seen past the Strip: a helipad on the roof, a lit grid of rooms. */
function mesaTower(name: string, glass: string, accent: { core: string; tube: string; glow: string }): StampArt {
  return {
    bleed: { left: 1, right: 3 },
    frames: 2,
    draw: (px, c) => {
      const { w, h, frame } = c
      flatRoof(px, -1, 0, w + 2, 12, { hi: '#5a5a6a', base: '#3a3a48', lo: '#1e1e28' }, '#2a2a36')
      roundWindow(px, 24, 6, 4, '#f2c84a', '#2a2a36')
      text(px, 'H', 23, 4, '#f2c84a')
      glassGrid(px, 0, 12, w, h - 14, glass, '#14141c')
      for (let y = 13; y < h - 2; y += 6) {
        for (let x = 1; x < w - 1; x += 8) if ((x * 3 + y * 5 + frame * 13) % 7 === 0) px(x, y, 7, 5, '#ffd27a')
      }
      tube(px, 1, 12, 1, h - 14, accent)
      tube(px, w - 2, 12, 1, h - 14, accent)
      const nw = textWidth(name, 2)
      px(Math.round((w - nw) / 2) - 4, 16, nw + 8, 14, '#08060e')
      neonText(px, name, Math.round((w - nw) / 2), 18, frame ? accent.core : accent.tube, accent.glow, 2)
      plinth(px, 0, h - 2, w, '#2a2a30')
    },
  }
}

/** A parking garage with a billboard on the roof. */
const garageMesa: StampArt = {
  bleed: { left: 1, right: 3, top: 6 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    px(-1, 0, w + 2, 14, '#3a3a44')
    px(10, -6, w - 20, 18, '#14141a')
    px(11, -5, w - 22, 16, '#d8202a')
    neonText(px, 'WIN BIG', 18, -2, '#fff4c8', '#7a1010', 2)
    for (let i = 0; i < 3; i++) {
      px(w - 56 + i * 14, -3, 11, 12, '#f4f0e4')
      text(px, '7', w - 52 + i * 14, frame ? -1 : 0, '#d8202a', 2)
    }
    for (let y = 14; y < h - 2; y += 12) {
      px(0, y, w, 12, '#2a2a32')
      px(0, y, w, 3, '#9aa0aa')
      px(0, y, w, 1, '#c8ccd4')
      for (let x = 4; x < w - 10; x += 14) {
        if ((x + y) % 3 === 0) continue
        const color = ['#d82a2a', '#2a6ad8', '#e8e8f0', '#3aa860', '#f2c84a'][(x + y) % 5]
        px(x, y + 5, 10, 6, color)
        px(x + 2, y + 6, 6, 2, '#2a3440')
      }
    }
    plinth(px, 0, h - 2, w, '#3a3a44')
  },
}

// ---------------------------------------------------------------------------
// Porto Lumina
// ---------------------------------------------------------------------------

const MARBLE_WALL: WallPalette = { hi: '#fbf6ea', base: '#ece4d4', lo: '#d6ccb8', line: '#b0a48c' }
const VERDIGRIS = { hi: '#8ad0c0', base: '#5aa898', lo: '#3a7a6c', line: '#1e4a40' }
const LUMINA_SLATE: RoofPalette = {
  line: '#141a28', ridge: '#5a6a86', hi: '#6a7a96', a: '#3a4862', b: '#46566e', seam: '#28324a', fascia: '#ece4d4',
}
const LUMINA_TILE: RoofPalette = {
  line: '#6a2a18', ridge: '#e09060', hi: '#e8a070', a: '#c86a42', b: '#b45e3a', seam: '#8a3a22', fascia: '#ece4d4',
}
const LUMINA_WINDOW: WindowStyle = {
  frame: '#3a3226', trim: '#fbf6ea', glass: '#e8c068', glassHi: '#f8dc90', sill: '#ece4d4',
}

/** A balustrade: a rail on a row of little turned balusters. */
function balustrade(px: Px, x: number, y: number, w: number) {
  px(x, y, w, 2, MARBLE_WALL.hi)
  px(x, y + 1, w, 1, MARBLE_WALL.lo)
  for (let bx = x + 1; bx < x + w - 1; bx += 3) {
    px(bx, y + 2, 2, 4, MARBLE_WALL.base)
    px(bx, y + 3, 2, 1, MARBLE_WALL.lo)
  }
  px(x, y + 6, w, 2, MARBLE_WALL.base)
  px(x, y + 7, w, 1, MARBLE_WALL.line)
}

/** The penthouse tower: marble and glass, a lit crown, the lobby at its foot. */
const towerLumina: StampArt = {
  bleed: { left: 1, right: 3, top: 12 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // A roof terrace round the crown, then the spire and the crown itself.
    flatRoof(px, -1, 0, w + 2, 5, { hi: MARBLE_WALL.hi, base: MARBLE_WALL.base, lo: MARBLE_WALL.lo }, '#8a8070')
    px(w / 2 - 1, -12, 2, 12, GOLD_DARK)
    px(w / 2 - 1, -12, 1, 12, GOLD)
    px(w / 2 - 2, -13, 4, 2, frame ? '#ff4a4a' : '#8a1a1a')
    px(6, 0, w - 12, 4, GOLD_DARK)
    px(8, -2, w - 16, 3, GOLD)
    px(14, -4, w - 28, 3, GOLD_DARK)
    px(0, 4, w, 12, '#2a2418')
    for (let x = 2; x < w - 2; x += 6) {
      px(x, 6, 5, 9, '#ffe8a8')
      px(x, 6, 5, 3, '#fff4cc')
    }
    px(0, 16, w, 2, GOLD)
    // The shaft: marble frame, glass in tall strips, a gold line at every floor.
    px(0, 18, w, 58, MARBLE_WALL.base)
    for (let x = 6; x < w - 6; x += 12) {
      px(x, 18, 8, 58, '#3a4a5e')
      for (let y = 19; y < 76; y += 6) {
        px(x, y, 8, 5, (x + y * 3 + frame * 7) % 9 === 0 ? '#ffd27a' : '#4a6078')
        px(x, y, 8, 1, '#6a8098')
      }
    }
    for (let y = 18; y < 76; y += 6) px(0, y + 5, w, 1, '#d8b048')
    px(0, 18, 3, 58, MARBLE_WALL.hi)
    px(w - 3, 18, 3, 58, MARBLE_WALL.lo)
    // The lobby: a canopy with the name, glass, topiary in marble planters.
    px(0, 76, w, h - 76, MARBLE_WALL.lo)
    px(4, 78, w - 8, h - 80, '#2a2418')
    px(5, 79, w - 10, h - 82, '#e8c068')
    px(5, 79, w - 10, 4, '#f8dc90')
    px(14, 74, w - 28, 6, '#1e3a30')
    px(14, 74, w - 28, 1, GOLD)
    px(14, 79, w - 28, 1, GOLD)
    textCentred(px, 'LUMINA', w / 2, 75, GOLD)
    for (const door of doorTiles(c)) {
      px(door.x + 1, door.y + 1, 14, 15, GOLD_DARK)
      px(door.x + 2, door.y + 2, 12, 14, '#3a3226')
      px(door.x + 7, door.y + 2, 2, 14, GOLD)
      px(door.x + 3, door.y + 3, 3, 12, '#a8c8d8')
      px(door.x + 10, door.y + 3, 3, 12, '#a8c8d8')
    }
    for (const tx of [3, w - 13]) {
      px(tx, h - 8, 10, 6, MARBLE_WALL.base)
      px(tx, h - 8, 10, 1, MARBLE_WALL.hi)
      px(tx + 1, h - 16, 8, 8, '#2e6a3a')
      px(tx + 2, h - 17, 6, 2, '#3e8a4a')
      px(tx + 2, h - 15, 2, 2, '#4aa05a')
    }
    plinth(px, 0, h - 2, w, '#b0a48c')
    groundShadow(px, w, 4, h)
  },
}

/**
 * The Porto Lumina casino: a verdigris dome over a pediment, six columns, CASINO
 * LUMINA on the frieze in gold, and marble steps down to the waterfront.
 */
const casinoLumina: StampArt = {
  bleed: { left: 2, right: 3, top: 12, bottom: 12 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // The roof line: balustrade either side, the dome in the middle.
    px(-2, 0, w + 4, 24, '#8a7e6a')
    balustrade(px, -2, 8, w + 4)
    const dx = w / 2
    for (let row = 0; row < 22; row++) {
      const half = Math.round(Math.sqrt(Math.max(0, 1 - ((21 - row) / 22) ** 2)) * 26)
      px(dx - half, -8 + row, half * 2, 1, row < 3 ? VERDIGRIS.hi : VERDIGRIS.base)
      px(dx - half, -8 + row, 2, 1, VERDIGRIS.hi)
      px(dx + half - 3, -8 + row, 3, 1, VERDIGRIS.lo)
    }
    for (const rx of [-16, -8, 0, 8, 16]) px(dx + rx, -4, 1, 18, VERDIGRIS.line)
    px(dx - 3, -12, 6, 5, GOLD_DARK)
    px(dx - 2, -12, 4, 4, frame ? '#ffe8a0' : GOLD)
    px(dx - 1, -16, 2, 4, GOLD)
    // Pediment and frieze.
    pediment(px, 34, 14, w - 68, 12, MARBLE_WALL.hi, MARBLE_WALL.line)
    for (let i = 0; i < 9; i++) {
      const a = Math.PI + (i / 8) * Math.PI
      px(dx + Math.round(Math.cos(a) * 7), 23 + Math.round(Math.sin(a) * 5), 1, 1, GOLD)
    }
    px(dx - 2, 20, 5, 3, GOLD)
    stoneWall(px, 0, 24, w, h - 24, MARBLE_WALL, 12)
    px(30, 29, w - 60, 9, '#ece4d4')
    px(30, 29, w - 60, 1, '#fbf6ea')
    px(30, 37, w - 60, 1, MARBLE_WALL.line)
    textCentred(px, 'CASINO LUMINA', dx, 31, GOLD_DARK)
    // The wings: arched windows over balconies, lamps glowing.
    for (const x of [6, 20, w - 30, w - 16]) {
      archedWindow(px, x, 30, 10, 16, LUMINA_WINDOW)
      balustrade(px, x - 2, 47, 14)
      archedWindow(px, x, 58, 10, 16, LUMINA_WINDOW)
    }
    // The portico: deep shade behind six columns, chandeliers inside.
    px(32, 38, w - 64, h - 42, '#5a4a36')
    px(32, 38, w - 64, 4, '#3a2e22')
    for (const cx of [44, dx, w - 44]) {
      px(cx - 4, 44, 9, 2, GOLD)
      for (let i = 0; i < 5; i++) px(cx - 4 + i * 2, 46, 1, 2 + (i % 2), frame ? '#ffe8a0' : GOLD)
    }
    for (const x of [40, 54, 68, w - 73, w - 59, w - 45]) column(px, x, 38, h - 42, '#f4eee2', GOLD)
    for (const door of doorTiles(c)) {
      archedWindow(px, door.x - 2, door.y - 12, 20, 28, { ...LUMINA_WINDOW, glass: '#e8c068', glassHi: '#ffe8a8' })
      px(door.x - 1, door.y + 1, 18, 15, GOLD_DARK)
      px(door.x, door.y + 2, 7, 14, '#3a3226')
      px(door.x + 9, door.y + 2, 7, 14, '#3a3226')
      px(door.x + 1, door.y + 3, 5, 6, '#e8c068')
      px(door.x + 10, door.y + 3, 5, 6, '#e8c068')
    }
    plinth(px, 0, h - 4, w, '#d6ccb8', 4)
    // Steps down to the waterfront, and the carpet down the steps.
    for (let i = 0; i < 3; i++) {
      px(28 - i * 4, h + i * 4, w - 56 + i * 8, 3, MARBLE_WALL.hi)
      px(28 - i * 4, h + i * 4 + 3, w - 56 + i * 8, 1, MARBLE_WALL.lo)
    }
    for (const door of doorTiles(c)) {
      px(door.x - 2, h, 20, 12, '#8a1420')
      px(door.x - 1, h, 18, 12, '#b81c2c')
      px(door.x - 1, h, 1, 12, GOLD)
      px(door.x + 16, h, 1, 12, GOLD)
    }
    for (const lx of [16, w - 18]) {
      px(lx, h - 22, 2, 22, '#2a2a30')
      px(lx - 2, h - 26, 6, 5, '#2a2a30')
      px(lx - 1, h - 25, 4, 3, '#ffe8a0')
    }
    groundShadow(px, w, 24, h)
  },
}

/** Lumina Atelier: a Paris front — mansard, iron balconies, ATELIER in gold on black lacquer. */
const atelier: StampArt = {
  bleed: { left: 2, right: 3, top: 3 },
  draw: (px, c) => {
    const { w, h } = c
    mansard(px, -2, 0, w + 4, 24, LUMINA_SLATE, [10, w / 2 - 6, w - 22], '#8a8e96')
    stoneWall(px, 0, 24, w, 44, { hi: '#f8f0dc', base: '#ece2cc', lo: '#d8ccb2', line: '#b8aa8c' }, 16)
    eaveShadow(px, 0, 24, w)
    px(0, 24, 4, 44, '#f8f0dc')
    px(w - 4, 24, 4, 44, '#d8ccb2')
    for (const y of [28, 47]) {
      for (const x of [10, 34, w - 44, w - 20]) {
        windowAt(px, x, y, 10, 14, { ...LUMINA_WINDOW, bars: 'vertical' })
        // Wrought-iron balconette.
        px(x - 2, y + 11, 14, 1, '#14141a')
        for (let bx = x - 2; bx < x + 12; bx += 2) px(bx, y + 11, 1, 4, '#14141a')
        px(x - 2, y + 14, 14, 1, '#14141a')
      }
    }
    // Black lacquer shopfront.
    px(0, 68, w, h - 68, '#0e0e12')
    px(0, 68, w, 1, GOLD)
    const aw = textWidth('ATELIER', 2)
    text(px, 'ATELIER', Math.round((w - aw) / 2), 70, GOLD, 2)
    awning(px, 2, 81, w - 4, 3, '#14141a', '#2a2a30', 4)
    for (const [x, gown] of [[6, '#b81c2c'], [w - 34, '#14141a']] as const) {
      px(x, 86, 28, 9, '#2a2418')
      px(x + 1, 87, 26, 8, '#f4ecd8')
      px(x + 11, 87, 6, 7, gown)
      px(x + 12, 86, 4, 1, '#d8c8b0')
      if (gown === '#14141a') px(x + 13, 88, 2, 3, '#f4f4f4')
    }
    for (const door of doorTiles(c)) {
      px(door.x + 1, door.y + 3, 14, 13, GOLD_DARK)
      px(door.x + 2, door.y + 4, 12, 12, '#1e1e24')
      px(door.x + 3, door.y + 5, 4, 10, '#a8b8c8')
      px(door.x + 9, door.y + 5, 4, 10, '#a8b8c8')
      px(door.x + 7, door.y + 9, 2, 2, GOLD)
    }
    plinth(px, 0, h - 2, w, '#3a3a40')
    groundShadow(px, w, 24, h)
  },
}

/** The Grand Hotel across the water: an arcade of arches the length of the block. */
const grandHotel: StampArt = {
  bleed: { left: 2, right: 3, top: 8 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    barrelRoof(px, -2, 0, w + 4, 15, LUMINA_TILE)
    const sw = textWidth('GRAND HOTEL LUMINA', 1) + 12
    px(Math.round((w - sw) / 2), -8, sw, 10, '#14243a')
    px(Math.round((w - sw) / 2) + 1, -7, sw - 2, 8, '#1e3a5a')
    textCentred(px, 'GRAND HOTEL LUMINA', w / 2, -5, GOLD)
    stoneWall(px, 0, 15, w, h - 15, MARBLE_WALL, 12)
    eaveShadow(px, 0, 15, w)
    for (let x = 2; x < w - 14; x += 18) {
      px(x + 3, 21, 12, h - 23, '#5a4a36')
      px(x + 4, 19, 10, 2, '#5a4a36')
      px(x + 5, 18, 8, 1, '#5a4a36')
      px(x + 5, 24, 8, 10, (x / 18 + frame) % 5 === 0 ? '#ffe8a8' : '#e8c068')
      px(x + 8, 22, 2, 2, GOLD)
      column(px, x - 2, 18, h - 20, '#f4eee2', GOLD)
    }
    pottedPalm(px, 30, h - 16)
    pottedPalm(px, w - 42, h - 16)
    plinth(px, 0, h - 2, w, '#d6ccb8')
  },
}

export const STRIP_BUILDINGS: Record<string, StampArt> = {
  'casino-mesa': casinoMesa,
  'luxury-mesa': luxury,
  'motors-mesa': motors,
  'club-mesa': ultraviolet,
  'tower-mesa-a': mesaTower('ARIA', '#14182a', CYAN_NEON),
  'garage-mesa': garageMesa,
  'tower-mesa-b': mesaTower('DESERT ROSE', '#2a1420', PINK_NEON),
  'tower-lumina': towerLumina,
  'casino-lumina': casinoLumina,
  'atelier-lumina': atelier,
  'hotel-lumina': grandHotel,
}

