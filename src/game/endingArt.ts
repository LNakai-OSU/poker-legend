import { Raster, pack } from './pixel/raster'
import { LINE_HEIGHT, drawText, measureText, wrapText } from './pixel/font'

/**
 * The sets of the ending film, drawn once at the street's own pixel density and
 * kept as pictures: the penthouse the player walks through, the desk they stop
 * at, and the night outside its glass. `EndingFilm` lays light, dust, people and
 * paper over them.
 */

export const VIEW_W = 320
export const VIEW_H = 180
export const WORLD_W = 640
export const FLOOR_Y = 124
export const FEET_Y = 170

/** A cheap stable noise in [0, 1): the same city every time. */
export function noise(x: number, y: number, seed = 0): number {
  let h = Math.imul(x * 374761393 + y * 668265263 + seed * 2246822519, 1274126177)
  h = (h ^ (h >>> 13)) >>> 0
  h = Math.imul(h, 1103515245) >>> 0
  return (h % 1000) / 1000
}

/** `#rrggbb` at an alpha, for blending a thing over what is already drawn. */
const alpha = (hex: string, a: number) => pack(hex, Math.round(a * 255))

const GOLD = '#c9a14a'
const GOLD_HI = '#f2d27a'
const GOLD_LO = '#7a5a20'

// ---------------------------------------------------------------------------
// The city, shared by the penthouse's window and the last shot.
// ---------------------------------------------------------------------------

/** A row of towers standing on `base`, windows lit here and there. */
function towers(r: Raster, x0: number, x1: number, base: number, seed: number, body: string, edge: string, density: number, hMin: number, hMax: number) {
  let x = x0
  let i = 0
  while (x < x1) {
    const w = 9 + Math.floor(noise(i, 1, seed) * 14)
    const h = hMin + Math.floor(noise(i, 2, seed) * (hMax - hMin))
    r.rect(x, base - h, w, h, body)
    r.rect(x, base - h, 1, h, edge)
    r.rect(x, base - h, w, 1, edge)
    if (noise(i, 3, seed) > 0.7) r.rect(x + Math.floor(w / 2), base - h - 5, 1, 5, edge)
    for (let wy = base - h + 3; wy < base - 2; wy += 4) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        const n = noise(wx, wy, seed)
        if (n < density) r.rect(wx, wy, 1, 2, n < density * 0.3 ? '#8ac8f0' : n < density * 0.7 ? '#f2c14e' : '#f4e8a0')
      }
    }
    x += w + (noise(i, 4, seed) > 0.6 ? 1 : 0)
    i++
  }
}

/** The sky from the top of a window down to the horizon. */
function nightSky(r: Raster, x: number, y: number, w: number, h: number) {
  const bands = ['#04051a', '#060824', '#090c30', '#0d1040', '#14164c', '#1d1a58', '#2c2060', '#43285e', '#5a3060']
  const bh = Math.ceil(h / bands.length)
  bands.forEach((c, i) => r.rect(x, y + i * bh, w, bh, c))
  // Dither the seams so the bands read as a gradient.
  for (let i = 1; i < bands.length; i++) {
    for (let px = x; px < x + w; px += 2) r.set(px + (i % 2), y + i * bh, bands[i - 1])
  }
}

// ---------------------------------------------------------------------------
// Furniture and keepsakes.
// ---------------------------------------------------------------------------

function medal(r: Raster, x: number, y: number, i: number) {
  const ribbons: [string, string][] = [['#a8281f', '#f4f0e0'], ['#2a4a9a', '#f4f0e0'], ['#2a7a4a', '#e8c040']]
  const metals: [string, string, string][] = [[GOLD_HI, '#e8b830', GOLD_LO], ['#f4f4f8', '#b8bcc8', '#6a6e7a'], ['#e0a070', '#b0703a', '#6a3a1a']]
  const [a, b] = ribbons[i % 3]
  const [hi, mid, lo] = metals[(i * 7) % 5 > 2 ? 1 : (i % 4 === 3 ? 2 : 0)]
  r.rect(x + 1, y, 2, 6, a)
  r.rect(x + 3, y, 2, 6, b)
  r.rect(x + 5, y, 2, 6, a)
  r.ellipse(x - 0.5, y + 5, 8, 8, lo)
  r.ellipse(x + 0.5, y + 5.5, 6, 6, mid)
  r.set(x + 2, y + 7, hi)
  r.set(x + 3, y + 7, hi)
  r.set(x + 2, y + 8, hi)
  r.set(x + 4, y + 10, lo)
  r.set(x + 3, y + 9, lo)
}

function cup(r: Raster, x: number, base: number, h: number, big = false) {
  const hi = GOLD_HI
  const mid = '#e8b830'
  const lo = GOLD_LO
  const bw = big ? 14 : 8
  r.rect(x - bw / 2, base - 3, bw, 3, lo)
  r.rect(x - bw / 2 + 1, base - 3, bw - 2, 1, mid)
  r.rect(x - 1, base - h + 6, 3, h - 9, mid)
  r.rect(x - 1, base - h + 6, 1, h - 9, hi)
  r.rect(x - 3, base - h + 8, 7, 2, lo)
  const cw = big ? 14 : 10
  for (let i = 0; i < 7; i++) {
    const w = Math.round(cw - i * (cw - 4) / 7)
    r.rect(x - w / 2, base - h + i, w, 1, i < 2 ? hi : i < 5 ? mid : lo)
  }
  r.rect(x - cw / 2 + 1, base - h + 1, 1, 4, '#fff6c0')
  r.rect(x - cw / 2 - 2, base - h + 1, 2, 1, mid)
  r.rect(x - cw / 2 - 2, base - h + 1, 1, 4, mid)
  r.rect(x + cw / 2, base - h + 1, 2, 1, mid)
  r.rect(x + cw / 2 + 1, base - h + 1, 1, 4, mid)
}

function frame(r: Raster, x: number, y: number, w: number, h: number, inner: string) {
  r.rect(x, y, w, h, GOLD_LO)
  r.rect(x + 1, y + 1, w - 2, h - 2, GOLD)
  r.rect(x + 1, y + 1, w - 2, 1, GOLD_HI)
  r.rect(x + 3, y + 3, w - 6, h - 6, '#efe6c8')
  r.rect(x + 4, y + 4, w - 8, h - 8, inner)
}

function chandelier(r: Raster, cx: number, y: number, tiers: number) {
  r.rect(cx, 0, 1, y, '#6a5a3a')
  for (let t = 0; t < tiers; t++) {
    const w = 58 - t * 18
    const ty = y + t * 9
    r.rect(cx - w / 2, ty, w, 2, GOLD)
    r.rect(cx - w / 2, ty, w, 1, GOLD_HI)
    r.rect(cx - w / 2 - 1, ty + 1, w + 2, 1, GOLD_LO)
    for (let k = 0; k <= 6; k++) {
      const px = cx - w / 2 + 2 + k * ((w - 4) / 6)
      r.rect(px, ty - 4, 1, 4, GOLD)
      r.rect(px - 1, ty - 7, 3, 3, '#fff2c0')
      r.rect(px, ty + 2, 1, 4 + (k % 2) * 2, '#cfe0ff')
      r.rect(px, ty + 8 + (k % 2) * 2, 1, 1, '#ffffff')
    }
  }
}

function palm(r: Raster, x: number, base: number) {
  r.rect(x - 7, base - 12, 14, 12, '#2a1c14')
  r.rect(x - 8, base - 14, 16, 3, GOLD)
  r.rect(x - 8, base - 14, 16, 1, GOLD_HI)
  r.rect(x - 1, base - 36, 2, 24, '#4a3a22')
  const fronds = [-75, -50, -25, 0, 25, 50, 75]
  fronds.forEach((deg, i) => {
    const a = (deg * Math.PI) / 180
    for (let t = 0; t < 26; t++) {
      const px = x + Math.sin(a) * t * 1.25
      const py = base - 38 - Math.cos(a) * t * 0.55 + (t * t) / (30 + Math.abs(deg) / 4)
      r.rect(px, py, 2, 1, i % 2 ? '#2a7a4a' : '#1f5a3a')
      if (t % 3 === 0) r.rect(px, py + 1, 1, 2, '#164a2c')
    }
  })
}

function sofa(r: Raster, x: number, w: number) {
  const y = FLOOR_Y + 8
  r.rect(x, y - 34, w, 22, '#4a1020')
  r.rect(x, y - 34, w, 2, '#7a2438')
  for (let cx = x + 6; cx < x + w - 4; cx += 9) {
    for (let cy = y - 28; cy < y - 14; cy += 7) {
      r.rect(cx, cy, 2, 2, '#2a0810')
      r.set(cx + 4, cy + 3, '#5a1628')
      r.set(cx - 4, cy + 3, '#5a1628')
    }
  }
  r.rect(x - 8, y - 26, 12, 26, '#6a1c2e')
  r.rect(x - 8, y - 26, 12, 3, '#8a3248')
  r.rect(x + w - 4, y - 26, 12, 26, '#6a1c2e')
  r.rect(x + w - 4, y - 26, 12, 3, '#8a3248')
  r.rect(x + 4, y - 16, w - 8, 12, '#6a1c2e')
  r.rect(x + 4, y - 16, w - 8, 2, '#8a3248')
  r.rect(x + w / 2, y - 16, 1, 12, '#3a0c18')
  r.rect(x + 4, y - 5, w - 8, 1, '#2a0810')
  for (const fx of [x - 6, x + w + 4]) r.rect(fx, y, 4, 3, GOLD)
}

function piano(r: Raster, x: number, floor: number) {
  // The lid, propped open on its stick.
  for (let dx = 0; dx < 92; dx++) {
    const top = floor - 32 - Math.round(24 * (1 - dx / 92))
    r.rect(x + 10 + dx, top, 1, 3, '#15111f')
    r.set(x + 10 + dx, top, '#3a3450')
  }
  r.rect(x + 10, floor - 56, 2, 26, '#15111f')
  r.rect(x + 58, floor - 46, 1, 16, '#6a5a3a')
  // The case: black gloss, a curved tail.
  r.rect(x + 6, floor - 30, 96, 14, '#0c0a14')
  r.rect(x + 6, floor - 30, 96, 1, '#4a4468')
  r.rect(x + 6, floor - 29, 96, 1, '#241f36')
  r.ellipse(x + 82, floor - 30, 40, 14, '#0c0a14')
  r.rect(x + 40, floor - 28, 30, 1, '#2a2540')
  // The keys, and the sheet music on the stand.
  r.rect(x - 2, floor - 22, 24, 6, '#e8e4d4')
  for (let k = 0; k < 8; k++) r.rect(x + k * 3, floor - 22, 1, 6, '#b8b4a4')
  for (const k of [1, 2, 4, 5, 6]) r.rect(x + k * 3 - 1, floor - 22, 2, 4, '#0c0a14')
  r.rect(x + 12, floor - 38, 12, 8, '#f4f0e0')
  for (let l = 0; l < 3; l++) r.rect(x + 14, floor - 36 + l * 2, 8, 1, '#8a8a98')
  // Legs and casters, and the bench.
  for (const lx of [x + 10, x + 90]) {
    r.rect(lx, floor - 16, 4, 16, '#15111f')
    r.rect(lx - 1, floor - 2, 6, 2, GOLD)
  }
  r.rect(x - 16, floor - 14, 18, 5, '#2a1c14')
  r.rect(x - 16, floor - 14, 18, 1, '#5a3a24')
  r.rect(x - 14, floor - 9, 2, 9, '#15111f')
  r.rect(x, floor - 9, 2, 9, '#15111f')
}

function desk(r: Raster, x: number, w: number) {
  const f = FLOOR_Y + 14
  // The chair behind it.
  const cx = x + w / 2 - 12
  r.rect(cx, f - 74, 28, 44, '#2a1618')
  r.rect(cx + 2, f - 72, 24, 40, '#3a1e22')
  for (let ty = f - 66; ty < f - 38; ty += 8) for (let tx = cx + 6; tx < cx + 24; tx += 8) r.rect(tx, ty, 2, 2, '#1a0c10')
  r.rect(cx, f - 74, 28, 2, '#5a3238')
  // Top, with a bevelled edge.
  r.rect(x, f - 38, w, 5, '#6a3a20')
  r.rect(x, f - 38, w, 1, '#a8683a')
  r.rect(x, f - 33, w, 1, '#2a140a')
  // Two pedestals of drawers with the knee-hole between.
  for (const px of [x + 3, x + w - 33]) {
    r.rect(px, f - 32, 30, 32, '#3a1e10')
    r.rect(px, f - 32, 30, 1, '#5a3018')
    for (let d = 0; d < 3; d++) {
      r.rect(px + 2, f - 30 + d * 10, 26, 9, '#4a2814')
      r.rect(px + 2, f - 30 + d * 10, 26, 1, '#6a3a20')
      r.rect(px + 12, f - 26 + d * 10, 6, 2, GOLD)
    }
  }
  r.rect(x + 33, f - 32, w - 66, 28, '#0c0608')
  // On it: a banker's lamp, a glass of something, a stack of paper, the frame, a globe.
  const lx = x + w - 20
  r.rect(lx, f - 42, 8, 4, GOLD)
  r.rect(lx + 3, f - 52, 2, 10, GOLD)
  r.rect(lx - 4, f - 60, 16, 9, '#14603a')
  r.rect(lx - 4, f - 60, 16, 2, '#2a9a5a')
  r.rect(lx - 4, f - 52, 16, 1, '#0a3a22')
  r.rect(x + 16, f - 46, 6, 8, '#d8d4c4')
  r.rect(x + 17, f - 45, 4, 3, '#c08030')
  r.rect(x + 34, f - 44, 22, 6, '#f2eee0')
  r.rect(x + 34, f - 41, 22, 1, '#b8b4a4')
  r.rect(x + 36, f - 46, 20, 2, '#e8e4d4')
  r.rect(x + 60, f - 52, 12, 14, GOLD)
  r.rect(x + 61, f - 51, 10, 12, GOLD_HI)
  r.rect(x + 62, f - 50, 8, 10, '#8a6a58')
  r.rect(x + 63, f - 49, 3, 4, '#e8b890')
  r.rect(x + 67, f - 49, 3, 4, '#a82840')
  r.rect(x + 66, f - 38, 4, 1, '#5a3a20')
}

function bookshelf(r: Raster, x: number, y: number, w: number, h: number) {
  r.rect(x, y, w, h, '#2a1810')
  r.rect(x + 2, y + 2, w - 4, h - 4, '#14090a')
  const rows = 4
  const rh = Math.floor((h - 4) / rows)
  const spines = ['#7a2430', '#24406a', '#2a6a44', '#8a6a2a', '#5a2a6a', '#a85a2a', '#2a2a3a', '#6a6a7a']
  for (let row = 0; row < rows; row++) {
    const sy = y + 2 + (row + 1) * rh
    r.rect(x + 2, sy - 1, w - 4, 2, '#5a3a20')
    let bx = x + 3
    let i = 0
    while (bx < x + w - 6) {
      const bw = 2 + Math.floor(noise(i, row, 9) * 3)
      const bh = rh - 5 - Math.floor(noise(i, row, 10) * 5)
      r.rect(bx, sy - 1 - bh, bw, bh, spines[Math.floor(noise(i, row, 11) * spines.length)])
      if (noise(i, row, 12) > 0.7) r.rect(bx, sy - 1 - bh + 2, bw, 1, GOLD)
      bx += bw + 1
      i++
    }
  }
}

function barCart(r: Raster, x: number, floor: number) {
  r.rect(x, floor - 36, 40, 2, GOLD)
  r.rect(x, floor - 36, 40, 1, GOLD_HI)
  r.rect(x, floor - 18, 40, 2, GOLD)
  r.rect(x + 1, floor - 36, 2, 36, GOLD_LO)
  r.rect(x + 37, floor - 36, 2, 36, GOLD_LO)
  const bottles: [number, string, number][] = [[6, '#8a4a1a', 14], [13, '#3a1a0a', 17], [20, '#c08a2a', 11], [27, '#2a4a3a', 15]]
  for (const [bx, col, bh] of bottles) {
    r.rect(bx + x, floor - 36 - bh, 6, bh, col)
    r.rect(bx + x + 2, floor - 36 - bh - 4, 2, 4, col)
    r.rect(bx + x + 2, floor - 36 - bh - 5, 2, 1, GOLD)
    r.set(bx + x + 1, floor - 36 - bh + 3, '#ffe8b0')
    r.set(bx + x + 1, floor - 36 - bh + 4, '#ffe8b0')
  }
  r.rect(x + 8, floor - 28, 10, 10, '#b8d4e8')
  r.rect(x + 9, floor - 27, 8, 8, '#7aa4c0')
  r.rect(x + 24, floor - 24, 8, 6, '#d8d4c4')
  r.ellipse(x + 3, floor - 4, 8, 8, '#14101c')
  r.ellipse(x + 31, floor - 4, 8, 8, '#14101c')
}

// ---------------------------------------------------------------------------
// Shot 1: the penthouse, a long room the camera follows you through.
// ---------------------------------------------------------------------------

/** Where the light pools: spots over the medals, the cabinet, the plaque, the desk. For `EndingFilm` to glow. */
export const PENTHOUSE_LIGHTS: { x: number; y: number; r: number; color: string; a: number }[] = [
  { x: 231, y: 18, r: 60, color: '255,236,190', a: 0.1 },
  { x: 389, y: 18, r: 60, color: '255,236,190', a: 0.1 },
  { x: 310, y: 20, r: 60, color: '255,236,190', a: 0.12 },
  { x: 490, y: 18, r: 44, color: '255,226,170', a: 0.09 },
  { x: 596, y: 84, r: 70, color: '255,226,150', a: 0.3 },
]

/** The chandeliers' crystals, for a twinkle: x, y. */
export const PENTHOUSE_SPARKLES: [number, number][] = [
  [296, 12], [306, 14], [316, 12], [326, 14], [336, 12], [454, 12], [464, 14], [474, 12], [484, 14], [494, 12], [78, 38], [90, 42], [102, 38], [114, 42], [126, 38],
]

export function drawPenthouse(): Raster {
  const r = new Raster(WORLD_W, VIEW_H)
  // Ceiling: coffers, a gilt cornice, downlights.
  r.rect(0, 0, WORLD_W, 14, '#100c1a')
  for (let x = 0; x < WORLD_W; x += 64) {
    r.rect(x + 3, 2, 58, 9, '#1a1426')
    r.rect(x + 3, 2, 58, 1, '#2a2038')
  }
  r.rect(0, 12, WORLD_W, 2, GOLD_LO)
  r.rect(0, 14, WORLD_W, 2, GOLD)
  r.rect(0, 14, WORLD_W, 1, GOLD_HI)
  r.rect(0, 16, WORLD_W, 1, '#0a0810')
  for (let x = 40; x < WORLD_W; x += 80) r.rect(x, 12, 4, 2, '#fff2c0')
  // The wall: damask over deep navy, fluted pilasters, a panelled dado.
  r.rect(0, 17, WORLD_W, FLOOR_Y - 17, '#1a1832')
  for (let y = 18; y < 100; y += 8) {
    for (let x = (y / 8) % 2 ? 4 : 0; x < WORLD_W; x += 8) {
      r.rect(x + 3, y + 1, 2, 4, '#222044')
      r.rect(x + 2, y + 2, 4, 2, '#222044')
    }
  }
  for (let x = 186; x < WORLD_W; x += 118) {
    r.rect(x, 17, 10, 107, '#14122a')
    for (let fx = x + 1; fx < x + 10; fx += 3) r.rect(fx, 18, 1, 105, '#0e0c20')
    r.rect(x - 1, 17, 12, 3, GOLD)
    r.rect(x - 1, 100, 12, 2, GOLD)
  }
  r.rect(0, 100, WORLD_W, FLOOR_Y - 100, '#2a1a1e')
  for (let x = 2; x < WORLD_W; x += 26) {
    r.rect(x, 104, 22, 16, '#34222a')
    r.rect(x, 104, 22, 1, '#4a323a')
    r.rect(x, 119, 22, 1, '#1a0e12')
  }
  r.rect(0, 99, WORLD_W, 2, GOLD)
  r.rect(0, 99, WORLD_W, 1, GOLD_HI)
  r.rect(0, 120, WORLD_W, 4, '#1a0e10')
  r.rect(0, 120, WORLD_W, 1, GOLD_LO)

  // --- The window wall, floor to ceiling, the harbour in it. ---
  const wx = 16
  const ww = 150
  r.rect(wx - 3, 17, ww + 6, 107, '#0a0812')
  nightSky(r, wx, 20, ww, 70)
  for (let i = 0; i < 30; i++) r.set(wx + Math.floor(noise(i, 1, 4) * ww), 22 + Math.floor(noise(i, 2, 4) * 40), i % 4 ? '#f4f0d8' : '#c8d0ff')
  r.ellipse(wx + 112, 30, 12, 12, '#f4f0d8')
  r.ellipse(wx + 116, 28, 11, 11, '#090c30')
  towers(r, wx, wx + ww, 98, 1, '#141840', '#1e2458', 0.28, 10, 34)
  towers(r, wx, wx + ww, 108, 2, '#0a0c26', '#141a42', 0.4, 8, 40)
  r.rect(wx, 98, ww, 24, '#0a1a42')
  for (let i = 0; i < 16; i++) {
    r.rect(wx + 4 + Math.floor(noise(i, 5, 5) * (ww - 14)), 100 + (i % 11) * 2, 4 + (i % 3) * 2, 1, i % 2 ? '#f2c14e' : '#6a7ad8')
  }
  for (const mx of [wx + 50, wx + 100]) {
    r.rect(mx, 20, 3, 102, '#0a0812')
    r.rect(mx, 20, 1, 102, '#2a2640')
  }
  r.rect(wx, 112, ww, 2, '#0a0812')
  // Drapes, heavy velvet, tied back in gold.
  for (const flip of [false, true]) {
    const x0 = flip ? wx + ww - 22 : 2
    r.rect(x0, 20, 28, 100, '#4a1424')
    for (let fx = 0; fx < 28; fx += 4) {
      r.rect(x0 + fx, 20, 2, 100, '#5a1c2e')
      r.rect(x0 + fx + 2, 20, 1, 100, '#340a18')
    }
    r.rect(x0, 78, 28, 3, GOLD)
    r.rect(x0 + (flip ? 0 : 24), 78, 4, 10, GOLD)
  }
  r.rect(0, 17, ww + 34, 8, '#5a1c2e')
  for (let fx = 2; fx < ww + 30; fx += 3) r.rect(fx, 25, 1, 3 + (fx % 2), GOLD)
  r.rect(0, 24, ww + 34, 1, GOLD)

  // --- The awards wall. ---
  // Two velvet boards of medals, a plaque between them, a cabinet of cups below.
  const boards: [number, string][] = [[204, '#2a1030'], [364, '#0e2438']]
  boards.forEach(([bx, velvet], bi) => {
    frame(r, bx, 26, 54, 62, velvet)
    for (let row = 0; row < 4; row++) for (let col = 0; col < 5; col++) medal(r, bx + 8 + col * 9, 31 + row * 14, bi * 20 + row * 5 + col)
  })
  frame(r, 266, 20, 94, 38, '#10143a')
  const plaque = (text: string, y: number, color: string) => drawText(r, text, 313 - Math.floor(measureText(text) / 2), y, color)
  plaque('LEGENDS', 25, GOLD_HI)
  plaque('INVITATIONAL', 34, GOLD_HI)
  plaque('CHAMPION', 44, '#fff6c8')
  // The cabinet: dark wood, lit glass, cups, a bracelet, a card fan.
  r.rect(272, 60, 82, 52, '#2a1408')
  r.rect(274, 62, 78, 48, '#241c34')
  r.rect(274, 62, 78, 2, '#3a3050')
  for (let gy = 64; gy < 110; gy += 2) r.rect(274, gy, 78, 1, '#2c2440')
  for (const sy of [86, 109]) {
    r.rect(274, sy - 1, 78, 2, '#6a4a2a')
    r.rect(274, sy - 1, 78, 1, '#9a7a4a')
  }
  ;[282, 296, 310, 324, 338].forEach((cx, i) => cup(r, cx, 86, 18 - (i % 2) * 3 + (i === 2 ? 4 : 0)))
  r.ellipse(282, 98, 16, 8, GOLD)
  r.ellipse(284, 99.5, 12, 5, '#241c34')
  r.rect(283, 97, 6, 2, GOLD_HI)
  for (let i = 0; i < 4; i++) r.rect(302 + i * 6, 96 + (i % 2), 5, 9, ['#f4f0e0', '#e8e0d0'][i % 2])
  for (let i = 0; i < 4; i++) r.rect(303 + i * 6, 97 + (i % 2), 1, 2, i % 2 ? '#a8281f' : '#14141c')
  cup(r, 336, 109, 16)
  r.rect(320, 101, 8, 8, GOLD)
  r.rect(321, 102, 6, 6, '#f2d27a')
  r.rect(272, 112, 82, 2, '#2a1408')
  // The wall past the boards: three framed things, then the corner.
  frame(r, 428, 26, 28, 40, '#a8281f')
  r.rect(432, 30, 20, 7, '#f4f0e0')
  drawText(r, 'LEGEND', 435, 31, '#a8281f')
  r.rect(436, 42, 12, 12, '#6a4a3a')
  r.rect(438, 40, 8, 6, '#eab88c')
  r.rect(432, 58, 20, 3, '#f2c14e')
  frame(r, 460, 30, 34, 26, '#efe6c8')
  drawText(r, 'HE DID IT', 464, 34, '#14141c')
  for (let l = 0; l < 3; l++) r.rect(464, 43 + l * 3, 26, 1, '#8a8a98')
  frame(r, 500, 28, 24, 32, '#efe6c8')
  r.rect(504, 34, 16, 2, '#7a7a8a')
  r.rect(504, 38, 16, 1, '#b0b0b8')
  r.rect(504, 41, 16, 1, '#b0b0b8')
  r.rect(504, 44, 16, 1, '#b0b0b8')
  r.rect(512, 50, 6, 6, '#a8281f')

  // --- Study: bookshelf behind the desk, the desk, a globe. ---
  bookshelf(r, 548, 28, 82, 68)
  desk(r, 540, 96)

  // --- Floor: polished marble, the rug, then the things that stand on it. ---
  r.rect(0, FLOOR_Y, WORLD_W, VIEW_H - FLOOR_Y, '#1a1626')
  for (let y = FLOOR_Y + 2; y < VIEW_H; y += 9) {
    for (let x = ((y - FLOOR_Y) / 9) % 2 ? 0 : 20; x < WORLD_W; x += 40) {
      r.rect(x, y, 20, 9, '#1f1a2e')
      r.rect(x, y, 20, 1, '#2a2440')
    }
  }
  for (let i = 0; i < 70; i++) r.rect(Math.floor(noise(i, 1, 21) * WORLD_W), FLOOR_Y + 3 + Math.floor(noise(i, 2, 21) * 50), 6 + (i % 4) * 3, 1, '#2e2848')
  // The rug.
  const rx = 188
  const rw = 282
  r.rect(rx, 144, rw, 34, '#c9a14a')
  r.rect(rx + 2, 146, rw - 4, 30, '#5a1428')
  r.rect(rx + 6, 149, rw - 12, 24, '#0e1c3a')
  r.rect(rx + 8, 151, rw - 16, 20, '#6a1c32')
  for (let x = rx + 14; x < rx + rw - 22; x += 24) {
    r.rect(x, 157, 14, 8, '#c9a14a')
    r.rect(x + 2, 159, 10, 4, '#0e1c3a')
    r.rect(x + 5, 160, 4, 2, '#f2d27a')
  }
  for (let x = rx; x < rx + rw; x += 3) {
    r.rect(x, 178, 1, 2, '#e8d8a8')
    r.rect(x, 142, 1, 2, '#e8d8a8')
  }
  // Light from the window, laid on the floor.
  for (let y = FLOOR_Y + 2; y < 172; y++) {
    const k = (y - FLOOR_Y) / 46
    for (let x = 22 + Math.floor(k * 36); x < 168 + Math.floor(k * 44); x += 2) {
      if ((x + y) % 3 === 0) r.set(x, y, alpha('#8aa0ff', 0.1 * (1 - k * 0.6)))
    }
  }
  piano(r, 44, FLOOR_Y + 14)
  palm(r, 176, FLOOR_Y + 16)
  sofa(r, 214, 76)
  // The trophy on its plinth, and a second palm, and the bar.
  r.rect(398, 96, 22, 40, '#d8d4e0')
  r.rect(398, 96, 22, 2, '#f4f2fa')
  r.rect(398, 128, 22, 8, '#b0acc0')
  r.rect(402, 112, 14, 8, GOLD)
  drawText(r, 'x2', 405, 113, '#2a1a08')
  cup(r, 409, 96, 38, true)
  r.rect(404, 62, 10, 6, '#f2d27a')
  chandelier(r, 100, 26, 3)
  chandelier(r, 320, 9, 1)
  chandelier(r, 478, 9, 1)
  barCart(r, 438, FLOOR_Y + 16)
  palm(r, 526, FLOOR_Y + 16)
  // The floor takes a soft mirror of whatever stands at its edge.
  const depth = 22
  for (let x = 0; x < WORLD_W; x++) {
    for (let k = 0; k < depth; k++) {
      const c = r.get(x, FLOOR_Y - 2 - k)
      if (c >>> 24 === 0) continue
      const a = 0.2 * (1 - k / depth)
      r.set(x, FLOOR_Y + 2 + k, ((Math.round(a * 255) << 24) | (c & 0xffffff)) >>> 0)
    }
  }
  return r
}

// ---------------------------------------------------------------------------
// Shots 2 and 3: the desk, close.
// ---------------------------------------------------------------------------

/** The lamp's place on the desk, for its pool of light. */
export const DESK_LAMP = { x: 268, y: 92 }

/** The desk by lamplight, the room gone soft behind it. */
export function drawDeskBack(): Raster {
  const r = new Raster(VIEW_W, VIEW_H)
  r.rect(0, 0, VIEW_W, VIEW_H, '#0a0812')
  // Out-of-focus: the window's city, the chandelier, the lamp's own glow.
  for (let i = 0; i < 46; i++) {
    const x = Math.floor(noise(i, 1, 31) * VIEW_W)
    const y = 4 + Math.floor(noise(i, 2, 31) * 78)
    const s = 4 + Math.floor(noise(i, 3, 31) * 9)
    const warm = noise(i, 4, 31) > 0.45
    r.ellipse(x - s / 2, y - s / 2, s, s, alpha(warm ? '#f2c14e' : '#6a8ae8', 0.07 + noise(i, 5, 31) * 0.09))
    r.ellipse(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2, alpha(warm ? '#ffe8a0' : '#9ab0ff', 0.05))
  }
  r.rect(0, 84, VIEW_W, 22, '#120e1c')
  // The desk: a long dark top, grain, a lit edge.
  r.rect(0, 104, VIEW_W, VIEW_H - 104, '#4a2a16')
  for (let y = 106; y < VIEW_H; y += 5) {
    for (let x = 0; x < VIEW_W; x += 1) if (noise(x >> 3, y, 41) > 0.55) r.set(x, y, '#3a200e')
  }
  r.rect(0, 104, VIEW_W, 2, '#8a5430')
  r.rect(0, 106, VIEW_W, 1, '#2a140a')
  // A leather blotter.
  r.rect(40, 134, 240, 46, '#1c1a20')
  r.rect(40, 134, 240, 1, '#34303a')
  // The banker's lamp, from the front.
  const { x: lx, y: ly } = DESK_LAMP
  r.rect(lx - 10, ly + 12, 20, 4, GOLD_LO)
  r.rect(lx - 10, ly + 12, 20, 1, GOLD)
  r.rect(lx - 2, ly - 4, 4, 17, GOLD)
  r.rect(lx - 1, ly - 4, 1, 17, GOLD_HI)
  r.rect(lx - 22, ly - 24, 44, 20, '#14603a')
  r.rect(lx - 22, ly - 24, 44, 3, '#2a9a5a')
  for (let x = lx - 20; x < lx + 20; x += 6) r.rect(x, ly - 21, 1, 16, '#1a7a48')
  r.rect(lx - 22, ly - 5, 44, 1, '#0a3a22')
  r.rect(lx - 12, ly - 4, 24, 3, '#fff2c0')
  return r
}

/** The photograph and the frame it stands in, 136 wide, drawn at its own size. */
export const PHOTO = { x: 92, y: 14, w: 136, h: 118, innerX: 22, innerY: 18, innerW: 92, innerH: 70 }

export function drawFramedPhoto(): Raster {
  const r = new Raster(PHOTO.w, PHOTO.h)
  // The easel leg behind, throwing a shadow on the desk.
  // Frame: gilt, with a carved bead.
  r.rect(0, 0, PHOTO.w, 106, GOLD_LO)
  r.rect(1, 1, PHOTO.w - 2, 104, GOLD)
  r.rect(1, 1, PHOTO.w - 2, 2, GOLD_HI)
  r.rect(1, 1, 2, 104, GOLD_HI)
  for (let x = 6; x < PHOTO.w - 6; x += 6) {
    r.rect(x, 4, 3, 3, GOLD_HI)
    r.rect(x, 98, 3, 3, GOLD_LO)
  }
  for (let y = 10; y < 100; y += 6) {
    r.rect(4, y, 3, 3, GOLD_HI)
    r.rect(PHOTO.w - 7, y, 3, 3, GOLD_LO)
  }
  r.rect(9, 9, PHOTO.w - 18, 88, GOLD_LO)
  r.rect(10, 10, PHOTO.w - 20, 86, '#efe6c8')
  // The mat's inner bevel.
  r.rect(17, 14, PHOTO.innerW + 10, PHOTO.innerH + 8, '#cfc4a0')
  // The stand.
  r.rect(PHOTO.w - 44, 106, 8, 12, '#3a2210')
  return r
}

/** The photograph itself: warm string lights over a street, the two of you mid-laugh. */
export function drawPhotoPicture(): Raster {
  const W = PHOTO.innerW
  const H = PHOTO.innerH
  const r = new Raster(W, H)
  const sky = ['#3a2a5a', '#6a3a6a', '#a8506a', '#e0785a', '#f2a65a', '#f8d490']
  sky.forEach((c, i) => r.rect(0, i * 8, W, 9, c))
  for (let i = 1; i < sky.length; i++) for (let x = i % 2; x < W; x += 2) r.set(x, i * 8, sky[i - 1])
  // A street behind them, shopfronts lit.
  for (let i = 0; i < 9; i++) {
    const bx = i * 11 - 2
    const bh = 18 + Math.floor(noise(i, 1, 51) * 20)
    r.rect(bx, 54 - bh, 10, bh, '#3a2a40')
    for (let wy = 54 - bh + 3; wy < 50; wy += 5) for (let wx = bx + 2; wx < bx + 9; wx += 4) r.rect(wx, wy, 2, 3, noise(wx, wy, 52) > 0.4 ? '#f8d070' : '#6a4a58')
  }
  r.rect(0, 54, W, 16, '#2a2036')
  // String lights, soft, in the dusk.
  for (let x = 0; x < W; x += 7) {
    const y = 5 + Math.round(Math.sin(x / 11) * 3)
    r.rect(x, y, 7, 1, '#2a1a30')
    r.ellipse(x + 1, y + 1, 5, 5, alpha('#ffe8a0', 0.4))
    r.rect(x + 2, y + 2, 2, 2, '#fff6c8')
  }
  // Her: hair down past the shoulder, laughing, leaning toward you.
  const hx = 56
  r.rect(hx - 4, 14, 30, 56, '#2a1410')
  r.ellipse(hx - 3, 10, 30, 22, '#2a1410')
  r.rect(hx - 4, 20, 3, 44, '#4a2a1e')
  r.ellipse(hx + 2, 18, 20, 24, '#e8b890')
  r.ellipse(hx + 3, 19, 18, 22, '#f0c8a0')
  r.rect(hx + 3, 14, 18, 5, '#2a1410')
  r.rect(hx + 1, 16, 8, 3, '#2a1410')
  r.rect(hx + 7, 23, 4, 2, '#1a0e0a')
  r.rect(hx + 15, 23, 4, 2, '#1a0e0a')
  r.rect(hx + 7, 21, 4, 1, '#2a1410')
  r.rect(hx + 15, 21, 4, 1, '#2a1410')
  r.set(hx + 7, 23, '#ffffff')
  r.set(hx + 15, 23, '#ffffff')
  r.rect(hx + 9, 28, 3, 2, '#d09870')
  r.rect(hx + 8, 33, 11, 5, '#c02a44')
  r.rect(hx + 9, 33, 9, 3, '#ffffff')
  r.rect(hx + 9, 36, 9, 2, '#c02a44')
  r.rect(hx + 5, 30, 3, 2, '#e89080')
  r.rect(hx + 19, 30, 3, 2, '#e89080')
  r.rect(hx - 1, 28, 2, 4, GOLD_HI)
  r.rect(hx + 22, 28, 2, 4, GOLD_HI)
  r.rect(hx + 8, 43, 12, 8, '#e8b890')
  r.rect(hx - 6, 50, 36, 22, '#b8283f')
  r.rect(hx - 6, 50, 36, 2, '#d8405a')
  r.rect(hx + 5, 49, 18, 3, '#e8b890')
  r.rect(hx + 4, 52, 20, 6, '#e8b890')
  for (let i = 0; i < 6; i++) r.rect(hx + 5 + i * 3, 52 + (i === 2 || i === 3 ? 4 : i === 1 || i === 4 ? 3 : 1), 2, 2, '#f4f0e0')
  return r
}

// ---------------------------------------------------------------------------
// Shot 3: the papers.
// ---------------------------------------------------------------------------

export const SHEET = { x: 78, y: 2, w: 164, h: 176 }

/** The top sheet, drawn at its own size. The stamp and the signature's tab move; everything else is paper. */
export function drawSheet(film: { court: string; title: string; body: string; petitioner: string; respondent: string }): Raster {
  const r = new Raster(SHEET.w, SHEET.h)
  r.rect(0, 0, SHEET.w, SHEET.h, '#f2eee0')
  r.rect(0, 0, SHEET.w, 1, '#ffffff')
  r.rect(0, SHEET.h - 1, SHEET.w, 1, '#d8d2c0')
  r.rect(SHEET.w - 1, 0, 1, SHEET.h, '#d8d2c0')
  // Paper has a grain and a fold.
  for (let i = 0; i < 160; i++) r.set(Math.floor(noise(i, 1, 61) * SHEET.w), Math.floor(noise(i, 2, 61) * SHEET.h), '#e8e2d0')
  r.rect(0, 88, SHEET.w, 1, '#e8e2d0')
  const centre = (text: string, y: number, color: string) => drawText(r, text, Math.floor((SHEET.w - measureText(text)) / 2), y, color)
  // The seal and the court.
  r.ellipse(SHEET.w / 2 - 8, 8, 16, 16, '#c9a14a')
  r.ellipse(SHEET.w / 2 - 6, 10, 12, 12, '#e8c860')
  r.rect(SHEET.w / 2 - 1, 12, 2, 6, '#8a6a20')
  r.rect(SHEET.w / 2 - 3, 14, 6, 2, '#8a6a20')
  wrapText(film.court, SHEET.w - 24).forEach((l, i) => centre(l, 24 + i * LINE_HEIGHT, '#5a5a6a'))
  r.rect(14, 48, SHEET.w - 28, 1, '#14141c')
  wrapText(film.title, SHEET.w - 28).forEach((l, i) => centre(l, 54 + i * LINE_HEIGHT, '#14141c'))
  r.rect(14, 78, SHEET.w - 28, 1, '#14141c')
  // The body, set small.
  wrapText(film.body, SHEET.w - 24).forEach((l, i) => drawText(r, l, 12, 86 + i * LINE_HEIGHT, '#3a3a4a'))
  // Signature blocks.
  const sy = 154
  r.rect(12, sy, 64, 1, '#14141c')
  r.rect(88, sy, 64, 1, '#14141c')
  drawText(r, film.petitioner, 12, sy + 3, '#6a6a7a')
  drawText(r, film.respondent, 88, sy + 3, '#6a6a7a')
  // Hers: a hand that did not hesitate.
  const ink = '#1c2a8a'
  let px = 16
  let py = sy - 6
  for (let i = 0; i < 46; i++) {
    px += 1
    py = sy - 7 + Math.round(Math.sin(i / 2.2) * 4 * (1 - i / 80))
    r.rect(px, py, 1, 2, ink)
    if (i % 9 === 0) r.rect(px, py - 3, 1, 4, ink)
  }
  r.rect(16, sy - 3, 40, 1, ink)
    return r
}

// ---------------------------------------------------------------------------
// Shot 5: the window at night.
// ---------------------------------------------------------------------------

/** The opening in the wall: where the glass is, and where the harbour starts. */
export const WIN = { x: 16, y: 8, w: 288, h: 134, horizon: 104 }

/** The sky and the moon, fixed. */
export function drawSkyPicture(): Raster {
  const r = new Raster(VIEW_W, VIEW_H)
  nightSky(r, WIN.x, WIN.y, WIN.w, WIN.horizon - WIN.y + 2)
  r.ellipse(238, 22, 22, 22, alpha('#f4f0d8', 0.08))
  r.ellipse(242, 26, 14, 14, alpha('#f4f0d8', 0.12))
  r.ellipse(245, 29, 8, 8, '#f4f0d8')
  r.ellipse(248, 27, 8, 8, '#0d1040')
  return r
}

/** One skyline strip, wide enough to scroll and wrap. Three of them make the depth. */
export function drawSkylineStrip(layer: 0 | 1 | 2): Raster {
  const W = WIN.w * 2
  const r = new Raster(W, VIEW_H)
  if (layer === 0) towers(r, 0, W, WIN.horizon, 71, '#1a1a4c', '#262866', 0.22, 10, 34)
  if (layer === 1) towers(r, 0, W, WIN.horizon + 4, 72, '#0e1034', '#1a1e52', 0.34, 14, 52)
  if (layer === 2) towers(r, 0, W, WIN.horizon + 10, 73, '#080a22', '#121642', 0.46, 18, 74)
  return r
}

/** The harbour, flat; the dynamic layer breaks the city up in it. */
export function drawHarbour(): Raster {
  const r = new Raster(VIEW_W, VIEW_H)
  const bands = ['#0c1c44', '#0a1a40', '#08163a', '#071334', '#060f2c']
  bands.forEach((c, i) => r.rect(WIN.x, WIN.horizon + 4 + i * 6, WIN.w, 7, c))
  // The far shore: a low line of lights.
  for (let i = 0; i < 40; i++) r.rect(WIN.x + 4 + i * 7, WIN.horizon + 1, 1, 1, i % 3 ? '#f2c14e' : '#f4f0d8')
  return r
}

/** The room around the glass: dark wall, mullions, the sill, a polished floor with the city in it. */
export function drawWindowFrame(): Raster {
  const r = new Raster(VIEW_W, VIEW_H)
  r.rect(0, 0, VIEW_W, WIN.y, '#07060e')
  r.rect(0, WIN.y, WIN.x, VIEW_H, '#07060e')
  r.rect(WIN.x + WIN.w, WIN.y, VIEW_W - WIN.x - WIN.w, VIEW_H, '#07060e')
  r.rect(0, WIN.y + WIN.h, VIEW_W, VIEW_H - WIN.y - WIN.h, '#0a0812')
  r.rect(0, WIN.y - 2, VIEW_W, 2, GOLD_LO)
  r.rect(WIN.x - 2, WIN.y, 2, WIN.h, '#1a1626')
  r.rect(WIN.x + WIN.w, WIN.y, 2, WIN.h, '#1a1626')
  for (const mx of [WIN.x + 94, WIN.x + 192]) {
    r.rect(mx, WIN.y, 4, WIN.h, '#07060e')
    r.rect(mx, WIN.y, 1, WIN.h, '#2a2640')
  }
  // Sill and floor.
  r.rect(0, WIN.y + WIN.h - 2, VIEW_W, 3, '#14102a')
  r.rect(0, WIN.y + WIN.h - 2, VIEW_W, 1, '#2a2548')
  for (let y = WIN.y + WIN.h + 3; y < VIEW_H; y += 8) r.rect(0, y, VIEW_W, 1, '#10101c')
  for (let y = WIN.y + WIN.h + 3, row = 0; y < VIEW_H; y += 8, row++) for (let x = row % 2 ? 0 : 20; x < VIEW_W; x += 40) r.rect(x, y, 1, 8, '#10101c')
  // Drapes at the edges, nearly black.
  for (const x0 of [0, VIEW_W - 16]) {
    r.rect(x0, WIN.y, 16, WIN.h, '#1a0a14')
    for (let fx = 0; fx < 16; fx += 4) r.rect(x0 + fx, WIN.y, 2, WIN.h, '#260e1c')
  }
  return r
}
