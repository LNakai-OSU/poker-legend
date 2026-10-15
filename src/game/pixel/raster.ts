import { rgbOf } from './color'

/**
 * A software framebuffer at the art's native resolution.
 *
 * The table's art — felt, rail, room, cards, chips, faces, panel frames — is
 * drawn pixel by pixel into one of these and then shown scaled up with
 * nearest-neighbour filtering, which is what makes it read as the same GBA-era
 * game as the overworld rather than as a web page. Drawing at native size and
 * scaling once is also what keeps every pixel the same size on screen.
 */

/** A colour packed the way ImageData stores it on little-endian machines. */
export type Packed = number

const packCache = new Map<string, Packed>()

/** Packs `#rrggbb` (optionally with an alpha 0..255) into a framebuffer colour. */
export function pack(hex: string, alpha = 255): Packed {
  const key = alpha === 255 ? hex : `${hex}/${alpha}`
  const hit = packCache.get(key)
  if (hit !== undefined) return hit
  const [r, g, b] = rgbOf(hex)
  const value = ((alpha & 0xff) << 24) | (b << 16) | (g << 8) | r
  packCache.set(key, value >>> 0)
  return value >>> 0
}

export type Ink = string | Packed

function toPacked(ink: Ink): Packed {
  return typeof ink === 'number' ? ink : pack(ink)
}

export class Raster {
  readonly width: number
  readonly height: number
  readonly pixels: Uint32Array

  constructor(width: number, height: number) {
    this.width = Math.max(1, Math.floor(width))
    this.height = Math.max(1, Math.floor(height))
    this.pixels = new Uint32Array(this.width * this.height)
  }

  /** Sets one pixel. Partly transparent colours are blended over what is there. */
  set(x: number, y: number, ink: Ink): void {
    x = Math.floor(x)
    y = Math.floor(y)
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const c = toPacked(ink)
    const a = c >>> 24
    if (a === 0) return
    const i = y * this.width + x
    if (a === 255) {
      this.pixels[i] = c
      return
    }
    const d = this.pixels[i]
    const da = d >>> 24
    const t = a / 255
    const r = (c & 0xff) * t + (d & 0xff) * (1 - t)
    const g = ((c >> 8) & 0xff) * t + ((d >> 8) & 0xff) * (1 - t)
    const b = ((c >> 16) & 0xff) * t + ((d >> 16) & 0xff) * (1 - t)
    const outA = Math.min(255, a + da * (1 - t))
    this.pixels[i] = ((outA << 24) | (Math.round(b) << 16) | (Math.round(g) << 8) | Math.round(r)) >>> 0
  }

  /** Overwrites one pixel outright, transparency included. */
  put(x: number, y: number, ink: Ink): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    this.pixels[y * this.width + x] = toPacked(ink)
  }

  get(x: number, y: number): Packed {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return 0
    return this.pixels[y * this.width + x]
  }

  isClear(x: number, y: number): boolean {
    return this.get(x, y) >>> 24 === 0
  }

  rect(x: number, y: number, w: number, h: number, ink: Ink): void {
    const c = toPacked(ink)
    const x0 = Math.max(0, Math.floor(x))
    const y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(this.width, Math.floor(x + w))
    const y1 = Math.min(this.height, Math.floor(y + h))
    if (c >>> 24 === 255) {
      for (let yy = y0; yy < y1; yy++) this.pixels.fill(c, yy * this.width + x0, yy * this.width + x1)
      return
    }
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) this.set(xx, yy, c)
  }

  hline(x: number, y: number, w: number, ink: Ink): void {
    this.rect(x, y, w, 1, ink)
  }

  vline(x: number, y: number, h: number, ink: Ink): void {
    this.rect(x, y, 1, h, ink)
  }

  /** A one-pixel rectangle outline. */
  box(x: number, y: number, w: number, h: number, ink: Ink): void {
    this.hline(x, y, w, ink)
    this.hline(x, y + h - 1, w, ink)
    this.vline(x, y, h, ink)
    this.vline(x + w - 1, y, h, ink)
  }

  /** A filled ellipse inside the box (x, y, w, h). */
  ellipse(x: number, y: number, w: number, h: number, ink: Ink): void {
    const rx = w / 2
    const ry = h / 2
    const cx = x + rx
    const cy = y + ry
    for (let yy = Math.floor(y); yy < y + h; yy++) {
      const dy = (yy + 0.5 - cy) / ry
      if (Math.abs(dy) > 1) continue
      const half = rx * Math.sqrt(1 - dy * dy)
      const x0 = Math.round(cx - half)
      const x1 = Math.round(cx + half)
      this.rect(x0, yy, x1 - x0, 1, ink)
    }
  }

  /** Runs `fn` for every pixel in a box, for dithers and gradients. */
  each(x: number, y: number, w: number, h: number, fn: (x: number, y: number) => Ink | null): void {
    const x0 = Math.max(0, Math.floor(x))
    const y0 = Math.max(0, Math.floor(y))
    const x1 = Math.min(this.width, Math.floor(x + w))
    const y1 = Math.min(this.height, Math.floor(y + h))
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) {
        const ink = fn(xx, yy)
        if (ink !== null) this.set(xx, yy, ink)
      }
    }
  }

  /** Copies another raster on top of this one, skipping its transparent pixels. */
  blit(src: Raster, dx: number, dy: number, flipX = false): void {
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const c = src.pixels[y * src.width + x]
        if (c >>> 24 === 0) continue
        this.set(dx + (flipX ? src.width - 1 - x : x), dy + y, c)
      }
    }
  }

  /** Draws pixel rows written as strings: `.` is clear, any other key looks up `palette`. */
  sprite(rows: string[], dx: number, dy: number, palette: Record<string, Ink>, flipX = false): void {
    for (let y = 0; y < rows.length; y++) {
      const row = rows[y]
      for (let x = 0; x < row.length; x++) {
        const key = row[x]
        if (key === '.' || key === ' ') continue
        const ink = palette[key]
        if (ink === undefined) continue
        this.set(dx + (flipX ? row.length - 1 - x : x), dy + y, ink)
      }
    }
  }

  /**
   * Gives every opaque region a one-pixel outline in `ink`, in the pixels just
   * outside it. The dark outline is what separates a GBA sprite from whatever it
   * is drawn over.
   */
  outline(ink: Ink, diagonal = false): void {
    const c = toPacked(ink)
    const marks: number[] = []
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (!this.isClear(x, y)) continue
        const solid =
          !this.isClear(x - 1, y) ||
          !this.isClear(x + 1, y) ||
          !this.isClear(x, y - 1) ||
          !this.isClear(x, y + 1) ||
          (diagonal &&
            (!this.isClear(x - 1, y - 1) ||
              !this.isClear(x + 1, y - 1) ||
              !this.isClear(x - 1, y + 1) ||
              !this.isClear(x + 1, y + 1)))
        if (solid) marks.push(y * this.width + x)
      }
    }
    for (const i of marks) this.pixels[i] = c
  }

  toImageData(): ImageData {
    const bytes = new Uint8ClampedArray(this.width * this.height * 4)
    bytes.set(new Uint8Array(this.pixels.buffer, this.pixels.byteOffset, this.pixels.byteLength))
    return new ImageData(bytes, this.width, this.height)
  }

  /** Paints this raster into a canvas, resizing the canvas to fit. */
  paint(canvas: HTMLCanvasElement): void {
    if (canvas.width !== this.width) canvas.width = this.width
    if (canvas.height !== this.height) canvas.height = this.height
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.putImageData(this.toImageData(), 0, 0)
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    this.paint(canvas)
    return canvas
  }

  toDataURL(): string {
    return this.toCanvas().toDataURL()
  }
}
