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
  /** How a person looks. A stranger made up from their id if left out. */
  figure?: Figure
  /**
   * Standing behind the furniture on their own tile — a clerk at a counter, a
   * dealer at a table. Drawn from the ribs up, so the furniture is in front.
   */
  behind?: boolean
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
  private readonly home: Facing
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
      if (config.behind) this.body.y = -(TILE_SIZE - COUNTER_EDGE * UNIT)
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
