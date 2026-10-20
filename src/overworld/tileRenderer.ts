import { Container, Sprite, type Texture } from 'pixi.js'
import { FRAME_MS, SCALE, UNIT, stampLayers } from './stampArt'
import type { GlowField, LightSource } from './lighting'
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
export function buildStampScene(stamps: PlacedStamp[]): StampScene {
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

  for (const placed of stamps) {
    const art = stampLayers(placed.stampId)
    if (!art) continue
    const x = placed.col * TILE_SIZE - art.bleed.left * SCALE
    const y = placed.row * TILE_SIZE - art.bleed.top * SCALE
    const parts: Array<[Container, Texture[] | null]> = [
      [under, art.under],
      [over, art.over],
      [litUnder, art.litUnder],
      [litOver, art.litOver],
    ]
    for (const [layer, frames] of parts) {
      if (!frames) continue
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

  return { under, over, litUnder, litOver, lights, glow }
}
