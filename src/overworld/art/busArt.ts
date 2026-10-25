import { INK, mix, oval, rounded, shadow, text, textWidth, tint, type Px } from '../pixelArt'

/**
 * The 14: the town bus, side on, driving east.
 *
 * Drawn the way the parked cars in the street are (`streetFurniture.ts`): a dark
 * outline in a darker shade of the paint, a roof lit from above, the side
 * towards you in three shades, chrome that catches the light, glass with a
 * glint, a soft shadow on the road. On the same 16-unit grid as everything
 * else, so beside a lamp post or a palm on the verge it is the size a bus is.
 *
 * It comes in layers, so the people inside are the people in the street:
 *
 * - `drawBusInterior` — the dark of the cabin, seen through the glass;
 * - the passengers, drawn by the ride from the game's own person sprites,
 *   sat behind the windows (`BUS_WINDOWS`);
 * - `drawBusBody` — the bodywork, with the windows cut out of it;
 * - `drawBusGlass` — a pale wash and a glint over the windows;
 * - `drawBusWheel` — a wheel, in three frames that turn it.
 */

/** Art units, 16 to a tile: a little over seven tiles long, three tall. */
export const BUS_W = 116
export const BUS_H = 48

/** Where the side windows are; somebody can sit behind each. */
export interface BusWindow {
  x: number
  y: number
  w: number
  h: number
}

const WINDOW_TOP = 14
const WINDOW_H = 13
/** The sill: below it is bodywork, and the person behind is hidden. */
export const BUS_SILL = WINDOW_TOP + WINDOW_H

/** The passenger windows, back to front; the driver's is last. */
export const BUS_WINDOWS: BusWindow[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ x: 8 + i * 14, y: WINDOW_TOP, w: 12, h: WINDOW_H })),
]
/** The driver's window, ahead of the door. */
export const DRIVER_WINDOW: BusWindow = { x: BUS_W - 12, y: WINDOW_TOP, w: 7, h: WINDOW_H }
/** The front door, between the last window and the driver. */
const DOOR = { x: BUS_W - 25, y: WINDOW_TOP, w: 12 }

/** Where the wheels' centres are, and how big a wheel is. */
export const WHEEL_SIZE = 12
export const WHEEL_TOP = 33
export const WHEEL_XS = [17, BUS_W - 35]

export interface BusPaint {
  /** The upper side and the roof. */
  body: string
  /** The skirt below the stripe. */
  band: string
  stripe: string
}

/** The 14's livery: cream over teal, with a gold line between. */
export const THE_14: BusPaint = { body: '#e8dfc4', band: '#2c7d8e', stripe: '#f2c14e' }

const GLASS = '#2a3442'
const CHROME = '#c8ccd4'

/**
 * The cabin, seen through the windows: the back of the seat rows, the
 * ceiling strip, the grab rail. `lit` is the lamp inside after dark.
 */
export function drawBusInterior(px: Px, lit = false) {
  const wall = lit ? '#6a5a40' : '#1e2436'
  const ceiling = lit ? '#fff0c0' : '#38405a'
  for (const w of [...BUS_WINDOWS, DRIVER_WINDOW, { x: DOOR.x, y: DOOR.y, w: DOOR.w, h: 25 }]) {
    px(w.x, w.y, w.w, w.h, wall)
    px(w.x, w.y, w.w, 1, ceiling)
    // The grab rail, catching the light.
    px(w.x, w.y + 2, w.w, 1, lit ? '#c8a860' : '#4a5270')
  }
  // Seat backs in the door's glass: the front row, empty.
  px(DOOR.x + 2, DOOR.y + 12, 8, 4, lit ? '#8a3a3a' : '#3a2430')
  // The driver's wheel.
  px(DRIVER_WINDOW.x + 4, DRIVER_WINDOW.y + 9, 3, 2, '#141418')
}

/**
 * Seat tops in front of whoever sits in a window, drawn over the passengers
 * and under the bodywork: a person is sat in a seat, not floating behind glass.
 */
export function drawSeatTops(px: Px, lit = false) {
  const seat = lit ? '#a84848' : '#4a2c3a'
  const seatHi = lit ? '#d06060' : '#5e3848'
  for (const w of BUS_WINDOWS) {
    px(w.x + 1, BUS_SILL - 3, 4, 3, seat)
    px(w.x + 1, BUS_SILL - 3, 4, 1, seatHi)
  }
}

/**
 * The bodywork, with the windows cut out of it ('transparent' clears what is
 * under it). `lit` puts the lamps on.
 */
export function drawBusBody(px: Px, paint: BusPaint = THE_14, lit = false) {
  const W = BUS_W
  const body = paint.body
  const hi = tint(body, 0.35)
  const lo = tint(body, -0.18)
  const line = tint(body, -0.62)
  const band = paint.band
  const bandLo = tint(band, -0.3)
  const bandHi = tint(band, 0.25)

  // Its shadow on the road, under and a little behind.
  shadow(px, 4, 41, W - 4, 4, 0.34)
  shadow(px, 8, 45, W - 14, 2, 0.2)

  // The outline: a long box with its corners rounded off.
  rounded(px, 0, 0, W, 41, INK, 3)

  // The roof, seen from above: lit, with a darker lip where it turns down.
  rounded(px, 1, 1, W - 2, 9, hi, 2)
  px(2, 8, W - 4, 2, mix(hi, body, 0.6))
  // The air conditioning on the roof, and a hatch.
  rounded(px, 30, 2, 26, 5, line, 1)
  px(31, 2, 24, 4, tint(body, 0.15))
  for (let x = 33; x < 54; x += 3) px(x, 3, 1, 2, lo)
  px(70, 3, 12, 4, line)
  px(71, 3, 10, 3, mix(hi, body, 0.4))

  // The side towards you.
  px(1, 10, W - 2, 1, line)
  px(1, 11, W - 2, 19, body)
  px(1, 11, W - 2, 1, hi)
  // The gold line and the teal skirt.
  px(1, 29, W - 2, 1, tint(paint.stripe, -0.25))
  px(1, 30, W - 2, 2, paint.stripe)
  px(1, 32, W - 2, 8, band)
  px(1, 32, W - 2, 1, bandHi)
  px(1, 38, W - 2, 2, bandLo)
  px(1, 40, W - 2, 1, INK)

  // The windows, cut out of the side with a dark rubber frame round each.
  const cut = (w: BusWindow) => {
    px(w.x - 1, w.y - 1, w.w + 2, w.h + 2, '#16161e')
    px(w.x, w.y, w.w, w.h, 'transparent')
  }
  for (const w of BUS_WINDOWS) cut(w)
  cut(DRIVER_WINDOW)
  // The door: two leaves of glass, top to almost the bottom, in a frame.
  px(DOOR.x - 1, DOOR.y - 1, DOOR.w + 2, 27, '#16161e')
  px(DOOR.x, DOOR.y, DOOR.w, 25, 'transparent')
  px(DOOR.x + DOOR.w / 2 - 1, DOOR.y, 2, 25, '#16161e')
  px(DOOR.x, DOOR.y + 12, DOOR.w, 1, '#16161e')
  px(DOOR.x + 1, DOOR.y + 24, DOOR.w - 2, 1, CHROME)

  // The front: the windscreen wrapping round, a bumper, the headlamp.
  px(W - 4, 12, 3, 17, GLASS)
  px(W - 4, 12, 1, 17, '#7fb4d0')
  px(W - 3, 13, 1, 4, '#c8e8f6')
  px(W - 5, 34, 5, 3, CHROME)
  px(W - 5, 34, 5, 1, '#eef0f4')
  px(W - 3, 30, 2, 3, lit ? '#fffbe8' : '#fff4c8')
  // The back: a narrow rear window, the tail lamp, the engine grille.
  px(1, 13, 3, 12, GLASS)
  px(1, 13, 1, 12, '#5a8aa8')
  px(1, 31, 2, 4, lit ? '#ff5050' : '#c83030')
  for (let y = 33; y < 38; y += 2) px(3, y, 3, 1, bandLo)
  px(0, 35, 4, 3, CHROME)

  // The route board over the door: 14, in amber on black.
  const board = { x: DOOR.x - 1, y: 4, w: 14, h: 7 }
  px(board.x, board.y, board.w, board.h, '#141418')
  const label = '14'
  text(px, label, board.x + Math.round((board.w - textWidth(label)) / 2), board.y + 1, lit ? '#ffd060' : '#f0a020')

  // Wheel arches: the dark wells the wheels turn in.
  for (const x of WHEEL_XS) {
    rounded(px, x - 2, WHEEL_TOP - 3, WHEEL_SIZE + 4, 44 - WHEEL_TOP, INK, 3)
    px(x - 1, WHEEL_TOP - 1, WHEEL_SIZE + 2, 41 - WHEEL_TOP, '#0e0e14')
  }

  // A seam or two, and the mirror on its arm off the front corner.
  for (const x of [26, 52, 78]) px(x, 30, 1, 10, bandLo)
  px(W - 2, 15, 2, 1, line)
  px(W - 1, 14, 1, 5, '#141418')
}

/** A pale wash and a glint over every window, drawn over whoever sits behind. */
export function drawBusGlass(px: Px, lit = false) {
  const wash = lit ? 'rgba(255, 220, 150, 0.10)' : 'rgba(170, 210, 235, 0.22)'
  const glint = lit ? 'rgba(255, 245, 220, 0.25)' : 'rgba(255, 255, 255, 0.45)'
  for (const w of [...BUS_WINDOWS, DRIVER_WINDOW]) {
    px(w.x, w.y, w.w, w.h, wash)
    // A diagonal glint across the top corner.
    px(w.x + w.w - 4, w.y, 2, 1, glint)
    px(w.x + w.w - 5, w.y + 1, 2, 1, glint)
    px(w.x + w.w - 6, w.y + 2, 2, 1, glint)
  }
  px(DOOR.x, DOOR.y, DOOR.w, 25, wash)
  px(DOOR.x + 2, DOOR.y + 1, 1, 6, glint)
}

/** One wheel, `frame` 0–2 turning it a third of the way round each time. */
export function drawBusWheel(px: Px, frame: number) {
  const S = WHEEL_SIZE
  const c = S / 2
  oval(px, 0, 0, S, S, '#141418')
  oval(px, 2, 2, S - 4, S - 4, '#2a2a30')
  oval(px, 3, 3, S - 6, S - 6, '#8a909a')
  px(c - 1, c - 1, 2, 2, CHROME)
  // Three studs, turned a step with each frame: what makes a wheel read as turning.
  const turn = ((frame % 3) + 3) % 3
  for (let k = 0; k < 3; k++) {
    const angle = ((turn * 40 + k * 120) * Math.PI) / 180
    px(Math.round(c - 0.5 + 2.2 * Math.cos(angle)), Math.round(c - 0.5 + 2.2 * Math.sin(angle)), 1, 1, '#4a4e58')
  }
  // The tyre's tread catching the light along its top.
  px(3, 1, S - 6, 1, '#3a3a44')
}
