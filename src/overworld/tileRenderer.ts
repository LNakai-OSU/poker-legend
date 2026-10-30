import { Container, Rectangle, Sprite, Texture } from 'pixi.js'
import { FRAME_MS, SCALE, UNIT, placementVariants, stampLayers } from './stampArt'
import type { GlowField, LightSource } from './lighting'
import { TILE_SIZE, isWalkable, type TileGrid } from './tiles'
import { cellArt, cellTextures, paintedGrid } from './cells'
import { WATER_FRAME_MS } from './ground'
import { STAMP_BY_ID, stampSize, type PlacedStamp } from '../world/stamps'

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
 * The order things are drawn in, bottom up. The light map multiplies everything
 * under it, so the ground and the buildings darken with the hour; what glows
 * is drawn again just above it; the people are lit one by one by what they
 * stand in; and the fronts of things go over the people, with their own lit
 * parts over those.
 */
export const LAYER = {
  lightMap: 1,
  litUnder: 2,
  signs: 3,
  actors: 4,
  over: OVER_PEOPLE,
  litOver: OVER_PEOPLE + 0.5,
  captions: OVER_PEOPLE + 1,
} as const

/** The stamps on a map, by day and by night, and the light they throw. */
export interface StampScene {
  /** Under the people. */
  under: Container
  /** Over the people: counter fronts, the tops of lamp posts and trees. */
  over: Container
  /** What glows after dark, drawn over the darkness. Hidden by day. */
  litUnder: Container
  litOver: Container
  /**
   * Strips of stamps drawn in the same container as the people, ordered among
   * them by the row they stand on (only when asked for with `rowSort`). Add them
   * to the people's container; `setLight` tints and lights them.
   */
  sorted: Sprite[]
  /** The hour's light for the sorted strips: the colour of the air, and whether lamps are lit. */
  setLight: (tint: number, lamps: boolean) => void
  /** Pools of light thrown by lamp posts and the like, in art units of the map. */
  lights: LightSource[]
  /** What everything lit gives off, summed per art unit of a map this size, for the halos. */
  glow: (width: number, height: number) => GlowField | null
}

/** The per-art-unit colours of a lit canvas, read once per stamp. */
const glowPixels = new Map<string, { width: number; height: number; rgb: Float32Array } | null>()

function glowOf(stampId: string, canvas: HTMLCanvasElement | null) {
  if (glowPixels.has(stampId)) return glowPixels.get(stampId)!
  if (!canvas) {
    glowPixels.set(stampId, null)
    return null
  }
  const width = Math.floor(canvas.width / SCALE)
  const height = Math.floor(canvas.height / SCALE)
  const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
  const rgb = new Float32Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = ((y * SCALE) * canvas.width + x * SCALE) * 4
      const a = data[i + 3] / 255
      rgb[(y * width + x) * 3] = (data[i] / 255) * a
      rgb[(y * width + x) * 3 + 1] = (data[i + 1] / 255) * a
      rgb[(y * width + x) * 3 + 2] = (data[i + 2] / 255) * a
    }
  }
  const pixels = { width, height, rgb }
  glowPixels.set(stampId, pixels)
  return pixels
}

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
 * stands behind, the top of a lamp post somebody walks behind. Those parts go in
 * the `over` layer. And after dark every lit window, bulb and lantern is drawn a
 * second time, over the darkness, from each stamp's night pass.
 */
export interface RowSort {
  /** The map, to tell which rows of a stamp are solid. */
  map: TileGrid
  /** Sort the solid rows of the under layer too (rooms; outdoors the light map owns them). */
  under: boolean
}

export function buildStampScene(stamps: PlacedStamp[], rowSort?: RowSort): StampScene {
  const under = new Container()
  const over = new Container()
  const litUnder = new Container()
  const litOver = new Container()
  under.zIndex = 0
  over.zIndex = LAYER.over
  litUnder.zIndex = LAYER.litUnder
  litOver.zIndex = LAYER.litOver
  litUnder.visible = false
  litOver.visible = false
  const animated: Array<{ sprite: Sprite; frames: Texture[] }> = []
  const lights: LightSource[] = []
  const glowing: Array<{ stampId: string; x: number; y: number; canvas: HTMLCanvasElement }> = []

  const sorted: Sprite[] = []
  const sortedOver: Sprite[] = []
  const sortedLit: Sprite[] = []

  /**
   * A stamp's picture cut into one strip per tile row. Each strip stands in the
   * people's container at the depth of its row, so somebody south of a bar is in
   * front of it and somebody north of a table is behind it, whatever the
   * picture's bleed. `depth` is where among the people a row's strip goes.
   */
  const strips = (
    frames: Texture[],
    x: number,
    y: number,
    placed: PlacedStamp,
    rows: number,
    bleedTop: number,
    solid: (k: number) => boolean,
    depth: (row: number) => number,
    flat: Container,
    into: Sprite[],
  ) => {
    const { width, height } = frames[0].frame
    const edge = (k: number) => (k <= 0 ? 0 : k >= rows ? height : Math.min(height, bleedTop * SCALE + k * TILE_SIZE))
    let k = 0
    while (k < rows) {
      let end = k + 1
      const isSolid = solid(k)
      // Solid rows are a strip each, so each sits at its own depth; the rest are one flat piece.
      while (!isSolid && end < rows && !solid(end)) end++
      const cut = frames.map((f) => new Texture({ source: f.source, frame: new Rectangle(f.frame.x, f.frame.y + edge(k), width, edge(end) - edge(k)) }))
      const sprite = new Sprite(cut[0])
      sprite.position.set(x, y + edge(k))
      if (isSolid) {
        sprite.zIndex = depth(placed.row + k)
        sorted.push(sprite)
        into.push(sprite)
      } else flat.addChild(sprite)
      if (cut.length > 1) animated.push({ sprite, frames: cut })
      k = end
    }
  }

  const variants = placementVariants(stamps)
  for (const [i, placed] of stamps.entries()) {
    const art = stampLayers(placed.stampId, variants[i])
    if (!art) continue
    const x = placed.col * TILE_SIZE - art.bleed.left * SCALE
    const y = placed.row * TILE_SIZE - art.bleed.top * SCALE
    const parts: Array<[Container, Texture[] | null]> = [
      [under, art.under],
      [over, art.over],
      [litUnder, art.litUnder],
      [litOver, art.litOver],
    ]
    const stamp = STAMP_BY_ID[placed.stampId]
    const rows = stamp ? stampSize(stamp).rows : 0
    const cols = stamp ? stampSize(stamp).cols : 0
    const solidRow = (k: number) => {
      for (let c = 0; c < cols; c++) if (!isWalkable(rowSort!.map, placed.col + c, placed.row + k)) return true
      return false
    }
    const behind = (row: number) => row * TILE_SIZE + TILE_SIZE / 2
    const front = (row: number) => (row + 1) * TILE_SIZE + 1
    for (const [layer, frames] of parts) {
      if (!frames) continue
      if (rowSort && rows > 0) {
        const isOver = layer === over || layer === litOver
        const isLit = layer === litUnder || layer === litOver
        const base = isOver ? front : behind
        const nudge = layer === litUnder ? 0.1 : layer === litOver ? 0.5 : 0
        const solid = isOver ? () => true : rowSort.under ? solidRow : () => false
        strips(frames, x, y, placed, rows, art.bleed.top, solid, (row) => base(row) + nudge, layer, isOver && !isLit ? sortedOver : isLit ? sortedLit : [])
        continue
      }
      const sprite = new Sprite(frames[0])
      sprite.position.set(x, y)
      layer.addChild(sprite)
      if (frames.length > 1) animated.push({ sprite, frames })
    }
    for (const light of art.lights) {
      lights.push({
        x: placed.col * UNIT + light.x,
        y: placed.row * UNIT + light.y,
        reach: light.reach,
        color: light.color,
        strength: light.strength ?? 1,
      })
    }
    if (art.glow) {
      glowing.push({ stampId: placed.stampId, x: placed.col * UNIT - art.bleed.left, y: placed.row * UNIT - art.bleed.top, canvas: art.glow })
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

  const glow = (width: number, height: number): GlowField | null => {
    if (glowing.length === 0) return null
    const rgb = new Float32Array(width * height * 3)
    for (const item of glowing) {
      const pixels = glowOf(item.stampId, item.canvas)
      if (!pixels) continue
      for (let py = 0; py < pixels.height; py++) {
        const gy = item.y + py
        if (gy < 0 || gy >= height) continue
        for (let px = 0; px < pixels.width; px++) {
          const gx = item.x + px
          if (gx < 0 || gx >= width) continue
          const from = (py * pixels.width + px) * 3
          const to = (gy * width + gx) * 3
          rgb[to] += pixels.rgb[from]
          rgb[to + 1] += pixels.rgb[from + 1]
          rgb[to + 2] += pixels.rgb[from + 2]
        }
      }
    }
    return { width, height, rgb }
  }

  for (const sprite of sortedLit) sprite.visible = false
  const setLight = (tint: number, lamps: boolean) => {
    for (const sprite of sortedOver) sprite.tint = tint
    for (const sprite of sortedLit) sprite.visible = lamps
  }

  return { under, over, litUnder, litOver, sorted, setLight, lights, glow }
}
