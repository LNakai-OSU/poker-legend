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
  w: 100,
  frame: 3,
  /** The face: a crop of the 48 by 48 portrait, head and shoulders, so its pixels stay whole. */
  portraitW: 34,
  portraitH: 34,
  panelH: 42,
  cardsH: 20,
  betH: 15,
  gap: 2,
} as const
/** The width left for a name and a stack beside the face. */
export const SEAT_TEXT_W = SEAT.w - 2 * SEAT.frame - SEAT.portraitW - 3
/** The plate, then one row under it: their cards on the left and what they have bet on the right. */
export const SEAT_H = SEAT.panelH + SEAT.gap + SEAT.cardsH

/** Your seat: a plate with your stack, and the row your bet goes in above it. */
/**
 * Your cards and the board are drawn at CARD_ZOOM times the card art, so they
 * can be read across a room: on a phone the old 22 by 30 cards were a few
 * millimetres wide.
 */
export const CARD_ZOOM = 2
/** Names, stacks and the sign are set this much bigger than the table's other text. */
export const TEXT_ZOOM = 1.5
export const HERO = { plateH: 43, cardsW: 92, cardsH: 60, gap: 4 } as const
export const HERO_H = SEAT.betH + SEAT.gap + HERO.plateH

/**
 * The line of talk at the top of the betting menu: who is speaking and what they
 * say, or the tell you are meant to catch, or what a showdown turned over. It
 * used to be a bubble over the seat and a line under it, a few pixels tall at
 * every seat; here it is one place, in the menu's larger type, and it costs the
 * table no height.
 */
export const CAPTION = { face: 18, lines: 2 } as const
export const CAPTION_H = Math.max(CAPTION.face, CAPTION.lines * LINE_HEIGHT)

export const BOARD = { cardW: 44, cardH: 60, gap: 3 } as const
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
  if (plateX < INSET || (template.sides && plateX < sideL.x + sideL.w + 4)) {
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

/**
 * The narrowest table that holds the far row of seats side by side: three seats
 * across need three seats' width, whatever the window.
 */
export function minFeltWidth(count: number): number {
  const across = TEMPLATES[Math.max(1, Math.min(5, count))].top.length
  return Math.max(MIN_FELT_W, across * (SEAT.w + 6) - 6 + 2 * INSET)
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
  const one = buttonHeight(1, scale, coarse)
  const info = needs.infoTexts.reduce((sum, text) => sum + wrapText(text, innerW).length * LINE_HEIGHT, 0)
  // Each line is a child of the dock, so each has its gap.
  const infoH = info > 0 ? info + DOCK.gap * needs.infoTexts.length : 0

  // Casino tables: one row (Fold, Check or Call, Raise), with a line of talk over
  // it. The raise sizes are a sheet opened over the table, so they take none of
  // the menu's height. Marcus's kitchen table keeps its full menu.
  let betting: number
  if (needs.kind === 'cash') {
    betting = infoH + one + CAPTION_H + DOCK.gap
  } else {
    const plan = planDock(innerW, needs)
    const two = buttonHeight(1, scale, coarse)
    const sizingRows = Math.ceil(sizingLabels(needs.kind, needs.sampleAmount).length / plan.sizingCols)
    betting = infoH + one + DOCK.gap + DOCK.gap + sizingRows * two + (sizingRows - 1) * DOCK.gap
  }

  // Between hands: who won, then the bar that deals the next hand.
  const bar = ['Next hand ▬▬▬▬▬', 'Deal now (space)', 'Hold', `Leave table ($${needs.sampleAmount})`].map(
    (l) => buttonWidth([l]),
  )
  const between = 2 * LINE_HEIGHT + DOCK.gap + packRows(bar, innerW) * (one + DOCK.gap) + (needs.kind === 'cash' ? CAPTION_H + DOCK.gap : 0)

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
/** The betting menu's text, relative to the table's pixels. */
const DOCK_ZOOM = 1.5
const MIN_FELT_W = 250
const SIDE_DOCK_WIDTHS = [150, 190, 230, 280, 330, 380, 430]
const SIDE_GAP = 4
/** How far down the corner buttons reach, in CSS pixels. */
const CORNER_CLEAR_CSS = 60

/**
 * The scene at one pixel scale and menu zoom, with the table as wide as the
 * window lets it be: the whole width up to FELT_MAX_W, and narrower only when
 * the window is too short for a table that wide (a table's height is set by its
 * width, and a short window would otherwise force a smaller pixel scale).
 */
function sceneAt(scale: number, view: Viewport, needs: SceneNeeds, zoom = 1): { layout: SceneLayout; fits: boolean } {
  const w = Math.floor(view.w / scale)
  const h = Math.floor(view.h / scale)
  const widest = Math.min(w - 2 * PAD, FELT_MAX_W)
  let last: { layout: SceneLayout; fits: boolean } | null = null
  for (let feltW = widest; feltW >= minFeltWidth(needs.opponents); feltW -= 10) {
    last = sceneWith(scale, view, needs, zoom, w, h, feltW)
    if (last.fits) return last
  }
  return last ?? sceneWith(scale, view, needs, zoom, w, h, widest)
}

function sceneWith(
  scale: number,
  view: Viewport,
  needs: SceneNeeds,
  zoom: number,
  w: number,
  h: number,
  feltW: number,
): { layout: SceneLayout; fits: boolean } {
  const feltX = Math.floor((w - feltW) / 2)

  const signRoom = w - 2 * PAD - Math.ceil(CORNER_BUTTONS_CSS / scale)
  const oneLine = measureText(`${needs.title}   ${needs.subtitle}`) * TEXT_ZOOM + 2 * HEADER_FRAME + 6 <= signRoom
  const headerLines = oneLine ? 1 : 2
  const headerH = headerLines * LINE_HEIGHT * TEXT_ZOOM + 2 * HEADER_FRAME
  const headerW = Math.min(
    signRoom,
    (oneLine
      ? measureText(`${needs.title}   ${needs.subtitle}`)
      : Math.max(measureText(needs.title), measureText(needs.subtitle))) *
      TEXT_ZOOM +
      2 * HEADER_FRAME +
      6,
  )

  // Whole device pixels per art pixel, as everywhere else.
  const dpr = Math.max(1, view.dpr || 1)
  const dockZoom = Math.round(scale * dpr * zoom) / Math.round(scale * dpr)
  const dockInnerW = feltW / dockZoom - 2 * DOCK.inset
  // The home game reserves as much menu as a casino does, so Marcus's table is
  // scaled the same way as everywhere else instead of trading the menu for a
  // bigger table.
  const dockH =
    Math.max(
      dockHeight(dockInnerW, scale * dockZoom, view.coarse, needs),
      dockHeight(dockInnerW, scale * dockZoom, view.coarse, { ...needs, kind: 'cash' }),
    ) * dockZoom
  const feltMin = feltMinHeight(feltW, needs.opponents)
  const fixed = PAD + headerH + 6 + 4 + dockH + PAD
  const available = h - fixed
  const fits = available >= feltMin && feltW >= minFeltWidth(needs.opponents)

  // Spare height goes first to the table, a little, and the rest to the room
  // above it: the wall behind the table is where each venue looks like itself.
  const comfortable = Math.max(feltMin, Math.min(feltMin + 8, Math.round(feltW * 0.72)))
  const feltH = Math.max(feltMin, Math.min(available, comfortable))
  const spare = Math.max(0, available - feltH)
  const feltY = PAD + headerH + 6 + spare
  const dockY = feltY + feltH + 4

  const layout: SceneLayout = {
    scale,
    w,
    h: Math.max(h, dockY + dockH + PAD),
    header: { x: PAD, y: PAD, w: headerW, h: headerH },
    headerLines,
    felt: { x: feltX, y: feltY, w: feltW, h: feltH },
    dock: { x: feltX, y: dockY, w: feltW, h: dockH },
    table: layoutFelt(feltW, feltH, needs.opponents),
    dockPlan: planDock(dockInnerW, needs),
    dockZoom,
    coarse: view.coarse,
    side: false,
  }
  return { layout, fits }
}

/**
 * The menu to the right of the table, for Marcus's kitchen table on a window
 * wider than it is tall. That menu is the full one (sizes laid out in a grid,
 * the coaching text), and a menu that tall needs the room beside the table.
 * The casino tables use a one-row menu under the table instead (`sceneAt`).
 */
function sceneBeside(scale: number, view: Viewport, needs: SceneNeeds, sideW = 0, zoom = 1): { layout: SceneLayout; fits: boolean } {
  const side = sideW > 0
  const w = Math.floor(view.w / scale)
  const h = Math.floor(view.h / scale)
  const dockColW = sideW
  const feltW = Math.min(w - 2 * PAD - (side ? dockColW + SIDE_GAP : 0), FELT_MAX_W)
  const blockW = feltW + (side ? dockColW + SIDE_GAP : 0)
  const feltX = Math.floor((w - blockW) / 2)

  const signRoom = w - 2 * PAD - Math.ceil(CORNER_BUTTONS_CSS / scale)
  const oneLine = measureText(`${needs.title}   ${needs.subtitle}`) * TEXT_ZOOM + 2 * HEADER_FRAME + 6 <= signRoom
  const headerLines = oneLine ? 1 : 2
  const headerH = headerLines * LINE_HEIGHT * TEXT_ZOOM + 2 * HEADER_FRAME
  const headerW = Math.min(
    signRoom,
    (oneLine
      ? measureText(`${needs.title}   ${needs.subtitle}`)
      : Math.max(measureText(needs.title), measureText(needs.subtitle))) *
      TEXT_ZOOM +
      2 * HEADER_FRAME +
      6,
  )

  const dockW = side ? dockColW : feltW
  // Whole device pixels per art pixel, as everywhere else.
  const dpr = Math.max(1, view.dpr || 1)
  const dockZoom = Math.round(scale * dpr * zoom) / Math.round(scale * dpr)
  const dockInnerW = dockW / dockZoom - 2 * DOCK.inset
  // The home game reserves as much menu as a casino does, so Marcus's table is
  // scaled the same way as everywhere else instead of trading the menu for a
  // bigger table.
  const dockH =
    Math.max(
      dockHeight(dockInnerW, scale * dockZoom, view.coarse, needs),
      dockHeight(dockInnerW, scale * dockZoom, view.coarse, { ...needs, kind: 'cash' }),
    ) * dockZoom
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
  // Readable text first, but not at any price: a menu drawn bigger is worth a
  // smaller table, up to a point (see `score`), and a window that only fits
  // the table at one pixel to the art pixel is better served by a plain menu.
  let best: { layout: SceneLayout; score: number } | null = null
  // A 3x phone may draw the whole scene at two thirds, still in whole device pixels,
  // rather than push the menu below the screen.
  const kMin = Math.max(1, Math.round(dpr * 0.75))
  for (let k = kMax; k >= kMin; k--) {
    for (const zoom of [2, DOCK_ZOOM, 1.25, 1]) {
      // Under the table: a casino menu is one row, so it costs little height and
      // the table gets the whole width.
      const wide = view.w >= view.h * 1.3
      const tries =
        wide && needs.kind === 'home'
          ? [...SIDE_DOCK_WIDTHS.map((w) => sceneBeside(k / dpr, view, needs, w, zoom)), sceneAt(k / dpr, view, needs, zoom)]
          : [sceneAt(k / dpr, view, needs, zoom)]
      const found = tries.find((t) => t.fits)
      if (!found) continue
      const score = k * found.layout.dockZoom + 0.25 * k
      if (!best || score > best.score) best = { layout: found.layout, score }
    }
  }
  if (best) return best.layout
  // Nothing fits even at one CSS pixel per art pixel: lay it out at that scale
  // and let the page scroll rather than draw things on top of each other.
  return sceneAt(1, view, needs).layout
}
