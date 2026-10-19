import type { CSSProperties } from 'react'
import { Raster } from './raster'

/**
 * GBA-style panel frames, drawn in code and stretched with 9-slice scaling.
 *
 * Every box at the table — a seat's plate, the pot, the betting menu, a line
 * announced over the felt — is one of these: a dark outline with rounded
 * corners, a coloured band inside it, and a fill, the way the battle and
 * dialogue boxes in a GBA Pokémon game are built. The frame is a tiny image
 * that CSS slices into corners and edges and scales up whole pixels at a time,
 * so a panel of any size keeps one-pixel lines exactly one art pixel wide.
 */

export interface FrameSpec {
  /** Rings from the outside in, one art pixel each. */
  rings: string[]
  /** Replacements for the rings along the bottom and right, for a bevel. */
  lower?: string[]
  /** The inside. Null leaves it clear. */
  fill: string | null
  /** Corner rounding in art pixels. */
  radius?: number
}

const urlCache = new Map<string, string>()

function frameImage(spec: FrameSpec): string {
  const key = JSON.stringify(spec)
  const hit = urlCache.get(key)
  if (hit) return hit

  const L = spec.rings.length
  const size = 2 * L + 1
  const r = spec.radius ?? 2
  const raster = new Raster(size, size)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fromLeft = x
      const fromRight = size - 1 - x
      const fromTop = y
      const fromBottom = size - 1 - y
      const i = Math.min(fromLeft, fromRight)
      const j = Math.min(fromTop, fromBottom)
      let ring: number
      if (i < r && j < r) {
        // Inside a corner: rings follow a circle, which is what rounds the box.
        const dx = r - i - 0.5
        const dy = r - j - 0.5
        const depth = r - Math.sqrt(dx * dx + dy * dy)
        if (depth < 0) continue
        ring = Math.floor(depth)
      } else {
        ring = Math.min(i, j)
      }
      if (ring >= L) {
        if (spec.fill) raster.put(x, y, spec.fill)
        continue
      }
      // Bottom and right edges take the lower colours, so a panel reads as lit
      // from the top left like everything else in the game.
      const lowerSide = (fromBottom < fromTop && j === ring) || (fromRight < fromLeft && i === ring)
      const color = lowerSide && spec.lower ? spec.lower[ring] : spec.rings[ring]
      raster.put(x, y, color)
    }
  }
  const url = raster.toDataURL()
  urlCache.set(key, url)
  return url
}

/** The CSS that draws `spec` around an element at `scale` CSS px per art pixel. */
export function frameStyle(spec: FrameSpec, scale: number): CSSProperties {
  const L = spec.rings.length
  return {
    boxSizing: 'border-box',
    borderStyle: 'solid',
    borderColor: 'transparent',
    borderWidth: L * scale,
    borderImageSource: `url(${frameImage(spec)})`,
    borderImageSlice: `${L} fill`,
    borderImageWidth: `${L * scale}px`,
    borderImageRepeat: 'stretch',
    imageRendering: 'pixelated',
  }
}

/** How many art pixels of border a frame takes on each side. */
export function frameThickness(spec: FrameSpec): number {
  return spec.rings.length
}
