import { describe, expect, it } from 'vitest'
import { CITIES, allAreas } from './cities'
import { STAMP_BY_ID, stampSize } from './stamps'
import { DOOR, isTileWalkable } from '../overworld/tiles'

const interiors = Object.values(CITIES).flatMap((city) =>
  allAreas(city)
    .filter((area) => !area.edges)
    .map((area) => ({ city: city.name, area })),
)

/** The floor a room is laid in: its commonest walkable tile. */
function floorOf(map: number[][]): number {
  const counts = new Map<number, number>()
  for (const row of map) for (const tile of row) if (isTileWalkable(tile) && tile !== DOOR) counts.set(tile, (counts.get(tile) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/**
 * The biggest square of bare floor in a room: walkable, and under no object at
 * all — not a rug, not the ring of chairs round a table, nothing.
 */
function biggestBareSquare(area: (typeof interiors)[number]['area']): number {
  const rows = area.map.length
  const cols = area.map[0].length
  const covered = area.map.map((row) => row.map(() => false))
  for (const placed of area.stamps ?? []) {
    const { cols: w, rows: h } = stampSize(STAMP_BY_ID[placed.stampId])
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) {
      if (covered[placed.row + r]) covered[placed.row + r][placed.col + c] = true
    }
  }
  const bare = (c: number, r: number) => isTileWalkable(area.map[r][c]) && !covered[r][c]
  // The largest all-bare square ending at each cell, in the usual way.
  const best = area.map.map((row) => row.map(() => 0))
  let biggest = 0
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!bare(c, r)) continue
      best[r][c] = r === 0 || c === 0 ? 1 : 1 + Math.min(best[r - 1][c], best[r][c - 1], best[r - 1][c - 1])
      biggest = Math.max(biggest, best[r][c])
    }
  }
  return biggest
}

describe('rooms', () => {
  it('gives the diner, the riverboat, the club and the front room floors of their own', () => {
    // These four were all one plank floor, so walking from one into the next
    // changed nothing underfoot. Each now has a floor no other of them has,
    // and no other room in its own town has either.
    const named = ['rb-diner', 'rb-boat', 'ch-club', 'marcus-house']
    const floors = new Map<string, number>()
    const clashes: string[] = []
    for (const city of Object.values(CITIES)) {
      const rooms = allAreas(city).filter((a) => !a.edges)
      for (const area of rooms.filter((a) => named.includes(a.id))) {
        const floor = floorOf(area.map)
        floors.set(area.id, floor)
        for (const other of rooms) {
          if (other.id !== area.id && floorOf(other.map) === floor) clashes.push(`${area.name} = ${other.name}`)
        }
      }
    }
    expect(floors.size).toBe(named.length)
    expect(new Set(floors.values()).size, 'two of them share a floor').toBe(named.length)
    expect(clashes).toEqual([])
  })

  it('leaves no room a bare floor with one rug on it', () => {
    // Showrooms, the club, the lobby and Marcus's house were a rug and a lot
    // of empty floor. Somewhere to walk is fine; a five-by-five square of
    // nothing is a room nobody furnished.
    const bare = interiors
      .map(({ city, area }) => ({ room: `${city}/${area.name}`, square: biggestBareSquare(area) }))
      .filter(({ square }) => square > 4)
    expect(bare).toEqual([])
  })

  it('furnishes the rooms that were the emptiest to the walls', () => {
    const emptiest = ['rb-diner', 'ch-club', 'ch-autorow', 'pc-marina', 'nm-motors', 'pl-lift', 'marcus-house']
    const bare = interiors
      .filter(({ area }) => emptiest.includes(area.id))
      .map(({ area }) => ({ room: area.id, square: biggestBareSquare(area) }))
      .filter(({ square }) => square > 3)
    expect(bare).toEqual([])
  })
})
