/**
 * Colour arithmetic for art drawn in code.
 *
 * Everything at the table is drawn from a handful of base colours per room, the
 * way a GBA palette is: a base, a light and a dark of each material, mixed by
 * dithering rather than by blending. These helpers derive the steps.
 */

export function rgbOf(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

export function hexOf(r: number, g: number, b: number): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

/** Multiplies every channel: below 1 darkens, above 1 lightens. */
export function shade(hex: string, factor: number): string {
  const [r, g, b] = rgbOf(hex)
  return hexOf(r * factor, g * factor, b * factor)
}

/** A straight mix of two colours, `t` of the way from `a` to `b`. */
export function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgbOf(a)
  const [r2, g2, b2] = rgbOf(b)
  return hexOf(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t)
}

/** Relative luminance, 0..1, for picking text that reads on a colour. */
export function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/**
 * A 4x4 ordered-dither threshold. `dither(x, y, t)` is true for roughly `t` of
 * the pixels in any area, in the cross-hatched pattern GBA art uses to fake a
 * gradient with two colours.
 */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
export function dither(x: number, y: number, t: number): boolean {
  if (t <= 0) return false
  if (t >= 1) return true
  return (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16 < t
}

/** A stable pseudo-random value in [0, 1) for a grid position. */
export function hash2(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  h ^= h >>> 16
  return (h >>> 0) / 4294967296
}

/** A stable pseudo-random value for a string, for per-character variety. */
export function hashString(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}
