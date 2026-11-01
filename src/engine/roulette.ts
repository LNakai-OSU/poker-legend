import type { Rng } from './rng'

/**
 * European roulette: thirty-seven pockets, one zero, the house edge of 2.70%
 * falling out of the payouts rather than being dialled in. Every bet pays
 * 36 / (numbers it covers) - 1 to one, so a zero beats every outside bet and
 * every straight-up bet alike (see casinoGames.test.ts, which checks the edge
 * on every kind of bet).
 */

/** Pockets in wheel order, clockwise from the zero. */
export const WHEEL_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7,
  28, 12, 35, 3, 26,
]

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

export type PocketColor = 'red' | 'black' | 'green'

export function colorOf(n: number): PocketColor {
  return n === 0 ? 'green' : RED_NUMBERS.has(n) ? 'red' : 'black'
}

export type RouletteBet =
  | { kind: 'straight'; number: number }
  | { kind: 'color'; color: 'red' | 'black' }
  | { kind: 'parity'; parity: 'even' | 'odd' }
  | { kind: 'half'; half: 'low' | 'high' }
  | { kind: 'dozen'; dozen: 1 | 2 | 3 }
  | { kind: 'column'; column: 1 | 2 | 3 }

/** The numbers a bet covers. */
export function covers(bet: RouletteBet): number[] {
  const all = Array.from({ length: 36 }, (_, i) => i + 1)
  switch (bet.kind) {
    case 'straight':
      return [bet.number]
    case 'color':
      return all.filter((n) => colorOf(n) === bet.color)
    case 'parity':
      return all.filter((n) => (n % 2 === 0) === (bet.parity === 'even'))
    case 'half':
      return all.filter((n) => (bet.half === 'low' ? n <= 18 : n >= 19))
    case 'dozen':
      return all.filter((n) => Math.ceil(n / 12) === bet.dozen)
    case 'column':
      return all.filter((n) => ((n - 1) % 3) + 1 === bet.column)
  }
}

/** Times the stake paid on a win, the stake coming back on top. */
export function payoutOdds(bet: RouletteBet): number {
  return 36 / covers(bet).length - 1
}

export function betKey(bet: RouletteBet): string {
  switch (bet.kind) {
    case 'straight':
      return `n${bet.number}`
    case 'color':
      return bet.color
    case 'parity':
      return bet.parity
    case 'half':
      return bet.half
    case 'dozen':
      return `d${bet.dozen}`
    case 'column':
      return `c${bet.column}`
  }
}

export function betLabel(bet: RouletteBet): string {
  switch (bet.kind) {
    case 'straight':
      return `${bet.number}`
    case 'color':
      return bet.color.toUpperCase()
    case 'parity':
      return bet.parity.toUpperCase()
    case 'half':
      return bet.half === 'low' ? '1-18' : '19-36'
    case 'dozen':
      return bet.dozen === 1 ? '1ST 12' : bet.dozen === 2 ? '2ND 12' : '3RD 12'
    case 'column':
      return `COL ${bet.column}`
  }
}

export interface PlacedBet {
  bet: RouletteBet
  stake: number
}

export interface SpinSettlement {
  number: number
  color: PocketColor
  /** Chips returned in all: stake and winnings of every winning bet. */
  returned: number
  /** Returned minus everything staked. */
  net: number
  winners: PlacedBet[]
}

export function spinWheel(rng: Rng): number {
  return Math.floor(rng() * 37)
}

export function settle(bets: PlacedBet[], number: number): SpinSettlement {
  const staked = bets.reduce((sum, b) => sum + b.stake, 0)
  const winners = bets.filter((b) => covers(b.bet).includes(number))
  const returned = winners.reduce((sum, b) => sum + b.stake * (1 + payoutOdds(b.bet)), 0)
  return { number, color: colorOf(number), returned, net: returned - staked, winners }
}

/** Where on the wheel, in turns clockwise from the zero, a pocket sits (its centre). */
export function pocketTurn(number: number): number {
  return WHEEL_ORDER.indexOf(number) / WHEEL_ORDER.length
}
