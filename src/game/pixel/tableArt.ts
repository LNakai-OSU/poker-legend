import type { Emblem, TableTheme } from '../tableThemes'
import { dither, hash2, mix, shade } from './color'
import { Raster } from './raster'

/**
 * The table itself, painted at the felt's native art size.
 *
 * An oval card table seen from a little above: a padded rail lit from the top,
 * a strip of trim, cloth that is brighter under the lamp and darker where the
 * rail shades it, the printed betting line, and the front face of the table
 * showing under the near rail so it stands in the room rather than floating on
 * it. Each room's materials change how the rail is drawn — leather with a seam,
 * worn wood, woven rattan, black gloss, polished gold — not only its colour.
 */

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

/** The front face of the table under the near rail. */
export const APRON = 6

const OUTLINE = '#120c0c'
const EXPONENT = 3.1

function superellipse(dx: number, dy: number, a: number, b: number): number {
  return Math.pow(Math.pow(Math.abs(dx / a), EXPONENT) + Math.pow(Math.abs(dy / b), EXPONENT), 1 / EXPONENT)
}

function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.x - margin < b.x + b.w && b.x - margin < a.x + a.w && a.y - margin < b.y + b.h && b.y - margin < a.y + a.h
}

/** How thick the rail is for a table of this size. */
export function railThickness(w: number, h: number): number {
  return Math.max(7, Math.min(11, Math.round(Math.min(w, h * 1.6) * 0.024)))
}

export function paintTable(theme: TableTheme, w: number, h: number, occupied: Rect[] = []): Raster {
  return theme.table.shape === 'kitchen' ? paintKitchenTable(theme, w, h, occupied) : paintOval(theme, w, h, occupied)
}

function paintOval(theme: TableTheme, w: number, h: number, occupied: Rect[]): Raster {
  const t = theme.table
  const r = new Raster(w, h)
  const topH = h - APRON
  const cx = w / 2
  const cy = topH / 2
  const a = w / 2 - 1.5
  const b = topH / 2 - 1.5
  const R = railThickness(w, h)
  const trimW = t.trimStyle === 'neon' ? 1 : 2
  const fa = a - R - trimW
  const fb = b - R - trimW

  // The cloth's lamp pool and the rail's shadow are both functions of how far a
  // pixel is from the middle of the cloth, so that is worked out once per pixel.
  const railBase = (v: number) => (v > 0.45 ? mix(t.rail, t.railDark, 0.28) : t.rail)

  // Lowest point of the tabletop in each column, for the apron underneath it.
  const bottomOf = new Int32Array(w).fill(-1)

  for (let y = 0; y < topH; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - cx
      const dy = y + 0.5 - cy
      const dOut = superellipse(dx, dy, a, b)
      if (dOut > 1) continue
      bottomOf[x] = Math.max(bottomOf[x], y)
      const dRail = superellipse(dx, dy, a - R, b - R)
      const v = dy / b
      if (dRail > 1) {
        // The rail: 0 at its inner edge, 1 at the outer.
        const across = (dRail - 1) / (dRail - 1 + (1 - dOut))
        r.put(x, y, railPixel(t, x, y, across, v, railBase(v)))
        continue
      }
      const dFelt = superellipse(dx, dy, fa, fb)
      if (dFelt > 1) {
        r.put(x, y, trimPixel(t, x, y, dFelt, v))
        continue
      }
      r.put(x, y, feltPixel(t, x, y, dx / fa, dy / fb, dFelt))
    }
  }

  // The printed betting line, two-thirds of the way out.
  const la = fa * 0.72
  const lb = fb * 0.66
  const inLine = (x: number, y: number) => superellipse(x + 0.5 - cx, y + 0.5 - cy, la, lb) <= 1
  for (let y = 1; y < topH - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (!inLine(x, y)) continue
      if (!inLine(x - 1, y) || !inLine(x + 1, y) || !inLine(x, y - 1) || !inLine(x, y + 1)) {
        const dashed = t.trimStyle === 'neon' ? (x + y) % 3 !== 0 : t.railStyle === 'wood' ? (x + y) % 4 < 2 : true
        if (dashed) r.put(x, y, t.line)
      }
    }
  }

  // The front of the table, under the near rail.
  for (let x = 0; x < w; x++) {
    const top = bottomOf[x]
    if (top < cy) continue
    for (let k = 1; k <= APRON; k++) {
      const y = top + k
      if (y >= h) break
      const c = k === 1 ? t.railDark : k === APRON ? OUTLINE : mix(t.railDark, '#000000', 0.25 + (k / APRON) * 0.35)
      r.put(x, y, c)
    }
  }

  // Decoration that depends on the rail: brass studs, a stitched seam.
  if (t.trimStyle === 'studs') {
    const studA = a - R * 0.42
    const studB = b - R * 0.42
    const steps = Math.round((2 * Math.PI * Math.sqrt((studA * studA + studB * studB) / 2)) / 14)
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2
      const c = Math.cos(angle)
      const s = Math.sin(angle)
      const k = Math.pow(Math.pow(Math.abs(c / studA), EXPONENT) + Math.pow(Math.abs(s / studB), EXPONENT), -1 / EXPONENT)
      const sx = Math.round(cx + c * k - 0.5)
      const sy = Math.round(cy + s * k - 0.5)
      r.put(sx, sy, t.trim)
      r.put(sx + 1, sy, shade(t.trim, 0.65))
      r.put(sx, sy - 1, mix(t.trim, '#ffffff', 0.55))
    }
  }

  drawEmblems(r, t.emblem, t, { cx, cy, fa, fb, la, lb }, occupied)
  r.outline(OUTLINE)
  return r
}

function railPixel(t: TableTheme['table'], x: number, y: number, across: number, v: number, base: string): string {
  // The crest of the rail catches the light on whichever side faces up the screen.
  const crest = 0.5 - 0.28 * v
  const fromCrest = across - crest
  switch (t.railStyle) {
    case 'gloss': {
      if (Math.abs(fromCrest) < 0.09) return mix(t.railLight, '#ffffff', 0.45)
      if (Math.abs(fromCrest + 0.25) < 0.07) return t.railLight
      return fromCrest > 0.25 ? t.railDark : base
    }
    case 'gold': {
      if (Math.abs(fromCrest) < 0.08) return mix(t.railLight, '#fffbe8', 0.6)
      if (Math.abs(fromCrest) < 0.2) return t.railLight
      if (fromCrest > 0.32 || across < 0.08) return t.railDark
      return base
    }
    case 'wood': {
      // Grain runs along the rail; knots break it up.
      const grain = Math.floor(across * 6) % 2 === 0
      const knot = hash2(x >> 2, y >> 1, 7) < 0.03
      if (knot) return t.railDark
      if (Math.abs(fromCrest) < 0.12) return t.railLight
      if (fromCrest > 0.3) return t.railDark
      return grain ? base : mix(base, t.railDark, 0.35)
    }
    case 'rattan': {
      // A woven cane: two-by-two blocks, alternating direction.
      const weave = (((x >> 1) + (y >> 1)) & 1) === 0
      const light = weave ? t.railLight : t.rail
      if (fromCrest > 0.34 || across < 0.06) return t.railDark
      if ((x + y) % 4 === 0) return mix(light, t.railDark, 0.45)
      return light
    }
    default: {
      // Leather: soft shading and a stitched seam along the crest.
      if (Math.abs(fromCrest) < 0.06 && (x + (y >> 1)) % 3 === 0) return mix(t.railLight, '#ffffff', 0.25)
      if (Math.abs(fromCrest) < 0.18) return t.railLight
      if (fromCrest > 0.3 || across < 0.06) return t.railDark
      return base
    }
  }
}

function trimPixel(t: TableTheme['table'], x: number, y: number, dFelt: number, v: number): string {
  switch (t.trimStyle) {
    case 'rope':
      return (x + y) % 4 < 2 ? t.trim : shade(t.trim, 0.68)
    case 'neon':
      return mix(t.trim, '#ffffff', 0.35)
    default: {
      // Two bands: the lit one outside, a darker one where it meets the cloth.
      const inner = dFelt < 1.012
      const lit = v < 0 ? mix(t.trim, '#ffffff', 0.18) : t.trim
      return inner ? shade(t.trim, 0.62) : lit
    }
  }
}

function feltPixel(t: TableTheme['table'], x: number, y: number, nx: number, ny: number, dFelt: number): string {
  // Into the rail's shadow near the edge; under the lamp in the middle.
  if (dFelt > 0.965) return dither(x, y, 0.75) ? t.feltDark : t.felt
  if (dFelt > 0.93) return dither(x, y, 0.35) ? t.feltDark : t.felt
  if (t.trimStyle === 'neon' && dFelt > 0.9) return dither(x, y, 0.3) ? mix(t.felt, t.trim, 0.35) : t.felt
  const fromCentre = Math.sqrt(nx * nx * 0.8 + ny * ny * 1.1)
  const pool = Math.max(0, 0.62 - fromCentre) / 0.62
  if (pool > 0 && dither(x, y, pool * 0.85)) return t.feltLight
  // The weave of the cloth.
  const n = hash2(x, y, 3)
  if (n < 0.045) return mix(t.felt, t.feltLight, 0.5)
  if (n > 0.965) return mix(t.felt, t.feltDark, 0.5)
  return t.felt
}

// ---------------------------------------------------------------------------
// Emblems: the house's mark, printed into the cloth where a seat is not.
// ---------------------------------------------------------------------------

const E = (spec: string): string[] => spec.split(' ')
// prettier-ignore
const EMBLEMS: Record<Exclude<Emblem, 'none'>, string[]> = {
  horseshoe: E('..######.. .########. ###....### ##......## ##......## #+......+# ##......## ##......## #+......+# ##......## ###....### ###....###'),
  wheel: E('....##.... ..#.##.#.. .#..##..#. #...##...# ########## ########## #...##...# .#..##..#. ..#.##.#.. ....##....'),
  compass: E('.....#..... .....#..... ....###.... #...###...# .#.#####.#. ########### .#.#####.#. #...###...# ....###.... .....#..... .....#.....'),
  palm: E('.###..###.. #####.####. ##..###..## .....#..... ....##..... ....#...... ...##...... ...#....... ..##....... .####......'),
  star: E('.....#..... ....###.... ....###.... ########### .#########. ..#######.. ..###.###.. .##.....##. ##.......##'),
  sunburst: E('#....#....# .#...#...#. ..#..#..#.. ...#####... ..#######.. ###########'),
  crown: E('#....#....# ##..###..## ###.###.### ########### ########### .#########. .#########.'),
  laurel: E('.+.........+. ##.........## .#+.......+#. ##.........## .##.......##. ##+.......+## .##.......##. ..##.....##.. ...##...##... ....#####....'),
}

function drawEmblems(
  r: Raster,
  emblem: Emblem,
  t: TableTheme['table'],
  g: { cx: number; cy: number; fa: number; fb: number; la: number; lb: number },
  occupied: Rect[],
) {
  if (emblem === 'none') return
  const rows = EMBLEMS[emblem].map((row) => row.trim())
  const ew = rows[0].length * 2
  const eh = rows.length * 2
  const ink = mix(t.felt, t.line, 0.55)
  const hi = mix(t.felt, '#ffffff', 0.12)
  const shadow = mix(t.felt, '#000000', 0.18)
  const at = (x: number, y: number) => ({ x: Math.round(x - ew / 2), y: Math.round(y - eh / 2), w: ew, h: eh })
  // The house prints its mark in pairs, one at each end of the cloth, wherever
  // a pair of spots is clear of every seat and card; failing that, once in the
  // middle.
  const pairs = [
    [at(g.cx - g.la * 0.78, g.cy), at(g.cx + g.la * 0.78, g.cy)],
    [at(g.cx - g.fa * 0.56, g.cy + g.fb * 0.46), at(g.cx + g.fa * 0.56, g.cy + g.fb * 0.46)],
    [at(g.cx - g.fa * 0.6, g.cy - g.fb * 0.4), at(g.cx + g.fa * 0.6, g.cy - g.fb * 0.4)],
    [at(g.cx, g.cy + g.fb * 0.55)],
    [at(g.cx, g.cy)],
  ]
  const clear = (rect: Rect) => !occupied.some((o) => overlaps(o, rect, 4))
  const chosen = pairs.find((pair) => pair.every(clear))
  for (const spot of chosen ?? []) {
    rows.forEach((row, yy) => {
      for (let xx = 0; xx < row.length; xx++) {
        const c = row[xx]
        if (c === '.' || c === ' ') continue
        // A pixel of shadow down and right, as if printed slightly into the nap.
        r.rect(spot.x + xx * 2 + 1, spot.y + yy * 2 + 1, 2, 2, shadow)
      }
    })
    rows.forEach((row, yy) => {
      for (let xx = 0; xx < row.length; xx++) {
        const c = row[xx]
        if (c === '.' || c === ' ') continue
        r.rect(spot.x + xx * 2, spot.y + yy * 2, 2, 2, c === '+' ? hi : ink)
      }
    })
  }
}

// ---------------------------------------------------------------------------
// Marcus's kitchen table.
// ---------------------------------------------------------------------------

function paintKitchenTable(theme: TableTheme, w: number, h: number, occupied: Rect[]): Raster {
  const t = theme.table
  const r = new Raster(w, h)
  const topH = h - APRON
  const radius = 7
  const plank = 11
  for (let y = 1; y < topH; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Rounded corners.
      const cxd = Math.max(0, radius - x, x - (w - 1 - radius))
      const cyd = Math.max(0, radius - y, y - (topH - 1 - radius))
      if (cxd * cxd + cyd * cyd > radius * radius) continue
      const edge = y <= 2 || x <= 2 || x >= w - 3
      const row = Math.floor((y - 3) / plank)
      const inRow = (y - 3) % plank
      // Planks run the length of the table, butted end to end at staggered seams.
      const seamX = ((row * 97) % 140) + 40
      const seam = inRow === plank - 1 || (x % 180 === seamX % 180 && inRow >= 0)
      let c = t.felt
      if (edge) c = y <= 2 ? t.feltLight : t.feltDark
      else if (seam) c = t.feltDark
      else {
        // Grain: long thin streaks, and the odd knot.
        const g = hash2(Math.floor(x / 9) + row * 31, inRow, 11)
        if (g < 0.22) c = mix(t.felt, t.line, 0.6)
        else if (g > 0.9) c = mix(t.felt, t.feltLight, 0.6)
        if (hash2(x >> 2, y >> 2, row) < 0.004) c = t.feltDark
        // The lamp over the table: brighter towards the middle.
        const nx = (x - w / 2) / (w / 2)
        const ny = (y - topH / 2) / (topH / 2)
        const pool = Math.max(0, 0.7 - Math.sqrt(nx * nx * 0.7 + ny * ny)) / 0.7
        if (dither(x, y, pool * 0.5)) c = mix(c, t.feltLight, 0.6)
      }
      r.put(x, y, c)
    }
  }
  // The front edge of the tabletop and the apron under it.
  for (let x = 1; x < w - 1; x++) {
    let top = -1
    for (let y = topH - 1; y >= 0; y--) {
      if (!r.isClear(x, y)) {
        top = y
        break
      }
    }
    if (top < 0) continue
    for (let k = 1; k <= APRON; k++) {
      const c = k === 1 ? t.feltDark : k === APRON ? OUTLINE : mix(t.rail, '#000000', (k / APRON) * 0.4)
      r.put(x, top + k, c)
    }
  }
  drawKitchenProps(r, w, topH, occupied)
  r.outline(OUTLINE)
  return r
}

/** What is on a kitchen table on a Friday night, wherever the cards are not. */
function drawKitchenProps(r: Raster, w: number, topH: number, occupied: Rect[]) {
  const props: { rows: string[]; palette: Record<string, string> }[] = [
    {
      // A bowl of pretzels.
      rows: [
        '....oooooooooooooo....',
        '..oolpbppbpppbppbloo..',
        '.olppbpppbppbpppbpplo.',
        'olbppppbpppbppppbppblo',
        'olppbpppbpppbpppbppplo',
        'oowwwwwwwwwwwwwwwwwwoo',
        '.osssssssssssssssssdo.',
        '..osssssssssssssssdo..',
        '...oossssssssssssoo...',
        '.....oooooooooooo.....',
      ],
      palette: { o: '#2a2018', l: '#e8f0f8', w: '#c8d8e8', p: '#c88a40', b: '#8a5420', s: '#5a88c8', d: '#3a5a98' },
    },
    {
      // Two bottles of beer, one already empty.
      rows: [
        '..oo.....oo..',
        '..cc.....cc..',
        '..oo.....oo..',
        '..gg.....gg..',
        '.oggo...oggo.',
        'oggwgo.oggwgo',
        'oggwgo.oggwgo',
        'oggggo.oggggo',
        'olllgo.olllgo',
        'olrlgo.olrlgo',
        'olllgo.olllgo',
        'oggggo.oggggo',
        'oggggo.oggggo',
        '.oooo...oooo.',
      ],
      palette: { o: '#14140c', c: '#d8b040', g: '#3a6a28', w: '#a8d888', l: '#f0e0b0', r: '#c83828' },
    },
    {
      // A mug of coffee gone cold, and a spoon.
      rows: [
        '.oooooooooo...',
        'ocdddddddddo..',
        'ommmmmmmmmmooo',
        'omhmmmmmmmmo.o',
        'omhmmmmmmmmo.o',
        'ommmmmmmmmmooo',
        'ommmmmmmmmmo..',
        '.oooooooooo...',
      ],
      palette: { o: '#2a1a14', c: '#5a3018', d: '#7a4a28', m: '#e86a4a', h: '#f8a888' },
    },
  ]
  const spots = [
    { x: 12, y: topH - 30 },
    { x: w - 26, y: topH - 32 },
    { x: Math.round(w / 2) - 7, y: 12 },
    { x: 14, y: 14 },
    { x: w - 28, y: 14 },
  ]
  let next = 0
  for (const spot of spots) {
    if (next >= props.length) break
    const prop = props[next]
    const rect = { x: spot.x, y: spot.y, w: prop.rows[0].length, h: prop.rows.length }
    if (occupied.some((o) => overlaps(o, rect, 3))) continue
    // A shadow on the wood first, down and to the right of the light.
    r.sprite(prop.rows, rect.x + 1, rect.y + 1, Object.fromEntries(Object.keys(prop.palette).map((k) => [k, '#5a3418'])))
    r.sprite(prop.rows, rect.x, rect.y, prop.palette)
    next++
  }
}
