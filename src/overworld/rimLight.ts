import { Texture } from 'pixi.js'

/**
 * Moonlight round the edge of a figure, after dark.
 *
 * People are lit by what they stand in, which on a country road at night is
 * nothing: a man in a dark suit multiplied by a dark blue night is a dark blue
 * smudge on dark blue tarmac, however high the floor under his brightness. A
 * pixel-art game keeps its characters readable at night with a rim — a line of
 * pale light along the top and sides of the sprite, as if the sky behind them
 * were the light source. This is that line, worked out once per frame texture
 * from its silhouette: every clear art unit beside, or just above, a filled one.
 *
 * Nothing under the feet, so nobody seems to stand on a glowing plate.
 */

/** Canvas pixels per art unit, as people are drawn. */
const UNIT_PX = 2
/** The rim reaches one art unit outside the figure. */
export const RIM_PAD = UNIT_PX

const RIMS = new WeakMap<Texture, Texture>()

/** The pixels of a rim round a silhouette, as a mask: true where the rim is. */
export function rimMask(opaque: (x: number, y: number) => boolean, width: number, height: number): boolean[] {
  const w = width + 2
  const h = height + 2
  const out = new Array<boolean>(w * h).fill(false)
  for (let y = -1; y <= height; y++) {
    for (let x = -1; x <= width; x++) {
      if (opaque(x, y)) continue
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y + 1)) out[(y + 1) * w + (x + 1)] = true
    }
  }
  return out
}

/** The rim texture for a figure's frame: one art unit bigger on every side. */
export function rimTexture(texture: Texture, color = '#c8d6ff'): Texture | null {
  const cached = RIMS.get(texture)
  if (cached) return cached
  const source = texture.source.resource as HTMLCanvasElement | undefined
  if (!source || typeof source.getContext !== 'function') return null
  const frame = texture.frame
  const data = source.getContext('2d')!.getImageData(frame.x, frame.y, frame.width, frame.height).data
  const width = Math.floor(frame.width / UNIT_PX)
  const height = Math.floor(frame.height / UNIT_PX)
  const opaque = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && data[(y * UNIT_PX * frame.width + x * UNIT_PX) * 4 + 3] > 0
  const mask = rimMask(opaque, width, height)
  const canvas = document.createElement('canvas')
  canvas.width = (width + 2) * UNIT_PX
  canvas.height = (height + 2) * UNIT_PX
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  mask.forEach((on, i) => {
    if (on) ctx.fillRect((i % (width + 2)) * UNIT_PX, Math.floor(i / (width + 2)) * UNIT_PX, UNIT_PX, UNIT_PX)
  })
  const rim = Texture.from(canvas)
  rim.source.scaleMode = 'nearest'
  RIMS.set(texture, rim)
  return rim
}
