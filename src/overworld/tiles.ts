/**
 * Pure tile data with no rendering dependencies, so both the renderer and the
 * sprite generator can import it without forming a cycle.
 */

export const TILE_SIZE = 32

/** See TILE_CHARS for what each id means; only FLOOR/CARPET/ROAD are walkable. */
export type TileGrid = number[][]

export const FLOOR = 0
export const WALL = 1
export const FURNITURE = 2
export const CARPET = 3
export const WATER = 4
export const ROAD = 5
export const SIDEWALK = 6
export const GRASS = 7
export const DOOR = 8
/** Solid greenery: the natural wall an open outdoor map is bounded with. */
export const TREE = 9
/** Walkable, for beaches, lots and desert verges. */
export const SAND = 10
/** Walkable decoration — flower beds and planting along a path. */
export const FLOWER = 11
/** A paved plaza or forecourt, lighter than a pavement. */
export const PLAZA = 12
/** Solid: fountains, planters, barriers, the base of a sign. */
export const PROP = 13

const WALKABLE = new Set([FLOOR, CARPET, ROAD, SIDEWALK, GRASS, DOOR, SAND, FLOWER, PLAZA])

const TILE_CHARS: Record<string, number> = {
  '.': FLOOR,
  '#': WALL,
  F: FURNITURE,
  ',': CARPET,
  '~': WATER,
  '=': ROAD,
  '-': SIDEWALK,
  '"': GRASS,
  D: DOOR,
  T: TREE,
  ':': SAND,
  '*': FLOWER,
  '+': PLAZA,
  o: PROP,
}

/**
 * Builds a grid from an ASCII sketch so city layouts stay readable in source.
 * Rows are padded to equal width with walls.
 */
export function parseMap(sketch: string): TileGrid {
  const lines = sketch.split('\n').filter((line) => line.trim().length > 0)
  const width = Math.max(...lines.map((line) => line.length))
  // Short rows used to be padded with wall, which silently turned a miscounted
  // row into a map with a hole in the side of it — and on maps this size, a row
  // off by one character is very easy to write and impossible to spot by eye.
  const ragged = lines.findIndex((line) => line.length !== width)
  if (ragged !== -1) {
    throw new Error(
      `map row ${ragged} is ${lines[ragged].length} wide, expected ${width}: ${JSON.stringify(lines[ragged])}`,
    )
  }
  return lines.map((line) =>
    Array.from({ length: width }, (_, col) => {
      const char = line[col]
      const tile = TILE_CHARS[char]
      if (tile === undefined) throw new Error(`unknown map character: ${JSON.stringify(char)}`)
      return tile
    }),
  )
}

export function isWalkable(grid: TileGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false
  return WALKABLE.has(grid[row][col])
}
