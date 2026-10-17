import type { StampArt } from '../stampArt'
import { INK, oval, shadow, sprite, text, textCentred, tint } from '../pixelArt'
import { roundWindow, washer } from './buildingParts'
import { carSide } from './townCoast'

/**
 * Everything inside a room that is not part of a game.
 *
 * A GBA room is furniture against the walls and a rug in the middle: a bed
 * with a pillow and a turned-down blanket, a television on a stand, a bookshelf
 * of coloured spines, a table, a plant. Shops have their own fittings — the
 * corner shop's shelves and lit cooler, the launderette's machines, the tailor's
 * rails and dummies — so no two rooms are the same room with different crates.
 *
 * Things hung on a wall (pictures, windows, portholes, signs) are stamps whose
 * tiles are all `?`: they leave the wall a wall and only paint on it.
 */

// ---------------------------------------------------------------------------
// On the wall
// ---------------------------------------------------------------------------

/** A window in the back wall, curtained, with the view behind it. */
function wallWindow(view: 'brick' | 'sky' | 'sea' | 'night' | 'garden', curtain: string): StampArt {
  return {
    draw: (px, c) => {
      const w = c.w - 6
      px(3, 2, w, 11, '#3a2a20')
      px(4, 3, w - 2, 9, '#ece2c8')
      const gx = 5
      const gw = w - 4
      if (view === 'brick') {
        // The wall four feet away, and a slice of grey sky over it.
        px(gx, 4, gw, 7, '#6a3a2e')
        for (let y = 5; y < 11; y += 2) px(gx, y, gw, 1, '#4e2a22')
        px(gx, 4, gw, 1, '#9aa4b0')
      } else if (view === 'sky') {
        px(gx, 4, gw, 7, '#8ac8f0')
        px(gx, 4, gw, 3, '#b8e0f8')
        px(gx + 3, 6, 5, 1, '#ffffff')
        px(gx + 8, 8, 4, 1, '#ffffff')
      } else if (view === 'sea') {
        px(gx, 4, gw, 4, '#9ad0f0')
        px(gx, 8, gw, 3, '#2a7ab0')
        px(gx + 2, 9, 3, 1, '#a8d8f0')
      } else if (view === 'garden') {
        px(gx, 4, gw, 4, '#9ad0f0')
        px(gx, 8, gw, 3, '#4a9a5a')
        px(gx + 3, 6, 4, 3, '#3a8a4a')
      } else {
        px(gx, 4, gw, 7, '#141a3a')
        for (const [x, y, color] of [[2, 1, '#ff4fd8'], [6, 3, '#4fe8ff'], [10, 2, '#ffe14f'], [4, 5, '#f4f4f4']] as const) {
          if (x < gw) px(gx + x, 4 + y, 1, 1, color)
        }
      }
      px(gx + Math.floor(gw / 2), 4, 1, 7, '#ece2c8')
      px(gx, 7, gw, 1, '#ece2c8')
      px(gx, 4, 2, 1, '#ffffff')
      // Curtains, gathered either side, and the rail.
      px(2, 2, w + 2, 1, '#5a4030')
      px(2, 3, 3, 10, curtain)
      px(w + 1, 3, 3, 10, curtain)
      px(3, 3, 1, 10, tint(curtain, 0.25))
      px(w + 2, 3, 1, 10, tint(curtain, 0.25))
      px(3, 13, w, 1, '#d8ccb0')
    },
  }
}

/** A framed picture. */
function painting(scene: 'landscape' | 'portrait' | 'ship' | 'horse' | 'abstract', frame: string): StampArt {
  return {
    draw: (px, c) => {
      const w = c.w - 6
      shadow(px, 4, 4, w, 9, 0.3)
      px(3, 3, w, 9, frame)
      px(3, 3, w, 1, tint(frame, 0.35))
      const ix = 4
      const iw = w - 2
      if (scene === 'landscape') {
        px(ix, 4, iw, 4, '#9ad0e8')
        px(ix, 8, iw, 3, '#5a9a4a')
        px(ix + 2, 6, 4, 2, '#7a8a9a')
      } else if (scene === 'portrait') {
        px(ix, 4, iw, 7, '#3a2a3a')
        px(ix + iw / 2 - 1, 5, 3, 3, '#d8a880')
        px(ix + iw / 2 - 2, 8, 5, 3, '#2a3a5a')
      } else if (scene === 'ship') {
        px(ix, 4, iw, 4, '#c8d8e8')
        px(ix, 8, iw, 3, '#3a6a9a')
        px(ix + 3, 7, 6, 2, '#5a3a24')
        px(ix + 5, 4, 1, 3, '#5a3a24')
        px(ix + 6, 4, 2, 2, '#f4f4f4')
      } else if (scene === 'horse') {
        px(ix, 4, iw, 7, '#e8c890')
        px(ix + 3, 6, 6, 3, '#6a3a1a')
        px(ix + 8, 5, 2, 2, '#6a3a1a')
        px(ix + 3, 9, 1, 2, '#6a3a1a')
        px(ix + 8, 9, 1, 2, '#6a3a1a')
      } else {
        px(ix, 4, iw, 7, '#f4ecd8')
        px(ix + 1, 5, 4, 4, '#d83a3a')
        px(ix + 5, 6, 4, 4, '#2a6ad8')
        px(ix + 8, 4, 2, 3, '#f2c84a')
      }
    },
  }
}

/** A round brass porthole with the river in it. */
const porthole: StampArt = {
  draw: (px) => {
    roundWindow(px, 8, 7, 4, '#c8a040', '#6ab0d0')
    px(6, 8, 4, 1, '#3a8ab0')
    px(5, 3, 1, 1, '#f2d068')
  },
}

/** A wall clock, the hands at nearly midnight. */
const clock: StampArt = {
  draw: (px) => {
    roundWindow(px, 8, 7, 4, '#3a2a20', '#f4f0e4')
    px(8, 4, 1, 3, INK)
    px(8, 7, 2, 1, INK)
  },
}

/** A neon sign hung on the wall, its tube flickering between two shades. */
function neonSign(words: string, tube: string, glow: string): StampArt {
  return {
    frames: 2,
    draw: (px, c) => {
      px(1, 3, c.w - 2, 9, '#0a0810')
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        textCentred(px, words, c.w / 2 + dx, 5 + dy, glow)
      }
      textCentred(px, words, c.w / 2, 5, c.frame ? tint(tube, 0.4) : tube)
    },
  }
}

/** A board on the wall: a menu, prices, the day's special. */
function board(lines: string[], ground: string, ink: string, frame: string): StampArt {
  return {
    draw: (px, c) => {
      px(2, 1, c.w - 4, 14, frame)
      px(3, 2, c.w - 6, 12, ground)
      lines.slice(0, 2).forEach((line, i) => text(px, line, 5, 3 + i * 6, i === 0 ? '#f2c84a' : ink))
    },
  }
}

/** A mounted fish over the counter, as in every waterside place that sells food or bait. */
const trophyFish: StampArt = {
  draw: (px) => {
    px(4, 4, 24, 8, '#5a3a24')
    px(5, 5, 22, 6, '#7a5234')
    sprite(px, [
      '..########....##',
      '.##########..###',
      '############.##.',
      '.##########..###',
      '..########....##',
    ], 8, 5, { '#': '#4a8a7a' })
    px(10, 6, 1, 1, INK)
    px(11, 8, 10, 1, '#8ac8b8')
  },
}

/** A life ring on the wall. */
const lifeRing: StampArt = {
  draw: (px) => {
    roundWindow(px, 8, 7, 5, '#e83a2a', '#ece8de')
    px(3, 7, 2, 1, '#ffffff')
    px(12, 7, 2, 1, '#ffffff')
    px(8, 2, 1, 2, '#ffffff')
    px(8, 11, 1, 2, '#ffffff')
  },
}

/** A plain door set in the back wall: the way to a room you are not shown. */
function wallDoor(leaf: string, frame: string, sign = ''): StampArt {
  return {
    draw: (px) => {
      px(2, 1, 12, 15, frame)
      px(3, 2, 10, 14, tint(leaf, -0.35))
      px(4, 3, 8, 13, leaf)
      px(4, 3, 8, 1, tint(leaf, 0.25))
      px(5, 5, 6, 4, tint(leaf, -0.15))
      px(5, 10, 6, 4, tint(leaf, -0.15))
      px(10, 9, 1, 1, '#f2c84a')
      if (sign) {
        px(5, 5, 6, 3, '#f2c84a')
        text(px, sign, 5, 5, INK)
      }
    },
  }
}

/** A pair of brass lift doors with the floor dial over them. */
const liftDoors: StampArt = {
  frames: 2,
  draw: (px, c) => {
    px(1, 0, c.w - 2, 16, '#a8801e')
    px(2, 1, c.w - 4, 1, '#f2d068')
    // The dial.
    px(c.w / 2 - 6, 1, 12, 4, '#3a2a14')
    for (let i = 0; i < 5; i++) px(c.w / 2 - 5 + i * 2, 2, 1, 1, i === (c.frame ? 4 : 3) ? '#ffe066' : '#8a6a2a')
    // The doors.
    px(3, 5, c.w - 6, 11, '#5a4420')
    for (const x of [4, c.w / 2 + 1]) {
      px(x, 6, c.w / 2 - 5, 10, '#d8b048')
      px(x, 6, 1, 10, '#f2d068')
      px(x + 2, 8, c.w / 2 - 9, 6, '#c8a040')
    }
    px(c.w / 2, 6, 1, 10, '#3a2a14')
    px(c.w - 6, 9, 2, 3, '#3a2a14')
    px(c.w - 5, 10, 1, 1, c.frame ? '#ff6a4a' : '#ffe066')
  },
}

// ---------------------------------------------------------------------------
// A home
// ---------------------------------------------------------------------------

/** A single bed, head to the wall: a pillow, the blanket turned down. */
function bed(blanket: string): StampArt {
  return {
    bleed: { top: 6 },
    draw: (px, c) => {
      shadow(px, 2, 4, c.w - 2, c.h - 2, 0.3)
      // Headboard against the wall.
      px(0, -6, c.w, 8, '#5a3a24')
      px(1, -5, c.w - 2, 6, '#7a5234')
      px(1, -5, c.w - 2, 1, '#9a6a44')
      // Mattress, pillow, blanket.
      px(1, 1, c.w - 2, c.h - 3, '#e8e4dc')
      px(3, 2, c.w - 6, 5, '#ffffff')
      px(3, 6, c.w - 6, 1, '#d4d0c8')
      px(1, 9, c.w - 2, c.h - 11, blanket)
      px(1, 9, c.w - 2, 2, '#f4f0e8')
      px(1, 11, c.w - 2, 1, tint(blanket, -0.25))
      for (let y = 14; y < c.h - 3; y += 4) px(2, y, c.w - 4, 1, tint(blanket, 0.15))
      px(c.w - 2, 9, 1, c.h - 11, tint(blanket, -0.3))
      // Footboard.
      px(0, c.h - 3, c.w, 3, '#5a3a24')
      px(0, c.h - 3, c.w, 1, '#7a5234')
    },
  }
}

/** A double bed, for a flat with more than one person in it. */
const doubleBed: StampArt = {
  bleed: { top: 6 },
  draw: (px, c) => {
    shadow(px, 2, 4, c.w, c.h - 2, 0.3)
    px(0, -6, c.w, 8, '#4a2e1a')
    px(1, -5, c.w - 2, 6, '#6a4228')
    px(1, -5, c.w - 2, 1, '#8a5a38')
    px(1, 1, c.w - 2, c.h - 3, '#e8e4dc')
    px(3, 2, c.w / 2 - 4, 5, '#ffffff')
    px(c.w / 2 + 1, 2, c.w / 2 - 4, 5, '#ffffff')
    px(1, 9, c.w - 2, c.h - 11, '#4a6a9a')
    px(1, 9, c.w - 2, 2, '#f4f0e8')
    for (let x = 4; x < c.w - 2; x += 6) px(x, 13, 3, c.h - 17, '#5a7aaa')
    px(0, c.h - 3, c.w, 3, '#4a2e1a')
  },
}

/** A television on a low stand, picture on. */
const tv: StampArt = {
  frames: 2,
  draw: (px, c) => {
    shadow(px, 2, 12, c.w - 2, 4, 0.3)
    px(1, 9, c.w - 2, 6, '#5a3a24')
    px(1, 9, c.w - 2, 1, '#7a5234')
    px(3, 11, 4, 3, '#3a2416')
    px(c.w - 7, 11, 4, 3, '#3a2416')
    px(2, 1, c.w - 4, 8, '#2a2a30')
    px(3, 2, c.w - 6, 6, c.frame ? '#5a8ab8' : '#6a9ac8')
    px(3, 2, c.w - 6, 1, '#a8d0f0')
    px(4, 4, 3, 2, c.frame ? '#e8c860' : '#f8d878')
    px(c.w / 2 - 1, 0, 1, 1, '#8a8e96')
    px(c.w / 2 + 2, 0, 1, 1, '#8a8e96')
  },
}

/** A kitchenette along the wall: a fridge, a counter with a sink, a stove, cupboards over. */
const kitchenette: StampArt = {
  draw: (px, c) => {
    // Upper cupboards and the splashback, on the wall row.
    px(0, 0, c.w, 16, '#d8d0c0')
    for (let x = 16; x < c.w; x += 6) px(x, 9, 1, 7, '#c8c0b0')
    px(16, 1, c.w - 16, 7, '#8a6a48')
    px(16, 1, c.w - 16, 1, '#a8885e')
    for (let x = 16; x < c.w; x += 8) {
      px(x, 1, 1, 7, '#5a4430')
      px(x + 5, 4, 1, 2, '#e8d8b0')
    }
    // Fridge, two tiles tall.
    px(1, 0, 14, 30, '#a8b0b8')
    px(2, 1, 12, 28, '#e8ecf0')
    px(2, 1, 12, 1, '#ffffff')
    px(2, 10, 12, 1, '#a8b0b8')
    px(12, 4, 1, 4, '#8a929c')
    px(12, 13, 1, 6, '#8a929c')
    px(4, 3, 3, 2, '#e8603a')
    px(7, 4, 2, 3, '#f2c84a')
    // Counter with the sink and the stove.
    px(16, 16, c.w - 16, 3, '#e8e0d0')
    px(16, 16, c.w - 16, 1, '#ffffff')
    px(16, 19, c.w - 16, 11, '#8a6a48')
    px(16, 19, c.w - 16, 1, '#5a4430')
    px(20, 16, 8, 3, '#9aa4ae')
    px(21, 17, 6, 1, '#6a747e')
    px(24, 12, 1, 4, '#c8ccd4')
    px(34, 16, 12, 3, '#2a2a30')
    for (const x of [35, 41]) px(x, 16, 4, 2, '#4a4a54')
    px(34, 20, 12, 8, '#3a3a44')
    px(35, 21, 10, 5, '#1a1a20')
    px(36, 22, 3, 1, '#e86a3a')
    for (let x = 19; x < 33; x += 7) px(x + 2, 23, 1, 3, '#e8d8b0')
    shadow(px, 0, 30, c.w, 2, 0.3)
  },
}

/** A bookshelf against the wall: four shelves of spines in every colour, the odd ornament. */
function bookshelf(wood: string): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 2, c.h - 2, c.w, 2, 0.3)
      px(0, 0, c.w, c.h, tint(wood, -0.45))
      px(1, 1, c.w - 2, c.h - 2, tint(wood, -0.25))
      const spines = ['#b83a3a', '#3a6ab8', '#e8c860', '#3a8a5a', '#8a4a8a', '#e8e4dc', '#c8703a']
      for (let y = 2; y < c.h - 4; y += 7) {
        px(1, y + 5, c.w - 2, 2, wood)
        px(1, y + 5, c.w - 2, 1, tint(wood, 0.25))
        let x = 2
        let i = y
        while (x < c.w - 3) {
          const bw = 1 + (i % 2)
          const bh = 4 + ((i * 7) % 2)
          px(x, y + 5 - bh, bw, bh, spines[i % spines.length])
          px(x, y + 5 - bh, bw, 1, tint(spines[i % spines.length], 0.3))
          x += bw + ((i * 3) % 5 === 0 ? 2 : 0)
          i++
        }
      }
      px(0, 0, c.w, 1, tint(wood, 0.2))
    },
  }
}

/** A small table with two chairs pulled up to it. */
function tableAndChairs(top: string, legs: string): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 3, 13, c.w - 2, 4, 0.3)
      px(1, 3, c.w - 2, 10, tint(top, -0.4))
      px(1, 3, c.w - 2, 8, top)
      px(1, 3, c.w - 2, 1, tint(top, 0.3))
      px(2, 11, 2, 5, legs)
      px(c.w - 4, 11, 2, 5, legs)
      // Chairs in front, backs to you.
      for (const x of [4, c.w - 14]) {
        px(x, 16, 10, 4, tint(legs, -0.1))
        px(x + 1, 19, 8, 6, legs)
        px(x + 1, 19, 8, 1, tint(legs, 0.3))
        px(x + 1, 25, 1, 5, legs)
        px(x + 8, 25, 1, 5, legs)
      }
    },
  }
}

/** A cast-iron radiator against the skirting, painted over too many times. */
const radiator: StampArt = {
  draw: (px) => {
    px(1, 6, 14, 9, '#a8a49a')
    for (let x = 2; x < 15; x += 2) {
      px(x, 6, 1, 9, '#d8d4c8')
      px(x + 1, 7, 1, 7, '#8a867c')
    }
    px(1, 15, 14, 1, '#6a665c')
    px(13, 13, 2, 2, '#c8a040')
  },
}

/** A rug on the floor, with a border and a pattern. Walk on it. */
function rug(field: string, border: string, motif: string): StampArt {
  return {
    draw: (px, c) => {
      const x = 3
      const y = 4
      const w = c.w - 6
      const h = c.h - 8
      px(x, y, w, h, border)
      px(x + 2, y + 2, w - 4, h - 4, field)
      px(x + 3, y + 3, w - 6, 1, motif)
      px(x + 3, y + h - 4, w - 6, 1, motif)
      px(x + 3, y + 3, 1, h - 6, motif)
      px(x + w - 4, y + 3, 1, h - 6, motif)
      // A diamond in the middle.
      const cx = Math.round(x + w / 2)
      const cy = Math.round(y + h / 2)
      for (let i = 0; i < 4; i++) px(cx - i, cy - 3 + i, i * 2 + 1, 1, motif)
      for (let i = 0; i < 3; i++) px(cx - i, cy + 3 - i, i * 2 + 1, 1, motif)
      // Fringe.
      for (let fx = x + 1; fx < x + w - 1; fx += 2) {
        px(fx, y - 1, 1, 1, '#e8dcc0')
        px(fx, y + h, 1, 1, '#e8dcc0')
      }
    },
  }
}

/** A sofa facing into the room: back, cushions, arms. */
function sofa(fabric: string, feet = '#3a2416'): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 2, 12, c.w - 2, 4, 0.3)
      px(0, 0, c.w, 9, tint(fabric, -0.35))
      px(1, 1, c.w - 2, 7, fabric)
      px(1, 1, c.w - 2, 1, tint(fabric, 0.3))
      px(0, 7, 4, 7, tint(fabric, -0.2))
      px(c.w - 4, 7, 4, 7, tint(fabric, -0.2))
      px(0, 7, 4, 1, tint(fabric, 0.2))
      px(c.w - 4, 7, 4, 1, tint(fabric, 0.2))
      for (let x = 4; x < c.w - 4; x += Math.floor((c.w - 8) / 2)) {
        px(x, 8, Math.floor((c.w - 8) / 2) - 1, 5, tint(fabric, 0.1))
        px(x, 8, Math.floor((c.w - 8) / 2) - 1, 1, tint(fabric, 0.35))
      }
      px(1, 14, 2, 2, feet)
      px(c.w - 3, 14, 2, 2, feet)
    },
  }
}

/** A folding card table in a front room, green felt, cans and chips, chairs round it. */
const cardTable: StampArt = {
  draw: (px, c) => {
    // Folding chairs at the ends and along the front.
    for (const [x, y] of [[2, 18], [c.w - 13, 18], [20, 34], [44, 34]]) {
      px(x, y, 10, 3, '#5a6270')
      px(x + 1, y + 3, 8, 5, '#7a828e')
      px(x + 1, y + 3, 8, 1, '#9aa2ae')
      px(x + 1, y + 8, 1, 4, '#4a525e')
      px(x + 8, y + 8, 1, 4, '#4a525e')
    }
    shadow(px, 13, 13, c.w - 24, 22, 0.3)
    px(11, 10, c.w - 22, 22, '#2a2a30')
    px(12, 11, c.w - 24, 19, '#2a7a46')
    px(12, 11, c.w - 24, 1, '#3a9a5a')
    px(13, 29, c.w - 26, 1, '#1e5a34')
    // The game on it: cards, chips, cans, an ashtray.
    for (let i = 0; i < 3; i++) px(28 + i * 4, 18, 3, 4, '#f4f4f8')
    px(29, 19, 1, 1, '#d82a2a')
    px(33, 19, 1, 1, '#15151d')
    for (const [x, y, color] of [[16, 14, '#e83a3a'], [16, 24, '#2a6ad8'], [56, 14, '#3ac860'], [56, 24, '#f4f4f4']] as const) {
      px(x, y, 2, 2, color)
      px(x + 3, y, 2, 2, color)
    }
    px(46, 13, 3, 4, '#c8303a')
    px(46, 13, 3, 1, '#e8e8f0')
    px(22, 25, 3, 4, '#3a8ac8')
    px(22, 25, 3, 1, '#e8e8f0')
    px(40, 24, 4, 3, '#8a8e96')
    px(41, 25, 2, 1, '#3a3a40')
  },
}

// ---------------------------------------------------------------------------
// Shops
// ---------------------------------------------------------------------------

const GOODS = ['#e05a3a', '#f2c14e', '#4a8ad8', '#3a9d5c', '#f4f4f4', '#c84aa8', '#e8a040']

/** Shelving against the wall, floor to ceiling, stocked. */
function wallShelves(wood: string, goods: string[], seed = 1): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 0, c.h - 2, c.w, 2, 0.3)
      px(0, 0, c.w, c.h, tint(wood, -0.4))
      px(1, 1, c.w - 2, c.h - 2, tint(wood, -0.2))
      for (let y = 3; y < c.h - 2; y += 7) {
        px(1, y + 4, c.w - 2, 2, wood)
        px(1, y + 4, c.w - 2, 1, tint(wood, 0.3))
        for (let x = 2; x < c.w - 3; x += 3) {
          const color = goods[(x * 3 + y + seed) % goods.length]
          const tall = (x + y + seed) % 3 === 0
          px(x, y + (tall ? 0 : 1), 2, tall ? 4 : 3, color)
          px(x, y + (tall ? 0 : 1), 1, 1, tint(color, 0.4))
        }
      }
    },
  }
}

/** A gondola of shelves in the middle of a shop, stocked both sides. */
function gondola(goods: string[], seed = 2): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 2, c.h - 3, c.w - 2, 3, 0.3)
      px(0, 2, c.w, c.h - 3, '#8a929c')
      px(1, 3, c.w - 2, c.h - 5, '#c8ccd4')
      px(0, 2, c.w, 1, '#e8ecf0')
      for (let y = 4; y < c.h - 4; y += 6) {
        px(1, y + 4, c.w - 2, 1, '#8a929c')
        for (let x = 2; x < c.w - 2; x += 3) {
          const color = goods[(x + y * 2 + seed) % goods.length]
          px(x, y + 1, 2, 3, color)
          px(x, y + 1, 1, 1, tint(color, 0.4))
        }
      }
    },
  }
}

/** A lit drinks cooler with glass doors. */
const cooler: StampArt = {
  frames: 2,
  draw: (px, c) => {
    shadow(px, 0, c.h - 2, c.w, 2, 0.3)
    px(0, 0, c.w, c.h, '#4a525e')
    px(1, 1, c.w - 2, 4, '#2a6ab8')
    text(px, 'COLD', 3, 0, '#ffffff')
    for (let d = 0; d < c.w / 16; d++) {
      const x = d * 16 + 2
      px(x, 6, 12, c.h - 9, c.frame ? '#d8f0ff' : '#c8e8fa')
      for (let y = 8; y < c.h - 4; y += 5) {
        px(x, y + 3, 12, 1, '#8aa0b0')
        for (let bx = x + 1; bx < x + 11; bx += 2) {
          const color = ['#e83a3a', '#3ac860', '#f2c84a', '#2a6ad8', '#e8e8f0'][(bx + y) % 5]
          px(bx, y, 1, 3, color)
        }
      }
      px(x + 1, 7, 1, c.h - 11, 'rgba(255, 255, 255, 0.6)')
      px(x + 10, 14, 1, 4, '#8a929c')
    }
  },
}

/**
 * A shop counter with a till: the counter top under the clerk, its front over
 * them, so whoever is serving stands behind it.
 */
function counter(top: string, front: string, stock: 'till' | 'glass' | 'marble'): StampArt {
  return {
    draw: (px, c) => {
      // The wall behind: a shelf of stock and a sign.
      px(0, 0, c.w, 16, tint(front, -0.35))
      px(1, 9, c.w - 2, 1, tint(front, 0.1))
      for (let x = 2; x < c.w - 2; x += 3) {
        const color = GOODS[(x * 5) % GOODS.length]
        px(x, 6, 2, 3, color)
        px(x, 12, 2, 3, GOODS[(x * 3 + 2) % GOODS.length])
      }
      px(1, 15, c.w - 2, 1, tint(front, 0.1))
      // The counter top.
      px(0, 16, c.w, 9, top)
      px(0, 16, c.w, 1, tint(top, 0.3))
      if (stock === 'till') {
        px(c.w - 18, 13, 12, 8, '#3a3a44')
        px(c.w - 17, 14, 10, 3, '#5aa8e0')
        px(c.w - 16, 18, 8, 2, '#8a929c')
        px(6, 18, 10, 4, '#e8c860')
        for (let x = 7; x < 16; x += 3) px(x, 19, 2, 2, '#d83a7a')
      } else if (stock === 'glass') {
        px(4, 17, c.w - 8, 6, '#a8d0e0')
        px(4, 17, c.w - 8, 1, '#e8f4fa')
        for (let x = 6; x < c.w - 8; x += 5) px(x, 20, 3, 2, ['#f2c84a', '#d8d8e0', '#e83a5a'][(x / 5) % 3 | 0])
      } else {
        px(c.w / 2 - 6, 18, 12, 2, '#c8a040')
        px(c.w / 2 - 2, 15, 4, 3, '#f4f4f4')
      }
    },
    over: (px, c) => {
      px(0, 25, c.w, 7, front)
      px(0, 25, c.w, 1, tint(front, 0.3))
      if (stock === 'glass') {
        px(2, 26, c.w - 4, 4, '#a8d0e0')
        px(2, 26, c.w - 4, 1, '#e8f4fa')
        for (let x = 4; x < c.w - 4; x += 6) px(x, 28, 3, 1, '#f2c84a')
      } else {
        for (let x = 2; x < c.w - 6; x += 10) {
          px(x, 27, 7, 3, tint(front, -0.15))
          px(x, 27, 7, 1, tint(front, -0.35))
        }
      }
      px(0, 31, c.w, 1, tint(front, -0.5))
    },
  }
}

/** A chrome rail of clothes. */
function clothesRack(colors: string[]): StampArt {
  return {
    draw: (px, c) => {
      shadow(px, 1, 13, c.w - 1, 3, 0.3)
      px(1, 2, c.w - 2, 1, '#d8dce4')
      px(1, 2, 1, 13, '#a8b0b8')
      px(c.w - 2, 2, 1, 13, '#a8b0b8')
      px(0, 14, 4, 1, '#8a929c')
      px(c.w - 4, 14, 4, 1, '#8a929c')
      for (let x = 3; x < c.w - 3; x += 3) {
        const color = colors[(x / 3) % colors.length | 0]
        px(x, 3, 3, 9, tint(color, -0.25))
        px(x, 3, 2, 9, color)
        px(x + 1, 2, 1, 1, '#8a929c')
      }
    },
  }
}

/** A dressmaker's dummy in a suit, two tiles tall. */
function mannequin(suit: string, shirt: string): StampArt {
  return {
    draw: (px) => {
      shadow(px, 4, 28, 10, 3, 0.3)
      px(6, 3, 4, 4, '#d8c8b0')
      px(7, 7, 2, 1, '#c8b8a0')
      px(3, 8, 10, 12, suit)
      px(3, 8, 10, 1, tint(suit, 0.3))
      px(7, 8, 2, 7, shirt)
      px(7, 9, 2, 4, '#a82a2a')
      px(3, 8, 1, 12, tint(suit, 0.2))
      px(12, 8, 1, 12, tint(suit, -0.3))
      px(4, 20, 8, 4, tint(suit, -0.15))
      px(7, 24, 2, 5, '#8a929c')
      px(4, 29, 8, 2, '#5a6270')
    },
  }
}

/** A tall mirror on a stand. */
const standingMirror: StampArt = {
  draw: (px) => {
    shadow(px, 4, 28, 10, 3, 0.3)
    px(3, 1, 10, 26, '#5a3a24')
    px(4, 2, 8, 24, '#b8d0e0')
    px(4, 2, 8, 6, '#d8e8f4')
    px(5, 3, 1, 10, '#ffffff')
    px(2, 27, 12, 2, '#5a3a24')
    px(4, 29, 2, 2, '#3a2416')
    px(10, 29, 2, 2, '#3a2416')
  },
}

// ---------------------------------------------------------------------------
// The launderette and the diner
// ---------------------------------------------------------------------------

/** Dryers stacked over washers along the wall, one of them going round. */
const dryerStack: StampArt = {
  frames: 2,
  draw: (px, c) => {
    shadow(px, 0, c.h - 2, c.w, 2, 0.3)
    px(0, 0, c.w, c.h, '#8a929c')
    for (let i = 0; i < c.cols; i++) {
      const x = i * 16 + 2
      washer(px, x, 2, i === 1 ? (c.frame ? '#e8a040' : '#d88030') : '#5a6a7a')
      washer(px, x, 17, i === 3 ? (c.frame ? '#6aa8f0' : '#3a7ad0') : '#5a6a7a')
      px(x, 14, 11, 1, '#6a727c')
    }
  },
}

/** A row of free-standing washers. */
const washerRow: StampArt = {
  draw: (px, c) => {
    shadow(px, 0, c.h - 2, c.w, 2, 0.3)
    for (let i = 0; i < c.cols; i++) washer(px, i * 16 + 2, 2, i === 0 ? '#4a8ad8' : '#5a6a7a')
  },
}

/** A folding table: a long white top on thin legs, a basket of laundry on it. */
const foldingTable: StampArt = {
  draw: (px, c) => {
    shadow(px, 2, 10, c.w - 2, 4, 0.3)
    px(1, 3, c.w - 2, 6, '#c8ccd4')
    px(1, 3, c.w - 2, 1, '#f4f6f8')
    px(2, 9, 1, 6, '#8a929c')
    px(c.w - 3, 9, 1, 6, '#8a929c')
    px(6, 1, 10, 5, '#d8b080')
    px(7, 0, 8, 2, '#f4f4f4')
    px(9, 0, 3, 1, '#e8a0b0')
    px(22, 4, 8, 2, '#4a6ab8')
  },
}

/** A diner booth: a high-backed red bench either side of a table. */
const booth: StampArt = {
  draw: (px, c) => {
    shadow(px, 2, c.h - 3, c.w - 2, 3, 0.3)
    // Far bench.
    px(1, 0, c.w - 2, 8, '#7a1a1e')
    px(2, 1, c.w - 4, 6, '#c82a30')
    px(2, 1, c.w - 4, 1, '#e85a5a')
    for (let x = 5; x < c.w - 4; x += 6) px(x, 2, 1, 4, '#a8242a')
    // The table: chrome edge, a napkin holder and the sauce.
    px(3, 9, c.w - 6, 11, '#9aa2ae')
    px(4, 9, c.w - 8, 9, '#e8e4d8')
    px(4, 9, c.w - 8, 1, '#ffffff')
    px(c.w / 2 - 2, 11, 4, 3, '#c8ccd4')
    px(c.w / 2 + 3, 11, 1, 3, '#d83a2a')
    px(c.w / 2 + 5, 12, 1, 2, '#f2c84a')
    px(7, 14, 5, 2, '#f4f4f4')
    px(c.w - 12, 13, 5, 3, '#f4f4f4')
    // Near bench, its back to you.
    px(1, 20, c.w - 2, 12, '#7a1a1e')
    px(2, 21, c.w - 4, 10, '#c82a30')
    px(2, 21, c.w - 4, 1, '#e85a5a')
    px(2, 30, c.w - 4, 1, '#5a1014')
  },
}

/** A jukebox: an arch of bubble tubes, coloured lights chasing round it. */
const jukebox: StampArt = {
  frames: 2,
  draw: (px, c) => {
    shadow(px, 2, 28, 14, 4, 0.3)
    px(1, 3, 14, 27, '#5a3420')
    px(3, 0, 10, 4, '#5a3420')
    px(2, 4, 12, 12, '#f2c84a')
    px(3, 1, 10, 3, c.frame ? '#ff6a4a' : '#ffb84a')
    px(4, 4, 8, 11, c.frame ? '#e83a5a' : '#4a8ad8')
    px(5, 5, 6, 9, '#2a2a30')
    for (let i = 0; i < 3; i++) px(6 + i * 2, 6, 1, 7, ['#ff6a4a', '#4fe8ff', '#ffe14f'][(i + c.frame) % 3])
    px(3, 17, 10, 8, '#8a5a38')
    for (let y = 18; y < 24; y += 2) px(4, y, 8, 1, '#a87a4e')
    px(2, 25, 12, 4, '#3a2416')
  },
}

/** The diner's counter: a pie case and the coffee on the back wall, red stools in front. */
const dinerCounter: StampArt = {
  draw: (px, c) => {
    // Back wall: coffee machines, the order wheel, a clock.
    px(0, 0, c.w, 16, '#c8ccd4')
    px(0, 0, c.w, 1, '#e8ecf0')
    for (const x of [6, 22]) {
      px(x, 3, 10, 11, '#3a3a44')
      px(x + 1, 4, 8, 3, '#8a929c')
      px(x + 2, 9, 3, 4, '#5a3420')
      px(x + 6, 9, 3, 4, '#5a3420')
    }
    px(42, 4, 18, 2, '#9aa2ae')
    for (let x = 43; x < 60; x += 4) px(x, 6, 3, 4, '#f4f0e0')
    roundWindow(px, c.w - 10, 7, 4, '#2a2a30', '#f4f0e4')
    // Counter top with a pie under a dome.
    px(0, 16, c.w, 9, '#e8e4d8')
    px(0, 16, c.w, 1, '#ffffff')
    px(0, 24, c.w, 1, '#9aa2ae')
    px(10, 15, 12, 6, '#c8e0ec')
    px(12, 18, 8, 3, '#e8a050')
    px(12, 18, 8, 1, '#f8d090')
    for (let x = 30; x < c.w - 8; x += 12) {
      px(x, 19, 4, 2, '#f4f4f4')
      px(x + 1, 18, 2, 1, '#5a3420')
    }
    // Stools along the front.
    if (c.rows > 2) {
      for (let x = 4; x < c.w - 8; x += 14) {
        shadow(px, x + 1, 44, 10, 2, 0.3)
        px(x + 2, 34, 8, 3, '#8a1a1e')
        px(x + 2, 33, 8, 3, '#d83a3a')
        px(x + 3, 33, 4, 1, '#ff8a8a')
        px(x + 5, 36, 2, 7, '#c8ccd4')
        px(x + 3, 43, 6, 1, '#9aa0aa')
      }
    }
  },
  over: (px, c) => {
    px(0, 25, c.w, 7, '#c8ccd4')
    px(0, 25, c.w, 1, '#f4f6f8')
    px(0, 27, c.w, 2, '#2a6ac8')
    px(0, 31, c.w, 1, '#6a727c')
  },
}

// ---------------------------------------------------------------------------
// Showrooms
// ---------------------------------------------------------------------------

/** A car on a showroom turntable, three tiles wide. */
function showroomCar(body: string): StampArt {
  return {
    draw: (px, c) => {
      oval(px, 2, 6, c.w - 4, c.h - 8, '#3a3a46')
      oval(px, 3, 7, c.w - 6, c.h - 11, '#6a6a7a')
      oval(px, 6, 9, c.w - 12, c.h - 16, '#7a7a8a')
      carSide(px, Math.round(c.w / 2) - 12, 6, body)
      px(Math.round(c.w / 2) - 6, c.h - 10, 12, 4, '#f4f0e4')
      px(Math.round(c.w / 2) - 6, c.h - 10, 12, 1, '#ffffff')
      text(px, '$', Math.round(c.w / 2) - 5, c.h - 10, '#3a8a4a')
    },
  }
}

/** A speedboat on its trailer. */
const speedboat: StampArt = {
  draw: (px, c) => {
    shadow(px, 3, c.h - 6, c.w - 4, 4, 0.3)
    px(4, c.h - 9, c.w - 10, 2, '#5a5e66')
    for (const x of [12, c.w - 22]) {
      px(x, c.h - 9, 6, 6, '#1a1a1e')
      px(x + 2, c.h - 7, 2, 2, '#a8b0b8')
    }
    // Hull, pointed at the bow, the stripe, the windscreen.
    for (let y = 6; y < c.h - 9; y++) {
      const bow = Math.max(0, 14 - (y - 6) * 2)
      px(4 + bow, y, c.w - 12 - bow, 1, y < 9 ? '#ffffff' : '#ece8de')
    }
    px(8, c.h - 14, c.w - 18, 2, '#e8603a')
    px(c.w - 26, 2, 10, 5, '#7fbcd8')
    px(c.w - 26, 2, 10, 1, '#ffffff')
    px(c.w - 10, 4, 4, 10, '#2a2a30')
  },
}

// ---------------------------------------------------------------------------
// Clubs and dining rooms
// ---------------------------------------------------------------------------

/** A round dining table with a white cloth, a candle and four chairs. */
function diningTable(chairColour: string): StampArt {
  return {
    frames: 2,
    draw: (px, c) => {
      for (const [x, y] of [[c.w / 2 - 5, 0], [0, c.h / 2 - 5], [c.w - 10, c.h / 2 - 5], [c.w / 2 - 5, c.h - 10]]) {
        px(x, y, 10, 10, tint(chairColour, -0.35))
        px(x + 1, y + 1, 8, 8, chairColour)
        px(x + 1, y + 1, 8, 1, tint(chairColour, 0.3))
      }
      oval(px, 10, 9, c.w - 18, c.h - 14, 'rgba(10, 8, 20, 0.3)')
      oval(px, 8, 7, c.w - 16, c.h - 14, '#d8d4cc')
      oval(px, 8, 6, c.w - 16, c.h - 15, '#f8f6f0')
      px(c.w / 2 - 1, c.h / 2 - 5, 2, 4, '#f4ecd8')
      px(c.w / 2 - 1, c.h / 2 - 7, 2, 2, c.frame ? '#ffd040' : '#ff9a3a')
      px(c.w / 2 - 9, c.h / 2, 5, 3, '#ffffff')
      px(c.w / 2 + 4, c.h / 2, 5, 3, '#ffffff')
      px(c.w / 2 - 8, c.h / 2 + 1, 3, 1, '#c8a040')
      px(c.w / 2 + 5, c.h / 2 + 1, 3, 1, '#8a2a3a')
    },
  }
}

/** A grand piano seen from above: the curved case, the lid raised, the keyboard and its bench. */
const piano: StampArt = {
  draw: (px, c) => {
    shadow(px, 5, 6, c.w - 6, c.h - 8, 0.35)
    // The case: straight along the keyboard and the left, curving in on the right.
    for (let y = 2; y < c.h - 8; y++) {
      const t = (y - 2) / (c.h - 10)
      const curve = Math.round(Math.max(0, Math.sin((1 - t) * Math.PI * 0.5)) * 14)
      px(3, y, c.w - 8 - curve, 1, '#15151d')
      px(4, y, c.w - 10 - curve, 1, y < 4 ? '#3a3a48' : '#22222c')
    }
    // The lid, propped open: a lighter plane with its stick.
    px(8, 5, 20, 12, '#3a3a48')
    px(8, 5, 20, 1, '#5a5a6a')
    px(9, 6, 1, 10, '#5a5a6a')
    px(18, 16, 1, 4, '#8a8e96')
    // The keyboard along the front, black keys in their groups.
    px(3, c.h - 10, 30, 6, '#15151d')
    px(4, c.h - 9, 28, 4, '#f4f4f4')
    for (let x = 5; x < 31; x += 1) if ([1, 2, 4, 5, 6].includes((x - 5) % 7)) px(x, c.h - 9, 1, 2, '#15151d')
    // The bench.
    px(10, c.h - 3, 16, 3, '#2a2a34')
    px(10, c.h - 3, 16, 1, '#4a4a58')
  },
}

/** A fireplace in a marble surround, the fire going, a mirror over it. */
const fireplace: StampArt = {
  frames: 2,
  draw: (px, c) => {
    px(4, 0, c.w - 8, 12, '#5a3a24')
    px(5, 1, c.w - 10, 10, '#b8d0e0')
    px(6, 2, 2, 8, '#ffffff')
    px(0, 12, c.w, 20, '#e8e0d0')
    px(0, 12, c.w, 2, '#ffffff')
    px(2, 14, c.w - 4, 1, '#c8bca4')
    px(8, 16, c.w - 16, 14, '#2a1a14')
    px(10, 26, c.w - 20, 3, '#5a3420')
    const flame = c.frame ? ['..o..', '.ooo.', 'ooyoo', 'oyyyo'] : ['.o...', '.oo.o', 'ooyoo', 'oyyyo']
    sprite(px, flame, Math.round(c.w / 2) - 3, 21, { o: '#ff7a2a', y: '#ffd040' })
    px(c.w / 2 - 8, 29, 16, 2, '#8a8070')
  },
}

/** A dance floor of squares lit in turns. Walk on it. */
const danceFloor: StampArt = {
  frames: 2,
  draw: (px, c) => {
    const colors = ['#ff4fd8', '#4fe8ff', '#ffe14f', '#7a4aff']
    for (let y = 2; y < c.h - 2; y += 8) {
      for (let x = 2; x < c.w - 2; x += 8) {
        const lit = ((x + y) / 8 + c.frame) % 2 === 0
        const color = colors[((x * 3 + y) / 8) % colors.length | 0]
        px(x, y, 7, 7, lit ? color : tint(color, -0.6))
        if (lit) px(x, y, 7, 1, tint(color, 0.4))
      }
    }
  },
}

/** The DJ's decks, lights blinking. */
const djBooth: StampArt = {
  frames: 2,
  draw: (px, c) => {
    shadow(px, 2, c.h - 3, c.w - 2, 3, 0.35)
    px(0, 2, c.w, c.h - 4, '#14101c')
    px(0, 2, c.w, 1, '#b46cff')
    for (const x of [6, c.w - 18]) {
      oval(px, x, 5, 12, 10, '#2a2a36')
      oval(px, x + 3, 7, 6, 6, '#15151d')
      px(x + 5, 9, 2, 2, '#c8ccd4')
    }
    for (let x = 20; x < c.w - 20; x += 3) px(x, 8, 2, 1, (x + c.frame) % 2 ? '#4fe8ff' : '#ff4fd8')
    px(4, c.h - 9, c.w - 8, 4, '#2a1a3a')
    for (let x = 6; x < c.w - 6; x += 4) px(x, c.h - 8, 2, 2, (x / 4 + c.frame) % 3 === 0 ? '#ffe14f' : '#7a4aff')
  },
}

/** A desert pot plant: a barrel cactus in terracotta. */
const cactus: StampArt = {
  draw: (px) => {
    shadow(px, 3, 13, 12, 3, 0.3)
    px(4, 10, 8, 5, '#b8603a')
    px(4, 10, 8, 1, '#d8804a')
    px(5, 3, 6, 8, '#3a8a4a')
    px(5, 3, 2, 8, '#5aaa62')
    px(9, 3, 2, 8, '#2a6a3a')
    px(6, 2, 4, 1, '#3a8a4a')
    px(7, 1, 2, 1, '#e8508a')
    for (const [x, y] of [[5, 5], [10, 6], [6, 8], [9, 9]]) px(x, y, 1, 1, '#e8e4c8')
  },
}

/** A red velvet bench on gold feet. */
const velvetBench: StampArt = {
  draw: (px, c) => {
    shadow(px, 2, 11, c.w - 2, 4, 0.3)
    px(1, 4, c.w - 2, 8, '#6a1020')
    px(1, 4, c.w - 2, 6, '#b81c2c')
    px(1, 4, c.w - 2, 1, '#e04a5a')
    for (let x = 4; x < c.w - 3; x += 5) px(x, 6, 1, 1, '#f2c84a')
    for (const x of [2, c.w - 4]) px(x, 12, 2, 3, '#c8a040')
  },
}

/** A concierge's desk in marble and gold, a bell on it. */
const conciergeDesk = counter('#f4eee2', '#2a2420', 'marble')

export const FURNITURE_ART: Record<string, StampArt> = {
  'window-brick': wallWindow('brick', '#8a6a9a'),
  'window-sky': wallWindow('sky', '#c84a4a'),
  'window-sea': wallWindow('sea', '#2a5a8a'),
  'window-garden': wallWindow('garden', '#e8c860'),
  'window-night': wallWindow('night', '#4a2a6a'),
  'painting-landscape': painting('landscape', '#c8a040'),
  'painting-portrait': painting('portrait', '#c8a040'),
  'painting-ship': painting('ship', '#5a3a24'),
  'painting-horse': painting('horse', '#5a3a24'),
  'painting-abstract': painting('abstract', '#14141a'),
  porthole,
  clock,
  'neon-open': neonSign('OPEN', '#ff4a5a', '#5a1018'),
  'neon-bar': neonSign('BAR', '#4fe8ff', '#14404a'),
  'neon-vip': neonSign('VIP', '#ff4fd8', '#5a1050'),
  'neon-cocktails': neonSign('COCKTAILS', '#ffe14f', '#5a4a10'),
  'menu-diner': board(['PIE', '$2.50'], '#2a2e2a', '#e8e8e0', '#5a3a24'),
  'menu-grill': board(['FISH', '$9'], '#2a2e2a', '#e8e8e0', '#8a6a30'),
  'prices-laundry': board(['WASH', '$2.50'], '#f4f4f4', '#2a6ab8', '#8a929c'),
  'trophy-fish': trophyFish,
  'life-ring': lifeRing,
  'door-back-room': wallDoor('#2a1a14', '#14100c'),
  'door-staff': wallDoor('#5a6270', '#3a3a44'),
  'door-vip': wallDoor('#1a1424', '#c8a040', 'VIP'),
  'lift-doors': liftDoors,
  bed: bed('#4a6a9a'),
  'bed-double': doubleBed,
  tv,
  kitchenette,
  bookshelf: bookshelf('#7a5234'),
  'bookshelf-dark': bookshelf('#4a2e1a'),
  'table-chairs': tableAndChairs('#9a6a3e', '#6a4428'),
  radiator,
  'rug-red': rug('#8a2a2a', '#5a1a1a', '#d8a040'),
  'rug-blue': rug('#2a4a7a', '#1a2a4a', '#e8d8a8'),
  'rug-green': rug('#2a6a4a', '#1a3a2a', '#e8c860'),
  sofa: sofa('#6a7a4a'),
  'sofa-leather': sofa('#5a2e1a'),
  'sofa-velvet': sofa('#6a2a8a', '#c8a040'),
  'card-table': cardTable,
  'shelves-groceries': wallShelves('#8a6a48', GOODS, 1),
  'shelves-souvenirs': wallShelves('#7a5234', ['#2fa4a0', '#c8402e', '#f2c84a', '#e8e4dc', '#6a4226'], 3),
  'shelves-outdoor': wallShelves('#6a4a2a', ['#3a7a4a', '#c84a2a', '#8a6a3a', '#2a4a7a', '#e8c860'], 5),
  'shelves-shoes': wallShelves('#2a2420', ['#14141a', '#5a3420', '#8a5a38', '#e8e4dc'], 7),
  'gondola-groceries': gondola(GOODS, 2),
  'gondola-gifts': gondola(['#2fa4a0', '#c8402e', '#f2c84a', '#e8e4dc', '#8a4a8a'], 4),
  cooler,
  'counter-till': counter('#c8b89a', '#6a4a30', 'till'),
  'counter-glass': counter('#e8e4dc', '#3a3a44', 'glass'),
  'counter-concierge': conciergeDesk,
  'rack-suits': clothesRack(['#3a3a44', '#1e2e5a', '#5a5a64', '#2a2a30']),
  'rack-linen': clothesRack(['#f4f0e0', '#bfe8d4', '#f2b8b0', '#a8d0f0', '#f4e0a0']),
  'rack-outdoor': clothesRack(['#3a6a3a', '#8a5a2a', '#c84a2a', '#2a4a7a']),
  'rack-gowns': clothesRack(['#b81c2c', '#14141a', '#f4ecd8', '#2a1a4a']),
  'mannequin-suit': mannequin('#2a2a34', '#f4f4f4'),
  'mannequin-navy': mannequin('#1e2e5a', '#f4f4f4'),
  'mannequin-gown': mannequin('#b81c2c', '#b81c2c'),
  'mirror-stand': standingMirror,
  'dryer-stack': dryerStack,
  'washer-row': washerRow,
  'folding-table': foldingTable,
  booth,
  jukebox,
  'diner-counter': dinerCounter,
  'car-red': showroomCar('#d82a2a'),
  'car-yellow': showroomCar('#ffd21e'),
  'car-silver': showroomCar('#c8ccd4'),
  speedboat,
  'dining-table': diningTable('#6a2a3a'),
  'dining-table-cane': diningTable('#d8b878'),
  piano,
  fireplace,
  'dance-floor': danceFloor,
  'dj-booth': djBooth,
  cactus,
  'velvet-bench': velvetBench,
}

