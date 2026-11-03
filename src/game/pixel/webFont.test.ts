import { describe, expect, it } from 'vitest'
import { GLYPHS, SUBSTITUTES, TRACKING } from './font'
import { buildPixelFont } from './webFont'

/** Reads back the tables of the font the UI is set in, the way a browser would. */
function tables(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const count = view.getUint16(4)
  const out = new Map<string, { offset: number; length: number; sum: number }>()
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16
    const tag = String.fromCharCode(...bytes.slice(at, at + 4))
    out.set(tag, { sum: view.getUint32(at + 4), offset: view.getUint32(at + 8), length: view.getUint32(at + 12) })
  }
  return { view, out }
}

function sum(bytes: Uint8Array, offset: number, length: number): number {
  let total = 0
  for (let i = 0; i < length; i += 4) {
    const word = ((bytes[offset + i] << 24) | ((i + 1 < length ? bytes[offset + i + 1] : 0) << 16) |
      ((i + 2 < length ? bytes[offset + i + 2] : 0) << 8) | (i + 3 < length ? bytes[offset + i + 3] : 0)) >>> 0
    total = (total + word) >>> 0
  }
  return total
}

/** Character to glyph id, from the format 4 cmap subtable. */
function lookup(view: DataView, cmapAt: number, code: number): number {
  const sub = cmapAt + view.getUint32(cmapAt + 8)
  const segs = view.getUint16(sub + 6) / 2
  const ends = sub + 14
  const starts = ends + segs * 2 + 2
  const deltas = starts + segs * 2
  for (let i = 0; i < segs; i++) {
    if (code > view.getUint16(ends + i * 2)) continue
    if (code < view.getUint16(starts + i * 2)) return 0
    return (code + view.getUint16(deltas + i * 2)) & 0xffff
  }
  return 0
}

describe('the UI pixel font', () => {
  const bytes = buildPixelFont()
  const { view, out } = tables(bytes)

  it('has the tables a browser needs, each with a true checksum', () => {
    expect([...out.keys()]).toEqual(['OS/2', 'cmap', 'glyf', 'head', 'hhea', 'hmtx', 'loca', 'maxp', 'name', 'post'])
    for (const [tag, t] of out) {
      if (tag === 'head') continue // carries the whole file's adjustment
      expect(sum(bytes, t.offset, t.length), tag).toBe(t.sum)
    }
    expect(sum(bytes, 0, bytes.length)).toBe(0xb1b0afba)
  })

  it('answers for every character the table font draws, at its width', () => {
    const cmap = out.get('cmap')!.offset
    const hmtx = out.get('hmtx')!.offset
    const unitsPerEm = view.getUint16(out.get('head')!.offset + 18)
    expect(unitsPerEm).toBe(1000)
    for (const [ch, rows] of Object.entries(GLYPHS)) {
      const id = lookup(view, cmap, ch.codePointAt(0)!)
      expect(id, ch).toBeGreaterThan(1)
      // Ten art pixels to the em: a glyph's advance is its width plus tracking.
      expect(view.getUint16(hmtx + id * 4), ch).toBe((rows[0].length + TRACKING) * 100)
    }
    for (const [ch, sub] of Object.entries(SUBSTITUTES)) {
      expect(lookup(view, cmap, ch.codePointAt(0)!), ch).toBe(sub === ' ' ? 1 : lookup(view, cmap, sub.codePointAt(0)!))
    }
    // A character the font has no glyph for is left to the fallback.
    expect(lookup(view, cmap, '🔒'.codePointAt(0)! & 0xffff)).toBe(0)
  })
})
