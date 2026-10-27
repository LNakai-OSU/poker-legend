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

// One chip: `o` outline, `f` face, `l` lit, `i` inlay ring, `e` edge, `s` an
// edge spot. Stacked two pixels apart, the chips underneath show as a band of
// edge spots each, which is what reads as a pile.
const CHIP = [
  '..ooooooo..',
  '.offlllffo.',
  'ofliiiiilfo',
  'offfffffffo',
  'oeeeeeeeeeo',
  '.oessesseo.',
  '..ooooooo..',
]

function drawChip(raster: Raster, chip: Denomination, x: number, y: number) {
  raster.sprite(CHIP, x, y, {
    o: OUTLINE,
    f: chip.face,
    l: shade(chip.face, 1.3),
    i: chip.spot,
    e: shade(chip.face, 0.6),
    s: chip.spot,
  })
}

const cache = new Map<string, { url: string; w: number; h: number }>()

/** A stack of chips, bottom chip first in `chips`, as a data URL. */
export function chipStackUrl(chips: Denomination[]): { url: string; w: number; h: number } {
  const key = chips.map((c) => c.value).join(',')
  const hit = cache.get(key)
  if (hit) return hit
  const h = stackHeight(chips.length)
  const raster = new Raster(CHIP_W, h)
  chips.forEach((chip, i) => {
    // The first chip is at the bottom, and later ones are drawn over it.
    drawChip(raster, chip, 0, h - CHIP_H - i * STEP)
  })
  const entry = { url: raster.toDataURL(), w: CHIP_W, h }
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

/** The dealer button: a white puck with a D on it. */
export function dealerButtonUrl(): string {
  const key = 'dealer'
  const hit = cache.get(key)
  if (hit) return hit.url
  const raster = new Raster(9, 9)
  raster.sprite(
    [
      '..ooooo..',
      '.owwwwwo.',
      'owwDDwwwo',
      'owwDwDwgo',
      'owwDwDwgo',
      'owwDDwwgo',
      'owwwwwggo',
      '.oggggggo',
      '..ooooo..',
    ],
    0,
    0,
    { o: OUTLINE, w: '#f8f8f0', g: '#c0bcb0', D: '#24242e' },
  )
  const url = raster.toDataURL()
  cache.set(key, { url, w: 9, h: 9 })
  return url
}

const GLYPHS: Record<string, string[]> = {
  S: ['.SS', 'S..', '.S.', '..S', 'SS.'],
  B: ['SS.', 'S.S', 'SS.', 'S.S', 'SS.'],
}

/**
 * The little discs that mark a seat's job: the dealer button (D), and the small
 * and big blind (S, B) — the same round shape so they read as a set.
 */
export function tableMarkerUrl(kind: 'sb' | 'bb'): string {
  const key = `marker-${kind}`
  const hit = cache.get(key)
  if (hit) return hit.url
  const face = kind === 'sb' ? '#5d8fe0' : '#e0605d'
  const rim = kind === 'sb' ? '#2c4f94' : '#942c2c'
  const ink = '#f8f8f0'
  const rows = [
    '..ooooo..',
    '.offffro.',
    'offffffro',
    'offffffro',
    'offffffro',
    'offffffro',
    'offffffro',
    '.orrrrro.',
    '..ooooo..',
  ].map((r) => r.split(''))
  const glyph = GLYPHS[kind === 'sb' ? 'S' : 'B']
  glyph.forEach((g, gy) => {
    g.split('').forEach((c, gx) => {
      if (c !== '.') rows[2 + gy][3 + gx] = 'S'
    })
  })
  const raster = new Raster(9, 9)
  raster.sprite(rows.map((r) => r.join('')), 0, 0, { o: OUTLINE, f: face, r: rim, S: ink })
  const url = raster.toDataURL()
  cache.set(key, { url, w: 9, h: 9 })
  return url
}
