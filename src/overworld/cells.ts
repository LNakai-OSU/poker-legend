import { Texture } from 'pixi.js'
import { CARPETS, DECK, DOOR, FURNITURE, WALL, WALL_FACES, WALL_TOP, WATER, isTileWalkable, type TileGrid } from './tiles'
import { baseDrawing, edgeDrawing, makeCanvas, type Draw, type Side } from './sprites'
import { cellAt, groundArt, groundKey } from './ground'

/**
 * What one square of a map looks like, worked out from the square and the
 * squares round it.
 *
 * This is the only place a square's picture is decided. The game's tile layer
 * and the map editor both ask it, so the editor shows the kerbs, borders and
 * variants the game draws instead of one flat swatch per kind of tile.
 */

const SIDES: Array<[Side, number, number]> = [
  ['n', 0, -1],
  ['e', 1, 0],
  ['s', 0, 1],
  ['w', -1, 0],
]

/**
 * What to lay over an interior tile where it meets its neighbours, as edge keys.
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

/**
 * The grid as it should be painted.
 *
 * A furniture tile means "something solid stands here", and every piece of
 * furniture is a stamp drawn over it — a round table, a palm in a pot, a
 * pillar. What shows round the edges of those is the floor of the room they
 * stand in, not a square of some furniture texture, so each furniture tile is
 * painted as the nearest floor to it. The collision grid is untouched.
 */
export function paintedGrid(grid: TileGrid): TileGrid {
  const painted = grid.map((row) => [...row])
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] !== FURNITURE) continue
      const floor = nearestFloor(grid, col, row)
      if (floor !== undefined) painted[row][col] = floor
    }
  }
  return painted
}

function nearestFloor(grid: TileGrid, col: number, row: number): number | undefined {
  for (let reach = 1; reach <= 6; reach++) {
    // Straight neighbours first at each distance, so a table on a carpet takes the carpet.
    for (const [dc, dr] of [[0, reach], [0, -reach], [reach, 0], [-reach, 0]]) {
      const tile = grid[row + dr]?.[col + dc]
      if (tile !== undefined && tile !== DOOR && isTileWalkable(tile)) return tile
    }
    for (let dr = -reach; dr <= reach; dr++) {
      for (let dc = -reach; dc <= reach; dc++) {
        if (Math.max(Math.abs(dc), Math.abs(dr)) !== reach) continue
        const tile = grid[row + dr]?.[col + dc]
        if (tile !== undefined && tile !== DOOR && isTileWalkable(tile)) return tile
      }
    }
  }
  return undefined
}

/** One square's picture: a key for everything it depends on, its frames, and how to draw one. */
export interface CellArt {
  key: string
  frames: number
  draw: Draw
  /** Draws a given frame. `draw` is frame 0. */
  drawFrame: (frame: number) => Draw
}

/** A boardwalk's planks end in a face where the water is in front of them. */
function deckFace(px: Parameters<Draw>[0]) {
  px(0, 13, 16, 1, '#5a3e22')
  px(0, 14, 16, 2, '#3a2614')
  for (const x of [3, 11]) px(x, 14, 1, 2, '#24160a')
}

/**
 * The picture for the square at (col, row) of an already painted grid.
 *
 * Outdoor ground comes from `ground.ts`, which reads all eight neighbours;
 * interiors are their variant plus the wall lips, shadows and carpet borders
 * `edgesAt` finds. Either way it is one picture, so the editor can draw it the
 * way the game does.
 */
export function cellArt(painted: TileGrid, col: number, row: number, themeId = 'default'): CellArt {
  const ground = groundArt(cellAt(painted, col, row), themeId)
  if (ground) {
    return {
      key: groundKey(ground, themeId),
      frames: ground.frames,
      draw: (px) => ground.draw(px, 0),
      drawFrame: (frame) => (px) => ground.draw(px, frame),
    }
  }
  const tile = painted[row][col]
  const { draw: base, variant } = baseDrawing(tile, col, row, themeId)
  const edges = edgesAt(painted, col, row)
  const face = tile === DECK && painted[row + 1]?.[col] === WATER
  const draw: Draw = (px) => {
    base(px)
    for (const key of edges) edgeDrawing(key)?.(px)
    if (face) deckFace(px)
  }
  return {
    key: `${themeId}|tile:${tile}:${variant}:${edges.join(',')}:${face ? 'f' : ''}`,
    frames: 1,
    draw,
    drawFrame: () => draw,
  }
}

const textureCache = new Map<string, Texture[]>()

/** The textures for one square, one per frame, shared by every square that looks the same. */
export function cellTextures(art: CellArt): Texture[] {
  const cached = textureCache.get(art.key)
  if (cached) return cached
  const textures = Array.from({ length: art.frames }, (_, frame) => {
    const texture = Texture.from(makeCanvas(art.drawFrame(frame)))
    texture.source.scaleMode = 'nearest'
    return texture
  })
  textureCache.set(art.key, textures)
  return textures
}

const canvasCache = new Map<string, HTMLCanvasElement>()

/** The same square as a canvas, for the editor. */
export function cellCanvas(art: CellArt, frame = 0): HTMLCanvasElement {
  const key = `${art.key}#${frame}`
  const cached = canvasCache.get(key)
  if (cached) return cached
  const canvas = makeCanvas(art.drawFrame(frame))
  canvasCache.set(key, canvas)
  return canvas
}

/**
 * A tile on its own, as the editor's palette shows it: the middle of a 3x3
 * patch of itself, so it is drawn with no edges, the way most of it looks.
 */
export function tileSwatch(tile: number, themeId = 'default'): HTMLCanvasElement {
  const patch = [[tile, tile, tile], [tile, tile, tile], [tile, tile, tile]]
  // A furniture tile with no object on it is shown as what it is in the editor,
  // a plinth, rather than painted over as the floor it stands on.
  const art = cellArt(tile === FURNITURE ? patch : paintedGrid(patch), 1, 1, themeId)
  return cellCanvas(art)
}

