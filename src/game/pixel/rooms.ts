import type { TableThemeId } from '../../world/types'
import { dither, hash2, mix, shade } from './color'
import { drawText, measureText } from './font'
import { Raster } from './raster'
import type { Rect } from './tableArt'

/**
 * The room behind each table, painted pixel by pixel at the scene's art size.
 *
 * The table scene used to sit on a flat navy gradient, so every venue in the
 * game was the same nowhere. Each painter here builds one room the way a GBA
 * interior is built — a wall with its own trim and things hung on it, a floor
 * with a pattern and a border — and the rooms differ in what is in them, not
 * only in colour: portholes on the riverboat, wanted posters in the saloon,
 * neon on the Strip, marble and drapes in Porto Lumina, a fridge in Marcus's
 * kitchen.
 *
 * Most of the wall is behind the table. What shows is a strip above it, the
 * margins either side on a wide window, and the floor around the betting menu,
 * so decoration is placed along the wall at intervals and centred in the strip.
 */

export interface RoomGeometry {
  /** The whole scene, in art pixels. */
  w: number
  h: number
  /** Where the table stands. */
  felt: Rect
}

interface Wall {
  /** Bottom of the ceiling band. */
  ceiling: number
  /** Where the wall meets the floor. */
  floor: number
  /** Vertical centre of the visible strip above the table, for hanging things. */
  hang: number
  /** Height available above the table for hung things. */
  room: number
}

function wallOf(g: RoomGeometry): Wall {
  const floor = g.felt.y + Math.round(g.felt.h * 0.3)
  const ceiling = 6
  const room = Math.max(12, g.felt.y - ceiling - 4)
  return { ceiling, floor, hang: ceiling + 2 + Math.round(room / 2), room }
}

// ---------------------------------------------------------------------------
// Toolkit
// ---------------------------------------------------------------------------

function vGradient(r: Raster, x: number, y: number, w: number, h: number, top: string, bottom: string, steps = 5) {
  r.each(x, y, w, h, (px, py) => {
    const t = (py - y) / Math.max(1, h - 1)
    const band = Math.floor(t * steps) / steps
    const next = Math.min(1, band + 1 / steps)
    const local = (t - band) * steps
    const a = mix(top, bottom, band)
    const b = mix(top, bottom, next)
    return dither(px, py, local) ? b : a
  })
}

/** Light falling on a surface: mixes towards `color` in a dithered pool. */
function glow(r: Raster, cx: number, cy: number, rx: number, ry: number, color: string, strength = 0.5) {
  r.each(cx - rx, cy - ry, rx * 2, ry * 2, (x, y) => {
    const d = Math.sqrt(((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2)
    if (d >= 1) return null
    const t = (1 - d) * strength
    if (!dither(x, y, t * 1.6)) return null
    const under = r.get(x, y)
    if (under >>> 24 === 0) return null
    const hex = `#${(under & 0xff).toString(16).padStart(2, '0')}${((under >> 8) & 0xff).toString(16).padStart(2, '0')}${((under >> 16) & 0xff).toString(16).padStart(2, '0')}`
    return mix(hex, color, 0.35)
  })
}

function planks(
  r: Raster,
  rect: Rect,
  o: { base: string; light: string; dark: string; size: number; vertical: boolean; salt?: number },
) {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    const along = o.vertical ? py : px
    const across = o.vertical ? px - x : py - y
    const plank = Math.floor(across / o.size)
    const within = across % o.size
    // Staggered butt joints.
    const joint = (along + plank * 37 + (o.salt ?? 0)) % 96 === 0
    if (within === o.size - 1 || joint) return o.dark
    if (within === 0) return o.light
    const grain = hash2(o.vertical ? px : Math.floor(px / 7), o.vertical ? Math.floor(py / 7) : py, plank + (o.salt ?? 0))
    if (grain < 0.12) return mix(o.base, o.dark, 0.45)
    if (grain > 0.95) return mix(o.base, o.light, 0.5)
    return o.base
  })
}

function wallpaper(r: Raster, rect: Rect, base: string, ink: string, motif: 'damask' | 'stripes' | 'diamonds' | 'dots' | 'tiles') {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    const u = px - x
    const v = py - y
    switch (motif) {
      case 'stripes':
        return u % 8 < 3 ? ink : base
      case 'dots':
        return u % 8 === 3 && v % 8 === 3 ? ink : base
      case 'diamonds': {
        const a = Math.abs((u % 12) - 6) + Math.abs((v % 12) - 6)
        return a === 5 ? ink : base
      }
      case 'tiles':
        return u % 10 === 0 || v % 10 === 0 ? ink : (u + v) % 10 === 4 && u % 10 > 6 ? mix(base, '#ffffff', 0.4) : base
      default: {
        // A damask lozenge: diamond outline with a dot, on a half-drop repeat.
        const cu = ((u + (Math.floor(v / 14) % 2) * 8) % 16) - 8
        const cv = (v % 14) - 7
        const d = Math.abs(cu) / 8 + Math.abs(cv) / 7
        if (d > 0.62 && d < 0.78) return ink
        if (Math.abs(cu) <= 1 && Math.abs(cv) <= 1) return ink
        return base
      }
    }
  })
}

function wainscot(r: Raster, rect: Rect, base: string, light: string, dark: string) {
  const { x, y, w, h } = rect
  r.rect(x, y, w, h, base)
  r.rect(x, y, w, 2, light)
  r.rect(x, y + 2, w, 1, dark)
  // Raised panels.
  const panelW = 28
  for (let px = x + 3; px + panelW - 6 < x + w; px += panelW) {
    const py = y + 6
    const ph = h - 10
    if (ph < 6) break
    r.box(px, py, panelW - 6, ph, dark)
    r.hline(px + 1, py + 1, panelW - 8, light)
    r.vline(px + 1, py + 1, ph - 2, light)
  }
  r.rect(x, y + h - 3, w, 3, dark)
}

function bricks(r: Raster, rect: Rect, base: string, mortar: string) {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    const row = Math.floor((py - y) / 6)
    const inRow = (py - y) % 6
    const offset = row % 2 === 0 ? 0 : 7
    const inBrick = (px - x + offset) % 14
    if (inRow === 5 || inBrick === 13) return mortar
    const v = hash2(Math.floor((px - x + offset) / 14), row, 5)
    const c = v < 0.25 ? shade(base, 0.86) : v > 0.8 ? shade(base, 1.12) : base
    return inRow === 0 ? shade(c, 1.1) : c
  })
}

function checker(r: Raster, rect: Rect, a: string, b: string, size: number, edge?: string) {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    const u = Math.floor((px - x) / size)
    const v = Math.floor((py - y) / Math.max(2, Math.round(size * 0.6)))
    const c = (u + v) % 2 === 0 ? a : b
    if (edge && ((px - x) % size === 0 || (py - y) % Math.max(2, Math.round(size * 0.6)) === 0)) return edge
    return c
  })
}

function marble(r: Raster, rect: Rect, base: string, vein: string, salt = 1) {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    // Veins: thin wandering lines from layered waves.
    const v = Math.sin((px + salt * 13) * 0.11 + Math.sin(py * 0.07 + salt) * 2.4 + py * 0.05)
    if (Math.abs(v) < 0.045) return vein
    if (Math.abs(v) < 0.1 && dither(px, py, 0.4)) return mix(base, vein, 0.45)
    return hash2(px, py, salt) < 0.04 ? mix(base, vein, 0.25) : base
  })
}

function carpet(r: Raster, rect: Rect, base: string, motif: string, accent: string, kind: 'diamond' | 'confetti' | 'scroll' | 'plain') {
  const { x, y, w, h } = rect
  r.each(x, y, w, h, (px, py) => {
    const u = px - x
    const v = py - y
    switch (kind) {
      case 'confetti': {
        const n = hash2(Math.floor(u / 2), Math.floor(v / 2), 9)
        if (n < 0.02) return '#f048c8'
        if (n < 0.04) return '#48e8f8'
        if (n < 0.05) return '#f8e048'
        return base
      }
      case 'diamond': {
        const a = Math.abs((u % 16) - 8) + Math.abs((v % 10) - 5) * 1.6
        if (a < 2) return accent
        if (a > 6.4 && a < 7.6) return motif
        return base
      }
      case 'scroll': {
        const a = Math.sin(u * 0.4) * 2 + ((v % 12) - 6)
        if (Math.abs(a) < 0.6) return motif
        if ((u + v) % 24 === 0) return accent
        return base
      }
      default:
        return hash2(u, v, 4) < 0.05 ? mix(base, motif, 0.5) : base
    }
  })
}

/** A framed window with a sill and a glint, showing `view` through it. */
function windowFrame(r: Raster, rect: Rect, frame: string, view: (r: Raster, glass: Rect) => void, arched = false) {
  const { x, y, w, h } = rect
  const glass = { x: x + 2, y: y + 2, w: w - 4, h: h - 4 }
  view(r, glass)
  if (arched) {
    // Round the top of the glass off.
    const rad = Math.floor(glass.w / 2)
    for (let py = glass.y; py < glass.y + rad; py++) {
      for (let px = glass.x; px < glass.x + glass.w; px++) {
        const dx = px + 0.5 - (glass.x + glass.w / 2)
        const dy = py + 0.5 - (glass.y + rad)
        if (dx * dx + dy * dy > rad * rad) r.put(px, py, frame)
      }
    }
  }
  r.box(x, y, w, h, shade(frame, 0.6))
  r.box(x + 1, y + 1, w - 2, h - 2, frame)
  // Glazing bars.
  r.vline(x + Math.floor(w / 2), y + 2, h - 4, frame)
  if (h > 18) r.hline(x + 2, y + Math.floor(h / 2), w - 4, frame)
  // The sill.
  r.rect(x - 2, y + h, w + 4, 2, mix(frame, '#ffffff', 0.25))
  r.hline(x - 2, y + h + 2, w + 4, shade(frame, 0.55))
  // A glint top-left.
  r.put(glass.x + 1, glass.y + 1, '#ffffff')
  r.put(glass.x + 2, glass.y + 1, mix('#ffffff', '#9fd8f0', 0.5))
  r.put(glass.x + 1, glass.y + 2, mix('#ffffff', '#9fd8f0', 0.5))
}

function nightSky(r: Raster, rect: Rect, top: string, bottom: string, salt = 1) {
  vGradient(r, rect.x, rect.y, rect.w, rect.h, top, bottom, 4)
  r.each(rect.x, rect.y, rect.w, Math.floor(rect.h * 0.7), (px, py) => (hash2(px, py, salt) < 0.012 ? '#f8f8e0' : null))
}

function skyline(r: Raster, rect: Rect, body: string, lit: string, salt = 3) {
  let x = rect.x
  while (x < rect.x + rect.w) {
    const bw = 5 + Math.floor(hash2(x, 0, salt) * 9)
    const bh = Math.round(rect.h * (0.25 + hash2(x, 1, salt) * 0.6))
    const top = rect.y + rect.h - bh
    r.rect(x, top, Math.min(bw, rect.x + rect.w - x), bh, body)
    for (let wy = top + 2; wy < rect.y + rect.h - 1; wy += 3) {
      for (let wx = x + 1; wx < Math.min(x + bw - 1, rect.x + rect.w); wx += 2) {
        if (hash2(wx, wy, salt) < 0.35) r.put(wx, wy, lit)
      }
    }
    x += bw + (hash2(x, 2, salt) < 0.3 ? 1 : 0)
  }
}

function sea(r: Raster, rect: Rect, deep: string, light: string, sparkle: string) {
  r.each(rect.x, rect.y, rect.w, rect.h, (px, py) => {
    const v = (py - rect.y) / Math.max(1, rect.h)
    const wave = (px + Math.round(Math.sin(py * 1.3) * 2) + py * 3) % 9 === 0
    if (wave && hash2(px, py, 2) < 0.5) return sparkle
    return dither(px, py, 1 - v) ? light : deep
  })
}

function brassLamp(r: Raster, x: number, y: number, brass: string, light: string) {
  // A wall sconce: bracket, cup, a lit shade, and the light it throws on the wall.
  glow(r, x + 2, y + 4, 18, 14, light, 0.55)
  r.rect(x + 1, y + 8, 3, 4, shade(brass, 0.7))
  r.rect(x, y + 6, 5, 2, brass)
  r.rect(x - 1, y, 7, 6, light)
  r.hline(x - 1, y, 7, mix(light, '#ffffff', 0.5))
  r.box(x - 2, y - 1, 9, 8, shade(brass, 0.55))
}

/** An oil lantern on a wall bracket: tin cap, a glass chimney with a flame, and its glow. */
function lantern(r: Raster, x: number, y: number, tin: string, flame: string) {
  glow(r, x + 3, y + 7, 20, 16, flame, 0.6)
  r.sprite(
    [
      '..ooo..',
      '...o...',
      '.ooooo.',
      'ogggggo',
      'ogfffgo',
      'ogfWfgo',
      'ogfWfgo',
      'oggfggo',
      '.ooooo.',
      '..ooo..',
    ],
    x,
    y,
    { o: tin, g: mix(flame, '#ffffff', 0.35), f: flame, W: '#fffbe8' },
  )
  // The bracket into the wall.
  r.hline(x + 7, y + 1, 3, tin)
  r.vline(x + 9, y + 1, 4, tin)
}

function porthole(r: Raster, cx: number, cy: number, rad: number, brass: string, view: (r: Raster, glass: Rect) => void) {
  const glassR = rad - 3
  const glass = { x: cx - glassR, y: cy - glassR, w: glassR * 2, h: glassR * 2 }
  view(r, glass)
  for (let py = cy - rad; py <= cy + rad; py++) {
    for (let px = cx - rad; px <= cx + rad; px++) {
      const d = Math.sqrt((px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2)
      if (d > rad) continue
      if (d > glassR) {
        const lit = px - cx + (py - cy) < 0
        r.put(px, py, d > rad - 1 ? shade(brass, 0.45) : lit ? mix(brass, '#ffffff', 0.35) : brass)
      }
    }
  }
  // Rivets round the ring.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2
    r.put(Math.round(cx + Math.cos(a) * (rad - 1.5)), Math.round(cy + Math.sin(a) * (rad - 1.5)), shade(brass, 0.5))
  }
  r.put(cx - Math.round(glassR / 2), cy - Math.round(glassR / 2), '#ffffff')
}

function column(r: Raster, x: number, y: number, w: number, h: number, base: string, light: string, dark: string, gold?: string) {
  r.rect(x, y, w, h, base)
  for (let px = x + 2; px < x + w - 1; px += 3) r.vline(px, y + 6, h - 12, dark)
  r.vline(x, y, h, light)
  r.vline(x + w - 1, y, h, dark)
  // Capital and base.
  r.rect(x - 2, y, w + 4, 5, gold ?? light)
  r.hline(x - 2, y + 5, w + 4, dark)
  r.rect(x - 2, y + h - 5, w + 4, 5, gold ?? light)
  r.hline(x - 2, y + h - 6, w + 4, dark)
}

function curtain(r: Raster, rect: Rect, base: string, light: string, dark: string) {
  r.each(rect.x, rect.y, rect.w, rect.h, (px) => {
    const fold = (px - rect.x) % 6
    return fold === 0 ? dark : fold === 2 ? light : fold === 5 ? mix(base, dark, 0.5) : base
  })
  // Tie-back.
  r.rect(rect.x, rect.y + Math.round(rect.h * 0.6), rect.w, 2, '#d8b048')
}

function neonText(r: Raster, text: string, x: number, y: number, color: string) {
  // The glow first, wide and dim, then the tube.
  const glowInk = mix(color, '#000000', 0.55)
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0], [0, -2], [0, 2]]) {
    drawText(r, text, x + dx, y + dy, glowInk)
  }
  drawText(r, text, x, y, mix(color, '#ffffff', 0.45))
}

/**
 * A crystal chandelier hanging from (cx, top): a gold frame of curved arms,
 * candle bulbs along the top of each tier, crystals hanging under them, and
 * the light it throws.
 */
function chandelier(r: Raster, cx: number, top: number, drop: number) {
  const gold = '#f0c850'
  const goldDark = '#a07820'
  const crystal = '#e0f0ff'
  const y = top + drop
  glow(r, cx, y + 6, 54, 30, '#fff4c0', 0.6)
  r.vline(cx, 0, y - 6, goldDark)
  r.vline(cx + 1, 0, y - 6, gold)
  // The body: a gilt urn.
  r.sprite(['.gGg.', 'gGGGg', 'gGGGg', '.gGg.', '..g..'], cx - 2, y - 7, { g: goldDark, G: gold })
  const tiers = [
    { w: 34, dy: 0 },
    { w: 22, dy: 6 },
  ]
  for (const tier of tiers) {
    const half = tier.w / 2
    const ty = y + tier.dy
    // A curved arm: dips in the middle, rises at the tips.
    for (let i = -half; i <= half; i++) {
      const sag = Math.round(2 - ((i / half) ** 2) * 3)
      r.put(cx + i, ty + sag, gold)
      r.put(cx + i, ty + sag + 1, goldDark)
    }
    for (let i = -half; i <= half; i += 6) {
      const sag = Math.round(2 - ((i / half) ** 2) * 3)
      // Candle bulb above, crystal drop below.
      r.rect(cx + i, ty + sag - 3, 1, 3, '#f8f8f0')
      r.put(cx + i, ty + sag - 4, '#fff8c0')
      r.put(cx + i, ty + sag - 5, '#fffbe8')
      r.vline(cx + i, ty + sag + 2, 3, crystal)
      r.put(cx + i, ty + sag + 5, '#ffffff')
    }
  }
  r.sprite(['.c.', 'cWc', '.c.', '.c.'], cx - 1, y + 10, { c: crystal, W: '#ffffff' })
}

/** Neon lettering two art pixels to the font pixel, for a sign meant to be read across a room. */
function bigNeon(r: Raster, text: string, x: number, y: number, color: string) {
  const w = measureText(text)
  const glyphs = new Raster(w + 2, 12)
  drawText(glyphs, text, 0, 0, color)
  const glowInk = mix(color, '#000000', 0.5)
  const tube = mix(color, '#ffffff', 0.5)
  glow(r, x + w, y + 7, w + 12, 14, color, 0.55)
  for (let gy = 0; gy < glyphs.height; gy++) {
    for (let gx = 0; gx < glyphs.width; gx++) {
      if (glyphs.isClear(gx, gy)) continue
      r.rect(x + gx * 2 - 1, y + gy * 2 - 1, 4, 4, glowInk)
    }
  }
  for (let gy = 0; gy < glyphs.height; gy++) {
    for (let gx = 0; gx < glyphs.width; gx++) {
      if (glyphs.isClear(gx, gy)) continue
      r.rect(x + gx * 2, y + gy * 2, 2, 2, color)
      r.put(x + gx * 2, y + gy * 2, tube)
    }
  }
}

function picture(r: Raster, x: number, y: number, w: number, h: number, frame: string, paint: (r: Raster, canvas: Rect) => void) {
  r.rect(x, y, w, h, frame)
  r.box(x, y, w, h, shade(frame, 0.55))
  r.hline(x + 1, y + 1, w - 2, mix(frame, '#ffffff', 0.4))
  paint(r, { x: x + 2, y: y + 2, w: w - 4, h: h - 4 })
}

function plant(r: Raster, x: number, y: number, pot: string, leaf: string) {
  // A potted palm, base at (x, y).
  r.rect(x - 4, y - 7, 9, 7, pot)
  r.hline(x - 5, y - 8, 11, mix(pot, '#ffffff', 0.25))
  r.vline(x + 4, y - 7, 7, shade(pot, 0.7))
  for (const [dx, dy, len] of [[-1, -1, 9], [1, -1, 10], [0, -1, 12], [-1, 1, 8], [1, 1, 8]]) {
    for (let i = 0; i < len; i++) {
      const px = Math.round(x + dx * i * 0.9)
      const py = Math.round(y - 9 - i * (dy < 0 ? 1 : 0.5) + (dy > 0 ? i * 0.4 : 0))
      r.put(px, py, leaf)
      r.put(px, py + 1, shade(leaf, 0.7))
    }
  }
}

/** The floor's edge against the wall: a skirting board. */
function skirting(r: Raster, y: number, w: number, base: string) {
  r.rect(0, y - 3, w, 3, base)
  r.hline(0, y - 3, w, mix(base, '#ffffff', 0.3))
  r.hline(0, y, w, shade(base, 0.5))
}

/** Something on the wall at regular intervals, skipping where the table hides it entirely. */
function along(g: RoomGeometry, spacing: number, offset: number, draw: (x: number) => void) {
  for (let x = offset; x < g.w + spacing; x += spacing) draw(Math.round(x))
}

// ---------------------------------------------------------------------------
// The rooms
// ---------------------------------------------------------------------------

type Painter = (r: Raster, g: RoomGeometry, wall: Wall) => void

const ROOMS: Record<TableThemeId, Painter> = {
  // Marcus's kitchen: wallpaper, cupboards, a window on the street at night, the
  // fridge, a clock, lino on the floor, and one lamp over the table.
  home(r, g, wall) {
    wallpaper(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#d8c8a0', '#c8b088', 'stripes')
    // Tiled splashback behind a counter run along the wall.
    const counterY = wall.floor - 18
    wallpaper(r, { x: 0, y: counterY - 14, w: g.w, h: 14 }, '#e8e4d8', '#c8c4b8', 'tiles')
    r.rect(0, counterY, g.w, 4, '#b8b0a0')
    r.hline(0, counterY, g.w, '#e0d8c8')
    planks(r, { x: 0, y: counterY + 4, w: g.w, h: 14 }, { base: '#8a5a32', light: '#a87040', dark: '#5a3418', size: 7, vertical: true })
    // Wall cupboards along the top.
    const cupH = Math.min(26, Math.max(10, Math.floor(wall.room * 0.55)))
    along(g, 34, 0, (x) => {
      r.rect(x + 1, wall.ceiling, 32, cupH, '#9a6a3a')
      r.box(x + 1, wall.ceiling, 32, cupH, '#5a3418')
      r.box(x + 4, wall.ceiling + 3, 12, cupH - 6, '#7a4a24')
      r.box(x + 18, wall.ceiling + 3, 12, cupH - 6, '#7a4a24')
      r.rect(x + 14, wall.ceiling + cupH - 6, 1, 3, '#d8c890')
      r.rect(x + 19, wall.ceiling + cupH - 6, 1, 3, '#d8c890')
    })
    r.rect(0, 0, g.w, wall.ceiling, '#f0ead8')
    r.hline(0, wall.ceiling, g.w, '#a89878')
    // The window over the sink, at night.
    const winW = 44
    const winH = Math.max(14, Math.min(34, wall.room - 6))
    const winX = Math.round(g.felt.x + g.felt.w * 0.68)
    const winY = wall.ceiling + cupH + 3
    if (winY + winH < wall.floor) {
      windowFrame(r, { x: winX, y: winY, w: winW, h: winH }, '#f0ece0', (rr, glass) => {
        nightSky(rr, glass, '#141c3a', '#2a3460', 7)
        skyline(rr, { x: glass.x, y: glass.y + Math.floor(glass.h * 0.55), w: glass.w, h: Math.ceil(glass.h * 0.45) }, '#0c1020', '#f8d878', 4)
      })
      curtain(r, { x: winX - 6, y: winY - 2, w: 6, h: winH + 4 }, '#c84838', '#e86a58', '#8a2a20')
      curtain(r, { x: winX + winW, y: winY - 2, w: 6, h: winH + 4 }, '#c84838', '#e86a58', '#8a2a20')
    }
    // The fridge at the left end of the room.
    const fx = Math.max(2, g.felt.x - 34)
    const fy = wall.ceiling + 2
    const fh = wall.floor - fy
    r.rect(fx, fy, 26, fh, '#e8ecf0')
    r.box(fx, fy, 26, fh, '#8a9098')
    r.hline(fx + 1, fy + Math.round(fh * 0.38), 24, '#8a9098')
    r.rect(fx + 21, fy + 4, 2, 8, '#a8b0b8')
    r.rect(fx + 21, fy + Math.round(fh * 0.38) + 4, 2, 10, '#a8b0b8')
    for (const [mx, my, c] of [[4, 6, '#e84848'], [10, 9, '#48a8e8'], [6, 14, '#f8d048']] as const) r.rect(fx + mx, fy + my, 3, 3, c)
    r.rect(fx + 3, fy + 18, 8, 10, '#f8f8f8')
    r.box(fx + 3, fy + 18, 8, 10, '#c8c8d0')
    // A clock, nearly midnight, and a calendar with the days crossed off.
    const clockX = Math.round(g.felt.x + g.felt.w * 0.3)
    const clockY = wall.ceiling + cupH + Math.max(10, Math.round((wall.room - cupH) / 2))
    if (clockY + 8 < g.felt.y + 14) {
      r.ellipse(clockX - 8, clockY - 8, 17, 17, '#4a3020')
      r.ellipse(clockX - 7, clockY - 7, 15, 15, '#c89848')
      r.ellipse(clockX - 6, clockY - 6, 13, 13, '#f8f4e8')
      for (const [dx, dy] of [[0, -5], [5, 0], [0, 5], [-5, 0]]) r.put(clockX + dx, clockY + dy, '#4a3020')
      r.vline(clockX, clockY - 4, 4, '#202020')
      r.put(clockX - 1, clockY - 3, '#202020')
      r.hline(clockX, clockY, 1, '#c82828')
      const calX = clockX + 30
      const calY = clockY - 9
      r.rect(calX, calY, 16, 18, '#f8f8f0')
      r.box(calX, calY, 16, 18, '#8a8070')
      r.rect(calX + 1, calY + 1, 14, 4, '#c83838')
      for (let k = 0; k < 12; k++) {
        const kx = calX + 2 + (k % 4) * 3
        const ky = calY + 7 + Math.floor(k / 4) * 3
        r.rect(kx, ky, 2, 2, k < 9 ? '#c83838' : '#b8b0a0')
      }
    }
    // Lino: red and cream squares.
    checker(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, '#e8e0cc', '#b84a3a', 10, '#9a8a78')
    skirting(r, wall.floor, g.w, '#8a5a32')
    glow(r, Math.round(g.felt.x + g.felt.w / 2), g.felt.y - 4, Math.round(g.felt.w * 0.45), 40, '#fff0b0', 0.5)
    // The lamp over the table, on its flex.
    const lampX = Math.round(g.felt.x + g.felt.w / 2)
    r.vline(lampX, 0, Math.max(2, g.felt.y - 14), '#303030')
    if (g.felt.y > 18) {
      r.rect(lampX - 8, g.felt.y - 14, 17, 5, '#c84838')
      r.rect(lampX - 10, g.felt.y - 9, 21, 3, '#a83020')
      r.rect(lampX - 4, g.felt.y - 6, 9, 2, '#fff8c0')
    }
  },

  // Silver Creek: a saloon on the reservation road. Plank walls, wanted posters,
  // a longhorn skull, oil lamps, and a dusty board floor.
  silvercreek(r, g, wall) {
    planks(r, { x: 0, y: 0, w: g.w, h: wall.floor }, { base: '#7a4e2c', light: '#94643a', dark: '#4a2c16', size: 9, vertical: true })
    r.rect(0, 0, g.w, wall.ceiling, '#3a2212')
    r.hline(0, wall.ceiling, g.w, '#c89050')
    // Things nailed to the saloon wall, no two in a row alike: a horseshoe, a
    // sunset with a cactus, antlers, a trade blanket, a sheriff's star, and a
    // dead man's hand framed above the bar.
    let nth = 0
    along(g, 76, 18, (x) => {
      const ph = Math.min(30, Math.max(14, wall.room - 6))
      const pw = 28
      const py = wall.hang - Math.floor(ph / 2)
      const cx = x + Math.floor(pw / 2)
      switch (nth++ % 6) {
        case 0: {
          // An iron horseshoe, open end up for luck, on a nail.
          r.put(cx, py + 1, '#303030')
          const top = py + Math.floor(ph / 2) - 6
          for (let i = 0; i < 9; i++) {
            const inset = i < 6 ? 0 : i - 5
            r.rect(cx - 5 + inset, top + i, 2, 1, '#8a8e98')
            r.rect(cx + 4 - inset, top + i, 2, 1, '#8a8e98')
          }
          r.rect(cx - 3, top + 8, 6, 1, '#6a6e78')
          for (const nx of [cx - 4, cx + 4]) r.put(nx, top + 2, '#303030')
          break
        }
        case 1:
          // A sunset over the desert, with a saguaro.
          picture(r, x, py, pw, ph, '#6a4224', (rr, c) => {
            vGradient(rr, c.x, c.y, c.w, c.h, '#f0a050', '#f8d890', 4)
            rr.rect(c.x, c.y + c.h - 4, c.w, 4, '#b86a38')
            rr.rect(c.x + 4, c.y + c.h - 9, 2, 6, '#3a7a3a')
            rr.rect(c.x + 2, c.y + c.h - 7, 2, 1, '#3a7a3a')
            rr.rect(c.x + 6, c.y + c.h - 8, 2, 1, '#3a7a3a')
            rr.rect(c.x + c.w - 9, c.y + 2, 4, 4, '#f8e8a8')
          })
          break
        case 2: {
          // A pair of antlers on a shield of boards.
          const sy = py + Math.floor(ph / 2) - 1
          r.rect(cx - 6, sy, 12, 9, '#5a3a20')
          r.box(cx - 6, sy, 12, 9, '#3a2412')
          r.hline(cx - 5, sy + 4, 10, '#7a5230')
          for (let i = 0; i < 9; i++) {
            r.put(cx - 7 - i, sy - 1 - Math.floor(i / 2), '#e8dcc0')
            r.put(cx + 7 + i, sy - 1 - Math.floor(i / 2), '#e8dcc0')
            if (i % 3 === 2) {
              r.rect(cx - 7 - i, sy - 4 - Math.floor(i / 2), 1, 3, '#d8caa8')
              r.rect(cx + 7 + i, sy - 4 - Math.floor(i / 2), 1, 3, '#d8caa8')
            }
          }
          break
        }
        case 3: {
          // A trade blanket hung to dry: zig-zag bands.
          r.rect(x + 2, py, pw - 4, ph, '#e8d8b0')
          for (let row = 3; row < ph - 2; row += 6) {
            for (let i = 0; i < pw - 6; i++) {
              const zig = (Math.floor(i / 3) % 2) * 2
              r.put(x + 3 + i, py + row + zig, '#b8382a')
              r.put(x + 3 + i, py + row + zig + 1, '#2a7a8a')
            }
          }
          r.hline(x + 2, py, pw - 4, '#7a5230')
          r.vline(x + 2, py + ph, 1, '#e8d8b0')
          break
        }
        case 4: {
          // A sheriff's star: points, and a ring around the middle.
          const sy = py + Math.floor(ph / 2)
          const rad = Math.min(8, Math.floor(ph / 2) - 1)
          r.rect(cx - 2, sy - rad, 5, rad * 2 + 1, '#d8b038')
          r.rect(cx - rad, sy - 2, rad * 2 + 1, 5, '#d8b038')
          for (let d = 1; d < rad - 1; d++) {
            r.put(cx - d - 1, sy - d - 1, '#d8b038')
            r.put(cx + d + 1, sy - d - 1, '#d8b038')
            r.put(cx - d - 1, sy + d + 1, '#d8b038')
            r.put(cx + d + 1, sy + d + 1, '#d8b038')
          }
          r.rect(cx - 1, sy - 1, 3, 3, '#8a6a18')
          r.put(cx, sy, '#f8e890')
          break
        }
        default: {
          // Aces and eights, framed: the hand Wild Bill died holding.
          picture(r, x + 3, py, pw - 6, ph, '#3a2412', (rr, c) => {
            rr.rect(c.x, c.y, c.w, c.h, '#2a5a3a')
            const cw = Math.max(5, Math.floor((c.w - 2) / 2))
            rr.rect(c.x + 1, c.y + 1, cw, c.h - 2, '#f4f0e0')
            rr.rect(c.x + 1 + cw - 1, c.y + 2, cw, c.h - 3, '#f4f0e0')
            rr.rect(c.x + 2, c.y + 2, 2, 2, '#202020')
            rr.rect(c.x + cw + 1, c.y + 3, 2, 2, '#b82a2a')
          })
        }
      }
    })
    along(g, 76, 56, (x) => lantern(r, x, wall.hang - 7, '#4a3a2a', '#f8c860'))
    // A longhorn skull over the middle of the table.
    const sx = Math.round(g.felt.x + g.felt.w / 2)
    const sy = Math.max(wall.ceiling + 4, g.felt.y - 22)
    if (g.felt.y > 26) {
      r.rect(sx - 4, sy, 9, 9, '#f0e8d0')
      r.rect(sx - 3, sy + 9, 7, 3, '#e0d4b8')
      r.put(sx - 2, sy + 3, '#3a2a1a')
      r.put(sx + 2, sy + 3, '#3a2a1a')
      for (let i = 0; i < 14; i++) {
        const dy = i > 9 ? -(i - 9) : 0
        r.put(sx - 5 - i, sy + 2 + dy, '#e8dcc0')
        r.put(sx + 5 + i, sy + 2 + dy, '#e8dcc0')
        r.put(sx - 5 - i, sy + 3 + dy, '#b8a888')
        r.put(sx + 5 + i, sy + 3 + dy, '#b8a888')
      }
    }
    // Dusty boards, and a rug under the table.
    planks(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, { base: '#8a6038', light: '#a8784a', dark: '#5a3a20', size: 8, vertical: false, salt: 3 })
    r.each(0, wall.floor, g.w, g.h - wall.floor, (x, y) => (hash2(x, y, 21) < 0.03 ? '#c8a878' : null))
    skirting(r, wall.floor, g.w, '#4a2c16')
  },

  // The riverboat: a panelled saloon cabin with brass portholes on the river.
  riverboat(r, g, wall) {
    planks(r, { x: 0, y: 0, w: g.w, h: wall.floor }, { base: '#6a3424', light: '#84442e', dark: '#3e1c12', size: 6, vertical: false })
    wainscot(r, { x: 0, y: wall.floor - 30, w: g.w, h: 30 }, '#4a2416', '#6a3a24', '#2a120a')
    r.rect(0, 0, g.w, wall.ceiling, '#2a140c')
    r.hline(0, wall.ceiling, g.w, '#d8b048')
    // Ceiling beams.
    along(g, 48, 10, (x) => r.rect(x, 0, 6, wall.ceiling + 2, '#3a1c10'))
    const rad = Math.max(7, Math.min(14, Math.floor(wall.room / 2) - 1))
    along(g, 52, 26, (x) => {
      porthole(r, x, wall.hang, rad, '#c8a040', (rr, glass) => {
        // The river at night: a sky, the far bank's trees, and the moon on the water.
        nightSky(rr, glass, '#1a2a4a', '#3a5070', 13)
        const bank = glass.y + Math.floor(glass.h * 0.5)
        rr.rect(glass.x, bank, glass.w, 2, '#1a2a1a')
        sea(rr, { x: glass.x, y: bank + 2, w: glass.w, h: glass.h - (bank + 2 - glass.y) }, '#18304a', '#2a4a68', '#f8f0c0')
      })
    })
    // A life ring by the door.
    const lx = Math.max(10, g.felt.x - 22)
    if (wall.floor - 40 > 0) {
      r.ellipse(lx - 9, wall.floor - 52, 19, 19, '#e84a3a')
      r.ellipse(lx - 5, wall.floor - 48, 11, 11, '#6a3424')
      r.rect(lx - 9, wall.floor - 44, 4, 3, '#f8f8f0')
      r.rect(lx + 6, wall.floor - 44, 4, 3, '#f8f8f0')
    }
    planks(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, { base: '#9a7048', light: '#b88a5a', dark: '#6a4828', size: 7, vertical: false, salt: 5 })
    skirting(r, wall.floor, g.w, '#2a120a')
  },

  // The Harbor Room: green-and-gold damask over walnut, brass lamps, paintings
  // of ships, and a green carpet with a gold border.
  harbor(r, g, wall) {
    wallpaper(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#1e4434', '#2e5a44', 'damask')
    wainscot(r, { x: 0, y: wall.floor - 34, w: g.w, h: 34 }, '#3a2214', '#5a3a24', '#1e100a')
    r.rect(0, 0, g.w, wall.ceiling, '#1a120a')
    r.hline(0, wall.ceiling, g.w, '#d8b850')
    r.hline(0, wall.ceiling + 2, g.w, '#8a7030')
    along(g, 96, 22, (x) => {
      const ph = Math.min(30, Math.max(12, wall.room - 6))
      picture(r, x, wall.hang - Math.floor(ph / 2), 30, ph, '#c8a040', (rr, c) => {
        vGradient(rr, c.x, c.y, c.w, c.h, '#e8c890', '#88a8c0', 3)
        sea(rr, { x: c.x, y: c.y + Math.floor(c.h * 0.6), w: c.w, h: Math.ceil(c.h * 0.4) }, '#2a4a6a', '#4a6a8a', '#e8f0f8')
        // A ship under sail.
        const sx = c.x + Math.floor(c.w / 2) - 4
        const sy = c.y + Math.floor(c.h * 0.6)
        rr.rect(sx, sy - 1, 9, 2, '#3a2214')
        rr.rect(sx + 2, sy - 8, 3, 6, '#f8f4e8')
        rr.rect(sx + 5, sy - 6, 2, 4, '#f0ead8')
      })
    })
    along(g, 96, 70, (x) => brassLamp(r, x, wall.hang - 4, '#c8a040', '#f8e0a0'))
    along(g, 192, 118, (x) => plant(r, x, wall.floor - 1, '#5a3a24', '#2a6a3a'))
    carpet(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, '#1c4a34', '#2a6046', '#d8b850', 'diamond')
    skirting(r, wall.floor, g.w, '#1e100a')
    r.hline(0, wall.floor + 4, g.w, '#d8b850')
  },

  // The back room: brick, one lamp, crates, a door with a peephole, smoke.
  backroom(r, g, wall) {
    bricks(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#6a3a2c', '#3a2620')
    r.rect(0, 0, g.w, wall.ceiling + 2, '#1a1412')
    // Pipes along the ceiling.
    r.rect(0, wall.ceiling + 3, g.w, 3, '#5a5a58')
    r.hline(0, wall.ceiling + 3, g.w, '#8a8a88')
    // Stacked crates at the ends of the room, stencilled.
    for (const cx of [Math.min(g.w - 36, g.felt.x + g.felt.w + 6)]) {
      for (let k = 0; k < 2; k++) {
        const cy = wall.floor - 20 - k * 20
        r.rect(cx, cy, 32, 20, '#8a6a40')
        r.box(cx, cy, 32, 20, '#4a3418')
        r.hline(cx + 1, cy + 1, 30, '#a8844e')
        r.vline(cx + 3, cy + 1, 18, '#6a4a28')
        r.vline(cx + 28, cy + 1, 18, '#6a4a28')
        drawText(r, k === 0 ? 'RUM' : 'NO 7', cx + 7, cy + 6, '#3a2410')
      }
    }
    // The door you came in by, with the slot they look through first.
    const dh = Math.min(52, wall.floor - wall.ceiling - 10)
    const dx = Math.max(4, g.felt.x - 34)
    r.rect(dx - 2, wall.floor - dh - 2, 30, dh + 2, '#2a2a2e')
    r.rect(dx, wall.floor - dh, 26, dh, '#4a4a52')
    r.box(dx, wall.floor - dh, 26, dh, '#1a1a1e')
    r.vline(dx + 1, wall.floor - dh + 1, dh - 2, '#5e5e68')
    r.rect(dx + 7, wall.floor - dh + 8, 12, 3, '#0a0a0c')
    r.hline(dx + 7, wall.floor - dh + 8, 12, '#f0d890')
    r.rect(dx + 20, wall.floor - Math.round(dh / 2), 2, 4, '#c8b060')
    for (const ry of [wall.floor - dh + 4, wall.floor - 8]) r.rect(dx + 2, ry, 4, 2, '#2a2a2e')
    // A smoky haze over everything, and the one lamp.
    r.each(0, wall.ceiling, g.w, wall.floor - wall.ceiling, (x, y) => (dither(x, y, 0.1) && hash2(x >> 3, y >> 3, 8) < 0.5 ? '#7a6a60' : null))
    const lx = Math.round(g.felt.x + g.felt.w / 2)
    r.vline(lx, 0, Math.max(2, g.felt.y - 12), '#202020')
    if (g.felt.y > 16) {
      r.rect(lx - 9, g.felt.y - 12, 19, 4, '#2a4a38')
      r.rect(lx - 11, g.felt.y - 8, 23, 2, '#1a3020')
      r.rect(lx - 4, g.felt.y - 6, 9, 1, '#fff0b0')
    }
    glow(r, lx, g.felt.y, Math.round(g.felt.w * 0.5), Math.round(g.felt.y * 0.9) + 20, '#f0d890', 0.6)
    r.rect(0, wall.floor, g.w, g.h - wall.floor, '#46443e')
    r.each(0, wall.floor, g.w, g.h - wall.floor, (x, y) => (hash2(x, y, 31) < 0.05 ? '#5a5850' : hash2(x, y, 32) < 0.02 ? '#323028' : null))
    skirting(r, wall.floor, g.w, '#2a2622')
  },

  // Palm Cay: bamboo walls, a wide window on the sea, palms, torches, a rattan fan.
  palmcay(r, g, wall) {
    planks(r, { x: 0, y: 0, w: g.w, h: wall.floor }, { base: '#c8b070', light: '#e0c88a', dark: '#8a7438', size: 5, vertical: true })
    // Bamboo nodes.
    r.each(0, 0, g.w, wall.floor, (x, y) => (y % 22 === 0 && x % 5 !== 4 ? '#8a7438' : null))
    r.rect(0, 0, g.w, wall.ceiling, '#6a5428')
    r.hline(0, wall.ceiling, g.w, '#f0e0a0')
    // The big window on the bay, across the middle of the wall.
    const winH = Math.max(14, wall.room - 2)
    const winW = Math.min(g.w - 16, Math.round(g.felt.w * 0.9))
    const winX = Math.round(g.w / 2 - winW / 2)
    const winY = wall.ceiling + 2
    windowFrame(r, { x: winX, y: winY, w: winW, h: winH }, '#f8f0d8', (rr, glass) => {
      vGradient(rr, glass.x, glass.y, glass.w, Math.ceil(glass.h * 0.6), '#f8a868', '#f8d8a0', 4)
      // The sun going down over the water.
      rr.ellipse(glass.x + Math.round(glass.w * 0.62) - 6, glass.y + Math.round(glass.h * 0.6) - 7, 13, 13, '#f8e8a0')
      sea(rr, { x: glass.x, y: glass.y + Math.round(glass.h * 0.6), w: glass.w, h: Math.ceil(glass.h * 0.4) }, '#1e7a8a', '#3aa8b0', '#f8f0c0')
    })
    // Palms framing the window.
    for (const px of [winX + 6, winX + winW - 6]) {
      const top = winY + 4
      const bottom = wall.floor
      for (let y = top; y < bottom; y++) r.rect(px - 1 + Math.round(Math.sin(y / 9) * 1.2), y, 3, 1, (y >> 2) % 2 ? '#7a5a2a' : '#9a7a3a')
      for (let i = 0; i < 5; i++) {
        const ang = -Math.PI / 2 + (i - 2) * 0.6
        for (let s = 0; s < 14; s++) {
          const x = Math.round(px + Math.cos(ang) * s * 1.4)
          const y = Math.round(top + Math.sin(ang) * s * 0.6 + (s * s) / 18)
          r.rect(x, y, 2, 2, s % 3 === 0 ? '#2a8a3a' : '#3aa84a')
        }
      }
    }
    // Tiki torches at the ends.
    along(g, Math.max(120, g.w), 14, (x) => {
      for (const tx of [x, g.w - x]) {
        r.rect(tx - 1, wall.floor - 30, 3, 30, '#6a4a2a')
        r.rect(tx - 3, wall.floor - 36, 7, 6, '#8a6a3a')
        r.rect(tx - 2, wall.floor - 42, 5, 6, '#f8a030')
        r.rect(tx - 1, wall.floor - 45, 3, 4, '#f8e060')
        glow(r, tx, wall.floor - 40, 16, 14, '#f8c060', 0.5)
      }
    })
    r.rect(0, wall.floor, g.w, g.h - wall.floor, '#e8d8b0')
    planks(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, { base: '#e0c898', light: '#f0dcb0', dark: '#b89a68', size: 8, vertical: false, salt: 9 })
    skirting(r, wall.floor, g.w, '#8a7438')
  },

  // Neon Mesa: a black room lit by tubes — signs on the walls, a row of lights
  // overhead, and confetti carpet.
  mesa(r, g, wall) {
    vGradient(r, 0, 0, g.w, wall.floor, '#0c0614', '#1c0e2c', 4)
    r.rect(0, 0, g.w, wall.ceiling, '#06030a')
    // A row of ceiling lights.
    along(g, 14, 4, (x) => {
      r.rect(x, wall.ceiling, 4, 2, '#f8f0ff')
      glow(r, x + 2, wall.ceiling + 2, 6, 5, '#c8a0f8', 0.4)
    })
    // Neon tubes along the wall: zigzags in cyan and a pink baseline.
    r.each(0, wall.floor - 8, g.w, 6, (x, y) => (Math.abs(((x % 16) - 8) / 2) - (y - (wall.floor - 8)) === 0 ? '#48e8f8' : null))
    r.hline(0, wall.floor - 12, g.w, '#f048c8')
    r.hline(0, wall.floor - 11, g.w, '#601848')
    // A bank of slot machines along the wall, their screens lit.
    along(g, 22, 3, (x) => {
      const top = wall.floor - 30
      r.rect(x, top, 18, 30, '#2a1a3a')
      r.box(x, top, 18, 30, '#08040c')
      r.rect(x + 2, top + 2, 14, 5, '#f048c8')
      r.hline(x + 3, top + 3, 12, '#f8a8e8')
      r.rect(x + 3, top + 9, 12, 7, '#100818')
      for (let k = 0; k < 3; k++) r.rect(x + 4 + k * 4, top + 10, 3, 5, ['#f8f0f0', '#f8e048', '#f8f0f0'][k])
      r.put(x + 5, top + 12, '#e83030')
      r.put(x + 9, top + 12, '#e83030')
      r.put(x + 13, top + 12, '#e83030')
      r.rect(x + 4, top + 19, 10, 2, '#48e8f8')
      r.rect(x + 3, top + 24, 12, 3, '#08040c')
      glow(r, x + 9, top + 12, 12, 10, '#c870f8', 0.3)
    })
    // Neon cacti — this is the desert, however much the room pretends not to be.
    const cactus = (cx: number, cy: number) => {
      const ink = '#68f888'
      const tube = (x0: number, y0: number, x1: number, y1: number) => {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
        for (let s = 0; s <= steps; s++) r.put(Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps), ink)
      }
      tube(cx, cy - 12, cx, cy + 10)
      tube(cx + 4, cy - 12, cx + 4, cy + 10)
      tube(cx, cy - 12, cx + 4, cy - 12)
      tube(cx - 6, cy - 6, cx - 6, cy + 1)
      tube(cx - 6, cy + 1, cx, cy + 1)
      tube(cx + 10, cy - 9, cx + 10, cy - 1)
      tube(cx + 10, cy - 1, cx + 4, cy - 1)
      glow(r, cx + 2, cy, 14, 16, '#48f878', 0.45)
    }
    // Signs: POKER in pink over the middle; sevens, stars and cacti in turn
    // along the rest of the wall, outward from it.
    const sign = 'POKER'
    const sw = measureText(sign) * 2
    const sy = Math.max(wall.ceiling + 4, wall.hang - 7)
    for (let k = 1; k * 56 < g.w / 2 + 40; k++) {
      for (const side of [-1, 1]) {
        const x = Math.round(g.w / 2 + side * (44 + k * 56))
        const kind = k % 3
        if (kind === 1) neonText(r, '777', x - 8, sy + 2, '#f8e048')
        else if (kind === 0) cactus(x - 2, wall.hang)
      }
    }
    bigNeon(r, sign, Math.round(g.w / 2 - sw / 2), sy, '#f048c8')
    along(g, 168, Math.round(g.w / 2) % 168 + 112, (x) => {
      if (Math.abs(x - g.w / 2) < 60) return
      // A neon star.
      const pts = [[0, -5], [1, -2], [5, -2], [2, 1], [3, 5], [0, 3], [-3, 5], [-2, 1], [-5, -2], [-1, -2]]
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i]
        const [bx, by] = pts[(i + 1) % pts.length]
        const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay))
        for (let s = 0; s <= steps; s++) {
          const px = Math.round(x + ax + ((bx - ax) * s) / steps)
          const py = Math.round(sy + 3 + ay + ((by - ay) * s) / steps)
          r.put(px, py, '#88f8ff')
        }
      }
      glow(r, x, sy + 3, 10, 9, '#48e8f8', 0.5)
    })
    carpet(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, '#0c0814', '#2a1840', '#f048c8', 'confetti')
    r.hline(0, wall.floor, g.w, '#48e8f8')
  },

  // The Invitational: a private room on a rooftop over the Strip — glass walls on
  // the skyline at night, art-deco gold, a dark marble floor.
  invitational(r, g, wall) {
    nightSky(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#080818', '#28205a', 17)
    // A moon.
    const mx = Math.round(g.w * 0.82)
    r.ellipse(mx, wall.ceiling + 4, 12, 12, '#f8f0d0')
    r.ellipse(mx + 3, wall.ceiling + 3, 10, 10, '#0c0c22')
    skyline(r, { x: 0, y: Math.round(wall.floor * 0.45), w: g.w, h: Math.ceil(wall.floor * 0.55) }, '#140e2a', '#f8d878', 23)
    // Neon on a couple of the towers.
    along(g, 140, 50, (x) => {
      r.rect(x, Math.round(wall.floor * 0.5), 2, 10, '#f048c8')
      r.rect(x + 20, Math.round(wall.floor * 0.55), 8, 2, '#48e8f8')
    })
    // Glass wall mullions, gold, every so often.
    along(g, 48, 0, (x) => {
      r.rect(x, 0, 3, wall.floor, '#c8a040')
      r.vline(x, 0, wall.floor, '#f8d870')
      r.vline(x + 2, 0, wall.floor, '#8a6418')
    })
    r.rect(0, 0, g.w, wall.ceiling, '#100c08')
    r.hline(0, wall.ceiling, g.w, '#f8d870')
    // Art-deco frieze along the ceiling.
    along(g, 12, 0, (x) => {
      r.rect(x + 3, wall.ceiling + 1, 6, 2, '#c8a040')
      r.put(x + 5, wall.ceiling + 3, '#c8a040')
      r.put(x + 6, wall.ceiling + 3, '#c8a040')
    })
    marble(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, '#1c1a24', '#3a3648', 3)
    r.hline(0, wall.floor, g.w, '#f8d870')
    r.hline(0, wall.floor + 1, g.w, '#8a6418')
  },

  // Porto Lumina: white marble, gold columns, red velvet drapes, sconces.
  lumina(r, g, wall) {
    marble(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#ece6dc', '#b8b0a8', 2)
    r.rect(0, 0, g.w, wall.ceiling, '#d8c8a0')
    r.hline(0, wall.ceiling, g.w, '#c8982e')
    r.hline(0, wall.ceiling + 1, g.w, '#f0cc60')
    // Columns with drapes between, sconces on the columns.
    const span = 84
    along(g, span, 8, (x) => {
      column(r, x, wall.ceiling + 2, 10, wall.floor - wall.ceiling - 2, '#f4eee4', '#ffffff', '#c8c0b4', '#e0b850')
      curtain(r, { x: x + 12, y: wall.ceiling + 2, w: 12, h: wall.floor - wall.ceiling - 6 }, '#a01830', '#c83048', '#600c1c')
      curtain(r, { x: x + span - 14, y: wall.ceiling + 2, w: 12, h: wall.floor - wall.ceiling - 6 }, '#a01830', '#c83048', '#600c1c')
    })
    along(g, span, 8 + span / 2, (x) => brassLamp(r, x, wall.hang - 4, '#d0a040', '#fff0c0'))
    // Potted palms in gilded urns at the foot of the columns.
    along(g, span, 13, (x) => plant(r, x - 9, wall.floor - 1, '#c8982e', '#2a7a3a'))
    checker(r, { x: 0, y: wall.floor, w: g.w, h: g.h - wall.floor }, '#f0ece4', '#3a3434', 12)
    r.each(0, wall.floor, g.w, g.h - wall.floor, (x, y) => (Math.abs(Math.sin(x * 0.13 + y * 0.21) - 0.98) < 0.01 ? '#c8c0b8' : null))
    skirting(r, wall.floor, g.w, '#c8982e')
  },

  // The Challenge: the penthouse floor at night. Tall arched windows on the sea,
  // a chandelier, velvet, gold, and a red carpet.
  finale(r, g, wall) {
    wallpaper(r, { x: 0, y: 0, w: g.w, h: wall.floor }, '#2a1424', '#3e2034', 'damask')
    r.rect(0, 0, g.w, wall.ceiling, '#140a10')
    r.hline(0, wall.ceiling, g.w, '#f0c850')
    r.hline(0, wall.ceiling + 1, g.w, '#a07820')
    const winW = 28
    along(g, 72, 22, (x) => {
      const top = wall.ceiling + 6
      const h = wall.floor - top - 10
      if (h < 16) return
      windowFrame(
        r,
        { x, y: top, w: winW, h },
        '#d8b048',
        (rr, glass) => {
          nightSky(rr, glass, '#060818', '#1a2048', 29)
          rr.ellipse(glass.x + 4, glass.y + 6, 7, 7, '#f8f0d0')
          sea(rr, { x: glass.x, y: glass.y + Math.round(glass.h * 0.62), w: glass.w, h: Math.ceil(glass.h * 0.38) }, '#0c1a38', '#1a3058', '#f8f0c0')
        },
        true,
      )
      curtain(r, { x: x - 8, y: top - 2, w: 7, h: h + 6 }, '#8a1020', '#b82838', '#4a0810')
      curtain(r, { x: x + winW + 1, y: top - 2, w: 7, h: h + 6 }, '#8a1020', '#b82838', '#4a0810')
    })
    // Chandeliers down the room, the light pooling under each.
    along(g, 150, Math.round(g.w / 2) % 150, (x) => chandelier(r, x, wall.ceiling + 2, Math.max(10, Math.min(24, wall.room - 8))))
    // A royal carpet: crimson, a gold lozenge repeat, and a border.
    r.each(0, wall.floor, g.w, g.h - wall.floor, (x, y) => {
      const u = x % 20
      const v = (y - wall.floor) % 14
      const d = Math.abs(u - 10) / 10 + Math.abs(v - 7) / 7
      if (d > 0.86 && d < 1.0) return '#c89838'
      if (d < 0.16) return '#f0c850'
      if (d > 0.4 && d < 0.5) return '#9a1828'
      return '#7a1020'
    })
    r.rect(0, wall.floor + 2, g.w, 3, '#f0c850')
    r.hline(0, wall.floor + 5, g.w, '#8a6418')
    skirting(r, wall.floor, g.w, '#3a1a10')
  },
}

/** The table's shadow on the floor, under its near half. */
function tableShadow(r: Raster, felt: Rect) {
  const cx = felt.x + felt.w / 2
  const cy = felt.y + felt.h * 0.62
  r.each(felt.x - 8, felt.y, felt.w + 16, felt.h + 12, (x, y) => {
    const d = ((x - cx) / (felt.w / 2 + 6)) ** 2 + ((y - cy) / (felt.h * 0.5)) ** 2
    if (d > 1) return null
    return dither(x, y, 0.55) ? '#000000' : null
  })
}

export function paintRoom(theme: TableThemeId, g: RoomGeometry): Raster {
  const r = new Raster(g.w, g.h)
  const wall = wallOf(g)
  ROOMS[theme](r, g, wall)
  tableShadow(r, g.felt)
  return r
}
