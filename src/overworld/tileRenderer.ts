import { Container, Sprite, type Texture } from 'pixi.js'
import { edgeTexture, tileVariant, tileVariantTextures, type Side } from './sprites'
import { FRAME_MS, SCALE, stampLayers } from './stampArt'
import { CARPETS, FLOOR, TILE_SIZE, WALL, WALL_FACES, WALL_TOP, isTileWalkable, type TileGrid } from './tiles'
import type { PlacedStamp } from '../world/stamps'

// Re-exported so callers have a single import for map data plus rendering.
export * from './tiles'

const SIDES: Array<[Side, number, number]> = [
  ['n', 0, -1],
  ['e', 1, 0],
  ['s', 0, 1],
  ['w', -1, 0],
]

/**
 * What to lay over a tile where it meets its neighbours, as edge-texture keys.
 *
 * A room drawn as a grid of independent squares has no corners: the floor runs
 * flat into the wall and a carpet stops dead at the skirting. These are the
 * few joins that sell it as a room — the lit lip on the top of a wall, the
 * shadow a wall throws on the floor, the bound edge of a carpet.
 */
export function edgesAt(grid: TileGrid, col: number, row: number): string[] {
  const tile = grid[row][col]
  const at = (c: number, r: number) => grid[r]?.[c]
  const keys: string[] = []

  if (tile === WALL_TOP) {
    for (const [side, dc, dr] of SIDES) {
      const next = at(col + dc, row + dr)
      if (next !== undefined && isTileWalkable(next)) keys.push(`lip-${side}`)
    }
    return keys
  }

  if (!isTileWalkable(tile)) return keys

  if (CARPETS.has(tile)) {
    for (const [side, dc, dr] of SIDES) {
      const next = at(col + dc, row + dr)
      // A carpet runs on under whatever stands on it; it is bound where it
      // stops — at a wall, a doorway or another floor.
      const stops = next === undefined || next === WALL || next === WALL_TOP || WALL_FACES.has(next) ||
        (isTileWalkable(next) && next !== tile)
      if (stops) keys.push(`border-${tile}-${side}`)
    }
  }

  // Walls shade the floor below them and to their right.
  const above = at(col, row - 1)
  if (above !== undefined && (WALL_FACES.has(above) || above === WALL_TOP)) keys.push('shade-n')
  if (at(col - 1, row) === WALL_TOP) keys.push('shade-w')
  return keys
}

export function buildTileLayer(grid: TileGrid, themeId = 'default'): Container {
  const textures = tileVariantTextures(themeId)
  const layer = new Container()
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const kind = grid[row][col]
      const variants = textures[kind] ?? textures[FLOOR]
      const tile = new Sprite(variants[tileVariant(kind, col, row)] ?? variants[0])
      tile.position.set(col * TILE_SIZE, row * TILE_SIZE)
      layer.addChild(tile)
      for (const key of edgesAt(grid, col, row)) {
        const texture = edgeTexture(key)
        if (!texture) continue
        const edge = new Sprite(texture)
        edge.position.set(col * TILE_SIZE, row * TILE_SIZE)
        layer.addChild(edge)
      }
    }
  }
  return layer
}

/** Above everybody who walks about, so a counter's front can stand in front of its clerk. */
const OVER_PEOPLE = 10

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
