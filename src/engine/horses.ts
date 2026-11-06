import type { Rng } from './rng'

/**
 * The racebook: six horses, a race, and a tote board.
 *
 * Every horse has a hidden strength. The finishing order is drawn from those
 * strengths (Plackett-Luce: the stronger the horse, the likelier it is first
 * among those still running), so the chance of every result is known exactly —
 * `chances` enumerates all 720 orders. The board then pays each bet at the fair
 * price less the track's takeout, rounded *down* to the nearest nickel, so the
 * house edge is never less than `TAKEOUT` on any bet (see casinoGames.test.ts).
 *
 * Nothing here is nudged for drama: a 30-1 long shot wins when it wins.
 */

export const FIELD_SIZE = 6
/** The track's cut of every dollar bet. */
export const TAKEOUT = 0.15
/** The least a winning ticket pays on the dollar, stake included. */
export const MIN_RETURN = 1.05

export interface Horse {
  /** Post position, 0-based; the saddle cloth reads one more. */
  post: number
  name: string
  /** The hidden strength the race is drawn from. */
  strength: number
  /** The colour of the silks. */
  silks: string
  /** A coat: bay, chestnut, grey, black, palomino. */
  coat: 'bay' | 'chestnut' | 'grey' | 'black' | 'palomino'
}

const NAMES = [
  'Second Mortgage',
  'Pawn Ticket',
  'Hold My Chips',
  'Bad Beat',
  'Cold Deck',
  'Broke Again',
  'Full Tilt',
  'Rail Bird',
  'Dead Money',
  'Gutshot',
  'Short Stack',
  'Slow Roll',
  'River Card',
  'Rent’s Due',
  'Sure Thing',
  'Fat Chance',
  'Nit Picker',
  'Whale Watch',
  'Double Down',
  'Last Dollar',
  'Marked Deck',
  'Chip and a Chair',
  'Lucky Socks',
  'Sunday Best',
]

const SILKS = ['#d83030', '#2a5ad8', '#f0c830', '#30a050', '#e8e8f0', '#c050d0']
const COATS: Horse['coat'][] = ['bay', 'chestnut', 'grey', 'black', 'palomino', 'bay']

/** Strength runs from a long shot to a favourite, but never so lopsided that a bet on the best horse can't lose. */
const MIN_STRENGTH = 1
const MAX_STRENGTH = 4.5

export function drawField(rng: Rng): Horse[] {
  const names = [...NAMES]
  const coats = [...COATS]
  const horses: Horse[] = []
  for (let post = 0; post < FIELD_SIZE; post++) {
    const name = names.splice(Math.floor(rng() * names.length), 1)[0]
    const coat = coats.splice(Math.floor(rng() * coats.length), 1)[0]
    // Skewed low: most of a field are also-rans, one or two are fancied.
    const strength = MIN_STRENGTH + (MAX_STRENGTH - MIN_STRENGTH) * Math.pow(rng(), 1.6)
    horses.push({ post, name, strength: Math.round(strength * 100) / 100, silks: SILKS[post], coat })
  }
  return horses
}

/** The order the horses cross the line in, as post positions, first to last. */
export function drawFinish(field: Horse[], rng: Rng): number[] {
  // Each horse's time is exponential with rate = strength; the quickest wins.
  // That is the same as picking each place in turn in proportion to strength.
  return field
    .map((h) => ({ post: h.post, time: -Math.log(1 - rng()) / h.strength }))
    .sort((a, b) => a.time - b.time)
    .map((h) => h.post)
}

export type BetKind = 'win' | 'place' | 'show'
export interface HorseBet {
  kind: BetKind
  post: number
}

/** How many places a bet of this kind pays down to: win 1, place 2, show 3. */
export function placesPaid(kind: BetKind): number {
  return kind === 'win' ? 1 : kind === 'place' ? 2 : 3
}

export interface Chances {
  /** Per horse: the chance of finishing first, in the top two, in the top three. */
  win: number[]
  place: number[]
  show: number[]
}

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items]
  const out: number[][] = []
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)]
    for (const tail of permutations(rest)) out.push([item, ...tail])
  })
  return out
}

/** Every order of finish and its exact probability, summed into the chances of each bet. */
export function chances(field: Horse[]): Chances {
  const total = field.reduce((s, h) => s + h.strength, 0)
  const win = field.map(() => 0)
  const place = field.map(() => 0)
  const show = field.map(() => 0)
  for (const order of permutations(field.map((h) => h.post))) {
    let p = 1
    let left = total
    for (const post of order) {
      p *= field[post].strength / left
      left -= field[post].strength
    }
    order.forEach((post, rank) => {
      if (rank < 1) win[post] += p
      if (rank < 2) place[post] += p
      if (rank < 3) show[post] += p
    })
  }
  return { win, place, show }
}

export function chanceOf(c: Chances, bet: HorseBet): number {
  return c[bet.kind][bet.post]
}

/** What a winning dollar comes back as, stake included, to the nickel. */
export function returnPerDollar(chance: number): number {
  const fair = (1 - TAKEOUT) / chance
  return Math.max(MIN_RETURN, Math.floor(fair * 20) / 20)
}

/** The board's price for a bet, as the tote shows it: "7-2", "9-5", "1-20". */
export function oddsLabel(chance: number): string {
  const profit = returnPerDollar(chance) - 1
  const hundredths = Math.round(profit * 100)
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const g = gcd(hundredths, 100)
  return `${hundredths / g}-${100 / g}`
}

export interface RaceSettlement {
  won: boolean
  /** Chips returned in all, stake included; 0 on a loss. */
  returned: number
  net: number
}

export function settleBet(field: Horse[], bet: HorseBet, stake: number, finish: number[]): RaceSettlement {
  const won = finish.indexOf(bet.post) < placesPaid(bet.kind)
  if (!won) return { won, returned: 0, net: -stake }
  const returned = Math.floor(stake * returnPerDollar(chanceOf(chances(field), bet)))
  return { won, returned, net: returned - stake }
}

/** The ordinal a horse finished in, for the results board. */
export function ordinal(place: number): string {
  return ['1st', '2nd', '3rd', '4th', '5th', '6th'][place] ?? `${place + 1}th`
}

// ---------------------------------------------------------------------------
// The running of the race
// ---------------------------------------------------------------------------

export interface RunnerPlan {
  post: number
  /** When the horse crosses the line, in milliseconds. */
  finishMs: number
  /** How hard it surges and fades on the way, 0..0.7, and how many times. */
  surge: number
  waves: number
}

export const RACE_MS = 9000

/**
 * Who crosses the line when. The order is the drawn finish and the gaps between
 * horses are a nose to a few lengths; in between they swap the lead as they
 * surge and fade, so the favourite can be last at the half and still win.
 */
export function planRace(finish: number[], rng: Rng): RunnerPlan[] {
  let t = RACE_MS
  const plans: RunnerPlan[] = []
  finish.forEach((post, rank) => {
    if (rank > 0) t += 90 + Math.floor(rng() * (rank === 1 ? 260 : 520))
    plans[post] = {
      post,
      finishMs: t,
      surge: 0.25 + rng() * 0.45,
      waves: 2 + Math.floor(rng() * 4),
    }
  })
  return plans
}

/**
 * How far round the track a runner is, 0..1, `ms` after the gates open.
 * u + (a / pi m) sin(pi m u) is 0 at the gate, 1 at the line, and always going
 * forward (its slope is 1 + a cos(...), and a < 1), whatever the surges.
 */
export function progressAt(plan: RunnerPlan, ms: number): number {
  const u = Math.min(1, Math.max(0, ms / plan.finishMs))
  if (u >= 1) return 1 + (ms - plan.finishMs) / plan.finishMs
  return u + (plan.surge / (Math.PI * plan.waves)) * Math.sin(Math.PI * plan.waves * u)
}
