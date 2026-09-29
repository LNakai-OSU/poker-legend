import { Graphics } from 'pixi.js'
import { TILE_SIZE, isWalkable, type TileGrid } from './tileRenderer'

export type Direction = 'up' | 'down' | 'left' | 'right'

const DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

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
  sprite: Graphics
  private speedPxPerSec = 220

  constructor(startCol: number, startRow: number) {
    this.col = startCol
    this.row = startRow
    this.targetCol = startCol
    this.targetRow = startRow
    this.pixelX = startCol * TILE_SIZE
    this.pixelY = startRow * TILE_SIZE
    this.sprite = new Graphics().rect(4, 4, TILE_SIZE - 8, TILE_SIZE - 8).fill({ color: 0xf2c14e })
    this.sprite.position.set(this.pixelX, this.pixelY)
  }

  tryMove(direction: Direction, grid: TileGrid) {
    this.facing = direction
    if (this.moving) return
    const [dc, dr] = DELTAS[direction]
    const nextCol = this.col + dc
    const nextRow = this.row + dr
    if (!isWalkable(grid, nextCol, nextRow)) return
    this.targetCol = nextCol
    this.targetRow = nextRow
    this.moving = true
  }

  update(deltaMs: number) {
    if (!this.moving) return
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
    }
    this.sprite.position.set(this.pixelX, this.pixelY)
  }

  isAdjacentTo(col: number, row: number): boolean {
    return Math.abs(this.col - col) + Math.abs(this.row - row) === 1
  }
}
