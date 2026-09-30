import { Container, Sprite } from 'pixi.js'
import { tileTextures } from './sprites'
import { FLOOR, TILE_SIZE, type TileGrid } from './tiles'

// Re-exported so callers have a single import for map data plus rendering.
export * from './tiles'

export function buildTileLayer(grid: TileGrid): Container {
  const textures = tileTextures()
  const layer = new Container()
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const texture = textures[grid[row][col]] ?? textures[FLOOR]
      const tile = new Sprite(texture)
      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      layer.addChild(tile)
    }
  }
  return layer
}
