/**
 * The small vocabulary every drawing in the overworld is made from.
 *
 * Everything is drawn in art units — 16 to a tile — as filled rectangles, and
 * scaled up with nearest-neighbour by whoever owns the canvas. There is no
 * sub-unit drawing anywhere: a building, a slot machine and the player all sit
 * on the same pixel grid, which is most of what makes a scene read as one game.
 *
 * Light comes from the top-left. A material gets three or four shades —
 * highlight, base, shade, outline — and the outline is a darker shade of the
 * material, not black, except where a silhouette has to stand off busy ground.
 */

/** Fills a rectangle of art units. Colours are CSS colours; `rgba()` is allowed. */
export type Px = (x: number, y: number, w: number, h: number, color: string) => void

/** Near-black for silhouettes that have to read against busy ground. */
export const INK = '#15151d'

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function toHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Lighter (amount > 0, towards white) or darker (amount < 0, towards black). */
export function tint(hex: string, amount: number): string {
  const [r, g, b] = channels(hex)
  if (amount >= 0) return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
  const k = 1 + amount
  return toHex(r * k, g * k, b * k)
}

/** Halfway (or `t` of the way) from one colour to another. */
export function mix(a: string, b: string, t = 0.5): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  return toHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t)
}

/** A material in four shades, derived from one base so a palette stays coherent. */
export interface Ramp {
  hi: string
  base: string
  lo: string
  line: string
}

export function ramp(base: string, spread = 1): Ramp {
  return {
    hi: tint(base, 0.22 * spread),
    base,
    lo: tint(base, -0.22 * spread),
    line: tint(base, -0.5 * spread),
  }
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** An oval of `color`, by rows, so felt and basins read as round not boxy. */
export function oval(px: Px, x: number, y: number, w: number, h: number, color: string) {
  for (let row = 0; row < h; row++) {
    const t = (row + 0.5) / h
    const half = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) / 2
    const inset = Math.round(w * (0.5 - half))
    px(x + inset, y + row, Math.max(1, w - inset * 2), 1, color)
  }
}

/** The row spans of an oval, for drawing rings and rims rather than fills. */
export function ovalSpans(w: number, h: number): Array<[number, number]> {
  const spans: Array<[number, number]> = []
  for (let row = 0; row < h; row++) {
    const t = (row + 0.5) / h
    const half = Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2)) / 2
    const inset = Math.round(w * (0.5 - half))
    spans.push([inset, Math.max(1, w - inset * 2)])
  }
  return spans
}

/** A rectangle with the corners knocked off, for anything that should not look boxy. */
export function rounded(px: Px, x: number, y: number, w: number, h: number, color: string, r = 1) {
  if (h <= r * 2 || w <= r * 2) {
    px(x, y, w, h, color)
    return
  }
  px(x + r, y, w - r * 2, h, color)
  for (let i = 0; i < r; i++) {
    const inset = r - i
    px(x + i, y + inset, 1, h - inset * 2, color)
    px(x + w - 1 - i, y + inset, 1, h - inset * 2, color)
  }
}

/** A box with an outline round it. */
export function box(px: Px, x: number, y: number, w: number, h: number, fill: string, line: string) {
  px(x, y, w, h, line)
  px(x + 1, y + 1, w - 2, h - 2, fill)
}

/** A face lit from the top-left: highlight along the top and left, shade along the bottom and right. */
export function bevel(px: Px, x: number, y: number, w: number, h: number, r: Ramp, depth = 1) {
  px(x, y, w, h, r.base)
  px(x, y, w, depth, r.hi)
  px(x, y, depth, h, r.hi)
  px(x, y + h - depth, w, depth, r.lo)
  px(x + w - depth, y, depth, h, r.lo)
}

/** A translucent shadow — the only place colour with alpha is used. */
export function shadow(px: Px, x: number, y: number, w: number, h: number, alpha = 0.28) {
  px(x, y, w, h, `rgba(10, 8, 20, ${alpha})`)
}

// ---------------------------------------------------------------------------
// What lights up after dark
// ---------------------------------------------------------------------------

/**
 * How a part of a drawing gives off light after dark.
 *
 * - `window`: glass with a lit room behind it. By day it shows the sky; at
 *   night it is redrawn in the warm light of the room, keeping its shading.
 * - `lamp`: a lamp's glass or a flame, brightened towards white-hot.
 * - `neon`: tubes, bulbs and lit signs, exactly as drawn, at full brightness.
 */
export type Glow = 'window' | 'lamp' | 'neon'

let glowing: Glow | null = null

/**
 * Marks what `draw` paints as giving off light. A drawing is painted twice:
 * once as it looks, and once for the night, when only marked parts are kept
 * (and everything painted over them afterwards cuts them back out).
 */
export function glow(kind: Glow, draw: () => void) {
  const previous = glowing
  glowing = kind
  try {
    draw()
  } finally {
    glowing = previous
  }
}

/** The kind of light being painted right now, if any. */
export function currentGlow(): Glow | null {
  return glowing
}

/** Whether a pixel at (x, y) falls on a deterministic scatter, for texture that does not repeat. */
export function speck(x: number, y: number, seed: number, oneIn: number): boolean {
  let h = (x * 374761393 + y * 668265263 + seed * 2246822519) >>> 0
  h = ((h ^ (h >>> 13)) * 1274126177) >>> 0
  return (h ^ (h >>> 16)) % oneIn === 0
}

// ---------------------------------------------------------------------------
// Lettering
// ---------------------------------------------------------------------------

/**
 * A 3x5 pixel font for signs.
 *
 * Signs are what make a street legible — "BAKERY", "CASINO", "PAWN" — and at
 * this resolution a word has to be built a pixel at a time. Glyphs may be
 * narrower than three where a full cell would read as a gap.
 */
const GLYPHS: Record<string, string[]> = {
  A: ['.#.', '#.#', '###', '#.#', '#.#'],
  B: ['##.', '#.#', '##.', '#.#', '##.'],
  C: ['.##', '#..', '#..', '#..', '.##'],
  D: ['##.', '#.#', '#.#', '#.#', '##.'],
  E: ['###', '#..', '##.', '#..', '###'],
  F: ['###', '#..', '##.', '#..', '#..'],
  G: ['.##', '#..', '#.#', '#.#', '.##'],
  H: ['#.#', '#.#', '###', '#.#', '#.#'],
  I: ['###', '.#.', '.#.', '.#.', '###'],
  J: ['..#', '..#', '..#', '#.#', '.#.'],
  K: ['#.#', '#.#', '##.', '#.#', '#.#'],
  L: ['#..', '#..', '#..', '#..', '###'],
  M: ['#...#', '##.##', '#.#.#', '#...#', '#...#'],
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  O: ['.#.', '#.#', '#.#', '#.#', '.#.'],
  P: ['##.', '#.#', '##.', '#..', '#..'],
  Q: ['.#.', '#.#', '#.#', '##.', '.##'],
  R: ['##.', '#.#', '##.', '#.#', '#.#'],
  S: ['.##', '#..', '.#.', '..#', '##.'],
  T: ['###', '.#.', '.#.', '.#.', '.#.'],
  U: ['#.#', '#.#', '#.#', '#.#', '###'],
  V: ['#.#', '#.#', '#.#', '#.#', '.#.'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  X: ['#.#', '#.#', '.#.', '#.#', '#.#'],
  Y: ['#.#', '#.#', '.#.', '.#.', '.#.'],
  Z: ['###', '..#', '.#.', '#..', '###'],
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['##.', '..#', '.#.', '#..', '###'],
  '3': ['##.', '..#', '.#.', '..#', '##.'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '##.', '..#', '##.'],
  '6': ['.##', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '##.'],
  "'": ['#', '#', '.', '.', '.'],
  '.': ['.', '.', '.', '.', '#'],
  '!': ['#', '#', '#', '.', '#'],
  '-': ['..', '..', '##', '..', '..'],
  '&': ['.#.', '#.#', '.#.', '#.#', '.##'],
  '$': ['.##', '##.', '.#.', '.##', '##.'],
  '/': ['..#', '..#', '.#.', '#..', '#..'],
  ' ': ['..', '..', '..', '..', '..'],
}

/** How wide a run of text is, in art units, at a given scale. */
export function textWidth(text: string, scale = 1, spacing = 1): number {
  let width = 0
  for (const char of text.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[' ']
    width += glyph[0].length * scale + spacing * scale
  }
  return Math.max(0, width - spacing * scale)
}

/** Writes text with its top-left at (x, y). Returns the width written. */
export function text(px: Px, words: string, x: number, y: number, color: string, scale = 1, spacing = 1): number {
  let cursor = x
  for (const char of words.toUpperCase()) {
    const glyph = GLYPHS[char] ?? GLYPHS[' ']
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] === '#') px(cursor + col * scale, y + row * scale, scale, scale, color)
      }
    }
    cursor += glyph[0].length * scale + spacing * scale
  }
  return cursor - x - spacing * scale
}

/** Text centred on a column. */
export function textCentred(px: Px, words: string, cx: number, y: number, color: string, scale = 1, spacing = 1) {
  return text(px, words, Math.round(cx - textWidth(words, scale, spacing) / 2), y, color, scale, spacing)
}

/** Text with a one-unit drop shadow down and to the right, for signs that sit on busy backgrounds. */
export function textShadowed(
  px: Px, words: string, x: number, y: number, color: string, under: string, scale = 1, spacing = 1,
) {
  text(px, words, x + 1, y + 1, under, scale, spacing)
  return text(px, words, x, y, color, scale, spacing)
}

/**
 * Neon lettering: a dim halo a unit out on every side, then the tube itself.
 * Returns the width written.
 */
export function neonText(
  px: Px, words: string, x: number, y: number, core: string, halo: string, scale = 1, spacing = 1,
) {
  let width = 0
  glow('neon', () => {
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) text(px, words, x + dx, y + dy, halo, scale, spacing)
    width = text(px, words, x, y, core, scale, spacing)
  })
  return width
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const ICONS: Record<string, string[]> = {
  spade: ['..#..', '.###.', '#####', '#####', '..#..'],
  heart: ['.#.#.', '#####', '#####', '.###.', '..#..'],
  diamond: ['..#..', '.###.', '#####', '.###.', '..#..'],
  club: ['.###.', '.###.', '#####', '#####', '..#..'],
  star: ['..#..', '#####', '.###.', '.#.#.', '#...#'],
}

export type Icon = keyof typeof ICONS

/** A 5x5 icon — a card suit, a star — scaled up if asked. */
export function icon(px: Px, name: Icon, x: number, y: number, color: string, scale = 1) {
  const rows = ICONS[name]
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      if (rows[row][col] === '#') px(x + col * scale, y + row * scale, scale, scale, color)
    }
  }
}

/** A pattern written as rows of characters, each mapped to a colour; `.` is left clear. */
export function sprite(px: Px, rows: string[], x: number, y: number, colors: Record<string, string>) {
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < rows[row].length; col++) {
      const color = colors[rows[row][col]]
      if (color) px(x + col, y + row, 1, 1, color)
    }
  }
}
