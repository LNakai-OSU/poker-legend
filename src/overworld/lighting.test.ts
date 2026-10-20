import { describe, expect, it } from 'vitest'
import { computeLight, poolBand, townLight, type GlowField, type LightSource } from './lighting'
import { PERIOD_LIGHT } from '../game/time'

const NIGHT = PERIOD_LIGHT.night!
const EVENING = PERIOD_LIGHT.evening!

const W = 64
const H = 48
const at = (light: Float32Array, x: number, y: number) => {
  const i = (y * W + x) * 3
  return [light[i], light[i + 1], light[i + 2]]
}
const brightness = ([r, g, b]: number[]) => 0.299 * r + 0.587 * g + 0.114 * b
const lamp = (over: Partial<LightSource> = {}): LightSource => ({
  x: 32, y: 24, reach: 20, color: '#ffd27a', strength: 1, ...over,
})

describe('the light of the hour', () => {
  it('is the ambient colour everywhere nothing shines', () => {
    const light = computeLight(W, H, NIGHT, [], null)
    const corner = at(light, 0, 0)
    expect(at(light, W - 1, H - 1)).toEqual(corner)
    // A deep blue: more blue than red, and dark.
    expect(corner[2]).toBeGreaterThan(corner[0])
    expect(brightness(corner)).toBeLessThan(0.4)
  })

  it('gets darker from evening to night, and warmer in the evening', () => {
    const evening = at(computeLight(W, H, EVENING, [], null), 0, 0)
    const night = at(computeLight(W, H, NIGHT, [], null), 0, 0)
    expect(brightness(night)).toBeLessThan(brightness(evening))
    expect(evening[0]).toBeGreaterThan(evening[2])
  })

  it('lights a pool under a lamp, stepped, and keeps the dark outside it', () => {
    const light = computeLight(W, H, NIGHT, [lamp()], null)
    const dark = brightness(at(light, 0, 0))
    const middle = brightness(at(light, 32, 24))
    const rim = brightness(at(light, 32 + 17, 24))
    expect(middle).toBeGreaterThan(dark * 2)
    expect(rim).toBeGreaterThan(dark)
    expect(rim).toBeLessThan(middle)
    expect(brightness(at(light, 0, 47))).toBeCloseTo(dark, 5)
    // Stepped, not smooth: moving a little way across a ring changes nothing.
    expect(at(light, 32, 24)).toEqual(at(light, 34, 24))
  })

  it('keeps a warm lamp warm under a blue sky instead of washing it out to white', () => {
    const [r, , b] = at(computeLight(W, H, NIGHT, [lamp()], null), 32, 24)
    expect(r).toBeGreaterThan(b)
  })

  it('has no pools by day, and half strength at dusk', () => {
    const afternoon = PERIOD_LIGHT.afternoon!
    const day = computeLight(W, H, afternoon, [lamp()], null)
    expect(at(day, 32, 24)).toEqual(at(day, 0, 0))
    const dusk = computeLight(W, H, EVENING, [lamp()], null)
    const night = computeLight(W, H, NIGHT, [lamp()], null)
    // Brighter relative to its own surroundings the later the hour.
    const lift = (light: Float32Array) => brightness(at(light, 32, 24)) / brightness(at(light, 0, 0))
    expect(lift(night)).toBeGreaterThan(lift(dusk))
  })

  it('spills a halo round whatever is lit, fading with distance and never past its cap', () => {
    const rgb = new Float32Array(W * H * 3)
    // A lit window: a block of warm light.
    for (let y = 20; y < 28; y++) {
      for (let x = 28; x < 36; x++) {
        const i = (y * W + x) * 3
        rgb[i] = 1
        rgb[i + 1] = 0.82
        rgb[i + 2] = 0.48
      }
    }
    const glow: GlowField = { width: W, height: H, rgb }
    const without = computeLight(W, H, NIGHT, [], null)
    const light = computeLight(W, H, NIGHT, [], glow)
    const near = brightness(at(light, 32, 31))
    const far = brightness(at(light, 32, 46))
    expect(near).toBeGreaterThan(brightness(at(without, 32, 31)))
    expect(far).toBeCloseTo(brightness(at(without, 32, 46)), 3)
    expect(near).toBeGreaterThan(far)
    for (const v of light) expect(v).toBeLessThanOrEqual(1)

    // A whole wall of light does not make its surroundings daylight.
    const flood = new Float32Array(W * H * 3).fill(1)
    const lit = computeLight(W, H, NIGHT, [], { width: W, height: H, rgb: flood })
    expect(brightness(at(lit, 32, 24))).toBeLessThan(0.95)
  })

  it('ignores a glow field drawn for a different map', () => {
    const wrong: GlowField = { width: 8, height: 8, rgb: new Float32Array(8 * 8 * 3).fill(1) }
    expect(computeLight(W, H, NIGHT, [], wrong)).toEqual(computeLight(W, H, NIGHT, [], null))
  })
})

describe('rings of light', () => {
  it('steps down from the middle of a pool to nothing at its edge', () => {
    const bands = [0, 0.2, 0.4, 0.6, 0.8, 0.99, 1.2].map(poolBand)
    for (let i = 1; i < bands.length; i++) expect(bands[i]).toBeLessThanOrEqual(bands[i - 1])
    expect(bands[0]).toBe(1)
    expect(bands[bands.length - 1]).toBe(0)
    expect(new Set(bands).size).toBeGreaterThanOrEqual(4)
  })
})

describe('a town of its own', () => {
  it('leaves the morning alone', () => {
    expect(townLight('neon', PERIOD_LIGHT.morning)).toBeNull()
  })

  it('never lets the Strip go as dark as everywhere else at night', () => {
    const strip = townLight('neon', NIGHT)!
    const elsewhere = townLight('home', NIGHT)!
    const lum = (hex: string) => {
      const n = parseInt(hex.slice(1), 16)
      return ((n >> 16) & 0xff) * 0.299 + ((n >> 8) & 0xff) * 0.587 + (n & 0xff) * 0.114
    }
    expect(lum(strip.ambient)).toBeGreaterThan(lum(elsewhere.ambient))
    expect(elsewhere).toBe(NIGHT)
  })

  it('does not change a town in the evening', () => {
    expect(townLight('neon', EVENING)).toBe(EVENING)
  })
})
