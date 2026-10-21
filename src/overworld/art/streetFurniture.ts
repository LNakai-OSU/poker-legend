import type { StampArt } from '../stampArt'
import { glow, mix, neonText, oval, shadow, textWidth, tint, type Px } from '../pixelArt'

/**
 * What stands in a street: lamp posts, benches, post boxes, hydrants, planters,
 * hedges, fences, street trees and parked cars — each town's own.
 *
 * A street with nothing on it is a corridor between shopfronts. These are the
 * things a GBA town is dressed with, drawn the way everything else here is: a
 * dark outline in a darker shade of the material, three or four shades lit from
 * the top-left, and a soft shadow on the ground to the right and below.
 *
 * Anything that stands up — a lamp post, a palm, a car — says how much of its
 * picture rises in front of whoever walks behind it (`standsUp`), and anything
 * that lights up after dark marks its glass, flame or tube with `glow`.
 */

const GROUND_SHADOW = 'rgba(10, 8, 20, 0.28)'

/** A soft oval shadow on the ground, under and a little to the right of something. */
function footShadow(px: Px, cx: number, y: number, w: number, h = 3) {
  oval(px, cx - Math.floor(w / 2) + 1, y, w, h, GROUND_SHADOW)
}

/** A thin round pole, lit down its left side. */
function pole(px: Px, x: number, y0: number, y1: number, hi: string, base: string, lo: string) {
  px(x, y0, 2, y1 - y0, base)
  px(x, y0, 1, y1 - y0, hi)
  px(x + 2, y0 + 1, 1, y1 - y0 - 1, tint(lo, -0.2))
}

// ---------------------------------------------------------------------------
// Lamp posts — one tile, standing two tall, a lantern on top
// ---------------------------------------------------------------------------

const WARM = '#ffd27a'

/** Basin: Victorian cast iron, a four-paned lantern and the bar the lamplighter leaned his ladder on. */
const lampIron: StampArt = {
  bleed: { top: 4, right: 2 },
  standsUp: 18,
  lights: [{ x: 8, y: 29, reach: 38, color: WARM, strength: 1 }],
  draw: (px) => {
    const iron = '#2a2b33'
    const ironHi = '#55576a'
    footShadow(px, 9, 29, 12)
    // The base: a stepped plinth.
    px(4, 27, 8, 4, iron)
    px(4, 27, 8, 1, ironHi)
    px(5, 24, 6, 3, iron)
    px(5, 24, 1, 3, ironHi)
    pole(px, 7, 9, 24, ironHi, iron, iron)
    px(6, 19, 4, 2, iron)
    px(6, 19, 4, 1, ironHi)
    // Ladder bar.
    px(3, 11, 10, 1, iron)
    px(3, 10, 1, 2, iron)
    px(12, 10, 1, 2, iron)
    // The lantern: a cap, four panes, a base.
    px(7, -4, 2, 1, iron)
    px(6, -3, 4, 1, iron)
    px(4, -2, 8, 2, iron)
    px(5, -2, 6, 1, ironHi)
    px(4, 0, 8, 8, iron)
    glow('lamp', () => {
      px(5, 1, 6, 6, '#efe6c4')
      px(5, 1, 6, 2, '#fbf6e2')
    })
    px(8, 1, 1, 6, iron)
    px(6, 2, 1, 2, '#ffffff')
    px(5, 8, 6, 1, iron)
    px(6, 9, 4, 1, iron)
  },
}

/** Silver Creek: a timber post, an iron bracket, a lantern hung off it. */
const lampWestern: StampArt = {
  bleed: { top: 2, right: 3 },
  standsUp: 18,
  lights: [{ x: 11, y: 29, reach: 34, color: '#ffc46a', strength: 1 }],
  draw: (px) => {
    const wood = '#8a5e3a'
    const woodHi = '#b07c50'
    const woodLo = '#5e3e24'
    footShadow(px, 9, 29, 12)
    // A footing of stones.
    px(3, 27, 9, 4, '#8a7258')
    px(3, 27, 9, 1, '#b09474')
    px(6, 28, 1, 3, '#6a5440')
    // The post, with its grain.
    px(5, 0, 4, 28, woodLo)
    px(5, 0, 3, 28, wood)
    px(5, 0, 1, 28, woodHi)
    for (const y of [5, 13, 21]) px(6, y, 1, 3, woodLo)
    px(4, -1, 6, 2, woodLo)
    px(4, -1, 6, 1, wood)
    // The bracket, and the lantern hanging from it.
    px(9, 3, 6, 1, '#2a2a30')
    px(9, 4, 1, 2, '#2a2a30')
    px(14, 3, 1, 3, '#2a2a30')
    px(12, 6, 5, 1, '#2a2a30')
    px(12, 7, 5, 7, '#2a2a30')
    glow('lamp', () => {
      px(13, 8, 3, 5, '#f4d68a')
      px(13, 8, 3, 2, '#fff0c0')
    })
    px(12, 14, 5, 1, '#2a2a30')
  },
}

/** Riverbend: a gas lamp painted bottle green, as every quay has. */
const lampQuay: StampArt = {
  bleed: { top: 4, right: 2 },
  standsUp: 18,
  lights: [{ x: 8, y: 29, reach: 36, color: WARM, strength: 1 }],
  draw: (px) => {
    const green = '#2a5a40'
    const greenHi = '#4a8a62'
    const greenLo = '#1a3a28'
    footShadow(px, 9, 29, 12)
    px(4, 25, 8, 6, greenLo)
    px(5, 25, 6, 5, green)
    px(5, 25, 1, 5, greenHi)
    px(4, 29, 8, 2, greenLo)
    pole(px, 7, 8, 25, greenHi, green, greenLo)
    px(6, 15, 4, 1, greenHi)
    px(6, 16, 4, 1, greenLo)
    // A square lantern under a pointed cap.
    px(7, -4, 2, 1, greenLo)
    px(5, -3, 6, 1, greenLo)
    px(3, -2, 10, 2, green)
    px(3, -2, 10, 1, greenHi)
    px(4, 0, 8, 8, greenLo)
    glow('lamp', () => {
      px(5, 1, 6, 6, '#ece4c2')
      px(5, 1, 6, 2, '#faf4dc')
    })
    px(6, 2, 1, 2, '#ffffff')
    px(4, 8, 8, 1, green)
    px(6, 9, 4, 1, greenLo)
  },
}

/** Crescent Harbor: black iron, two arms, two white globes. */
const lampHarbor: StampArt = {
  bleed: { top: 6, right: 2 },
  standsUp: 18,
  lights: [{ x: 8, y: 29, reach: 42, color: '#ffe8b0', strength: 1 }],
  draw: (px) => {
    const iron = '#1e2028'
    const ironHi = '#4a4e5e'
    footShadow(px, 9, 29, 14)
    // A fluted base.
    px(4, 23, 8, 8, iron)
    px(5, 23, 1, 7, ironHi)
    px(7, 23, 1, 7, ironHi)
    px(9, 23, 1, 7, ironHi)
    px(3, 29, 10, 2, iron)
    px(3, 29, 10, 1, ironHi)
    pole(px, 7, 2, 23, ironHi, iron, iron)
    // The arms, curling up at the ends.
    px(2, 3, 12, 1, iron)
    px(2, 4, 1, 1, iron)
    px(13, 4, 1, 1, iron)
    px(7, -6, 2, 3, iron)
    px(6, -3, 4, 1, iron)
    // Globes on the arms, and one on top.
    for (const [gx, gy] of [[0, -2], [11, -2], [5, -2]] as const) {
      if (gx === 5) continue
      px(gx + 1, gy, 3, 1, '#1e2028')
      glow('lamp', () => {
        px(gx, gy + 1, 5, 4, '#f4f0e0')
        px(gx + 1, gy + 5, 3, 1, '#f4f0e0')
        px(gx + 1, gy + 1, 3, 1, '#ffffff')
      })
      px(gx + 1, gy + 2, 1, 1, '#ffffff')
      px(gx + 4, gy + 2, 1, 3, '#c8c4b4')
    }
  },
}

/** Palm Cay: a bamboo torch, the flame alive. */
const lampTiki: StampArt = {
  bleed: { top: 6, right: 2 },
  standsUp: 18,
  frames: 2,
  lights: [{ x: 8, y: 29, reach: 32, color: '#ffa64a', strength: 1 }],
  draw: (px, c) => {
    const cane = '#c8a860'
    const caneHi = '#e8d088'
    const caneLo = '#8a7038'
    footShadow(px, 9, 29, 10)
    px(7, 4, 3, 27, caneLo)
    px(7, 4, 2, 27, cane)
    px(7, 4, 1, 27, caneHi)
    for (const y of [9, 15, 21, 27]) px(7, y, 3, 1, caneLo)
    // The woven cup, and the fire in it.
    px(5, 1, 7, 4, '#5a3a20')
    px(5, 1, 7, 1, '#8a5a30')
    for (const x of [6, 8, 10]) px(x, 2, 1, 2, '#3a2412')
    glow('lamp', () => {
      if (c.frame === 0) {
        px(6, -3, 5, 4, '#ff8a2a')
        px(7, -5, 3, 3, '#ffb84a')
        px(8, -6, 1, 2, '#ffe07a')
        px(7, -2, 3, 2, '#ffd86a')
      } else {
        px(6, -2, 5, 3, '#ff8a2a')
        px(6, -5, 3, 3, '#ffb84a')
        px(7, -6, 1, 2, '#ffe07a')
        px(8, -1, 2, 2, '#ffd86a')
      }
    })
  },
}

/** Neon Mesa: a slim chrome mast, a light bar across the top, a ring of neon halfway up. */
const lampChrome: StampArt = {
  bleed: { top: 4, right: 2 },
  standsUp: 18,
  lights: [{ x: 8, y: 29, reach: 44, color: '#f0e4ff', strength: 1 }],
  draw: (px) => {
    footShadow(px, 9, 29, 10)
    px(5, 28, 6, 3, '#1c1b24')
    px(5, 28, 6, 1, '#5a5a6e')
    px(7, -2, 2, 30, '#8a8c9c')
    px(7, -2, 1, 30, '#eef0f8')
    px(9, -1, 1, 29, '#4a4c5a')
    // The light bar.
    px(2, -4, 12, 3, '#3a3a48')
    px(2, -4, 12, 1, '#c8cad8')
    glow('lamp', () => px(3, -1, 10, 1, '#f4f8ff'))
    // Neon ring.
    glow('neon', () => {
      px(6, 15, 4, 1, '#ff5ad8')
      px(6, 17, 4, 1, '#ff5ad8')
      px(6, 16, 4, 1, '#ffd2f4')
    })
  },
}

/** Porto Lumina: black and gold, three lanterns on scrolled arms, a gilded finial. */
const lampGilded: StampArt = {
  bleed: { top: 7, right: 2, left: 1 },
  standsUp: 18,
  lights: [{ x: 8, y: 29, reach: 44, color: '#ffe0a0', strength: 1 }],
  draw: (px) => {
    const iron = '#1c1a20'
    const ironHi = '#4a4652'
    const gold = '#c9a24a'
    const goldHi = '#f2d47a'
    footShadow(px, 9, 29, 14)
    px(4, 24, 8, 7, iron)
    px(3, 29, 10, 2, iron)
    px(4, 24, 8, 1, gold)
    px(3, 29, 10, 1, goldHi)
    pole(px, 7, 5, 24, ironHi, iron, iron)
    for (const y of [10, 18]) {
      px(6, y, 4, 1, goldHi)
      px(6, y + 1, 4, 1, gold)
    }
    // Scrolled arms.
    px(1, 5, 14, 1, iron)
    px(1, 3, 1, 2, iron)
    px(14, 3, 1, 2, iron)
    // Three lanterns.
    for (const [lx, ly] of [[-1, -3], [11, -3], [5, -7]] as const) {
      px(lx + 1, ly, 3, 1, gold)
      px(lx, ly + 1, 5, 5, iron)
      glow('lamp', () => {
        px(lx + 1, ly + 2, 3, 3, '#f6e6b0')
        px(lx + 1, ly + 2, 3, 1, '#fffaea')
      })
      px(lx + 1, ly + 6, 3, 1, gold)
    }
    px(7, -9, 2, 2, goldHi)
  },
}

// ---------------------------------------------------------------------------
// Benches — two tiles wide, facing the street
// ---------------------------------------------------------------------------

interface BenchStyle {
  slat: string
  slatHi: string
  slatLo: string
  frame: string
  frameHi: string
  /** A slab of stone with no back, rather than slats. */
  solid?: boolean
  /** A strip of light under the seat. */
  underglow?: string
}

function bench(style: BenchStyle): StampArt {
  return {
    bleed: { top: 3, right: 2 },
    draw: (px, c) => {
      const w = c.w
      shadow(px, 3, 13, w - 3, 3, 0.26)
      if (style.solid) {
        // A dressed block of stone, lit along its top edge.
        px(1, 5, w - 2, 9, style.slatLo)
        px(1, 5, w - 2, 4, style.slat)
        px(1, 5, w - 2, 1, style.slatHi)
        px(1, 5, 1, 8, style.slatHi)
        px(w - 2, 6, 1, 8, tint(style.slatLo, -0.2))
        px(4, 9, w - 8, 1, tint(style.slatLo, -0.15))
        px(3, 13, w - 6, 1, tint(style.slatLo, -0.3))
        return
      }
      // Legs and the back's uprights.
      for (const x of [3, w - 5]) {
        px(x, -2, 2, 15, style.frame)
        px(x, -2, 1, 15, style.frameHi)
      }
      // Backrest: two slats.
      for (const y of [-2, 2]) {
        px(1, y, w - 2, 3, style.slatLo)
        px(1, y, w - 2, 2, style.slat)
        px(1, y, w - 2, 1, style.slatHi)
      }
      // Seat: seen from above, so wider and lighter.
      px(0, 6, w, 5, style.slatLo)
      px(0, 6, w, 4, style.slat)
      px(0, 6, w, 1, style.slatHi)
      px(0, 8, w, 1, style.slatLo)
      // Arms.
      px(0, 4, 3, 3, style.frame)
      px(w - 3, 4, 3, 3, style.frame)
      px(0, 4, 3, 1, style.frameHi)
      px(w - 3, 4, 3, 1, style.frameHi)
      // Front legs.
      px(2, 11, 2, 3, style.frame)
      px(w - 4, 11, 2, 3, style.frame)
      if (style.underglow) {
        const color = style.underglow
        glow('neon', () => px(4, 11, w - 8, 1, color))
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Small things on the pavement
// ---------------------------------------------------------------------------

/** A blue mailbox on its legs. */
const mailbox: StampArt = {
  bleed: { top: 5, right: 2 },
  standsUp: 6,
  draw: (px) => {
    footShadow(px, 9, 13, 12)
    px(4, 11, 2, 4, '#1a1e2a')
    px(10, 11, 2, 4, '#1a1e2a')
    px(3, -3, 10, 14, '#142050')
    px(4, -4, 8, 1, '#142050')
    px(4, -3, 8, 13, '#2a4a9a')
    px(4, -3, 8, 2, '#4a6ac8')
    px(4, -1, 2, 10, '#3a5ab4')
    px(10, -1, 2, 10, '#1e3a80')
    px(5, 1, 6, 1, '#c8d0e0')
    px(5, 2, 6, 1, '#142050')
    px(7, 5, 2, 2, '#f0f2f8')
    px(4, 9, 8, 1, '#1e3a80')
  },
}

/** A red fire hydrant, chained caps and all. */
const hydrant: StampArt = {
  bleed: { top: 2, right: 2 },
  draw: (px) => {
    footShadow(px, 9, 13, 10)
    px(4, 12, 8, 3, '#7a1e1a')
    px(4, 12, 8, 1, '#a8302a')
    px(5, 3, 6, 9, '#8a2420')
    px(5, 3, 4, 9, '#c83a32')
    px(5, 3, 1, 9, '#e86a5a')
    px(4, 1, 8, 2, '#8a2420')
    px(4, 1, 8, 1, '#e05a4a')
    px(7, -1, 2, 2, '#8a2420')
    px(7, -1, 1, 1, '#e86a5a')
    // Side outlets.
    px(2, 6, 3, 3, '#8a2420')
    px(2, 6, 3, 1, '#e05a4a')
    px(11, 6, 3, 3, '#6a1a16')
    px(7, 6, 2, 2, '#f2c84a')
    px(3, 9, 1, 2, '#3a3a40')
  },
}

/** Two newspaper boxes, red and blue, the morning's front page behind the glass. */
const newsBoxes: StampArt = {
  bleed: { top: 3, right: 2 },
  standsUp: 4,
  draw: (px) => {
    footShadow(px, 9, 13, 15)
    for (const [x, body, hi] of [[1, '#b02a2a', '#e04a3a'], [8, '#2a5aa8', '#4a7ad8']] as const) {
      px(x, -2, 7, 15, tint(body, -0.4))
      px(x, -2, 6, 14, body)
      px(x, -2, 6, 1, hi)
      px(x + 1, 0, 4, 5, '#d8dce4')
      px(x + 1, 0, 4, 1, '#ffffff')
      px(x + 1, 2, 3, 1, '#4a4a54')
      px(x + 1, 4, 2, 1, '#8a8a94')
      px(x + 2, 7, 2, 1, '#e8e4c8')
      px(x + 1, 12, 1, 2, '#1a1a20')
      px(x + 4, 12, 1, 2, '#1a1a20')
    }
  },
}

/** A litter bin, municipal green. */
const bin: StampArt = {
  bleed: { top: 2, right: 2 },
  draw: (px) => {
    footShadow(px, 9, 13, 10)
    px(4, 2, 8, 12, '#1e3a2a')
    px(4, 2, 7, 11, '#2e5a40')
    px(4, 2, 2, 11, '#4a8060')
    for (const y of [5, 9]) px(4, y, 8, 1, '#1e3a2a')
    px(3, 0, 10, 3, '#1e3a2a')
    px(3, 0, 10, 1, '#5a9070')
    px(6, 1, 4, 1, '#0e1a12')
  },
}

/** A short steel bollard with a reflective band. */
const bollard: StampArt = {
  bleed: { top: 2, right: 2 },
  draw: (px) => {
    footShadow(px, 9, 12, 8)
    px(6, 1, 4, 13, '#2a2a32')
    px(6, 1, 3, 13, '#4a4a56')
    px(6, 1, 1, 13, '#7a7a8a')
    px(6, 0, 4, 1, '#2a2a32')
    px(6, 4, 4, 2, '#e8e4d8')
  },
}

/** A cast-iron mooring bollard on the quay, a coil of rope at its foot. */
const mooring: StampArt = {
  bleed: { top: 1, right: 2 },
  draw: (px) => {
    footShadow(px, 9, 12, 12)
    // The rope.
    oval(px, 2, 9, 12, 5, '#8a6a3a')
    oval(px, 4, 10, 8, 3, '#6a4e2a')
    px(5, 10, 6, 1, '#b08a52')
    // The bollard: a squat post with a mushroom head.
    px(5, 3, 6, 8, '#1a1c22')
    px(5, 3, 2, 8, '#3a3e4a')
    px(3, 1, 10, 3, '#1a1c22')
    px(4, 1, 8, 1, '#4a4e5c')
    px(3, 2, 2, 1, '#3a3e4a')
  },
}

/** A noticeboard on two legs, flyers pinned three deep. */
const noticeboard: StampArt = {
  bleed: { top: 8, right: 2 },
  standsUp: 8,
  draw: (px) => {
    footShadow(px, 9, 13, 14)
    px(2, 4, 2, 11, '#4a3020')
    px(12, 4, 2, 11, '#4a3020')
    px(1, -7, 14, 13, '#5a3a22')
    px(2, -6, 12, 11, '#b8885a')
    px(1, -8, 14, 2, '#3a2416')
    for (const [x, y, w, h, color] of [
      [3, -5, 4, 5, '#f4f0e0'], [8, -5, 5, 3, '#f2c84a'], [8, -1, 4, 5, '#e86a6a'],
      [3, 1, 4, 3, '#8ac8f0'], [6, -2, 2, 2, '#ffffff'],
    ] as const) {
      px(x, y, w, h, color)
      px(x, y + h, w, 1, 'rgba(10, 8, 20, 0.25)')
    }
    px(4, -4, 2, 1, '#3a3a40')
    px(9, -4, 3, 1, '#3a3a40')
  },
}

/** A telephone box, red, a light in its roof. */
const phoneBox: StampArt = {
  bleed: { top: 6, right: 2 },
  standsUp: 18,
  draw: (px) => {
    footShadow(px, 9, 29, 14)
    px(2, -2, 12, 32, '#7a1414')
    px(3, -1, 10, 31, '#c82a24')
    px(3, -1, 2, 31, '#e85a4a')
    px(2, -5, 12, 3, '#9a1a18')
    px(3, -6, 10, 2, '#c82a24')
    px(4, -4, 8, 2, '#1a1a20')
    glow('lamp', () => px(5, -4, 6, 1, '#f4f0e0'))
    // The glazing, three panes a side.
    for (const y of [3, 9, 15]) {
      glow('window', () => {
        px(5, y, 6, 5, '#9ac8d8')
        px(5, y, 6, 2, '#c8e4ee')
      })
      px(8, y, 1, 5, '#c82a24')
    }
    px(5, 4, 1, 1, '#ffffff')
    px(4, 22, 8, 7, '#a81e1a')
    px(3, 29, 10, 1, '#5a0e0c')
  },
}

// ---------------------------------------------------------------------------
// Planting
// ---------------------------------------------------------------------------

interface BedStyle {
  rim: string
  rimHi: string
  face: string
  line: string
  soil: string
  plant: 'flowers' | 'agave' | 'succulents' | 'box' | 'hibiscus' | 'daisies'
  colors: string[]
  /** Lit from below after dark. */
  uplight?: string
}

/** A raised bed with a border of its own material and something growing in it. */
function bed(style: BedStyle): StampArt {
  return {
    bleed: { top: 5, right: 2 },
    standsUp: 4,
    draw: (px, c) => {
      const w = c.w
      shadow(px, 2, 13, w - 1, 3, 0.26)
      // The border: its top lit, its face towards you.
      px(0, 4, w, 11, style.line)
      px(1, 4, w - 2, 2, style.rimHi)
      px(1, 6, w - 2, 1, style.rim)
      px(1, 11, w - 2, 3, style.face)
      px(1, 11, w - 2, 1, tint(style.face, 0.12))
      for (let x = 8; x < w - 2; x += 8) px(x, 11, 1, 3, style.line)
      px(2, 7, w - 4, 4, style.soil)
      px(2, 7, w - 4, 1, tint(style.soil, -0.25))
      const plant = style.plant
      const [a, b, c2, d] = [...style.colors, ...style.colors, ...style.colors]
      if (plant === 'box') {
        // Clipped box: a long rounded block of tight leaves.
        px(2, -1, w - 4, 9, '#1e4a26')
        px(3, -2, w - 6, 9, '#2e6a36')
        px(3, -2, w - 6, 2, '#4a8a48')
        for (let x = 4; x < w - 4; x += 3) px(x, 1 + (x % 2), 1, 1, '#5a9a52')
        px(3, 5, w - 6, 2, '#1e4a26')
      } else if (plant === 'agave') {
        for (let x = 3; x < w - 6; x += 9) {
          for (const [dx, dy, len] of [[3, -3, 7], [0, 1, 4], [6, 1, 4], [1, -1, 5], [5, -1, 5]] as const) {
            px(x + dx, 7 - len + dy, 1, len, '#5a8a6a')
            px(x + dx, 7 - len + dy, 1, 1, '#9ac8a8')
          }
          px(x + 2, 6, 3, 2, '#3a6a4a')
        }
        for (let x = 4; x < w - 3; x += 9) {
          px(x + 7, 5, 2, 2, b)
          px(x + 7, 5, 1, 1, tint(b, 0.35))
        }
      } else if (plant === 'succulents') {
        for (let x = 3; x < w - 4; x += 5) {
          px(x, 2, 3, 6, '#2e6a4a')
          px(x + 1, 0, 1, 7, '#5aaa7a')
          px(x - 1, 4, 1, 3, '#3a7a58')
          px(x + 3, 3, 1, 4, '#3a7a58')
        }
        if (style.uplight) {
          const light = style.uplight
          glow('neon', () => {
            px(1, 4, w - 2, 1, light)
          })
        }
      } else {
        // A mound of leaves with flowers through it.
        px(2, 2, w - 4, 6, '#2e6a36')
        for (let x = 2; x < w - 2; x += 4) {
          px(x, 1, 4, 3, '#3e7e40')
          px(x + 1, 0, 2, 1, '#5a9a4e')
        }
        px(2, 6, w - 4, 2, '#1e4a26')
        const flowers = plant === 'hibiscus' ? 3 : 2
        let i = 0
        for (let x = 3; x < w - 3; x += flowers === 3 ? 5 : 3) {
          const color = [a, b, c2, d][i % 4]
          const y = 1 + ((x * 5) % 4)
          if (plant === 'hibiscus') {
            px(x, y, 3, 2, color)
            px(x + 1, y - 1, 1, 1, color)
            px(x + 1, y, 1, 1, '#ffd84a')
          } else if (plant === 'daisies') {
            px(x - 1, y, 3, 1, '#ffffff')
            px(x, y - 1, 1, 3, '#ffffff')
            px(x, y, 1, 1, '#f2c94c')
          } else {
            px(x, y, 2, 2, color)
            px(x, y, 1, 1, tint(color, 0.4))
          }
          i++
        }
      }
    },
  }
}

/** A round shrub, two greens, lit on its crown. */
function bush(leaf: string, leafHi: string, leafLo: string, line: string, flowers?: string): StampArt {
  return {
    bleed: { top: 3, right: 2 },
    standsUp: 4,
    draw: (px) => {
      shadow(px, 3, 12, 13, 4, 0.28)
      oval(px, 1, -2, 14, 16, line)
      oval(px, 2, -1, 12, 14, leafLo)
      oval(px, 2, -1, 11, 11, leaf)
      oval(px, 4, 0, 6, 5, leafHi)
      px(6, 1, 2, 1, tint(leafHi, 0.3))
      px(10, 5, 2, 2, leafHi)
      px(4, 8, 2, 1, leafHi)
      if (flowers) {
        for (const [x, y] of [[5, 3], [10, 2], [8, 7], [3, 6], [11, 9]]) {
          px(x, y, 1, 1, flowers)
          px(x, y + 1, 1, 1, tint(flowers, -0.35))
        }
      }
    },
  }
}

/** A clipped hedge, as long as its footprint. */
function hedge(leaf: string, leafHi: string, leafLo: string, line: string): StampArt {
  return {
    bleed: { top: 4, right: 2 },
    standsUp: 5,
    draw: (px, c) => {
      const w = c.w
      shadow(px, 2, 12, w, 4, 0.28)
      px(0, -3, w, 17, line)
      px(1, -4, w - 2, 1, line)
      px(1, -3, w - 2, 15, leafLo)
      // The flat clipped top, lit, then the face.
      px(1, -3, w - 2, 5, leaf)
      px(1, -3, w - 2, 1, leafHi)
      for (let x = 2; x < w - 2; x += 3) {
        px(x, -2 + (x % 2), 1, 1, leafHi)
        px(x + 1, 4 + (x % 3), 1, 1, leaf)
        px(x, 8 + ((x * 3) % 3), 1, 1, tint(leafLo, -0.2))
      }
      px(1, 2, w - 2, 1, mix(leaf, leafLo, 0.5))
    },
  }
}

// ---------------------------------------------------------------------------
// Fences
// ---------------------------------------------------------------------------

/** White pickets on two rails. */
function picketFence(): StampArt {
  return {
    bleed: { top: 4, right: 2 },
    standsUp: 4,
    draw: (px, c) => {
      const w = c.w
      shadow(px, 1, 12, w, 3, 0.24)
      px(0, 2, w, 2, '#b8b4a8')
      px(0, 8, w, 2, '#b8b4a8')
      px(0, 2, w, 1, '#f4f2ec')
      px(0, 8, w, 1, '#f4f2ec')
      for (let x = 1; x < w; x += 4) {
        px(x, -2, 3, 15, '#9a968a')
        px(x, -1, 2, 14, '#f4f2ec')
        px(x + 1, -3, 1, 1, '#9a968a')
        px(x, -2, 1, 1, '#9a968a')
        px(x + 2, -2, 1, 1, '#9a968a')
        px(x + 1, -2, 1, 1, '#ffffff')
        px(x + 2, 0, 1, 13, '#c8c4b8')
      }
      for (const x of [0, w - 2]) {
        px(x, -4, 2, 18, '#8a8678')
        px(x, -4, 1, 18, '#e8e4dc')
      }
    },
  }
}

/** Posts with a rope slung between them: the harbour, the marina. */
function ropeFence(post: string, postHi: string, cap: string): StampArt {
  return {
    bleed: { top: 4, right: 2 },
    standsUp: 4,
    draw: (px, c) => {
      const w = c.w
      const posts: number[] = []
      for (let x = 1; x < w; x += 15) posts.push(x)
      if (posts[posts.length - 1] < w - 4) posts.push(w - 4)
      for (const x of posts) shadow(px, x + 2, 12, 4, 2, 0.28)
      // The rope sags between each pair of posts.
      for (let i = 0; i < posts.length - 1; i++) {
        const from = posts[i] + 3
        const to = posts[i + 1]
        for (let x = from; x < to; x++) {
          const t = (x - from) / Math.max(1, to - from)
          const sag = Math.round(Math.sin(t * Math.PI) * 3)
          px(x, 2 + sag, 1, 1, '#c8a060')
          px(x, 3 + sag, 1, 1, '#7a5a30')
        }
      }
      for (const x of posts) {
        px(x, -1, 3, 14, tint(post, -0.35))
        px(x, -1, 2, 13, post)
        px(x, -1, 1, 13, postHi)
        px(x - 1, -3, 5, 2, cap)
        px(x - 1, -3, 5, 1, tint(cap, 0.35))
      }
    },
  }
}

/** Polished chrome rails on short posts: the Strip keeps its queues straight. */
function chromeFence(): StampArt {
  return {
    bleed: { top: 2, right: 2 },
    standsUp: 4,
    draw: (px, c) => {
      const w = c.w
      shadow(px, 1, 11, w, 3, 0.3)
      for (const y of [1, 6]) {
        px(0, y, w, 2, '#6a6c7a')
        px(0, y, w, 1, '#eef0f8')
      }
      for (let x = 0; x < w; x += 8) {
        px(x, 0, 2, 13, '#4a4c5a')
        px(x, 0, 1, 13, '#d8dae6')
        px(x - 1, -1, 4, 1, '#eef0f8')
      }
      glow('neon', () => px(0, 12, w, 1, '#c84ab8'))
    },
  }
}

// ---------------------------------------------------------------------------
// Street trees and desert plants
// ---------------------------------------------------------------------------

/** A round broadleaf in an iron grate: Basin's street trees. */
const streetTree: StampArt = {
  bleed: { top: 8, left: 3, right: 4 },
  standsUp: 20,
  draw: (px) => {
    // The grate round its foot.
    px(2, 26, 12, 5, '#3a3a42')
    for (let x = 3; x < 13; x += 2) px(x, 27, 1, 3, '#5a5a66')
    px(2, 26, 12, 1, '#6a6a76')
    shadow(px, 4, 22, 13, 5, 0.32)
    // Trunk.
    px(6, 14, 4, 13, '#3e2a1c')
    px(6, 14, 2, 13, '#5c402b')
    px(5, 25, 6, 2, '#3e2a1c')
    // The crown: overlapping clumps lit from the top-left.
    const clumps: Array<[number, number, number, string, string]> = [
      [8, 8, 9, '#25503a', '#1a3624'],
      [3, 6, 6, '#336c44', '#1a3624'],
      [13, 6, 6, '#2f6640', '#1a3624'],
      [8, 1, 7, '#336c44', '#1a3624'],
      [4, 0, 5, '#3c7a4c', '#1a3624'],
      [12, 0, 5, '#3c7a4c', '#1a3624'],
    ]
    for (const [cx, cy, r, , line] of clumps) oval(px, cx - r, cy - r, r * 2, r * 2, line)
    for (const [cx, cy, r, fill] of clumps) {
      oval(px, cx - r + 1, cy - r + 1, r * 2 - 2, r * 2 - 2, fill)
      oval(px, cx - r + 2, cy - r + 1, r, r, '#4b8d52')
      px(cx - Math.floor(r / 2), cy - r + 2, 2, 1, '#68a85e')
    }
  },
}

/** A tall coconut palm, leaning, fronds every way. */
const palmTall: StampArt = {
  bleed: { top: 12, left: 8, right: 9 },
  standsUp: 20,
  draw: (px) => {
    oval(px, 3, 27, 12, 4, GROUND_SHADOW)
    // A ring of sand-coloured stones round the foot.
    px(4, 27, 9, 3, '#c8b08a')
    px(4, 27, 9, 1, '#e8d8b8')
    // The trunk, ringed, curving.
    for (let y = -2; y < 29; y++) {
      const lean = y < 6 ? 3 : y < 14 ? 2 : y < 22 ? 1 : 0
      const x = 7 + lean
      px(x, y, 3, 1, y % 3 === 0 ? '#6e5434' : '#9a7a52')
      px(x, y, 1, 1, '#b89a6a')
    }
    const cx = 11
    const cy = -3
    const fronds: Array<Array<[number, number]>> = [
      [[-2, 0], [-4, 0], [-6, 1], [-8, 2], [-10, 3], [-11, 5], [-12, 6]],
      [[2, 0], [4, 0], [6, 1], [8, 2], [10, 3], [11, 5], [12, 6]],
      [[-2, -2], [-4, -3], [-6, -4], [-8, -4], [-10, -3]],
      [[2, -2], [4, -3], [6, -4], [8, -4], [10, -3]],
      [[0, -2], [-1, -4], [-1, -6], [0, -8]],
      [[-2, 2], [-3, 4], [-5, 6], [-6, 8]],
      [[2, 2], [3, 4], [5, 6], [6, 8]],
    ]
    for (const frond of fronds) {
      frond.forEach(([dx, dy], i) => {
        px(cx + dx, cy + dy, 2, 1, i < 3 ? '#8ed06a' : '#5cae4e')
        px(cx + dx, cy + dy + 1, 2, 1, '#2a6a34')
        if (i > 1 && i % 2 === 0) px(cx + dx, cy + dy + 2, 1, 1, '#3e8c40')
      })
    }
    px(cx - 1, cy, 3, 3, '#6e5434')
    px(cx - 2, cy + 2, 2, 2, '#6a4a2a')
    px(cx + 1, cy + 2, 2, 2, '#5a3e22')
  },
}

/** A fan palm in a chrome planter, uplit: the Strip's idea of a tree. */
const palmPlanter: StampArt = {
  bleed: { top: 10, left: 5, right: 6 },
  standsUp: 20,
  draw: (px) => {
    shadow(px, 2, 28, 14, 3, 0.3)
    px(1, 22, 14, 9, '#1a1920')
    px(1, 22, 14, 1, '#eef0f8')
    px(2, 23, 12, 1, '#7a7c8a')
    px(2, 30, 12, 1, '#0e0e14')
    glow('neon', () => px(3, 29, 10, 1, '#5ae8ff'))
    // A tall thin trunk.
    for (let y = -4; y < 23; y++) {
      px(7, y, 2, 1, y % 2 === 0 ? '#7a6248' : '#9a8060')
      px(7, y, 1, 1, '#b89a72')
    }
    // The fan: a round crown of spiky leaves.
    const cx = 8
    const cy = -5
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2
      for (let r = 2; r < 8; r++) {
        const x = Math.round(cx + Math.cos(angle) * r)
        const y = Math.round(cy + Math.sin(angle) * r * 0.7)
        px(x, y, 1, 1, r < 4 ? '#72b45e' : r < 6 ? '#4a8e48' : '#2e6a3a')
      }
    }
    px(cx - 1, cy - 1, 3, 3, '#5a4a34')
  },
}

/** An Italian cypress in a marble urn: Porto Lumina's garden manners. */
const cypressPot: StampArt = {
  bleed: { top: 10, right: 2 },
  standsUp: 20,
  draw: (px) => {
    shadow(px, 3, 28, 12, 3, 0.3)
    // The urn.
    px(3, 22, 10, 2, '#b4a890')
    px(3, 22, 10, 1, '#fbf6ec')
    px(4, 24, 8, 6, '#e4dccc')
    px(4, 24, 2, 6, '#fbf6ec')
    px(10, 24, 2, 6, '#c4b8a2')
    px(5, 30, 6, 1, '#b4a890')
    px(4, 26, 8, 1, '#c9a24a')
    // The cypress: a tall, narrow flame.
    const widths = [1, 1, 2, 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2]
    widths.forEach((half, i) => {
      const y = i - 10
      px(8 - half - 1, y, half * 2 + 2, 1, '#142a1c')
      px(8 - half, y, half * 2, 1, '#285232')
      px(8 - half, y, Math.ceil(half / 2), 1, '#3a6e40')
      if (i % 3 === 1) px(8 + half - 2, y, 2, 1, '#1c3c26')
      if (i % 4 === 2 && half > 1) px(8 - half + 1, y, 1, 1, '#5a8e52')
    })
  },
}

/** A saguaro, arms raised: Silver Creek's welcome. */
const saguaro: StampArt = {
  bleed: { top: 10, left: 2, right: 3 },
  standsUp: 20,
  draw: (px) => {
    shadow(px, 4, 28, 12, 3, 0.3)
    const green = '#4a7a3a'
    const lit = '#6a9a4a'
    const dark = '#2e5226'
    // Trunk.
    px(5, -8, 6, 38, dark)
    px(6, -9, 4, 1, dark)
    px(6, -8, 4, 37, green)
    px(6, -8, 1, 37, lit)
    px(8, -8, 1, 37, mix(green, dark, 0.5))
    // Arms.
    px(0, 8, 6, 4, dark)
    px(0, -2, 4, 12, dark)
    px(1, -2, 2, 12, green)
    px(1, -2, 1, 12, lit)
    px(1, 9, 5, 2, green)
    px(11, 12, 5, 4, dark)
    px(12, 2, 4, 13, dark)
    px(13, 2, 2, 13, green)
    px(13, 2, 1, 13, lit)
    px(10, 13, 4, 2, green)
    // Spines catching the light.
    for (const [x, y] of [[7, -4], [7, 3], [7, 10], [7, 17], [7, 24], [2, 2], [14, 7]]) px(x, y, 1, 1, '#f4ecc8')
    // A flower on top.
    px(7, -10, 2, 2, '#f4f0e0')
    px(7, -10, 1, 1, '#f2c94c')
  },
}

/** A clump of barrel cacti among stones. */
const barrelCactus: StampArt = {
  bleed: { top: 2, right: 2 },
  draw: (px) => {
    shadow(px, 2, 12, 13, 3, 0.28)
    for (const [x, y, r] of [[2, 4, 5], [8, 2, 6], [11, 8, 4]] as const) {
      oval(px, x, y, r + 2, r + 3, '#2e5226')
      oval(px, x + 1, y + 1, r, r + 1, '#5a8a40')
      px(x + 1, y + 2, 1, r - 1, '#7aaa52')
      px(x + Math.floor(r / 2), y, 2, 1, '#f2d24a')
    }
    px(1, 12, 4, 3, '#8a7258')
    px(1, 12, 3, 1, '#b09474')
  },
}

/** Red sandstone, weathered round. */
function rocks(wide: boolean): StampArt {
  return {
    bleed: { top: 3, right: 2 },
    draw: (px, c) => {
      const w = c.w
      shadow(px, 2, 12, w - 1, 4, 0.3)
      const stones: Array<[number, number, number, number]> = wide
        ? [[1, 2, 14, 12], [13, 5, 12, 10], [24, 8, 7, 7]]
        : [[1, 4, 10, 10], [8, 7, 7, 7]]
      for (const [x, y, sw, sh] of stones) {
        oval(px, x, y, sw, sh, '#843e2a')
        oval(px, x + 1, y, sw - 2, sh - 2, '#b4583a')
        oval(px, x + 2, y + 1, Math.ceil(sw / 2), Math.ceil(sh / 2), '#d47a52')
        px(x + 3, y + sh - 4, sw - 5, 1, '#943e2a')
      }
    },
  }
}

// ---------------------------------------------------------------------------
// Parked cars — three tiles long, at the kerb
// ---------------------------------------------------------------------------

/** A saloon seen from above and to the side, nose to the east or the west. */
function parkedCar(body: string, facing: 'e' | 'w'): StampArt {
  return {
    bleed: { top: 8, right: 2 },
    standsUp: 6,
    draw: (px, c) => {
      const W = c.w
      // Drawn facing east, mirrored for a car facing west.
      const p: Px = (x, y, w, h, color) => px(facing === 'e' ? x : W - x - w, y, w, h, color)
      const hi = tint(body, 0.3)
      const lo = tint(body, -0.25)
      const line = tint(body, -0.6)
      shadow(px, 3, 12, W - 3, 4, 0.32)
      // The body's outline: rounded at both ends.
      p(3, 1, W - 7, 11, line)
      p(1, 3, W - 3, 8, line)
      p(2, 2, W - 5, 1, line)
      // Bonnet and boot lid, seen from above: the lit top of the car.
      p(3, 2, W - 7, 3, hi)
      p(2, 3, W - 5, 2, mix(body, hi, 0.5))
      // The side towards you.
      p(2, 5, W - 5, 5, body)
      p(2, 5, W - 5, 1, hi)
      p(2, 9, W - 5, 2, lo)
      p(3, 8, W - 7, 1, mix(body, lo, 0.5))
      // The cabin: windscreen and rear window sloping in to a lit roof.
      p(13, -7, 19, 1, line)
      p(12, -6, 21, 8, line)
      p(10, -2, 25, 4, line)
      p(14, -6, 17, 2, hi)
      p(14, -6, 17, 1, tint(hi, 0.3))
      p(12, -4, 21, 6, '#2a3442')
      p(13, -4, 8, 5, '#7fb4d0')
      p(22, -4, 9, 5, '#7fb4d0')
      p(13, -4, 8, 1, '#c8e8f6')
      p(14, -3, 2, 1, '#ffffff')
      p(21, -4, 1, 6, line)
      p(31, -3, 2, 4, '#5a8aa8')
      // Wheel arches and wheels.
      for (const x of [6, 33]) {
        p(x - 1, 8, 10, 3, line)
        p(x, 9, 8, 6, '#141418')
        p(x + 1, 10, 6, 4, '#2a2a30')
        p(x + 2, 11, 4, 2, '#8a909a')
        p(x + 3, 11, 1, 1, '#c8ccd4')
      }
      // Door seam, handles, bumpers, lamps.
      p(22, 5, 1, 4, lo)
      p(18, 6, 2, 1, '#e8eaf0')
      p(26, 6, 2, 1, '#e8eaf0')
      p(W - 4, 8, 3, 2, '#c8ccd4')
      p(0, 8, 3, 2, '#c8ccd4')
      // Parked, so its lamps are off.
      p(W - 4, 5, 2, 2, '#fff4c8')
      p(1, 5, 2, 2, '#e83a3a')
      // After dark, whatever light there is catches the chrome and glass: the
      // roof's edge, the top of the windscreen, the bumpers, the hubs, the rear
      // reflector. A black car on a black road is still a car.
      const glint = mix(hi, '#dfe8ff', 0.55)
      glow('neon', () => {
        p(14, -6, 17, 1, glint)
        p(13, -4, 8, 1, '#c8e8f6')
        p(14, -3, 2, 1, '#ffffff')
        p(3, 2, W - 7, 1, mix(glint, body, 0.35))
        p(W - 4, 8, 3, 1, '#e8ecf4')
        p(0, 8, 3, 1, '#e8ecf4')
        for (const x of [6, 33]) p(x + 3, 11, 1, 1, '#e8ecf4')
        p(1, 5, 2, 1, '#c02828')
      })
    },
  }
}

// ---------------------------------------------------------------------------
// Fountains — laid over a pool of water in a plaza
// ---------------------------------------------------------------------------

/** One jet of water: a column rising, spray falling back round it, a ring of splash at its foot. */
function jet(px: Px, x: number, base: number, height: number) {
  const top = base - height
  oval(px, x - 3, base - 1, 8, 3, 'rgba(236, 248, 255, 0.55)')
  px(x, top, 2, height, 'rgba(214, 240, 255, 0.9)')
  px(x, top, 1, height, '#ffffff')
  for (let y = top + 2; y < base - 1; y += 3) px(x + 1, y, 1, 1, 'rgba(160, 210, 240, 0.9)')
  // The spray, falling away either side of the top.
  for (const [dx, dy] of [[-1, 0], [2, 0], [-2, 1], [3, 1], [-3, 3], [4, 3], [-3, 5], [4, 5], [-4, 7], [5, 7]] as const) {
    if (top + dy < base - 1) px(x + dx, top + dy, 1, 1, dy < 3 ? '#ffffff' : 'rgba(228, 246, 255, 0.75)')
  }
  px(x - 1, top - 1, 4, 1, 'rgba(240, 250, 255, 0.85)')
}

/** A jet arcing from the edge of the pool in towards the middle. */
function arc(px: Px, x: number, base: number, reach: number, height: number) {
  oval(px, x - 2, base - 1, 6, 2, 'rgba(236, 248, 255, 0.5)')
  const steps = Math.abs(reach) * 2
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const ax = Math.round(x + reach * t)
    const ay = Math.round(base - height * 4 * t * (1 - t))
    px(ax, ay, 2, 1, i % 3 === 0 ? '#ffffff' : 'rgba(214, 240, 255, 0.9)')
  }
  const end = x + reach
  px(end - 1, base - 2, 3, 1, 'rgba(240, 250, 255, 0.8)')
}

/** The Strip's fountain: a line of jets dancing in turn, lit from under the water. */
const fountainMesa: StampArt = {
  bleed: { top: 16 },
  frames: 4,
  draw: (px, c) => {
    const heights = [[8, 13, 18, 13, 8], [13, 18, 13, 8, 13], [18, 13, 8, 13, 18], [13, 8, 13, 18, 13]][c.frame]
    const spacing = Math.floor(c.w / 6)
    // Lights in the basin, under the jets.
    for (let i = 0; i < 5; i++) {
      const x = spacing * (i + 1) - 1
      glow('neon', () => {
        oval(px, x - 3, 18, 8, 4, i % 2 === 0 ? 'rgba(255, 110, 220, 0.55)' : 'rgba(110, 230, 255, 0.55)')
        px(x, 19, 2, 1, '#ffffff')
      })
    }
    for (let i = 0; i < 5; i++) {
      const x = spacing * (i + 1) - 1
      glow('lamp', () => jet(px, x, 20, heights[i]))
    }
  },
}

/** Porto Lumina's pool: a marble nymph on a plinth pouring water from a shell, jets arching in to her. */
const fountainLumina: StampArt = {
  bleed: { top: 20 },
  frames: 3,
  draw: (px, c) => {
    const mid = Math.floor(c.w / 2)
    const marble = '#e8e0d0'
    const marbleHi = '#fbf6ec'
    const marbleLo = '#b4a892'
    // A round basin on a plinth, standing in the pool.
    oval(px, mid - 14, 12, 28, 10, marbleLo)
    oval(px, mid - 13, 12, 26, 8, marble)
    oval(px, mid - 11, 13, 22, 5, '#3a7aa0')
    px(mid - 9, 14, 6, 1, '#8ac0dc')
    px(mid - 3, 4, 6, 10, marbleLo)
    px(mid - 3, 4, 4, 10, marble)
    px(mid - 3, 4, 1, 10, marbleHi)
    px(mid - 5, 3, 10, 2, marbleHi)
    // The nymph: robed, one arm up with a shell on her shoulder.
    px(mid - 2, -12, 5, 15, marbleLo)
    px(mid - 2, -12, 4, 15, marble)
    px(mid - 2, -12, 1, 15, marbleHi)
    px(mid - 3, -2, 7, 5, marble)
    px(mid - 3, -2, 7, 1, marbleHi)
    px(mid - 1, -16, 3, 4, marble)
    px(mid - 1, -16, 2, 1, marbleHi)
    px(mid + 2, -15, 2, 6, marbleLo)
    px(mid + 3, -18, 4, 3, '#c9a24a')
    px(mid + 3, -18, 4, 1, '#f2d47a')
    // Water pouring from the shell into the basin, and jets arching in from the sides.
    const step = c.frame
    glow('lamp', () => {
      for (let y = -15; y < 13; y++) {
        const x = mid + 6 + Math.floor((y + 15) / 12)
        px(x, y, 1, 1, (y + step) % 3 === 0 ? '#ffffff' : 'rgba(214, 240, 255, 0.85)')
      }
      oval(px, mid + 4, 12, 6, 2, 'rgba(240, 250, 255, 0.8)')
      for (const side of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const x = mid + side * (26 + i * 26)
          if (x < 3 || x > c.w - 3) continue
          const reach = -side * (10 + ((i + step) % 3) * 2)
          arc(px, x, 22, reach, 8 + ((i + step) % 3) * 2)
        }
      }
    })
  },
}

// ---------------------------------------------------------------------------
// By the road
// ---------------------------------------------------------------------------

/** A roadside billboard on two legs: NEON MESA over a desert sunset, the last word half painted out. */
const billboardMesa: StampArt = {
  bleed: { top: 14, right: 3 },
  standsUp: 16,
  draw: (px, c) => {
    const w = c.w
    shadow(px, 4, 28, w - 4, 4, 0.28)
    // Legs and the catwalk.
    for (const x of [6, w - 8]) {
      px(x, 6, 2, 26, '#3a3a44')
      px(x, 6, 1, 26, '#6a6a78')
    }
    px(2, 7, w - 4, 1, '#2a2a32')
    // The board: a sunset over a mesa.
    px(0, -14, w, 22, '#1a1622')
    px(1, -13, w - 2, 20, '#3a2050')
    px(1, -13, w - 2, 6, '#6a2a6a')
    px(1, -7, w - 2, 4, '#d8604a')
    px(1, -3, w - 2, 3, '#f2a24a')
    px(18, -6, 14, 6, '#f2d24a')
    px(1, 0, w - 2, 6, '#5a2a3a')
    px(4, -1, 12, 2, '#3a1a2a')
    px(30, -2, 14, 3, '#3a1a2a')
    // NEON MESA in pink tubes along the top.
    glow('neon', () => neonText(px, 'NEON MESA', Math.round((w - textWidth('NEON MESA')) / 2), -11, '#ffe0f6', '#c8309a'))
    // WHERE THE NIGHT STARTS, the last word under a coat of white.
    px(4, 2, 26, 2, '#f4ead0')
    px(32, 2, 12, 2, '#e8e8e8')
    px(36, 0, 1, 6, '#8a6a3a')
    px(35, 1, 3, 1, '#c8a060')
  },
}

// ---------------------------------------------------------------------------
// The table the renderer reads
// ---------------------------------------------------------------------------

/** The colours a car comes in, by name: the stamp id is `parked-car-<colour>-<e|w>`. */
export const CAR_COLOURS: Record<string, string> = {
  red: '#b8302c',
  blue: '#2e5aa8',
  white: '#e4e6ea',
  yellow: '#e8b830',
  green: '#2e7a4a',
  black: '#2a2a32',
  silver: '#a8aeb8',
  teal: '#2a9a9a',
}

/** Fence lengths you can put down, in tiles. */
export const FENCE_LENGTHS = [2, 3, 4, 5, 6]

const fences: Record<string, StampArt> = {}
for (const n of FENCE_LENGTHS) {
  fences[`fence-picket-${n}`] = picketFence()
  fences[`fence-rope-${n}`] = ropeFence('#6a4a2a', '#9a7448', '#c9a24a')
  fences[`fence-chrome-${n}`] = chromeFence()
}

const cars: Record<string, StampArt> = {}
for (const [name, body] of Object.entries(CAR_COLOURS)) {
  cars[`parked-car-${name}-e`] = parkedCar(body, 'e')
  cars[`parked-car-${name}-w`] = parkedCar(body, 'w')
}

const BRICK_BED: Omit<BedStyle, 'plant' | 'colors'> = {
  rim: '#a8503a', rimHi: '#c87058', face: '#8a4232', line: '#4a2418', soil: '#4a3424',
}

export const STREET_FURNITURE: Record<string, StampArt> = {
  'lamp-iron': lampIron,
  'lamp-western': lampWestern,
  'lamp-quay': lampQuay,
  'lamp-harbor': lampHarbor,
  'lamp-tiki': lampTiki,
  'lamp-chrome': lampChrome,
  'lamp-gilded': lampGilded,
  'bench-park': bench({ slat: '#3a7a4a', slatHi: '#5aa868', slatLo: '#24543a', frame: '#2a2a32', frameHi: '#5a5a68' }),
  'bench-rustic': bench({ slat: '#a8784a', slatHi: '#c89a68', slatLo: '#7a5432', frame: '#5a3a22', frameHi: '#8a5e3a' }),
  'bench-teak': bench({ slat: '#b88a5a', slatHi: '#dab07a', slatLo: '#8a6038', frame: '#3a3e48', frameHi: '#8a90a0' }),
  'bench-chrome': bench({
    slat: '#5a5c6c', slatHi: '#d8dae6', slatLo: '#2e2e3a', frame: '#2a2a34', frameHi: '#c8cad8', underglow: '#ff5ad8',
  }),
  'bench-stone': bench({ slat: '#ebe5d9', slatHi: '#fbf8f0', slatLo: '#c8bfae', frame: '#b4a892', frameHi: '#fbf6ec', solid: true }),
  mailbox,
  hydrant,
  'news-boxes': newsBoxes,
  bin,
  bollard,
  'bollard-mooring': mooring,
  noticeboard,
  'phone-box': phoneBox,
  'flowerbed-brick-2': bed({ ...BRICK_BED, plant: 'flowers', colors: ['#e8829e', '#f2c94c', '#f2ead2', '#9ab8f0'] }),
  'flowerbed-brick-3': bed({ ...BRICK_BED, plant: 'flowers', colors: ['#f2c94c', '#e8603e', '#f2ead2', '#e8829e'] }),
  'flowerbed-adobe-2': bed({
    rim: '#d8b088', rimHi: '#ecd0aa', face: '#b88e66', line: '#7a5a3e', soil: '#8a6a4a', plant: 'agave',
    colors: ['#f2a03a', '#f4d24a'],
  }),
  'flowerbed-timber-2': bed({
    rim: '#8a6a44', rimHi: '#b08c5e', face: '#6a4e30', line: '#3a2a18', soil: '#4a3424', plant: 'daisies',
    colors: ['#ffffff'],
  }),
  'flowerbed-granite-2': bed({
    rim: '#9ca1ac', rimHi: '#c2c6ce', face: '#7a7f8a', line: '#4a4e58', soil: '#3e3428', plant: 'flowers',
    colors: ['#6a8ae8', '#f4f4f8', '#c86ac8'],
  }),
  'flowerbed-coral-2': bed({
    rim: '#e8d0c0', rimHi: '#fbefe4', face: '#c8aa96', line: '#8a6e5c', soil: '#6a5a40', plant: 'hibiscus',
    colors: ['#f0506a', '#f08ad0', '#ffd84a'],
  }),
  'planter-chrome-2': bed({
    rim: '#3a3a48', rimHi: '#eef0f8', face: '#1e1e28', line: '#0e0e14', soil: '#2a2420', plant: 'succulents',
    colors: [], uplight: '#5ae8ff',
  }),
  'planter-marble-2': bed({
    rim: '#e4dccc', rimHi: '#fbf6ec', face: '#c4b8a2', line: '#8a7e68', soil: '#4a3a2a', plant: 'box', colors: [],
  }),
  bush: bush('#336c44', '#4b8d52', '#25503a', '#1a3624'),
  'bush-flowering': bush('#3e8c40', '#5cae4e', '#2a6a34', '#1e4a2a', '#f06a9a'),
  'hedge-2': hedge('#2e6a36', '#5a9a52', '#1e4a26', '#123018'),
  'hedge-3': hedge('#2e6a36', '#5a9a52', '#1e4a26', '#123018'),
  ...fences,
  'tree-street': streetTree,
  'palm-tall': palmTall,
  'palm-planter': palmPlanter,
  'cypress-pot': cypressPot,
  saguaro,
  'barrel-cactus': barrelCactus,
  'rocks-red': rocks(false),
  'rocks-red-2': rocks(true),
  ...cars,
  'fountain-mesa': fountainMesa,
  'fountain-lumina': fountainLumina,
  'billboard-mesa': billboardMesa,
}

