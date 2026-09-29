import { Container, Graphics } from 'pixi.js'

export const TILE_SIZE = 32

/** 0 = floor, 1 = wall, 2 = furniture (both block movement except floor). */
export type TileGrid = number[][]

const PALETTE: Record<number, number> = {
  0: 0x24243a,
  1: 0x121218,
  2: 0x4a3a2a,
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
  return grid[row][col] === 0
}
