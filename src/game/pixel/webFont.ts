import { GLYPHS, SPACE, SUBSTITUTES, TRACKING } from './font'

/**
 * The table's bitmap font, compiled into a real font for the rest of the UI.
 *
 * The menus, the HUD and the dialogue box are ordinary HTML: they wrap, they
 * scroll, they hold text inputs. Drawing them as SVG words the way the table
 * does would mean rebuilding all of that by hand. Instead the glyph rows in
 * `font.ts` are turned, at start-up, into a TrueType file in memory — each lit
 * pixel a square outline — and handed to the browser as a `FontFace`. Nothing
 * is downloaded and no font file ships with the game; the letters on a menu are
 * the same pixels as the letters on the table.
 *
 * Ten art pixels to the em: at `font-size: 20px` one font pixel is two CSS
 * pixels, the same size as a pixel of the overworld. Capitals are 0.7em tall
 * and a lowercase letter is half an em wide, so the font sets about as wide as
 * the monospace it replaces and a layout that fitted before still fits.
 */

export const PIXEL_FONT_FAMILY = 'Legend Pixel'

/**
 * The UI's font stack. The fallback only ever draws characters the pixel font
 * has no glyph for (emoji icons, mostly); every letter, digit and mark in the
 * game's text is in the font.
 */
export const UI_FONT = `'${PIXEL_FONT_FAMILY}', monospace`

/**
 * The sizes the UI sets type at. At 10px and 20px a font pixel is one and two
 * CSS pixels, so the letters are sharp on any screen; 15px is a pixel and a
 * half, sharp on a retina screen and slightly soft on a 1x one, and is the size
 * for the long text of menus, where 20px would not fit.
 */
export const TYPE = { small: 10, body: 15, large: 20, title: 30 } as const

/** Text meant to be read line by line, a box of it at a time: dialogue, a question. */
export function readingSize(view: { w: number; h: number }): number {
  return view.w >= 480 && view.h >= 520 ? TYPE.large : TYPE.body
}

/** Font units to one art pixel, and art pixels to the em. */
const UNIT = 100
const UNITS_PER_EM = 10 * UNIT
/** Glyph rows are numbered from the cap line; row 6 sits on the baseline. */
const BASELINE_ROW = 6
/** Room above the cap line for accents, and below the baseline for descenders and a little air. */
const ASCENT = 9 * UNIT
const DESCENT = 3 * UNIT

type Box = [x0: number, y0: number, x1: number, y1: number]

interface Glyph {
  advance: number
  /** Lit pixels merged into rectangles, in font units. */
  boxes: Box[]
}

/** Lit pixels as rectangles: runs along each row, stacked where rows repeat. */
function boxesOf(rows: string[]): Box[] {
  const open = new Map<string, Box>()
  const done: Box[] = []
  rows.forEach((row, r) => {
    const top = (BASELINE_ROW + 1 - r) * UNIT
    const runs: [number, number][] = []
    for (let x = 0; x < row.length; x++) {
      if (row[x] !== '#') continue
      const start = x
      while (row[x + 1] === '#') x++
      runs.push([start, x + 1])
    }
    const next = new Map<string, Box>()
    for (const [a, b] of runs) {
      const key = `${a}:${b}`
      const above = open.get(key)
      if (above) {
        above[1] = top - UNIT
        next.set(key, above)
        open.delete(key)
      } else {
        next.set(key, [a * UNIT, top - UNIT, b * UNIT, top])
      }
    }
    for (const box of open.values()) done.push(box)
    open.clear()
    for (const [key, box] of next) open.set(key, box)
  })
  for (const box of open.values()) done.push(box)
  return done
}

/** Every character the font answers for, and the glyph it draws. */
function charMap(): { glyphs: Glyph[]; codes: Map<number, number> } {
  const glyphs: Glyph[] = [
    // .notdef: never seen, since a missing character falls back to the next font.
    { advance: 5 * UNIT, boxes: [] },
    { advance: (SPACE + TRACKING) * UNIT, boxes: [] },
  ]
  const codes = new Map<number, number>([[0x20, 1]])
  const byChar = new Map<string, number>([[' ', 1]])
  for (const [ch, rows] of Object.entries(GLYPHS)) {
    byChar.set(ch, glyphs.length)
    glyphs.push({ advance: (rows[0].length + TRACKING) * UNIT, boxes: boxesOf(rows) })
    const code = ch.codePointAt(0)!
    if (code <= 0xffff) codes.set(code, byChar.get(ch)!)
  }
  for (const [ch, sub] of Object.entries(SUBSTITUTES)) {
    const id = byChar.get(sub)
    const code = ch.codePointAt(0)!
    if (id !== undefined && code <= 0xffff && !codes.has(code)) codes.set(code, id)
  }
  return { glyphs, codes }
}

class Writer {
  private bytes: number[] = []
  get length(): number {
    return this.bytes.length
  }
  u8(v: number): this {
    this.bytes.push(v & 0xff)
    return this
  }
  u16(v: number): this {
    return this.u8(v >> 8).u8(v)
  }
  i16(v: number): this {
    return this.u16(v < 0 ? v + 0x10000 : v)
  }
  u32(v: number): this {
    return this.u16((v >>> 16) & 0xffff).u16(v & 0xffff)
  }
  tag(t: string): this {
    for (let i = 0; i < 4; i++) this.u8(t.charCodeAt(i))
    return this
  }
  pad4(): this {
    while (this.bytes.length % 4) this.u8(0)
    return this
  }
  append(other: Writer): this {
    for (const b of other.bytes) this.bytes.push(b)
    return this
  }
  toBytes(): Uint8Array {
    return Uint8Array.from(this.bytes)
  }
}

function checksum(bytes: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < bytes.length; i += 4) {
    const word = ((bytes[i] << 24) | ((bytes[i + 1] ?? 0) << 16) | ((bytes[i + 2] ?? 0) << 8) | (bytes[i + 3] ?? 0)) >>> 0
    sum = (sum + word) >>> 0
  }
  return sum
}

function nameTable(family: string): Writer {
  const strings: [number, string][] = [
    [1, family],
    [2, 'Regular'],
    [3, `${family} Regular`],
    [4, family],
    [5, 'Version 1.000'],
    [6, `${family.replace(/\s+/g, '')}-Regular`],
  ]
  const w = new Writer().u16(0).u16(strings.length).u16(6 + 12 * strings.length)
  const storage = new Writer()
  for (const [id, text] of strings) {
    w.u16(3).u16(1).u16(0x0409).u16(id).u16(text.length * 2).u16(storage.length)
    for (let i = 0; i < text.length; i++) storage.u16(text.charCodeAt(i))
  }
  return w.append(storage)
}

function cmapTable(codes: Map<number, number>): Writer {
  const sorted = [...codes.entries()].sort((a, b) => a[0] - b[0])
  // Runs of consecutive characters drawn by consecutive glyphs share a segment.
  const segments: { start: number; end: number; delta: number }[] = []
  for (const [code, id] of sorted) {
    const last = segments[segments.length - 1]
    if (last && code === last.end + 1 && id - code === last.delta) last.end = code
    else segments.push({ start: code, end: code, delta: id - code })
  }
  segments.push({ start: 0xffff, end: 0xffff, delta: 1 })
  const n = segments.length
  const pow = 2 ** Math.floor(Math.log2(n))
  const sub = new Writer()
    .u16(4)
    .u16(16 + 8 * n)
    .u16(0)
    .u16(n * 2)
    .u16(pow * 2)
    .u16(Math.log2(pow))
    .u16(n * 2 - pow * 2)
  for (const s of segments) sub.u16(s.end)
  sub.u16(0)
  for (const s of segments) sub.u16(s.start)
  for (const s of segments) sub.u16((s.delta + 0x10000) & 0xffff)
  for (let i = 0; i < n; i++) sub.u16(0)
  // One subtable, listed for both Unicode and Windows platforms.
  return new Writer().u16(0).u16(2).u16(0).u16(3).u32(20).u16(3).u16(1).u32(20).append(sub)
}

/** Builds the font file. Pure, so it can be checked in a unit test. */
export function buildPixelFont(family = PIXEL_FONT_FAMILY): Uint8Array {
  const { glyphs, codes } = charMap()

  const glyf = new Writer()
  const offsets: number[] = []
  let maxPoints = 0
  let maxContours = 0
  const bounds = { x0: 0, y0: 0, x1: 0, y1: 0 }
  const lsbs: number[] = []
  let minRsb = Infinity
  let xMaxExtent = 0
  for (const g of glyphs) {
    offsets.push(glyf.length)
    if (g.boxes.length === 0) {
      lsbs.push(0)
      continue
    }
    const x0 = Math.min(...g.boxes.map((b) => b[0]))
    const y0 = Math.min(...g.boxes.map((b) => b[1]))
    const x1 = Math.max(...g.boxes.map((b) => b[2]))
    const y1 = Math.max(...g.boxes.map((b) => b[3]))
    bounds.x0 = Math.min(bounds.x0, x0)
    bounds.y0 = Math.min(bounds.y0, y0)
    bounds.x1 = Math.max(bounds.x1, x1)
    bounds.y1 = Math.max(bounds.y1, y1)
    lsbs.push(x0)
    minRsb = Math.min(minRsb, g.advance - x1)
    xMaxExtent = Math.max(xMaxExtent, x1)
    maxPoints = Math.max(maxPoints, g.boxes.length * 4)
    maxContours = Math.max(maxContours, g.boxes.length)

    glyf.i16(g.boxes.length).i16(x0).i16(y0).i16(x1).i16(y1)
    g.boxes.forEach((_, i) => glyf.u16(i * 4 + 3))
    glyf.u16(0) // no instructions
    // Each pixel run is a square contour, clockwise, every point on the curve.
    const points = g.boxes.flatMap(([a, b, c, d]) => [
      [a, b],
      [a, d],
      [c, d],
      [c, b],
    ])
    for (let i = 0; i < points.length; i++) glyf.u8(0x01)
    let px = 0
    for (const [x] of points) {
      glyf.i16(x - px)
      px = x
    }
    let py = 0
    for (const [, y] of points) {
      glyf.i16(y - py)
      py = y
    }
    glyf.pad4()
  }
  offsets.push(glyf.length)

  const loca = new Writer()
  for (const o of offsets) loca.u32(o)

  const hmtx = new Writer()
  glyphs.forEach((g, i) => hmtx.u16(g.advance).i16(lsbs[i]))

  const advanceMax = Math.max(...glyphs.map((g) => g.advance))
  const inked = glyphs.filter((g) => g.boxes.length)
  const avgWidth = Math.round(inked.reduce((s, g) => s + g.advance, 0) / inked.length)
  const codeList = [...codes.keys()]

  const head = new Writer()
    .u16(1).u16(0)
    .u32(0x00010000)
    .u32(0) // checkSumAdjustment, filled in below
    .u32(0x5f0f3cf5)
    .u16(0x0001) // baseline at y = 0
    .u16(UNITS_PER_EM)
    .u32(0).u32(0).u32(0).u32(0) // created, modified
    .i16(bounds.x0).i16(bounds.y0).i16(bounds.x1).i16(bounds.y1)
    .u16(0) // macStyle
    .u16(8) // lowestRecPPEM
    .i16(2)
    .i16(1) // long loca offsets
    .i16(0)

  const hhea = new Writer()
    .u16(1).u16(0)
    .i16(ASCENT).i16(-DESCENT).i16(0)
    .u16(advanceMax)
    .i16(0)
    .i16(Number.isFinite(minRsb) ? minRsb : 0)
    .i16(xMaxExtent)
    .i16(1).i16(0).i16(0)
    .i16(0).i16(0).i16(0).i16(0)
    .i16(0)
    .u16(glyphs.length)

  const maxp = new Writer()
    .u32(0x00010000)
    .u16(glyphs.length)
    .u16(maxPoints)
    .u16(maxContours)
    .u16(0).u16(0)
    .u16(2)
    .u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0)

  const os2 = new Writer()
    .u16(4)
    .i16(avgWidth)
    .u16(400)
    .u16(5)
    .u16(0) // installable
    .i16(650).i16(600).i16(0).i16(75) // subscript
    .i16(650).i16(600).i16(0).i16(350) // superscript
    .i16(UNIT).i16(3 * UNIT) // strikeout
    .i16(0)
  for (let i = 0; i < 10; i++) os2.u8(0) // panose
  os2
    .u32(0b11).u32(0).u32(0).u32(0) // Basic Latin, Latin-1
    .tag('PKLG')
    .u16(0x00c0) // REGULAR | USE_TYPO_METRICS
    .u16(Math.min(...codeList))
    .u16(Math.max(...codeList))
    .i16(ASCENT).i16(-DESCENT).i16(0)
    .u16(ASCENT).u16(DESCENT)
    .u32(1).u32(0) // Latin 1 code page
    .i16(5 * UNIT).i16(7 * UNIT) // x-height, cap height
    .u16(0).u16(0x20).u16(0)

  const post = new Writer()
    .u32(0x00030000)
    .u32(0)
    .i16(-UNIT * 1.5).i16(UNIT)
    .u32(0)
    .u32(0).u32(0).u32(0).u32(0)

  const tables: [string, Writer][] = [
    ['OS/2', os2],
    ['cmap', cmapTable(codes)],
    ['glyf', glyf],
    ['head', head],
    ['hhea', hhea],
    ['hmtx', hmtx],
    ['loca', loca],
    ['maxp', maxp],
    ['name', nameTable(family)],
    ['post', post],
  ]

  const n = tables.length
  const pow = 2 ** Math.floor(Math.log2(n))
  const out = new Writer().u32(0x00010000).u16(n).u16(pow * 16).u16(Math.log2(pow)).u16(n * 16 - pow * 16)
  let offset = 12 + 16 * n
  const bodies = tables.map(([tag, w]) => {
    const bytes = w.toBytes()
    const record = { tag, bytes, offset, sum: checksum(bytes) }
    offset += Math.ceil(bytes.length / 4) * 4
    return record
  })
  for (const t of bodies) out.tag(t.tag).u32(t.sum).u32(t.offset).u32(t.bytes.length)
  const font = new Writer().append(out)
  for (const t of bodies) {
    for (const b of t.bytes) font.u8(b)
    font.pad4()
  }
  const bytes = font.toBytes()
  const headAt = bodies.find((t) => t.tag === 'head')!.offset
  const adjust = (0xb1b0afba - checksum(bytes)) >>> 0
  new DataView(bytes.buffer).setUint32(headAt + 8, adjust)
  return bytes
}

let installed = false

/** Registers the pixel font with the document. Safe to call more than once. */
export function installPixelFont(): void {
  if (installed || typeof document === 'undefined' || typeof FontFace === 'undefined' || !document.fonts) return
  installed = true
  const bytes = buildPixelFont()
  const face = new FontFace(PIXEL_FONT_FAMILY, bytes.buffer as ArrayBuffer)
  document.fonts.add(face)
  face.load().catch((err: unknown) => console.warn('pixel font failed to load', err))
}
