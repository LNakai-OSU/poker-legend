import type { StampArt } from '../stampArt'
import { INK, glow, neonText, oval, shadow, textWidth, tint } from '../pixelArt'

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
// Out of town
// ---------------------------------------------------------------------------
//
// The outskirts are where the errands are, and an errand needs something to
// stand at: the woodpile you are paid to split, the heap of dead tubing you
// carry, the traps on the sand. Each is a tile, so it can sit under the
// errand's own point of interest and be the thing you walk up to.

/** Split logs stacked in a pyramid, and an axe left in the chopping block. */
const woodpile: StampArt = {
  bleed: { top: 3 },
  draw: (px) => {
    shadow(px, 0, 13, 16, 3, 0.35)
    for (const [x, y] of [[0, 9], [4, 9], [8, 9], [2, 5], [6, 5], [4, 1]]) {
      oval(px, x, y, 5, 5, '#4a2e1a')
      oval(px, x + 1, y + 1, 3, 3, '#d8b078')
      px(x + 2, y + 2, 1, 1, '#a07040')
    }
    px(12, 10, 4, 5, '#6a4428')
    px(12, 10, 4, 1, '#c8a070')
    px(13, 11, 2, 1, '#a07848')
    px(13, -2, 1, 12, '#a8784a')
    px(13, -2, 1, 1, '#d0a068')
    px(11, -2, 4, 3, '#8a909a')
    px(11, -2, 1, 3, '#d8dce4')
  },
}

/** A ball of dry brush the wind has left for now. You can walk through it. */
const tumbleweed: StampArt = {
  draw: (px) => {
    shadow(px, 3, 13, 11, 2, 0.22)
    oval(px, 3, 4, 11, 10, '#7a5a32')
    oval(px, 4, 5, 9, 8, '#a8844e')
    for (const [x, y, w] of [[5, 6, 5], [4, 8, 7], [6, 10, 5], [7, 5, 2], [9, 12, 2]] as const) px(x, y, w, 1, '#5e4424')
    for (const [x, y] of [[6, 7], [10, 7], [5, 10], [11, 10], [8, 9], [9, 6]]) px(x, y, 1, 1, '#d2b478')
    px(2, 8, 1, 1, '#a8844e')
    px(14, 7, 1, 1, '#a8844e')
    px(8, 3, 1, 1, '#a8844e')
  },
}

/** Dead neon tubing in a tangle, a broken letter on top, glass in the dust round it. */
const scrapHeap: StampArt = {
  bleed: { top: 2 },
  draw: (px) => {
    shadow(px, 0, 12, 16, 4, 0.32)
    px(1, 8, 14, 6, '#3a3440')
    px(2, 7, 12, 2, '#4a4452')
    // Tubes, unlit: pink and blue gone grey at the bends.
    for (const [x, y, w, col] of [[2, 6, 9, '#b0587e'], [4, 9, 10, '#5a8aa8'], [1, 11, 7, '#8a6aa8'], [9, 12, 6, '#b0587e']] as const) {
      px(x, y, w, 1, col)
      px(x, y + 1, w, 1, tint(col, -0.4))
      px(x + w - 2, y, 1, 1, '#cfc8d8')
    }
    // Half a giant letter E, its bulbs gone.
    px(9, -1, 2, 8, '#d8d0c0')
    px(9, -1, 5, 2, '#d8d0c0')
    px(9, 3, 4, 2, '#d8d0c0')
    for (const [x, y] of [[10, 0], [12, 0], [10, 4]]) px(x, y, 1, 1, '#5a5262')
    for (const [x, y] of [[0, 14], [5, 15], [14, 14], [3, 13]]) px(x, y, 1, 1, '#bfe4f0')
  },
}

/** A sign letter four feet tall, off a casino that is not there any more, leant against the dust. */
const DEAD_LETTERS: Array<{ shape: string[]; face: string }> = [
  { shape: ['.##.', '#..#', '####', '#..#', '#..#'], face: '#e8c84a' },
  { shape: ['####', '#...', '###.', '#...', '####'], face: '#f2f0e6' },
  { shape: ['.##.', '#...', '.##.', '...#', '##..'], face: '#e86aa8' },
  { shape: ['..#.', '.###', '####', '.###', '..#.'], face: '#ff8a4a' },
]

const deadLetter: StampArt = {
  variants: DEAD_LETTERS.length,
  bleed: { top: 8 },
  standsUp: 4,
  draw: (px, c) => {
    const { shape, face } = DEAD_LETTERS[c.variant % DEAD_LETTERS.length]
    shadow(px, 1, 12, 15, 4, 0.3)
    // Each cell of the letter is a 3x4 block: a painted face, a dark side, a dead bulb.
    shape.forEach((row, r) => {
      ;[...row].forEach((on, k) => {
        if (on !== '#') return
        const x = 1 + k * 3
        const y = -7 + r * 4
        px(x, y, 3, 4, tint(face, -0.55))
        px(x, y, 3, 3, tint(face, -0.12))
        px(x + 1, y + 1, 1, 1, '#4a4450')
      })
    })
    px(13, -6, 2, 20, '#6a6470')
    px(13, -6, 1, 20, '#8a8490')
  },
}

/** Wire crab traps stacked three high, a float tied to the top one. */
const crabTraps: StampArt = {
  bleed: { top: 2 },
  draw: (px) => {
    shadow(px, 0, 13, 16, 3, 0.3)
    for (const [x, y] of [[0, 8], [8, 8], [4, 2]]) {
      px(x, y, 8, 6, '#3a4a48')
      px(x + 1, y + 1, 6, 4, '#7a8a80')
      for (let k = 1; k < 7; k += 2) px(x + k, y + 1, 1, 4, '#3a4a48')
      px(x + 1, y + 3, 6, 1, '#3a4a48')
      px(x, y, 8, 1, '#a8b4a8')
    }
    oval(px, 11, -1, 4, 4, '#f05a3a')
    px(12, -1, 1, 1, '#ffb090')
    px(12, 3, 1, 2, '#e8d8b0')
  },
}

/** A heap of torn net, cork floats in it, a needle and twine on top. */
const netHeap: StampArt = {
  bleed: { top: 1 },
  draw: (px) => {
    shadow(px, 0, 13, 16, 3, 0.3)
    oval(px, 0, 3, 16, 12, '#4a5a4a')
    oval(px, 1, 4, 14, 10, '#6a7a5e')
    for (let y = 5; y < 13; y += 2) px(2, y, 12, 1, '#4a5a4a')
    for (let x = 3; x < 14; x += 3) px(x, 4, 1, 9, '#4a5a4a')
    for (const [x, y] of [[3, 6], [10, 5], [6, 10], [12, 10]]) {
      px(x, y, 2, 2, '#e8a44a')
      px(x, y, 1, 1, '#ffd08a')
    }
    px(8, 1, 1, 5, '#d8dce4')
    oval(px, 6, 0, 4, 3, '#e8d8b0')
  },
}

/** A timber drying rack strung with perch. */
const fishRack: StampArt = {
  bleed: { top: 6 },
  standsUp: 4,
  draw: (px) => {
    shadow(px, 0, 13, 16, 3, 0.3)
    for (const x of [1, 13]) {
      px(x, -5, 2, 19, '#6a4428')
      px(x, -5, 1, 19, '#9a6e44')
    }
    for (const y of [-4, 4]) {
      px(0, y, 16, 1, '#8a5e38')
      for (let x = 3; x < 13; x += 3) {
        px(x, y + 1, 2, 5, '#a8b0a0')
        px(x, y + 1, 1, 5, '#d0d8c8')
        px(x, y + 5, 2, 1, '#6a7468')
      }
    }
  },
}

/** Tall reeds at the water's edge, a cattail or two among them. */
const reeds: StampArt = {
  bleed: { top: 8 },
  standsUp: 6,
  draw: (px) => {
    shadow(px, 1, 13, 14, 3, 0.22)
    for (const [x, top, col] of [[1, -2, '#5a7a3a'], [3, -6, '#6a8a42'], [5, 0, '#4e6e34'], [7, -7, '#6a8a42'], [9, -3, '#5a7a3a'], [11, -5, '#7a9a4a'], [13, 1, '#4e6e34']] as const) {
      px(x, top, 1, 16 - top, col)
      px(x + 1, top + 3, 1, 13 - top, tint(col, -0.25))
    }
    for (const [x, y] of [[3, -6], [11, -5]]) {
      px(x, y, 2, 4, '#6a3e22')
      px(x, y, 1, 1, '#8a5a32')
    }
  },
}

/**
 * The chapel's arch on two legs, hung with plastic roses, and over it CHAPEL in
 * pink tube on a board, lit day and night. You can stand under it.
 */
const chapelArch: StampArt = {
  bleed: { top: 18, left: 2, right: 2 },
  standsUp: 16,
  frames: 2,
  lights: [{ x: 24, y: 18, reach: 26, color: '#ffc8e8', strength: 0.6 }],
  draw: (px, c) => {
    const w = c.w
    shadow(px, 2, 28, w - 4, 4, 0.26)
    // The legs and the arch, white trellis.
    for (const x of [3, w - 6]) {
      px(x, 0, 3, 32, '#d8d4cc')
      px(x, 0, 1, 32, '#ffffff')
      px(x + 2, 0, 1, 32, '#a8a49c')
    }
    px(3, -2, w - 6, 3, '#d8d4cc')
    px(5, -4, w - 10, 2, '#ffffff')
    px(8, -5, w - 16, 1, '#ffffff')
    // Roses up the legs and over the top.
    for (const [x, y] of [[2, 4], [5, 10], [2, 16], [5, 22], [w - 7, 6], [w - 4, 12], [w - 7, 18], [w - 4, 24], [10, -4], [18, -5], [26, -5], [34, -4]]) {
      px(x, y, 2, 2, '#e83a6a')
      px(x, y, 1, 1, '#ff8ab0')
      px(x + 2, y + 1, 1, 1, '#3a8a3a')
    }
    // CHAPEL on its board, over the arch.
    px(8, -17, w - 16, 11, INK)
    px(9, -16, w - 18, 9, '#2a1430')
    const words = 'CHAPEL'
    const x = Math.round((w - textWidth(words)) / 2)
    neonText(px, words, x, -14, '#ffe0f6', '#c8309a')
    // The L buzzes: lit in one frame, out in the other.
    if (c.frame) px(x + textWidth('CHAPE') + 1, -15, 4, 7, '#2a1430')
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
  woodpile,
  tumbleweed,
  'scrap-heap': scrapHeap,
  'dead-letter': deadLetter,
  'crab-traps': crabTraps,
  'net-heap': netHeap,
  'fish-rack': fishRack,
  reeds,
  'chapel-arch': chapelArch,
}
