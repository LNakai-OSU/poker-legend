import type { Rng } from './rng'

/**
 * A three-reel slot with honest weighted reels. Payouts are tuned so the
 * long-run return sits in the 88-95% band real machines advertise — see
 * slots.test.ts, which simulates it rather than trusting the arithmetic.
 */
export interface SlotSymbol {
  id: string
  label: string
  /** Relative frequency on each reel. */
  weight: number
  /** Multiple of the stake paid for three of a kind. */
  triplePays: number
}

export const SLOT_SYMBOLS: SlotSymbol[] = [
  { id: 'cherry', label: '🍒', weight: 28, triplePays: 8 },
  { id: 'bell', label: '🔔', weight: 20, triplePays: 10 },
  { id: 'bar', label: 'BAR', weight: 14, triplePays: 20 },
  { id: 'seven', label: '7', weight: 6, triplePays: 60 },
  { id: 'diamond', label: '💎', weight: 3, triplePays: 200 },
]

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, s) => sum + s.weight, 0)

export interface SpinResult {
  reels: SlotSymbol[]
  /** Chips returned to the player; 0 for a loss. */
  payout: number
  label: string
}

function spinReel(rng: Rng): SlotSymbol {
  let roll = rng() * TOTAL_WEIGHT
  for (const symbol of SLOT_SYMBOLS) {
    roll -= symbol.weight
    if (roll <= 0) return symbol
  }
  return SLOT_SYMBOLS[SLOT_SYMBOLS.length - 1]
}

export function spin(stake: number, rng: Rng): SpinResult {
  const reels = [spinReel(rng), spinReel(rng), spinReel(rng)]
  const allSame = reels[0].id === reels[1].id && reels[1].id === reels[2].id

  if (allSame) {
    return {
      reels,
      payout: stake * reels[0].triplePays,
      label: `Three ${reels[0].label} — pays ${reels[0].triplePays}x`,
    }
  }
  return { reels, payout: 0, label: 'No win' }
}

/** Long-run return as a fraction of stake, used by the tests and the UI blurb. */
export function theoreticalReturn(): number {
  return SLOT_SYMBOLS.reduce((sum, s) => {
    const p = (s.weight / TOTAL_WEIGHT) ** 3
    return sum + p * s.triplePays
  }, 0)
}
