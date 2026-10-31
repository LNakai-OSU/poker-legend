import { Raster } from './raster'
import { shade } from './color'

/**
 * Casino chips, seen from a little above: a lit top face with an inlay ring, and
 * the edge of every chip below it showing as a band with its printed spots.
 */

export interface Denomination {
  value: number
  face: string
  /** The contrasting edge spots every real chip is printed with. */
  spot: string
}

// Roughly the standard casino colours, biggest first.
export const DENOMINATIONS: Denomination[] = [
  { value: 5000, face: '#8a4fbd', spot: '#f0e6f8' },
  { value: 1000, face: '#e8b830', spot: '#2a2a36' },
  { value: 500, face: '#6a3a9a', spot: '#f2f2f6' },
  { value: 100, face: '#30303a', spot: '#f2f2f6' },
  { value: 25, face: '#289048', spot: '#f2f2f6' },
  { value: 5, face: '#c82828', spot: '#f2f2f6' },
  { value: 1, face: '#e8e8f0', spot: '#3858b8' },
]

/** Breaks an amount into chips, capped so a huge bet doesn't draw a skyscraper. */
export function chipBreakdown(amount: number, maxChips = 5): Denomination[] {
  const chips: Denomination[] = []
  let left = amount
  for (const denom of DENOMINATIONS) {
    while (left >= denom.value && chips.length < maxChips) {
      chips.push(denom)
      left -= denom.value
    }
  }
  return chips
}

export const CHIP_W = 11
const CHIP_H = 7
/** Each chip sits this much higher than the one under it. */
const STEP = 2
const OUTLINE = '#18141c'

/** Height in art pixels of a stack of `count` chips. */
export function stackHeight(count: number): number {
  return CHIP_H + STEP * Math.max(0, count - 1)
}

const cache = new Map<string, { url: string; w: number; h: number }>()

/** Vector art is drawn on a grid ten times the art pixel, so it stays sharp at any scale. */
const U = 10

const svgUrl = (body: string, w: number, h: number): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`)}`

/**
 * One chip, bottom at `bottom`, in grid units: the edge band with its printed
 * spots, then the lit top face with an inlay ring. Drawn as shapes, not pixels.
 */
function chipSvg(chip: Denomination, bottom: number): string {
  const w = CHIP_W * U
  const rx = w / 2 - 2
  const ry = 21
  const cx = w / 2
  const top = bottom - CHIP_H * U + ry + 2 // centre of the top face
  const edge = shade(chip.face, 0.6)
  const spots = (r: number, dash: string, width: number, colour: string) =>
    `<ellipse cx="${cx}" cy="${top + 22}" rx="${r}" ry="${ry}" fill="none" stroke="${colour}" stroke-width="${width}" stroke-dasharray="${dash}"/>`
  return (
    // The edge: a band under the top face, closed by the rim's lower curve.
    `<path d="M${cx - rx} ${top} v22 a${rx} ${ry} 0 0 0 ${2 * rx} 0 v-22 z" fill="${edge}" stroke="${OUTLINE}" stroke-width="3" stroke-linejoin="round"/>` +
    spots(rx - 1, '7 9', 7, chip.spot).replace(`cy="${top + 22}"`, `cy="${top + 16}"`) +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx}" ry="${ry}" fill="${chip.face}" stroke="${OUTLINE}" stroke-width="3"/>` +
    `<ellipse cx="${cx}" cy="${top}" rx="${rx - 9}" ry="${ry - 7}" fill="none" stroke="${chip.spot}" stroke-width="3.5" stroke-dasharray="9 7"/>` +
    `<ellipse cx="${cx - 12}" cy="${top - 6}" rx="${rx * 0.45}" ry="${ry * 0.38}" fill="${shade(chip.face, 1.3)}" opacity="0.55"/>`
  )
}

/** A stack of chips, bottom chip first in `chips`, as a data URL. */
export function chipStackUrl(chips: Denomination[]): { url: string; w: number; h: number } {
  const key = chips.map((c) => c.value).join(',')
  const hit = cache.get(key)
  if (hit) return hit
  const h = stackHeight(chips.length)
  const body = chips.map((chip, i) => chipSvg(chip, (h - i * STEP) * U)).join('')
  const entry = { url: svgUrl(body, CHIP_W * U, h * U), w: CHIP_W, h }
  cache.set(key, entry)
  return entry
}

/** One chip seen from straight above, with its edge spots: the raise slider's thumb. */
export function chipTopUrl(face = '#2e9450', spot = '#f2f2f6'): string {
  const key = `top|${face}|${spot}`
  const hit = cache.get(key)
  if (hit) return hit.url
  const raster = new Raster(11, 11)
  raster.sprite(
    [
      '...ooooo...',
      '..osfffso..',
      '.offllfffo.',
      'osflliiffso',
      'offliiiiffo',
      'ofiiiiiiifo',
      'offiiiiiffo',
      'osffiiiffso',
      '.offfffffo.',
      '..osfffso..',
      '...ooooo...',
    ],
    0,
    0,
    { o: OUTLINE, f: face, l: shade(face, 1.3), i: shade(face, 0.82), s: spot },
  )
  const url = raster.toDataURL()
  cache.set(key, { url, w: 11, h: 11 })
  return url
}

const GLYPHS: Record<string, string[]> = {
  S: ['.SS', 'S..', '.S.', '..S', 'SS.'],
  B: ['SS.', 'S.S', 'SS.', 'S.S', 'SS.'],
  D: ['SS.', 'S.S', 'S.S', 'S.S', 'SS.'],
}

/** A letter built from its 3 by 5 grid, centred on a 100 by 100 chip. */
function letterSvg(letter: 'S' | 'B' | 'D', colour: string, shadow: string): string {
  const cell = 11
  const x0 = 50 - (3 * cell) / 2
  const y0 = 50 - (5 * cell) / 2
  const cells = (dx: number, dy: number, fill: string) =>
    GLYPHS[letter]
      .flatMap((row, gy) => row.split('').map((c, gx) => (c === 'S' ? `<rect x="${x0 + gx * cell + dx}" y="${y0 + gy * cell + dy}" width="${cell + 0.6}" height="${cell + 0.6}" fill="${fill}"/>` : '')))
      .join('')
  return cells(2.5, 3.5, shadow) + cells(0, 0, colour)
}

/**
 * A round marker for a seat's job, drawn as vector shapes so it stays sharp at
 * any size: a rim printed with edge spots, a lit face, an inlay ring, a letter.
 */
function markerSvg(face: string, rim: string, letter: 'S' | 'B' | 'D', ink: string, inkShadow: string, ringInk = ink): string {
  return (
    `<circle cx="50" cy="52" r="47" fill="${shade(rim, 0.6)}"/>` +
    `<circle cx="50" cy="50" r="47" fill="${rim}" stroke="${OUTLINE}" stroke-width="4"/>` +
    `<circle cx="50" cy="50" r="41" fill="none" stroke="${ringInk}" stroke-width="9" stroke-dasharray="14 12.5"/>` +
    `<circle cx="50" cy="50" r="33" fill="${face}" stroke="${OUTLINE}" stroke-width="2.5"/>` +
    `<circle cx="50" cy="50" r="28" fill="none" stroke="${ink}" stroke-width="2" opacity="0.8"/>` +
    `<path d="M24 38 A30 30 0 0 1 52 20" fill="none" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.45"/>` +
    letterSvg(letter, ink, inkShadow)
  )
}

/** The dealer button: a white puck with a D on it. */
export function dealerButtonUrl(): string {
  const key = 'dealer'
  const hit = cache.get(key)
  if (hit) return hit.url
  const url = svgUrl(markerSvg('#f8f8f0', '#b8b4a6', 'D', '#24242e', '#c0bcb0', '#ffffff'), 100, 100)
  cache.set(key, { url, w: 9, h: 9 })
  return url
}

/** The discs that mark the small and big blind: the same round shape as the dealer button, so they read as a set. */
export function tableMarkerUrl(kind: 'sb' | 'bb'): string {
  const key = `marker-${kind}`
  const hit = cache.get(key)
  if (hit) return hit.url
  const face = kind === 'sb' ? '#5d8fe0' : '#e0605d'
  const rim = kind === 'sb' ? '#2c4f94' : '#942c2c'
  const url = svgUrl(markerSvg(face, rim, kind === 'sb' ? 'S' : 'B', '#f8f8f0', shade(rim, 0.7)), 100, 100)
  cache.set(key, { url, w: 9, h: 9 })
  return url
}
