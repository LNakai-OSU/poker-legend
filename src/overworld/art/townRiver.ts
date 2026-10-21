import type { StampArt } from '../stampArt'
import { glow, icon, shadow, text, textCentred, textWidth, type Px } from '../pixelArt'
import {
  acUnit, archedWindow, bulbBorder, bulbs, chimney, doorAt, eaveShadow, glassDoors, groundShadow,
  plinth, puffs, sidingWall, stuccoWall, tinRoof, wallLamp, windowAt,
  type RoofPalette, type WallPalette, type WindowStyle,
} from './buildingParts'
import { doorTiles } from './townBasin'

/**
 * Silver Creek and Riverbend: the first two stops out of town.
 *
 * Silver Creek is a reservation casino two hours from anywhere — adobe and
 * weathered timber, turquoise trim, a sign you can see from the highway.
 * Riverbend is a river town of painted clapboard and tin roofs, and its casino
 * is a paddle steamer that has not moved in eleven years.
 */

// ---------------------------------------------------------------------------
// Silver Creek
// ---------------------------------------------------------------------------

const ADOBE: WallPalette = { hi: '#e8bc88', base: '#d9a26a', lo: '#b8804a', line: '#7a5030' }
const ADOBE_PALE: WallPalette = { hi: '#f0d0a4', base: '#e4b886', lo: '#c49a66', line: '#8a6038' }
const TIMBER = { hi: '#a87a4e', base: '#8a5e38', lo: '#6a4226', line: '#3e2614' }
const TURQUOISE = '#2fa4a0'
const TURQUOISE_DARK = '#1e6e6a'
const DESERT_WINDOW: WindowStyle = {
  frame: '#3e2614', trim: TURQUOISE, glass: '#e8a850', glassHi: '#ffd27a', sill: '#c49a66', bars: 'vertical',
}
const RUST_TIN: RoofPalette = {
  line: '#3a2a20', ridge: '#a89888', hi: '#b8a898', a: '#8a7a6a', b: '#9a5a32', seam: '#5e5248', fascia: '#6a4226',
}

/** Vigas: the ends of the roof beams, poking out of an adobe wall in a row. */
function vigas(px: Px, x: number, y: number, w: number) {
  for (let vx = x + 3; vx < x + w - 3; vx += 8) {
    px(vx, y, 4, 3, TIMBER.line)
    px(vx, y, 3, 2, TIMBER.base)
    px(vx, y, 1, 1, TIMBER.hi)
    shadow(px, vx, y + 3, 4, 2, 0.3)
  }
}

/** A pueblo parapet: a flat roof behind a rounded adobe lip. */
function puebloRoof(px: Px, x: number, y: number, w: number, h: number) {
  px(x, y, w, h, ADOBE.line)
  px(x + 1, y, w - 2, h, ADOBE_PALE.base)
  px(x + 3, y + 2, w - 6, h - 5, '#8a6a4a')
  px(x + 3, y + 2, w - 6, 1, '#6a4e34')
  px(x + 1, y, w - 2, 1, ADOBE_PALE.hi)
  px(x + 1, y + h - 3, w - 2, 1, ADOBE_PALE.hi)
  px(x + 1, y + h - 1, w - 2, 1, ADOBE.lo)
}

/**
 * The reservation casino: a Western false front in adobe and timber, its name
 * in lights on the roof, a marquee over the doors and a red carpet down the
 * steps to the forecourt.
 */
const casinoSilverCreek: StampArt = {
  bleed: { left: 2, right: 3, top: 10, bottom: 12 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // The roof behind the false front, with the sign standing on it.
    px(-2, 0, w + 4, 14, '#5a4a3c')
    px(-1, 1, w + 2, 12, '#7a6656')
    acUnit(px, 12, 3)
    acUnit(px, w - 20, 4)
    px(70, 6, 2, 8, '#2a2420')
    px(w - 72, 6, 2, 8, '#2a2420')
    const signW = 112
    const sx = Math.round((w - signW) / 2)
    // The name in lights.
    glow('neon', () => {
      px(sx, -10, signW, 18, '#3a0c08')
      px(sx + 1, -9, signW - 2, 16, '#8e2018')
      px(sx + 1, -9, signW - 2, 1, '#c8402e')
      bulbBorder(px, sx + 2, -8, signW - 4, 14, frame)
      const words = 'SILVER CREEK'
      const tx = sx + Math.round((signW - textWidth(words, 2)) / 2)
      text(px, words, tx + 1, -5, '#3a0c08', 2)
      text(px, words, tx, -6, '#f4f4f8', 2)
    })
    // The false front: a stepped parapet, highest over the middle bay.
    stuccoWall(px, 0, 14, w, h - 14, ADOBE, 3)
    px(0, 14, w, 2, TIMBER.base)
    px(0, 14, w, 1, TIMBER.hi)
    px(64, 8, w - 128, 8, ADOBE.base)
    px(64, 8, w - 128, 1, ADOBE.hi)
    px(84, 4, w - 168, 6, ADOBE.base)
    px(84, 4, w - 168, 1, ADOBE.hi)
    px(64, 15, w - 128, 1, TIMBER.line)
    icon(px, 'star', w / 2 - 2, 5, '#d8dce8')
    px(w / 2, 5, 1, 1, '#ffffff')
    vigas(px, 0, 18, 60)
    vigas(px, w - 60, 18, 60)
    // Upstairs: arched windows glowing.
    for (const x of [8, 26, 44, w - 54, w - 36, w - 18]) archedWindow(px, x, 24, 10, 13, DESERT_WINDOW)
    // The CASINO board over the marquee.
    const bx = 70
    const bw = w - 140
    glow('neon', () => {
      px(bx, 20, bw, 18, TIMBER.line)
      px(bx + 1, 21, bw - 2, 16, '#2a1a10')
      bulbBorder(px, bx + 2, 22, bw - 4, 14, frame + 1)
      textCentred(px, 'CASINO', w / 2 + 1, 25, '#5a3a10', 2)
      textCentred(px, 'CASINO', w / 2, 24, '#f2c84a', 2)
    })
    // The marquee, on two timber posts, bulbs all along its edge.
    px(56, 40, w - 112, 9, '#5a120e')
    px(56, 40, w - 112, 7, '#a8241c')
    px(56, 40, w - 112, 1, '#d84a3a')
    px(56, 45, w - 112, 2, '#f2c84a')
    bulbs(px, 58, 48, Math.floor((w - 116) / 3), 3, frame)
    shadow(px, 56, 49, w - 112, 3, 0.35)
    for (const x of [58, w - 62]) {
      px(x, 49, 4, h - 49, TIMBER.line)
      px(x + 1, 49, 2, h - 49, TIMBER.base)
      px(x + 1, 49, 1, h - 49, TIMBER.hi)
      wallLamp(px, x, 54, '#ffe080')
    }
    // Windows full of machines either side of the doors.
    for (const x of [66, w - 86]) {
      px(x, 53, 20, 23, TIMBER.line)
      px(x + 1, 54, 18, 21, '#3a1a2a')
      for (let mx = x + 2; mx < x + 18; mx += 5) {
        px(mx, 58, 4, 12, '#6a3a8a')
        px(mx, 58, 4, 2, (mx + frame) % 2 ? '#ffe680' : '#f2a03a')
        px(mx + 1, 62, 2, 2, '#e8e8f0')
      }
      px(x + 1, 54, 18, 1, 'rgba(255, 255, 255, 0.3)')
    }
    // The doors: a pair of brass-framed glass doors, wider than the tile they stand on.
    for (const door of doorTiles(c)) {
      glassDoors(px, door.x - 7, door.y + 1, 30, '#a8801e', '#3a2030', '#f2c84a')
      px(door.x - 7, door.y, 30, 1, '#f2c84a')
    }
    // Boardwalk either side: shuttered windows, a hitching rail.
    for (const x of [6, 30, w - 46, w - 22]) windowAt(px, x, 56, 14, 12, { ...DESERT_WINDOW, shutters: TURQUOISE_DARK })
    px(4, h - 7, 44, 2, TIMBER.base)
    px(4, h - 7, 44, 1, TIMBER.hi)
    for (const x of [6, 26, 46]) px(x, h - 7, 2, 6, TIMBER.line)
    plinth(px, 0, h - 2, w, '#8a6a4a')
    // The red carpet down to the forecourt, roped off either side.
    for (const door of doorTiles(c)) {
      const cx = door.x - 4
      px(cx, h, 24, 12, '#7a1414')
      px(cx + 1, h, 22, 12, '#b82424')
      px(cx + 1, h, 1, 12, '#f2c84a')
      px(cx + 22, h, 1, 12, '#f2c84a')
      for (const post of [cx - 4, cx + 26]) {
        for (const py of [h + 2, h + 9]) {
          px(post, py, 2, 3, '#a8801e')
          px(post, py, 2, 1, '#ffe080')
        }
        px(post, h + 4, 1, 5, '#8a1a2a')
      }
    }
    groundShadow(px, w, 14, h)
  },
}

/** A hotel wing in pueblo style: rounded parapet, vigas, a shaded portal along the front. */
function hotelWing(sign: string, mirror: boolean): StampArt {
  return {
    bleed: { left: mirror ? 0 : 2, right: mirror ? 3 : 0 },
    frames: 2,
    draw: (px, c) => {
      const { w, h, frame } = c
      puebloRoof(px, mirror ? 0 : -2, 0, w + 2, 12)
      stuccoWall(px, 0, 12, w, h - 12, ADOBE_PALE, mirror ? 5 : 2)
      eaveShadow(px, 0, 12, w)
      vigas(px, 0, 14, w)
      for (let x = 8; x < w - 8; x += 20) windowAt(px, x, 21, 10, 10, DESERT_WINDOW)
      // The sign along the parapet.
      const sw = textWidth(sign) + 8
      const sx = mirror ? 10 : w - sw - 10
      glow('neon', () => {
        px(sx, 2, sw, 9, TURQUOISE_DARK)
        px(sx + 1, 3, sw - 2, 7, TURQUOISE)
        text(px, sign, sx + 4, 4, '#fff8e8')
      })
      // The portal: a timber walkway roof on posts, and its deep shade.
      px(0, 35, w, 4, TIMBER.line)
      px(0, 35, w, 3, TIMBER.base)
      px(0, 35, w, 1, TIMBER.hi)
      px(0, 39, w, h - 41, '#8a6a4e')
      px(0, 39, w, 3, '#6e5238')
      for (let x = 6; x < w; x += 22) {
        windowAt(px, x + 4, 45, 10, 9, { ...DESERT_WINDOW, bars: 'cross' })
      }
      for (let x = 2; x < w; x += 22) {
        px(x, 39, 3, h - 41, TIMBER.line)
        px(x + 1, 39, 1, h - 41, TIMBER.hi)
      }
      // String lights along the portal edge.
      for (let x = 2; x < w - 2; x += 4) px(x, 40 + ((x / 4) % 2), 1, 1, (x / 4 + frame) % 2 ? '#ffe680' : '#e86a3a')
      plinth(px, 0, h - 2, w, '#8a6a4a')
    },
  }
}

/** The trading post: a timber false front with GIFTS on it, a porch, barrels and a cactus. */
const giftShop: StampArt = {
  bleed: { left: 2, right: 3 },
  draw: (px, c) => {
    const { w, h } = c
    tinRoof(px, -2, 0, w + 4, 14, RUST_TIN)
    // Vertical boards, silvered by the sun.
    px(0, 14, w, h - 14, '#8a7458')
    for (let x = 0; x < w; x += 4) {
      px(x, 14, 1, h - 14, '#5e4c38')
      px(x + 1, 14, 1, h - 14, '#a48c6c')
    }
    eaveShadow(px, 0, 14, w)
    px(14, 15, w - 28, 10, '#123e3c')
    px(15, 16, w - 30, 8, TURQUOISE)
    px(15, 16, w - 30, 1, '#6ad8d0')
    textCentred(px, 'GIFTS', w / 2, 18, '#fff8e8')
    // Porch roof on posts, and the shade under it.
    px(-1, 26, w + 2, 4, TIMBER.line)
    px(-1, 26, w + 2, 3, TIMBER.base)
    px(-1, 26, w + 2, 1, TIMBER.hi)
    shadow(px, 0, 30, w, 3, 0.3)
    windowAt(px, 5, 34, 18, 10, { ...DESERT_WINDOW, glass: '#3a5a6a', glassHi: '#5a8a9a', bars: 'vertical' })
    px(8, 38, 2, 2, TURQUOISE)
    px(13, 37, 3, 3, '#c8402e')
    windowAt(px, w - 23, 34, 18, 10, { ...DESERT_WINDOW, glass: '#3a5a6a', glassHi: '#5a8a9a', bars: 'vertical' })
    for (const x of [1, w - 4]) {
      px(x, 30, 3, h - 30, TIMBER.line)
      px(x + 1, 30, 1, h - 30, TIMBER.hi)
    }
    for (const door of doorTiles(c)) doorAt(px, door.x, door.y, { line: TIMBER.line, trim: TIMBER.hi, leaf: TURQUOISE_DARK })
    // A barrel, and a cactus in a pot.
    px(26, h - 9, 6, 8, TIMBER.line)
    px(27, h - 9, 4, 8, '#9a6a3a')
    px(26, h - 7, 6, 1, '#3a3a40')
    px(26, h - 4, 6, 1, '#3a3a40')
    px(52, h - 4, 6, 3, '#b8603a')
    px(54, h - 12, 3, 8, '#3a8a4a')
    px(52, h - 10, 2, 3, '#3a8a4a')
    px(57, h - 11, 2, 3, '#3a8a4a')
    px(55, h - 12, 1, 7, '#5aa86a')
    plinth(px, 0, h - 2, w, '#7a6248')
    groundShadow(px, w, 14, h)
  },
}

/** The motel office, under a tall arrow sign that buzzes VACANCY. */
const motel: StampArt = {
  bleed: { left: 2, right: 3, top: 15 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    // The sign: a board on a pole with an arrow pointing down at the office.
    px(w - 22, -3, 2, 6, '#3a3a40')
    // VACANCY, buzzing all night.
    glow('neon', () => {
      px(w - 52, -15, 46, 14, '#1a1a22')
      px(w - 51, -14, 44, 12, '#e8e0c8')
      text(px, 'MOTEL', w - 47, -13, '#d82a2a')
      text(px, 'VACANCY', w - 49, -7, frame ? '#3ad86a' : '#1a6a3a')
      px(w - 10, -12, 4, 3, '#d82a2a')
      px(w - 8, -9, 2, 2, '#d82a2a')
    })
    puebloRoof(px, -2, 0, w + 4, 12)
    stuccoWall(px, 0, 12, w, h - 12, ADOBE, 7)
    eaveShadow(px, 0, 12, w)
    vigas(px, 0, 14, w)
    windowAt(px, 4, 24, 28, 12, { ...DESERT_WINDOW, glass: '#e8b858', glassHi: '#f8d888', bars: 'none' })
    px(6, 27, 25, 7, '#2a2a30')
    glow('neon', () => {
      text(px, 'OFFICE', 7, 28, frame ? '#ff6a3a' : '#ff8a5a')
    })
    doorAt(px, 32, 32, { line: TIMBER.line, trim: TURQUOISE, leaf: '#6a4226', glass: '#e8b858' })
    // Ice machine and a soda machine against the wall.
    px(52, 26, 11, 20, '#c8d0d8')
    px(53, 27, 9, 18, '#e8eef4')
    text(px, 'ICE', 54, 29, '#2a6ad8')
    px(66, 24, 11, 22, '#8a1a14')
    px(67, 25, 9, 20, '#d83a2a')
    px(68, 27, 7, 6, '#f4f4f4')
    px(68, 36, 7, 1, '#2a2a30')
    plinth(px, 0, h - 2, w, '#8a6a4a')
    groundShadow(px, w, 12, h)
  },
}

/** One old gas pump: a rounded red body, a white face with its dial, a globe on top, the hose. */
function gasPump(px: Px, x: number, y: number, frame: number) {
  shadow(px, x + 1, y + 20, 10, 2, 0.3)
  px(x + 1, y + 4, 8, 17, '#7a1410')
  px(x + 2, y + 4, 6, 16, '#d82a20')
  px(x + 2, y + 4, 1, 16, '#f05a48')
  px(x + 3, y + 7, 4, 5, '#f4f0e4')
  px(x + 4, y + 8, 2, 2, '#2a2a30')
  px(x + 3, y + 14, 4, 1, '#f2c84a')
  // The globe, lit at night.
  px(x + 3, y, 4, 4, '#3a3a40')
  glow('lamp', () => {
    px(x + 3, y, 4, 3, '#fff0d0')
    px(x + 4, y + 1, 2, 1, frame ? '#e83a2a' : '#d82a20')
  })
  // The hose round to the nozzle on its hook.
  px(x + 8, y + 9, 1, 8, '#1a1a20')
  px(x + 9, y + 9, 2, 2, '#4a4a52')
}

/**
 * The gas station between the trading post and the motel: an adobe office with
 * a soda machine, a canopy on posts over two old red pumps, GAS on the fascia,
 * and the canopy lit underneath at night so the pumps stand in a pool of light.
 */
const gasStation: StampArt = {
  bleed: { left: 2, right: 3 },
  frames: 2,
  lights: [{ x: 70, y: 46, reach: 34, color: '#fff0d0', strength: 0.9 }],
  draw: (px, c) => {
    const { w, h, frame } = c
    // The office: pueblo roof, adobe, a lit window, the soda machine.
    const ow = 40
    puebloRoof(px, -2, 2, ow + 4, 12)
    stuccoWall(px, 0, 14, ow, h - 14, ADOBE_PALE, 5)
    eaveShadow(px, 0, 14, ow)
    vigas(px, 0, 16, ow)
    windowAt(px, 4, 25, 18, 12, { ...DESERT_WINDOW, glass: '#e8b858', glassHi: '#f8d888' })
    px(26, 24, 11, 22, '#2a5a9a')
    px(27, 25, 9, 20, '#3a7ac8')
    px(28, 27, 7, 6, '#f4f4f4')
    text(px, 'POP', 28, 34, '#f4f4f4')
    px(28, 41, 7, 1, '#1a2a4a')
    plinth(px, 0, h - 2, ow, '#8a6a4a')
    // The forecourt: concrete under the canopy, an island the pumps stand on.
    px(ow, 20, w - ow, h - 20, '#b8b0a4')
    for (let x = ow + 8; x < w; x += 12) px(x, 20, 1, h - 20, '#a8a094')
    px(ow + 10, h - 12, w - ow - 18, 6, '#d8d0c4')
    px(ow + 10, h - 12, w - ow - 18, 1, '#ece6dc')
    px(ow + 10, h - 7, w - ow - 18, 1, '#8a8478')
    gasPump(px, ow + 14, h - 30, frame)
    gasPump(px, ow + 32, h - 30, frame + 1)
    // The canopy on two posts, GAS on its fascia, lights underneath.
    for (const x of [ow + 4, w - 6]) {
      px(x, 12, 3, h - 14, '#c8c4bc')
      px(x, 12, 1, h - 14, '#ece8e0')
      px(x + 2, 12, 1, h - 14, '#8a867e')
    }
    px(ow - 2, 0, w - ow + 4, 15, '#2a2a30')
    px(ow - 1, 1, w - ow + 2, 10, '#f4f0e6')
    px(ow - 1, 1, w - ow + 2, 1, '#ffffff')
    px(ow - 1, 11, w - ow + 2, 3, '#d82a20')
    px(ow - 1, 11, w - ow + 2, 1, '#f05a48')
    const word = 'GAS'
    const gx = ow + Math.round((w - ow - textWidth(word, 2)) / 2)
    glow('neon', () => {
      text(px, word, gx, 1, '#d82a20', 2)
      icon(px, 'star', gx - 9, 3, '#d82a20')
      icon(px, 'star', gx + textWidth(word, 2) + 4, 3, '#d82a20')
    })
    shadow(px, ow, 15, w - ow, 2, 0.35)
    glow('lamp', () => {
      for (const x of [ow + 12, ow + 30, ow + 48]) px(x, 14, 5, 1, '#fff6dc')
    })
    groundShadow(px, w, 14, h)
  },
}

// ---------------------------------------------------------------------------
// Riverbend
// ---------------------------------------------------------------------------

const WHITE_PAINT = { hi: '#ffffff', base: '#ece8de', lo: '#c8c2b4', line: '#7a7468' }
const WHITE_WINDOW: WindowStyle = {
  frame: '#2a3a44', trim: '#ece8de', glass: '#7fbcd8', glassHi: '#a8daf0', sill: '#ece8de',
}

const RIVER_TIN: RoofPalette = {
  line: '#2a3036', ridge: '#9aa4ae', hi: '#aab4be', a: '#7a8692', b: '#8a6248', seam: '#4e5862', fascia: '#ece8de',
}

/**
 * The riverboat: a stern-wheeler moored against the quay, two stacks smoking,
 * lit cabin windows on the main deck, and a gangway down to the boards.
 */
const riverboat: StampArt = {
  bleed: { right: 3, top: 16, bottom: 0 },
  frames: 2,
  draw: (px, c) => {
    const { frame } = c
    // Stacks first: they rise behind the cabins.
    for (const sx of [52, 68]) {
      px(sx, -12, 7, 34, '#14141a')
      px(sx + 1, -12, 2, 34, '#3a3a46')
      // Feathered crowns.
      px(sx - 2, -14, 11, 3, '#14141a')
      for (let i = 0; i < 5; i++) px(sx - 2 + i * 2 + 1, -16, 1, 2, '#c8a040')
      puffs(px, sx + 2, -18, frame + sx)
    }
    // Pilothouse on the roof, flag above it.
    px(100, -6, 1, 9, '#3a3a40')
    px(101, -6, 7, 4, frame ? '#d83a2a' : '#c82a1a')
    px(101, -4, 7, 1, '#f4f4f4')
    px(94, 2, 36, 14, WHITE_PAINT.line)
    px(95, 3, 34, 12, WHITE_PAINT.base)
    px(92, 0, 40, 3, '#3a3a40')
    px(92, 0, 40, 1, '#5a5a66')
    for (let x = 97; x < 128; x += 8) {
      px(x, 6, 6, 5, '#7fbcd8')
      px(x, 6, 2, 1, '#ffffff')
    }
    // Texas deck: a smaller cabin with its name board.
    px(28, 16, 128, 16, WHITE_PAINT.line)
    px(29, 17, 126, 14, WHITE_PAINT.base)
    px(26, 15, 132, 3, '#3a3a40')
    px(26, 15, 132, 1, '#6a6a76')
    for (let x = 34; x < 150; x += 10) {
      px(x, 21, 6, 7, '#5a3a2a')
      px(x + 1, 22, 4, 5, '#ffd27a')
      px(x + 1, 22, 4, 2, '#ffe8a8')
    }
    glow('neon', () => {
      px(60, 18, 64, 9, '#5a120e')
      px(61, 19, 62, 7, '#a8241c')
      textCentred(px, 'RIVER QUEEN', 92, 20, '#f2c84a')
    })
    // Main deck: lit arched windows, a railing in front, bunting along the top.
    px(10, 32, 160, 16, WHITE_PAINT.line)
    px(11, 33, 158, 15, WHITE_PAINT.base)
    px(8, 31, 164, 2, '#3a3a40')
    for (let x = 14; x < 164; x += 9) {
      px(x, 35, 6, 9, '#5a3a2a')
      px(x + 1, 36, 4, 8, '#ffd27a')
      px(x + 1, 36, 4, 3, '#ffe8a8')
      px(x + 2, 35, 2, 1, '#5a3a2a')
    }
    for (let x = 10; x < 170; x += 3) px(x, 33 + (x % 2), 2, 1, ['#d83a2a', '#f4f4f4', '#2a5ab8'][(x / 3) % 3 | 0])
    px(10, 44, 160, 1, '#f4f4f4')
    for (let x = 10; x < 170; x += 4) px(x, 44, 1, 4, '#f4f4f4')
    px(10, 47, 160, 1, '#c8c2b4')
    // The hull: white planking, a red rubbing strake, dark at the waterline.
    for (let y = 48; y < 64; y++) {
      const inset = y < 52 ? 0 : y < 56 ? 1 : y < 60 ? 3 : 6
      const bow = Math.max(0, 14 - (y - 48) * 2)
      px(bow + inset, y, 172 - bow - inset * 2, 1, y < 50 ? '#c8402e' : y < 52 ? '#a82a20' : y < 60 ? '#ece8de' : '#2a3a42')
    }
    for (let y = 53; y < 60; y += 3) px(8, y, 160, 1, '#c8c2b4')
    // The wheel at the stern, half in the water.
    const wx = 178
    const wy = 44
    for (let dy = -17; dy <= 17; dy++) {
      for (let dx = -14; dx <= 14; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy * 0.8)
        if (d > 15) continue
        const rim = d > 13
        const spoke = Math.abs(dx) <= 0 || Math.abs(dy) <= 0 || Math.abs(Math.abs(dx) - Math.abs(dy)) <= 0
        const paddle = ((Math.round(Math.atan2(dy, dx) * 4 / Math.PI) + 8 + frame) % 2) === 0 && d > 9
        if (rim || paddle || (spoke && d > 3)) px(wx + dx, wy + dy, 1, 1, rim ? '#8a1a14' : paddle ? '#c82a1a' : '#5a1a14')
      }
    }
    px(wx - 2, wy - 2, 5, 5, '#3a3a40')
    px(wx - 15, 26, 30, 3, WHITE_PAINT.base)
    px(wx - 15, 26, 30, 1, '#ffffff')
    // Foam where the hull meets the river.
    for (let x = 6; x < 196; x += 5) px(x, 62 + (x % 2), 3, 1, 'rgba(220, 240, 248, 0.8)')
    // The gangway down to the quay, with rope rails.
    for (const door of doorTiles(c)) {
      // The quay boards under the foot of it, as the deck tiles either side draw them.
      for (let y = door.y; y < door.y + 16; y += 4) {
        px(door.x, y, 16, 3, (y / 4) % 2 === 0 ? '#93653a' : '#8a5d34')
        px(door.x, y, 16, 1, '#a8774a')
        px(door.x, y + 3, 16, 1, '#2e1e10')
      }
      const gx = door.x + 3
      px(gx, 58, 10, door.y + 16 - 58, '#5a3a20')
      for (let y = 59; y < door.y + 16; y += 2) px(gx + 1, y, 8, 1, '#a8784a')
      for (const rx of [gx - 1, gx + 10]) {
        px(rx, 56, 1, door.y + 14 - 56, '#c8b088')
        px(rx, 56, 1, 2, '#5a3a20')
      }
    }
    shadow(px, 10, 64, 170, 2, 0.25)
  },
}

/** The Landing Diner: blue clapboard, a tin porch, checked curtains, EAT pointing at the door. */
const landingDiner: StampArt = {
  bleed: { left: 2, right: 3, top: 10 },
  frames: 2,
  draw: (px, c) => {
    const { w, h, frame } = c
    chimney(px, 12, -6, 10, '#6a6a72', '#8a8a92')
    puffs(px, 15, -9, frame)
    tinRoof(px, -2, 0, w + 4, 14, RIVER_TIN)
    sidingWall(px, 0, 14, w, h - 14, { hi: '#7ab0cc', base: '#5a90b0', lo: '#46768e', line: '#2a4a5a' })
    eaveShadow(px, 0, 14, w)
    px(0, 14, 2, h - 14, '#ece8de')
    px(w - 2, 14, 2, h - 14, '#c8c2b4')
    // The sign on the roof edge.
    glow('neon', () => {
      px(24, -2, 48, 12, '#5a120e')
      px(25, -1, 46, 10, '#c8302a')
      px(25, -1, 46, 1, '#e86050')
      textCentred(px, 'DINER', w / 2, 1, '#ffffff', 1)
    })
    px(36, 10, 2, 4, '#3a3a40')
    px(58, 10, 2, 4, '#3a3a40')
    // Porch roof.
    px(-1, 22, w + 2, 4, RIVER_TIN.line)
    px(-1, 22, w + 2, 3, RIVER_TIN.a)
    for (let x = 0; x < w; x += 3) px(x, 22, 1, 3, RIVER_TIN.hi)
    shadow(px, 0, 26, w, 2, 0.3)
    const checked = { ...WHITE_WINDOW, curtain: '#d83a3a' }
    windowAt(px, 6, 29, 20, 11, checked)
    windowAt(px, 54, 29, 20, 11, checked)
    windowAt(px, 78, 29, 12, 11, WHITE_WINDOW)
    for (const door of doorTiles(c)) {
      doorAt(px, door.x, door.y, { line: '#2a4a5a', trim: '#ece8de', leaf: '#ece8de', glass: '#a8d0e0' })
      // EAT, and an arrow that blinks at the door.
      px(door.x - 12, door.y - 12, 11, 7, '#1a1a22')
      glow('neon', () => {
        text(px, 'EAT', door.x - 11, door.y - 11, frame ? '#ffe060' : '#ff8a3a')
        px(door.x - 2, door.y - 9, 2, 1, frame ? '#ffe060' : '#ff8a3a')
      })
    }
    for (const x of [1, w - 4]) {
      px(x, 26, 3, h - 26, '#ece8de')
      px(x + 2, 26, 1, h - 26, '#c8c2b4')
    }
    plinth(px, 0, h - 2, w, '#6a6a66')
    groundShadow(px, w, 14, h)
  },
}

/** Dockside Outfitters: barn-red board and batten, canoes against the wall, oars in a rack. */
const outfitters: StampArt = {
  bleed: { left: 2, right: 3 },
  draw: (px, c) => {
    const { w, h } = c
    tinRoof(px, -2, 0, w + 4, 15, RIVER_TIN)
    px(0, 15, w, h - 15, '#9a3a2a')
    for (let x = 0; x < w; x += 6) {
      px(x, 15, 2, h - 15, '#b04a36')
      px(x + 2, 15, 1, h - 15, '#6a2418')
    }
    eaveShadow(px, 0, 15, w)
    px(10, 17, w - 20, 9, '#ece8de')
    px(11, 18, w - 22, 7, '#2a3a2a')
    textCentred(px, 'OUTFITTERS', w / 2, 19, '#f2e0a0')
    // Two canoes stood on end.
    for (const [x, hull, trim] of [[4, '#3a7a4a', '#5aa86a'], [12, '#c84a2a', '#e8784a']] as const) {
      px(x + 1, 28, 4, 18, hull)
      px(x + 2, 26, 2, 2, hull)
      px(x + 2, 46, 2, 1, hull)
      px(x + 1, 28, 1, 18, trim)
      px(x + 2, 34, 2, 1, '#e8d8b0')
    }
    // Oars in a rack.
    px(20, 30, 14, 2, '#5a3a20')
    for (let x = 21; x < 33; x += 4) {
      px(x, 26, 1, 20, '#c8a070')
      px(x - 1, 42, 3, 4, '#c8a070')
    }
    windowAt(px, w - 26, 28, 20, 11, { ...WHITE_WINDOW, glass: '#3a4a52', glassHi: '#5a6e7a' })
    px(w - 22, 31, 1, 7, '#c8a070')
    px(w - 18, 30, 1, 8, '#c8a070')
    for (const door of doorTiles(c)) {
      // A barn door with its brace.
      px(door.x + 1, door.y - 2, 14, 18, '#3e1a10')
      px(door.x + 2, door.y - 1, 12, 17, '#8a3020')
      for (let i = 0; i < 12; i++) {
        px(door.x + 2 + i, door.y - 1 + Math.round(i * 1.3), 1, 2, '#ece8de')
        px(door.x + 13 - i, door.y - 1 + Math.round(i * 1.3), 1, 2, '#ece8de')
      }
      px(door.x + 2, door.y - 1, 12, 1, '#ece8de')
      px(door.x + 2, door.y + 14, 12, 1, '#ece8de')
      wallLamp(px, door.x + 16, door.y - 2, '#ffd27a')
    }
    plinth(px, 0, h - 2, w, '#5a4a40')
    groundShadow(px, w, 15, h)
  },
}

export const RIVER_BUILDINGS: Record<string, StampArt> = {
  'casino-silvercreek': casinoSilverCreek,
  'hotel-silvercreek-w': hotelWing('HOTEL', false),
  'hotel-silvercreek-e': hotelWing('BUFFET', true),
  'giftshop-silvercreek': giftShop,
  'motel-silvercreek': motel,
  'gas-silvercreek': gasStation,
  riverboat,
  'diner-riverbend': landingDiner,
  'outfitters-riverbend': outfitters,
}

