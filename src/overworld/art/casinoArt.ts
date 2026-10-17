import type { ArtContext, StampArt } from '../stampArt'
import { INK, oval, ovalSpans, shadow, sprite, text, textCentred, textWidth, tint, type Px } from '../pixelArt'
import { bulbBorder } from './buildingParts'

/**
 * The furniture of a gaming floor.
 *
 * A casino in the overworld used to be a grid of identical brown crates with a
 * person standing on one of them. These are the objects a GBA game corner is
 * made of — machines a tile wide and two tall with a lit topper and three reels
 * you can read, oval tables with a padded rail and chairs round them, a craps
 * layout, a cashier behind brass bars, a bar with bottles on the back shelf —
 * each drawn as one object, top lighter than front, with its shadow on the
 * carpet.
 */

// ---------------------------------------------------------------------------
// Slot machines
// ---------------------------------------------------------------------------

interface Colourway {
  topper: string
  topperHi: string
  topperLo: string
  cabinet: string
  cabinetHi: string
  cabinetLo: string
  trim: string
}

const RED: Colourway = {
  topper: '#e03a3a', topperHi: '#ff8070', topperLo: '#a82424',
  cabinet: '#a82a2a', cabinetHi: '#cc4a40', cabinetLo: '#741818', trim: '#f2c84a',
}
const BLUE: Colourway = {
  topper: '#3a7ae0', topperHi: '#8ab8ff', topperLo: '#2a4aa8',
  cabinet: '#2a4a9a', cabinetHi: '#4a6cc4', cabinetLo: '#1a2a68', trim: '#d8dce4',
}
const GREEN: Colourway = {
  topper: '#2aa860', topperHi: '#7ae0a0', topperLo: '#1a7a40',
  cabinet: '#1e7a4a', cabinetHi: '#3a9c66', cabinetLo: '#124e30', trim: '#f2c84a',
}
const NEON_PINK: Colourway = {
  topper: '#ff4fd8', topperHi: '#ffb0f0', topperLo: '#b02a98',
  cabinet: '#2a1a3a', cabinetHi: '#4a2e62', cabinetLo: '#140c1e', trim: '#4fe8ff',
}
const NEON_CYAN: Colourway = {
  topper: '#4fe8ff', topperHi: '#c0f8ff', topperLo: '#2a98b0',
  cabinet: '#1a2238', cabinetHi: '#2e3a5a', cabinetLo: '#0c1020', trim: '#ff4fd8',
}
const IVORY: Colourway = {
  topper: '#f2c84a', topperHi: '#fff0a8', topperLo: '#b08a20',
  cabinet: '#ece4d4', cabinetHi: '#fbf6ea', cabinetLo: '#c8bca4', trim: '#d8b048',
}
const BURGUNDY: Colourway = {
  topper: '#c8203a', topperHi: '#f06a7a', topperLo: '#8a1424',
  cabinet: '#5a1222', cabinetHi: '#7a2234', cabinetLo: '#3a0a14', trim: '#f2c84a',
}

type Reel = '7' | 'cherry' | 'bar' | 'bell'

const SYMBOLS: Record<Reel, string[]> = {
  '7': ['rrr', '..r', '.r.', '.r.', '.r.'],
  cherry: ['.g.', 'g.g', 'g.g', 'r.r', 'r.r'],
  bar: ['...', 'yyy', 'kkk', 'yyy', '...'],
  bell: ['.y.', 'yyy', 'yyy', 'yyy', 'y.y'],
}
const SYMBOL_COLOURS = { r: '#e02020', g: '#2a9a3a', y: '#e8b020', k: '#15151d' }

/**
 * One machine, sixteen units wide and thirty-two tall: a rounded topper with
 * three bulbs and an emblem, the reel window with three readable symbols, a
 * credit readout, buttons, coin slot, payout tray and plinth, and a lever with
 * a red ball on the right.
 */
function slotMachine(px: Px, x: number, y: number, c: Colourway, reels: [Reel, Reel, Reel], frame: number, emblem: Reel | 'star') {
  // The gap either side of the cabinet is in shadow, so a bank reads as separate machines.
  px(x, y, 16, 32, '#0e0c14')
  // Topper.
  px(x + 2, y, 12, 1, INK)
  px(x + 1, y + 1, 14, 7, INK)
  px(x + 2, y + 1, 12, 6, c.topper)
  px(x + 2, y + 1, 12, 1, c.topperHi)
  px(x + 2, y + 1, 1, 6, c.topperHi)
  px(x + 13, y + 1, 1, 6, c.topperLo)
  for (let i = 0; i < 3; i++) {
    const lit = (i + frame) % 2 === 0
    px(x + 4 + i * 3, y + 2, 2, 1, lit ? '#ffe066' : '#a07a20')
  }
  if (emblem === 'star') {
    sprite(px, ['.y.', 'yyy', '.y.'], x + 6, y + 3, { y: c.trim })
  } else {
    sprite(px, SYMBOLS[emblem].slice(1, 4), x + 6, y + 3, { ...SYMBOL_COLOURS, r: '#ffffff', g: '#ffffff', y: '#ffffff' })
  }
  px(x + 1, y + 7, 14, 1, c.trim)
  // Cabinet, lit down the left, shaded down the right.
  px(x + 1, y + 8, 14, 20, INK)
  px(x + 2, y + 8, 12, 19, c.cabinet)
  px(x + 2, y + 8, 1, 19, c.cabinetHi)
  px(x + 12, y + 8, 2, 19, c.cabinetLo)
  // Reel window: a black inset, three reels, chrome dividers.
  px(x + 2, y + 9, 13, 7, INK)
  for (let r = 0; r < 3; r++) {
    const rx = x + 3 + r * 4
    px(rx, y + 10, 3, 5, '#f4f0e4')
    px(rx, y + 10, 3, 1, '#d4cec0')
    px(rx, y + 14, 3, 1, '#d4cec0')
    sprite(px, SYMBOLS[reels[r]], rx, y + 10, SYMBOL_COLOURS)
    if (r < 2) px(rx + 3, y + 10, 1, 5, '#c0c0c8')
  }
  px(x + 2, y + 16, 13, 1, c.trim)
  // Credit readout, buttons, coin slot.
  px(x + 4, y + 18, 7, 2, '#2a0a0a')
  px(x + 5, y + 18, 1, 1, '#ff4a4a')
  px(x + 7, y + 18, 1, 1, '#ff4a4a')
  px(x + 9, y + 19, 1, 1, '#ff4a4a')
  px(x + 3, y + 21, 2, 1, '#e83a3a')
  px(x + 6, y + 21, 2, 1, '#f2c84a')
  px(x + 9, y + 21, 2, 1, '#3ac860')
  px(x + 11, y + 20, 2, 1, '#d8dce4')
  px(x + 11, y + 21, 2, 1, INK)
  // Payout tray with a coin or two in it.
  px(x + 3, y + 23, 10, 3, '#15151d')
  px(x + 3, y + 23, 10, 1, '#3a3a44')
  px(x + 5 + (frame % 2), y + 25, 1, 1, '#f2c84a')
  px(x + 8, y + 25, 1, 1, '#f2c84a')
  px(x + 3, y + 26, 10, 1, '#d8dce4')
  // Plinth.
  px(x + 1, y + 28, 14, 4, '#22222c')
  px(x + 1, y + 28, 14, 1, '#4a4a58')
  px(x + 2, y + 30, 12, 1, '#16161e')
  // The lever: a chrome arm up the right side, a red ball on top.
  px(x + 14, y + 9, 1, 9, '#c8ccd4')
  px(x + 15, y + 9, 1, 9, '#7a7e88')
  px(x + 14, y + 6, 2, 2, '#e02020')
  px(x + 14, y + 6, 1, 1, '#ff9a9a')
  px(x + 13, y + 16, 3, 2, '#5a5e68')
}

/** A stool in front of a machine: a round red seat on a chrome post. */
function stool(px: Px, x: number, y: number, seat = '#c82a2a') {
  shadow(px, x + 4, y + 11, 9, 2, 0.3)
  px(x + 5, y + 2, 7, 3, tint(seat, -0.35))
  px(x + 5, y + 1, 7, 3, seat)
  px(x + 6, y + 1, 4, 1, tint(seat, 0.35))
  px(x + 8, y + 4, 1, 6, '#c8ccd4')
  px(x + 9, y + 4, 1, 6, '#7a7e88')
  px(x + 6, y + 10, 6, 1, '#9aa0aa')
}

const REEL_SETS: Array<[Reel, Reel, Reel]> = [
  ['7', 'cherry', 'bar'], ['bar', 'bar', 'cherry'], ['cherry', '7', 'bell'],
  ['7', '7', '7'], ['bell', 'cherry', 'cherry'], ['bar', '7', 'bell'],
]

/** A bank of machines in a row with a stool in front of each. Footprint: two solid rows, then the stools. */
function slotBank(colourways: Colourway[], seat = '#c82a2a'): StampArt {
  return {
    frames: 2,
    draw: (px, c: ArtContext) => {
      for (let i = 0; i < c.cols; i++) {
        const way = colourways[i % colourways.length]
        const emblem = (['7', 'star', 'cherry', 'bar'] as const)[i % 4]
        slotMachine(px, i * 16, 0, way, REEL_SETS[(i * 5 + c.cols) % REEL_SETS.length], c.frame + i, emblem)
        if (c.rows > 2) stool(px, i * 16, 32, seat)
      }
      shadow(px, 0, 31, c.w, 1, 0.4)
    },
  }
}

/**
 * The progressive: a bank with a light-board over it counting up a jackpot,
 * hung across the top of the machines.
 */
function jackpotBank(colourways: Colourway[], board: string, seat: string): StampArt {
  const bank = slotBank(colourways, seat)
  return {
    frames: 2,
    bleed: { top: 14 },
    draw: (px, c) => {
      bank.draw(px, c)
      const bw = c.w - 8
      px(4, -14, bw, 15, '#0e0a14')
      px(5, -13, bw - 2, 13, board)
      bulbBorder(px, 6, -12, bw - 4, 11, c.frame)
      const words = 'JACKPOT'
      text(px, words, Math.round((c.w - textWidth(words)) / 2), -11, '#ffe066')
      const digits = c.frame ? '1,048,212' : '1,048,213'
      textCentred(px, digits.replace(/,/g, ''), c.w / 2, -6, '#ff6a4a')
      px(c.w / 2 - 1, -15, 2, 2, '#3a3a44')
    },
  }
}

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

interface TableStyle {
  felt: string
  feltHi: string
  line: string
  rail: string
  railHi: string
  railLine: string
  chair: string
  chairHi: string
  frame: string
}

const CLASSIC: TableStyle = {
  felt: '#1f7a46', feltHi: '#2a8e54', line: '#58b07a', rail: '#4a2e1a', railHi: '#7a5434', railLine: '#24140a',
  chair: '#8a2a2a', chairHi: '#b04a3a', frame: '#3a2416',
}
const BRASS: TableStyle = {
  felt: '#1c6e44', feltHi: '#26845a', line: '#e0b850', rail: '#5a3420', railHi: '#c8a040', railLine: '#2a160a',
  chair: '#6a3a2a', chairHi: '#8a5238', frame: '#2a160a',
}
const BAIZE: TableStyle = {
  felt: '#185a3a', feltHi: '#206c46', line: '#c8a048', rail: '#3a1c10', railHi: '#5e3220', railLine: '#1a0a04',
  chair: '#2a4a3a', chairHi: '#3e6a52', frame: '#24140a',
}
const TEAL: TableStyle = {
  felt: '#1e8a8a', feltHi: '#2aa0a0', line: '#a8e8e0', rail: '#b89058', railHi: '#e0c088', railLine: '#6a4e2a',
  chair: '#e8d8b0', chairHi: '#fff4d8', frame: '#8a6a3a',
}
const NEON: TableStyle = {
  felt: '#4a1a7a', feltHi: '#5e2a92', line: '#ff6ae0', rail: '#14101c', railHi: '#3a2a50', railLine: '#000000',
  chair: '#1a1a24', chairHi: '#4fe8ff', frame: '#0a0a10',
}
const ROYAL: TableStyle = {
  felt: '#6a1424', feltHi: '#7e1e30', line: '#e0b850', rail: '#1a1410', railHi: '#d8b048', railLine: '#0a0806',
  chair: '#e8dcc0', chairHi: '#fff6e0', frame: '#a8842c',
}

/** A chair at a table. `facing` is the side of the table it is on. */
function chair(px: Px, x: number, y: number, side: 'top' | 'bottom' | 'left' | 'right', s: TableStyle) {
  if (side === 'top') {
    px(x, y, 10, 5, s.frame)
    px(x + 1, y + 1, 8, 3, s.chair)
    px(x + 1, y + 1, 8, 1, s.chairHi)
    px(x + 1, y + 5, 8, 4, tint(s.chair, -0.25))
  } else if (side === 'bottom') {
    shadow(px, x + 1, y + 9, 10, 2, 0.3)
    px(x + 1, y, 8, 3, tint(s.chair, -0.25))
    px(x, y + 3, 10, 6, s.frame)
    px(x + 1, y + 4, 8, 4, s.chair)
    px(x + 1, y + 4, 8, 1, s.chairHi)
  } else {
    const back = side === 'left' ? x : x + 6
    const seat = side === 'left' ? x + 3 : x
    px(seat, y + 1, 7, 8, tint(s.chair, -0.25))
    px(back, y, 4, 10, s.frame)
    px(back + 1, y + 1, 2, 8, s.chair)
    px(back + 1, y + 1, 1, 8, s.chairHi)
  }
}

/** A few chips, and two cards, so a table reads as a game in progress. */
function chips(px: Px, x: number, y: number, colors: string[]) {
  colors.forEach((color, i) => {
    px(x + i * 3, y, 2, 2, tint(color, -0.3))
    px(x + i * 3, y, 2, 1, color)
  })
}

/**
 * An oval card table: a padded rail lit along its top, felt with a betting
 * line, the dealer's chip rack, the board and stacks in front of the seats,
 * and the front face of the rail so it reads as a table and not a rug.
 */
function cardTable(px: Px, x: number, y: number, w: number, h: number, s: TableStyle, board = 3) {
  // Shadow on the carpet, down and to the right.
  oval(px, x + 3, y + 4, w, h, 'rgba(10, 8, 20, 0.35)')
  // The rail's front face, then the rail, then the felt.
  oval(px, x, y + 2, w, h, s.railLine)
  oval(px, x, y, w, h, s.railLine)
  oval(px, x + 1, y + 1, w - 2, h - 2, s.rail)
  const spans = ovalSpans(w - 2, h - 2)
  spans.forEach(([inset, len], row) => {
    if (row < h / 2) px(x + 1 + inset, y + 1 + row, Math.min(len, 3), 1, s.railHi)
    if (row < 2) px(x + 1 + inset, y + 1 + row, len, 1, s.railHi)
  })
  oval(px, x + 4, y + 4, w - 8, h - 8, tint(s.felt, -0.25))
  oval(px, x + 4, y + 5, w - 8, h - 9, s.felt)
  oval(px, x + w / 4, y + h / 4, w / 2, h / 2, s.feltHi)
  // The betting line, a ring inside the felt.
  const ring = ovalSpans(w - 16, h - 14)
  ring.forEach(([inset, len], row) => {
    px(x + 8 + inset, y + 7 + row, 1, 1, s.line)
    px(x + 8 + inset + len - 1, y + 7 + row, 1, 1, s.line)
  })
  px(x + w / 2 - 6, y + 7, 12, 1, s.line)
  px(x + w / 2 - 6, y + h - 8, 12, 1, s.line)
  // The dealer's rack, by the rail at the top.
  const mx = Math.round(x + w / 2)
  px(mx - 6, y + 5, 12, 3, '#2a2a30')
  chips(px, mx - 5, y + 5, ['#e83a3a', '#3ac860', '#f4f4f4', '#2a2a30'])
  // The board.
  for (let i = 0; i < board; i++) {
    const cx = mx - Math.round((board * 4) / 2) + i * 4
    px(cx, Math.round(y + h / 2) - 2, 3, 4, '#f4f4f8')
    px(cx + 1, Math.round(y + h / 2) - 1, 1, 1, i % 2 ? '#d82a2a' : '#15151d')
  }
  // Stacks in front of the seats.
  chips(px, x + 9, Math.round(y + h / 2) - 1, ['#e83a3a', '#2a6ad8'])
  chips(px, x + w - 15, Math.round(y + h / 2) - 1, ['#3ac860', '#f2c84a'])
  chips(px, mx - 9, y + h - 8, ['#2a2a30'])
  chips(px, mx + 6, y + h - 8, ['#e83a3a'])
}

/** A six-seat poker table: 3x2 of felt, a chair at each end and two along each side. */
function pokerTable6(s: TableStyle): StampArt {
  return {
    draw: (px, c) => {
      chair(px, 18, 3, 'top', s)
      chair(px, 52, 3, 'top', s)
      chair(px, 1, 26, 'left', s)
      chair(px, 69, 26, 'right', s)
      cardTable(px, 9, 11, 62, 40, s, 5)
      chair(px, 20, 47, 'bottom', s)
      chair(px, 50, 47, 'bottom', s)
      void c
    },
  }
}

/** A heads-up table: two tiles of felt, a chair either end and one each side. */
function pokerTable4(s: TableStyle): StampArt {
  return {
    draw: (px) => {
      chair(px, 12, 2, 'top', s)
      chair(px, 1, 18, 'left', s)
      chair(px, 53, 18, 'right', s)
      cardTable(px, 9, 9, 46, 30, s, 3)
      chair(px, 38, 35, 'bottom', s)
    },
  }
}

// ---------------------------------------------------------------------------
// Craps and roulette
// ---------------------------------------------------------------------------

/**
 * A craps table: a long tub with a padded rail and a brass inner rail, the
 * layout printed on the felt — pass line, field, the six and eight, the
 * proposition boxes in the middle — dice in play and the stickman's stick.
 */
function crapsTable(felt: string, feltLine: string): StampArt {
  return {
    draw: (px, c) => {
      const x = 6
      const y = 10
      const w = c.w - 12
      const h = c.h - 20
      shadow(px, x + 3, y + 4, w, h, 0.35)
      px(x + 2, y + 2, w - 4, h, '#24140a')
      px(x, y + 4, w, h - 6, '#24140a')
      px(x + 2, y, w - 4, h - 2, '#4a2e1a')
      px(x, y + 2, w, h - 6, '#4a2e1a')
      px(x + 2, y, w - 4, 2, '#7a5434')
      // Brass inner rail and the felt.
      px(x + 3, y + 3, w - 6, h - 9, '#c8a040')
      px(x + 4, y + 4, w - 8, h - 11, felt)
      // Pass line along the near rail, field across the middle.
      px(x + 5, y + h - 9, w - 10, 2, '#f4f0e4')
      text(px, 'PASS LINE', x + 8, y + h - 9 - 6 > y + 4 ? y + h - 15 : y + 5, feltLine)
      px(x + 10, y + 9, w - 20, 5, tint(felt, 0.12))
      text(px, 'FIELD', x + Math.round(w / 2) - 9, y + 9, '#f2c84a')
      // Numbers along the far side.
      for (let i = 0; i < 6; i++) {
        const bx = x + 6 + i * Math.floor((w - 12) / 6)
        px(bx, y + 5, 7, 3, tint(felt, -0.2))
        px(bx + 2, y + 6, 3, 1, i === 1 || i === 4 ? '#e83a3a' : '#f4f0e4')
      }
      // Proposition boxes in the middle.
      px(x + Math.round(w / 2) - 7, y + 15, 14, 5, '#a82a2a')
      px(x + Math.round(w / 2) - 6, y + 16, 12, 3, '#c83a3a')
      // Dice in play, and chips.
      px(x + w - 22, y + 15, 4, 4, '#f4f4f8')
      px(x + w - 21, y + 16, 1, 1, '#15151d')
      px(x + w - 19, y + 18, 1, 1, '#15151d')
      px(x + w - 16, y + 17, 4, 4, '#f4f4f8')
      px(x + w - 14, y + 19, 1, 1, '#15151d')
      chips(px, x + 10, y + 16, ['#e83a3a', '#3ac860', '#2a6ad8'])
      // The stick, laid across the rail.
      px(x + 8, y + 1, Math.round(w / 2), 1, '#d8c8a0')
      px(x + 8 + Math.round(w / 2), y, 2, 2, '#d8c8a0')
    },
  }
}

/** A roulette table: the wheel at one end, the number layout at the other. */
const roulette: StampArt = {
  draw: (px, c) => {
    const x = 4
    const y = 8
    const w = c.w - 8
    const h = c.h - 16
    shadow(px, x + 3, y + 4, w, h, 0.35)
    px(x, y, w, h, '#24140a')
    px(x + 1, y + 1, w - 2, h - 2, '#4a2e1a')
    px(x + 1, y + 1, w - 2, 1, '#7a5434')
    px(x + 3, y + 3, w - 6, h - 6, '#1f7a46')
    // The wheel.
    const wx = x + 14
    const wy = y + Math.round(h / 2)
    for (let dy = -10; dy <= 10; dy++) {
      for (let dx = -11; dx <= 11; dx++) {
        const d = Math.sqrt(dx * dx + dy * dy * 1.2)
        if (d > 11) continue
        let color = '#5a3420'
        if (d < 10) {
          const seg = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 18)
          color = d > 6 ? (seg === 0 ? '#2a9a3a' : seg % 2 ? '#c82a2a' : '#15151d') : d > 4 ? '#8a6a3a' : '#d8b048'
        }
        px(wx + dx, wy + dy, 1, 1, color)
      }
    }
    px(wx - 1, wy - 1, 2, 2, '#fff4c8')
    px(wx + 5, wy - 4, 1, 1, '#ffffff')
    // The layout: a grid of red and black numbers.
    const gx = x + 30
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 6; col++) {
        const color = (row + col) % 2 ? '#c82a2a' : '#15151d'
        px(gx + col * 4, y + 6 + row * 5, 3, 4, color)
        px(gx + col * 4 + 1, y + 7 + row * 5, 1, 2, '#f4f0e4')
      }
    }
    px(gx - 3, y + 6, 2, 14, '#2a9a3a')
    chips(px, gx + 2, y + h - 7, ['#f2c84a', '#e83a3a', '#2a6ad8'])
  },
}

// ---------------------------------------------------------------------------
// The cage and the bar
// ---------------------------------------------------------------------------

/**
 * The cashier's cage. Its back wall and counter are under the people; the
 * brass bars and the counter's front are over them, so the cashier stands
 * behind the bars rather than in front of them.
 */
const cashierCage: StampArt = {
  draw: (px, c) => {
    // Back wall of the cage: panelling, a plate saying what it is, money behind.
    px(0, 0, c.w, 16, '#3a2416')
    px(0, 0, c.w, 2, '#c8a040')
    px(2, 3, c.w - 4, 11, '#5a3a24')
    px(c.w / 2 - 16, 3, 32, 7, '#c8a040')
    px(c.w / 2 - 15, 4, 30, 5, '#2a1a10')
    textCentred(px, 'CASHIER', c.w / 2, 4, '#f2d068')
    for (let x = 4; x < c.w - 4; x += 6) {
      if (x > c.w / 2 - 18 && x < c.w / 2 + 16) continue
      chips(px, x, 6, ['#e83a3a'])
      chips(px, x, 9, ['#3ac860'])
      px(x, 12, 4, 2, '#7ab878')
    }
    // Counter top: marble, with a bell and a tray of chips.
    px(0, 16, c.w, 9, '#d8d0c0')
    px(0, 16, c.w, 1, '#f4f0e8')
    px(c.w - 14, 18, 4, 3, '#c8a040')
    px(c.w - 13, 17, 2, 1, '#f2d068')
    chips(px, 8, 20, ['#e83a3a', '#3ac860', '#2a2a30', '#f4f4f4'])
  },
  over: (px, c) => {
    // Bars down from the cage roof to the counter, a gap at the window.
    px(0, 16, c.w, 1, '#a8801e')
    for (let x = 1; x < c.w; x += 4) {
      const window = x > c.w / 2 - 8 && x < c.w / 2 + 8
      if (!window) {
        px(x, 17, 1, 8, '#e0bc5c')
        px(x + 1, 17, 1, 8, '#8a6a1e')
      }
    }
    // The counter's front, panelled, with a brass kick rail.
    px(0, 25, c.w, 7, '#4a2a18')
    px(0, 25, c.w, 1, '#c8a040')
    for (let x = 3; x < c.w - 4; x += 12) {
      px(x, 27, 9, 3, '#5e3822')
      px(x, 27, 9, 1, '#3a2010')
    }
    px(0, 31, c.w, 1, '#c8a040')
  },
}

const BOTTLES = ['#3a8a4a', '#8a2a2a', '#c8a040', '#4a6ab8', '#e8e0c8', '#6a2a6a']

/**
 * A bar: a back bar on the wall — mirror, two shelves of bottles in three
 * shapes, a till — a counter in front with a brass foot rail, and stools.
 * The counter's front is over the people, so the bartender stands behind it.
 */
function bar(wood: string, top: string, seat: string): StampArt {
  return {
    draw: (px, c) => {
      // Back bar.
      px(0, 0, c.w, 16, tint(wood, -0.4))
      px(2, 1, c.w - 4, 9, '#5a6a7a')
      px(2, 1, c.w - 4, 1, '#8a9aaa')
      px(4, 2, 2, 7, 'rgba(255, 255, 255, 0.25)')
      for (const [shelf, y] of [[0, 4], [1, 9]] as const) {
        px(2, y + 3, c.w - 4, 1, tint(wood, 0.1))
        for (let x = 3; x < c.w - 3; x += 3) {
          const color = BOTTLES[(x + shelf * 3) % BOTTLES.length]
          const shape = (x / 3 + shelf) % 3
          if (shape === 0) {
            px(x, y, 2, 3, color)
            px(x, y - 1, 1, 1, color)
          } else if (shape === 1) {
            px(x, y + 1, 2, 2, color)
            px(x, y, 1, 1, tint(color, -0.3))
          } else {
            px(x, y - 1, 1, 4, color)
            px(x + 1, y + 1, 1, 2, color)
          }
          px(x, y + 1, 1, 1, 'rgba(255, 255, 255, 0.35)')
        }
      }
      px(c.w - 14, 10, 10, 6, '#3a3a44')
      px(c.w - 13, 10, 8, 2, '#8ad4ff')
      // Counter top.
      px(0, 16, c.w, 9, top)
      px(0, 16, c.w, 1, tint(top, 0.3))
      px(0, 24, c.w, 1, tint(top, -0.3))
      for (let x = 6; x < c.w - 6; x += 18) {
        px(x, 18, 2, 3, '#e8e0c8')
        px(x, 18, 2, 1, '#8ad4ff')
        px(x + 6, 19, 3, 2, '#c8a040')
      }
      if (c.rows > 2) {
        for (let x = 4; x < c.w - 8; x += 16) {
          shadow(px, x + 1, 44, 10, 2, 0.3)
          px(x + 2, 34, 8, 3, tint(seat, -0.35))
          px(x + 2, 33, 8, 3, seat)
          px(x + 3, 33, 4, 1, tint(seat, 0.4))
          px(x + 5, 36, 1, 7, '#c8ccd4')
          px(x + 6, 36, 1, 7, '#7a7e88')
          px(x + 3, 43, 6, 1, '#9aa0aa')
        }
      }
    },
    over: (px, c) => {
      px(0, 25, c.w, 7, wood)
      px(0, 25, c.w, 1, tint(wood, 0.3))
      for (let x = 2; x < c.w - 6; x += 10) {
        px(x, 27, 7, 3, tint(wood, -0.15))
        px(x, 27, 7, 1, tint(wood, -0.35))
      }
      px(0, 30, c.w, 1, '#e0bc5c')
      px(0, 31, c.w, 1, tint(wood, -0.5))
    },
  }
}

// ---------------------------------------------------------------------------
// The room itself: pillars, plants, ropes, light
// ---------------------------------------------------------------------------

/** A pillar two tiles tall: capital, shaft, base. */
function pillar(shaft: string, cap: string, base: string, fluted = true): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 4, 26, 12, 6, 0.3)
      px(1, 0, 14, 4, cap)
      px(1, 0, 14, 1, tint(cap, 0.3))
      px(1, 3, 14, 1, tint(cap, -0.3))
      px(3, 4, 10, 22, shaft)
      px(3, 4, 2, 22, tint(shaft, 0.25))
      px(11, 4, 2, 22, tint(shaft, -0.3))
      if (fluted) for (const x of [6, 8, 10]) px(x, 5, 1, 20, tint(shaft, -0.12))
      px(1, 26, 14, 5, base)
      px(1, 26, 14, 1, tint(base, 0.3))
      px(1, 30, 14, 1, tint(base, -0.4))
      void c
    },
  }
}

/** A palm in a pot, two tiles tall. */
const palm: StampArt = {
  draw: (px) => {
    shadow(px, 4, 28, 12, 4, 0.3)
    px(4, 22, 8, 8, '#a8603a')
    px(4, 22, 8, 1, '#d8804a')
    px(5, 29, 6, 2, '#7a4a2a')
    px(7, 8, 2, 14, '#7a5a30')
    px(7, 8, 1, 14, '#9a7a48')
    for (const [x, y, w] of [[0, 4, 7], [9, 4, 7], [2, 1, 5], [9, 1, 5], [1, 8, 5], [10, 8, 5], [5, 0, 6]]) {
      px(x, y, w, 2, '#2e8a4a')
      px(x, y, w, 1, '#4aaa62')
      px(x + (x < 8 ? 0 : w - 1), y + 2, 1, 2, '#2e8a4a')
    }
  },
}

/** A fern in a brass pot, one tile. */
const fern: StampArt = {
  draw: (px) => {
    shadow(px, 3, 13, 12, 3, 0.3)
    px(4, 10, 8, 5, '#c8a040')
    px(4, 10, 8, 1, '#f0d068')
    for (const [x, y] of [[2, 4], [5, 2], [9, 2], [12, 4], [3, 7], [7, 5], [11, 7]]) {
      px(x, y, 3, 2, '#3a8a4a')
      px(x, y, 2, 1, '#5aaa62')
    }
  },
}

/** A velvet rope between brass posts. */
const velvetRope: StampArt = {
  draw: (px, c) => {
    for (let x = 2; x < c.w; x += 16) {
      shadow(px, x + 1, 13, 4, 2, 0.3)
      px(x, 4, 3, 10, '#a8801e')
      px(x, 4, 1, 10, '#f2d068')
      px(x - 1, 3, 5, 2, '#f2d068')
      px(x - 1, 13, 5, 2, '#a8801e')
    }
    for (let x = 4; x < c.w - 2; x++) {
      const t = ((x - 4) % 16) / 14
      const sag = Math.round(Math.sin(t * Math.PI) * 3)
      if ((x - 2) % 16 < 3) continue
      px(x, 5 + sag, 1, 2, '#a81c2c')
      px(x, 5 + sag, 1, 1, '#d84050')
    }
  },
}

/** A pool of chandelier light on the floor. Walk through it; it is only light. */
const lightPool: StampArt = {
  draw: (px, c) => {
    oval(px, 4, 6, c.w - 8, c.h - 12, 'rgba(255, 236, 180, 0.07)')
    oval(px, 10, 11, c.w - 20, c.h - 22, 'rgba(255, 236, 180, 0.08)')
    oval(px, 16, 16, c.w - 32, c.h - 32, 'rgba(255, 240, 200, 0.1)')
  },
}

export const CASINO_ART: Record<string, StampArt> = {
  'slot-bank': slotBank([RED, BLUE, GREEN]),
  'slot-bank-6': slotBank([RED, BLUE, GREEN]),
  'slot-bank-western': slotBank([RED, GREEN], '#8a5a2a'),
  'slot-bank-brass': slotBank([GREEN, RED, BURGUNDY], '#6a3a2a'),
  'slot-bank-island': slotBank([BLUE, GREEN, RED], '#e8d8b0'),
  'slot-bank-neon': slotBank([NEON_PINK, NEON_CYAN], '#4fe8ff'),
  'slot-bank-jackpot': jackpotBank([NEON_CYAN, NEON_PINK], '#2a0a3a', '#ff4fd8'),
  'slot-bank-gold': jackpotBank([IVORY, BURGUNDY], '#3a0a14', '#a81c2c'),
  'poker-table': pokerTable4(CLASSIC),
  'poker-table-6': pokerTable6(CLASSIC),
  'poker-table-brass': pokerTable6(BRASS),
  'poker-table-baize': pokerTable6(BAIZE),
  'poker-table-baize-4': pokerTable4(BAIZE),
  'poker-table-teal': pokerTable6(TEAL),
  'poker-table-neon': pokerTable6(NEON),
  'poker-table-neon-4': pokerTable4(NEON),
  'poker-table-royal': pokerTable6(ROYAL),
  'poker-table-royal-4': pokerTable4(ROYAL),
  'craps-pit': crapsTable('#1f4f7a', '#cfe0f0'),
  'craps-table': crapsTable('#1e6a3e', '#f4f0e4'),
  'craps-table-neon': crapsTable('#3a1a6a', '#ff9ef0'),
  roulette,
  'cashier-cage': cashierCage,
  bar: bar('#5e3420', '#8a5a36', '#8a2a2a'),
  'bar-brass': bar('#4a2414', '#c89a58', '#6a2a2a'),
  'bar-tiki': bar('#8a6a30', '#d8b878', '#e8d8b0'),
  'bar-neon': bar('#1a1424', '#3a2a50', '#4fe8ff'),
  'bar-marble': bar('#2a2420', '#e8e0d0', '#a81c2c'),
  'pillar-wood': pillar('#7a4e2c', '#a87a4e', '#5a3820', false),
  'pillar-brass': pillar('#a8801e', '#f2d068', '#5a3420'),
  'pillar-marble': pillar('#f4eee2', '#d8b048', '#c8bca4'),
  'pillar-neon': pillar('#14101c', '#ff4fd8', '#4fe8ff', false),
  'pillar-bamboo': pillar('#c8a860', '#8a7234', '#6a5428', false),
  'pillar-green': pillar('#2e5a46', '#c8a048', '#1e3a2e'),
  palm,
  fern,
  'velvet-rope': velvetRope,
  'light-pool': lightPool,
}
