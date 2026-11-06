import type { TableTheme } from '../tableThemes'
import { dither, hash2, mix, shade } from './color'
import { drawText, measureText } from './font'
import { Raster, pack } from './raster'
import { colorOf, WHEEL_ORDER } from '../../engine/roulette'

/**
 * The pixel art of the three casino games that are not poker: the room each is
 * played in, the slot cabinet and its symbols, the dice, and the roulette wheel.
 *
 * Painted at art size and scaled up whole pixels at a time, the way the poker
 * table is, from the same room theme — so the cloth and rail of a craps table in
 * Palm Cay are the cloth and rail of a poker table in Palm Cay.
 */

const OUTLINE = '#120c0c'
const GOLD = '#f0c040'

/** Fills a polygon, one scanline at a time. */
function fillPoly(r: Raster, points: Array<[number, number]>, ink: string): void {
  const ys = points.map((p) => p[1])
  const top = Math.floor(Math.min(...ys))
  const bottom = Math.ceil(Math.max(...ys))
  for (let y = top; y < bottom; y++) {
    const yy = y + 0.5
    const xs: number[] = []
    for (let i = 0; i < points.length; i++) {
      const [x1, y1] = points[i]
      const [x2, y2] = points[(i + 1) % points.length]
      if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) xs.push(x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1))
    }
    xs.sort((a, b) => a - b)
    for (let i = 0; i + 1 < xs.length; i += 2) r.rect(Math.round(xs[i]), y, Math.round(xs[i + 1]) - Math.round(xs[i]), 1, ink)
  }
}

/** A light thrown on the room: brightens (or darkens) round a point, fading out. */
function glow(r: Raster, cx: number, cy: number, rx: number, ry: number, hex: string, strength: number): void {
  r.each(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => {
    const d = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry)
    if (d >= 1) return null
    const a = Math.round(strength * (1 - d) * (1 - d) * 255)
    return a > 0 ? pack(hex, a) : null
  })
}

// ---------------------------------------------------------------------------
// The room
// ---------------------------------------------------------------------------

export type HallKind = 'slots' | 'craps' | 'roulette' | 'horses' | 'lottery' | 'coinflip' | 'boxing'

/** The casino a game is played in: wall, carpet and the lights of the room. */
export function paintHall(kind: HallKind, theme: TableTheme, w: number, h: number): Raster {
  const r = new Raster(w, h)
  const t = theme.table
  const wallH = Math.round(h * 0.44)
  const wallBase = mix(t.railDark, '#0a0710', 0.5)
  const wallLight = mix(t.rail, '#1c1018', 0.62)
  const carpet = mix(theme.ui.band, '#14081a', 0.84)
  const carpetLight = mix(theme.ui.band, '#2a1228', 0.7)

  // The wall: striped paper over a panelled dado.
  const dadoTop = wallH - 18
  r.each(0, 0, w, wallH, (x, y) => {
    if (y >= dadoTop) {
      const panel = (x + 8) % 28
      const edge = panel < 2 || panel > 25 || y === dadoTop || y === dadoTop + 1
      const base = mix(t.railDark, '#06040a', 0.42)
      if (y === dadoTop) return mix(t.railLight, '#000000', 0.45)
      return edge ? shade(base, 0.62) : shade(base, y > dadoTop + 9 ? 0.92 : 1.05)
    }
    const stripe = Math.floor(x / 6) % 2 === 0
    const fade = 1 - (y / dadoTop) * 0.3
    const c = stripe ? wallLight : wallBase
    return shade(dither(x, y, 0.35) ? c : shade(c, 0.94), fade)
  })
  r.hline(0, dadoTop - 1, w, mix(t.railLight, '#ffffff', 0.15))
  r.hline(0, 0, w, shade(wallBase, 0.5))
  r.hline(0, 1, w, shade(wallBase, 0.7))
  r.hline(0, wallH - 1, w, '#06040a')

  // The carpet, in a diamond lattice, brighter under the table than in the corners.
  r.each(0, wallH, w, h - wallH, (x, y) => {
    const u = (x + y) % 14
    const v = (x - y + 1400) % 14
    const lattice = u < 1 || v < 1
    const dot = u === 7 && v === 7
    const base = lattice ? carpetLight : dot ? mix(theme.ui.accent, carpet, 0.65) : carpet
    return dither(x, y, 0.2) ? shade(base, 0.9) : base
  })
  glow(r, w / 2, wallH + (h - wallH) * 0.5, w * 0.62, (h - wallH) * 0.9, mix(theme.ui.accent, '#ffffff', 0.35), 0.28)
  r.rect(0, wallH, w, 2, '#06040a')
  r.each(0, wallH + 2, w, 4, (_x, y) => pack('#000000', 130 - (y - wallH - 2) * 30))

  if (kind === 'slots') paintSlotsWall(r, theme, w, wallH)
  else if (kind === 'craps') paintCrapsWall(r, theme, w, wallH)
  else if (kind === 'lottery') paintLotteryWall(r, theme, w)
  else if (kind === 'coinflip') paintAlleyWall(r, w, wallH)
  else if (kind === 'boxing') paintArenaWall(r, theme, w, wallH)
  else paintRouletteWall(r, theme, w, wallH)

  // Darker toward the corners, so the table is where the eye goes.
  r.each(0, 0, w, h, (x, y) => {
    const d = Math.hypot((x - w / 2) / (w * 0.75), (y - h * 0.55) / (h * 0.85))
    return d > 0.62 ? pack('#000000', Math.min(120, Math.round((d - 0.62) * 230))) : null
  })
  return r
}

/** A brass wall light: a bracket, a glass shade, and the pool it throws. */
function sconce(r: Raster, x: number, y: number, tint: string): void {
  glow(r, x, y + 4, 22, 26, tint, 0.34)
  r.sprite(
    [
      '.bbbb.',
      '.bggb.',
      'bgyygb',
      'bgyygb',
      '.byyb.',
      '..bb..',
      '..dd..',
    ],
    x - 3,
    y - 2,
    { b: '#8a6a2a', g: '#f0d890', y: '#fff6c8', d: '#5a4018' },
  )
}

function paintSlotsWall(r: Raster, theme: TableTheme, w: number, wallH: number): void {
  // Rows of machines standing off down the hall, their screens the only light.
  const hues = [theme.ui.accent, '#38d8e8', '#f060c0', '#68e078']
  const baseY = wallH - 2
  for (let x = 4, i = 0; x < w - 14; x += 19, i++) {
    const tall = 24 + Math.floor(hash2(i, 3) * 4)
    const hue = hues[Math.floor(hash2(i, 5) * hues.length)]
    const y = baseY - tall
    r.rect(x, y, 15, tall, '#1a1422')
    r.rect(x + 1, y + 1, 13, 7, shade(hue, 0.5))
    r.rect(x + 2, y + 2, 11, 5, mix(hue, '#000000', 0.2))
    for (let k = 0; k < 3; k++) r.rect(x + 3 + k * 4, y + 3, 3, 3, hash2(i, k + 9) < 0.33 ? '#fff3b0' : shade(hue, 0.7))
    r.rect(x + 1, y + 10, 13, 10, '#241a30')
    r.rect(x + 2, y + 11, 11, 3, shade(hue, 0.55))
    r.rect(x + 3, y + 16, 9, 2, '#3a2a48')
    r.box(x, y, 15, tall, OUTLINE)
    glow(r, x + 7, y + 6, 14, 12, hue, 0.2)
  }
  for (let x = 40; x < w - 40; x += 110) sconce(r, x, 12, '#ffd890')
}

function paintCrapsWall(r: Raster, theme: TableTheme, w: number, wallH: number): void {
  for (let x = 28; x < w - 20; x += 96) {
    // A framed sign of the kind every pit has: house rules, in gold.
    r.rect(x, 27, 34, 20, '#1a1010')
    r.box(x, 27, 34, 20, GOLD)
    r.box(x + 2, 29, 30, 16, shade(GOLD, 0.55))
    drawText(r, '7 11', x + 6, 32, '#f8e6a0')
    drawText(r, '2 3 12', x + 4, 38, '#c06060')
  }
  for (let x = 6; x < w; x += 96) sconce(r, x, 12, '#ffd890')
  // The pendant lamp over the table, its cone of light falling on the felt.
  const lx = Math.round(w / 2)
  for (let y = 0; y < 6; y++) r.put(lx, y, '#2a2018')
  fillPoly(r, [[lx - 3, 6], [lx + 4, 6], [lx + 12, 16], [lx - 11, 16]], mix(theme.table.rail, '#101010', 0.35))
  r.hline(lx - 11, 16, 23, theme.table.railLight)
  r.rect(lx - 9, 17, 19, 1, '#fff4c0')
  glow(r, lx, wallH + 12, w * 0.4, wallH * 1.4, '#ffe8a0', 0.2)
  void theme
}

/** A corner shop's back wall: shelves of stock under a hot-pink LOTTO sign. */
function paintLotteryWall(r: Raster, theme: TableTheme, w: number): void {
  const cx = Math.round(w / 2)
  for (let x = 4; x < w - 20; x += 24) {
    for (let row = 0; row < 3; row++) {
      const y = 22 + row * 9
      r.rect(x, y + 6, 20, 2, '#5a4030')
      for (let k = 0; k < 5; k++) r.rect(x + 1 + k * 4, y + 1, 3, 5, ['#d82a2a', '#f2c84a', '#2a8a48', '#3a6ad8', '#f4f0e4'][(k + row + x) % 5])
    }
  }
  r.rect(cx - 34, 4, 68, 15, '#14081a')
  r.box(cx - 34, 4, 68, 15, '#ff4fd8')
  drawText(r, 'LOTTO', cx - measureText('LOTTO') / 2, 8, '#ffd2f6')
  glow(r, cx, 12, 60, 24, '#ff4fd8', 0.3)
  sconce(r, 10, 12, '#ffd890')
  sconce(r, w - 12, 12, '#ffd890')
  void theme
}

/** A brick alley at night: a wall, a lamp, a dumpster and a stack of crates. */
function paintAlleyWall(r: Raster, w: number, wallH: number): void {
  r.each(0, 0, w, wallH, (x, y) => {
    const row = Math.floor(y / 5)
    const off = (row % 2) * 6
    const mortar = y % 5 === 0 || (x + off) % 12 === 0
    const base = mortar ? '#1a1014' : dither(x, y, 0.4) ? '#3a2220' : '#33201e'
    return shade(base, 1 - (y / wallH) * 0.25)
  })
  const lx = Math.round(w * 0.18)
  glow(r, lx, 20, 50, 46, '#ffd890', 0.4)
  r.rect(lx - 1, 4, 3, 14, '#2a2a30')
  r.rect(lx - 5, 16, 11, 3, '#2a2a30')
  r.rect(lx - 4, 19, 9, 2, '#fff0b0')
  const dx = Math.round(w * 0.62)
  r.rect(dx, wallH - 22, 34, 22, '#1e3a2a')
  r.rect(dx, wallH - 22, 34, 4, '#2a5a3a')
  r.box(dx, wallH - 22, 34, 22, OUTLINE)
  for (let i = 0; i < 3; i++) r.rect(dx + 40 + i * 9, wallH - 10 - (i % 2) * 8, 8, 10 + (i % 2) * 8, '#6a4a2a')
}

/** The arena's far wall: banners, a rack of white lights and the dark of the stands. */
function paintArenaWall(r: Raster, theme: TableTheme, w: number, wallH: number): void {
  r.rect(0, 0, w, wallH, '#0a0814')
  for (let y = 18; y < wallH - 2; y += 6) {
    for (let x = (y / 6) % 2 ? 2 : 6; x < w - 2; x += 8) {
      r.rect(x, y, 4, 3, hash2(x, y) < 0.5 ? '#1e1830' : '#2a2240')
      if (hash2(y, x) < 0.14) r.rect(x + 1, y - 2, 2, 2, ['#f4d4b4', '#c08654', '#74482c'][Math.floor(hash2(x, 7) * 3)])
    }
  }
  const banners = ['#d82a2a', '#2a6ad8', '#f2c84a', '#30a050']
  for (let x = 16, i = 0; x < w - 24; x += Math.max(48, Math.round(w / 5)), i++) {
    r.rect(x, 3, 18, 22, banners[i % 4])
    r.box(x, 3, 18, 22, GOLD)
    r.rect(x + 6, 9, 6, 6, '#fff4c8')
  }
  for (let x = 6; x < w; x += 20) {
    r.rect(x, 0, 6, 3, '#e8e8f0')
    glow(r, x + 3, 4, 20, 36, '#fff4d0', 0.14)
  }
  void theme
}

function paintRouletteWall(r: Raster, theme: TableTheme, w: number, wallH: number): void {
  // Velvet drapes, folded: a column of cloth lit along its crests.
  const velvet = '#7a1424'
  const drape = (x0: number, x1: number) => {
    r.each(x0, 0, x1 - x0, wallH, (x, y) => {
      const fold = 0.5 + 0.5 * Math.sin((x - x0) * 0.72 + Math.sin(y * 0.05) * 0.8)
      const base = shade(velvet, 0.55 + fold * 0.7)
      return y < 5 ? shade(GOLD, 0.6 + (x % 3) * 0.1) : dither(x, y, 0.15) ? shade(base, 0.93) : base
    })
  }
  const dw = Math.max(18, Math.min(60, Math.round(w * 0.12)))
  drape(0, dw)
  drape(w - dw, w)
  r.vline(dw, 0, wallH, '#2a0810')
  r.vline(w - dw - 1, 0, wallH, '#2a0810')
  // The chandelier: a ring of lit candles on a brass hoop.
  const cx = Math.round(w / 2)
  glow(r, cx, 14, w * 0.3, wallH * 0.95, '#ffe0a0', 0.32)
  r.hline(cx - 14, 14, 29, '#8a6a2a')
  r.hline(cx - 13, 13, 27, GOLD)
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 4
    r.rect(x, 9, 1, 4, '#f4ecd8')
    r.put(x, 8, '#fff6b0')
    r.put(x, 7, '#f8a838')
    r.put(x, 15 + (Math.abs(i) % 2), '#fff4c0')
  }
  for (let y = 0; y < 7; y++) r.put(cx, y, '#8a6a2a')
  void theme
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

/** One symbol of the reels' strip. */
export const SYMBOL_W = 26
export const SYMBOL_H = 18

type SymbolPainter = (r: Raster, ox: number, oy: number) => void

function disc(r: Raster, cx: number, cy: number, rad: number, ink: string): void {
  r.ellipse(cx - rad, cy - rad, rad * 2, rad * 2, ink)
}

const SYMBOL_PAINTERS: Record<string, SymbolPainter> = {
  cherry: (r, ox, oy) => {
    // Two stems from the leaf, two fruit with a lit spot each.
    for (let i = 0; i < 8; i++) {
      r.put(ox + 12 - Math.floor(i * 0.5), oy + 2 + i, '#5a8a2a')
      r.put(ox + 14 + Math.floor(i * 0.55), oy + 2 + i, '#5a8a2a')
    }
    r.sprite(['..gg', '.ggg', 'gggg'], ox + 12, oy + 0, { g: '#48a838' })
    for (const [cx, cy] of [[ox + 8, oy + 12], [ox + 17, oy + 12]] as const) {
      disc(r, cx, cy, 5, OUTLINE)
      disc(r, cx, cy, 4, '#d42a2a')
      r.ellipse(cx - 2, cy + 1, 5, 3, '#a81818')
      r.rect(cx - 2, cy - 2, 2, 2, '#ffd0d0')
      r.put(cx - 1, cy - 3, '#ffffff')
    }
  },
  bell: (r, ox, oy) => {
    const cx = ox + 13
    fillPoly(r, [[cx - 2, oy + 1], [cx + 3, oy + 1], [cx + 7, oy + 6], [cx + 9, oy + 14], [cx - 8, oy + 14], [cx - 6, oy + 6]], OUTLINE)
    fillPoly(r, [[cx - 1, oy + 2], [cx + 2, oy + 2], [cx + 6, oy + 7], [cx + 8, oy + 13], [cx - 7, oy + 13], [cx - 5, oy + 7]], '#f0b830')
    fillPoly(r, [[cx + 3, oy + 4], [cx + 6, oy + 8], [cx + 8, oy + 13], [cx + 3, oy + 13]], '#c88820')
    r.rect(cx - 4, oy + 5, 2, 7, '#fff0a0')
    r.rect(cx - 8, oy + 13, 17, 2, OUTLINE)
    r.rect(cx - 7, oy + 13, 15, 1, '#fff0a0')
    disc(r, cx, oy + 16, 2, OUTLINE)
    r.rect(cx - 1, oy + 15, 2, 2, '#f0b830')
  },
  bar: (r, ox, oy) => {
    const text = 'BAR'
    const tw = measureText(text)
    const w = Math.min(SYMBOL_W - 2, tw + 8)
    const x = ox + Math.round((SYMBOL_W - w) / 2)
    r.rect(x, oy + 3, w, 12, OUTLINE)
    r.rect(x + 1, oy + 4, w - 2, 10, '#f4f4f0')
    r.rect(x + 2, oy + 5, w - 4, 8, '#18181c')
    r.hline(x + 2, oy + 5, w - 4, '#4a4a58')
    drawText(r, text, x + Math.round((w - tw) / 2), oy + 5, '#f8d048', '#5a3a10')
  },
  seven: (r, ox, oy) => {
    const body: Array<[number, number]> = [[ox + 5, oy + 2], [ox + 21, oy + 2], [ox + 21, oy + 5], [ox + 12, oy + 17], [ox + 7, oy + 17], [ox + 14, oy + 6], [ox + 5, oy + 6]]
    const grown: Array<[number, number]> = [[ox + 4, oy + 1], [ox + 22, oy + 1], [ox + 22, oy + 6], [ox + 13, oy + 18], [ox + 6, oy + 18], [ox + 12, oy + 7], [ox + 4, oy + 7]]
    fillPoly(r, grown, OUTLINE)
    fillPoly(r, body, '#e02a2a')
    r.rect(ox + 5, oy + 2, 16, 1, '#ff8a7a')
    r.rect(ox + 5, oy + 3, 16, 1, '#f04a3a')
    for (let y = 6; y < 17; y++) r.put(ox + 12 - Math.floor((y - 6) * 0.5), y + oy, '#a81818')
    r.vline(ox + 15, oy + 5, 3, '#ff8a7a')
  },
  diamond: (r, ox, oy) => {
    const cx = ox + 13
    const pts: Array<[number, number]> = [[cx - 7, oy + 2], [cx + 7, oy + 2], [cx + 10, oy + 7], [cx, oy + 17], [cx - 10, oy + 7]]
    fillPoly(r, [[cx - 8, oy + 1], [cx + 8, oy + 1], [cx + 11, oy + 7], [cx, oy + 18], [cx - 11, oy + 7]], OUTLINE)
    fillPoly(r, pts, '#58d8f0')
    fillPoly(r, [[cx - 7, oy + 2], [cx - 2, oy + 2], [cx - 4, oy + 7], [cx - 10, oy + 7]], '#a8f0ff')
    fillPoly(r, [[cx - 2, oy + 2], [cx + 2, oy + 2], [cx + 4, oy + 7], [cx - 4, oy + 7]], '#78e4f8')
    fillPoly(r, [[cx + 2, oy + 2], [cx + 7, oy + 2], [cx + 10, oy + 7], [cx + 4, oy + 7]], '#38b8d8')
    fillPoly(r, [[cx - 10, oy + 7], [cx - 4, oy + 7], [cx, oy + 17]], '#38b0d0')
    fillPoly(r, [[cx + 10, oy + 7], [cx + 4, oy + 7], [cx, oy + 17]], '#2088a8')
    fillPoly(r, [[cx - 4, oy + 7], [cx + 4, oy + 7], [cx, oy + 17]], '#58d0ec')
    r.put(cx - 5, oy + 3, '#ffffff')
    r.put(cx - 4, oy + 4, '#ffffff')
  },
}

const symbolCache = new Map<string, Raster>()

/** One symbol on its own, SYMBOL_W by SYMBOL_H. */
export function symbolRaster(id: string): Raster {
  const hit = symbolCache.get(id)
  if (hit) return hit
  const r = new Raster(SYMBOL_W, SYMBOL_H)
  SYMBOL_PAINTERS[id]?.(r, 0, 0)
  symbolCache.set(id, r)
  return r
}

/** A reel's strip: every symbol in order, one under another, on the reel's pale face. */
export function stripRaster(ids: string[]): Raster {
  const r = new Raster(SYMBOL_W + 4, ids.length * SYMBOL_H)
  ids.forEach((id, i) => {
    const y = i * SYMBOL_H
    r.rect(0, y, SYMBOL_W + 4, SYMBOL_H, '#f8f2e4')
    r.each(0, y, SYMBOL_W + 4, SYMBOL_H, (x, yy) => {
      // The reel is a drum: pale where it faces you, shadowed top and bottom.
      const k = Math.abs((yy - y) - SYMBOL_H / 2) / (SYMBOL_H / 2)
      return k > 0.78 ? pack('#a89870', 70) : x < 1 || x > SYMBOL_W + 2 ? pack('#a89870', 60) : null
    })
    r.blit(symbolRaster(id), 2, y)
  })
  return r
}

export const CABINET = { w: 152, h: 138 }
/** Where the three reels show, in the cabinet's own pixels. */
export const REELS = { x: 29, y: 41, w: SYMBOL_W + 4, gap: 3, rows: 3 }
export const REELS_H = REELS.rows * SYMBOL_H
const CAB_BULBS: Array<[number, number]> = []
for (let x = 14; x <= CABINET.w - 14; x += 8) CAB_BULBS.push([x, 6], [x, 27])
for (let y = 12; y <= 22; y += 5) CAB_BULBS.push([8, y], [CABINET.w - 9, y])

/** The marquee's bulbs, lit or dark: the cabinet paints them twice so they can chase. */
export function paintCabinet(theme: TableTheme, lit: 0 | 1 | 2): Raster {
  const { w, h } = CABINET
  const r = new Raster(w, h)
  const body = mix(theme.table.rail, '#1a1018', 0.45)
  const trim = theme.table.trim === '#ffffff' ? GOLD : mix(theme.ui.band, '#ffffff', 0.12)
  // The cabinet, a little narrower at the top so it has a shoulder.
  r.rect(2, 0, w - 4, h - 6, OUTLINE)
  r.each(3, 1, w - 6, h - 8, (x, y) => {
    const across = (x - 3) / (w - 7)
    const edge = across < 0.04 ? 1.35 : across > 0.96 ? 0.55 : 1 - Math.abs(across - 0.5) * 0.28
    return shade(dither(x, y, 0.3) ? body : shade(body, 0.95), edge)
  })
  r.rect(0, h - 22, w, 22, OUTLINE)
  r.rect(1, h - 21, w - 2, 20, shade(body, 0.8))
  r.hline(1, h - 21, w - 2, mix(body, '#ffffff', 0.25))
  // The marquee: a lit panel ringed in bulbs.
  r.rect(5, 3, w - 10, 28, OUTLINE)
  r.rect(6, 4, w - 12, 26, mix(trim, '#000000', 0.62))
  r.rect(8, 7, w - 16, 20, mix(theme.ui.accent, '#2a0a10', 0.78))
  r.hline(8, 7, w - 16, mix(theme.ui.accent, '#000000', 0.45))
  CAB_BULBS.forEach(([x, y], i) => {
    const on = lit === 0 ? i % 2 === 0 : i % 3 === lit - 1
    r.put(x, y, on ? '#fff6b8' : '#7a5a20')
    r.put(x + 1, y, on ? '#f8c848' : '#5a4018')
    r.put(x, y + 1, on ? '#f8c848' : '#5a4018')
    if (on) glow(r, x + 0.5, y + 0.5, 4, 4, '#ffd060', 0.45)
  })
  // The bezel round the reels: dark, with a chrome lip.
  const bx = REELS.x - 8
  const bw = 3 * REELS.w + 2 * REELS.gap + 16
  r.rect(bx, REELS.y - 8, bw, REELS_H + 16, OUTLINE)
  r.rect(bx + 1, REELS.y - 7, bw - 2, REELS_H + 14, '#c8ccd8')
  r.rect(bx + 2, REELS.y - 6, bw - 4, REELS_H + 12, '#6a6e80')
  r.hline(bx + 1, REELS.y - 7, bw - 2, '#ffffff')
  r.rect(bx + 3, REELS.y - 5, bw - 6, REELS_H + 10, '#0c0a12')
  // Windows the reels show through; their cut is drawn over the strip by the scene.
  for (let i = 0; i < 3; i++) {
    const x = REELS.x + i * (REELS.w + REELS.gap)
    r.rect(x - 1, REELS.y - 1, REELS.w + 2, REELS_H + 2, '#000000')
  }
  // The payline's arrows, one each side, pointing at the middle row.
  const my = REELS.y + SYMBOL_H + SYMBOL_H / 2 - 1
  r.sprite(['r', 'rr', 'rrr', 'rr', 'r'], bx + 3, my - 2, { r: '#e83838' })
  r.sprite(['..r', '.rr', 'rrr', '.rr', '..r'].map((s) => s.padEnd(3, '.')), bx + bw - 6, my - 2, { r: '#e83838' })
  // The deck: three round buttons and a coin slot, a tray below.
  const dy = REELS.y + REELS_H + 12
  r.rect(12, dy, w - 24, 14, OUTLINE)
  r.rect(13, dy + 1, w - 26, 12, mix(body, '#000000', 0.25))
  r.hline(13, dy + 1, w - 26, mix(body, '#ffffff', 0.3))
  const btn = [theme.ui.accent, '#e04848', '#48c870']
  btn.forEach((c, i) => {
    const bxx = 30 + i * 18
    disc(r, bxx, dy + 7, 4, OUTLINE)
    disc(r, bxx, dy + 7, 3, c)
    r.rect(bxx - 2, dy + 5, 2, 1, mix(c, '#ffffff', 0.7))
  })
  r.rect(w - 52, dy + 3, 24, 8, '#08060c')
  r.rect(w - 46, dy + 5, 12, 4, '#3a3040')
  r.rect(w - 44, dy + 6, 8, 2, GOLD)
  // The coin tray.
  r.rect(22, h - 18, w - 44, 11, OUTLINE)
  r.rect(23, h - 17, w - 46, 9, '#0a0810')
  r.rect(23, h - 9, w - 46, 1, '#3a3446')
  r.rect(0, h - 6, w, 6, OUTLINE)
  r.rect(1, h - 5, w - 2, 4, shade(body, 0.6))
  r.hline(1, h - 5, w - 2, mix(body, '#ffffff', 0.2))
  // Carved side rails in the trim colour.
  r.vline(3, 32, h - 56, trim)
  r.vline(w - 4, 32, h - 56, shade(trim, 0.6))
  return r
}

// ---------------------------------------------------------------------------
// Dice
// ---------------------------------------------------------------------------

export const DIE = 17

const PIPS: Record<number, Array<[number, number]>> = {
  1: [[8, 8]],
  2: [[4, 4], [12, 12]],
  3: [[4, 4], [8, 8], [12, 12]],
  4: [[4, 4], [12, 4], [4, 12], [12, 12]],
  5: [[4, 4], [12, 4], [8, 8], [4, 12], [12, 12]],
  6: [[4, 4], [12, 4], [4, 8], [12, 8], [4, 12], [12, 12]],
}

/** A die seen from above with its near side showing: pale ivory, red pips, a drop shadow baked off. */
export function dieRaster(face: number, tint = '#f6f0e2', pip = '#c82424'): Raster {
  const r = new Raster(DIE, DIE)
  r.rect(1, 1, DIE - 2, DIE - 2, OUTLINE)
  r.rect(0, 2, DIE, DIE - 4, OUTLINE)
  r.rect(2, 1, DIE - 4, DIE - 2, OUTLINE)
  r.rect(2, 2, DIE - 4, DIE - 4, tint)
  r.rect(1, 3, DIE - 2, DIE - 6, tint)
  r.rect(3, 1, DIE - 6, 1, OUTLINE)
  r.hline(3, 2, DIE - 6, '#ffffff')
  r.vline(2, 3, DIE - 6, '#ffffff')
  r.hline(3, DIE - 3, DIE - 6, shade(tint, 0.78))
  r.vline(DIE - 3, 3, DIE - 6, shade(tint, 0.84))
  for (const [x, y] of PIPS[face] ?? []) {
    r.rect(x, y, 2, 2, pip)
    r.put(x, y, mix(pip, '#ffffff', 0.35))
  }
  return r
}

/** The puck that marks the point: white and ON, or black and OFF. */
export function puckRaster(on: boolean): Raster {
  const r = new Raster(17, 12)
  r.ellipse(0, 1, 17, 11, OUTLINE)
  r.ellipse(1, 1, 15, 9, on ? '#f6f6f0' : '#202028')
  r.ellipse(2, 2, 13, 7, on ? '#e4e4dc' : '#2c2c36')
  drawText(r, on ? 'ON' : 'OFF', on ? 4 : 3, 3, on ? '#18181c' : '#f0f0f0')
  return r
}

// ---------------------------------------------------------------------------
// Roulette
// ---------------------------------------------------------------------------

const TAU = Math.PI * 2

/** The pocket under a point of the wheel's rim, `turns` of a revolution from the zero. */
export function pocketAt(turns: number): number {
  const f = ((turns % 1) + 1) % 1
  return Math.floor(f * WHEEL_ORDER.length) % WHEEL_ORDER.length
}

export interface BallState {
  /** Radians clockwise from straight up, as the room sees it. */
  angle: number
  /** 0 at the track by the rim, 1 down in the pockets. */
  drop: number
}

/**
 * The wheel at one moment, drawn by asking each pixel what is under it: the rim,
 * the ball's track, the numbered pockets turning, the cone and the hub. The
 * rotation is therefore exact at every angle, with no jagged turned bitmap.
 */
export function paintWheel(r: Raster, size: number, turns: number, ball: BallState | null, hubSpin = turns, labels = false): void {
  const R = size / 2
  const cx = R
  const cy = R
  const rim = R - 1
  const trackIn = R * 0.8
  const pocketOut = R * 0.74
  const pocketIn = R * 0.5
  const coneIn = R * 0.2
  const n = WHEEL_ORDER.length
  r.each(0, 0, size, size, (x, y) => {
    const dx = x + 0.5 - cx
    const dy = y + 0.5 - cy
    const d = Math.hypot(dx, dy)
    if (d > rim) return null
    // Angle clockwise from the top, in turns.
    const a = Math.atan2(dx, -dy) / TAU
    const light = 0.5 + 0.5 * (-dy / (d || 1)) * 0.6 + 0.5 * (-dx / (d || 1)) * 0.25
    if (d > rim - 1.2) return OUTLINE
    if (d > R * 0.9) {
      // The wooden bowl, lit from the upper left.
      const grain = dither(x, y, 0.3) ? 0.93 : 1
      return shade('#7a4a24', (0.65 + light * 0.75) * grain)
    }
    if (d > trackIn) {
      // The ball's track: polished, sloping in.
      const k = (d - trackIn) / (R * 0.9 - trackIn)
      return shade('#2a1a14', 0.8 + light * 0.7 - k * 0.2)
    }
    if (d > pocketOut) return shade('#c8a040', 0.6 + light * 0.7 + (d - pocketOut) * 0.02)
    if (d > pocketIn) {
      const rel = a - turns
      const f = ((rel % 1) + 1) % 1
      const slot = Math.floor(f * n) % n
      const within = f * n - Math.floor(f * n)
      const number = WHEEL_ORDER[slot]
      if (within < 0.09 || within > 0.93) return shade('#e8c860', 0.8 + light * 0.4)
      const colour = colorOf(number)
      const base = colour === 'red' ? '#c8283a' : colour === 'black' ? '#1c1c24' : '#1c9850'
      const depth = (d - pocketIn) / (pocketOut - pocketIn)
      // The pocket is a dish: light at its outer lip, dark deep in.
      const shadeK = 0.62 + depth * 0.5 + (within > 0.4 && within < 0.6 && d > pocketOut - 3 ? 0.35 : 0)
      return shade(base, shadeK)
    }
    if (d > coneIn) {
      const k = (d - coneIn) / (pocketIn - coneIn)
      const rel = a - turns
      const spoke = Math.abs(((rel * 8) % 1 + 1) % 1 - 0.5) < 0.08
      return shade(spoke ? '#c8a040' : '#5a3418', 0.6 + (1 - k) * 0.4 + light * 0.35)
    }
    // The hub and its turret handle, turning with the wheel.
    const rel = (a - hubSpin) * TAU
    const along = Math.abs(dx * Math.cos(rel + Math.PI / 2) + dy * Math.sin(rel + Math.PI / 2))
    const handle = along < 1.1 && d > 1
    return handle ? '#f4e8c0' : d < 2 ? '#fff6d0' : shade('#d8b048', 0.7 + light * 0.5)
  })
  if (labels) {
    // Numbers upright in each pocket, riding round with the wheel.
    const at = R * 0.62
    WHEEL_ORDER.forEach((num, i) => {
      const ang = (turns + (i + 0.5) / n) * TAU
      const text = String(num)
      drawText(r, text, Math.round(cx + Math.sin(ang) * at - measureText(text) / 2), Math.round(cy - Math.cos(ang) * at - 4), '#ffffff')
    })
  }
  if (ball) {
    const radius = R * (0.86 - 0.28 * ball.drop)
    const bx = cx + Math.sin(ball.angle) * radius
    const by = cy - Math.cos(ball.angle) * radius
    r.ellipse(bx - 1.5 + 1, by - 1.5 + 1.5, 4, 4, pack('#000000', 110))
    r.ellipse(bx - 2, by - 2, 4, 4, '#f8f8f4')
    r.put(Math.floor(bx - 1), Math.floor(by - 1), '#ffffff')
    r.put(Math.floor(bx), Math.floor(by), '#b8b8c8')
  }
}

// ---------------------------------------------------------------------------
// Craps
// ---------------------------------------------------------------------------

export const CRAPS = { w: 236, h: 112, rail: 8, apron: 6 }

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** Where the bets are printed on the cloth, in the table picture's own pixels. */
export const CRAPS_BOXES = (() => {
  const numbers: Record<number, Box> = {}
  const labels = [4, 5, 6, 8, 9, 10]
  const bw = 34
  const start = Math.round((CRAPS.w - (6 * bw + 5 * 2)) / 2)
  labels.forEach((n, i) => {
    numbers[n] = { x: start + i * (bw + 2), y: 25, w: bw, h: 22 }
  })
  return {
    numbers,
    dontPass: { x: start, y: 10, w: 6 * bw + 10, h: 12 } as Box,
    come: { x: start, y: 50, w: 6 * bw + 10, h: 14 } as Box,
    field: { x: start, y: 67, w: 6 * bw + 10, h: 14 } as Box,
    pass: { x: start, y: 84, w: 6 * bw + 10, h: 12 } as Box,
  }
})()

/** The craps table: a long tub with a rail all round, the layout printed on the cloth. */
export function paintCrapsTable(theme: TableTheme): Raster {
  const t = theme.table
  const { w, h, rail: R, apron } = CRAPS
  const r = new Raster(w, h)
  const topH = h - apron
  const inside = (x: number, y: number) => x >= R && x < w - R && y >= R && y < topH - R
  const corner = 6
  const inBody = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= topH) return false
    const cx = Math.min(x, w - 1 - x)
    const cy = Math.min(y, topH - 1 - y)
    return cx >= corner || cy >= corner || Math.hypot(corner - cx - 0.5, corner - cy - 0.5) <= corner
  }
  for (let y = 0; y < topH; y++) {
    for (let x = 0; x < w; x++) {
      if (!inBody(x, y)) continue
      if (inside(x, y)) {
        // Cloth: brighter under the lamp, shadowed where the rail overhangs it.
        const dx = (x - w / 2) / (w / 2)
        const dy = (y - topH / 2) / (topH / 2)
        const lamp = Math.max(0, 1 - Math.hypot(dx * 0.8, dy)) * 0.9
        const shadow = Math.max(y < R + 4 ? (R + 4 - y) / 6 : 0, x < R + 3 ? (R + 3 - x) / 5 : 0, x > w - R - 4 ? (x - (w - R - 4)) / 5 : 0)
        const base = mix(t.feltDark, t.feltLight, Math.min(1, 0.3 + lamp * 0.7))
        const grain = hash2(x, y, 4) < 0.14 ? 0.96 : 1
        r.put(x, y, shade(base, (1 - shadow * 0.28) * grain))
      } else {
        // The rail, padded and lit along its top edge.
        const edgeIn = Math.min(x - (R - 1), w - R - x, y - (R - 1), topH - R - y)
        const edgeOut = Math.min(x, w - 1 - x, y, topH - 1 - y)
        let c = t.rail
        if (edgeIn >= 0 && edgeIn < 1) c = shade(t.railDark, 0.7)
        else if (edgeOut <= 1) c = OUTLINE
        else if (y < R && edgeOut === 2) c = t.railLight
        else if (edgeOut >= 3 && edgeOut <= 4) c = mix(t.rail, t.railLight, 0.4)
        else if (y > topH - R) c = shade(t.rail, 0.78)
        r.put(x, y, dither(x, y, 0.25) ? shade(c, 0.94) : c)
      }
    }
  }
  // Brass at the rail's ends and a stud or two along its length.
  for (let x = R + 14; x < w - R - 10; x += 30) {
    r.put(x, 3, t.trim)
    r.put(x + 1, 3, shade(t.trim, 0.6))
    r.put(x, topH - 4, t.trim)
    r.put(x + 1, topH - 4, shade(t.trim, 0.6))
  }
  // The layout.
  const line = t.line
  const dim = mix(t.line, t.felt, 0.35)
  const box = (b: Box, ink: string) => {
    r.box(b.x, b.y, b.w, b.h, ink)
  }
  const centred = (b: Box, text: string, ink: string, dy = 0) => {
    drawText(r, text, b.x + Math.round((b.w - measureText(text)) / 2), b.y + Math.round((b.h - 7) / 2) + dy, ink)
  }
  const { dontPass, come, field, pass, numbers } = CRAPS_BOXES
  box(dontPass, dim)
  centred(dontPass, "DON'T PASS BAR", line)
  r.each(dontPass.x + 2, dontPass.y + 2, 4, dontPass.h - 4, (x, y) => ((x + y) % 2 === 0 ? dim : null))
  r.each(dontPass.x + dontPass.w - 6, dontPass.y + 2, 4, dontPass.h - 4, (x, y) => ((x + y) % 2 === 0 ? dim : null))
  for (const [n, b] of Object.entries(numbers)) {
    box(b, line)
    r.box(b.x + 1, b.y + 1, b.w - 2, b.h - 2, dim)
    const word = n === '6' ? 'SIX' : n === '9' ? 'NINE' : n
    centred(b, word, t.trim === line ? '#ffffff' : '#f8f4e0', -2)
    // The box's lower half is where the puck's ring goes; its pay line sits under the figure.
    r.hline(b.x + 5, b.y + b.h - 6, b.w - 10, dim)
  }
  box(come, line)
  centred(come, 'COME', mix(line, '#ffffff', 0.2))
  box(field, line)
  centred(field, 'FIELD  2 3 4 9 10 11 12', dim)
  r.rect(pass.x, pass.y, pass.w, pass.h, mix(t.felt, '#000000', 0.18))
  box(pass, line)
  r.box(pass.x + 1, pass.y + 1, pass.w - 2, pass.h - 2, dim)
  centred(pass, 'PASS LINE', '#f8f4e0')
  // The front of the tub, under the near rail.
  for (let x = 0; x < w; x++) {
    for (let k = 1; k <= apron; k++) {
      if (!inBody(x, topH - 1) && k <= 1) continue
      r.put(x, topH - 1 + k, k === apron ? OUTLINE : mix(t.railDark, '#000000', 0.2 + (k / apron) * 0.4))
    }
  }
  return r
}

// ---------------------------------------------------------------------------
// Roulette: the layout
// ---------------------------------------------------------------------------

/** The roulette cloth in art pixels: a zero, twelve columns of three, and the outside bets. */
export const ROULETTE = {
  cellW: 15,
  cellH: 14,
  zeroW: 16,
  /** Left edge of the first number column. */
  gridX: 20,
  gridY: 5,
  outsideH: 12,
  w: 20 + 12 * 15 + 18 + 4,
  h: 5 + 3 * 14 + 2 + 12 + 2 + 12 + 6,
}

/** The felt behind the roulette layout: cloth, rail, the printed lines between the cells. */
export function paintRouletteCloth(theme: TableTheme): Raster {
  const t = theme.table
  const { w, h } = ROULETTE
  const r = new Raster(w, h)
  r.each(0, 0, w, h, (x, y) => {
    const dx = (x - w / 2) / (w / 2)
    const dy = (y - h / 2) / (h / 2)
    const lamp = Math.max(0, 1 - Math.hypot(dx * 0.7, dy * 0.9))
    const base = mix(t.feltDark, t.feltLight, 0.25 + lamp * 0.6)
    return hash2(x, y, 6) < 0.17 ? shade(base, 0.96) : base
  })
  r.box(0, 0, w, h, OUTLINE)
  r.box(1, 1, w - 2, h - 2, t.railLight)
  r.box(2, 2, w - 4, h - 4, t.rail)
  r.hline(1, 1, w - 2, mix(t.railLight, '#ffffff', 0.35))
  r.hline(2, h - 2, w - 4, shade(t.rail, 0.6))
  return r
}
