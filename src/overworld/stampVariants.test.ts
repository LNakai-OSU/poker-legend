import { describe, expect, it } from 'vitest'
import { AREA_STAMPS } from '../world/cities'
import { STAMP_BY_ID, stampSize } from '../world/stamps'
import { CASINO_ART } from './art/casinoArt'
import { placementVariants, variantCount, type ArtContext } from './stampArt'

/** Everything a drawing paints, as one string, so two drawings can be compared. */
function painted(stampId: string, variant: number): string {
  const stamp = STAMP_BY_ID[stampId]
  const { cols, rows } = stampSize(stamp)
  const context: ArtContext = {
    cols, rows, w: cols * 16, h: rows * 16, frame: 0, variant,
    tiles: stamp.tiles.split('\n'),
  }
  const calls: string[] = []
  CASINO_ART[stampId].draw((x, y, w, h, color) => calls.push(`${x},${y},${w},${h},${color}`), context)
  return calls.join(';')
}

const SLOT_BANKS = Object.keys(CASINO_ART).filter((id) => id.startsWith('slot-bank'))

describe('slot banks', () => {
  it('come in more than one look', () => {
    for (const id of SLOT_BANKS) {
      expect(variantCount(id), id).toBeGreaterThan(1)
      const looks = new Set(Array.from({ length: variantCount(id) }, (_, v) => painted(id, v)))
      expect(looks.size, `${id} draws the same bank for different looks`).toBe(variantCount(id))
    }
  })

  it('are never the same bank twice in one room', () => {
    // Every bank in a casino was the same stamp drawn the same way, so a floor
    // was one bank of machines repeated. The art is told nothing about where it
    // stands; a placement is handed a look instead, and no two banks in a room
    // may be handed the same one.
    for (const [areaId, stamps] of Object.entries(AREA_STAMPS)) {
      const variants = placementVariants(stamps)
      const banks = stamps
        .map((placed, i) => ({ placed, variant: variants[i] }))
        .filter(({ placed }) => placed.stampId.startsWith('slot-bank'))
      const looks = banks.map(({ variant }) => variant)
      expect(new Set(looks).size, `${areaId}: two banks share a look (${looks.join(', ')})`).toBe(banks.length)
    }
  })
})

describe('placement variants', () => {
  it('hands copies of one stamp consecutive looks', () => {
    const at = (col: number) => ({ stampId: 'slot-bank-neon', col, row: 1 })
    const [a, b, c] = placementVariants([at(1), at(6), at(11)])
    expect(new Set([a, b, c]).size).toBe(3)
  })

  it('gives a stamp with one look look 0', () => {
    expect(placementVariants([{ stampId: 'fern', col: 3, row: 4 }])).toEqual([0])
  })
})
