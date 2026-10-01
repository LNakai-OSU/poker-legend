import { Sprite } from 'pixi.js'
import { TILE_SIZE, isWalkable, type TileGrid } from './tileRenderer'
import { characterTextures, paletteFromColor, type CharacterPalette, type Facing } from './sprites'

export type Direction = Facing

export const DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

/** Distance walked, in pixels, before the sprite swaps to the other step frame. */
const STRIDE_PX = 16

/** LeafGreen-style grid-locked movement: input only lands between tiles, position interpolates smoothly. */
export class GridPlayer {
  col: number
  row: number
  pixelX: number
  pixelY: number
  private targetCol: number
  private targetRow: number
  moving = false
  facing: Direction = 'down'
  sprite: Sprite
  private speedPxPerSec: number
  private textures: Record<Facing, ReturnType<typeof characterTextures>[Facing]>
  private walkedPx = 0

  constructor(
    startCol: number,
    startRow: number,
    color = 0xf2c14e,
    speedPxPerSec = 220,
    palette?: CharacterPalette,
  ) {
    this.col = startCol
    this.row = startRow
    this.targetCol = startCol
    this.targetRow = startRow
    this.pixelX = startCol * TILE_SIZE
    this.pixelY = startRow * TILE_SIZE
    this.speedPxPerSec = speedPxPerSec
    this.textures = characterTextures(palette ?? paletteFromColor(color))
    this.sprite = new Sprite(this.textures.down[0])
    this.sprite.position.set(this.pixelX, this.pixelY)
  }

  private refreshFrame() {
    const frame = this.moving && Math.floor(this.walkedPx / STRIDE_PX) % 2 === 1 ? 1 : 0
    this.sprite.texture = this.textures[this.facing][frame]
  }

  /** Turns on the spot without stepping, for facing a door or a person. */
  face(direction: Direction) {
    if (this.moving) return
    this.facing = direction
    this.refreshFrame()
  }

  /**
   * @param isOccupied extra blocking beyond the tile map — people and props
   *        stand on walkable tiles, and you shouldn't be able to walk through them.
   */
  tryMove(direction: Direction, grid: TileGrid, isOccupied?: (col: number, row: number) => boolean) {
    this.facing = direction
    if (this.moving) return
    const [dc, dr] = DELTAS[direction]
    const nextCol = this.col + dc
    const nextRow = this.row + dr
    this.refreshFrame()
    if (!isWalkable(grid, nextCol, nextRow)) return
    if (isOccupied?.(nextCol, nextRow)) return
    this.targetCol = nextCol
    this.targetRow = nextRow
    this.moving = true
  }

  update(deltaMs: number) {
    if (!this.moving) {
      this.refreshFrame()
      return
    }
    const targetX = this.targetCol * TILE_SIZE
    const targetY = this.targetRow * TILE_SIZE
    const dx = targetX - this.pixelX
    const dy = targetY - this.pixelY
    const dist = Math.hypot(dx, dy)
    const step = this.speedPxPerSec * (deltaMs / 1000)

    if (dist <= step || dist === 0) {
      this.pixelX = targetX
      this.pixelY = targetY
      this.col = this.targetCol
      this.row = this.targetRow
      this.moving = false
    } else {
      this.pixelX += (dx / dist) * step
      this.pixelY += (dy / dist) * step
      this.walkedPx += step
    }
    this.sprite.position.set(this.pixelX, this.pixelY)
    this.refreshFrame()
  }

  isAdjacentTo(col: number, row: number): boolean {
    return Math.abs(this.col - col) + Math.abs(this.row - row) === 1
  }
}
