import { describe, expect, it } from 'vitest'
import { NPC_ROLES, PERSON_H, PERSON_W, seatedPixels, type Figure } from './characterArt'
import { CASINO_ART } from './art/casinoArt'
import { lookFromId } from './casting'
import { stampOccluder } from './stampArt'
import { sitterOrigin, sitterPixels } from './sitters'
import { STAMPS, stampSize, type StampDef } from '../world/stamps'

const TABLES = STAMPS.filter((stamp) => stamp.seats?.length)

const FIGURES: Figure[] = [
  { role: 'local', look: lookFromId('sitter-a') },
  { role: 'suit', look: lookFromId('sitter-b', 'Woman at the table') },
  { role: 'local', look: { ...lookFromId('sitter-c'), lower: 'skirt' } },
]

/**
 * A stamp's picture with the seats it is given: every paint laid on each art
 * unit, in order, since a translucent shadow over a chair still shows the chair.
 */
function picture(stamp: StampDef, seats = stamp.seats ?? []): string[] {
  const { cols, rows } = stampSize(stamp)
  const w = cols * 16
  const h = rows * 16
  const grid: string[] = new Array(w * h).fill('')
  CASINO_ART[stamp.id].draw(
    (x, y, pw, ph, color) => {
      for (let yy = Math.max(0, y); yy < Math.min(h, y + ph); yy++)
        for (let xx = Math.max(0, x); xx < Math.min(w, x + pw); xx++) grid[yy * w + xx] += `${color};`
    },
    { cols, rows, w, h, frame: 0, tiles: stamp.tiles.split('\n'), seats, variant: 0 },
  )
  return grid
}

describe('people sitting at tables', () => {
  it('draws a chair wherever the stamp says there is a seat', () => {
    for (const stamp of TABLES) {
      const w = stampSize(stamp).cols * 16
      const withChairs = picture(stamp)
      const without = picture(stamp, [])
      for (const seat of stamp.seats!) {
        const at = seat.y * w + seat.x
        expect(withChairs[at], `${stamp.id}: no chair at ${seat.x},${seat.y}`).not.toBe(without[at])
      }
    }
  })

  it('folds the legs away, and in profile puts the knees forward', () => {
    for (const role of NPC_ROLES.filter((r) => r !== 'kid')) {
      for (const figure of FIGURES) {
        const cast = { ...figure, role }
        for (const facing of ['down', 'up'] as const) {
          const pixels = seatedPixels(cast, facing)
          const below = pixels.slice(21 * PERSON_W).filter(Boolean).length
          expect(below, `${role} sitting ${facing} still has legs`).toBe(0)
        }
        // Facing left, the lap reaches further left than the standing hips do.
        const side = seatedPixels(cast, 'left')
        const lapStart = [18, 19].map((y) => side.slice(y * PERSON_W, (y + 1) * PERSON_W).findIndex(Boolean))
        expect(Math.min(...lapStart.filter((x) => x >= 0)), `${role} in profile has no lap`).toBeLessThanOrEqual(3)
      }
    }
  })

  it('shows their head and shoulders at every chair', () => {
    for (const stamp of TABLES) {
      stamp.seats!.forEach((seat, index) => {
        for (const figure of FIGURES) {
          const pixels = sitterPixels(figure, stamp.id, index)
          // Rows 3-16: the head and the top of the body.
          const shown = pixels.slice(3 * PERSON_W, 17 * PERSON_W).filter(Boolean).length
          expect(shown, `${stamp.id} seat ${index} (${seat.facing}) hides the sitter`).toBeGreaterThan(70)
        }
      })
    }
  })

  it('hides whatever of them the table or the chair back is in front of', () => {
    for (const stamp of TABLES) {
      const occluder = stampOccluder(stamp.id)!
      expect(occluder, `${stamp.id} has nothing to sit behind`).not.toBeNull()
      stamp.seats!.forEach((seat, index) => {
        const origin = sitterOrigin(seat)
        const pixels = sitterPixels(FIGURES[0], stamp.id, index)
        let behindTable = 0
        for (let y = 0; y < PERSON_H; y++) {
          for (let x = 0; x < PERSON_W; x++) {
            if (!pixels[y * PERSON_W + x]) continue
            const ax = origin.x + x
            const ay = origin.y + y
            const onTable = ax >= 0 && ay >= 0 && ax < occluder.w && ay < occluder.h && occluder.covers[ay * occluder.w + ax] === 1
            if (seat.facing === 'up') {
              // In front of the table, behind their own chair back.
              expect(ay, `${stamp.id} seat ${index}: drawn over their chair back`).toBeLessThan(seat.y + 2)
            } else if (onTable) {
              behindTable++
            }
          }
        }
        expect(behindTable, `${stamp.id} seat ${index}: drawn over the table`).toBe(0)
      })
    }
  })

  it('puts somebody with their back to you over the table, not under it', () => {
    // The near side's sitters cover the rail: that is what makes them read as in front.
    for (const stamp of TABLES) {
      const occluder = stampOccluder(stamp.id)!
      stamp.seats!.forEach((seat, index) => {
        if (seat.facing !== 'up') return
        const origin = sitterOrigin(seat)
        const pixels = sitterPixels(FIGURES[0], stamp.id, index)
        let overTable = 0
        for (let y = 0; y < PERSON_H; y++)
          for (let x = 0; x < PERSON_W; x++) {
            const ax = origin.x + x
            const ay = origin.y + y
            if (pixels[y * PERSON_W + x] && occluder.covers[ay * occluder.w + ax] === 1) overTable++
          }
        expect(overTable, `${stamp.id} seat ${index}`).toBeGreaterThan(30)
      })
    }
  })
})
