import type { Raster } from './raster'

/**
 * The table's typeface: a proportional bitmap font drawn in code.
 *
 * No font is loaded over the network (the iOS build has to work offline) and no
 * binary asset ships with the game, so the letters are written down here as
 * pixel rows. Capitals are seven pixels tall, lowercase has a five-pixel
 * x-height with two-pixel descenders, and everything sits on one baseline — the
 * proportions of the text in a GBA Pokémon game, which is the look the overworld
 * is drawn to.
 *
 * Rows are top to bottom from the cap line: rows 0-6 sit on the baseline at row
 * 6, and rows 7-8 hang below it.
 */

/** Height of a line of text, glyph rows plus the shadow, in art pixels. */
export const LINE_HEIGHT = 10
/** Gap between two glyphs. */
const TRACKING = 1
/** The width of a space. With tracking either side, four pixels between words. */
const SPACE = 2
/**
 * The gap the wrapping renderer puts between word boxes. Each box already
 * carries one shadow column, so this plus one matches a space in a single run.
 */
export const WORD_GAP = 3

const G = (spec: string): string[] => spec.split(' ')
// prettier-ignore
const GLYPHS: Record<string, string[]> = {
  A: G('.###. #...# #...# ##### #...# #...# #...#'),
  B: G('####. #...# #...# ####. #...# #...# ####.'),
  C: G('.###. #...# #.... #.... #.... #...# .###.'),
  D: G('####. #...# #...# #...# #...# #...# ####.'),
  E: G('##### #.... #.... ####. #.... #.... #####'),
  F: G('##### #.... #.... ####. #.... #.... #....'),
  G: G('.###. #...# #.... #..## #...# #...# .####'),
  H: G('#...# #...# #...# ##### #...# #...# #...#'),
  I: G('### .#. .#. .#. .#. .#. ###'),
  J: G('....# ....# ....# ....# #...# #...# .###.'),
  K: G('#...# #..#. #.#.. ##... #.#.. #..#. #...#'),
  L: G('#.... #.... #.... #.... #.... #.... #####'),
  M: G('#...# ##.## #.#.# #.#.# #...# #...# #...#'),
  N: G('#...# ##..# #.#.# #..## #...# #...# #...#'),
  O: G('.###. #...# #...# #...# #...# #...# .###.'),
  P: G('####. #...# #...# ####. #.... #.... #....'),
  Q: G('.###. #...# #...# #...# #.#.# #..#. .##.#'),
  R: G('####. #...# #...# ####. #.#.. #..#. #...#'),
  S: G('.###. #...# #.... .###. ....# #...# .###.'),
  T: G('##### ..#.. ..#.. ..#.. ..#.. ..#.. ..#..'),
  U: G('#...# #...# #...# #...# #...# #...# .###.'),
  V: G('#...# #...# #...# #...# #...# .#.#. ..#..'),
  W: G('#...# #...# #...# #.#.# #.#.# #.#.# .#.#.'),
  X: G('#...# #...# .#.#. ..#.. .#.#. #...# #...#'),
  Y: G('#...# #...# .#.#. ..#.. ..#.. ..#.. ..#..'),
  Z: G('##### ....# ...#. ..#.. .#... #.... #####'),

  a: G('.... .... .##. ...# .### #..# .###'),
  b: G('#... #... ###. #..# #..# #..# ###.'),
  c: G('.... .... .### #... #... #... .###'),
  d: G('...# ...# .### #..# #..# #..# .###'),
  e: G('.... .... .##. #..# #### #... .###'),
  f: G('.## #.. ### #.. #.. #.. #..'),
  g: G('.... .... .### #..# #..# #..# .### ...# .##.'),
  h: G('#... #... ###. #..# #..# #..# #..#'),
  i: G('# . # # # # #'),
  j: G('..# ... ..# ..# ..# ..# ..# #.# .#.'),
  k: G('#... #... #..# #.#. ##.. #.#. #..#'),
  l: G('#. #. #. #. #. #. .#'),
  m: G('..... ..... ##.#. #.#.# #.#.# #.#.# #.#.#'),
  n: G('.... .... ###. #..# #..# #..# #..#'),
  o: G('.... .... .##. #..# #..# #..# .##.'),
  p: G('.... .... ###. #..# #..# #..# ###. #... #...'),
  q: G('.... .... .### #..# #..# #..# .### ...# ...#'),
  r: G('.... .... #.## ##.. #... #... #...'),
  s: G('.... .... .### #... .##. ...# ###.'),
  t: G('.#. .#. ### .#. .#. .#. ..#'),
  u: G('.... .... #..# #..# #..# #..# .###'),
  v: G('..... ..... #...# #...# #...# .#.#. ..#..'),
  w: G('..... ..... #...# #...# #.#.# #.#.# .#.#.'),
  x: G('.... .... #..# #..# .##. #..# #..#'),
  y: G('.... .... #..# #..# #..# #..# .### ...# .##.'),
  z: G('.... .... #### ...# .##. #... ####'),

  '0': G('.###. #...# #..## #.#.# ##..# #...# .###.'),
  '1': G('.#. ##. .#. .#. .#. .#. ###'),
  '2': G('.###. #...# ....# ...#. ..#.. .#... #####'),
  '3': G('##### ...#. ..#.. ...#. ....# #...# .###.'),
  '4': G('...#. ..##. .#.#. #..#. ##### ...#. ...#.'),
  '5': G('##### #.... ####. ....# ....# #...# .###.'),
  '6': G('..##. .#... #.... ####. #...# #...# .###.'),
  '7': G('##### ....# ...#. ..#.. .#... .#... .#...'),
  '8': G('.###. #...# #...# .###. #...# #...# .###.'),
  '9': G('.###. #...# #...# .#### ....# ...#. .##..'),

  '.': G('. . . . . . #'),
  ',': G('.. .. .. .. .. .. .# #.'),
  ':': G('. . . # . . #'),
  ';': G('.. .. .. .# .. .. .# #.'),
  '!': G('# # # # # . #'),
  '?': G('.###. #...# ....# ...#. ..#.. ..... ..#..'),
  "'": G('# #'),
  '"': G('#.# #.#'),
  '-': G('... ... ... ###'),
  '–': G('.... .... .... ####'),
  '—': G('....... ....... ....... #######'),
  '(': G('..# .#. #.. #.. #.. .#. ..#'),
  ')': G('#.. .#. ..# ..# ..# .#. #..'),
  '[': G('## #. #. #. #. #. ##'),
  ']': G('## .# .# .# .# .# ##'),
  '/': G('....# ....# ...#. ..#.. .#... #.... #....'),
  '$': G('..#.. .#### #.#.. .###. ..#.# ####. ..#..'),
  '%': G('##..# ##..# ...#. ..#.. .#... #..## #..##'),
  '&': G('.##.. #..#. #.#.. .#... #.#.# #..#. .##.#'),
  '+': G('..... ..#.. ..#.. ##### ..#.. ..#..'),
  '=': G('.... .... #### .... ####'),
  '×': G('..... ..... #...# .#.#. ..#.. .#.#. #...#'),
  '·': G('.. .. .. ## ##'),
  '#': G('.#.#. ##### .#.#. .#.#. ##### .#.#.'),
  '*': G('..... #.#.# .###. ##### .###. #.#.#'),
  '<': G('...# ..#. .#.. #... .#.. ..#. ...#'),
  '>': G('#... .#.. ..#. ...# ..#. .#.. #...'),
  '_': G('..... ..... ..... ..... ..... ..... ..... #####'),
  '@': G('.###. #...# #.### #.#.# #.### #.... .###.'),
  '½': G('.#...#. ##..#.. .#.#... ..#.##. .#....# #....#. ....###'),
  '¾': G('##...#. .#..#.. ##.#... ..#..#. .#..##. #..#### .....#.'),
  '▶': G('#... ##.. ###. #### ###. ##.. #...'),
  '▼': G('....... ....... ####### .#####. ..###.. ...#...'),
  '♥': G('..... .#.#. ##### ##### .###. ..#..'),
  '♦': G('..... ..#.. .###. ##### .###. ..#..'),
  '♠': G('..#.. .###. ##### ##### ..#.. .###.'),
  '♣': G('.###. .###. ##### ##### ..#.. .###.'),
}

/** Characters with no glyph of their own, written with ones that exist. */
const SUBSTITUTES: Record<string, string> = {
  '’': "'",
  '‘': "'",
  '“': '"',
  '”': '"',
  '…': '...',
  ' ': ' ',
  '❤': '♥',
}

function normalise(text: string): string {
  let out = ''
  for (const ch of text) {
    if (GLYPHS[ch] || ch === ' ') {
      out += ch
      continue
    }
    const sub = SUBSTITUTES[ch]
    if (sub !== undefined) {
      out += sub
      continue
    }
    // Accented letters fall back to their base letter.
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
    out += GLYPHS[base] ? base : '?'
  }
  return out
}

function glyphWidth(ch: string): number {
  if (ch === ' ') return SPACE
  return GLYPHS[ch][0].length
}

/** How wide a run of text is, in art pixels (without its shadow). */
export function measureText(text: string): number {
  const chars = [...normalise(text)]
  if (chars.length === 0) return 0
  let width = 0
  chars.forEach((ch, i) => {
    width += glyphWidth(ch)
    if (i < chars.length - 1) width += TRACKING
  })
  return width
}

/** Calls `plot` for every lit pixel of `text` drawn with its top-left at (0, 0). */
function forEachPixel(text: string, plot: (x: number, y: number) => void): number {
  let pen = 0
  const chars = [...normalise(text)]
  chars.forEach((ch, i) => {
    if (ch !== ' ') {
      const rows = GLYPHS[ch]
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === '#') plot(pen + x, y)
      })
    }
    pen += glyphWidth(ch) + (i < chars.length - 1 ? TRACKING : 0)
  })
  return pen
}

/** Merges lit pixels into horizontal runs and writes them as one SVG path. */
function pathOf(pixels: Set<number>, stride: number): string {
  const rows = new Map<number, number[]>()
  for (const key of pixels) {
    const y = Math.floor(key / stride)
    const x = key % stride
    const row = rows.get(y)
    if (row) row.push(x)
    else rows.set(y, [x])
  }
  let d = ''
  for (const [y, xs] of rows) {
    xs.sort((a, b) => a - b)
    let start = xs[0]
    let prev = xs[0]
    for (let i = 1; i <= xs.length; i++) {
      const x = xs[i]
      if (x === prev + 1) {
        prev = x
        continue
      }
      d += `M${start} ${y}h${prev - start + 1}v1h${-(prev - start + 1)}z`
      start = x
      prev = x
    }
  }
  return d
}

export interface TextShape {
  /** The letters, as an SVG path in art pixels. */
  glyphs: string
  /** The drop shadow under them: one pixel right, down, and both. */
  shadow: string
  /** Width including the shadow column. */
  width: number
}

const shapeCache = new Map<string, TextShape>()

/** The path data for a run of text, cached, for the SVG renderer. */
export function textShape(text: string): TextShape {
  const hit = shapeCache.get(text)
  if (hit) return hit
  const stride = 4096
  const lit = new Set<number>()
  const width = forEachPixel(text, (x, y) => lit.add(y * stride + x))
  const shadow = new Set<number>()
  for (const key of lit) {
    for (const offset of [1, stride, stride + 1]) {
      if (!lit.has(key + offset)) shadow.add(key + offset)
    }
  }
  const shape = { glyphs: pathOf(lit, stride), shadow: pathOf(shadow, stride), width: width + 1 }
  if (shapeCache.size > 4000) shapeCache.clear()
  shapeCache.set(text, shape)
  return shape
}

/** Draws text into a raster, for words that are part of a picture (a sign, a card). */
export function drawText(
  raster: Raster,
  text: string,
  x: number,
  y: number,
  color: string,
  shadow?: string,
): number {
  if (shadow) {
    forEachPixel(text, (px, py) => {
      raster.set(x + px + 1, y + py, shadow)
      raster.set(x + px, y + py + 1, shadow)
      raster.set(x + px + 1, y + py + 1, shadow)
    })
  }
  return forEachPixel(text, (px, py) => raster.set(x + px, y + py, color))
}

/**
 * Splits any word too wide for a line into hyphenated pieces, so that a long
 * word in a narrow seat wraps instead of running off both sides of it.
 */
export function fitWords(text: string, maxWidth: number): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (measureText(word) <= maxWidth) return word
      const pieces: string[] = []
      let piece = ''
      for (const ch of word) {
        if (piece && measureText(`${piece}${ch}-`) > maxWidth) {
          pieces.push(`${piece}-`)
          piece = ch
        } else piece += ch
      }
      if (piece) pieces.push(piece)
      return pieces.join(' ')
    })
    .join(' ')
}

/**
 * Breaks text into lines no wider than `maxWidth` art pixels, at spaces.
 * A single word wider than the line is left whole rather than split mid-word.
 */
export function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && measureText(next) > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = next
    }
  }
  if (line) lines.push(line)
  return lines
}
