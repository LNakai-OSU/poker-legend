import type { Rng } from './rng'

/**
 * Scratchers and the lottery.
 *
 * A scratcher is a printed card: its prize was settled at the press, and the
 * silver only hides it. `drawTicket` draws the prize from the tier's table and
 * then lays out nine symbols that show it — three matching prize amounts for a
 * winner, and nothing that lines up three times for a loser — so what you scratch
 * is what you were always going to get.
 *
 * Every tier's table is data, and `returnOf` adds it up exactly, so the house
 * edge is a number a test can read rather than a hope.
 */

export interface ScratcherTier {
  /** What a card costs. */
  price: number
  name: string
  /** The game printed on the card. */
  tagline: string
  /** The card's colours: the stock, and the ink the prizes are printed in. */
  stock: string
  ink: string
  /** Prizes as multiples of the price, with their weight out of `ODDS_IN`. Everything else is a loser. */
  prizes: Array<{ times: number; weight: number }>
}

/** The prize weights are parts per this many cards. */
export const ODDS_IN = 100_000

export const SCRATCHERS: ScratcherTier[] = [
  {
    price: 1,
    name: 'Lucky Dollar',
    tagline: 'Match three, win that much.',
    stock: '#f2d878',
    ink: '#7a2a10',
    prizes: [
      { times: 1, weight: 12_500 },
      { times: 2, weight: 5_000 },
      { times: 5, weight: 2_000 },
      { times: 10, weight: 1_000 },
      { times: 50, weight: 100 },
      { times: 1000, weight: 5 },
    ],
  },
  {
    price: 5,
    name: 'Cactus Cash',
    tagline: 'Match three, win that much.',
    stock: '#9ad8a0',
    ink: '#124a28',
    prizes: [
      { times: 1, weight: 13_000 },
      { times: 2, weight: 5_500 },
      { times: 4, weight: 2_500 },
      { times: 10, weight: 1_000 },
      { times: 50, weight: 100 },
      { times: 200, weight: 15 },
      { times: 1000, weight: 3 },
    ],
  },
  {
    price: 20,
    name: 'Gold Rush',
    tagline: 'Match three, win that much.',
    stock: '#f0b830',
    ink: '#4a1a08',
    prizes: [
      { times: 1, weight: 13_500 },
      { times: 2, weight: 6_000 },
      { times: 5, weight: 2_000 },
      { times: 10, weight: 800 },
      { times: 50, weight: 80 },
      { times: 250, weight: 10 },
      { times: 500, weight: 2 },
    ],
  },
]

export function tierFor(price: number): ScratcherTier {
  const tier = SCRATCHERS.find((t) => t.price === price)
  if (!tier) throw new Error(`no scratcher costs $${price}`)
  return tier
}

/** The share of every dollar spent on this tier that comes back, exactly. */
export function returnOf(tier: ScratcherTier): number {
  return tier.prizes.reduce((s, p) => s + p.times * (p.weight / ODDS_IN), 0)
}

/** The chance a card wins anything. */
export function winChance(tier: ScratcherTier): number {
  return tier.prizes.reduce((s, p) => s + p.weight, 0) / ODDS_IN
}

/** The biggest prize on a card, in dollars. */
export function topPrize(tier: ScratcherTier): number {
  return Math.max(...tier.prizes.map((p) => p.times)) * tier.price
}

export interface Ticket {
  tier: ScratcherTier
  /** Nine amounts, in dollars, in the order they sit on the card. */
  cells: number[]
  /** What the card pays, in dollars; 0 for a loser. */
  prize: number
}

/** The amounts printed on a card: its own prize ladder, so a loser still looks hopeful. */
function ladder(tier: ScratcherTier): number[] {
  return tier.prizes.map((p) => p.times * tier.price)
}

export function drawTicket(tier: ScratcherTier, rng: Rng): Ticket {
  const roll = rng() * ODDS_IN
  let acc = 0
  let won: number | null = null
  for (const p of tier.prizes) {
    acc += p.weight
    if (roll < acc) {
      won = p.times * tier.price
      break
    }
  }
  const amounts = ladder(tier)
  const cells: number[] = []
  if (won !== null) {
    // Three of the prize, then six others none of which appears three times.
    cells.push(won, won, won)
    const counts = new Map<number, number>([[won, 3]])
    while (cells.length < 9) {
      const a = amounts[Math.floor(rng() * amounts.length)]
      const n = counts.get(a) ?? 0
      if (n >= 2) continue
      counts.set(a, n + 1)
      cells.push(a)
    }
  } else {
    const counts = new Map<number, number>()
    while (cells.length < 9) {
      const a = amounts[Math.floor(rng() * amounts.length)]
      const n = counts.get(a) ?? 0
      if (n >= 2) continue
      counts.set(a, n + 1)
      cells.push(a)
    }
  }
  // Shuffle so the winning three are anywhere on the card.
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return { tier, cells, prize: won ?? 0 }
}

/** What a card actually pays under the rule printed on it: any amount shown three times. */
export function readTicket(cells: number[]): number {
  const counts = new Map<number, number>()
  for (const c of cells) counts.set(c, (counts.get(c) ?? 0) + 1)
  let best = 0
  for (const [amount, n] of counts) if (n >= 3 && amount > best) best = amount
  return best
}

// ---------------------------------------------------------------------------
// The lottery: pick five numbers, five are drawn
// ---------------------------------------------------------------------------

export const LOTTO_POOL = 40
export const LOTTO_PICKS = 5
/** A ticket. */
export const LOTTO_PRICE = 2

/** What a ticket pays, in dollars, for matching this many of the five. */
export const LOTTO_PAYS: Record<number, number> = { 2: 4, 3: 30, 4: 1_000, 5: 100_000 }

function choose(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return Math.round(r)
}

/** The exact chance of matching `m` numbers (hypergeometric). */
export function lottoChance(m: number): number {
  return (choose(LOTTO_PICKS, m) * choose(LOTTO_POOL - LOTTO_PICKS, LOTTO_PICKS - m)) / choose(LOTTO_POOL, LOTTO_PICKS)
}

/** The share of every ticket's price that comes back, exactly. */
export function lottoReturn(): number {
  let r = 0
  for (const [m, pay] of Object.entries(LOTTO_PAYS)) r += lottoChance(Number(m)) * (pay / LOTTO_PRICE)
  return r
}

/** Five different numbers from 1 to the pool, in the order the balls come out. */
export function drawBalls(rng: Rng): number[] {
  const pool = Array.from({ length: LOTTO_POOL }, (_, i) => i + 1)
  const out: number[] = []
  while (out.length < LOTTO_PICKS) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0])
  return out
}

export function quickPick(rng: Rng): number[] {
  return drawBalls(rng).sort((a, b) => a - b)
}

export function matches(picks: number[], balls: number[]): number {
  return picks.filter((n) => balls.includes(n)).length
}

/** Dollars a ticket pays against a draw. */
export function lottoPrize(picks: number[], balls: number[]): number {
  return LOTTO_PAYS[matches(picks, balls)] ?? 0
}
