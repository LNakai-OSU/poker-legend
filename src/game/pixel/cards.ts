import type { Card } from '../../engine/types'
import { Raster } from './raster'
import { shade } from './color'

/**
 * Playing cards, drawn on the art grid like everything else at the table.
 *
 * A card has to be read at a glance on a phone, so the face is the corner
 * index — a heavy two-pixel-stroke rank over a small suit — and one big suit pip,
 * on white stock with a dark one-pixel outline. The back carries the room's
 * own pattern, the way a casino prints its decks.
 */

export type CardSize = 'big' | 'small'

export const CARD_ART: Record<CardSize, { w: number; h: number }> = {
  big: { w: 22, h: 30 },
  small: { w: 14, h: 20 },
}

/** How a room prints the back of its cards. */
export interface CardBack {
  base: string
  pattern: string
  border: string
  motif: 'lattice' | 'diamonds' | 'stripes' | 'dots' | 'waves' | 'sunburst'
}

const OUTLINE = '#202028'
const STOCK = '#f8f8f0'
const STOCK_SHADE = '#d8d8e0'
const RED = '#d02030'
const BLACK = '#24242e'

const G = (spec: string): string[] => spec.split(' ')

/** Ranks in a heavy two-pixel stroke, eight rows tall. */
// prettier-ignore
const RANKS: Record<string, string[]> = {
  A: G('..##.. .####. ##..## ##..## ###### ##..## ##..## ##..##'),
  K: G('##..## ##.##. ####.. ###... ####.. ##.##. ##..## ##..##'),
  Q: G('.####. ##..## ##..## ##..## ##..## ##.### .####. ....##'),
  J: G('..#### ...##. ...##. ...##. ...##. ##.##. ##.##. .###..'),
  '10': G('.##..####. ###.##..## .##.##..## .##.##..## .##.##..## .##.##..## .##.##..## ####.####.'),
  '9': G('.####. ##..## ##..## .##### ....## ....## ##..## .####.'),
  '8': G('.####. ##..## ##..## .####. ##..## ##..## ##..## .####.'),
  '7': G('###### ....## ...##. ...##. ..##.. ..##.. ..##.. ..##..'),
  '6': G('.####. ##..## ##.... #####. ##..## ##..## ##..## .####.'),
  '5': G('###### ##.... ##.... #####. ....## ....## ##..## .####.'),
  '4': G('...##. ..###. .####. ##.##. ###### ...##. ...##. ...##.'),
  '3': G('.####. ##..## ....## ..###. ....## ....## ##..## .####.'),
  '2': G('.####. ##..## ....## ...##. ..##.. .##... ##.... ######'),
}

/** Suit pips. `#` is the suit colour, `+` a highlight, `-` a shade. */
// prettier-ignore
const PIPS: Record<Card['suit'], Record<'big' | 'small' | 'tiny', string[]>> = {
  hearts: {
    big: G('.##+...###. #+###.##### ########### ########### #########-# .#######-#. ..######-.. ...####-... ....##-.... .....#.....'),
    small: G('.##.##. #+##### ####### .#####. ..###.. ...#...'),
    tiny: G('##.## ##### .###. ..#..'),
  },
  diamonds: {
    big: G('....#.... ...###... ...#+#... ..##+##.. .#######. ######### .######-. ..####-.. ...##-... ...##-... ....#....'),
    small: G('...#... ..###.. .##+##. ####### .#####. ..###.. ...#...'),
    tiny: G('..#.. .###. ##### .###. ..#..'),
  },
  spades: {
    big: G('.....#..... ....###.... ...##+##... ..##+####.. .#########. ########### ########### ####-#-#### .##.###.##. ....###.... ..#######..'),
    small: G('...#... ..###.. .##+##. ####### ####### ...#... ..###..'),
    tiny: G('..#.. .###. ##### ..#.. .###.'),
  },
  clubs: {
    big: G('....###.... ...##+##... ...#####... ....###.... .###.#.###. ##+#####+## ########### .###.#.###. .....#..... ....###.... ..#######..'),
    small: G('..###.. ..###.. ##.#.## ####### ##.#.## ...#... ..###..'),
    tiny: G('.###. .###. ##### ..#.. .###.'),
  },
}

function suitInk(suit: Card['suit']): string {
  return suit === 'hearts' || suit === 'diamonds' ? RED : BLACK
}

function rankLabel(rank: number): string {
  return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' } as Record<number, string>)[rank] ?? String(rank)
}

/** A blank card shape: outline, and every pixel inside it set by `inside`. */
function cardShape(w: number, h: number, inside: (x: number, y: number) => string): Raster {
  const raster = new Raster(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.min(x, w - 1 - x)
      const cy = Math.min(y, h - 1 - y)
      // Rounded by one pixel at each corner.
      if (cx === 0 && cy === 0) continue
      const edge = cx === 0 || cy === 0 || (cx === 1 && cy === 1)
      raster.put(x, y, edge ? OUTLINE : inside(x, y))
    }
  }
  return raster
}

function drawPip(raster: Raster, suit: Card['suit'], size: 'big' | 'small' | 'tiny', x: number, y: number) {
  const ink = suitInk(suit)
  raster.sprite(PIPS[suit][size], x, y, {
    '#': ink,
    '+': suit === 'hearts' || suit === 'diamonds' ? '#ff8890' : '#6a6a80',
    '-': shade(ink, 0.7),
  })
}

const cache = new Map<string, string>()

/** A face-up card as a data URL at its native size. */
export function cardFaceUrl(card: Card, size: CardSize): string {
  const key = `${card.rank}${card.suit}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const { w, h } = CARD_ART[size]
  const raster = cardShape(w, h, (x, y) => (y === h - 2 || x === w - 2 ? STOCK_SHADE : STOCK))
  const ink = suitInk(card.suit)
  const label = rankLabel(card.rank)
  raster.sprite(RANKS[label], 2, 2, { '#': ink })
  if (size === 'big') {
    drawPip(raster, card.suit, 'tiny', 2, 12)
    drawPip(raster, card.suit, 'big', w - 2 - 11 - (card.suit === 'diamonds' ? -1 : 0), h - 3 - 11)
  } else {
    drawPip(raster, card.suit, 'small', w - 2 - 7 - 1, h - 3 - 7)
  }
  const url = raster.toDataURL()
  cache.set(key, url)
  return url
}

/** The back of a card, printed in the room's colours. */
export function cardBackUrl(back: CardBack, size: CardSize): string {
  const key = `back|${JSON.stringify(back)}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const { w, h } = CARD_ART[size]
  const dark = shade(back.base, 0.72)
  const raster = cardShape(w, h, (x, y) => {
    // A white border round a printed field, as on a real deck.
    const cx = Math.min(x, w - 1 - x)
    const cy = Math.min(y, h - 1 - y)
    if (cx === 1 || cy === 1) return back.border
    if (cx === 2 || cy === 2) return dark
    const px = x - 3
    const py = y - 3
    switch (back.motif) {
      case 'lattice':
        return (px + py) % 4 === 0 || (px - py + 400) % 4 === 0 ? back.pattern : back.base
      case 'diamonds': {
        const dx = Math.abs(((px + 2) % 6) - 2.5)
        const dy = Math.abs(((py + 3) % 8) - 3.5)
        return dx / 3 + dy / 4 < 0.8 ? back.pattern : back.base
      }
      case 'stripes':
        return (px + py) % 3 === 0 ? back.pattern : back.base
      case 'dots':
        return px % 3 === 1 && py % 3 === 1 ? back.pattern : back.base
      case 'waves':
        return (py + Math.round(Math.sin(px / 1.6) * 1.2) + 40) % 4 === 0 ? back.pattern : back.base
      case 'sunburst': {
        const cxm = (w - 7) / 2
        const cym = (h - 7) / 2
        const angle = Math.atan2(py - cym, px - cxm)
        return Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 16) % 2 === 0 ? back.pattern : back.base
      }
    }
  })
  // A small emblem in the middle of the big backs.
  if (size === 'big') {
    raster.sprite(G('..#.. .###. ##### .###. ..#..'), Math.floor(w / 2) - 2, Math.floor(h / 2) - 2, {
      '#': back.border,
    })
  }
  const url = raster.toDataURL()
  cache.set(key, url)
  return url
}

/** An undealt board slot: a recess in the cloth with a stitched outline. */
export function slotUrl(felt: string, size: CardSize): string {
  const key = `slot|${felt}|${size}`
  const hit = cache.get(key)
  if (hit) return hit
  const { w, h } = CARD_ART[size]
  const raster = new Raster(w, h)
  const recess = shade(felt, 0.78)
  const stitch = shade(felt, 1.35)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = Math.min(x, w - 1 - x)
      const cy = Math.min(y, h - 1 - y)
      if (cx === 0 && cy === 0) continue
      const edge = cx === 0 || cy === 0 || (cx === 1 && cy === 1)
      if (edge) {
        if ((x + y) % 2 === 0) raster.put(x, y, stitch)
      } else raster.put(x, y, recess)
    }
  }
  const url = raster.toDataURL()
  cache.set(key, url)
  return url
}
