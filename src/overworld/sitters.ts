import { Container, Sprite, Texture } from 'pixi.js'
import { PERSON_H, PERSON_W, figureKey, seatedPixels, type Figure } from './characterArt'
import { SCALE, UNIT, stampOccluder } from './stampArt'
import { TILE_SIZE } from './tiles'
import { STAMP_BY_ID, type SeatFacing, type StampSeat } from '../world/stamps'
import type { Sitter } from '../world/seating'

/**
 * People sitting at tables, drawn.
 *
 * A sitter is a person in the seated pose, put in a chair the table's stamp
 * lists, with whatever of them the furniture hides already cut away: the rail
 * hides the lap of somebody across the table or at an end, and a chair's back
 * hides the seat of somebody with their back to you. Cutting the sprite rather
 * than layering the table over it keeps them in with everybody else — sorted
 * by their tile — so you still walk behind the man at the top of the table and
 * in front of the woman at the bottom.
 *
 * The game and the editor both draw them from `sitterPixels`, so the two always
 * agree.
 */

/** The row of a seated sprite that lands on the middle of the cushion. */
const HIP_ROW: Record<SeatFacing, number> = {
  // Behind the table: lower than they would stand, so their head is below the
  // standing dealer's beside them and the rail cuts them at the chest.
  down: 13,
  up: 18,
  left: 18,
  right: 18,
}

/**
 * How far below the middle of its cushion a chair's back starts, for a chair
 * with its back to you. Everything of the sitter from there down is behind it.
 */
const CHAIR_BACK_BELOW_SEAT = 2

/** Where a sitter's sprite goes, in art units from the table's top-left. */
export function sitterOrigin(seat: StampSeat): { x: number; y: number } {
  return { x: seat.x - PERSON_W / 2, y: seat.y - HIP_ROW[seat.facing] }
}

/**
 * Somebody sitting in one of a table's chairs, as colours row by row — null is
 * transparent — with what the furniture hides already cut away.
 */
export function sitterPixels(figure: Figure, stampId: string, seatIndex: number, blink = false): (string | null)[] {
  const seat = STAMP_BY_ID[stampId]?.seats?.[seatIndex]
  if (!seat) throw new Error(`stamp "${stampId}" has no seat ${seatIndex}`)
  const pixels = seatedPixels(figure, seat.facing, blink)
  const origin = sitterOrigin(seat)
  // Somebody with their back to you is in front of the table; only their chair is in front of them.
  const occluder = seat.facing === 'up' ? null : stampOccluder(stampId)
  for (let y = 0; y < PERSON_H; y++) {
    const ay = origin.y + y
    for (let x = 0; x < PERSON_W; x++) {
      const ax = origin.x + x
      const hidden =
        (seat.facing === 'up' && ay >= seat.y + CHAIR_BACK_BELOW_SEAT) ||
        (occluder !== null && ax >= 0 && ay >= 0 && ax < occluder.w && ay < occluder.h && occluder.covers[ay * occluder.w + ax] === 1)
      if (hidden) pixels[y * PERSON_W + x] = null
    }
  }
  return pixels
}

/** A sitter's pixels on a canvas, at the game's scale. */
export function sitterCanvas(figure: Figure, stampId: string, seatIndex: number, blink = false): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = PERSON_W * SCALE
  canvas.height = PERSON_H * SCALE
  const ctx = canvas.getContext('2d')!
  const pixels = sitterPixels(figure, stampId, seatIndex, blink)
  for (let y = 0; y < PERSON_H; y++) {
    for (let x = 0; x < PERSON_W; x++) {
      const color = pixels[y * PERSON_W + x]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE)
    }
  }
  return canvas
}

const textureCache = new Map<string, Texture>()

/** Kept for the life of the page, like everybody's walk frames: coming back into a room redraws nobody. */
function sitterTexture(figure: Figure, stampId: string, seatIndex: number, blink: boolean): Texture {
  const cacheKey = `${figureKey(figure)}@${stampId}#${seatIndex}${blink ? '-' : ''}`
  const cached = textureCache.get(cacheKey)
  if (cached) return cached
  const t = Texture.from(sitterCanvas(figure, stampId, seatIndex, blink))
  t.source.scaleMode = 'nearest'
  textureCache.set(cacheKey, t)
  return t
}

const BLINK_MS = 140
const between = (low: number, high: number) => low + Math.random() * (high - low)

/** Who is sitting where, and how they look: what the scene is handed. */
export interface SeatedConfig {
  sitter: Sitter
  figure: Figure
}

/**
 * Somebody sitting at a table in the scene: scenery that blinks.
 *
 * Positioned like everybody else, at the bottom of their tile, so the scene
 * sorts them by it; the picture inside is placed on the chair.
 */
export class SeatedPerson {
  readonly sprite: Container
  readonly config: SeatedConfig
  private readonly body: Sprite
  private readonly open: Texture
  private readonly shut: Texture | null
  private blinkLeft = 0
  private untilBlink = between(800, 6400)

  constructor(config: SeatedConfig) {
    this.config = config
    const { sitter, figure } = config
    const seat = STAMP_BY_ID[sitter.table.stampId].seats![sitter.seat]
    const origin = sitterOrigin(seat)
    this.open = sitterTexture(figure, sitter.table.stampId, sitter.seat, false)
    // Nobody blinks with their back to you.
    this.shut = seat.facing === 'up' ? null : sitterTexture(figure, sitter.table.stampId, sitter.seat, true)
    this.sprite = new Container()
    this.sprite.position.set(sitter.col * TILE_SIZE, (sitter.row + 1) * TILE_SIZE)
    this.sprite.zIndex = this.sprite.y
    this.body = new Sprite(this.open)
    this.body.position.set(
      (sitter.table.col * UNIT + origin.x) * SCALE - this.sprite.x,
      (sitter.table.row * UNIT + origin.y) * SCALE - this.sprite.y,
    )
    this.sprite.addChild(this.body)
  }

  update(deltaMs: number) {
    if (!this.shut) return
    if (this.blinkLeft > 0) {
      this.blinkLeft -= deltaMs
      if (this.blinkLeft <= 0) this.untilBlink = between(2400, 7200)
    } else {
      this.untilBlink -= deltaMs
      if (this.untilBlink <= 0) this.blinkLeft = BLINK_MS
    }
    const next = this.blinkLeft > 0 ? this.shut : this.open
    if (this.body.texture !== next) this.body.texture = next
  }
}
