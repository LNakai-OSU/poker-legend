import { describe, expect, it } from 'vitest'
import { cameraOffset } from './camera'
import { CITIES } from '../world/content'
import { TILE_SIZE } from './tiles'

const WORLD_ZOOM = 2
const VIEWPORT = { width: 1100, height: 800 }

describe('cameraOffset', () => {
  it('centres a world narrower than the viewport instead of scrolling it', () => {
    // The apartment is 12 tiles wide: 768px at 2x against an 1100px viewport. The
    // old camera kept the player in the middle of the screen regardless, which
    // left ~480px of dead black to the left of the room.
    const world = 768
    for (const playerMid of [32, 384, 736]) {
      expect(cameraOffset(1100, world, playerMid)).toBe((1100 - world) / 2)
    }
  })

  it('never shows ground past the edge of a world bigger than the viewport', () => {
    const world = 2000
    // Hard against the left edge, the camera stops at 0 rather than going positive.
    expect(cameraOffset(1100, world, 0)).toBe(0)
    expect(cameraOffset(1100, world, 100)).toBe(0)
    // Hard against the right edge, it stops with the world's far side on screen.
    expect(cameraOffset(1100, world, 2000)).toBe(1100 - world)
    // In the middle it follows the player.
    expect(cameraOffset(1100, world, 1000)).toBe(1100 / 2 - 1000)
  })

  it('keeps the whole world on screen in both axes for every small area', () => {
    for (const city of Object.values(CITIES)) {
      for (const area of Object.values(city.areas)) {
        const width = area.map[0].length * TILE_SIZE * WORLD_ZOOM
        const height = area.map.length * TILE_SIZE * WORLD_ZOOM
        const x = cameraOffset(VIEWPORT.width, width, 0)
        const y = cameraOffset(VIEWPORT.height, height, 0)
        const label = `${city.id}/${area.id}`
        if (width <= VIEWPORT.width) {
          expect(x, `${label} x`).toBeGreaterThanOrEqual(0)
          expect(x + width, `${label} right edge`).toBeLessThanOrEqual(VIEWPORT.width)
          // Equal margins either side, which is what "centred" means.
          expect(x, `${label} is not centred`).toBeCloseTo(VIEWPORT.width - (x + width))
        }
        if (height <= VIEWPORT.height) {
          expect(y, `${label} y`).toBeGreaterThanOrEqual(0)
          expect(y + height, `${label} bottom edge`).toBeLessThanOrEqual(VIEWPORT.height)
          expect(y, `${label} is not centred`).toBeCloseTo(VIEWPORT.height - (y + height))
        }
      }
    }
  })
})
