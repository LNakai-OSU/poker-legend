import type { StampArt } from '../stampArt'
import { INK, glow, oval, shadow, tint } from '../pixelArt'

/**
 * The things a room collects along its walls and in its corners.
 *
 * A room with one rug in the middle and nothing else is a stage set. Real rooms
 * fill up at the edges — a plant someone keeps forgetting to water, a lamp, a
 * coat stand, boxes nobody unpacked, a poster for a car on the showroom wall —
 * and these are those, each a tile or two, so a map can tuck them into the
 * corners that a sofa or a counter leaves.
 */

// ---------------------------------------------------------------------------
// Standing on the floor
// ---------------------------------------------------------------------------

/** A rubber plant to head height in a terracotta pot. */
const tallPlant: StampArt = {
  bleed: { top: 12 },
  standsUp: 4,
  draw: (px) => {
    shadow(px, 3, 13, 11, 3, 0.3)
    px(7, -7, 2, 15, '#4a3a20')
    for (const [x, y, right] of [[2, -11, 0], [9, -9, 1], [1, -5, 0], [10, -4, 1], [2, 0, 0], [9, 2, 1]] as const) {
      px(x, y, 5, 3, '#2e7a3e')
      px(x + 1, y, 3, 1, '#5aaa5e')
      px(x + (right ? 4 : 0), y + 2, 1, 1, '#1e5a2e')
      px(right ? x - 1 : x + 5, y + 1, 1, 1, '#2e7a3e')
    }
    px(6, -13, 3, 3, '#3a8a4a')
    px(6, -13, 2, 1, '#6aba6a')
    px(4, 8, 8, 7, '#b0603a')
    px(4, 8, 8, 1, '#d8804a')
    px(4, 9, 8, 1, '#8a4a2a')
    px(11, 9, 1, 6, '#8a4a2a')
    px(5, 14, 6, 1, '#7a3e22')
  },
}

/** A brass standard lamp with a pleated shade, lit. */
const floorLamp: StampArt = {
  bleed: { top: 13 },
  standsUp: 4,
  draw: (px) => {
    shadow(px, 4, 13, 9, 3, 0.3)
    px(5, 13, 6, 2, '#6a4a20')
    px(5, 13, 6, 1, '#c8a040')
    px(7, -3, 2, 16, '#a8801e')
    px(7, -3, 1, 16, '#f2d068')
    glow('lamp', () => {
      px(5, -13, 6, 2, '#f8dc90')
      px(4, -11, 8, 3, '#f4d68a')
      px(3, -8, 10, 3, '#e8c068')
    })
    for (const x of [5, 8, 11]) px(x, -10, 1, 5, '#d8a850')
    px(3, -5, 10, 1, '#a8801e')
  },
}

/** A buttoned armchair facing into the room. */
function armchair(leather: string): StampArt {
  const dark = tint(leather, -0.35)
  const hi = tint(leather, 0.3)
  return {
    draw: (px) => {
      shadow(px, 1, 13, 15, 3, 0.3)
      px(2, 0, 12, 8, dark)
      px(3, 0, 10, 7, leather)
      px(3, 0, 10, 1, hi)
      for (const x of [5, 8, 11]) px(x, 3, 1, 1, dark)
      px(1, 5, 3, 9, dark)
      px(12, 5, 3, 9, dark)
      px(1, 5, 3, 1, hi)
      px(12, 5, 3, 1, hi)
      px(4, 7, 8, 5, leather)
      px(4, 7, 8, 1, hi)
      px(4, 12, 8, 2, dark)
      px(2, 14, 1, 2, '#2a1a10')
      px(13, 14, 1, 2, '#2a1a10')
    },
  }
}

/** A round side table with a lamp lit on it and magazines. */
const sideTable: StampArt = {
  bleed: { top: 5 },
  standsUp: 2,
  draw: (px) => {
    shadow(px, 3, 13, 11, 3, 0.3)
    px(7, 9, 2, 6, '#5a3a20')
    px(5, 14, 6, 1, '#4a2e18')
    oval(px, 2, 6, 12, 5, '#5a3a20')
    oval(px, 2, 5, 12, 5, '#8a5a34')
    px(4, 6, 6, 1, '#a8744a')
    px(3, 7, 5, 2, '#e05a3a')
    px(4, 7, 4, 1, '#f4f4f4')
    px(10, 2, 2, 5, '#c8a040')
    px(9, 6, 4, 1, '#a8801e')
    glow('lamp', () => {
      px(8, -5, 6, 2, '#f8dc90')
      px(7, -3, 8, 3, '#f4d68a')
    })
  },
}

/** A water cooler: a blue bottle upside down on a white stand. */
const waterCooler: StampArt = {
  bleed: { top: 8 },
  standsUp: 2,
  draw: (px) => {
    shadow(px, 3, 13, 11, 3, 0.3)
    px(4, 4, 8, 11, '#e8e8ec')
    px(4, 4, 8, 1, '#ffffff')
    px(11, 4, 1, 11, '#b8bcc8')
    px(5, 7, 2, 2, '#3a6ae0')
    px(9, 7, 2, 2, '#e03a3a')
    px(5, 10, 6, 1, '#8a8e98')
    px(5, -8, 6, 11, '#6ab4e8')
    px(5, -8, 6, 1, '#c8ecff')
    px(6, -7, 1, 9, '#b8e4ff')
    px(10, -7, 1, 9, '#4a94c8')
    px(7, 3, 2, 1, '#4a94c8')
  },
}

/** A wire rack of brochures, three pockets high. */
const brochureStand: StampArt = {
  bleed: { top: 4 },
  standsUp: 2,
  draw: (px) => {
    shadow(px, 3, 13, 11, 3, 0.3)
    px(3, -4, 1, 18, '#8a8e98')
    px(12, -4, 1, 18, '#8a8e98')
    const leaflets = [['#e05a3a', '#f2c84a', '#3a8ac8'], ['#3a9d5c', '#f4f4f4', '#d86a8a'], ['#2a5a8a', '#e8a040', '#f4f4f4']]
    leaflets.forEach((colors, tier) => {
      const y = -3 + tier * 5
      px(4, y, 8, 4, colors[0])
      px(6, y - 1, 3, 4, colors[1])
      px(9, y, 3, 4, colors[2])
      px(4, y + 3, 8, 1, '#5a5e68')
    })
    px(3, 14, 10, 1, '#5a5e68')
  },
}

/** Three new tyres in a stack. */
const tyreStack: StampArt = {
  draw: (px) => {
    shadow(px, 2, 13, 13, 3, 0.35)
    px(2, 3, 12, 12, '#1c1c22')
    for (const y of [6, 10]) px(2, y, 12, 1, '#2e2e36')
    px(3, 4, 1, 10, '#3a3a44')
    oval(px, 2, 0, 12, 6, '#2a2a32')
    oval(px, 5, 1, 6, 4, '#0e0e12')
    px(6, 2, 4, 1, '#8a8e98')
  },
}

/** Cardboard boxes, taped, one with its flaps open. */
const crates: StampArt = {
  draw: (px) => {
    shadow(px, 1, 13, 15, 3, 0.3)
    px(8, 1, 7, 9, '#b8854a')
    px(8, 1, 7, 2, '#d0a068')
    px(8, -1, 3, 2, '#dcae74')
    px(12, -1, 3, 2, '#dcae74')
    px(1, 6, 8, 9, '#c8955a')
    px(1, 6, 8, 2, '#dcae74')
    px(4, 6, 2, 9, '#e8d8a8')
    px(9, 10, 6, 5, '#c08a50')
    px(9, 10, 6, 1, '#d8a46a')
    px(2, 10, 2, 2, INK)
  },
}

/** A brass luggage trolley with cases piled on it. */
const luggageCart: StampArt = {
  bleed: { top: 9 },
  standsUp: 3,
  draw: (px) => {
    shadow(px, 1, 13, 15, 3, 0.3)
    px(1, -8, 2, 21, '#c8a040')
    px(13, -8, 2, 21, '#a8801e')
    px(1, -9, 14, 2, '#f2d068')
    px(3, 5, 10, 7, '#7a3a2a')
    px(3, 5, 10, 1, '#9a5a3a')
    px(7, 4, 2, 1, '#2a1a10')
    px(4, -1, 8, 6, '#2a4a7a')
    px(4, -1, 8, 1, '#4a6a9a')
    px(5, -5, 6, 4, '#d8c8a0')
    px(5, -5, 6, 1, '#f0e4c4')
    px(1, 12, 14, 2, '#a8801e')
    px(2, 14, 2, 2, '#2a2a30')
    px(12, 14, 2, 2, '#2a2a30')
  },
}

/** A gumball machine: a glass globe of colours on a red stand. */
const gumball: StampArt = {
  bleed: { top: 5 },
  standsUp: 2,
  draw: (px) => {
    shadow(px, 4, 13, 9, 3, 0.3)
    px(4, 13, 8, 2, '#a81c1c')
    px(6, 8, 4, 5, '#c82a2a')
    px(5, 5, 6, 4, '#d83a3a')
    px(7, 6, 2, 1, '#f4f4f4')
    oval(px, 3, -4, 10, 10, '#cfe6f0')
    const colors = ['#e83a3a', '#f2c84a', '#3a8ac8', '#3ac860', '#f4f4f4', '#c84aa8']
    for (let i = 0; i < 14; i++) px(4 + ((i * 5) % 8), -2 + ((i * 3) % 6), 1, 1, colors[i % colors.length])
    px(5, -2, 1, 3, '#ffffff')
    px(6, -5, 4, 2, '#c82a2a')
  },
}

/** A bentwood coat stand: a coat, a scarf, a hat on top. */
const coatStand: StampArt = {
  bleed: { top: 10 },
  standsUp: 4,
  draw: (px) => {
    shadow(px, 3, 13, 11, 3, 0.3)
    px(4, 14, 8, 1, '#4a2e1a')
    px(7, -8, 2, 22, '#6a4428')
    px(7, -8, 1, 22, '#8a5e3a')
    px(5, -10, 6, 2, '#2a2a34')
    px(4, -8, 8, 1, '#2a2a34')
    px(3, -5, 5, 13, '#6a5a4a')
    px(3, -5, 5, 1, '#8a7a68')
    px(9, -4, 3, 9, '#b83a3a')
    px(9, 3, 3, 2, '#e8d8a8')
  },
}

/** A red tool chest on castors. */
const toolChest: StampArt = {
  draw: (px) => {
    shadow(px, 2, 13, 13, 3, 0.3)
    px(2, 1, 12, 13, '#c82a2a')
    px(2, 1, 12, 1, '#e85a4a')
    for (const y of [4, 7, 10]) {
      px(3, y, 10, 1, '#7a1a1a')
      px(6, y + 1, 4, 1, '#d8dce4')
    }
    px(2, 14, 2, 2, '#2a2a30')
    px(12, 14, 2, 2, '#2a2a30')
    px(5, -1, 6, 2, '#5a5e68')
  },
}

/** A fish tank on a cabinet, lit blue, two fish going round. */
const fishTank: StampArt = {
  frames: 2,
  bleed: { top: 8 },
  standsUp: 2,
  draw: (px, c) => {
    shadow(px, 1, 13, c.w - 2, 3, 0.3)
    px(1, 6, c.w - 2, 9, '#3a2a20')
    px(1, 6, c.w - 2, 1, '#5a4030')
    px(c.w / 2 - 1, 9, 2, 3, '#2a1a10')
    px(1, -8, c.w - 2, 14, '#1a1a1e')
    glow('neon', () => {
      px(2, -7, c.w - 4, 12, '#2a8ac8')
      px(2, -7, c.w - 4, 2, '#7ac8f0')
    })
    px(2, 3, c.w - 4, 2, '#d8c890')
    px(6, -1, 1, 4, '#3a9d5c')
    px(7, -3, 1, 6, '#3a9d5c')
    px(c.w - 9, 0, 1, 3, '#3a9d5c')
    const f = c.frame
    px(10 + f * 4, -4, 3, 2, '#ff8a3a')
    px(9 + f * 4, -4, 1, 2, '#ffb07a')
    px(c.w - 12 - f * 3, 0, 3, 2, '#f2d84a')
    for (const [x, y] of [[8, -6], [16, -5], [22, -3]]) px(x, y - f, 1, 1, '#c8ecff')
  },
}

// ---------------------------------------------------------------------------
// On the wall
// ---------------------------------------------------------------------------

/** A poster in a white border: a car on a coast road, or a boat throwing spray. */
function poster(scene: 'car' | 'boat'): StampArt {
  return {
    draw: (px, c) => {
      const w = c.w - 8
      shadow(px, 5, 3, w, 11, 0.3)
      px(4, 2, w, 11, '#f4ecd8')
      const ix = 5
      const iw = w - 2
      if (scene === 'car') {
        px(ix, 3, iw, 5, '#f2a24a')
        px(ix, 3, iw, 2, '#e8603a')
        px(ix, 8, iw, 3, '#4a4a54')
        px(ix, 9, iw, 1, '#f4f4f4')
        const x = ix + 4
        px(x + 3, 5, 7, 2, '#a81c1c')
        px(x, 6, 14, 3, '#d82a2a')
        px(x, 6, 14, 1, '#ff6a5a')
        px(x + 2, 9, 2, 2, INK)
        px(x + 10, 9, 2, 2, INK)
      } else {
        px(ix, 3, iw, 4, '#9ad8f0')
        px(ix, 7, iw, 4, '#2a7ab0')
        px(ix + 3, 6, iw - 8, 2, '#f4f4f4')
        px(ix + 5, 5, 4, 1, '#e8603a')
        px(ix + iw - 5, 6, 3, 1, '#ffffff')
        px(ix + iw - 7, 7, 4, 1, '#c8ecff')
      }
      px(4, 12, w, 1, '#d8d0bc')
    },
  }
}

/** A calendar: a picture above, the month below, nobody turned it over. */
const calendar: StampArt = {
  draw: (px) => {
    shadow(px, 5, 3, 8, 11, 0.25)
    px(4, 2, 8, 11, '#f8f8f4')
    px(4, 2, 8, 1, '#8a8e98')
    px(5, 3, 6, 4, '#4a8ac8')
    px(5, 5, 6, 2, '#3a9d5c')
    px(8, 3, 2, 2, '#f2c84a')
    for (let r = 0; r < 3; r++) for (let k = 0; k < 3; k++) px(5 + k * 2, 8 + r * 2, 1, 1, '#5a5e68')
    px(9, 10, 1, 1, '#e03a3a')
  },
}

/** A plank on brackets: jars, a few books, a small plant. */
const wallShelf: StampArt = {
  draw: (px, c) => {
    shadow(px, 3, 10, c.w - 6, 2, 0.3)
    px(2, 9, c.w - 4, 2, '#7a4e2c')
    px(2, 9, c.w - 4, 1, '#9a6a3e')
    for (const x of [5, c.w - 7]) px(x, 11, 2, 3, '#4a2e18')
    px(4, 5, 3, 4, '#c8e0ec')
    px(4, 6, 3, 3, '#e8a050')
    px(8, 6, 3, 3, '#c8e0ec')
    px(8, 7, 3, 2, '#c83a3a')
    for (const [x, color] of [[13, '#3a6ab8'], [15, '#c8402e'], [17, '#3a9d5c']] as const) px(x, 3, 2, 6, color)
    px(19, 4, 2, 5, '#e8c860')
    px(c.w - 8, 6, 4, 3, '#b0603a')
    px(c.w - 9, 3, 3, 3, '#3a8a4a')
    px(c.w - 6, 2, 3, 4, '#4aaa5a')
  },
}

/** A dartboard with three darts in it, none of them in the middle. */
const dartboard: StampArt = {
  draw: (px) => {
    shadow(px, 4, 3, 10, 10, 0.3)
    oval(px, 3, 2, 10, 10, '#1a1a1e')
    oval(px, 4, 3, 8, 8, '#e8dcb8')
    oval(px, 5, 4, 6, 6, '#c82a2a')
    oval(px, 6, 5, 4, 4, '#e8dcb8')
    px(7, 6, 2, 2, '#3a9d5c')
    for (const [x, y] of [[4, 4], [10, 9], [11, 5]]) {
      px(x, y, 1, 1, '#d8dce4')
      px(x + 1, y - 1, 1, 1, '#f2c84a')
    }
  },
}

export const PROPS_ART: Record<string, StampArt> = {
  'plant-tall': tallPlant,
  'floor-lamp': floorLamp,
  armchair: armchair('#6a3420'),
  'armchair-green': armchair('#2e5a3e'),
  'side-table': sideTable,
  'water-cooler': waterCooler,
  'brochure-stand': brochureStand,
  'tyre-stack': tyreStack,
  crates,
  'luggage-cart': luggageCart,
  gumball,
  'coat-stand': coatStand,
  'tool-chest': toolChest,
  'fish-tank': fishTank,
  'poster-car': poster('car'),
  'poster-boat': poster('boat'),
  calendar,
  'wall-shelf': wallShelf,
  dartboard,
}
