import { Sprite, Texture } from 'pixi.js'
import type { PeriodLight } from '../game/time'

/**
 * The light of the hour over a street.
 *
 * The night used to be a translucent blue sheet laid over the whole canvas,
 * which can only ever make everything a little bluer: a lamp post at midnight
 * was the same grey as at noon, and a lit window could not be lit. This is a
 * light map instead — one value per art unit of the map, the colour of the
 * light falling there — which the street is *multiplied* by. Where nothing
 * shines it is the hour's ambient colour, warm and dim in the evening and a
 * deep blue at night; under a lamp post it climbs back towards white in stepped
 * rings, the way light falls in a pixel-art game; and round every lit window,
 * marquee and neon sign there is a halo, so the light spills onto the wall and
 * the pavement in front of it. The things giving off that light are drawn again
 * above the darkness, at full brightness, by the stamp layer.
 *
 * It is built once per map and period: a few hundred thousand multiply-adds
 * when you walk in, nothing per frame but a lookup for each person standing in
 * it, so the people are lit by the lamp they stand under too.
 */

export interface LightSource {
  /** Where the light falls, in art units of the map. */
  x: number
  y: number
  /** How far the pool reaches, in art units, along its long (horizontal) axis. */
  reach: number
  color: string
  strength: number
}

/** Emitted light per art unit of the map, from everything drawn lit: windows, signs, bulbs. */
export interface GlowField {
  width: number
  height: number
  rgb: Float32Array
}

function channels(color: string): [number, number, number] {
  const n = parseInt(color.slice(1), 16)
  return [((n >> 16) & 0xff) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}

/** How bright a ring of a lamp's pool is, from its middle (0) to its edge (1): stepped, not smooth. */
export function poolBand(d: number): number {
  if (d < 0.32) return 1
  if (d < 0.56) return 0.72
  if (d < 0.78) return 0.44
  if (d < 1) return 0.2
  return 0
}

/** A box blur of one channel, along rows then columns, `radius` each way. */
function blur(src: Float32Array, width: number, height: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length)
  const out = new Float32Array(src.length)
  const span = radius * 2 + 1
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = -radius; x <= radius; x++) sum += src[y * width + Math.min(width - 1, Math.max(0, x))]
    for (let x = 0; x < width; x++) {
      tmp[y * width + x] = sum / span
      const add = Math.min(width - 1, x + radius + 1)
      const drop = Math.max(0, x - radius)
      sum += src[y * width + add] - src[y * width + drop]
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0
    for (let y = -radius; y <= radius; y++) sum += tmp[Math.min(height - 1, Math.max(0, y)) * width + x]
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum / span
      const add = Math.min(height - 1, y + radius + 1)
      const drop = Math.max(0, y - radius)
      sum += tmp[add * width + x] - tmp[drop * width + x]
    }
  }
  return out
}

/**
 * The light falling on every art unit of a map, as 0..1 RGB.
 *
 * Pure arithmetic over arrays, so it is tested without a canvas.
 */
export function computeLight(
  width: number,
  height: number,
  light: PeriodLight,
  sources: LightSource[],
  glow: GlowField | null,
): Float32Array {
  const out = new Float32Array(width * height * 3)
  const [ar, ag, ab] = channels(light.ambient)
  for (let i = 0; i < width * height; i++) {
    out[i * 3] = ar
    out[i * 3 + 1] = ag
    out[i * 3 + 2] = ab
  }
  if (light.lamps <= 0) return out
  // The light from lamps and lit things, summed, before it meets the dark.
  const lit = new Float32Array(width * height * 3)

  // Lamp posts: a pool on the ground, wider than it is deep, in stepped rings.
  for (const source of sources) {
    const [lr, lg, lb] = channels(source.color)
    const k = source.strength * light.lamps
    const rx = source.reach
    const ry = source.reach * 0.62
    const x0 = Math.max(0, Math.floor(source.x - rx))
    const x1 = Math.min(width - 1, Math.ceil(source.x + rx))
    const y0 = Math.max(0, Math.floor(source.y - ry))
    const y1 = Math.min(height - 1, Math.ceil(source.y + ry))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - source.x) / rx
        const dy = (y + 0.5 - source.y) / ry
        const band = poolBand(Math.sqrt(dx * dx + dy * dy))
        if (band === 0) continue
        const i = (y * width + x) * 3
        lit[i] += lr * k * band
        lit[i + 1] += lg * k * band
        lit[i + 2] += lb * k * band
      }
    }
  }

  // Halos round everything lit: a near glow and a wide one, both quantised so
  // they step down in bands like the pools do.
  if (glow && glow.width === width && glow.height === height) {
    for (let c = 0; c < 3; c++) {
      const channel = new Float32Array(width * height)
      for (let i = 0; i < width * height; i++) channel[i] = glow.rgb[i * 3 + c]
      const near = blur(blur(channel, width, height, 3), width, height, 3)
      const wide = blur(blur(channel, width, height, 10), width, height, 10)
      for (let i = 0; i < width * height; i++) {
        const v = near[i] * HALO_NEAR + wide[i] * HALO_WIDE
        const stepped = Math.floor(Math.min(HALO_CAP, v) * 5) / 5
        lit[i * 3 + c] += stepped * light.lamps
      }
    }
  }

  // Light meets the dark: where the light is stronger it shows in its own
  // colour, and the dark under it lifts a little. Adding the two instead would
  // turn a warm lamp under a blue sky white, and a lamp's pool would be daylight.
  for (let i = 0; i < out.length; i++) {
    const a = out[i]
    const l = Math.min(1, lit[i])
    out[i] = Math.min(1, Math.max(a, l) + 0.25 * Math.min(a, l))
  }
  return out
}

/** How much of what glows spills round it: close in, and further out. */
const HALO_NEAR = 2.2
const HALO_WIDE = 2.6
/** However much is lit, its halo never rises past this: a floodlit lobby must not flood its tower. */
const HALO_CAP = 0.65

/**
 * Towns whose nights are not the same night. The Strip is never dark: its sky
 * glows purple off the signs all night, so its night is lighter and pinker
 * than the blue over everywhere else.
 */
const TOWN_NIGHT: Record<string, Partial<PeriodLight>> = {
  neon: { ambient: '#4c4284' },
}

/** The hour's light as it falls in a particular town. */
export function townLight(themeId: string, light: PeriodLight | null): PeriodLight | null {
  if (!light || light.lamps < 1) return light
  const own = TOWN_NIGHT[themeId]
  return own ? { ...light, ...own } : light
}

/** The light map as a sprite to multiply the street by, and a way to ask what light falls where. */
export class LightMap {
  readonly sprite: Sprite
  readonly width: number
  readonly height: number
  private readonly sources: LightSource[]
  private readonly glow: GlowField | null
  private readonly canvas: HTMLCanvasElement
  private readonly texture: Texture
  private values: Float32Array

  /** `scale` is world pixels per art unit. */
  constructor(width: number, height: number, sources: LightSource[], glow: GlowField | null, scale: number) {
    this.width = width
    this.height = height
    this.sources = sources
    this.glow = glow
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.values = new Float32Array(width * height * 3).fill(1)
    this.texture = Texture.from(this.canvas)
    this.texture.source.scaleMode = 'nearest'
    this.sprite = new Sprite(this.texture)
    this.sprite.scale.set(scale)
    this.sprite.blendMode = 'multiply'
  }

  /** Lets go of the texture: a light map is made for each street you walk into. */
  destroy() {
    this.sprite.destroy({ texture: true, textureSource: true })
  }

  /** Lights the map for an hour, or takes the light map away for the daytime. */
  setPeriod(light: PeriodLight | null) {
    if (!light) {
      this.values.fill(1)
      this.sprite.visible = false
      return
    }
    this.values = computeLight(this.width, this.height, light, this.sources, this.glow)
    const ctx = this.canvas.getContext('2d')!
    const image = ctx.createImageData(this.width, this.height)
    for (let i = 0; i < this.width * this.height; i++) {
      image.data[i * 4] = Math.round(this.values[i * 3] * 255)
      image.data[i * 4 + 1] = Math.round(this.values[i * 3 + 1] * 255)
      image.data[i * 4 + 2] = Math.round(this.values[i * 3 + 2] * 255)
      image.data[i * 4 + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    this.texture.source.update()
    this.sprite.visible = true
  }

  /**
   * The light at a point, in art units, as a tint for whoever is standing there.
   *
   * `floor` is the least of it that anybody gets: a person in the dark is still
   * a person, and the player above all must be findable on a street with no lamp
   * near them.
   */
  tintAt(x: number, y: number, floor = 0): number {
    const cx = Math.max(0, Math.min(this.width - 1, Math.floor(x)))
    const cy = Math.max(0, Math.min(this.height - 1, Math.floor(y)))
    const i = (cy * this.width + cx) * 3
    const lift = (value: number) => Math.round(Math.max(value, floor) * 255)
    return (lift(this.values[i]) << 16) | (lift(this.values[i + 1]) << 8) | lift(this.values[i + 2])
  }
}
