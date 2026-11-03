import { Container, Graphics } from 'pixi.js'
import type { Edge } from '../world/types'

/**
 * What the overworld points at for the next step (`world/nextSteps.ts`): the
 * door to go through, the side of the street to walk off, or whoever you came
 * to see.
 */
export type SceneGuide =
  | { kind: 'door'; col: number; row: number }
  | { kind: 'edge'; edge: Edge }
  | { kind: 'actor'; id: string }

/** Where the guide's target is on screen, in CSS pixels. */
export interface GuideTarget {
  /** The point the arrow touches: above a door's sign, over a head, at the edge of the map. */
  x: number
  y: number
  /** Which way the arrow points when the target is on screen. Down at a door or a person. */
  points: 'down' | Edge
  /** A door's tile, outlined while it is on screen. */
  door?: { x: number; y: number; size: number }
}

/** Kept clear of the corner panels and the prompt along the bottom. */
export interface GuideInsets {
  top: number
  bottom: number
  left: number
  right: number
}

const GOLD = 0xf2c14e
const INK = 0x0c0c14
/** One art pixel of the arrow, in CSS pixels. */
const PX = 3

/** Radians for each way the arrow can point; it is drawn pointing east. */
const ANGLE: Record<'down' | Edge, number> = { east: 0, down: Math.PI / 2, south: Math.PI / 2, west: Math.PI, north: -Math.PI / 2 }

/**
 * A gold arrow in screen space. On screen it bobs over the target, pointing at
 * it; off screen it stands at the edge of the window, pointing the way. Drawn
 * on the art's own grid and turned only in eighths, so it stays pixel art.
 */
export class GuideMarker {
  readonly view = new Container()
  private readonly arrow = new Graphics()
  private readonly ring = new Graphics()

  constructor() {
    // Tip at the origin, pointing east: a head and a stem, outlined in ink.
    const shape = [0, 0, -5, -5, -5, -2, -9, -2, -9, 2, -5, 2, -5, 5].map((v) => v * PX)
    this.arrow.poly(shape).fill(GOLD).stroke({ color: INK, width: PX, alignment: 1 })
    this.view.addChild(this.ring, this.arrow)
    this.view.visible = false
  }

  /** Where the arrow's tip is drawn, "x,y" in CSS pixels, and which way it points in degrees; empty when hidden. */
  get at(): string {
    if (!this.view.visible) return ''
    return `${this.arrow.x},${this.arrow.y},${Math.round((this.arrow.rotation * 180) / Math.PI)}`
  }

  /**
   * Places the arrow for this frame. `elapsed` drives the bob and the door's
   * pulse; null hides it.
   */
  place(target: GuideTarget | null, screen: { w: number; h: number }, insets: GuideInsets, elapsed: number) {
    this.view.visible = target !== null
    if (!target) return
    // Whole steps of two pixels, a beat at a time, like everything else on the street.
    const bob = [0, 1, 2, 1][Math.floor(elapsed / 180) % 4] * PX
    const inside =
      target.x >= insets.left && target.x <= screen.w - insets.right && target.y >= insets.top && target.y <= screen.h - insets.bottom

    if (inside) {
      const angle = ANGLE[target.points]
      this.arrow.rotation = angle
      this.arrow.position.set(
        Math.round(target.x - Math.cos(angle) * bob),
        Math.round(target.y - Math.sin(angle) * bob),
      )
      this.ring.clear()
      if (target.door) {
        const { x, y, size } = target.door
        const pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(elapsed / 260))
        this.ring
          .rect(Math.round(x) - PX, Math.round(y) - PX, size + PX * 2, size + PX * 2)
          .fill({ color: GOLD, alpha: 0.22 * pulse })
          .stroke({ color: GOLD, width: PX, alpha: pulse })
      }
      return
    }

    // Off screen: from the middle of the window toward the target, stopped at
    // the edge of the clear area.
    this.ring.clear()
    const cx = (insets.left + screen.w - insets.right) / 2
    const cy = (insets.top + screen.h - insets.bottom) / 2
    const dx = target.x - cx
    const dy = target.y - cy
    const eighth = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4)
    const halfW = (screen.w - insets.left - insets.right) / 2
    const halfH = (screen.h - insets.top - insets.bottom) / 2
    const reach = Math.min(dx === 0 ? Infinity : halfW / Math.abs(dx), dy === 0 ? Infinity : halfH / Math.abs(dy))
    this.arrow.rotation = eighth
    this.arrow.position.set(
      Math.round(cx + dx * reach + Math.cos(eighth) * bob),
      Math.round(cy + dy * reach + Math.sin(eighth) * bob),
    )
  }
}
