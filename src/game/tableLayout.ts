import { LINE_HEIGHT, measureText, wrapText } from './pixel/font'
import { APRON, type Rect } from './pixel/tableArt'

/**
 * Where everything at the table goes, in art pixels.
 *
 * The table used to be laid out by percentages and hope: seats at fixed shares of
 * the felt, the board at 54%, your own seat at the bottom, each sized by the
 * window separately — so on a short window your name plate sat on the board, and
 * at showdown the board sat on your name plate. Here every block has a fixed
 * size in art pixels and is placed after the blocks it must clear, so the board
 * cannot be overlapped by construction; when a window is too short for that, the
 * whole scene drops to a smaller pixel scale instead of squeezing.
 *
 * The scale itself is chosen here too: the biggest whole number of device pixels
 * per art pixel at which the scene still fits, so that every pixel on screen is
 * the same size and the art reads as one GBA-era picture.
 */

export type { Rect }

/** An opponent's seat: plate with portrait, a line for tells, cards, a bet. */
export const SEAT = {
  w: 56,
  frame: 3,
  portrait: 48,
  panelH: 76,
  /** Three lines: room for a tell, or most of the line a regular introduces themselves with. */
  tellH: 30,
  cardsH: 20,
  betH: 15,
  gap: 2,
} as const
export const SEAT_H = SEAT.panelH + SEAT.gap + SEAT.tellH + SEAT.gap + SEAT.cardsH + SEAT.gap + SEAT.betH

/** Your seat: a plate with your stack, and the row your bet goes in above it. */
/**
 * Your cards and the board are drawn at CARD_ZOOM times the card art, so they
 * can be read across a room: on a phone the old 22 by 30 cards were a few
 * millimetres wide.
 */
export const CARD_ZOOM = 1.5
export const HERO = { plateH: 28, cardsW: 69, cardsH: 45, gap: 4 } as const
export const HERO_H = SEAT.betH + SEAT.gap + HERO.plateH

export const BOARD = { cardW: 33, cardH: 45, gap: 3 } as const
export const BOARD_W = 5 * BOARD.cardW + 4 * BOARD.gap
/** The line over the board: the pot, or whatever is being announced. */
export const BAND = { w: 132, h: 26 } as const

/** How far seats sit in from the edge of the table. */
const INSET = 4
/** The far row of seats. */
const TOP_Y = 3

const TEMPLATES: Record<number, { top: number[]; sides: boolean }> = {
  1: { top: [0.5], sides: false },
  2: { top: [0.2, 0.8], sides: false },
  3: { top: [0.5], sides: true },
  4: { top: [0.37, 0.63], sides: true },
  5: { top: [0.29, 0.5, 0.71], sides: true },
}

export interface FeltLayout {
  w: number
  h: number
  /** Opponent seats, in the order the table lists them. */
  seats: Rect[]
  band: Rect
  board: Rect
  /** Your plate and bet row: the element tests know as `seat-you`. */
  hero: Rect
  heroCards: Rect
}

export function overlaps(a: Rect, b: Rect, margin = 0): boolean {
  return a.x - margin < b.x + b.w && b.x - margin < a.x + a.w && a.y - margin < b.y + b.h && b.y - margin < a.y + a.h
}

function spanOverlaps(a0: number, a1: number, b0: number, b1: number, margin = 0): boolean {
  return a0 - margin < b1 && b0 - margin < a1
}

/** Centre x of each far-rail seat, spread apart if the table is too narrow for the template. */
function topSeatXs(w: number, fractions: number[]): number[] {
  const step = SEAT.w + 6
  let xs = fractions.map((f) => w * f)
  const crowded = xs.some((x, i) => i > 0 && x - xs[i - 1] < step)
  if (crowded) {
    const mid = (fractions.length - 1) / 2
    xs = fractions.map((_, i) => w / 2 + (i - mid) * step)
  }
  const lo = INSET + SEAT.w / 2
  const hi = w - INSET - SEAT.w / 2
  return xs.map((x) => Math.round(Math.min(hi, Math.max(lo, x)) - SEAT.w / 2))
}

interface Placement extends FeltLayout {
  /** The smallest height at which this arrangement fits without anything touching. */
  needed: number
}

function place(w: number, h: number, count: number): Placement {
  const n = Math.max(1, Math.min(5, count))
  const template = TEMPLATES[n]
  const tops = topSeatXs(w, template.top).map((x) => ({ x, y: TOP_Y, w: SEAT.w, h: SEAT_H }))
  const topBottom = TOP_Y + SEAT_H

  // The column down the middle: the band and then the board, under any far
  // seat it would otherwise run into.
  const colW = Math.max(BAND.w, BOARD_W)
  const colX = Math.round((w - colW) / 2)
  const blocked = tops.some((s) => spanOverlaps(s.x, s.x + s.w, colX, colX + colW, 2))
  const colTop = blocked ? topBottom + 4 : TOP_Y + 14
  const colH = BAND.h + 2 + BOARD.cardH

  // Your seat on the near rail: cards under the middle of the board, plate to
  // the left of them — unless that would put it on a side seat.
  const heroBottom = h - APRON - 2
  const heroY = heroBottom - HERO_H
  const sideL = { x: INSET, w: SEAT.w }
  const sideR = { x: w - INSET - SEAT.w, w: SEAT.w }
  let cardsX = Math.round(w / 2 - HERO.cardsW / 2)
  let plateX = cardsX - HERO.gap - SEAT.w
  if (template.sides && plateX < sideL.x + sideL.w + 4) {
    const blockW = SEAT.w + HERO.gap + HERO.cardsW
    plateX = Math.round((w - blockW) / 2)
    cardsX = plateX + SEAT.w + HERO.gap
  }
  const hero = { x: plateX, y: heroY, w: SEAT.w, h: HERO_H }
  const heroCards = { x: cardsX, y: heroBottom - HERO.cardsH, w: HERO.cardsW, h: HERO.cardsH }

  // Side seats: at the ends of the table halfway down; level with the far row's
  // bottom if they would touch a far seat; and below the column entirely on a
  // table too narrow for them to sit beside it.
  const sides: Rect[] = []
  let sideY = 0
  let besideColumn = true
  if (template.sides) {
    const touchesTop = tops.some(
      (s) => spanOverlaps(s.x, s.x + s.w, sideL.x, sideL.x + sideL.w, 2) || spanOverlaps(s.x, s.x + s.w, sideR.x, sideR.x + sideR.w, 2),
    )
    besideColumn = !spanOverlaps(sideL.x, sideL.x + sideL.w, colX, colX + colW, 2)
    const mid = Math.round((h - APRON) / 2 - SEAT_H / 2 - 4)
    if (!besideColumn) sideY = colTop + colH + 4
    else if (touchesTop) sideY = topBottom + 4
    else sideY = Math.max(TOP_Y + 16, Math.min(mid, h - APRON - 4 - SEAT_H))
    sides.push({ x: sideL.x, y: sideY, w: SEAT.w, h: SEAT_H }, { x: sideR.x, y: sideY, w: SEAT.w, h: SEAT_H })
  }
  const sideBottom = template.sides ? sideY + SEAT_H : 0
  // You sit below a side seat you would otherwise run into.
  const heroClashesSide =
    template.sides &&
    (spanOverlaps(hero.x, heroCards.x + heroCards.w, sideL.x, sideL.x + sideL.w, 2) ||
      spanOverlaps(hero.x, heroCards.x + heroCards.w, sideR.x, sideR.x + sideR.w, 2))

  // With room to spare the column sits halfway between the far row and you —
  // unless the side seats were placed under it, in which case it stays put.
  const colSpace = heroY - 4 - colTop
  const colY = besideColumn ? colTop + Math.max(0, Math.floor((colSpace - colH) / 2)) : colTop
  const band = { x: Math.round((w - BAND.w) / 2), y: colY, w: BAND.w, h: BAND.h }
  const board = { x: Math.round((w - BOARD_W) / 2), y: colY + BAND.h + 2, w: BOARD_W, h: BOARD.cardH }

  const seats: Rect[] = template.sides ? [sides[0], ...tops, sides[1]] : tops

  // How tall the table has to be for all of that to clear.
  const neededForColumn = colTop + colH + 4 + HERO_H + 2 + APRON
  const neededForSides = template.sides ? sideBottom + 4 + APRON : 0
  const neededForHero = heroClashesSide ? sideBottom + 4 + HERO_H + 2 + APRON : 0
  // And below a far seat it would otherwise reach up into.
  const heroUnderTop = tops.some((s) => spanOverlaps(hero.x, heroCards.x + heroCards.w, s.x, s.x + s.w, 2))
  const neededForTops = topBottom + 4 + (heroUnderTop ? HERO_H + 2 : 0) + APRON
  const needed = Math.max(neededForColumn, neededForSides, neededForHero, neededForTops)

  return { w, h, seats, band, board, hero, heroCards, needed }
}

/** The shortest table, in art pixels, that seats `count` opponents at width `w`. */
export function feltMinHeight(w: number, count: number): number {
  // Side seats may sit halfway down, which depends on the height: settle it.
  let h = 200
  for (let i = 0; i < 4; i++) {
    const needed = place(w, h, count).needed
    if (needed <= h) break
    h = needed
  }
  return h
}

/** Every block on a table of `w` by `h` art pixels. */
export function layoutFelt(w: number, h: number, count: number): FeltLayout {
  const p = place(w, Math.max(h, feltMinHeight(w, count)), count)
  return { w: p.w, h: p.h, seats: p.seats, band: p.band, board: p.board, hero: p.hero, heroCards: p.heroCards }
}

// ---------------------------------------------------------------------------
// The betting menu under the table.
// ---------------------------------------------------------------------------

export const DOCK = {
  /** Frame plus padding on each side of the dock. */
  inset: 6,
  gap: 3,
  /** A button's frame and padding, each side. */
  buttonPadX: 6,
  sliderMinW: 84,
} as const

/** Art pixels a button needs for its longest line of label. */
export function buttonWidth(lines: string[]): number {
  return Math.max(...lines.map((line) => measureText(line) + 1)) + 2 * DOCK.buttonPadX
}

/** A button's height: its lines, with a floor that keeps it a finger's width on a phone. */
export function buttonHeight(lines: number, scale: number, coarse: boolean): number {
  const drawn = lines * LINE_HEIGHT + 8
  const floorCss = coarse ? 40 : 30
  return Math.max(drawn, Math.ceil(floorCss / scale))
}

/** Greedy line packing, as `flex-wrap` does it: how many rows these widths take. */
export function packRows(widths: number[], innerW: number, gap: number = DOCK.gap): number {
  let rows = 0
  let used = Infinity
  for (const width of widths) {
    if (used + gap + width > innerW) {
      rows++
      used = width
    } else used += gap + width
  }
  return rows
}

export interface DockPlan {
  /** Sizing buttons per row of the grid. */
  sizingCols: number
  sizingCellW: number
  /** Whether the raise slider shares a row with Fold and Call. */
  raiseJoinsPrimary: boolean
}

export interface DockNeeds {
  kind: 'cash' | 'home'
  /** The widest amount any button might have to print, e.g. "120,000". */
  sampleAmount: string
  /** Lines of text shown over the buttons at most: odds, reads, coaching. */
  infoTexts: string[]
}

function sizingLabels(kind: DockNeeds['kind'], amount: string): string[][] {
  if (kind === 'home') {
    return [[`Raise to ${amount}`], [`½ pot (${amount})`], [`Pot (${amount})`], [`All in (${amount})`]]
  }
  return ['Min raise', '½ pot', '¾ pot', 'Pot', '1½× pot', '2× pot', 'All in'].map((l) => [l, `to ${amount}`])
}

export function planDock(innerW: number, needs: DockNeeds): DockPlan {
  const labels = sizingLabels(needs.kind, needs.sampleAmount)
  const cellW = Math.max(...labels.map(buttonWidth))
  // As many to a row as fit, then evened out, so seven buttons on two rows are
  // four and three rather than six and an orphan.
  const fit = Math.max(1, Math.min(labels.length, Math.floor((innerW + DOCK.gap) / (cellW + DOCK.gap))))
  const sizingCols = Math.ceil(labels.length / Math.ceil(labels.length / fit))
  const primaryW = buttonWidth(['Fold']) + DOCK.gap + buttonWidth([`Call ${needs.sampleAmount}`])
  const raiseW = DOCK.sliderMinW + DOCK.gap + buttonWidth([`Raise to ${needs.sampleAmount}`])
  return {
    sizingCols,
    sizingCellW: cellW,
    raiseJoinsPrimary: needs.kind === 'cash' && primaryW + DOCK.gap + raiseW <= innerW,
  }
}

/** The tallest the dock gets, in art pixels, across everything it shows. */
export function dockHeight(innerW: number, scale: number, coarse: boolean, needs: DockNeeds): number {
  const plan = planDock(innerW, needs)
  const one = buttonHeight(1, scale, coarse)
  const two = buttonHeight(needs.kind === 'cash' ? 2 : 1, scale, coarse)
  const info = needs.infoTexts.reduce((sum, text) => sum + wrapText(text, innerW).length * LINE_HEIGHT, 0)
  // Each line is a child of the dock, so each has its gap.
  const infoH = info > 0 ? info + DOCK.gap * needs.infoTexts.length : 0

  // Betting: Fold and Call, the slider, then the grid of sizes.
  const sizingRows = Math.ceil(sizingLabels(needs.kind, needs.sampleAmount).length / plan.sizingCols)
  const primaryRows = needs.kind === 'cash' ? (plan.raiseJoinsPrimary ? 1 : 2) : 1
  const betting = infoH + primaryRows * one + (primaryRows - 1) * DOCK.gap + DOCK.gap + sizingRows * two + (sizingRows - 1) * DOCK.gap

  // Between hands: who won, then the bar that deals the next hand.
  const bar = ['Next hand ▬▬▬▬▬', 'Deal now (space)', 'Hold', `Leave table ($${needs.sampleAmount})`].map(
    (l) => buttonWidth([l]),
  )
  const between = 2 * LINE_HEIGHT + DOCK.gap + packRows(bar, innerW) * (one + DOCK.gap)

  return 2 * DOCK.inset + Math.max(betting, between)
}

// ---------------------------------------------------------------------------
// The whole scene.
// ---------------------------------------------------------------------------

export interface Viewport {
  w: number
  h: number
  dpr: number
  /** A touch screen: buttons get a finger-sized floor. */
  coarse: boolean
}

export interface SceneNeeds extends DockNeeds {
  opponents: number
  /** The two lines of the sign in the corner. */
  title: string
  subtitle: string
}

export interface SceneLayout {
  /** CSS pixels per art pixel. */
  scale: number
  /** The scene in art pixels. */
  w: number
  h: number
  header: Rect
  headerLines: 1 | 2
  felt: Rect
  dock: Rect
  table: FeltLayout
  dockPlan: DockPlan
  coarse: boolean
  /**
   * How much bigger the betting menu's text and buttons are drawn than the
   * table's art: the menu is what you read and press, so it is not the place
   * to save space. The menu is laid out in its own, larger, art pixels.
   */
  dockZoom: number
  /** The betting menu stands to the right of the table instead of under it. */
  side: boolean
}

const PAD = 4
const FELT_MAX_W = 440
const MAX_SCALE = 4
/** The menu and sound buttons sit in the top right corner, in CSS pixels. */
const CORNER_BUTTONS_CSS = 112
const HEADER_FRAME = 4
/** The betting menu beside the table, on a window wider than it is tall. */
const SIDE_DOCK_WIDTHS = [150, 190, 230]
const SIDE_GAP = 4
/** The betting menu's text, relative to the table's pixels. */
const DOCK_ZOOM = 1.5
/** How far down the corner buttons reach, in CSS pixels. */
const CORNER_CLEAR_CSS = 60
const MIN_FELT_W = 250

function sceneAt(scale: number, view: Viewport, needs: SceneNeeds, sideW = 0, zoom = 1): { layout: SceneLayout; fits: boolean } {
  const side = sideW > 0
  const w = Math.floor(view.w / scale)
  const h = Math.floor(view.h / scale)
  const dockColW = sideW
  const feltW = Math.min(w - 2 * PAD - (side ? dockColW + SIDE_GAP : 0), FELT_MAX_W)
  const blockW = feltW + (side ? dockColW + SIDE_GAP : 0)
  const feltX = Math.floor((w - blockW) / 2)

  const signRoom = w - 2 * PAD - Math.ceil(CORNER_BUTTONS_CSS / scale)
  const oneLine = measureText(`${needs.title}   ${needs.subtitle}`) + 2 * HEADER_FRAME + 6 <= signRoom
  const headerLines = oneLine ? 1 : 2
  const headerH = headerLines * LINE_HEIGHT + 2 * HEADER_FRAME
  const headerW = Math.min(
    signRoom,
    (oneLine
      ? measureText(`${needs.title}   ${needs.subtitle}`)
      : Math.max(measureText(needs.title), measureText(needs.subtitle))) +
      2 * HEADER_FRAME +
      6,
  )

  const dockW = side ? dockColW : feltW
  // Whole device pixels per art pixel, as everywhere else.
  const dpr = Math.max(1, view.dpr || 1)
  const dockZoom = Math.round(scale * dpr * zoom) / Math.round(scale * dpr)
  const dockInnerW = dockW / dockZoom - 2 * DOCK.inset
  const dockH = dockHeight(dockInnerW, scale * dockZoom, view.coarse, needs) * dockZoom
  const feltMin = feltMinHeight(feltW, needs.opponents)
  const fixed = side ? PAD + headerH + 6 + PAD : PAD + headerH + 6 + 4 + dockH + PAD
  const available = h - fixed
  const fits = available >= feltMin && (!side || dockH <= available - Math.max(0, Math.ceil(CORNER_CLEAR_CSS / scale) - (PAD + headerH + 6))) && feltW >= MIN_FELT_W

  // Spare height goes first to the table, a little, and the rest to the room
  // above it: the wall behind the table is where each venue looks like itself.
  const comfortable = Math.max(feltMin, Math.min(feltMin + 8, Math.round(feltW * 0.72)))
  // Beside the table there is no menu to make room for: it takes the height.
  const feltH = side ? Math.max(feltMin, available) : Math.max(feltMin, Math.min(available, comfortable))
  const spare = Math.max(0, available - feltH)
  const feltY = PAD + headerH + 6 + spare
  // Beside the table the menu starts under the menu and sound buttons in the corner.
  const dockY = side ? Math.max(feltY, Math.ceil(CORNER_CLEAR_CSS / scale)) : feltY + feltH + 4
  const dockX = side ? feltX + feltW + SIDE_GAP : feltX

  const layout: SceneLayout = {
    scale,
    w,
    h: Math.max(h, side ? feltY + feltH + PAD : dockY + dockH + PAD),
    header: { x: PAD, y: PAD, w: headerW, h: headerH },
    headerLines,
    felt: { x: feltX, y: feltY, w: feltW, h: feltH },
    dock: { x: dockX, y: dockY, w: dockW, h: side ? feltY + feltH - dockY : dockH },
    table: layoutFelt(feltW, feltH, needs.opponents),
    dockPlan: planDock(dockInnerW, needs),
    dockZoom,
    coarse: view.coarse,
    side,
  }
  return { layout, fits }
}

/**
 * The largest pixel scale at which the whole scene fits the window, in whole
 * device pixels per art pixel, and the layout at that scale.
 */
export function layoutScene(view: Viewport, needs: SceneNeeds): SceneLayout {
  const dpr = Math.max(1, view.dpr || 1)
  const kMax = Math.max(Math.round(dpr), Math.floor(MAX_SCALE * dpr))
  const wide = view.w >= view.h * 1.3
  // Readable text first: a smaller table with a menu you can read beats a
  // bigger one with a menu you squint at. Only a window too small for either
  // gets the menu at the table's own size.
  for (const zoom of [DOCK_ZOOM, 1]) {
    for (let k = kMax; k >= Math.round(dpr); k--) {
      // Beside the table when the window is wide: height is what a wide window
      // is short of, and a menu under the table spends it.
      if (wide) {
        for (const dockW of SIDE_DOCK_WIDTHS) {
          const beside = sceneAt(k / dpr, view, needs, dockW, zoom)
          if (beside.fits) return beside.layout
        }
      }
      const attempt = sceneAt(k / dpr, view, needs, 0, zoom)
      if (attempt.fits) return attempt.layout
    }
  }
  // Nothing fits even at one CSS pixel per art pixel: lay it out at that scale
  // and let the page scroll rather than draw things on top of each other.
  return sceneAt(1, view, needs).layout
}
