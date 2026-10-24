import { Rectangle, Texture } from 'pixi.js'
import type { AvatarLook } from '../game/avatars'

/**
 * People in the overworld, drawn pixel by pixel at runtime.
 *
 * Everybody used to be the same 16x16 block — a square head, a square shirt in
 * the POI's accent colour and two outline pixels for legs — so the pit boss, the
 * neighbour and Marcus were one sprite in three colours, and a man in the street
 * looked nothing like the man across the felt from you.
 *
 * Now a person is 16x24 art units: a tile wide, a tile and a half tall, standing
 * with their feet on their own tile and their head over the one behind, the way
 * a LeafGreen sprite does. They are assembled from layers — anatomy, hair, an
 * outfit, a hat — each written as a small pixel map below, so a new hair style
 * or uniform is a drawing rather than a branch in a function. Every material is
 * shaded in three tones lit from the top left and given a dark outline in its
 * own hue, computed rather than drawn, so the silhouette is always closed.
 *
 * The same 16-unit grid and x2 scale as every tile in the game.
 */

export const PERSON_W = 16
export const PERSON_H = 24
/** How far a person's art rises above the tile they stand on, in art units. */
export const PERSON_RISE = PERSON_H - 16

export type Facing = 'down' | 'up' | 'left' | 'right'
/** Standing, then the two strides of a walk: left foot leading, right foot leading. */
export type WalkFrame = 0 | 1 | 2

/**
 * Hair the overworld can draw.
 *
 * The first four are the ones a table portrait can draw too, so they are the
 * ones a character with a seat may use; the rest exist to keep a street full of
 * strangers from wearing three haircuts between them.
 */
export type PersonHairStyle = AvatarLook['hairStyle'] | 'bob' | 'curly' | 'spiky' | 'bun' | 'buzz'

/**
 * What somebody is wearing on the street — their table look and the rest of them.
 *
 * `AvatarLook` is a portrait: a face and a collar. Somebody walking about also
 * has legs, so this adds trousers, shoes and what kind of bottom they wear. All
 * optional: a portrait look on its own is a complete person.
 */
export interface PersonLook extends Omit<AvatarLook, 'hairStyle'> {
  hairStyle: PersonHairStyle
  trousers?: string
  shoes?: string
  /** What they wear below the waist. Trousers unless said otherwise. */
  lower?: 'trousers' | 'shorts' | 'skirt'
  /** Short sleeves show the forearm. Long unless said otherwise. */
  sleeves?: 'long' | 'short'
}

/**
 * The job somebody is dressed for.
 *
 * A dealer is a white shirt, a black waistcoat and a red bow tie before they are
 * anyone in particular — that silhouette is how a player knows who runs the game
 * without reading a caption. A role decides the clothes; the look still decides
 * the face, the hair and the skin, so two dealers are two people.
 */
export type NpcRole =
  /** Ordinary clothes in the look's colours. */
  | 'local'
  | 'dealer'
  | 'bartender'
  | 'waiter'
  /** Police: peaked cap, badge, navy. */
  | 'officer'
  /** Doormen, valets, a lift attendant: a frogged coat and a pillbox cap. */
  | 'bellhop'
  /** Dark suit, earpiece and shades. */
  | 'security'
  /** A jacket and tie: sponsors, brokers, salesmen. */
  | 'suit'
  /** Loud shirt, sun hat, shorts and a camera. */
  | 'tourist'
  /** Shopkeepers: an apron over their own shirt, and a name badge. */
  | 'clerk'
  | 'chef'
  /** Deckhands and harbour people: a striped top and a sailor cap. */
  | 'sailor'
  /** Somebody small. */
  | 'kid'
  /** The hero. Always the same clothes. */
  | 'player'
  /** The man the sponsors send. */
  | 'collector'

/** Every role, for the contact sheet and the tests. */
export const NPC_ROLES: NpcRole[] = [
  'local', 'dealer', 'bartender', 'waiter', 'officer', 'bellhop', 'security', 'suit',
  'tourist', 'clerk', 'chef', 'sailor', 'kid', 'player', 'collector',
]

export const PERSON_HAIR_STYLES: PersonHairStyle[] = [
  'short', 'long', 'tied', 'bald', 'bob', 'curly', 'spiky', 'bun', 'buzz',
]

// ---------------------------------------------------------------------------
// Colour
// ---------------------------------------------------------------------------

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

function rgbToHex([r, g, b]: Rgb): string {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function rgbToHsl([r, g, b]: Rgb): Rgb {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = 0
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToRgb([h, s, l]: Rgb): Rgb {
  h = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

/** Moves a hue part of the way towards another, the short way round. */
function hueToward(h: number, target: number, amount: number): number {
  const diff = ((target - h + 540) % 360) - 180
  return h + Math.sign(diff) * Math.min(Math.abs(diff), amount)
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

/** Light, base, shadow and outline: the four tones of one material. */
export type Ramp = [string, string, string, string]

/**
 * Three tones and an outline from one colour.
 *
 * Shadows lean towards blue and highlights towards yellow — the way light
 * actually falls, and the reason hand-shaded pixel art does not look like a
 * colour with black mixed into it. The outline is dark in the material's own
 * hue rather than black, so a red coat is edged in deep maroon.
 */
export function ramp(base: string, kind: 'cloth' | 'skin' | 'hair' = 'cloth'): Ramp {
  const [h, s, l] = rgbToHsl(hexToRgb(base))
  const grey = s < 0.08
  if (kind === 'skin') {
    // Skin shades warm, not blue: a cheek in shadow goes towards rose.
    return [
      rgbToHex(hslToRgb([hueToward(h, 40, 3), clamp01(s * 0.9), clamp01(l + 0.07)])),
      base,
      rgbToHex(hslToRgb([hueToward(h, 8, 5), clamp01(s * 0.98 + 0.02), clamp01(l - 0.085)])),
      rgbToHex(hslToRgb([hueToward(h, 350, 12), clamp01(s * 0.6 + 0.12), clamp01(Math.min(l * 0.34, 0.19))])),
    ]
  }
  const lift = l > 0.82 ? 0.06 : 0.11
  const drop = l < 0.2 ? 0.06 : l > 0.85 ? 0.14 : 0.13
  const shadowHue = grey ? 232 : hueToward(h, 250, 10)
  const shadowSat = grey ? Math.max(s, 0.1) : clamp01(s * 1.06 + 0.03)
  return [
    rgbToHex(hslToRgb([grey ? h : hueToward(h, 55, 6), clamp01(s * 0.94), clamp01(l + lift)])),
    base,
    rgbToHex(hslToRgb([shadowHue, shadowSat, clamp01(l - drop)])),
    rgbToHex(
      hslToRgb([
        grey ? 245 : hueToward(h, 255, 18),
        grey ? 0.16 : clamp01(s * 0.7 + 0.12),
        kind === 'hair' ? clamp01(Math.min(l * 0.3, 0.12)) : clamp01(Math.min(l * 0.36, 0.18)),
      ]),
    ),
  ]
}

// ---------------------------------------------------------------------------
// The pixel compositor
// ---------------------------------------------------------------------------

/**
 * Materials a drawing can be made of. A palette gives each one four tones; the
 * pixel maps below say which material and tone every pixel is.
 */
const MATERIALS = [
  'skin', 'hair', 'top', 'sleeve', 'under', 'legs', 'shoe', 'hat',
  'trim', 'apron', 'metal', 'pack', 'glass', 'eye', 'white', 'ink',
] as const
type Material = (typeof MATERIALS)[number]
type Tone = 0 | 1 | 2 | 3

/**
 * The pixel-map alphabet. Per material: highlight, base, shadow.
 *
 *   skin  Q S s     hair   G H h     top    R T t     sleeve B A a
 *   under V U u     legs   M L l     shoes  D F f     hat    K C c
 *   trim  Y X x     apron  J P p     metal  I N n     pack   r Z z
 *   glass q g       e eye  w white  # ink  o outline (hue of what it borders)
 *   _ erase  . nothing
 */
const LEGEND: Record<string, [Material, Tone]> = {
  Q: ['skin', 0], S: ['skin', 1], s: ['skin', 2],
  G: ['hair', 0], H: ['hair', 1], h: ['hair', 2],
  R: ['top', 0], T: ['top', 1], t: ['top', 2],
  B: ['sleeve', 0], A: ['sleeve', 1], a: ['sleeve', 2],
  V: ['under', 0], U: ['under', 1], u: ['under', 2],
  M: ['legs', 0], L: ['legs', 1], l: ['legs', 2],
  D: ['shoe', 0], F: ['shoe', 1], f: ['shoe', 2],
  K: ['hat', 0], C: ['hat', 1], c: ['hat', 2],
  Y: ['trim', 0], X: ['trim', 1], x: ['trim', 2],
  J: ['apron', 0], P: ['apron', 1], p: ['apron', 2],
  I: ['metal', 0], N: ['metal', 1], n: ['metal', 2],
  r: ['pack', 0], Z: ['pack', 1], z: ['pack', 2],
  q: ['glass', 0], g: ['glass', 1],
  e: ['eye', 1], w: ['white', 1], '#': ['ink', 1],
}

const OUTLINE_CELL = -2
const EMPTY = -1

/** A pixel map, placed: rows of 16 characters starting at row `y`. */
interface Layer {
  y: number
  rows: string[]
  /** Flip left to right, for a stride on the other foot. */
  mirror?: boolean
  /** Shift down (positive) or up, for the bob of a walk. */
  dy?: number
  /** Rows above this one are left out: the hair a hat covers. */
  fromY?: number
}

const at = (y: number, ...rows: string[]): Layer => ({ y, rows })

type Cells = Int16Array

const cellOf = (material: Material, tone: Tone) => MATERIALS.indexOf(material) * 4 + tone
const materialOf = (cell: number): Material => MATERIALS[Math.floor(cell / 4)]

function stamp(cells: Cells, layer: Layer) {
  const dy = layer.dy ?? 0
  layer.rows.forEach((row, r) => {
    // A row one character short shifts everything after it sideways — invisible
    // in the source, obvious on screen. Refuse it outright.
    if (row.length !== PERSON_W) throw new Error(`a person drawing has a row ${row.length} wide: "${row}"`)
    const y = layer.y + r + dy
    if (y < 0 || y >= PERSON_H || y < (layer.fromY ?? 0)) return
    for (let col = 0; col < row.length; col++) {
      const ch = row[col]
      if (ch === '.' || ch === ' ') continue
      const x = layer.mirror ? PERSON_W - 1 - col : col
      if (x < 0 || x >= PERSON_W) continue
      const i = y * PERSON_W + x
      if (ch === '_') cells[i] = EMPTY
      else if (ch === 'o') cells[i] = OUTLINE_CELL
      else {
        const entry = LEGEND[ch]
        if (!entry) throw new Error(`unknown pixel "${ch}" in a person drawing`)
        cells[i] = cellOf(entry[0], entry[1])
      }
    }
  })
}

/** Materials whose outline wins when a pixel borders several: hair and hats frame a head. */
const OUTLINE_PRIORITY: Material[] = [
  'hair', 'hat', 'ink', 'eye', 'shoe', 'legs', 'top', 'sleeve', 'apron', 'under', 'pack', 'trim', 'metal', 'glass', 'skin', 'white',
]

/**
 * Closes the silhouette: every empty pixel touching the figure becomes outline,
 * in the dark tone of whatever it borders. Four-neighbour only, so corners stay
 * open and shapes read as rounded rather than boxed.
 */
function outline(cells: Cells) {
  const next = cells.slice()
  for (let y = 0; y < PERSON_H; y++) {
    for (let x = 0; x < PERSON_W; x++) {
      const i = y * PERSON_W + x
      if (cells[i] !== EMPTY && cells[i] !== OUTLINE_CELL) continue
      let best: Material | null = null
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= PERSON_W || ny >= PERSON_H) continue
        const n = cells[ny * PERSON_W + nx]
        if (n < 0) continue
        const material = materialOf(n)
        if (best === null || OUTLINE_PRIORITY.indexOf(material) < OUTLINE_PRIORITY.indexOf(best)) best = material
      }
      if (best !== null) next[i] = cellOf(best, 3)
      else if (cells[i] === OUTLINE_CELL) next[i] = cellOf('ink', 1)
    }
  }
  cells.set(next)
}

export type Palette = Record<Material, Ramp>

function compose(layers: Layer[], post?: (cells: Cells) => void): Cells {
  const cells = new Int16Array(PERSON_W * PERSON_H).fill(EMPTY)
  for (const layer of layers) stamp(cells, layer)
  post?.(cells)
  outline(cells)
  return cells
}

/** Repaints every pixel of one material, in rows from `fromY` down, as another. */
function recolor(cells: Cells, from: Material, to: Material, fromY = 0, toY = PERSON_H) {
  for (let y = fromY; y < toY; y++) {
    for (let x = 0; x < PERSON_W; x++) {
      const i = y * PERSON_W + x
      if (cells[i] >= 0 && materialOf(cells[i]) === from) cells[i] = cellOf(to, (cells[i] % 4) as Tone)
    }
  }
}

/**
 * Removes whole rows and lets everything above drop down to close the gap — a
 * shorter body under the same head, which is how a child is drawn.
 */
function dropRows(cells: Cells, rows: number[]) {
  const source = cells.slice()
  let write = PERSON_H - 1
  for (let read = PERSON_H - 1; read >= 0; read--) {
    if (rows.includes(read)) continue
    for (let x = 0; x < PERSON_W; x++) cells[write * PERSON_W + x] = source[read * PERSON_W + x]
    write--
  }
  for (; write >= 0; write--) for (let x = 0; x < PERSON_W; x++) cells[write * PERSON_W + x] = EMPTY
}

// ---------------------------------------------------------------------------
// Anatomy
// ---------------------------------------------------------------------------
//
// Rows are absolute: the figure stands on row 22 with its outline on 23, which
// is the bottom edge of the tile it occupies (rows 8-23). The head is rows 3-11,
// the body 13-22, and row 12 is left empty so the outline draws the line of the
// jaw for free.

type Pose = 'stand' | 'stride'

/** The head, facing the camera. Eyes are drawn separately so they can blink. */
const HEAD_DOWN = at(4,
  '....SSSSSSSS....',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSs...',
  '..sSSSSSSSSSss..',
  '..sSSSSSSSSSss..',
  '...SSSSSSSSss...',
  '....sSSSSSss....',
)
const EYES_DOWN = at(8,
  '.....e....e.....',
  '.....e....e.....',
)
const BLINK_DOWN = at(8,
  '.....S....S.....',
  '.....e....e.....',
)

const HEAD_UP = at(4,
  '....SSSSSSSS....',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSs...',
  '..sSSSSSSSSSss..',
  '..sSSSSSSSSSss..',
  '...SSSSSSSSss...',
  '....sSSSSSss....',
)

/** In profile, facing left: the brow leads, the nose sets the direction, the ear sits back. */
const HEAD_LEFT = at(4,
  '....SSSSSSSS....',
  '...SSSSSSSSSS...',
  '...SSSSSSSSSS...',
  '..SSSSSSSSSSs...',
  '..SSSSSSSSSSs...',
  '.SSSSSSSSSSss...',
  '..sSSSSSSSSs....',
  '...ssSSSSSs.....',
)
const EYES_LEFT = at(8,
  '...e............',
  '...e............',
)
const BLINK_LEFT = at(8,
  '...S............',
  '...e............',
)

/**
 * Bodies: torso, arms and legs, for each facing and pose. Front and back share
 * a shape; the side view has one arm and two legs that scissor.
 */
const BODY_DOWN: Record<Pose, Layer> = {
  stand: at(13,
    '....RTTTTTTt....',
    '...BRTTTTTTta...',
    '...AoRTTTTtoa...',
    '...AoRTTTTtoa...',
    '...SottttttoS...',
    '....MLLLLLLl....',
    '....MLLooLLl....',
    '....MLl..MLl....',
    '....DFf..DFf....',
    '....FFf..FFf....',
  ),
  // Left foot up and forward, right arm swinging through.
  stride: at(13,
    '....RTTTTTTt....',
    '...BRTTTTTTta...',
    '...AoRTTTTtoa...',
    '...AoRTTTTtoS...',
    '...Sotttttto....',
    '....MLLLLLLl....',
    '....MLLooLLl....',
    '....DFf..MLl....',
    '....FFf..DFf....',
    '.........FFf....',
  ),
}

const BODY_UP: Record<Pose, Layer> = BODY_DOWN

/**
 * Profile, facing left — which shows the left side, so the arm you see is the
 * left arm and the near leg the left leg. A stride swings them opposite ways.
 */
const BODY_LEFT: Record<Pose | 'strideBack', Layer> = {
  stand: at(13,
    '.....RTTTTt.....',
    '.....RTaAAt.....',
    '.....RTaAAt.....',
    '.....RTaAat.....',
    '.....ttsSSt.....',
    '.....MLLLLl.....',
    '......MLLl......',
    '......MLLl......',
    '.....DFFFf......',
    '.....FFFFf......',
  ),
  // Near leg forward, near arm back.
  stride: at(13,
    '.....RTTTTt.....',
    '.....RTTaAAt....',
    '.....RTTaAAt....',
    '.....RTTtaSs....',
    '.....tttttt.....',
    '.....MLLLLl.....',
    '....MLlMLLl.....',
    '....MLl.lll.....',
    '...DFFf.Dff.....',
    '...FFf...ff.....',
  ),
  // Near leg back, near arm forward.
  strideBack: at(13,
    '.....RTTTTt.....',
    '....aAATTTt.....',
    '....aAATTTt.....',
    '....sSaTTtt.....',
    '.....tttttt.....',
    '.....MLLLLl.....',
    '.....lllMLLl....',
    '.....lll.MLl....',
    '....Dff..DFFf...',
    '....ff....FFf...',
  ),
}

// ---------------------------------------------------------------------------
// Hair
// ---------------------------------------------------------------------------

type ViewSet = { down: Layer[]; up: Layer[]; left: Layer[] }

const HAIR: Record<PersonHairStyle, ViewSet> = {
  short: {
    down: [at(3,
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHH..hH..hhh..',
      '..Hh........hh..',
    )],
    up: [at(3,
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHhhh..',
      '..hHHHHHHHHhhh..',
      '...hhHHHHHhhh...',
    )],
    left: [at(3,
      '.....HHHHHH.....',
      '...HHGGHHHHHH...',
      '..HGGHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..h..HHHHHHHhh..',
      '.......sHHHHhh..',
      '.......SsHHhhh..',
      '.........hhhh...',
    )],
  },
  long: {
    down: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHhHHHHHhh..',
      '..HHh......hhh..',
      '..HH........hh..',
      '..HH........hh..',
      '..HH........hh..',
      '..Hh........hh..',
      '..hh........hh..',
      '...h........h...',
    )],
    up: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '...HHHHHHHhhh...',
      '...hHHHHHHhh....',
      '....hhhhhhh.....',
    )],
    left: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HHGGHHHHHH...',
      '..HGGHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..h..HHHHHHHhh..',
      '.......sHHHHhh..',
      '.......SsHHHhh..',
      '........HHHHhh..',
      '........HHHHhh..',
      '........HHHhh...',
      '.........hhhh...',
    )],
  },
  tied: {
    down: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHhHHHHHHhh..',
      '..Hh........hh..',
      '..h..........h..',
    ), at(4,
      '.............Hh.',
      '.............Hh.',
      '..............h.',
    )],
    up: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHTTTHHHhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '...hHHGHHHhh....',
      '......HHh.......',
      '......HHh.......',
      '......Hhh.......',
      '.......h........',
    )],
    left: [at(2,
      '................',
      '.....HHHHHH.....',
      '...HHGGHHHHHH...',
      '..HGGHHHHHHHHhH.',
      '..HGHHHHHHHHTTh.',
      '..h..HHHHHHHhHH.',
      '.......sHHHhhHh.',
      '.......SsHHhhHh.',
      '.........hhh.Hh.',
      '.............h..',
    )],
  },
  bald: {
    down: [at(4,
      '....QQQ.........',
      '...QQ...........',
      '...H........h...',
      '...HH......hh...',
      '...H........h...',
    )],
    up: [at(4,
      '....QQQ.........',
      '...QQ...........',
      '................',
      '...H........h...',
      '...HHh....hhh...',
      '...HHHHHHHHhh...',
      '....hHHHHHhh....',
    )],
    left: [at(4,
      '....QQ..........',
      '...Q............',
      '..........Hh....',
      '.........HHhh...',
      '........sHHhh...',
      '........SHhh....',
      '.........hh.....',
    )],
  },
  bob: {
    down: [at(2,
      '................',
      '....HHHHHHHH....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHhHHhHHHhhh..',
      '..HH........hh..',
      '..HH........hh..',
      '..HH........hh..',
      '..hH........hh..',
      '..hh........hh..',
    )],
    up: [at(2,
      '................',
      '....HHHHHHHH....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..hhhhhhhhhhhh..',
    )],
    left: [at(2,
      '................',
      '....HHHHHHHH....',
      '...HHGGHHHHHH...',
      '..HGGHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..h..HHHHHHHhh..',
      '.......sHHHHhh..',
      '.......SsHHHhh..',
      '........HHHHhh..',
      '........hhhhhh..',
    )],
  },
  curly: {
    down: [at(1,
      '......HHHH......',
      '....HGHHHHHH....',
      '..HHGGHHHHHHhH..',
      '.HGGHHHHHHHHHhh.',
      '.HGHHHHHHHHHHhh.',
      '.HHHHHHHHHHHhhh.',
      '.HHHhHHhHHhHhhh.',
      '.hHh........hhh.',
      '..h..........h..',
    )],
    up: [at(1,
      '......HHHH......',
      '....HGHHHHHH....',
      '..HHGGHHHHHHhH..',
      '.HGGHHHHHHHHHhh.',
      '.HGHHHHHHHHHHhh.',
      '.HHHHHHHHHHHhhh.',
      '.HHHHHHHHHHHhhh.',
      '.HHHHHHHHHHhhhh.',
      '.hHHHHHHHHHhhh..',
      '..hhHHHHHHhhh...',
    )],
    left: [at(1,
      '......HHHH......',
      '....HGHHHHHH....',
      '..HHGGHHHHHHhH..',
      '.HGGHHHHHHHHHhh.',
      '.HGHHHHHHHHHHhh.',
      '.HH..HHHHHHHhhh.',
      '.h....HHHHHHhhh.',
      '.......sHHHHhhh.',
      '.......SsHHhhh..',
      '..........hh....',
    )],
  },
  spiky: {
    down: [at(0,
      '................',
      '...H..H..H..H...',
      '...HH.HH.HHhH...',
      '..HGHHGHHHHHhh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHhHHHhHHhh..',
      '..HHh..hh..hhh..',
      '..h..........h..',
    )],
    up: [at(0,
      '................',
      '...H..H..H..H...',
      '...HH.HH.HHhH...',
      '..HGHHGHHHHHhh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '...hHHHHHHhh....',
    )],
    left: [at(0,
      '................',
      '....H..H..H.....',
      '....HH.HH.HH.H..',
      '..HGHHGHHHHHHh..',
      '..HGHHHHHHHHhhh.',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..h..HHHHHHHhhH.',
      '.......sHHHHhh..',
      '.......SsHHhhh..',
      '.........hhhh...',
    )],
  },
  bun: {
    down: [at(0,
      '................',
      '......HHHH......',
      '.....HGHHhh.....',
      '.....HHHHhh.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHhhHHHHhh..',
      '..Hh........hh..',
      '..h..........h..',
    )],
    up: [at(0,
      '................',
      '......HHHH......',
      '.....HGHHhh.....',
      '.....HHHHhh.....',
      '...HGGHHHHHHH...',
      '..HGHHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..HHHHHHHHHHhh..',
      '..HHHHHHHHHhhh..',
      '..HHHHHHHHHhhh..',
      '...hHHHHHHhh....',
    )],
    left: [at(0,
      '................',
      '........HHHH....',
      '.......HGHHhh...',
      '.......HHHHhh...',
      '...HHGGHHHHHH...',
      '..HGGHHHHHHHHh..',
      '..HGHHHHHHHHhh..',
      '..h..HHHHHHHhh..',
      '.......sHHHHhh..',
      '.......SsHHhh...',
      '.........hhh....',
    )],
  },
  buzz: {
    down: [at(3,
      '....HHHHHHHH....',
      '...HGHHHHHHHh...',
      '...GHHHHHHHhh...',
      '...H........h...',
    )],
    up: [at(3,
      '....HHHHHHHH....',
      '...HGHHHHHHHh...',
      '...GHHHHHHHhh...',
      '...HHHHHHHHhh...',
      '...HHHHHHHHhh...',
      '...hHHHHHHHhh...',
      '....hhHHHHhh....',
    )],
    left: [at(3,
      '....HHHHHHHH....',
      '...HGHHHHHHHh...',
      '...GHHHHHHHhh...',
      '...h...HHHHhh...',
      '........HHHhh...',
      '.......sSHHh....',
      '.......Ss.hh....',
    )],
  },
}

// ---------------------------------------------------------------------------
// Hats
// ---------------------------------------------------------------------------
//
// A hat hides the hair above `hairFrom`, so a bun or a curly crown never pokes
// out through the top of a cap; whatever hangs below still shows.

type View = 'down' | 'up' | 'left'
type ViewLayers = Partial<Record<View, Layer[]>>

type HatKind = 'cap' | 'visor' | 'officer' | 'pillbox' | 'toque' | 'sunhat' | 'beanie' | 'fedora' | 'hero'

interface Hat {
  views: Record<View, Layer[]>
  hairFrom: number
}

const CAP_BACK = at(3,
  '.....KCCCCc.....',
  '...KCCCCCCCCc...',
  '..KCCCCCCCCCcc..',
  '..CCCCChhCCCcc..',
)

const HATS: Record<HatKind, Hat> = {
  cap: {
    hairFrom: 6,
    views: {
      down: [at(3,
        '.....KCCCCc.....',
        '...KKCCCCCCcc...',
        '..KCCCCCCCCCcc..',
        '..CCCCCCCCCCcc..',
        '...cccccccccc...',
      )],
      up: [CAP_BACK],
      left: [at(3,
        '.....KCCCCc.....',
        '...KKCCCCCCc....',
        '..KCCCCCCCCcc...',
        '..CCCCCCCCCcc...',
        '.cccC...........',
      )],
    },
  },
  visor: {
    hairFrom: 0,
    views: {
      down: [at(6,
        '..CCCCCCCCCCcc..',
        '...cccccccccc...',
      )],
      up: [at(6, '..CCCCCCCCCCcc..')],
      left: [at(6,
        '..CCCCCCCCCCc...',
        '.cccC...........',
      )],
    },
  },
  officer: {
    hairFrom: 6,
    views: {
      down: [at(2,
        '...KKCCCCCCCc...',
        '..KCCCCCCCCCcc..',
        '..cCCCCCCCCCcc..',
        '...xxxxINxxxx...',
        '...##########...',
      )],
      up: [at(2,
        '...KKCCCCCCCc...',
        '..KCCCCCCCCCcc..',
        '..cCCCCCCCCCcc..',
        '...xxxxxxxxxx...',
      )],
      left: [at(2,
        '...KKCCCCCCc....',
        '..KCCCCCCCCcc...',
        '..cCCCCCCCCcc...',
        '...INxxxxxxxx...',
        '.####...........',
      )],
    },
  },
  pillbox: {
    hairFrom: 0,
    views: {
      down: [at(1,
        '.......KCCc.....',
        '.......CCCc.....',
        '.......NNNn.....',
      )],
      up: [at(1,
        '.....KCCc.......',
        '.....CCCc.......',
        '.....NNNn.......',
      )],
      left: [at(1,
        '......KCCc......',
        '......CCCc......',
        '......NNNn......',
      )],
    },
  },
  toque: {
    hairFrom: 6,
    views: {
      down: [at(0,
        '....KKCCCCcc....',
        '...KCCCCCCCcc...',
        '...cCcCCCcCcc...',
        '....KCcCcCcc....',
        '....KCcCcCcc....',
        '...KCCCCCCCCc...',
      )],
      up: [at(0,
        '....KKCCCCcc....',
        '...KCCCCCCCcc...',
        '...cCcCCCcCcc...',
        '....KCcCcCcc....',
        '....KCcCcCcc....',
        '...KCCCCCCCCc...',
      )],
      left: [at(0,
        '....KKCCCCc.....',
        '...KCCCCCCCc....',
        '...cCcCCcCcc....',
        '....KCcCcCc.....',
        '....KCcCcCc.....',
        '...KCCCCCCCc....',
      )],
    },
  },
  sunhat: {
    hairFrom: 7,
    views: {
      down: [at(2,
        '.....KCCCCc.....',
        '....KCCCCCCc....',
        '....xxxxxxxx....',
        '.KKCCCCCCCCCCcc.',
        '..cccccccccccc..',
      )],
      up: [at(2,
        '.....KCCCCc.....',
        '....KCCCCCCc....',
        '....xxxxxxxx....',
        '.KKCCCCCCCCCCcc.',
        '..cccccccccccc..',
      )],
      left: [at(2,
        '.....KCCCc......',
        '....KCCCCCc.....',
        '....xxxxxxx.....',
        '.KCCCCCCCCCCCc..',
        '..ccccccccccc...',
      )],
    },
  },
  beanie: {
    hairFrom: 6,
    views: {
      down: [at(2,
        '.....KCCCCc.....',
        '...KKCCCCCCcc...',
        '..KCCCCCCCCCcc..',
        '..YXXXXXXXXXxx..',
        '..xxxxxxxxxxxx..',
      )],
      up: [at(2,
        '.....KCCCCc.....',
        '...KKCCCCCCcc...',
        '..KCCCCCCCCCcc..',
        '..YXXXXXXXXXxx..',
        '..xxxxxxxxxxxx..',
      )],
      left: [at(2,
        '.....KCCCCc.....',
        '...KKCCCCCCc....',
        '..KCCCCCCCCcc...',
        '..YXXXXXXXXxx...',
        '..xxxxxxxxxxx...',
      )],
    },
  },
  fedora: {
    hairFrom: 7,
    views: {
      down: [at(1,
        '.....KCCCCc.....',
        '....KCCccCCc....',
        '....KCCCCCCc....',
        '....xxxxxxxx....',
        '..KCCCCCCCCCcc..',
        '...cccccccccc...',
      )],
      up: [at(1,
        '.....KCCCCc.....',
        '....KCCccCCc....',
        '....KCCCCCCc....',
        '....xxxxxxxx....',
        '..KCCCCCCCCCcc..',
        '...cccccccccc...',
      )],
      left: [at(1,
        '.....KCCCc......',
        '....KCCcCCc.....',
        '....KCCCCCc.....',
        '....xxxxxxx.....',
        '.KCCCCCCCCCCc...',
        '..cccccccccc....',
      )],
    },
  },
  hero: {
    hairFrom: 7,
    views: {
      down: [at(3,
        '.....KCCCCc.....',
        '...KCwwwwwCcc...',
        '..KCCwwwwwCCcc..',
        '..CCCCCCCCCCcc..',
        '...cccccccccc...',
      )],
      up: [at(3,
        '.....KCCCCc.....',
        '...KCCCCCCCCc...',
        '..KCCCCCCCCCcc..',
        '..CCCCChhCCCcc..',
      )],
      left: [at(3,
        '.....KCCCCc.....',
        '...KwwwwCCCc....',
        '..KwwwwCCCCcc...',
        '..CCCCCCCCCcc...',
        '.ccCC...........',
      )],
    },
  },
}

// ---------------------------------------------------------------------------
// Things worn on the face
// ---------------------------------------------------------------------------

type FaceKind = 'glasses' | 'shades' | 'earring'

const FACE: Record<FaceKind, Partial<Record<View, Layer[]>>> = {
  glasses: {
    down: [at(8,
      '...#qgg##qgg#...',
      '....geg..geg....',
    )],
    left: [at(8,
      '..qg###.........',
      '..eg............',
    )],
  },
  shades: {
    down: [at(8,
      '...#w######w#...',
      '....###..###....',
    )],
    left: [at(8,
      '.#w####.........',
      '.###............',
    )],
  },
  earring: {
    down: [at(10, '..N.............')],
    left: [at(10, '........N.......')],
  },
}

// ---------------------------------------------------------------------------
// Outfits
// ---------------------------------------------------------------------------

/** What a role puts on somebody, given the look they walked in with. */
interface Outfit {
  /** Base colours for the materials this outfit decides. */
  colors: Partial<Record<Material, string>>
  /** Sleeves stop at the elbow. */
  shortSleeves?: boolean
  lower?: PersonLook['lower']
  hat?: HatKind
  /** A face accessory the job comes with, over whatever the look says. */
  face?: FaceKind
  /** Drawn before the body: a backpack seen from the side. */
  behind?: ViewLayers
  /** Over the body: collars, ties, badges, aprons. */
  over?: ViewLayers
  /** Over everything: a tray, a camera. */
  front?: ViewLayers
  /** Breton stripes on the top, checks on the trousers, white rubber soles. */
  patterns?: Array<'stripes' | 'checks' | 'soles'>
  /** A child: the same head on a shorter body. */
  small?: boolean
  /** Hair the role insists on (the hero's, under his cap). */
  hair?: PersonHairStyle | 'hero'
}

/** A jacket and tie, front and side. The tie is `trim`, the shirt `under`. */
const SUIT_OVER: ViewLayers = {
  down: [at(13,
    '......UxxU......',
    '......RXxt......',
    '.......Xx.......',
    '.......x........',
  )],
  left: [at(13,
    '.....Ux.........',
    '.....Xx.........',
    '.....x..........',
  )],
}

/** A tray held up at the shoulder, a glass on it; the arm that held it no longer hangs. */
const WAITER_TRAY = at(11,
  '.............q..',
  '.............g..',
  '............INNn',
  '............aS..',
  '............_...',
  '............_...',
  '............_...',
)

/** Sombre suit colours, so a broker's jacket is a jacket and his colour is his tie. */
const SUIT_CLOTHS = ['#2a3350', '#34343f', '#4a3a2e', '#2e3a36', '#3a2e44']

function pick<T>(list: T[], seed: string): T {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return list[(h >>> 0) % list.length]
}

const BLACK = '#25252e'
const WHITE_SHIRT = '#ececf2'

/**
 * Necklines for everyday clothes, so a street of T-shirts is a street of
 * different shirts: a crew neck, a V, a collar, or nothing at all.
 */
const NECKLINES: Layer[][] = [
  [at(13, '.......SS.......')],
  [at(13, '......sSSs......', '.......SS.......')],
  [at(13, '.....VU..Uu.....')],
  [],
]

const OUTFITS: Record<NpcRole, (look: PersonLook) => Outfit> = {
  local: (look) => ({
    colors: {},
    shortSleeves: look.sleeves === 'short',
    over: { down: pick(NECKLINES, look.shirt + look.skin + look.hairStyle) },
  }),

  dealer: () => ({
    colors: { top: BLACK, sleeve: WHITE_SHIRT, under: WHITE_SHIRT, trim: '#cc2a3e', legs: BLACK, shoe: '#1c1c24', metal: '#d4d4dc' },
    over: {
      down: [at(13,
        '......XUUX......',
        '......XxxX......',
        '.......Uu.......',
        '.......I........',
      )],
      left: [at(13,
        '.....XU.........',
        '.....Uu.........',
        '.....u..........',
      )],
    },
  }),

  bartender: () => ({
    colors: { top: '#7a2a3a', sleeve: '#7a2a3a', apron: '#24242c', legs: BLACK, shoe: '#1c1c24' },
    shortSleeves: true,
    over: {
      down: [at(13,
        '.......SS.......',
        '................',
        '................',
        '................',
        '....JPPPPPPp....',
        '....JPPPPPww....',
        '....JPPPPPwp....',
        '....pppppppp....',
      )],
      up: [at(17,
        '....JPPPPPPp....',
        '.....pp..pp.....',
      )],
      left: [at(13,
        '....S...........',
        '................',
        '................',
        '................',
        '....JPPP.ww.....',
        '....JPPPPw......',
        '...JPPPPp.......',
        '...pppp.........',
      )],
    },
  }),

  waiter: () => ({
    colors: { top: WHITE_SHIRT, sleeve: WHITE_SHIRT, trim: '#1c1c24', legs: BLACK, shoe: '#1c1c24', metal: '#c8ccd8' },
    over: {
      down: [at(13, '.......xx.......')],
      left: [at(13, '.....x..........')],
    },
    front: {
      down: [WAITER_TRAY],
      up: [{ ...WAITER_TRAY, mirror: true }],
      left: [at(11,
        '..q.............',
        '..g.............',
        '.INNn...........',
        '..SsaATTTTt.....',
        '.....RTTTTt.....',
        '.....RTTTTt.....',
        '.....tttttt.....',
      )],
    },
  }),

  officer: () => ({
    colors: {
      top: '#2e4278', sleeve: '#2e4278', under: '#9ab4e0', legs: '#232c50',
      shoe: '#16161c', hat: '#24336a', trim: '#16161c', metal: '#ecc44a',
    },
    hat: 'officer',
    over: {
      down: [at(13,
        '......UxxU......',
        '.........IN.....',
        '..........n.....',
        '................',
        '.....xxINxx.....',
      )],
      up: [at(17, '.....xxxxxx.....')],
      left: [at(13,
        '.....U..........',
        '......IN........',
        '................',
        '................',
        '.....xI.........',
      )],
    },
  }),

  bellhop: () => ({
    colors: { top: '#b82a32', sleeve: '#b82a32', legs: BLACK, shoe: '#16161c', hat: '#b82a32', metal: '#ecc44a' },
    hat: 'pillbox',
    over: {
      down: [at(13,
        '......NnnN......',
        '......N..N......',
        '................',
        '......N..N......',
      )],
      left: [at(13,
        '.....Nn.........',
        '......N.........',
        '................',
        '......N.........',
      )],
    },
  }),

  security: () => ({
    colors: { top: '#202029', sleeve: '#202029', under: WHITE_SHIRT, trim: '#121216', legs: '#202029', shoe: '#121216' },
    face: 'shades',
    over: SUIT_OVER,
    front: {
      down: [at(9, '.............w..', '.............#..')],
      left: [at(9, '........w.......', '........#.......')],
    },
  }),

  suit: (look) => {
    const cloth = pick(SUIT_CLOTHS, look.shirt + look.hair)
    return {
      colors: { top: cloth, sleeve: cloth, legs: cloth, under: WHITE_SHIRT, trim: look.shirt, shoe: '#1e1a1a' },
      over: SUIT_OVER,
    }
  },

  tourist: () => ({
    colors: { trim: '#f6e27a', legs: '#c8b088', shoe: '#8a5a3a', hat: '#e4c47c' },
    shortSleeves: true,
    lower: 'shorts',
    hat: 'sunhat',
    over: {
      down: [at(13,
        '.....w....Y.....',
        '....Y...w.......',
        '.....Y.#....w...',
        '.......#Y.......',
      )],
      up: [at(13,
        '......w...Y.....',
        '....Y....w......',
        '.......Y....w...',
        '.....w....Y.....',
      )],
      left: [at(13,
        '.......Y........',
        '......w.........',
        '..........Y.....',
        '.....Y..........',
      )],
    },
    front: {
      down: [at(14,
        '................',
        '......###.......',
        '......#w#.......',
      )],
      left: [at(14,
        '................',
        '...###..........',
        '...w##..........',
      )],
    },
  }),

  clerk: () => ({
    colors: { apron: '#2f7a56' },
    over: {
      down: [at(13,
        '......P..P......',
        '......PPwP......',
        '......PPPp......',
        '......PPPp......',
        '....JPPPPPPp....',
        '....JPPPPPPp....',
        '....pppppppp....',
      )],
      up: [at(17, '......pPPp......')],
      left: [at(13,
        '.....P..........',
        '....JP..........',
        '....JP..........',
        '....JP..........',
        '....JPP.........',
        '....JPPP........',
        '....ppp.........',
      )],
    },
  }),

  chef: () => ({
    colors: { top: '#f4f4f6', sleeve: '#f4f4f6', hat: '#f8f8fa', legs: '#34343c', shoe: '#1c1c24', trim: '#cc2a3e', metal: '#9a9aaa' },
    hat: 'toque',
    patterns: ['checks'],
    over: {
      down: [at(13,
        '......XXXx......',
        '......n..n......',
        '................',
        '......n..n......',
      )],
      left: [at(13,
        '.....Xx.........',
        '......n.........',
        '................',
        '......n.........',
      )],
    },
  }),

  sailor: () => ({
    colors: { top: '#eef0f4', sleeve: '#eef0f4', trim: '#2a3a72', legs: '#2c3450', hat: '#b03a3a', shoe: '#3a2a20' },
    hat: 'beanie',
    patterns: ['stripes'],
  }),

  kid: (look) => ({
    colors: {},
    shortSleeves: look.sleeves !== 'long',
    lower: look.lower ?? 'shorts',
    small: true,
    over: { down: [NECKLINES[0][0]] },
  }),

  player: () => ({
    colors: {
      top: '#e9a630', sleeve: '#e9a630', under: '#f4f4f6', legs: '#3a5c9e',
      shoe: '#d23c3c', hat: '#d23c3c', pack: '#2e6c8e',
    },
    hat: 'hero',
    hair: 'hero',
    patterns: ['soles'],
    behind: {
      left: [at(13,
        '..........rZz...',
        '..........ZZzz..',
        '..........ZZzz..',
        '..........Zzz...',
      )],
    },
    over: {
      down: [at(13,
        '.....zUUUUz.....',
        '.....z.UU.z.....',
        '.......UU.......',
        '.......Uu.......',
      )],
      up: [at(13,
        '.....rZZZZz.....',
        '....rZZZZZZz....',
        '....ZZnNZZZz....',
        '....ZZZZZZZz....',
        '.....zzzzzz.....',
      )],
      left: [at(13,
        '.......z........',
        '......z.........',
      )],
    },
  }),

  collector: () => ({
    colors: { top: '#1c1c24', sleeve: '#1c1c24', under: '#e4e4ea', trim: '#a8202e', legs: '#1c1c24', shoe: '#101014', hat: '#2a2a34' },
    hat: 'fedora',
    face: 'shades',
    over: SUIT_OVER,
  }),
}

/** The hero's hair: tufts escaping from under the cap. */
const HERO_HAIR: ViewSet = {
  down: [at(6,
    '..HH........hh..',
    '..HHh......hhh..',
    '..Hhh......hhh..',
    '..h..........h..',
  )],
  up: [at(6,
    '..HHHHHHHHHHhh..',
    '.HHHHHHHHHHHhhH.',
    '..HHGHHHHHHhhh..',
    '.hHHHHHHHHHhhhh.',
    '...hHhHHhHhh....',
  )],
  left: [at(6,
    '..........HHhh..',
    '........HHHHhhH.',
    '.......sHHHhhH..',
    '.......SsHHhh...',
    '.........hhh....',
  )],
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

/** One fully specified person, ready to draw. */
export interface Figure {
  look: PersonLook
  role: NpcRole
}

const ACCESSORY_HAT: Partial<Record<PersonLook['accessory'], HatKind>> = { cap: 'cap', visor: 'visor' }
/** The cap and visor colours a table portrait draws them in, so they match. */
const ACCESSORY_HAT_COLOR: Partial<Record<HatKind, string>> = { cap: '#2f3d5c', visor: '#1e5c3a' }

function paletteFor(look: PersonLook, outfit: Outfit, hat: HatKind | undefined): Palette {
  const c = outfit.colors
  const solid = (hex: string): Ramp => [hex, hex, hex, hex]
  return {
    skin: ramp(look.skin, 'skin'),
    hair: ramp(look.hair, 'hair'),
    top: ramp(c.top ?? look.shirt),
    sleeve: ramp(c.sleeve ?? look.shirt),
    under: ramp(c.under ?? WHITE_SHIRT),
    legs: ramp(c.legs ?? look.trousers ?? '#3a4a6a'),
    shoe: ramp(c.shoe ?? look.shoes ?? '#4a3426'),
    hat: ramp(c.hat ?? (hat && ACCESSORY_HAT_COLOR[hat]) ?? '#2f3d5c'),
    trim: ramp(c.trim ?? '#c03030'),
    apron: ramp(c.apron ?? '#e8e8e0'),
    metal: ramp(c.metal ?? '#e3b640'),
    pack: ramp(c.pack ?? '#8a5a2a'),
    glass: ['#ffffff', '#cfe6f8', '#8fb4d4', '#2a3446'],
    eye: solid('#1a1420'),
    white: ['#ffffff', '#f4f4f8', '#c4c8d8', '#2a2a36'],
    ink: solid('#1b1622'),
  }
}

function layersFor(figure: Figure, facing: Facing, frame: WalkFrame, blink: boolean, seated = false) {
  const view: View = facing === 'right' ? 'left' : facing
  const { look } = figure
  const outfit = OUTFITS[figure.role](look)
  const hatKind = outfit.hat ?? ACCESSORY_HAT[look.accessory]
  const hat = hatKind ? HATS[hatKind] : undefined
  const hairStyle = outfit.hair ?? look.hairStyle
  const hair = hairStyle === 'hero' ? HERO_HAIR : (HAIR[hairStyle] ?? HAIR.short)
  const accessory = outfit.face ?? look.accessory
  const face = accessory === 'glasses' || accessory === 'shades' || accessory === 'earring' ? FACE[accessory] : undefined
  const pose: Pose = frame === 0 ? 'stand' : 'stride'
  const lower = outfit.lower ?? look.lower ?? 'trousers'

  const layers: Layer[] = [...(outfit.behind?.[view] ?? [])]
  if (view === 'left') {
    layers.push(frame === 0 ? BODY_LEFT.stand : frame === 1 ? BODY_LEFT.stride : BODY_LEFT.strideBack)
  } else {
    layers.push({ ...(view === 'down' ? BODY_DOWN : BODY_UP)[pose], mirror: frame === 2 })
  }
  layers.push(...(outfit.over?.[view] ?? []))
  if (lower === 'skirt') layers.push(SKIRT[view])
  if (view === 'down') layers.push(HEAD_DOWN, blink ? BLINK_DOWN : EYES_DOWN)
  else if (view === 'up') layers.push(HEAD_UP)
  else layers.push(HEAD_LEFT, blink ? BLINK_LEFT : EYES_LEFT)
  layers.push(...(face?.[view] ?? []))
  layers.push(...hair[view].map((layer) => ({ ...layer, fromY: hat?.hairFrom })))
  if (hat) layers.push(...hat.views[view])
  layers.push(...(outfit.front?.[view] ?? []))
  // Last, so it folds whatever the outfit put below the waist too.
  if (seated) layers.push(SEATED_LOWER[view])

  const post = (cells: Cells) => {
    if (outfit.shortSleeves) recolor(cells, 'sleeve', 'skin', 15)
    if (lower !== 'trousers') recolor(cells, 'legs', 'skin', 20)
    for (const pattern of outfit.patterns ?? []) {
      if (pattern === 'soles') recolor(cells, 'shoe', 'white', 22)
      for (let y = 0; y < PERSON_H; y++) {
        for (let x = 0; x < PERSON_W; x++) {
          const i = y * PERSON_W + x
          if (cells[i] < 0) continue
          const material = materialOf(cells[i])
          if (pattern === 'stripes' && (material === 'top' || material === 'sleeve') && y % 2 === 0 && y < 18) {
            cells[i] = cellOf('trim', (cells[i] % 4) as Tone)
          }
          if (pattern === 'checks' && material === 'legs' && (x + y) % 2 === 0) {
            cells[i] = cellOf('white', 2)
          }
        }
      }
    }
    if (outfit.small) dropRows(cells, [15, 19])
  }
  return { layers, post, palette: paletteFor(look, outfit, hatKind) }
}

/** A skirt flares over the hips; the legs below it are bare. */
const SKIRT: Record<View, Layer> = {
  down: at(18,
    '....MLLLLLLl....',
    '...MLLLLLLLLl...',
  ),
  up: at(18,
    '....MLLLLLLl....',
    '...MLLLLLLLLl...',
  ),
  left: at(18,
    '.....MLLLLl.....',
    '....MLLLLLLl....',
  ),
}

/**
 * Sitting down: everything from the waist up as they stand, and below it a lap
 * instead of legs.
 *
 * From the front or the back the thighs come straight at you, so a seated
 * person is a short wide lap and then nothing — a table or a chair back is in
 * front of the rest. In profile the thighs run forward level with the seat and
 * the shins drop from the knee, which is what makes a side view read as sitting.
 * `_` clears what the standing legs and the outfit left there.
 */
const SEATED_LOWER: Record<View, Layer> = {
  down: at(18,
    '....MLLLLLLl....',
    '...MLLLLLLLLl...',
    '________________',
    '________________',
    '________________',
    '________________',
  ),
  up: at(18,
    '....MLLLLLLl....',
    '...MLLLLLLLLl...',
    '________________',
    '________________',
    '________________',
    '________________',
  ),
  left: at(18,
    '__MLLLLLLLl_____',
    '__MLLLLLLLl_____',
    '__MLl___________',
    '_DFFf___________',
    '_FFFf___________',
    '________________',
  ),
}

/**
 * Somebody sitting, facing `facing`, as colours row by row; null is
 * transparent. The hips are on row 18, the same as standing, so a seat puts
 * that row on its cushion.
 */
export function seatedPixels(figure: Figure, facing: Facing, blink = false): (string | null)[] {
  return pixelsOf(layersFor(figure, facing, 0, blink, true), facing)
}

/** The finished pixels of one frame, as colours, row by row. Null is transparent. */
export function personPixels(figure: Figure, facing: Facing, frame: WalkFrame, blink = false): (string | null)[] {
  return pixelsOf(layersFor(figure, facing, frame, blink), facing)
}

function pixelsOf({ layers, post, palette: colors }: ReturnType<typeof layersFor>, facing: Facing): (string | null)[] {
  const cells = compose(layers, post)
  const out: (string | null)[] = new Array(PERSON_W * PERSON_H).fill(null)
  for (let y = 0; y < PERSON_H; y++) {
    for (let x = 0; x < PERSON_W; x++) {
      const cell = cells[y * PERSON_W + x]
      if (cell < 0) continue
      const target = facing === 'right' ? y * PERSON_W + (PERSON_W - 1 - x) : y * PERSON_W + x
      out[target] = colors[materialOf(cell)][(cell % 4) as Tone]
    }
  }
  return out
}

/** Draws one frame onto a canvas at `scale` canvas pixels per art unit. */
export function drawPerson(
  ctx: CanvasRenderingContext2D,
  figure: Figure,
  facing: Facing,
  frame: WalkFrame,
  options: { x?: number; y?: number; scale?: number; blink?: boolean } = {},
) {
  const { x = 0, y = 0, scale = 1, blink = false } = options
  const pixels = personPixels(figure, facing, frame, blink)
  for (let py = 0; py < PERSON_H; py++) {
    for (let px = 0; px < PERSON_W; px++) {
      const color = pixels[py * PERSON_W + px]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x + px * scale, y + py * scale, scale, scale)
    }
  }
}

/** Canvas pixels per art unit in the game: 16-unit art on a 32px tile. */
const GAME_SCALE = 2

function frameTexture(figure: Figure, facing: Facing, frame: WalkFrame, blink: boolean): Texture {
  const canvas = document.createElement('canvas')
  canvas.width = PERSON_W * GAME_SCALE
  canvas.height = PERSON_H * GAME_SCALE
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  drawPerson(ctx, figure, facing, frame, { scale: GAME_SCALE, blink })
  const texture = Texture.from(canvas)
  texture.source.scaleMode = 'nearest'
  return texture
}

/**
 * How much of somebody shows over a counter: down to the bottom of the ribs, so
 * the counter's edge hides their hands and everything below.
 */
export const UPPER_BODY_ROWS = 17

/** Every frame somebody needs: three walk frames per facing, a blink, and the same from the waist up. */
export interface PersonFrames {
  walk: Record<Facing, [Texture, Texture, Texture]>
  blink: Record<Facing, Texture>
  /** Standing behind furniture: the top of the standing frame. */
  upper: Record<Facing, Texture>
  upperBlink: Record<Facing, Texture>
}

const frameCache = new Map<string, PersonFrames>()

export function figureKey(figure: Figure): string {
  const l = figure.look
  return [figure.role, l.skin, l.hair, l.hairStyle, l.shirt, l.accessory, l.trousers, l.shoes, l.lower, l.sleeves].join('|')
}

/**
 * A fingerprint of how somebody actually looks from the front.
 *
 * Two figures can differ in a field the drawing never uses — two dealers in
 * different shirts are the same dealer, since the waistcoat covers the shirt —
 * so "nobody in this street looks the same" is checked on pixels, not fields.
 */
export function visualKey(figure: Figure): string {
  return personPixels(figure, 'down', 0).join(',')
}

function cropped(texture: Texture): Texture {
  return new Texture({
    source: texture.source,
    frame: new Rectangle(0, 0, PERSON_W * GAME_SCALE, UPPER_BODY_ROWS * GAME_SCALE),
  })
}

export function personFrames(figure: Figure): PersonFrames {
  const key = figureKey(figure)
  const cached = frameCache.get(key)
  if (cached) return cached
  const facings: Facing[] = ['down', 'up', 'left', 'right']
  const walk = {} as PersonFrames['walk']
  const blink = {} as PersonFrames['blink']
  const upper = {} as PersonFrames['upper']
  const upperBlink = {} as PersonFrames['upperBlink']
  for (const facing of facings) {
    walk[facing] = [0, 1, 2].map((frame) => frameTexture(figure, facing, frame as WalkFrame, false)) as [
      Texture,
      Texture,
      Texture,
    ]
    blink[facing] = facing === 'up' ? walk[facing][0] : frameTexture(figure, facing, 0, true)
    upper[facing] = cropped(walk[facing][0])
    upperBlink[facing] = cropped(blink[facing])
  }
  const frames = { walk, blink, upper, upperBlink }
  frameCache.set(key, frames)
  return frames
}
