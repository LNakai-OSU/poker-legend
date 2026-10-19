import { Container, Sprite, type Texture } from 'pixi.js'
import { FRAME_MS, SCALE, stampLayers } from './stampArt'
import { TILE_SIZE, type TileGrid } from './tiles'
import { cellArt, cellTextures, paintedGrid } from './cells'
import { WATER_FRAME_MS } from './ground'
import type { PlacedStamp } from '../world/stamps'

// Re-exported so callers have a single import for map data plus rendering.
export * from './tiles'
export { edgesAt, paintedGrid } from './cells'

/**
 * The ground, one sprite per square.
 *
 * Each square's picture comes from `cellArt`, which reads the squares round it
 * — so a pavement beside the road has its kerb and a square of water beside
 * the quay has its lip. Squares that look the same share a texture. Water and
 * flower beds have frames, swapped on one clock for the whole map so the
 * ripples move together.
 */
export function buildTileLayer(grid: TileGrid, themeId = 'default'): Container {
  const layer = new Container()
  const painted = paintedGrid(grid)
  const animated: Array<{ sprite: Sprite; frames: Texture[] }> = []
  for (let row = 0; row < painted.length; row++) {
    for (let col = 0; col < painted[row].length; col++) {
      const frames = cellTextures(cellArt(painted, col, row, themeId))
      const tile = new Sprite(frames[0])
      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      layer.addChild(tile)
      if (frames.length > 1) animated.push({ sprite: tile, frames })
    }
  }
  if (animated.length > 0) {
    layer.onRender = () => {
      const tick = Math.floor(performance.now() / WATER_FRAME_MS)
      for (const { sprite, frames } of animated) {
        const next = frames[tick % frames.length]
        if (sprite.texture !== next) sprite.texture = next
      }
    }
  }
  return layer
}

/** Above everybody who walks about, so a counter's front can stand in front of its clerk. */
export const OVER_PEOPLE = 10

/**
 * The objects standing on a map, drawn over its tiles.
 *
 * A separate layer because a stamp is one picture across several tiles, and the
 * tile layer can only draw one texture per tile. The tiles underneath are still
 * written — a house's walls really are walls — so collision, pathing and the
 * content tests never have to know this layer exists. If a stamp has no art, its
 * tiles are what you see, and nothing breaks.
 *
 * Some stamps have a front that belongs in front of people: the counter a clerk
 * stands behind, the bars of a cashier's cage. Those parts go in a second layer
 * that puts itself above the people as soon as this one is added to the world,
 * so the scene adds one layer and gets both.
 */
export function buildStampLayer(stamps: PlacedStamp[]): Container {
  const under = new Container()
  const over = new Container()
  over.zIndex = OVER_PEOPLE
  const animated: Array<{ sprite: Sprite; frames: Texture[] }> = []

  for (const placed of stamps) {
    const art = stampLayers(placed.stampId)
    if (!art) continue
    const x = placed.col * TILE_SIZE - art.bleed.left * SCALE
    const y = placed.row * TILE_SIZE - art.bleed.top * SCALE
    const parts: Array<[Container, Texture[] | null]> = [
      [under, art.under],
      [over, art.over],
    ]
    for (const [layer, frames] of parts) {
      if (!frames) continue
      const sprite = new Sprite(frames[0])
      sprite.position.set(x, y)
      layer.addChild(sprite)
      if (frames.length > 1) animated.push({ sprite, frames })
    }
  }

  if (animated.length > 0) {
    // One clock for every bulb on the map, so a marquee chases as a whole.
    under.onRender = () => {
      const tick = Math.floor(performance.now() / FRAME_MS)
      for (const { sprite, frames } of animated) {
        const next = frames[tick % frames.length]
        if (sprite.texture !== next) sprite.texture = next
      }
    }
  }

  under.on('added', (parent: Container) => parent.addChild(over))
  under.on('removed', () => over.removeFromParent())
  under.on('destroyed', () => over.destroy({ children: true }))
  return under
}
