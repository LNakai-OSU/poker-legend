import { Container, Sprite } from 'pixi.js'
import { tileTextures } from './sprites'
import { stampTexture } from './stampArt'
import { FLOOR, TILE_SIZE, type TileGrid } from './tiles'
import type { PlacedStamp } from '../world/stamps'

// Re-exported so callers have a single import for map data plus rendering.
export * from './tiles'

export function buildTileLayer(grid: TileGrid, themeId = 'default'): Container {
  const textures = tileTextures(themeId)
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


/**
 * The objects standing on a map, drawn over its tiles.
 *
 * A separate layer because a stamp is one picture across several tiles, and the
 * tile layer can only draw one texture per tile. The tiles underneath are still
 * written — a house's walls really are walls — so collision, pathing and the
 * content tests never have to know this layer exists. If a stamp has no art, its
 * tiles are what you see, and nothing breaks.
 */
export function buildStampLayer(stamps: PlacedStamp[], ): Container {
  const layer = new Container()
  for (const placed of stamps) {
    const texture = stampTexture(placed.stampId)
    if (!texture) continue
    const sprite = new Sprite(texture)
    sprite.position.set(placed.col * TILE_SIZE, placed.row * TILE_SIZE)
    layer.addChild(sprite)
  }
  return layer
}
