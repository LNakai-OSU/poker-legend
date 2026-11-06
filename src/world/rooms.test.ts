import { describe, expect, it } from 'vitest'
import { AREAS, CITIES, allAreas } from './cities'
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

  describe('casino floors', () => {
    // Every floor was doubled in each direction (Lumina's hall, already a ballroom,
    // in area) after players found the casinos cramped. What was asked of them:
    // room to walk, and a way to every table, door and person that is not a
    // single-file squeeze.
    const FLOORS: Record<string, number> = {
      'sc-floor': 20 * 12,
      'rb-boat': 22 * 11,
      'ch-cardroom': 20 * 13,
      'pc-casino': 20 * 14,
      'nm-casino': 22 * 14,
      'pl-casino': 40 * 26,
    }

    /** The widest square of floor each walkable tile belongs to, up to 3. */
    function widths(map: number[][]): number[][] {
      const walk = (c: number, r: number) => isTileWalkable(map[r]?.[c] ?? -1)
      const out = map.map((row) => row.map(() => 0))
      for (let k = 1; k <= 3; k++) {
        for (let r = 0; r + k <= map.length; r++) {
          for (let c = 0; c + k <= map[0].length; c++) {
            let all = true
            for (let dr = 0; dr < k && all; dr++) for (let dc = 0; dc < k; dc++) if (!walk(c + dc, r + dr)) { all = false; break }
            if (all) for (let dr = 0; dr < k; dr++) for (let dc = 0; dc < k; dc++) out[r + dr][c + dc] = k
          }
        }
      }
      return out
    }

    it('are at least twice the size they were', () => {
      for (const [id, was] of Object.entries(FLOORS)) {
        const map = AREAS[id].area.map
        expect(map.length * map[0].length, id).toBeGreaterThanOrEqual(was * 2)
      }
    })

    it('leave a path two tiles wide to everything on them', () => {
      for (const id of Object.keys(FLOORS)) {
        const area = AREAS[id].area
        const map = area.map
        const wid = widths(map)
        const walk = (c: number, r: number) => isTileWalkable(map[r]?.[c] ?? -1)
        // From inside the hall, past the foyer: Lumina's rope has one deliberate gap.
        const door = area.exits[0]
        let start: { col: number; row: number } | null = null
        for (let r = door.row - 6; r >= 1 && !start; r--) {
          for (const dc of [0, 1, -1, 2, -2]) if (walk(door.col + dc, r) && wid[r][door.col + dc] >= 2) { start = { col: door.col + dc, row: r }; break }
        }
        expect(start, `${id}: nowhere to start`).not.toBeNull()
        // The widest route from the start to each tile: the narrowest tile along the best way.
        const best = map.map((row) => row.map(() => 0))
        best[start!.row][start!.col] = wid[start!.row][start!.col]
        const queue: [number, number][] = [[start!.col, start!.row]]
        while (queue.length) {
          const [c, r] = queue.shift()!
          for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nc = c + dc, nr = r + dr
            if (!walk(nc, nr)) continue
            const v = Math.min(best[r][c], wid[nr][nc])
            if (v > best[nr][nc]) { best[nr][nc] = v; queue.push([nc, nr]) }
          }
        }
        const squeezed: string[] = []
        for (const poi of area.pois) {
          if (poi.id.includes('-slot-')) continue
          // The foyer by the door, behind Lumina's rope with its one gap, is a corridor on purpose.
          if (poi.row >= map.length - 4) continue
          // Somebody stands against what they are at, so look at the floor beside them.
          const beside = [[0, 1], [0, -1], [1, 0], [-1, 0], [0, 0]].map(([dc, dr]) => ({ c: poi.col + dc, r: poi.row + dr })).filter(({ c, r }) => walk(c, r))
          const reach = Math.max(0, ...beside.map(({ c, r }) => best[r][c]))
          if (reach === 0) squeezed.push(`${poi.id}: no way there`)
          else if (reach < 2) squeezed.push(`${poi.id}@${poi.col},${poi.row}`)
        }
        expect(squeezed, id).toEqual([])
      }
    })
  })
})
