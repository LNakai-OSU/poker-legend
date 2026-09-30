import { Container, Graphics } from 'pixi.js'

export const TILE_SIZE = 32

/** See TILE_CHARS for what each id means; only FLOOR/CARPET/ROAD are walkable. */
export type TileGrid = number[][]

export const FLOOR = 0
export const WALL = 1
export const FURNITURE = 2
export const CARPET = 3
export const WATER = 4
export const ROAD = 5

const WALKABLE = new Set([FLOOR, CARPET, ROAD])

const PALETTE: Record<number, number> = {
  [FLOOR]: 0x24243a,
  [WALL]: 0x121218,
  [FURNITURE]: 0x4a3a2a,
  [CARPET]: 0x3a2036,
  [WATER]: 0x16344a,
  [ROAD]: 0x2b2b30,
}

const TILE_CHARS: Record<string, number> = {
  '.': FLOOR,
  '#': WALL,
  F: FURNITURE,
  ',': CARPET,
  '~': WATER,
  '=': ROAD,
}

/**
 * Builds a grid from an ASCII sketch so city layouts stay readable in source.
 * Rows are padded to equal width with walls.
 */
export function parseMap(sketch: string): TileGrid {
  const lines = sketch.split('\n').filter((line) => line.trim().length > 0)
  const width = Math.max(...lines.map((line) => line.length))
  return lines.map((line) =>
    Array.from({ length: width }, (_, col) => {
      const char = line[col] ?? '#'
      const tile = TILE_CHARS[char]
      if (tile === undefined) throw new Error(`unknown map character: ${JSON.stringify(char)}`)
      return tile
    }),
  )
}

export function buildTileLayer(grid: TileGrid): Container {
  const layer = new Container()
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const tile = new Graphics()
        .rect(0, 0, TILE_SIZE, TILE_SIZE)
        .fill({ color: PALETTE[grid[row][col]] ?? 0xff00ff })
      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      layer.addChild(tile)
    }
  }
  return layer
}

export function isWalkable(grid: TileGrid, col: number, row: number): boolean {
  if (row < 0 || row >= grid.length || col < 0 || col >= grid[row].length) return false
  return WALKABLE.has(grid[row][col])
}
