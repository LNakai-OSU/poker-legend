import { describe, expect, it } from 'vitest'
import { paintRoomScene } from './rooms'

const geometry = { w: 480, h: 300, felt: { x: 140, y: 130, w: 200, h: 100 } }

describe('the rooms behind the table move a little', () => {
  it('the Strip room flickers its neon, and the rooms on the water shimmer', () => {
    const mesa = paintRoomScene('mesa', geometry).motion
    expect(mesa.filter((m) => m.kind === 'flicker').length).toBeGreaterThanOrEqual(3)
    for (const theme of ['riverboat', 'harbor', 'palmcay', 'finale'] as const) {
      const motion = paintRoomScene(theme, geometry).motion
      expect(motion.some((m) => m.kind === 'shimmer'), theme).toBe(true)
    }
    // A kitchen has nothing in it that should move.
    expect(paintRoomScene('home', geometry).motion).toEqual([])
  })

  it('a moving layer holds only pixels that change, and never paints over what lies on top', () => {
    for (const theme of ['mesa', 'riverboat', 'palmcay'] as const) {
      const { raster, motion } = paintRoomScene(theme, geometry)
      for (const m of motion) {
        let lit = 0
        for (let y = 0; y < m.frame.height; y++) {
          for (let x = 0; x < m.frame.width; x++) {
            if (m.frame.isClear(x, y)) continue
            lit++
            expect(m.frame.get(x, y), `${theme} ${m.kind} at ${m.x + x},${m.y + y}`).not.toBe(raster.get(m.x + x, m.y + y))
          }
        }
        expect(lit).toBeGreaterThan(0)
        if (m.kind === 'shimmer') {
          // Water trades its own three colours (deep, light, glint), so whatever
          // lies under a glint is water too — never the brass of a porthole or a
          // glazing bar painted over it.
          const under = new Set<number>()
          for (let y = 0; y < m.frame.height; y++) {
            for (let x = 0; x < m.frame.width; x++) if (!m.frame.isClear(x, y)) under.add(raster.get(m.x + x, m.y + y))
          }
          expect(under.size, `${theme}: colours under the glints`).toBeLessThanOrEqual(3)
        }
        // Out of phase with one another, so the room never blinks all at once.
        expect(m.delay).toBeLessThanOrEqual(0)
        expect(m.period).toBeGreaterThan(1)
      }
      const delays = new Set(motion.map((m) => m.delay.toFixed(2)))
      expect(delays.size).toBe(motion.length)
    }
  })
})
