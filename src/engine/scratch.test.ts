import { describe, expect, it } from 'vitest'
import {
  LOTTO_PAYS,
  LOTTO_PICKS,
  LOTTO_POOL,
  LOTTO_PRICE,
  ODDS_IN,
  SCRATCHERS,
  drawBalls,
  drawTicket,
  lottoChance,
  lottoPrize,
  lottoReturn,
  matches,
  quickPick,
  readTicket,
  returnOf,
  topPrize,
  winChance,
} from './scratch'
import { mulberry32 } from './rng'

describe('scratchers', () => {
  it('every tier keeps well over a fifth of what is spent, and gives back more than half', () => {
    for (const tier of SCRATCHERS) {
      const r = returnOf(tier)
      expect(r, tier.name).toBeLessThan(0.8)
      expect(r, tier.name).toBeGreaterThan(0.5)
      expect(winChance(tier), tier.name).toBeLessThan(0.3)
      expect(tier.prizes.reduce((s, p) => s + p.weight, 0)).toBeLessThan(ODDS_IN)
    }
  })

  it('no prize is big enough to skip a rung of the ladder', () => {
    for (const tier of SCRATCHERS) expect(topPrize(tier), tier.name).toBeLessThanOrEqual(10_000)
  })

  it('the card shows what it pays: three of a kind for a winner, no three of a kind for a loser', () => {
    for (const tier of SCRATCHERS) {
      const rng = mulberry32(tier.price)
      for (let i = 0; i < 3000; i++) {
        const t = drawTicket(tier, rng)
        expect(t.cells).toHaveLength(9)
        expect(readTicket(t.cells), `${tier.name} #${i}`).toBe(t.prize)
      }
    }
  })

  it('simulated returns match the table', () => {
    for (const tier of SCRATCHERS) {
      const rng = mulberry32(99 + tier.price)
      const N = 400_000
      let paid = 0
      for (let i = 0; i < N; i++) paid += drawTicket(tier, rng).prize
      const observed = paid / (N * tier.price)
      // Rare big prizes make this noisy; a wide band still catches a table that is wrong by a prize.
      expect(Math.abs(observed - returnOf(tier)), tier.name).toBeLessThan(0.12)
    }
  })
})

describe('the lottery', () => {
  it('match chances add up to one', () => {
    let sum = 0
    for (let m = 0; m <= LOTTO_PICKS; m++) sum += lottoChance(m)
    expect(sum).toBeCloseTo(1, 9)
  })

  it('keeps more than a third of every ticket', () => {
    expect(lottoReturn()).toBeLessThan(0.67)
    expect(lottoReturn()).toBeGreaterThan(0.4)
  })

  it('the top prize is a jackpot, not a bankroll', () => {
    expect(Math.max(...Object.values(LOTTO_PAYS))).toBeLessThanOrEqual(100_000)
    expect(LOTTO_PRICE).toBeGreaterThan(0)
  })

  it('draws five different balls from the pool', () => {
    const rng = mulberry32(4)
    for (let i = 0; i < 200; i++) {
      const balls = drawBalls(rng)
      expect(new Set(balls).size).toBe(LOTTO_PICKS)
      for (const b of balls) {
        expect(b).toBeGreaterThanOrEqual(1)
        expect(b).toBeLessThanOrEqual(LOTTO_POOL)
      }
    }
    expect(quickPick(rng)).toHaveLength(LOTTO_PICKS)
  })

  it('pays by matches', () => {
    expect(matches([1, 2, 3, 4, 5], [5, 4, 9, 10, 11])).toBe(2)
    expect(lottoPrize([1, 2, 3, 4, 5], [5, 4, 9, 10, 11])).toBe(LOTTO_PAYS[2])
    expect(lottoPrize([1, 2, 3, 4, 5], [6, 7, 8, 9, 10])).toBe(0)
    expect(lottoPrize([1, 2, 3, 4, 5], [5, 4, 3, 2, 1])).toBe(LOTTO_PAYS[5])
  })
})
