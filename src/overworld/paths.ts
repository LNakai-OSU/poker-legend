import { isWalkable, type TileGrid } from './tiles'

/**
 * The way a person walks from one tile to another: the shortest route on foot,
 * round walls, furniture and whoever is standing in the way.
 *
 * Breadth-first over the walkable grid. Streets are a few hundred tiles, and a
 * beat walks somebody a handful of times, so there is nothing to optimise.
 */

export interface Tile {
  col: number
  row: number
}

const STEPS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const key = (col: number, row: number) => `${col},${row}`

/**
 * The tiles walked, after `from` and ending on the first tile `arrived` accepts;
 * an empty list if `from` already is one; null if there is no way there.
 * `blocked` says where somebody is standing. Doors are only walked onto when
 * they are where the walk ends.
 */
export function pathWhere(
  map: TileGrid,
  from: Tile,
  arrived: (col: number, row: number) => boolean,
  blocked: (col: number, row: number) => boolean,
  isDoor: (col: number, row: number) => boolean = () => false,
): Tile[] | null {
  if (arrived(from.col, from.row)) return []
  const cameFrom = new Map<string, string | null>([[key(from.col, from.row), null]])
  const queue: Tile[] = [from]
  while (queue.length > 0) {
    const here = queue.shift()!
    for (const [dc, dr] of STEPS) {
      const col = here.col + dc
      const row = here.row + dr
      const k = key(col, row)
      if (cameFrom.has(k) || !isWalkable(map, col, row) || blocked(col, row)) continue
      const done = arrived(col, row)
      if (isDoor(col, row) && !done) continue
      cameFrom.set(k, key(here.col, here.row))
      if (done) {
        const path: Tile[] = []
        for (let at: string | null = k; at && at !== key(from.col, from.row); at = cameFrom.get(at) ?? null) {
          const [c, r] = at.split(',').map(Number)
          path.unshift({ col: c, row: r })
        }
        return path
      }
      queue.push({ col, row })
    }
  }
  return null
}

/** The way to one tile. */
export function pathTo(
  map: TileGrid,
  from: Tile,
  to: Tile,
  blocked: (col: number, row: number) => boolean,
  isDoor?: (col: number, row: number) => boolean,
): Tile[] | null {
  return pathWhere(map, from, (col, row) => col === to.col && row === to.row, blocked, isDoor)
}

/** The way to whichever free tile beside `target` is nearest on foot: how somebody walks up to you. */
export function pathBeside(
  map: TileGrid,
  from: Tile,
  target: Tile,
  blocked: (col: number, row: number) => boolean,
  isDoor?: (col: number, row: number) => boolean,
): Tile[] | null {
  return pathWhere(
    map,
    from,
    (col, row) => Math.abs(col - target.col) + Math.abs(row - target.row) === 1,
    (col, row) => blocked(col, row) || (col === target.col && row === target.row),
    isDoor,
  )
}

/** A free tile next to this one to stand somebody on, or the tile itself if there is none. */
export function besideTile(map: TileGrid, at: Tile, taken: (col: number, row: number) => boolean): Tile {
  for (const [dc, dr] of STEPS) {
    const col = at.col + dc
    const row = at.row + dr
    if (isWalkable(map, col, row) && !taken(col, row)) return { col, row }
  }
  return at
}
