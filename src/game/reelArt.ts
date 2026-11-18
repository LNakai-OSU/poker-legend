import type { ReelScene } from '../world/events'
import { HERO_FIGURE, figureForCharacter } from '../overworld/casting'
import { CHARACTERS } from '../world/characters'
import { Raster } from './pixel/raster'
import { drawText, measureText, wrapText } from './pixel/font'
import { drawPerson, type WalkFrame } from '../overworld/characterArt'

/**
 * The sets of the short films, drawn at runtime like everything else: a small
 * canvas of flat rectangles, scaled up with nearest-neighbour. Each is a room
 * the story cuts to — the studio of the televised final, the bathroom, the
 * commentators' booth — and none needs more than a dozen shapes to read.
 */

export const REEL_W = 160
export const REEL_H = 90

type Ctx = CanvasRenderingContext2D
type Notification = { from: string; text: string }

/** A line of the pixel font, drawn onto a still. */
function drawLabel(c: Ctx, text: string, x: number, y: number, color: string) {
  const r = new Raster(measureText(text) + 2, 9)
  drawText(r, text, 1, 1, color)
  c.drawImage(r.toCanvas(), x - 1, y - 1)
}

function rect(c: Ctx, color: string, x: number, y: number, w: number, h: number) {
  c.fillStyle = color
  c.fillRect(Math.round(x), Math.round(y), w, h)
}

function person(c: Ctx, x: number, y: number, skin: string, shirt: string, hair: string, headset = false) {
  rect(c, shirt, x - 7, y + 12, 14, 18)
  rect(c, skin, x - 5, y, 10, 11)
  rect(c, hair, x - 5, y - 2, 10, 4)
  rect(c, '#18141c', x - 3, y + 5, 2, 2)
  rect(c, '#18141c', x + 1, y + 5, 2, 2)
  if (headset) {
    rect(c, '#222', x - 6, y + 2, 1, 6)
    rect(c, '#222', x + 5, y + 2, 1, 6)
    rect(c, '#222', x - 6, y + 8, 5, 1)
  }
}


function disc(c: Ctx, color: string, cx: number, cy: number, r: number) {
  c.fillStyle = color
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r * r - dy * dy))
    c.fillRect(Math.round(cx - w), Math.round(cy + dy), w * 2 + 1, 1)
  }
}

/** Soft banded sky from `top` to `bottom` colours, in flat strips. */
function skyBands(c: Ctx, colors: string[], h = REEL_H) {
  const step = Math.ceil(h / colors.length)
  colors.forEach((color, i) => rect(c, color, 0, i * step, REEL_W, step))
}

function cloud(c: Ctx, x: number, y: number, s: number, color = '#ffffff', shade = '#d6e6f6') {
  rect(c, shade, x, y + 3 * s, 20 * s, 3 * s)
  rect(c, color, x + 2 * s, y + 2 * s, 16 * s, 3 * s)
  rect(c, color, x + 5 * s, y, 7 * s, 3 * s)
  rect(c, color, x + 11 * s, y + s, 5 * s, 3 * s)
}

/** A bird in flight, wings up or down, as a handful of pixels. */
function bird(c: Ctx, x: number, y: number, flap: boolean, color: string, s = 1) {
  rect(c, color, x - s, y, 3 * s, s)
  if (flap) {
    rect(c, color, x - 4 * s, y - 2 * s, 3 * s, s)
    rect(c, color, x + 2 * s, y - 2 * s, 3 * s, s)
    rect(c, color, x - 2 * s, y - s, s, s)
    rect(c, color, x + 2 * s, y - s, s, s)
  } else {
    rect(c, color, x - 5 * s, y + s, 4 * s, s)
    rect(c, color, x + 2 * s, y + s, 4 * s, s)
    rect(c, color, x - 2 * s, y, s, s)
    rect(c, color, x + 2 * s, y, s, s)
  }
}

function envelope(c: Ctx, x: number, y: number, paper: string, edge: string, band?: string) {
  rect(c, edge, x - 1, y - 1, 34, 22)
  rect(c, paper, x, y, 32, 20)
  for (let i = 0; i < 12; i++) {
    rect(c, edge, x + i, y + i, 1, 1)
    rect(c, edge, x + 31 - i, y + i, 1, 1)
  }
  if (band) rect(c, band, x + 2, y + 15, 28, 3)
  rect(c, '#9a9aa8', x + 20, y + 3, 8, 1)
}


/** Where in the flat you stand, by name: the x of your sprite's left edge. */
const FLAT_STOPS = { out: -18, door: 6, mat: 24, table: 50, desk: 82, shelf: 106, bed: 130 } as const
type FlatStop = keyof typeof FLAT_STOPS

/**
 * The flat from the side, drawn once for every walk through it: a door, the mat with the post on
 * it, the kitchen table, the laptop, the shelf and the bed. You walk from one stop to the next
 * and turn to face the thing you came for.
 */
function drawFlat(c: Ctx, t: number, from: FlatStop, to: FlatStop, post: boolean) {
  // Walls: warm dark paper, a skirting board, a worn floor.
  rect(c, '#2e2224', 0, 0, REEL_W, REEL_H)
  for (let x = 0; x < REEL_W; x += 10) rect(c, '#342729', x, 0, 5, 62)
  rect(c, '#1c1416', 0, 60, REEL_W, 3)
  rect(c, '#5a4030', 0, 63, REEL_W, 27)
  for (let x = 0; x < REEL_W; x += 22) rect(c, '#4a3224', x, 63, 1, 27)
  rect(c, '#6a4a38', 0, 63, REEL_W, 1)
  // The ceiling light and the pool it makes.
  rect(c, '#e8d890', 78, 0, 4, 3)
  c.globalAlpha = 0.07
  rect(c, '#f2c14e', 40, 0, 80, 62)
  c.globalAlpha = 1
  // The door, standing open on the hall.
  rect(c, '#1a1424', 0, 14, 18, 49)
  rect(c, '#3a2418', 0, 12, 20, 2)
  rect(c, '#5a3a2a', 17, 14, 3, 49)
  // The mat and the post on it.
  rect(c, '#3a4a5a', 22, 66, 22, 7)
  if (post) {
    rect(c, '#f0ecdc', 26, 67, 8, 5)
    rect(c, '#f2e8c0', 33, 68, 7, 4)
    rect(c, '#c83a32', 29, 70, 6, 1)
  }
  // The kitchen table, a chair, a lamp on it.
  rect(c, '#6a4a2e', 40, 42, 36, 3)
  rect(c, '#52381f', 43, 45, 3, 20)
  rect(c, '#52381f', 70, 45, 3, 20)
  rect(c, '#7a5232', 40, 42, 36, 1)
  rect(c, '#4a2f20', 36, 48, 4, 16)
  rect(c, '#4a2f20', 34, 46, 6, 3)
  rect(c, '#e8d890', 60, 36, 6, 6)
  rect(c, '#8a7a3a', 62, 42, 2, 1)
  // The desk and the laptop, open and lit.
  rect(c, '#52381f', 80, 46, 26, 3)
  rect(c, '#3a2818', 82, 49, 3, 15)
  rect(c, '#3a2818', 101, 49, 3, 15)
  rect(c, '#2a2e3a', 86, 36, 14, 10)
  rect(c, Math.floor(t / 600) % 2 ? '#7aa8f0' : '#6a98e0', 87, 37, 12, 8)
  rect(c, '#3a3f50', 84, 46, 18, 1)
  // The bookshelf: spines in a few colours.
  rect(c, '#52381f', 108, 12, 20, 50)
  rect(c, '#2a1c10', 110, 14, 16, 46)
  const tones = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#6a5a2a', '#5a3a6a', '#8a5a2a']
  for (let row = 0; row < 4; row++) {
    for (let k = 0; k < 6; k++) rect(c, tones[(row * 2 + k) % tones.length], 111 + k * 2.5, 16 + row * 11 + (k % 2), 2, 9 - (k % 2))
    rect(c, '#52381f', 110, 25 + row * 11, 16, 1)
  }
  // The bed: a frame, a pillow, a blanket.
  rect(c, '#52381f', 128, 40, 4, 26)
  rect(c, '#3a2818', 128, 54, 32, 12)
  rect(c, '#4a5a8a', 132, 50, 28, 10)
  rect(c, '#5a6a9a', 132, 50, 28, 2)
  rect(c, '#e8e4d8', 133, 46, 10, 5)
  // You: from one stop to the next at a walking pace, then turned to face the thing.
  const a = FLAT_STOPS[from]
  const b = FLAT_STOPS[to]
  const dist = Math.abs(b - a)
  const arrived = t >= dist * 34
  const x = a + Math.sign(b - a) * Math.min(dist, t / 34)
  const facing = arrived && from !== to ? 'up' : b >= a ? 'right' : 'left'
  const frame = (arrived ? 0 : Math.floor(t / 140) % 3) as WalkFrame
  drawPerson(c, HERO_FIGURE, facing, frame, { x: Math.round(x), y: 40 })
}

function drawBathroomSet(c: Ctx, t: number, settled: boolean) {
    rect(c, '#9db3ae', 0, 0, REEL_W, REEL_H)
    for (let y = 0; y < REEL_H; y += 10) rect(c, '#8aa19c', 0, y, REEL_W, 1)
    for (let x = 0; x < REEL_W; x += 10) rect(c, '#8aa19c', x, 0, 1, REEL_H)
    rect(c, '#4a5a58', 0, 64, REEL_W, 26)
    // Three mirrors over three sinks.
    for (const sx of [14, 62, 110]) {
      rect(c, '#6a8088', sx - 1, 14, 38, 30)
      rect(c, '#b8c9cc', sx, 15, 36, 28)
      rect(c, '#e8ecea', sx + 2, 46, 32, 4)
      rect(c, '#cfd6d4', sx + 4, 50, 28, 12)
    }
    // The stall.
    rect(c, '#5a3a2a', 148, 12, 12, 52)
    // The tap running at the middle sink.
    const drip = Math.floor(t / 90) % 4
    rect(c, '#8ec8f0', 79, 52 + drip, 1, 3)
    const hum = Math.floor(t / 90) % 11 === 0
    rect(c, hum ? '#8b8b6a' : '#f4f2c8', 50, 2, 60, 3)
    // In at the door on the right, to the middle sink, and then up to the mirror, unless you are there already.
    const arrive = settled ? 1 : Math.min(1, t / 1800)
    const x = 140 - arrive * (140 - 70)
    const facing = arrive < 1 ? 'left' : 'up'
    const frame = (arrive < 1 ? Math.floor(t / 150) % 3 : 0) as WalkFrame
    drawPerson(c, HERO_FIGURE, facing, frame, { x: Math.round(x), y: 40 })
    if (settled) {
      // Marcus, in his sports jacket, from the door to your shoulder, and then standing there.
      const marcus = figureForCharacter('marcus', CHARACTERS.marcus)
      const come = Math.min(1, Math.max(0, (t - 500) / 1500))
      const mx = 150 - come * 50
      drawPerson(c, marcus, 'left', (come < 1 ? Math.floor(t / 150) % 3 : 0) as WalkFrame, { x: Math.round(mx), y: 40 })
    }
}

// ---------------------------------------------------------------------------
// The nights up the ladder (docs/STORYBOARD.md §9.6): from the river up, each
// stop's night alone has a look of its own. Same few tools for all of them: a
// banded sky with dithered seams, soft lights built of faint rings, and noise
// from a hash, so a still is the same every time it is drawn.
// ---------------------------------------------------------------------------

/** A repeatable number from 0 to 1, for scattering stars, ripples and sand. */
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

/** A sky or a sea in bands from top to bottom, with a dithered row at each seam so it does not step. */
function bands(c: Ctx, x: number, y: number, w: number, h: number, colors: string[]) {
  const edge = (i: number) => y + Math.round((i * h) / colors.length)
  colors.forEach((color, i) => rect(c, color, x, edge(i), w, edge(i + 1) - edge(i)))
  for (let i = 1; i < colors.length; i++) {
    const seam = edge(i)
    for (let px = x; px < x + w - 1; px += 2) {
      rect(c, colors[i], px + 1, seam - 1, 1, 1)
      rect(c, colors[i - 1], px, seam, 1, 1)
    }
  }
}

/** A soft light: rings of one colour, each faint, so the middle is brightest. */
function glow(c: Ctx, color: string, cx: number, cy: number, r: number, alpha: number, rings = 5) {
  c.globalAlpha = alpha
  for (let i = 0; i < rings; i++) disc(c, color, cx, cy, Math.max(1, Math.round(r * (1 - i / rings))))
  c.globalAlpha = 1
}

/** Stars over a strip of sky, each twinkling on its own beat; one in seven is a warm one. */
function starfield(c: Ctx, t: number, n: number, x: number, y: number, w: number, h: number, seed: number) {
  for (let i = 0; i < n; i++) {
    const sx = x + Math.floor(hash(seed + i) * w)
    const sy = y + Math.floor(hash(seed + i + 500) * h)
    const beat = 500 + Math.floor(hash(seed + i + 900) * 1400)
    const on = (Math.floor(t / beat) + i) % 6 !== 0
    rect(c, !on ? '#4a5278' : i % 7 === 0 ? '#f8e8b0' : '#e8ecf8', sx, sy, 1, 1)
    if (i % 9 === 0 && on) {
      c.globalAlpha = 0.35
      rect(c, '#e8ecf8', sx - 1, sy, 3, 1)
      rect(c, '#e8ecf8', sx, sy - 1, 1, 3)
      c.globalAlpha = 1
    }
  }
}

/** A straight line of single pixels. */
function line(c: Ctx, color: string, x0: number, y0: number, x1: number, y1: number) {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) rect(c, color, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, 1, 1)
}

/** A full moon with a halo, a couple of darker seas on it and a lit upper edge. */
function moon(c: Ctx, cx: number, cy: number, r: number, halo: string) {
  glow(c, halo, cx, cy, r * 3, 0.035, 6)
  disc(c, '#cfcdbc', cx, cy, r)
  disc(c, '#eceadb', cx - 1, cy - 1, r - 1)
  rect(c, '#c6c4b2', cx + 1, cy - 2, 2, 2)
  rect(c, '#d2d0be', cx - 2, cy + 1, 2, 1)
  rect(c, '#c6c4b2', cx, cy + 2, 1, 1)
}

/** A riverboat's stern wheel, turning: red rims, spokes, a bucket across the end of each arm. */
function sternWheel(c: Ctx, t: number, cx: number, cy: number, r: number) {
  const turn = t / 1700
  // The wheel's far side, a little behind and up: it has depth.
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2
    rect(c, '#3a1410', cx + 3 + Math.cos(a) * r, cy - 1 + Math.sin(a) * r, 1, 1)
  }
  for (let k = 0; k < 10; k++) {
    const a = turn + (k * Math.PI) / 5
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    line(c, '#4a1a14', cx, cy, cx + ca * (r - 1), cy + sa * (r - 1))
    for (let d = r - 6; d <= r + 1; d++) rect(c, '#2a1810', cx + ca * d - sa, cy + sa * d + ca, 2, 2)
  }
  for (let i = 0; i < 140; i++) {
    const a = (i / 140) * Math.PI * 2
    // Lit from the moon, up and to the left: the rim is brighter on that side.
    const lit = Math.cos(a - Math.PI * 1.25) > 0.6
    rect(c, lit ? '#b8503c' : '#7e2a20', cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1)
    rect(c, '#5e2018', cx + Math.cos(a) * (r - 5), cy + Math.sin(a) * (r - 5), 1, 1)
  }
  disc(c, '#24160e', cx, cy, 3)
  rect(c, '#6a4a2e', cx - 1, cy - 2, 2, 1)
}

/**
 * Riverbend, the deck aft of the card room at night. The boat has not moved in eleven years and
 * its wheel turns in the current anyway; lanterns smear on black water, and you are at the rail.
 */
function drawDeck(c: Ctx, t: number) {
  // The sky, a moon with a cloud going over it, and the far bank.
  bands(c, 0, 0, REEL_W, 46, ['#04060d', '#060914', '#090e1e', '#0d1428', '#121a32', '#18223c'])
  starfield(c, t, 30, 30, 9, 130, 26, 11)
  moon(c, 98, 18, 5, '#b8c4e8')
  const drift = ((t / 90) % 240) - 70
  c.globalAlpha = 0.8
  rect(c, '#18223a', drift, 18, 34, 2)
  rect(c, '#1e2a44', drift + 5, 17, 22, 1)
  rect(c, '#131b2e', drift + 10, 20, 26, 1)
  c.globalAlpha = 1
  for (let x = 0; x < REEL_W; x++) {
    const h = 3 + Math.round(Math.sin(x / 5) * 1.5 + Math.sin(x / 2.3) + hash(x) * 2)
    rect(c, '#05070e', x, 42 - h, 1, h + 4)
  }
  // The mill on the far bank, two windows lit (one of them goes out now and then), a lamp on its jetty.
  rect(c, '#070a12', 52, 30, 18, 12)
  rect(c, '#070a12', 55, 27, 12, 3)
  rect(c, '#070a12', 64, 23, 2, 4)
  rect(c, '#d8a24a', 56, 34, 2, 2)
  rect(c, Math.floor(t / 2300) % 4 ? '#e8b85a' : '#5a4220', 62, 34, 2, 2)
  rect(c, '#06080f', 70, 41, 10, 1)
  rect(c, '#f2c870', 77, 39, 1, 2)
  glow(c, '#f2c870', 77, 40, 4, 0.08, 3)
  // The river, a little lighter towards the boat.
  bands(c, 0, 44, REEL_W, 46, ['#09111f', '#0b1426', '#0d172c', '#0f1b32', '#111f38'])
  // Lights broken up on the water: the moon, the mill, the jetty, and the boat's own lanterns.
  const shimmer = (x: number, y0: number, y1: number, color: string, spread: number, k: number) => {
    for (let y = y0; y < y1; y += 2) {
      const f = (y - y0) / (y1 - y0)
      const w = 1 + Math.floor(f * spread)
      const dx = Math.round(Math.sin(t / 260 + y * 0.9 + k) * (1 + f * 2))
      if (hash(y * 13 + k * 7 + Math.floor(t / 180)) < 0.8) rect(c, color, x - w / 2 + dx, y, w, 1)
    }
  }
  shimmer(98, 46, 80, '#6a7698', 6, 1)
  shimmer(57, 45, 58, '#8a6430', 2, 2)
  shimmer(77, 45, 62, '#b08440', 2, 3)
  shimmer(44, 50, 64, '#9a6a30', 3, 4)
  shimmer(90, 50, 64, '#9a6a30', 3, 5)
  // Ripples going downstream, longer the nearer they are, and a low mist moving with them.
  for (let i = 0; i < 48; i++) {
    const speed = 16 + hash(i + 40) * 30
    const x = ((hash(i) * 180 + t / speed) % 180) - 10
    const y = 47 + Math.floor(hash(i + 200) * 40)
    const w = 2 + Math.floor((hash(i + 300) * (y - 40)) / 6)
    rect(c, y > 68 ? '#1c2c4a' : '#15223a', x, y, w, 1)
  }
  c.globalAlpha = 0.07
  for (let k = 0; k < 4; k++) rect(c, '#a8b4d0', ((t / 150 + k * 70) % 240) - 60, 44 + (k % 2), 46, 2)
  c.globalAlpha = 1

  // The stern wheel on the beams it hangs from, its lowest buckets in the river.
  rect(c, '#140e09', 110, 40, 50, 3)
  rect(c, '#2a1c12', 110, 40, 50, 1)
  sternWheel(c, t, 137, 61, 21)
  rect(c, '#1c130b', 108, 60, 29, 3)
  rect(c, '#3a2818', 108, 60, 29, 1)
  bands(c, 110, 79, 50, 11, ['#0f1b32', '#111f38'])
  for (let i = 0; i < 30; i++) {
    const x = 112 + ((hash(i) * 48 + t / (22 + hash(i + 7) * 20)) % 48)
    const y = 79 + Math.floor(hash(i + 60) * 8)
    const white = hash(i + Math.floor(t / 150)) > 0.5
    rect(c, white ? '#c8d8ea' : '#4e6a8a', x, y, 1 + Math.floor(hash(i + 3) * 3), 1)
  }
  // Water running off the buckets as they come up out of it.
  for (let k = 0; k < 6; k++) {
    const fall = (t / 5 + k * 29) % 20
    rect(c, '#8aa8c8', 117 + (k % 3) * 2, 60 + k + fall, 1, 1)
  }

  // The deck above: its underside, its fretwork trim, and the lanterns hung from it.
  rect(c, '#0c0806', 0, 0, 114, 5)
  rect(c, '#2a1c12', 0, 5, 114, 2)
  for (let x = 1; x < 114; x += 4) {
    rect(c, '#3e2a1a', x, 7, 2, 1)
    rect(c, '#2a1c12', x + 1, 8, 1, 1)
  }
  rect(c, '#3a2616', 111, 0, 3, 79)
  rect(c, '#4e3420', 111, 0, 1, 79)
  // The cabin wall on the left, and the card room through its window: two players' heads over the felt.
  rect(c, '#1e140c', 0, 7, 26, 72)
  for (let x = 2; x < 26; x += 4) rect(c, '#170f08', x, 7, 1, 72)
  rect(c, '#3a2616', 24, 7, 2, 72)
  rect(c, '#3a2616', 3, 19, 20, 26)
  bands(c, 4, 20, 18, 24, ['#b8742e', '#d4923e', '#e6ac50', '#eebe62'])
  const nod = (k: number) => (Math.floor(t / (1300 + k * 400)) % 3 === 0 ? 1 : 0)
  rect(c, '#4a2a12', 6, 33 + nod(0), 5, 5)
  rect(c, '#4a2a12', 5, 37 + nod(0), 7, 4)
  rect(c, '#3a2010', 14, 31 + nod(1), 5, 6)
  rect(c, '#3a2010', 13, 36 + nod(1), 7, 5)
  rect(c, '#2a5a3a', 4, 40, 18, 4)
  rect(c, '#3a7a4e', 4, 40, 18, 1)
  rect(c, '#3a2616', 12, 20, 1, 24)
  rect(c, '#3a2616', 4, 30, 18, 1)
  rect(c, '#5a3e26', 2, 45, 22, 2)
  glow(c, '#f2b860', 13, 32, 16, 0.035, 5)
  // A life ring on the wall.
  disc(c, '#e8e4d8', 13, 58, 5)
  disc(c, '#1e140c', 13, 58, 2)
  rect(c, '#c83a32', 11, 53, 4, 2)
  rect(c, '#c83a32', 11, 62, 4, 2)
  rect(c, '#c83a32', 8, 56, 2, 4)
  rect(c, '#c83a32', 17, 56, 2, 4)
  rect(c, '#a8a498', 9, 60, 2, 1)
  // Lanterns, swaying a pixel in the draught, flames uneven.
  for (const [lx, k] of [[44, 0], [90, 2]] as const) {
    const sway = Math.round(Math.sin(t / 900 + k))
    const flick = 0.045 + hash(Math.floor(t / 110) + k * 50) * 0.025
    line(c, '#1a120c', lx, 7, lx + sway, 12)
    glow(c, '#f2b050', lx + sway, 16, 16, flick, 6)
    rect(c, '#3a2818', lx - 2 + sway, 12, 5, 1)
    rect(c, '#f8d488', lx - 1 + sway, 13, 3, 5)
    rect(c, '#fff6d0', lx + sway, 14 + (hash(Math.floor(t / 90) + k) > 0.7 ? 1 : 0), 1, 2)
    rect(c, '#2a1c12', lx - 2 + sway, 13, 1, 5)
    rect(c, '#2a1c12', lx + 2 + sway, 13, 1, 5)
    rect(c, '#3a2818', lx - 2 + sway, 18, 5, 1)
    rect(c, '#3a2818', lx + sway, 19, 1, 1)
  }
  // The rail: a cap catching the lantern light, balusters, a kick board.
  rect(c, '#4a3020', 26, 63, 85, 2)
  rect(c, '#8a6038', 26, 63, 85, 1)
  for (let x = 28; x < 111; x += 5) {
    rect(c, '#2a1a0e', x, 65, 2, 12)
    rect(c, '#4a3020', x, 65, 1, 12)
  }
  rect(c, '#24160c', 26, 76, 85, 3)
  rect(c, '#3a2616', 26, 76, 85, 1)
  // The deck: planks with their seams, the window's light spilt across them, a coil of rope.
  rect(c, '#2a1c12', 0, 79, 111, 11)
  for (let y = 81; y < 90; y += 3) rect(c, '#20150c', 0, y, 111, 1)
  for (let i = 0; i < 9; i++) rect(c, '#170e07', (i * 23 + (i % 3) * 7) % 108, 82 + (i % 3) * 3, 1, 2)
  c.globalAlpha = 0.16
  for (let y = 79; y < 90; y++) rect(c, '#f2b860', 0, y, 24 + (y - 79) * 2, 1)
  c.globalAlpha = 1
  glow(c, '#f2b050', 44, 86, 12, 0.03, 4)
  glow(c, '#f2b050', 90, 86, 12, 0.03, 4)
  rect(c, '#5a4a30', 96, 84, 10, 3)
  rect(c, '#6a5838', 97, 83, 8, 1)
  rect(c, '#4a3c26', 98, 85, 6, 1)
  // You, at the rail, looking at the water.
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 60, y: 57 })
}

/**
 * Crescent Harbor, a room over the supper club at eleven dollars a night: an iron bed, a washstand
 * with a spotted mirror, a bulb on a cord, and the lighthouse beam crossing the wall every nine
 * seconds. You stand at the washstand, looking at yourself.
 */
function drawHarborRoom(c: Ctx, t: number) {
  const sweep = (t % 9000) / 9000
  // The wall: old paper in two blues with a small figure in it, a picture rail, the ceiling in shadow.
  rect(c, '#191e2b', 0, 0, REEL_W, 64)
  for (let x = 0; x < REEL_W; x += 8) rect(c, '#1d2332', x, 9, 4, 41)
  for (let y = 13; y < 48; y += 8) for (let x = 2; x < REEL_W; x += 8) rect(c, '#283048', x + ((y - 13) / 8 % 2) * 4, y, 1, 1)
  rect(c, '#11151e', 0, 0, REEL_W, 7)
  rect(c, '#2a2418', 0, 7, REEL_W, 2)
  rect(c, '#3a3222', 0, 7, REEL_W, 1)
  c.globalAlpha = 0.25
  disc(c, '#4a4028', 152, 13, 7)
  disc(c, '#4a4028', 146, 10, 4)
  c.globalAlpha = 1
  line(c, '#10131c', 120, 9, 123, 16)
  line(c, '#10131c', 123, 16, 121, 23)
  // The wainscot and the floor, with a rag rug.
  rect(c, '#28201a', 0, 50, REEL_W, 14)
  rect(c, '#3a3026', 0, 50, REEL_W, 2)
  for (let x = 6; x < REEL_W; x += 14) rect(c, '#201a14', x, 53, 1, 10)
  rect(c, '#120e0a', 0, 63, REEL_W, 1)
  rect(c, '#281c14', 0, 64, REEL_W, 26)
  for (let y = 67; y < 90; y += 4) rect(c, '#20160e', 0, y, REEL_W, 1)
  for (let i = 0; i < 12; i++) rect(c, '#170f09', (i * 37) % REEL_W, 68 + (i % 5) * 4, 1, 3)
  rect(c, '#4a2a2a', 50, 74, 44, 11)
  rect(c, '#5a3434', 52, 75, 40, 9)
  rect(c, '#3a5a6a', 52, 78, 40, 1)
  rect(c, '#6a4a3a', 52, 81, 40, 1)
  for (let x = 51; x < 94; x += 2) rect(c, '#6a4a3a', x, 85, 1, 1)

  // The window: the harbour at night, the lighthouse out on the point, the supper club's red sign below.
  rect(c, '#3a3026', 8, 12, 34, 36)
  bands(c, 10, 14, 30, 18, ['#060918', '#090d1e', '#0d1226', '#11182e'])
  starfield(c, t, 7, 11, 15, 28, 12, 40)
  bands(c, 10, 32, 30, 14, ['#0a1426', '#0c172c', '#0e1b32'])
  rect(c, '#04060c', 10, 29, 14, 4)
  rect(c, '#04060c', 10, 28, 9, 1)
  rect(c, '#c8c4b8', 15, 21, 3, 8)
  rect(c, '#a83a32', 15, 24, 3, 1)
  rect(c, '#a83a32', 15, 27, 3, 1)
  rect(c, '#2a2a30', 14, 20, 5, 1)
  const facing = sweep < 0.05 || sweep > 0.97
  rect(c, facing ? '#ffffff' : '#e8c870', 16, 19, 1, 1)
  if (facing) {
    glow(c, '#fff8d8', 16, 19, 8, 0.12, 4)
    rect(c, '#fff8d8', 12, 19, 9, 1)
    rect(c, '#fff8d8', 16, 16, 1, 7)
  }
  for (let i = 0; i < 7; i++) {
    const hx = 24 + i * 2.3
    rect(c, i % 3 ? '#e8b860' : '#c8d8f0', hx, 33, 1, 1)
    if ((Math.floor(t / 300) + i) % 3) rect(c, '#8a6a3a', hx, 35 + (i % 2), 1, 1)
  }
  c.globalAlpha = 0.16 + 0.05 * (Math.floor(t / 700) % 2)
  rect(c, '#e03a48', 10, 42, 30, 4)
  rect(c, '#e03a48', 10, 40, 30, 2)
  rect(c, '#e03a48', 10, 39, 30, 1)
  c.globalAlpha = 1
  rect(c, '#3a3026', 24, 14, 2, 32)
  rect(c, '#3a3026', 10, 30, 30, 2)
  rect(c, '#4c4032', 6, 47, 38, 3)
  rect(c, '#5c4e3c', 6, 47, 38, 1)
  // A thin curtain on one side, and its rod.
  rect(c, '#5a4a36', 4, 10, 42, 1)
  c.globalAlpha = 0.45
  rect(c, '#b8b0a0', 33, 11, 11, 37)
  c.globalAlpha = 0.25
  for (let y = 12; y < 47; y += 3) rect(c, '#e8e0d0', 35 + (y % 2), y, 1, 1)
  rect(c, '#6a6458', 37, 11, 1, 37)
  rect(c, '#6a6458', 41, 11, 1, 37)
  c.globalAlpha = 1
  // The radiator under the window.
  rect(c, '#4a4c54', 11, 52, 28, 1)
  for (let x = 12; x < 38; x += 3) {
    rect(c, '#34363e', x, 53, 2, 9)
    rect(c, '#44464e', x, 53, 1, 9)
  }
  rect(c, '#24262c', 11, 61, 28, 2)

  // A chair, with yesterday's paper on the seat.
  rect(c, '#3a2818', 44, 40, 2, 24)
  rect(c, '#3a2818', 44, 52, 11, 2)
  rect(c, '#3a2818', 53, 54, 2, 10)
  rect(c, '#4a3420', 44, 40, 2, 1)
  rect(c, '#3a2818', 45, 44, 1, 8)
  rect(c, '#d8d2c0', 46, 50, 8, 2)
  rect(c, '#9a9488', 47, 50, 5, 1)
  // The mirror over the washstand, the silvering gone at its corners.
  rect(c, '#4e3c26', 61, 17, 20, 23)
  rect(c, '#6a5232', 61, 17, 20, 1)
  bands(c, 62, 18, 18, 21, ['#33404f', '#425062', '#4c5a6c', '#3c4858'])
  rect(c, '#262e3a', 62, 18, 3, 2)
  rect(c, '#262e3a', 62, 20, 1, 2)
  rect(c, '#262e3a', 77, 35, 3, 4)
  rect(c, '#2e3644', 76, 37, 1, 2)
  line(c, '#7a8a9e', 65, 31, 71, 23)
  line(c, '#62728a', 67, 33, 73, 25)
  // The washstand: a marble top, an enamel basin and jug, soap, a towel on its rail.
  rect(c, '#2e2216', 57, 53, 28, 10)
  rect(c, '#24190f', 70, 54, 1, 8)
  rect(c, '#4a3a24', 66, 57, 2, 1)
  rect(c, '#4a3a24', 73, 57, 2, 1)
  rect(c, '#24190f', 58, 63, 2, 2)
  rect(c, '#24190f', 82, 63, 2, 2)
  rect(c, '#cfc8bc', 56, 50, 30, 3)
  rect(c, '#e8e2d6', 56, 50, 30, 1)
  rect(c, '#e8e4dc', 62, 46, 15, 4)
  rect(c, '#3a5a8a', 62, 46, 15, 1)
  rect(c, '#c8c4bc', 63, 49, 13, 1)
  rect(c, '#e8e4dc', 79, 41, 5, 9)
  rect(c, '#3a5a8a', 79, 43, 5, 1)
  rect(c, '#e8e4dc', 84, 42, 1, 2)
  rect(c, '#e8e4dc', 78, 40, 3, 1)
  rect(c, '#d8c8a0', 58, 48, 3, 2)
  rect(c, '#5a4630', 86, 45, 1, 12)
  rect(c, '#c8c0a8', 86, 46, 3, 10)
  rect(c, '#a8a088', 88, 46, 1, 10)
  rect(c, '#8a2a2a', 86, 53, 3, 1)

  // The iron bed: a footboard and a taller head, bars and brass knobs, a thin mattress, a grey blanket.
  const iron = '#0b0b10'
  const ironLit = '#3a3a48'
  rect(c, iron, 101, 44, 2, 22)
  rect(c, iron, 108, 44, 2, 22)
  rect(c, iron, 101, 44, 9, 1)
  rect(c, iron, 104, 45, 1, 12)
  rect(c, iron, 106, 45, 1, 12)
  rect(c, iron, 145, 32, 2, 34)
  rect(c, iron, 155, 32, 2, 34)
  rect(c, iron, 145, 33, 12, 1)
  rect(c, iron, 145, 45, 12, 1)
  for (const bx of [148, 150, 152]) rect(c, iron, bx, 34, 1, 18)
  disc(c, iron, 151, 38, 2)
  rect(c, ironLit, 145, 33, 1, 30)
  rect(c, ironLit, 101, 44, 1, 20)
  disc(c, '#a8883a', 102, 43, 1)
  disc(c, '#a8883a', 109, 43, 1)
  disc(c, '#a8883a', 146, 31, 1)
  disc(c, '#a8883a', 156, 31, 1)
  rect(c, '#e8d890', 145, 30, 1, 1)
  rect(c, '#dcd6c4', 110, 54, 35, 4)
  rect(c, '#e8e4d8', 134, 50, 11, 5)
  rect(c, '#c8c2b0', 134, 54, 11, 1)
  rect(c, '#55586a', 110, 54, 25, 7)
  rect(c, '#626678', 110, 54, 25, 1)
  rect(c, '#7a2a2a', 110, 57, 25, 1)
  rect(c, '#4a4c5c', 110, 60, 25, 2)
  for (const fx of [116, 123, 129]) rect(c, '#4a4c5e', fx, 55, 1, 5)
  rect(c, iron, 110, 61, 35, 1)
  // The case under the bed, packed for the next town.
  rect(c, '#4a3020', 114, 62, 22, 6)
  rect(c, '#5a3c28', 114, 62, 22, 1)
  rect(c, '#2a1a10', 119, 62, 1, 6)
  rect(c, '#2a1a10', 130, 62, 1, 6)
  rect(c, '#c9a24a', 124, 64, 2, 1)
  rect(c, iron, 101, 63, 2, 3)
  rect(c, iron, 155, 63, 2, 3)

  // The bulb on its cord, swaying in the draught, and its light.
  const sway = Math.sin(t / 1300) * 2
  line(c, '#08080c', 92, 0, 92 + sway, 14)
  glow(c, '#f2d08a', 92 + sway, 16, 40, 0.022, 8)
  rect(c, '#3a3a3a', 91 + sway, 14, 3, 1)
  rect(c, '#fff0c0', 91 + sway, 15, 3, 3)
  rect(c, '#ffffff', 92 + sway, 16, 1, 1)

  // You, at the washstand, looking into the mirror.
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 63, y: 42 })

  // The lighthouse beam: in at the window and across the room, a slanted band over everything.
  if (sweep < 0.34) {
    const bx = -12 + (sweep / 0.34) * 190
    for (let y = 0; y < REEL_H; y++) {
      const x = bx + (y - 45) * 0.35
      c.globalAlpha = 0.06
      rect(c, '#e8f0ff', x - 10, y, 20, 1)
      c.globalAlpha = 0.07
      rect(c, '#f4f8ff', x - 4, y, 8, 1)
    }
    c.globalAlpha = 1
  }
}

/**
 * Palm Cay, the beach under the casino at night: moonlit sand, the surf running up it and back,
 * the card room's glass lit behind, and one man still at one table. You, on the sand.
 */
function drawBeach(c: Ctx, t: number) {
  bands(c, 0, 0, REEL_W, 38, ['#05071a', '#080b22', '#0b102b', '#101634', '#161e40', '#1e284c'])
  starfield(c, t, 36, 0, 2, 160, 30, 70)
  moon(c, 124, 12, 6, '#c8d4f8')
  // The sea, a yacht far out with its mast light, and the moon's path broken on it.
  bands(c, 0, 37, REEL_W, 24, ['#0c1630', '#0e1a37', '#111e3f', '#142446', '#17294e'])
  rect(c, '#26365e', 0, 37, REEL_W, 1)
  rect(c, '#080c18', 86, 35, 8, 2)
  rect(c, '#080c18', 89, 29, 1, 6)
  rect(c, '#080c18', 90, 31, 3, 4)
  rect(c, Math.floor(t / 800) % 2 ? '#e04040' : '#601818', 89, 28, 1, 1)
  rect(c, '#e8d890', 87, 35, 1, 1)
  rect(c, '#e8d890', 92, 35, 1, 1)
  for (let i = 0; i < 6; i++) {
    const y = 39 + ((t / 320 + i * 3.8) % 22)
    c.globalAlpha = 0.5
    rect(c, '#0a1228', 0, Math.floor(y), REEL_W, 1)
    c.globalAlpha = 1
  }
  for (let y = 38; y < 61; y++) {
    const spread = 2 + (y - 38) * 0.9
    for (let k = 0; k < 3; k++) {
      const h = hash(y * 7 + k * 31 + Math.floor(t / 220))
      if (h < 0.5) continue
      const x = 124 + (hash(y * 3 + k) - 0.5) * spread * 2 + Math.sin(t / 400 + y)
      rect(c, h > 0.86 ? '#e8ecf8' : '#7a8ac0', x, y, 1 + Math.floor(h * 3), 1)
    }
  }
  // The sand, cool under the moon, and the wet strip the last wave left; the surf running up it.
  bands(c, 0, 61, REEL_W, 29, ['#3e3c50', '#4a4658', '#565062', '#615a68', '#6c636e'])
  for (let i = 0; i < 160; i++) rect(c, hash(i) < 0.5 ? '#4a4456' : '#7a7078', hash(i + 1) * 160, 63 + hash(i + 2) * 27, 1, 1)
  const reach = Math.sin(t / 1500) * 2.5
  rect(c, '#2e3248', 0, 61, REEL_W, 3 + Math.max(0, Math.round(reach)))
  for (let x = 0; x < REEL_W; x++) {
    const y = 61 + reach + Math.sin(x / 7 + t / 600) * 1.2
    rect(c, '#dce6f2', x, y, 1, 1)
    if (hash(x + Math.floor(t / 300)) > 0.6) rect(c, '#9aaccc', x, y + 1, 1, 1)
    if (hash(x * 3 + Math.floor(t / 260)) > 0.55) rect(c, '#b8c8e0', x, 58 + Math.sin(x / 9 + t / 520) * 1.5, 1, 1)
  }
  for (let i = 0; i < 14; i++) if (hash(i + Math.floor(t / 400)) > 0.6) rect(c, '#c8d4ec', 100 + hash(i) * 50, 62 + hash(i + 9) * 3, 1, 1)

  // The casino behind you, all glass: the rooms upstairs, and the card room lit below.
  rect(c, '#0e101c', 0, 3, 64, 54)
  rect(c, '#1a1e2e', 0, 3, 64, 1)
  for (let k = 0; k < 6; k++) {
    const lit = hash(k + 17) > 0.6
    rect(c, lit ? '#d8a860' : '#161a2a', 3 + k * 10, 6, 7, 7)
    if (lit) rect(c, '#b88848', 3 + k * 10, 11, 7, 2)
  }
  rect(c, '#1c2030', 0, 15, 64, 2)
  bands(c, 1, 17, 62, 37, ['#221408', '#32200e', '#462e14', '#5a3c1a', '#6e4a20'])
  // Inside: the tables closed, chairs up on them, and one lamp still on.
  for (const tx of [6, 50]) {
    rect(c, '#2a1a0c', tx, 44, 12, 3)
    rect(c, '#24160a', tx + 2, 47, 1, 6)
    rect(c, '#24160a', tx + 9, 47, 1, 6)
    rect(c, '#2a1a0c', tx + 1, 39, 1, 5)
    rect(c, '#2a1a0c', tx + 1, 39, 4, 1)
    rect(c, '#2a1a0c', tx + 8, 40, 1, 4)
    rect(c, '#2a1a0c', tx + 6, 40, 4, 1)
  }
  line(c, '#1a1008', 34, 17, 34, 25)
  rect(c, '#1e140a', 30, 25, 9, 2)
  c.globalAlpha = 0.07
  for (let y = 27; y < 46; y++) rect(c, '#ffe0a0', 34 - (y - 27) * 0.6, y, 1 + (y - 27) * 1.2, 1)
  c.globalAlpha = 1
  glow(c, '#ffd890', 34, 38, 15, 0.05, 6)
  drawPerson(c, figureForCharacter('bernard', CHARACTERS.bernard), 'down', 0, { x: 26, y: 23 })
  c.globalAlpha = 0.18
  rect(c, '#f2a040', 26, 23, 16, 20)
  c.globalAlpha = 1
  rect(c, '#1f6a44', 22, 43, 24, 4)
  rect(c, '#2a7e52', 22, 43, 24, 1)
  rect(c, '#164e30', 22, 46, 24, 2)
  rect(c, '#3a2414', 21, 48, 26, 1)
  rect(c, '#f0ecdc', 31, 44, 2, 1)
  rect(c, '#f0ecdc', 34, 44, 2, 1)
  rect(c, '#c83a32', 39, 44, 2, 1)
  rect(c, '#f2c14e', 27, 44, 2, 1)
  rect(c, '#2a1a0c', 24, 49, 1, 5)
  rect(c, '#2a1a0c', 43, 49, 1, 5)
  // The glass: mullions, the moon caught in a pane, a streak of reflection.
  for (let x = 1; x < 64; x += 12) rect(c, '#0a0c16', x, 17, 1, 37)
  c.globalAlpha = 0.09
  line(c, '#c8d4f8', 52, 20, 60, 30)
  line(c, '#c8d4f8', 50, 22, 58, 32)
  line(c, '#c8d4f8', 4, 34, 10, 44)
  c.globalAlpha = 1
  // The terrace in front of it, its rail, and steps down to the sand.
  rect(c, '#221c26', 0, 54, 66, 3)
  rect(c, '#3a3040', 0, 54, 66, 1)
  for (let x = 2; x < 66; x += 6) rect(c, '#2e2834', x, 50, 1, 4)
  rect(c, '#3a3242', 0, 50, 66, 1)
  rect(c, '#2a2430', 0, 57, 62, 4)
  for (let s = 0; s < 3; s++) rect(c, s % 2 ? '#2a2430' : '#342c3a', 62 + s * 3, 57 + s * 2, 4, 2)
  c.globalAlpha = 0.07
  for (let y = 57; y < 84; y++) rect(c, '#f2b860', 0, y, 70 - (y - 57) * 1.6, 1)
  c.globalAlpha = 1

  // A palm in the foreground, its fronds lifting in the breeze.
  for (let i = 0; i < 34; i++) {
    const f = i / 34
    const x = 152 - Math.pow(f, 1.5) * 11
    rect(c, i % 3 ? '#120e0c' : '#1e1812', x - 1, 90 - i * 2, 3, 2)
    if (i % 3 === 0) rect(c, '#2a2218', x - 1, 90 - i * 2, 1, 1)
  }
  const crownX = 141
  const crownY = 22
  for (let k = 0; k < 7; k++) {
    const a = -Math.PI * 0.95 + (k / 6) * Math.PI * 1.15
    const len = 18 + (k % 3) * 3
    const lift = Math.sin(t / 1100 + k) * 1.5
    for (let s = 0; s < len; s++) {
      const px = crownX + Math.cos(a) * s
      const py = crownY + Math.sin(a) * s + (s * s) / 30 - (lift * s) / len
      rect(c, '#0a140e', px, py, 1, 1)
      if (s > 3 && s % 2 === 0) {
        rect(c, '#0c1a12', px, py + 1, 1, 2)
        rect(c, '#0c1a12', px + 1, py + 1, 1, 2)
      }
    }
  }
  disc(c, '#100c08', crownX, crownY + 1, 2)
  rect(c, '#1c140c', crownX - 2, crownY + 2, 2, 2)

  // Your footprints from the steps, you on the sand looking out, a moon shadow, a drink somebody left.
  for (let k = 0; k < 9; k++) rect(c, '#3e3a4c', 68 + k * 3.2, 64 + k * 1.3 + (k % 2), 2, 1)
  c.globalAlpha = 0.35
  rect(c, '#22202e', 86, 77, 12, 2)
  rect(c, '#22202e', 82, 78, 6, 1)
  c.globalAlpha = 1
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 92, y: 54 })
  rect(c, '#b8c8d8', 74, 81, 3, 4)
  rect(c, '#e8a040', 75, 82, 1, 2)
  rect(c, '#e86a9a', 72, 78, 6, 1)
  rect(c, '#c84a7a', 73, 79, 4, 1)
  rect(c, '#8a6a4a', 75, 79, 1, 3)
}

/** A neon sign's letters stacked down a board, in one colour, lit or out. */
function stackedSign(c: Ctx, text: string, x: number, y: number, color: string, out?: number, step = 9) {
  ;[...text].forEach((ch, i) => {
    drawLabel(c, ch, x + Math.round((7 - measureText(ch)) / 2), y + i * step, i === out ? '#3a2030' : color)
  })
}

/** A row of bulbs round the edge of a box, chasing each other: one in three lit, stepping on. */
function chaseBulbs(c: Ctx, t: number, x: number, y: number, w: number, h: number, on: string, off: string, step = 110) {
  const spots: Array<[number, number]> = []
  for (let px = x; px < x + w; px += 2) spots.push([px, y])
  for (let py = y + 2; py < y + h; py += 2) spots.push([x + w - 1, py])
  for (let px = x + w - 1; px > x; px -= 2) spots.push([px, y + h - 1])
  for (let py = y + h - 1; py > y; py -= 2) spots.push([x, py])
  const phase = Math.floor(t / step)
  spots.forEach(([px, py], i) => rect(c, (i + phase) % 3 === 0 ? on : off, px, py, 1, 1))
}

/**
 * Neon Mesa, the Strip from a motel walkway: towers of lit windows, signs flickering and buzzing
 * out of step with one another, searchlights, and the motel's own pink sign. You, at the rail.
 */
function drawNeon(c: Ctx, t: number) {
  bands(c, 0, 0, REEL_W, 58, ['#07041a', '#0b0520', '#110828', '#190a30', '#230d38', '#30123e', '#421843', '#582244'])
  starfield(c, t, 10, 0, 0, 160, 16, 120)
  // Two searchlights swinging, out of time with each other.
  for (const [sx, k] of [[46, 0], [116, 1.7]] as const) {
    const a = Math.PI / 2 + Math.sin(t / 2400 + k) * 0.55
    c.globalAlpha = 0.05
    for (let d = 0; d < 72; d++) {
      const w = 1 + d / 10
      rect(c, '#d8d0ff', sx + Math.cos(a) * d - w / 2, 50 - Math.sin(a) * d, w, 1)
    }
    c.globalAlpha = 1
  }
  // The mesa on the horizon, flat-topped, and the glow of the town on the underside of the sky.
  for (let x = 0; x < REEL_W; x++) {
    const h = x > 18 && x < 64 ? 10 - (x < 22 ? 22 - x : 0) * 2 - (x > 60 ? x - 60 : 0) * 2 : 3 + Math.round(hash(x) * 2)
    rect(c, '#1a0c26', x, 52 - Math.max(2, h), 1, Math.max(2, h) + 4)
  }
  glow(c, '#ff7a6a', 80, 60, 70, 0.02, 6)
  // The towers, with windows lit warm and cold.
  const towers: Array<[number, number, number]> = [[0, 14, 28], [15, 17, 48], [34, 13, 26], [49, 18, 40], [69, 14, 32], [85, 22, 52], [109, 15, 36], [126, 16, 30]]
  const tick = Math.floor(t / 1500)
  towers.forEach(([x, w, h], n) => {
    rect(c, '#120a1e', x, 64 - h, w, h)
    rect(c, '#1c1028', x, 64 - h, 1, h)
    for (let y = 66 - h; y < 62; y += 3) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        const v = hash(wx * 31 + y * 7 + n + ((wx + tick) % 5 === 0 ? tick : 0))
        if (v > 0.5) rect(c, v > 0.85 ? '#9ac0f0' : v > 0.7 ? '#e8b860' : '#8a6a3a', wx, y, 1, 1)
      }
    }
  })
  // LUCKY, down the side of a tower, the board ringed in chasing bulbs.
  rect(c, '#1a0810', 18, 4, 11, 44)
  chaseBulbs(c, t, 18, 4, 11, 44, '#fff0a0', '#5a4420')
  stackedSign(c, 'LUCKY', 20, 6, Math.floor(t / 2600) % 7 === 0 ? '#7a5a20' : '#f2c14e', undefined, 8)
  glow(c, '#f2c14e', 23, 26, 16, 0.025, 4)
  // A neon cactus over a tower: its arm waves, two frames, the way those signs do.
  const wave = Math.floor(t / 650) % 2
  const cactus = Math.floor(t / 4100) % 9 === 0 ? '#1a4a24' : '#5af078'
  line(c, cactus, 58, 22, 58, 34)
  line(c, cactus, 60, 22, 60, 34)
  line(c, cactus, 58, 21, 60, 21)
  line(c, cactus, 58, 28, 54, 28)
  line(c, cactus, 54, 28, 54, 24)
  if (wave) {
    line(c, cactus, 60, 26, 64, 26)
    line(c, cactus, 64, 26, 64, 21)
  } else {
    line(c, cactus, 60, 27, 64, 27)
    line(c, cactus, 64, 27, 66, 24)
  }
  glow(c, '#5af078', 59, 28, 10, 0.03, 4)
  // A crown on the tallest tower, pink, its points blinking in turn.
  for (let k = 0; k < 4; k++) {
    const px = 88 + k * 5
    const lit = (Math.floor(t / 300) + k) % 4 !== 0
    rect(c, lit ? '#ff6ab8' : '#5a2040', px, 7 - (k % 2) * 2, 2, 4 + (k % 2) * 2)
  }
  rect(c, '#ff6ab8', 87, 11, 20, 1)
  glow(c, '#ff6ab8', 96, 10, 14, 0.03, 4)
  // A marquee that says SLOTS, chasing.
  rect(c, '#14060e', 111, 22, 26, 11)
  chaseBulbs(c, t + 400, 111, 22, 26, 11, '#ffe8a0', '#4a3418', 90)
  drawLabel(c, 'SLOTS', 114, 24, Math.floor(t / 900) % 2 ? '#ff5a4a' : '#ff8a5a')

  // The street below the walkway: parked roofs catching the signs, headlights going by.
  bands(c, 0, 60, REEL_W, 20, ['#1a0e22', '#160c1e', '#120a1a'])
  rect(c, '#2a1430', 0, 60, REEL_W, 1)
  for (let k = 0; k < 14; k++) {
    const cx = (hash(k + 3) * 200 + (k % 2 ? 1 : -1) * (t / (24 + k))) % 200
    const x = ((cx + 200) % 200) - 20
    rect(c, k % 2 ? '#fff0c0' : '#ff3a2a', x, 66 + (k % 2) * 2, 2, 1)
  }
  for (let k = 0; k < 6; k++) {
    rect(c, ['#3a2a4a', '#2a3a4a', '#4a2a2a'][k % 3], 36 + k * 21, 73, 12, 4)
    rect(c, '#ff8ac8', 38 + k * 21, 73, 8, 1)
  }
  // The motel: its wall and a door on the left, the walkway, the rail.
  rect(c, '#24182a', 0, 46, 30, 44)
  rect(c, '#2e2034', 0, 46, 30, 2)
  rect(c, '#3e2436', 5, 48, 15, 32)
  rect(c, '#4c2c40', 6, 49, 13, 30)
  rect(c, '#3e2436', 7, 51, 11, 12)
  rect(c, '#3e2436', 7, 65, 11, 12)
  drawLabel(c, '14', 9, 52, '#c8a860')
  rect(c, '#c9a24a', 17, 64, 1, 2)
  // The lamp by the door, and the moths that have found it.
  rect(c, '#e8e0a8', 23, 50, 3, 3)
  glow(c, '#f4e8a0', 24, 51, 9, 0.05, 4)
  for (let k = 0; k < 3; k++) {
    const a = t / (210 + k * 70) + k * 2
    rect(c, '#c8c0a0', 24 + Math.cos(a) * (3 + k), 51 + Math.sin(a * 1.3) * 3, 1, 1)
  }
  rect(c, '#2a2030', 0, 80, REEL_W, 10)
  rect(c, '#3a3042', 0, 80, REEL_W, 1)
  for (let x = 4; x < REEL_W; x += 20) rect(c, '#241a2a', x, 82, 1, 8)
  rect(c, '#8a8494', 30, 64, 130, 1)
  rect(c, '#4a4454', 30, 65, 130, 1)
  for (let x = 32; x < REEL_W; x += 3) rect(c, '#342e3e', x, 66, 1, 13)
  for (let x = 30; x < REEL_W; x += 26) rect(c, '#5a5464', x, 64, 2, 16)
  rect(c, '#342e3e', 30, 78, 130, 2)
  // The motel's own sign on the right, MOTEL down it in pink, its T buzzing; NO VACANCY, the NO going.
  const buzz = hash(Math.floor(t / 70)) > 0.72 || Math.floor(t / 1900) % 5 === 0
  rect(c, '#2a2a34', 151, 52, 2, 28)
  rect(c, '#160812', 145, 4, 14, 48)
  rect(c, '#3a1a2a', 145, 4, 14, 1)
  stackedSign(c, 'MOTEL', 148, 6, '#ff5aa8', buzz ? 2 : undefined)
  glow(c, '#ff5aa8', 152, 26, 26, 0.03, 6)
  rect(c, '#2a2a34', 112, 44, 1, 4)
  rect(c, '#2a2a34', 140, 44, 1, 4)
  rect(c, '#14060e', 100, 47, 45, 17)
  rect(c, '#3a1a2a', 100, 47, 45, 1)
  const no = Math.floor(t / 1100) % 3 !== 0
  drawLabel(c, 'NO', 117, 48, no ? '#ff4a4a' : '#4a1a1a')
  drawLabel(c, 'VACANCY', 102, 56, '#ff7a5a')
  // The walkway in pink from the sign, and you at the rail looking at all of it.
  c.globalAlpha = buzz ? 0.03 : 0.06
  rect(c, '#ff5aa8', 96, 64, 64, 26)
  c.globalAlpha = 1
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 80, y: 57 })
  c.globalAlpha = buzz ? 0.04 : 0.09
  rect(c, '#ff5aa8', 92, 57, 4, 23)
  c.globalAlpha = 1
}

/** Zeke's chat, as it scrolls up the phone: a name in a colour and a word or two. */
const STREAM_CHAT: Array<[string, string]> = [
  ['#f2c14e', 'DONK'],
  ['#58c878', 'has it'],
  ['#e0605d', 'FOLD'],
  ['#8ab8f0', 'cards?'],
  ['#ff8ac8', 'eat zk'],
  ['#c878e8', 'SHIP'],
  ['#58c878', 'fake'],
  ['#f29a4e', 'LOL'],
  ['#8ab8f0', 'ALL IN'],
  ['#e0605d', 'rigged'],
  ['#ff8ac8', 'hi zk'],
  ['#f2c14e', 'GG'],
]

/**
 * Neon Mesa, Zeke's stream on a phone in your hand, in a motel bed: a card table the size of a
 * stamp, a viewer count, a LIVE badge, and chat scrolling. The Strip comes in pink through the blinds.
 */
function drawStream(c: Ctx, t: number) {
  // The bedspread in the dark, a motel diamond in it, and the blinds' stripes of pink across it.
  rect(c, '#180e1e', 0, 0, REEL_W, REEL_H)
  for (let y = 0; y < REEL_H; y += 6) for (let x = 0; x < REEL_W; x += 6) rect(c, '#211428', x + ((y / 6) % 2) * 3, y, 2, 2)
  for (let y = 2; y < REEL_H; y += 7) {
    c.globalAlpha = 0.08
    rect(c, '#ff5aa0', 0, y, 46 - y * 0.25, 3)
    rect(c, '#ff5aa0', 120 + y * 0.2, y + 2, 40, 2)
  }
  c.globalAlpha = 1
  // The pillow, the paperback you put down face first to watch this, and the room key.
  rect(c, '#2a2232', 0, 0, 42, 20)
  rect(c, '#342a3c', 0, 0, 40, 18)
  rect(c, '#3c3246', 2, 2, 34, 1)
  rect(c, '#221a28', 0, 18, 42, 2)
  c.globalAlpha = 0.5
  rect(c, '#0a060c', 9, 70, 32, 3)
  c.globalAlpha = 1
  for (let i = 0; i < 10; i++) {
    rect(c, '#1e3456', 9 + Math.floor(i / 3), 61 + i, 15 - Math.floor(i / 3), 1)
    rect(c, '#24406c', 24, 61 + i, 15 - Math.floor(i / 3), 1)
  }
  rect(c, '#2e4e80', 24, 61, 15, 1)
  rect(c, '#14223a', 23, 59, 2, 12)
  rect(c, '#5a7ab0', 24, 59, 1, 12)
  rect(c, '#e8e0c8', 9, 70, 6, 1)
  rect(c, '#e8e0c8', 33, 70, 6, 1)
  rect(c, '#c8c0a8', 10, 71, 4, 1)
  rect(c, '#c8c0a8', 34, 71, 4, 1)
  drawLabel(c, 'PLATO', 11, 62, '#d8c890')
  ;[1, 3, 5, 7, 5, 3, 1].forEach((w, i) => rect(c, '#1e6a46', 130 - (w - 1) / 2, 62 + i, w, 1))
  rect(c, '#2a8a5a', 129, 63, 1, 1)
  rect(c, '#8a8a96', 130, 69, 1, 2)
  rect(c, '#b8963e', 129, 71, 3, 2)
  rect(c, '#b8963e', 130, 73, 1, 8)
  rect(c, '#b8963e', 131, 77, 2, 1)
  rect(c, '#b8963e', 131, 79, 2, 1)
  glow(c, '#9ab8ff', 80, 46, 50, 0.025, 8)
  const skin = HERO_FIGURE.look.skin
  const shade = '#b4845e'
  const lit = '#f6d6b8'
  // Your palm under the phone, and the sleeve.
  rect(c, HERO_FIGURE.look.shirt, 50, 86, 60, 4)
  rect(c, '#3e6450', 50, 86, 60, 1)
  rect(c, shade, 52, 76, 56, 11)
  rect(c, skin, 54, 75, 52, 10)
  rect(c, lit, 54, 75, 52, 1)
  // The phone.
  rect(c, '#06060a', 55, 2, 50, 82)
  rect(c, '#2a2a34', 56, 2, 48, 1)
  rect(c, '#2a2a34', 55, 3, 1, 80)
  rect(c, '#101016', 57, 4, 46, 78)
  // The screen: the stream, its status bar, the table, the badge and the count.
  rect(c, '#0c0c14', 58, 6, 44, 75)
  rect(c, '#8a8a9a', 60, 7, 6, 1)
  rect(c, '#8a8a9a', 96, 7, 4, 1)
  rect(c, '#58c878', 96, 7, 2, 1)
  bands(c, 58, 10, 44, 28, ['#120e16', '#1a141e', '#221a24', '#2a2028'])
  glow(c, '#f2d890', 80, 20, 12, 0.06, 4)
  rect(c, '#3a2a1c', 79, 10, 1, 6)
  rect(c, '#2a1e14', 77, 16, 5, 1)
  rect(c, '#5a3a22', 64, 31, 32, 2)
  rect(c, '#1f6a44', 66, 25, 28, 6)
  rect(c, '#1f6a44', 64, 26, 32, 4)
  rect(c, '#2a8a5a', 66, 25, 28, 1)
  const tiny: Array<[number, number, string]> = [[67, 21, '#c83a32'], [73, 20, '#3a6ac8'], [79, 20, '#2a2a30'], [85, 20, '#e8c060'], [91, 21, '#6a3a8a'], [62, 25, '#3aa05a'], [97, 25, '#c86a3a']]
  tiny.forEach(([px, py, shirt], k) => {
    const lean = (Math.floor(t / (900 + k * 130)) + k) % 4 === 0 ? 1 : 0
    rect(c, shirt, px, py + 2 + lean, 3, 3)
    rect(c, k % 2 ? '#c8905f' : '#e0b890', px + 1, py + lean, 2, 2)
  })
  rect(c, '#f0ecdc', 76, 27, 1, 2)
  rect(c, '#f0ecdc', 78, 27, 1, 2)
  rect(c, '#f0ecdc', 80, 27, 1, 2)
  rect(c, '#f0ecdc', 82, 27, 1, 2)
  rect(c, '#f2c14e', 85, 28, 2, 1)
  rect(c, '#c83a32', 72, 28, 2, 1)
  for (let k = 0; k < 5; k++) {
    const q = hash(k + Math.floor(t / 240) * 5)
    if (q > 0.55) {
      c.globalAlpha = 0.25
      rect(c, q > 0.8 ? '#3a4a3a' : '#2a2030', 60 + Math.floor(hash(k * 9 + Math.floor(t / 240)) * 38), 12 + Math.floor(q * 20), 3, 3)
      c.globalAlpha = 1
    }
  }
  rect(c, Math.floor(t / 600) % 2 ? '#e0302d' : '#b02420', 59, 11, 19, 8)
  drawLabel(c, 'LIVE', 61, 11, '#fff4f0')
  const viewers = 11200 + Math.floor(hash(Math.floor(t / 1500)) * 90)
  rect(c, '#e8e8f0', 80, 14, 3, 1)
  rect(c, '#1a1a24', 81, 14, 1, 1)
  drawLabel(c, `${Math.floor(viewers / 1000)}.${Math.floor((viewers % 1000) / 100)}K`, 85, 11, '#f2f2f6')
  // The streamer's line under the video.
  rect(c, '#16161f', 58, 38, 44, 9)
  disc(c, '#c878e8', 62, 42, 2)
  rect(c, '#e8c060', 61, 41, 1, 1)
  drawLabel(c, 'ZEKE', 66, 39, '#e8e8f0')
  rect(c, '#7a4ae0', 91, 40, 10, 5)
  rect(c, '#a87af0', 91, 40, 10, 1)
  // Chat, scrolling up from the bottom.
  c.save()
  c.beginPath()
  c.rect(58, 47, 44, 27)
  c.clip()
  const scroll = t / 45
  const base = Math.floor(scroll / 8)
  for (let i = base - 4; i <= base; i++) {
    const y = 66 + i * 8 - scroll
    const [color, text] = STREAM_CHAT[((i % STREAM_CHAT.length) + STREAM_CHAT.length) % STREAM_CHAT.length]
    const nameW = 4 + (((i % 3) + 3) % 3) * 2
    rect(c, color, 60, y + 3, nameW, 2)
    drawLabel(c, text, 62 + nameW, y, '#d8d8e4')
  }
  c.restore()
  rect(c, '#1c1c28', 59, 75, 42, 5)
  rect(c, '#4a4a5a', 61, 77, 16, 1)
  // A streak of glare on the glass.
  c.globalAlpha = 0.05
  for (let i = 0; i < 30; i++) rect(c, '#ffffff', 64 + i * 0.7, 8 + i * 2.4, 5, 2)
  c.globalAlpha = 1
  // Your fingers round the right edge, their tips on the glass, lit by the screen; the thumb up the left.
  for (let k = 0; k < 4; k++) {
    const fy = 30 + k * 11
    const reach = 11 - k
    rect(c, skin, 105, fy, reach, 10)
    rect(c, shade, 105, fy + 9, reach, 1)
    rect(c, shade, 104 + reach, fy + 1, 1, 8)
    rect(c, skin, 101, fy + 2, 4, 6)
    rect(c, lit, 101, fy + 2, 1, 6)
    rect(c, '#f4dcc8', 102, fy + 3, 2, 3)
    rect(c, shade, 101, fy + 7, 4, 1)
  }
  rect(c, shade, 105, 73, 8, 3)
  rect(c, shade, 48, 56, 2, 22)
  rect(c, skin, 50, 54, 7, 24)
  rect(c, skin, 55, 51, 4, 8)
  rect(c, lit, 56, 51, 2, 1)
  rect(c, '#f4dcc8', 56, 52, 2, 3)
  rect(c, shade, 50, 66, 6, 1)
  rect(c, lit, 56, 59, 1, 18)
}

/**
 * Porto Lumina, a glass lift up the outside of the tower at night: the city sinking away under you,
 * the tower's own floors sliding past, the number over the door counting up to forty-one and
 * stopping there. You, at the rail, looking down.
 */
function drawLift(c: Ctx, t: number) {
  const rise = Math.min(1, t / 5200)
  const up = 1 - (1 - rise) * (1 - rise)
  // Your eye, in floors: thirty when the doors shut, forty-one at the top.
  const eye = 30 + up * 11
  const horizon = 38
  bands(c, 0, 0, REEL_W, horizon + 1, ['#03041a', '#060920', '#0a0e28', '#0f1430', '#161a3a', '#24244a'])
  starfield(c, t, 28, 24, 10, 132, 22, 300)
  moon(c, 44, 17, 4, '#c8d0f0')
  c.globalAlpha = 0.22
  rect(c, '#5a4060', 0, horizon - 3, REEL_W, 2)
  rect(c, '#5a4060', 20, horizon - 5, 50, 1)
  c.globalAlpha = 1
  // The ground a long way down, a carpet of streets in perspective. Below the horizon, everything is
  // further down the higher you are, so the climb pushes the whole city down the glass.
  bands(c, 0, horizon, REEL_W, REEL_H - horizon, ['#0b0b1c', '#0d0d20', '#0f0e23', '#110f25'])
  const stretch = 1 + up * 0.4
  const ground = (yb: number) => horizon + (yb - horizon) * stretch
  // The bay on the right, dark, with a ferry crossing it.
  for (let y = horizon; y < REEL_H; y++) {
    const yb = horizon + (y - horizon) / stretch
    const edge = 118 - (yb - horizon) * 1.4
    rect(c, '#070a1c', edge, y, REEL_W - edge, 1)
  }
  const ferry = 130 + Math.sin(t / 5000) * 8
  rect(c, '#e8d890', ferry, ground(44), 3, 1)
  rect(c, '#c8d8f0', ferry + 1, ground(44) - 1, 1, 1)
  for (let i = 0; i < 90; i++) {
    const x = hash(i) * 160
    if (x > 118) continue
    rect(c, hash(i + 5) > 0.7 ? '#c8d8f0' : '#e8b060', x, horizon + 1 + Math.floor(hash(i + 1) * 3), 1, 1)
  }
  for (let row = 0; row < 14; row++) {
    const yb = horizon + 5 + row * row * 0.42
    const y = ground(yb)
    if (y >= REEL_H) break
    const gap = 3 + row * 0.9
    const edge = 118 - (yb - horizon) * 1.4
    for (let x = (row * 5) % gap; x < edge; x += gap) {
      const v = hash(row * 97 + Math.floor(x))
      if (v > 0.3) rect(c, v > 0.8 ? '#c8d8f0' : v > 0.55 ? '#e8b060' : '#a87a3a', x, y, 1, 1)
    }
  }
  // Avenues running out of the vanishing point, with cars on them.
  for (const [ax, k] of [[-70, 0], [20, 1], [70, 2], [120, 3]] as const) {
    for (let s = 0.02; s < 1; s += 0.045) {
      const yb = horizon + s * s * 82
      const x = 80 + (ax - 80) * s * s
      rect(c, '#f2c870', x, ground(yb), 1, 1)
    }
    const p = (t / 4000 + k * 0.27) % 1
    const yb = horizon + p * p * 82
    rect(c, k % 2 ? '#ff4a3a' : '#fff0c0', 80 + (ax - 80) * p * p, ground(yb), 2, 1)
  }
  // The towers round this one, nearest last. A tower taller than your eye has its top above the
  // horizon; as you pass it, its top drops below and keeps dropping.
  const towers: Array<[number, number, number, number]> = [
    [4, 12, 34, 1.6], [26, 10, 28, 1.3], [44, 13, 44, 1.5], [96, 12, 36, 1.4], [108, 10, 52, 1.1], [130, 14, 26, 2.2], [146, 14, 38, 2.6], [12, 16, 31, 3],
  ]
  const tick = Math.floor(t / 900)
  towers.forEach(([x, w, height, k], n) => {
    const top = Math.round(horizon + (eye - height) * k * 2)
    if (top >= REEL_H) return
    rect(c, '#0a0c1c', x, top, w, REEL_H - top)
    rect(c, '#161a34', x, top, 1, REEL_H - top)
    rect(c, '#1c2040', x, top, w, 1)
    for (let y = top + 3; y < REEL_H; y += 4) {
      for (let wx = x + 2; wx < x + w - 1; wx += 3) {
        const v = hash(wx * 13 + y * 5 + n + ((wx + y + tick) % 7 === 0 ? tick : 0))
        if (v > 0.45) rect(c, v > 0.8 ? '#a8c8f0' : '#e8b860', wx, y, 2, 2)
      }
    }
    if (height > 30) rect(c, Math.floor(t / 700 + n) % 2 ? '#ff3a3a' : '#5a1414', x + Math.floor(w / 2), top - 1, 1, 1)
  })
  // Wisps of cloud going down past the glass.
  c.globalAlpha = 0.07
  for (let k = 0; k < 3; k++) {
    const cy = 14 + k * 20 + up * 60
    if (cy < REEL_H) rect(c, '#c8d0e8', 28 + k * 44, cy, 36, 2)
  }
  c.globalAlpha = 1

  // The tower's own face on the left, its floors sliding down past you while the lift climbs.
  const slide = (up * 110) % 10
  rect(c, '#11121c', 0, 0, 19, REEL_H)
  for (let y = -10 + slide; y < REEL_H; y += 10) {
    rect(c, '#1e1f2c', 0, y, 19, 2)
    rect(c, '#2a2c3c', 0, y, 19, 1)
    const lit = hash(Math.round((y - slide) / 10) + Math.floor(up * 11)) > 0.5
    rect(c, lit ? '#c8a060' : '#1a1e30', 3, y + 4, 12, 4)
    if (lit) rect(c, '#e8c080', 3, y + 4, 12, 1)
  }
  rect(c, '#3a3a48', 19, 0, 2, REEL_H)
  for (let y = slide; y < REEL_H; y += 10) rect(c, '#5a5a6a', 19, y, 2, 1)

  // The cabin: glass with a faint sheen, brass, a ceiling of small lights, a carpet.
  c.globalAlpha = 0.05
  rect(c, '#8ab0d8', 21, 9, 139, 71)
  c.globalAlpha = 0.06
  line(c, '#e8f0ff', 104, 12, 124, 52)
  line(c, '#e8f0ff', 108, 12, 128, 52)
  line(c, '#e8f0ff', 30, 40, 40, 60)
  c.globalAlpha = 1
  const brass = (x: number, y: number, w: number, h: number) => {
    rect(c, '#6a5020', x, y, w, h)
    if (w > h) {
      rect(c, '#e8c060', x, y, w, 1)
      rect(c, '#b8903a', x, y + 1, w, Math.max(0, h - 2))
    } else {
      rect(c, '#e8c060', x, y, 1, h)
      rect(c, '#b8903a', x + 1, y, Math.max(0, w - 2), h)
    }
  }
  brass(21, 9, 2, 71)
  brass(90, 9, 2, 71)
  brass(157, 9, 3, 71)
  rect(c, '#140e14', 21, 0, 139, 9)
  rect(c, '#241a22', 21, 8, 139, 1)
  for (let x = 32; x < 160; x += 24) {
    rect(c, '#fff0c0', x, 7, 3, 1)
    glow(c, '#fff0c0', x + 1, 8, 4, 0.06, 2)
  }
  // The floor number over the doors, counting up while the lift climbs, and its arrow.
  const floor = Math.floor(eye + 0.5)
  rect(c, '#06040a', 76, 0, 28, 9)
  drawLabel(c, String(floor), 88, 1, '#f2a83a')
  if (rise < 1) [1, 3, 5].forEach((w, i) => rect(c, '#f2a83a', 82 - (w - 1) / 2, 3 + i, w, 1))
  brass(21, 62, 139, 2)
  for (let x = 40; x < 160; x += 30) rect(c, '#8a6a2a', x, 64, 1, 16)
  rect(c, '#2a0e18', 21, 80, 139, 10)
  for (let x = 24; x < 160; x += 8) rect(c, '#3a1422', x, 83 + ((x / 8) % 2) * 3, 3, 1)
  rect(c, '#c8a050', 21, 80, 139, 1)
  rect(c, '#6a5020', 21, 81, 139, 1)
  // You, at the rail with your back to the doors, looking down.
  drawPerson(c, HERO_FIGURE, 'up', 0, { x: 62, y: 57 })
}

const SCENES: Record<ReelScene, (c: Ctx, t: number, notes?: Notification[]) => void> = {
  // The title card is its own component (`LogoFlash`); this is only what is behind it.
  logo(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // Hal's tape is its own component (`TapePanel`); this is only what is behind it.
  tape(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // Marcus's map is its own component (`RoutePanel`); this is only what is behind it.
  route(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // The kitchen table and the mail is its own component (`MailTable`).
  mail(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // The floodlit final table, a crowd in the dark behind the rail.
  studio(c, t) {
    rect(c, '#0b0a14', 0, 0, REEL_W, REEL_H)
    for (let i = 0; i < 6; i++) rect(c, i % 2 ? '#1c1a30' : '#15132a', 8 + i * 26, 6, 4, 40)
    // Light cones, flickering as if the rig were on its last legs.
    const flick = Math.floor(t / 180) % 7 === 0
    for (let i = 0; i < 4; i++) rect(c, flick ? '#1a1830' : '#3a3558', 26 + i * 36, 0, 8, 6)
    rect(c, '#6a4a2a', 24, 52, 112, 5)
    rect(c, '#1f6a44', 28, 47, 104, 8)
    rect(c, '#18522f', 36, 50, 88, 3)
    const shirts = ['#7a2a2a', '#2a4a7a', '#4a3a6a', '#222222', '#6a6a2a']
    const skins = ['#c8905f', '#8a5a3a', '#e0b890', '#5e3a22', '#f2cfa8']
    skins.forEach((skin, i) => person(c, 34 + i * 24, 28, skin, shirts[i], '#2a2018'))
    for (let i = 0; i < 28; i++) rect(c, '#07060e', 4 + i * 5.6, 64 + (i % 3) * 3, 5, 26)
    rect(c, '#2a2a3a', 0, 86, REEL_W, 4)
  },
  // The back corridor: brick, a row of sconces, the restroom door at the end —
  // and you, in your own sprite, walking to it.
  corridor(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    for (let row = 0; row < 8; row++) {
      for (let x = row % 2 ? 0 : -8; x < REEL_W; x += 16) rect(c, '#3a2a30', x, row * 6, 15, 5)
    }
    rect(c, '#241c2c', 0, 50, REEL_W, 40)
    rect(c, '#2e2438', 0, 50, REEL_W, 2)
    // Emergency strip along the floor, pulsing.
    const pulse = Math.floor(t / 500) % 2
    rect(c, pulse ? '#c82828' : '#7a1818', 0, 86, REEL_W, 2)
    for (let i = 0; i < 4; i++) {
      rect(c, '#f2c14e', 20 + i * 34, 12, 4, 6)
      rect(c, '#3a2a18', 19 + i * 34, 10, 6, 2)
    }
    // The door, and the sign over it.
    rect(c, '#5a3a2a', 126, 22, 24, 38)
    rect(c, '#3a2418', 128, 24, 20, 34)
    rect(c, '#e8ecea', 128, 12, 20, 7)
    rect(c, '#2a2a30', 130, 14, 16, 3)
    // Walking: frames cycle every 150ms, and the walk ends at the door.
    const x = Math.min(112, -16 + t / 18)
    const walking = x < 112
    const frame = (walking ? Math.floor(t / 150) % 3 : 0) as WalkFrame
    drawPerson(c, HERO_FIGURE, 'right', frame, { x: Math.round(x), y: 36 })
  },
  // Cold tile, a row of sinks, one stall door, a fluorescent tube that hums —
  // you come in at the door and stop at the middle sink.
  bathroom(c, t) {
    drawBathroomSet(c, t, false)
  },
  // The same room a moment later: you are already at the sink, and Marcus comes in at the door and
  // walks over to you. (Cut to from the walk-in, so the walk is not played twice.)
  sink(c, t) {
    drawBathroomSet(c, t, true)
  },
  // The mirror, close: your own face in your own sprite, large, not having slept.
  mirror(c, t) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#8fa4a8', 36, 2, 88, 84)
    rect(c, '#b8c9cc', 40, 6, 80, 76)
    const blink = Math.floor(t / 2200) % 3 === 0 && t % 2200 < 160
    drawPerson(c, HERO_FIGURE, 'down', 0, { x: 56, y: 8, scale: 3, blink })
    // A tear that runs down on a loop.
    const drip = Math.floor(t / 130) % 14
    rect(c, '#8ec8f0', 72, 30 + drip, 1, 2)
    rect(c, '#6a8088', 30, 82, 100, 4)
  },
  // A phone on the sink, held close: the lock screen, notifications landing one by one.
  phone(c, t, notes = []) {
    rect(c, '#2a3438', 0, 0, REEL_W, REEL_H)
    rect(c, '#cfd6d4', 0, 76, REEL_W, 14)
    rect(c, '#0b0b10', 14, 0, 132, 90)
    rect(c, '#1c2a4a', 17, 3, 126, 87)
    drawLabel(c, '9:04 PM', 22, 6, '#f2f2f6')
    const buzz = Math.floor(t / 250) % 2
    let y = 15
    notes.forEach((note, i) => {
      const age = t - i * 700
      if (age < 0) return
      const lines = wrapText(note.text, 108).slice(0, 2)
      const h = 13 + lines.length * 8
      if (y + h > 89) return
      const accent = note.from === 'UNKNOWN' ? '#e0605d' : note.from === 'MARCUS' ? '#58c878' : '#f2c14e'
      rect(c, '#e8ecf4', 21, y, 118, h - 1)
      rect(c, accent, 21, y, 2, h - 1)
      drawLabel(c, note.from, 27, y + 2, '#2a2a34')
      lines.forEach((line, k) => drawLabel(c, line, 27, y + 10 + k * 8, '#14141c'))
      y += h
    })
    if (!notes.length) rect(c, buzz ? '#3a6ac8' : '#2f58a8', 25, 20, 110, 30)
  },

  // The morning before the game: a blue sky, a few clouds that bob about, a bird a long way up.
  sky(c, t) {
    skyBands(c, ['#2f7fd8', '#3a8ae0', '#4a96e6', '#5fa5ec', '#78b6f0', '#94c6f4', '#b0d6f8'])
    cloud(c, 14 + Math.sin(t / 1600) * 4, 16 + Math.sin(t / 700) * 2, 2)
    cloud(c, 86 + Math.sin(t / 1300 + 2) * 5, 30 + Math.sin(t / 650 + 1) * 2, 2)
    cloud(c, 120 + Math.cos(t / 1900) * 4, 10 + Math.sin(t / 800 + 3) * 2, 1)
    cloud(c, 40 + Math.cos(t / 1700) * 4, 54 + Math.sin(t / 900 + 5) * 2, 1)
    const bx = ((t / 60) % 200) - 20
    bird(c, bx, 40 + Math.sin(t / 500) * 4, Math.floor(t / 320) % 2 === 0, '#1c2a46', 1)
  },
  // The bus window: the town sliding past, and you, with your chin on your hand, not looking at any of it.
  busride(c, t) {
    rect(c, '#2a2e3a', 0, 0, REEL_W, REEL_H)
    rect(c, '#1c1f28', 0, 66, REEL_W, 24)
    // The window.
    rect(c, '#5a6070', 52, 6, 100, 60)
    c.save()
    c.beginPath()
    c.rect(55, 9, 94, 54)
    c.clip()
    skyBands(c, ['#4a96e6', '#6fb0ee', '#94c6f4', '#b8dcf8'], 63)
    cloud(c, 80 + Math.sin(t / 1800) * 6, 14, 1)
    const scroll = (t / 25) % 80
    for (let i = -1; i < 4; i++) {
      const bx = 55 + i * 40 - scroll
      const h = 18 + ((i + 5) * 13) % 22
      rect(c, i % 2 ? '#7a6a62' : '#6a5a72', bx, 63 - h, 30, h)
      for (let y = 63 - h + 4; y < 60; y += 7) for (let x = bx + 3; x < bx + 27; x += 8) rect(c, '#e8d890', x, y, 3, 3)
    }
    rect(c, '#3a3a44', 55, 56, 94, 7)
    // The poles that go by.
    const pole = 55 + ((200 - t / 8) % 120)
    rect(c, '#2a2a34', pole, 9, 3, 54)
    c.restore()
    rect(c, '#44485a', 52, 36, 100, 2)
    // The seat back and you, side on, looking out.
    rect(c, '#4a2f3a', 8, 54, 40, 36)
    rect(c, '#5c3a48', 8, 54, 40, 4)
    drawPerson(c, HERO_FIGURE, 'right', 0, { x: 22, y: 38 + Math.round(Math.sin(t / 420)), scale: 2 })
  },
  // The sun, low and enormous, and a bird crossing it. The thing the whole film is for.
  sunbird(c, t) {
    skyBands(c, ['#3a74c8', '#5a8ad8', '#8aa0e0', '#c8a8d0', '#f0b8a0', '#f8cf90', '#fbe4a8'])
    const pulse = Math.floor(t / 600) % 2
    disc(c, '#fbe9b0', 80, 52, 30 + pulse)
    disc(c, '#fff4c8', 80, 52, 24)
    disc(c, '#ffffe8', 80, 52, 17)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + t / 5000
      rect(c, '#fff0b8', 80 + Math.cos(a) * 40, 52 + Math.sin(a) * 40, 2, 2)
    }
    cloud(c, 8 + Math.sin(t / 2000) * 3, 60, 1, '#fbe0c8', '#e8b8a8')
    cloud(c, 112 + Math.cos(t / 2200) * 3, 66, 1, '#fbe0c8', '#e8b8a8')
    // Across the disc, slowly, wings working and then gliding.
    const x = 20 + ((t / 70) % 130)
    const y = 52 + Math.sin(t / 900) * 5
    const gliding = Math.floor(t / 1400) % 2 === 1
    bird(c, x, y, !gliding && Math.floor(t / 280) % 2 === 0, '#10131f', 2)
  },
  // Running for it: the street, the apartments at the end of it.
  run(c, t) {
    skyBands(c, ['#58a4ec', '#78b8f0', '#9ccaf4', '#bcdcf6'], 56)
    rect(c, '#7a7a86', 0, 56, REEL_W, 8)
    rect(c, '#52525e', 0, 64, REEL_W, 26)
    rect(c, '#f0e8c0', 0, 76, REEL_W, 1)
    for (let x = -((t / 20) % 24); x < REEL_W; x += 24) rect(c, '#6a6a76', x, 66, 12, 1)
    // The building.
    rect(c, '#8a4a3a', 100, 8, 58, 50)
    for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) rect(c, (r + k) % 3 ? '#d8d090' : '#3a4a6a', 106 + k * 13, 14 + r * 11, 8, 7)
    rect(c, '#5a2a22', 120, 38, 18, 20)
    rect(c, '#e8d890', 130, 48, 2, 2)
    rect(c, '#f4f0d8', 112, 4, 34, 6)
    drawLabel(c, 'FLATS', 120, 4, '#3a2418')
    // You, running flat out.
    const x = Math.min(96, -16 + t / 14)
    drawPerson(c, HERO_FIGURE, 'right', (Math.floor(t / 90) % 3) as WalkFrame, { x: Math.round(x), y: 40 })
  },
  // The hall: wallpaper, a runner, a landlady's door with a line of light under it, and you on tiptoe.
  hallway(c, t) {
    rect(c, '#4a3a38', 0, 0, REEL_W, REEL_H)
    for (let x = 0; x < REEL_W; x += 8) rect(c, '#54423e', x, 0, 4, 56)
    rect(c, '#2a1f1c', 0, 56, REEL_W, 34)
    rect(c, '#6a2a2e', 0, 70, REEL_W, 12)
    rect(c, '#8a4a3a', 0, 70, REEL_W, 1)
    rect(c, '#e8d890', 14, 8, 6, 5)
    // Her door: brass number, a peephole, light underneath.
    rect(c, '#3a2418', 62, 14, 28, 44)
    rect(c, '#5a3a2a', 64, 16, 24, 40)
    rect(c, '#c9a24a', 72, 20, 8, 5)
    rect(c, '#e8d890', 75, 32, 2, 2)
    rect(c, '#f4e8a0', 64, 56, 24, 1)
    // Your door at the end.
    rect(c, '#3a2418', 128, 14, 26, 44)
    rect(c, '#4a2f20', 130, 16, 22, 40)
    // Tiptoe: slow steps, up on the toes, and a bounce on each.
    const x = Math.min(112, -16 + t / 32)
    const bob = Math.abs(Math.sin(t / 220)) < 0.3 ? -1 : 0
    drawPerson(c, HERO_FIGURE, 'right', (Math.floor(t / 320) % 3) as WalkFrame, { x: Math.round(x), y: 40 + bob })
    // The board in front of her door that always creaks.
    if (x > 52 && x < 72 && Math.floor(t / 300) % 2 === 0) drawLabel(c, 'creak', 58, 34, '#d8c8a8')
  },
  // The floor inside your door: a mat and three envelopes that came under it.
  envelopes(c, t) {
    rect(c, '#5a4030', 0, 0, REEL_W, REEL_H)
    for (let x = 0; x < REEL_W; x += 20) rect(c, '#4a3224', x, 0, 1, REEL_H)
    rect(c, '#3a4a5a', 28, 8, 104, 74)
    rect(c, '#46586a', 32, 12, 96, 66)
    envelope(c, 38, 18, '#f0ecdc', '#9a9588')
    envelope(c, 82, 30, '#f2e8c0', '#b09a5a')
    envelope(c, 50, 48, '#f4f0e4', '#9a9588', '#c83a32')
    // A foot in the door, going nowhere: only the glint of the light.
    const glint = Math.floor(t / 400) % 2
    rect(c, glint ? '#fff8d8' : '#e8d890', 136, 8, 14, 1)
  },
  // The notice, close: red at the top, rent due, and a line you do not want to read twice.
  notice(c, t) {
    rect(c, '#2a2420', 0, 0, REEL_W, REEL_H)
    rect(c, '#f4f2ea', 40, 4, 80, 84)
    rect(c, '#c83a32', 40, 4, 80, 12)
    drawLabel(c, 'FINAL NOTICE', 50, 7, '#fff4e8')
    drawLabel(c, 'RENT OVERDUE', 48, 22, '#2a2a34')
    for (let i = 0; i < 5; i++) rect(c, '#b4b4c0', 48, 36 + i * 6, 56 - (i % 2) * 14, 2)
    drawLabel(c, 'AMOUNT DUE', 48, 66, '#5a5a68')
    drawLabel(c, '$ 940.00', 48, 75, '#a8281f')
    // A stamp that thumps in.
    const on = Math.min(1, t / 400)
    if (on > 0.5) {
      const drop = Math.round((1 - on) * 6)
      rect(c, '#c83a32', 86, 46 + drop, 32, 13)
      drawLabel(c, 'LATE', 94, 49 + drop, '#fff4e8')
    }
  },
  // Marcus's invitation: a playing-card shaped card, felt green, a spade, and four lines of scrawl.
  invite(c, t) {
    rect(c, '#2a2420', 0, 0, REEL_W, REEL_H)
    rect(c, '#e8d890', 36, 4, 88, 82)
    rect(c, '#1f6a44', 39, 7, 82, 76)
    rect(c, '#18522f', 42, 10, 76, 70)
    // The spade.
    ;[2, 4, 6, 8, 10, 12, 12, 12, 10, 4, 2, 2, 4, 8].forEach((w, i) => rect(c, '#f4f0d8', 80 - w / 2, 14 + i, w, 1))
    drawLabel(c, "MARCUS'S", 56, 44, '#f2c14e')
    drawLabel(c, 'POKER NIGHT', 52, 53, '#f2c14e')
    drawLabel(c, 'FRIDAY . 8 PM', 52, 64, '#f4f0d8')
    drawLabel(c, 'BRING CASH', 56, 72, '#f4f0d8')
    if (Math.floor(t / 500) % 2) rect(c, '#f2c14e', 42, 10, 3, 3)
  },
  // The computer: a search engine that is not quite one.
  poogle(c, t) {
    rect(c, '#2a2e3a', 0, 0, REEL_W, REEL_H)
    rect(c, '#14161e', 12, 4, 136, 80)
    rect(c, '#f2f4f8', 15, 7, 130, 74)
    rect(c, '#dfe3ec', 15, 7, 130, 11)
    rect(c, '#9aa4b8', 19, 10, 3, 3)
    rect(c, '#9aa4b8', 25, 10, 3, 3)
    rect(c, '#fff', 32, 8, 100, 9)
    drawLabel(c, 'www.poogle.com', 35, 8, '#7a8498')
    const logo: [string, string][] = [['P', '#3a6ac8'], ['o', '#d8453a'], ['o', '#f2c14e'], ['g', '#3a6ac8'], ['l', '#3aa05a'], ['e', '#d8453a']]
    logo.forEach(([ch, color], i) => drawLabel(c, ch, 62 + i * 8, 20, color))
    rect(c, '#c5ccda', 34, 34, 92, 11)
    rect(c, '#fff', 35, 35, 90, 9)
    const typed = 'how to play poker'.slice(0, Math.min(17, Math.floor(t / 110)))
    drawLabel(c, typed, 38, 36, '#1c1c28')
    if (Math.floor(t / 400) % 2 === 0) rect(c, '#1c1c28', 38 + measureText(typed), 36, 1, 7)
    if (t > 2400) {
      for (let i = 0; i < 3; i++) {
        rect(c, '#3a6ac8', 22, 54 + i * 9, 40, 2)
        rect(c, '#b4b8c4', 22, 58 + i * 9, 100 - i * 14, 1)
      }
      rect(c, '#c83a32', 130, 53, 11, 9)
    }
    rect(c, '#3a3f50', 60, 84, 40, 6)
  },
  // The bookshelf: spines, a shelf of names, and one book that wants taking down.
  shelf(c, t) {
    rect(c, '#2a1f18', 0, 0, REEL_W, REEL_H)
    const tones = ['#7a2a2a', '#2a4a7a', '#3a6a3a', '#6a5a2a', '#5a3a6a', '#8a5a2a', '#2a5a5a', '#9a8a6a', '#4a2a3a']
    for (let row = 0; row < 3; row++) {
      const y = 6 + row * 28
      rect(c, '#5a3a22', 6, y + 22, 148, 4)
      rect(c, '#8a5a32', 6, y + 22, 148, 1)
      let x = 8
      let i = row * 7
      while (x < 150) {
        const w = 4 + ((i * 5) % 4)
        const h = 16 + ((i * 7) % 7)
        rect(c, tones[(i * 3) % tones.length], x, y + 22 - h, w, h)
        rect(c, '#e8d890', x + 1, y + 22 - h + 3, w - 2, 1)
        x += w + 1
        i++
      }
    }
    // The one on the middle shelf, pulled out an inch and lit.
    const glow = Math.floor(t / 500) % 2
    rect(c, glow ? '#f4e8a0' : '#d8c880', 76, 28, 9, 26)
    rect(c, '#2a4a7a', 77, 30, 7, 24)
    rect(c, '#e8d890', 78, 33, 5, 1)
    rect(c, '#e8d890', 78, 36, 5, 1)
    const plate = (text: string, y: number, color: string) => {
      const w = measureText(text) + 6
      rect(c, '#14100c', Math.round((REEL_W - w) / 2), y - 2, w, 11)
      drawLabel(c, text, Math.round((REEL_W - w) / 2) + 3, y, color)
    }
    plate('A HISTORY OF PHILOSOPHY', 15, '#f4e8a0')
    plate('CAMUS . KANT . PLATO', 78, '#c8b898')
  },
  // Bed, late: the window, a lamp going down, a book going slack in your hand, and sleep.
  bed(c, t) {
    // Wall and floor.
    rect(c, '#161a36', 0, 0, REEL_W, REEL_H)
    for (let x = 0; x < REEL_W; x += 12) rect(c, '#1a1e3c', x, 0, 6, 64)
    rect(c, '#0e1128', 0, 62, REEL_W, 2)
    rect(c, '#3a2a22', 0, 64, REEL_W, 26)
    for (let x = 0; x < REEL_W; x += 24) rect(c, '#2e2018', x, 64, 1, 26)
    rect(c, '#4a362a', 0, 64, REEL_W, 1)
    // The window, stars and moon, curtains drawn back.
    rect(c, '#2a2f58', 10, 8, 38, 36)
    rect(c, '#0c1030', 13, 11, 32, 30)
    for (let i = 0; i < 9; i++) if ((Math.floor(t / 700) + i) % 4) rect(c, '#e8e4d0', 15 + ((i * 11) % 28), 13 + ((i * 7) % 20), 1, 1)
    disc(c, '#f4f0d8', 36, 20, 4)
    disc(c, '#0c1030', 38, 19, 3)
    rect(c, '#2a2f58', 28, 11, 1, 30)
    rect(c, '#2a2f58', 13, 26, 32, 1)
    rect(c, '#6a3a4a', 6, 6, 9, 42)
    rect(c, '#7a4a5a', 8, 8, 2, 38)
    rect(c, '#6a3a4a', 44, 6, 9, 42)
    rect(c, '#7a4a5a', 49, 8, 2, 38)
    rect(c, '#52381f', 4, 5, 51, 2)
    // A picture and a clock above the bed.
    rect(c, '#52381f', 76, 12, 22, 16)
    rect(c, '#8a9ab8', 78, 14, 18, 12)
    rect(c, '#5a7a6a', 78, 22, 18, 4)
    rect(c, '#d8d4c4', 112, 14, 10, 10)
    rect(c, '#1c1c28', 116, 16, 1, 4)
    rect(c, '#1c1c28', 116, 19, 3, 1)
    // A stack of books on the floor and a rug.
    rect(c, '#4a2a3a', 8, 58, 20, 20)
    rect(c, '#5a3a4a', 10, 60, 16, 16)
    rect(c, '#2a4a7a', 54, 78, 16, 3)
    rect(c, '#7a2a2a', 55, 75, 14, 3)
    rect(c, '#3a6a3a', 56, 72, 12, 3)
    // The bed: frame, mattress, pillow, a blanket in folds.
    rect(c, '#3a2418', 28, 38, 5, 46)
    rect(c, '#52381f', 28, 38, 5, 2)
    rect(c, '#3a2418', 28, 66, 108, 6)
    rect(c, '#3a2418', 132, 56, 4, 28)
    rect(c, '#d8d4c8', 33, 52, 104, 14)
    rect(c, '#e8e4d8', 34, 46, 22, 9)
    rect(c, '#c8c4b8', 34, 53, 22, 2)
    // Your head on the pillow, eyes closed, and the hair on it.
    rect(c, '#e0b890', 38, 46, 11, 9)
    rect(c, '#5a3a22', 37, 44, 13, 4)
    rect(c, '#5a3a22', 37, 46, 3, 5)
    rect(c, '#3a2418', 43, 50, 4, 1)
    rect(c, '#d09878', 47, 52, 2, 1)
    // The blanket, breathing, with a few creases and a darker edge.
    const breathe = Math.round(Math.sin(t / 700) * 0.8)
    rect(c, '#4a5a8a', 52, 50 + breathe, 84, 18 - breathe)
    rect(c, '#5a6a9a', 52, 50 + breathe, 84, 2)
    rect(c, '#3a4a78', 52, 65, 84, 3)
    for (const x of [64, 86, 104, 120]) rect(c, '#3e4e7e', x, 53 + breathe, 1, 11)
    rect(c, '#6a7aaa', 66, 54 + breathe, 10, 1)
    rect(c, '#6a7aaa', 98, 56 + breathe, 12, 1)
    // The book: held up, then sagging, then slack on your chest. Your hand lets go of it.
    const sag = Math.min(1, t / 4200)
    const bx = 56 + Math.round(sag * 6)
    const by = 42 + Math.round(sag * 8) + breathe
    rect(c, '#2a4a7a', bx - 1, by + 1, 24, 12)
    rect(c, '#f0ecdc', bx, by, 22, 10)
    rect(c, '#d8d4c4', bx + 10, by, 2, 10)
    for (let i = 0; i < 3; i++) {
      rect(c, '#9a9aa8', bx + 2, by + 2 + i * 3, 7, 1)
      rect(c, '#9a9aa8', bx + 13, by + 2 + i * 3, 7, 1)
    }
    rect(c, '#e0b890', bx + 8 - Math.round(sag * 5), by + 7 + Math.round(sag * 3), 5, 3)
    // The nightstand and its lamp: warm for a while, then out.
    const lampOn = t < 4600
    rect(c, '#52381f', 140, 60, 16, 24)
    rect(c, '#3a2418', 140, 60, 16, 2)
    rect(c, '#52381f', 147, 48, 2, 12)
    rect(c, lampOn ? '#f4c85a' : '#6a5a30', 142, 38, 12, 10)
    rect(c, lampOn ? '#fbe08a' : '#7a6a3a', 144, 38, 8, 3)
    if (lampOn) {
      const fade = Math.max(0.35, 1 - t / 6000)
      for (let i = 0; i < 8; i++) {
        c.globalAlpha = 0.03 * fade
        disc(c, '#f4c85a', 148, 48, 12 + i * 6)
      }
      c.globalAlpha = 1
    } else {
      c.globalAlpha = 0.3
      rect(c, '#05061a', 0, 0, REEL_W, REEL_H)
      c.globalAlpha = 1
    }
    // The z's, once you are under.
    if (t > 2200) {
      for (let i = 0; i < 3; i++) {
        const age = ((t - 2200) / 30 + i * 36) % 108
        drawLabel(c, 'z', 54 + age / 3 + i * 3, 36 - age / 3, '#9aa4c8')
      }
    }
  },
  // The door, shaking: somebody on the other side with a fist.
  knock(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    const hit = Math.floor(t / 260) % 4 === 0 ? 2 : Math.floor(t / 130) % 2
    const dx = hit
    rect(c, '#3a2a30', 32 + dx, 2, 96, 86)
    rect(c, '#5a3a2a', 36 + dx, 6, 88, 82)
    rect(c, '#4a2f20', 42 + dx, 12, 32, 30)
    rect(c, '#4a2f20', 86 + dx, 12, 32, 30)
    rect(c, '#4a2f20', 42 + dx, 48, 32, 34)
    rect(c, '#4a2f20', 86 + dx, 48, 32, 34)
    rect(c, '#c9a24a', 104 + dx, 46, 6, 5)
    rect(c, '#8a8a96', 98 + dx, 30, 3, 14)
    disc(c, '#f4e8a0', 80 + dx, 24, 2)
    rect(c, '#f4e8a0', 36, 86, 88, 2)
    if (Math.floor(t / 260) % 2 === 0) drawLabel(c, 'BANG BANG BANG', 42, 76, '#f2c14e')
    else drawLabel(c, 'BANG!', 8, 30, '#c83a32')
  },
  flatIn(c, t) {
    drawFlat(c, t, 'out', 'door', true)
  },
  flatTable(c, t) {
    drawFlat(c, t, 'mat', 'table', false)
  },
  flatDesk(c, t) {
    drawFlat(c, t, 'table', 'desk', false)
  },
  flatShelf(c, t) {
    drawFlat(c, t, 'desk', 'shelf', false)
  },
  flatBed(c, t) {
    drawFlat(c, t, 'shelf', 'bed', false)
  },
  // The booth: two headsets, a monitor between them showing the feed.
  booth(c, t) {
    rect(c, '#14122a', 0, 0, REEL_W, REEL_H)
    rect(c, '#222244', 0, 60, REEL_W, 30)
    rect(c, '#0d0d1a', 54, 14, 52, 32)
    const glow = Math.floor(t / 400) % 2
    rect(c, glow ? '#1f5a44' : '#1a4e3a', 57, 17, 46, 26)
    rect(c, '#e8e8f0', 60, 36, 18, 3)
    person(c, 28, 26, '#f2cfa8', '#c8402f', '#e0a020', true)
    person(c, 130, 26, '#7a4a2e', '#2a4a8a', '#0f0f0f', true)
    rect(c, '#555555', 10, 58, 40, 3)
    rect(c, '#555555', 110, 58, 40, 3)
  },
  // The chase down the alley is its own component (`AlleyChase`); this is only what is behind it.
  chase(c) {
    rect(c, '#05040a', 0, 0, REEL_W, REEL_H)
  },
  // Out the back: brick, a bin, an emergency door standing open on the light.
  alley(c, t) {
    rect(c, '#1a1424', 0, 0, REEL_W, REEL_H)
    for (let row = 0; row < 12; row++) {
      for (let x = row % 2 ? 0 : -8; x < REEL_W; x += 16) rect(c, '#3a2a30', x, row * 6, 15, 5)
    }
    rect(c, '#2a2a30', 0, 70, REEL_W, 20)
    rect(c, '#f4e8a0', 108, 20, 24, 50)
    rect(c, '#2a2230', 106, 18, 28, 4)
    rect(c, '#2d4a3a', 24, 50, 30, 20)
    rect(c, '#1c3226', 24, 48, 32, 4)
    const lamp = Math.floor(t / 300) % 2
    rect(c, lamp ? '#f2c14e' : '#d9a83a', 76, 6, 6, 4)
    rect(c, '#2a2a3a', 78, 10, 2, 60)
    rect(c, '#c82828', 70, 62, 3, 3)
  },
  // The rail: a handful of faces lit from the table, and a hand-lettered sign.
  rail(c, t) {
    rect(c, '#0b0a14', 0, 0, REEL_W, REEL_H)
    rect(c, '#2a1f18', 0, 62, REEL_W, 28)
    const skins = ['#f2cfa8', '#c8905f', '#e0b890', '#8a5a3a', '#5e3a22']
    const hair = ['#4a3a2a', '#222222', '#a8281f', '#2a2018', '#b0b0b8']
    const shirts = ['#6a2a2a', '#2a4a7a', '#3a6a3a', '#7a6a2a', '#5a3a6a']
    skins.forEach((skin, i) => person(c, 24 + i * 28, 30, skin, shirts[i], hair[i]))
    const wave = Math.floor(t / 500) % 2
    rect(c, '#f4f0d8', 62, 18 - wave, 36, 14)
    rect(c, '#a8281f', 66, 22 - wave, 28, 2)
    rect(c, '#a8281f', 66, 26 - wave, 20, 2)
  },
  // A city at night from a long way up: the penthouse, or the road out.
  night(c, t) {
    rect(c, '#080a1a', 0, 0, REEL_W, REEL_H)
    for (let i = 0; i < 40; i++) rect(c, i % 5 ? '#f4f0d8' : '#f2c14e', (i * 37) % REEL_W, (i * 17) % 40, 1, 1)
    const heights = [30, 44, 26, 52, 36, 60, 28, 48, 34, 56, 40, 30]
    const tick = Math.floor(t / 900)
    heights.forEach((h, i) => {
      rect(c, '#14162e', i * 14, 90 - h, 13, h)
      for (let y = 90 - h + 4; y < 86; y += 6) {
        for (let x = i * 14 + 2; x < i * 14 + 11; x += 4) {
          if ((x * 7 + y * 3 + tick * (x % 3)) % 5 < 3) rect(c, '#f2c14e', x, y, 2, 3)
        }
      }
    })
  },
  // The nights up the ladder, one look a stop (docs/STORYBOARD.md §9.6).
  deck: drawDeck,
  harborroom: drawHarborRoom,
  beach: drawBeach,
  neon: drawNeon,
  stream: drawStream,
  lift: drawLift,
}

/** Draws one set on a REEL_W × REEL_H canvas. `t` is milliseconds, for the things that flicker. */
export function drawReel(canvas: HTMLCanvasElement, scene: ReelScene, t: number, notes?: Notification[]) {
  const c = canvas.getContext('2d')
  if (!c) return
  c.imageSmoothingEnabled = false
  SCENES[scene](c, t, notes)
}
