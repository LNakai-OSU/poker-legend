import { Sprite } from 'pixi.js'
import { TILE_SIZE, isWalkable, type TileGrid } from './tileRenderer'
import { personFrames, type Facing, type Figure, type PersonFrames } from './characterArt'
import { HERO_FIGURE } from './casting'

export type Direction = Facing

export const DELTAS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
}

export interface GridPlayerOptions {
  /** Who is walking. The hero unless said otherwise. */
  figure?: Figure
  speedPxPerSec?: number
}

const between = (low: number, high: number) => low + Math.random() * (high - low)

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
  /** Anchored at the feet, so a scene can draw whoever is further down the screen in front. */
  sprite: Sprite
  private speedPxPerSec: number
  private frames: PersonFrames
  /** Steps taken, so each one leads with the other foot. */
  private strides = 0
  private untilBlink = between(1500, 4000)
  private blinkLeft = 0

  constructor(startCol: number, startRow: number, options: GridPlayerOptions = {}) {
    this.col = startCol
    this.row = startRow
    this.targetCol = startCol
    this.targetRow = startRow
    this.pixelX = startCol * TILE_SIZE
    this.pixelY = startRow * TILE_SIZE
    this.speedPxPerSec = options.speedPxPerSec ?? 220
    this.frames = personFrames(options.figure ?? HERO_FIGURE)
    this.sprite = new Sprite(this.frames.walk.down[0])
    this.sprite.anchor.set(0, 1)
    this.place()
  }

  private place() {
    this.sprite.position.set(this.pixelX, this.pixelY + TILE_SIZE)
    this.sprite.zIndex = this.sprite.y
  }

  /**
   * The LeafGreen walk: the first half of every step is a stride, the second
   * half standing, and each step leads with the other foot — stand, left,
   * stand, right.
   */
  private refreshFrame() {
    let frame: 0 | 1 | 2 = 0
    if (this.moving) {
      const remaining = Math.hypot(this.targetCol * TILE_SIZE - this.pixelX, this.targetRow * TILE_SIZE - this.pixelY)
      if (remaining > TILE_SIZE / 2) frame = this.strides % 2 === 1 ? 1 : 2
    }
    this.sprite.texture =
      frame === 0 && this.blinkLeft > 0 ? this.frames.blink[this.facing] : this.frames.walk[this.facing][frame]
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
    this.strides++
  }

  update(deltaMs: number) {
    if (this.blinkLeft > 0) {
      this.blinkLeft -= deltaMs
      if (this.blinkLeft <= 0) this.untilBlink = between(2500, 6000)
    } else if (!this.moving) {
      this.untilBlink -= deltaMs
      if (this.untilBlink <= 0) this.blinkLeft = 140
    }

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
    }
    this.place()
    this.refreshFrame()
  }

  isAdjacentTo(col: number, row: number): boolean {
    return Math.abs(this.col - col) + Math.abs(this.row - row) === 1
  }
}
