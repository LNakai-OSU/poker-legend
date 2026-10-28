import { Container, Sprite, Text, type Texture } from 'pixi.js'
import { TILE_SIZE } from './tileRenderer'
import { propTexture, type PropKind } from './sprites'
import { personFrames, type Facing, type Figure, type PersonFrames } from './characterArt'
import { isObjectKind, objectTexture, type ObjectKind } from './objectArt'
import { lookFromId } from './casting'

/**
 * How something standing on the map is drawn: a person, a prop, a small object,
 * or `none` for an interaction point on furniture the map already draws.
 */
export type NpcArt = 'person' | 'none' | PropKind | ObjectKind

export interface NpcConfig {
  id: string
  name: string
  col: number
  row: number
  /** The colour of their name when it shows. */
  color?: number
  art?: NpcArt
  /**
   * Scenery sets this false, so walking up to a window does not caption it
   * "Window" as if it were somebody standing against the wall.
   */
  labelled?: boolean
  /** What you do with it, for the prompt: `talk to`, `read`, `use`, `look at`. Left out, you talk to it. */
  verb?: string
  /** How a person looks. A stranger made up from their id if left out. */
  figure?: Figure
  /**
   * Standing behind the furniture on their own tile — a clerk at a counter, a
   * dealer at a table. Drawn from the ribs up, so the furniture is in front.
   */
  behind?: boolean
  /**
   * Behind a counter whose back stands against the wall — a till, a bar, a
   * cashier's cage. They stand at its far edge, so all of them down to the belt
   * shows over the counter top instead of a head over its front.
   */
  counter?: boolean
  /** Which way they face when nobody is talking to them. */
  facing?: Facing
  /** Glances about now and then. People at a post — dealers, clerks — keep still. */
  restless?: boolean
}

/** Canvas pixels per art unit. */
const UNIT = TILE_SIZE / 16
/** How far into the furniture tile the counter's edge cuts somebody standing behind it, in art units. */
const COUNTER_EDGE = 4
const BLINK_MS = 140

const between = (low: number, high: number) => low + Math.random() * (high - low)

export class Npc {
  readonly config: NpcConfig
  /** Positioned at the feet — the bottom-left of their tile — so the scene can sort by it. */
  readonly sprite: Container
  /** Hidden until the player is next to them. The scene puts it in a layer over everybody. */
  readonly label: Text
  facing: Facing
  private readonly body: Sprite | null
  private readonly frames: PersonFrames | null
  private home: Facing
  /** Tiles still to walk, when a beat is moving them. */
  private path: Array<{ col: number; row: number }> = []
  private speedPxPerSec = 0
  private stepFrom: { x: number; y: number } | null = null
  private strides = 0
  private onArrive: (() => void) | null = null
  /** Called as each step starts, with the tile being left — so somebody can walk behind them. */
  onStep: ((from: { col: number; row: number }) => void) | null = null
  private blinkLeft = 0
  private untilBlink = between(800, 5200)
  private untilGlance = between(1500, 5000)
  /** While positive, they are looking at whoever spoke to them. */
  private attention = 0

  constructor(config: NpcConfig) {
    this.config = config
    this.home = config.facing ?? 'down'
    this.facing = this.home
    const art = config.art ?? 'person'

    this.sprite = new Container()
    this.sprite.position.set(config.col * TILE_SIZE, (config.row + 1) * TILE_SIZE)
    this.sprite.zIndex = this.sprite.y

    if (art === 'person') {
      this.frames = personFrames(
        config.figure ?? { role: 'local', look: lookFromId(config.id, config.name) },
      )
      this.body = new Sprite(this.currentTexture())
      this.body.anchor.set(0, 1)
      if (config.behind) this.body.y = -(TILE_SIZE - (config.counter ? 0 : COUNTER_EDGE) * UNIT)
    } else if (art === 'none') {
      this.frames = null
      this.body = null
    } else {
      this.frames = null
      this.body = new Sprite(isObjectKind(art) ? objectTexture(art) : propTexture(art))
      this.body.anchor.set(0, 1)
    }
    if (this.body) this.sprite.addChild(this.body)

    this.label = new Text({
      text: config.name,
      style: {
        fill: config.color !== undefined ? `#${config.color.toString(16).padStart(6, '0')}` : '#ffffff',
        fontSize: 10,
        fontFamily: 'monospace',
        fontWeight: 'bold',
        stroke: { color: '#0c0c14', width: 3, join: 'round' },
      },
    })
    this.label.anchor.set(0.5, 1)
    this.label.visible = false
  }

  get isPerson(): boolean {
    return this.frames !== null
  }

  /** Whether a beat has them part-way along a walk. */
  get walking(): boolean {
    return this.stepFrom !== null || this.path.length > 0
  }

  /**
   * Walks them along a path of adjacent tiles, a step at a time, at a pace.
   * Their tile is the one they are stepping onto from the moment the step
   * starts, so nobody else walks into it and somebody behind can take the one
   * they left.
   */
  walk(path: Array<{ col: number; row: number }>, speedPxPerSec: number, onArrive: () => void) {
    this.path = [...path]
    this.speedPxPerSec = speedPxPerSec
    this.onArrive = onArrive
    this.attention = 0
    if (!this.stepFrom) this.nextStep()
  }

  /** Stands them on a tile at once: a walk that could not be made, or one they were already past. */
  place(col: number, row: number) {
    this.path = []
    this.stepFrom = null
    this.config.col = col
    this.config.row = row
    this.sprite.position.set(col * TILE_SIZE, (row + 1) * TILE_SIZE)
    this.sprite.zIndex = this.sprite.y
    this.refresh()
  }

  /** Turns to face a way, and keeps facing it once left alone. */
  turn(facing: Facing) {
    this.facing = facing
    this.home = facing
    this.refresh()
  }

  private nextStep() {
    const next = this.path.shift()
    if (!next) {
      this.stepFrom = null
      this.home = this.facing
      const done = this.onArrive
      this.onArrive = null
      this.refresh()
      done?.()
      return
    }
    const from = { col: this.config.col, row: this.config.row }
    const dc = next.col - from.col
    const dr = next.row - from.row
    this.facing = dc > 0 ? 'right' : dc < 0 ? 'left' : dr > 0 ? 'down' : 'up'
    this.stepFrom = { x: this.sprite.x, y: this.sprite.y }
    this.config.col = next.col
    this.config.row = next.row
    this.strides++
    this.onStep?.(from)
  }

  /** One frame of a walk: slide towards the tile, striding for the first half of the step. */
  private stride(deltaMs: number) {
    if (!this.stepFrom) return
    const targetX = this.config.col * TILE_SIZE
    const targetY = (this.config.row + 1) * TILE_SIZE
    const dx = targetX - this.sprite.x
    const dy = targetY - this.sprite.y
    const dist = Math.hypot(dx, dy)
    const step = this.speedPxPerSec * (deltaMs / 1000)
    if (dist <= step || dist === 0) {
      this.sprite.position.set(targetX, targetY)
      this.sprite.zIndex = this.sprite.y
      this.stepFrom = null
      this.nextStep()
      return
    }
    this.sprite.position.set(this.sprite.x + (dx / dist) * step, this.sprite.y + (dy / dist) * step)
    this.sprite.zIndex = this.sprite.y
    if (this.body && this.frames && !this.config.behind) {
      const striding = dist > TILE_SIZE / 2
      this.body.texture = this.frames.walk[this.facing][striding ? (this.strides % 2 === 1 ? 1 : 2) : 0]
    }
  }

  /** Where a caption over this NPC's head goes, in world pixels. */
  captionAnchor(): { x: number; y: number } {
    const x = this.sprite.x + TILE_SIZE / 2
    if (!this.body) return { x, y: this.sprite.y - TILE_SIZE }
    // The art starts a couple of units down its canvas.
    const top = this.sprite.y + this.body.y - this.body.height
    return { x, y: top + (this.isPerson ? 2 * UNIT : 0) }
  }

  /** Turns to face the tile at (col, row), as somebody does when you speak to them. */
  attend(col: number, row: number, forMs = Infinity) {
    const dc = col - this.config.col
    const dr = row - this.config.row
    if (dc === 0 && dr === 0) return
    this.facing = Math.abs(dc) >= Math.abs(dr) ? (dc > 0 ? 'right' : 'left') : dr > 0 ? 'down' : 'up'
    this.attention = forMs
    this.refresh()
  }

  /** The conversation is over; they hold your eye a moment longer, then carry on. */
  release() {
    if (this.attention > 0) this.attention = 1800
  }

  update(deltaMs: number) {
    if (this.walking) {
      this.stride(deltaMs)
      return
    }
    if (!this.frames) return
    if (this.blinkLeft > 0) {
      this.blinkLeft -= deltaMs
      if (this.blinkLeft <= 0) this.untilBlink = between(2400, 6400)
    } else {
      this.untilBlink -= deltaMs
      if (this.untilBlink <= 0) this.blinkLeft = BLINK_MS
    }

    if (this.attention > 0) {
      this.attention -= deltaMs
      if (this.attention <= 0) {
        this.facing = this.home
        this.untilGlance = between(1500, 4000)
      }
    } else if (this.config.restless) {
      this.untilGlance -= deltaMs
      if (this.untilGlance <= 0) {
        this.facing = this.glance()
        this.untilGlance = between(1800, 5200)
      }
    }
    this.refresh()
  }

  /** Somewhere else to look: back to where they were looking, mostly, or off to one side. */
  private glance(): Facing {
    if (this.facing !== this.home && Math.random() < 0.6) return this.home
    const options: Facing[] = ['down', 'left', 'right', 'down', 'left', 'right', 'up']
    const others = options.filter((f) => f !== this.facing)
    return others[Math.floor(Math.random() * others.length)]
  }

  private currentTexture(): Texture {
    const frames = this.frames!
    const blinking = this.blinkLeft > 0
    if (this.config.behind) return (blinking ? frames.upperBlink : frames.upper)[this.facing]
    return blinking ? frames.blink[this.facing] : frames.walk[this.facing][0]
  }

  private refresh() {
    if (this.body && this.frames) this.body.texture = this.currentTexture()
  }
}
