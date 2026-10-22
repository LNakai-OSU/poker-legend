import { describe, expect, it } from 'vitest'
import { besideTile, pathBeside, pathTo } from './paths'
import { parseMap } from './tiles'

const STREET = parseMap(`
TTTTTTT
T-----T
T-###-T
T-----T
TTTTTTT
`)

const nobody = () => false

describe('the way somebody walks', () => {
  it('goes round a wall, a step at a time', () => {
    const path = pathTo(STREET, { col: 1, row: 1 }, { col: 5, row: 3 }, nobody)!
    expect(path).toHaveLength(6)
    expect(path.at(-1)).toEqual({ col: 5, row: 3 })
    let at = { col: 1, row: 1 }
    for (const next of path) {
      expect(Math.abs(next.col - at.col) + Math.abs(next.row - at.row)).toBe(1)
      at = next
    }
  })

  it('goes round somebody standing in the way, and gives up when there is no way', () => {
    const blocked = (c: number, r: number) => c === 3 && r === 1
    const round = pathTo(STREET, { col: 1, row: 1 }, { col: 5, row: 1 }, blocked)!
    expect(round.some((t) => t.col === 3 && t.row === 1)).toBe(false)
    const walledIn = (c: number) => c === 3
    expect(pathTo(STREET, { col: 1, row: 1 }, { col: 5, row: 1 }, walledIn)).toBeNull()
  })

  it('walks up beside somebody rather than into them', () => {
    const path = pathBeside(STREET, { col: 5, row: 3 }, { col: 1, row: 1 }, nobody)!
    const end = path.at(-1)!
    expect(Math.abs(end.col - 1) + Math.abs(end.row - 1)).toBe(1)
  })

  it('stands somebody who came with you on a free tile next to you', () => {
    expect(besideTile(STREET, { col: 1, row: 1 }, nobody)).toEqual({ col: 2, row: 1 })
    expect(besideTile(STREET, { col: 1, row: 1 }, (c) => c === 2)).toEqual({ col: 1, row: 2 })
  })
})
