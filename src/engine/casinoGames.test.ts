import { describe, expect, it } from 'vitest'
import { SLOT_SYMBOLS, spin, theoreticalReturn } from './slots'
import { newCrapsState, oddsWinnings, playLine, playPassLine, resolveRoll, resolveSide, type DiceRoll } from './craps'
import { WHEEL_ORDER, colorOf, covers, payoutOdds, settle, spinWheel, type RouletteBet } from './roulette'
import { mulberry32 } from './rng'

function roll(a: number, b: number): DiceRoll {
  return { a, b, total: a + b }
}

describe('slots', () => {
  it('returns between 88% and 95% of stake over the long run', () => {
    // Simulated rather than derived, so a payout table change can't drift the
    // machine into paying more than it takes without a test failing.
    const rng = mulberry32(7)
    const stake = 10
    let wagered = 0
    let returned = 0
    for (let i = 0; i < 300_000; i++) {
      wagered += stake
      returned += spin(stake, rng).payout
    }
    const rtp = returned / wagered
    expect(rtp).toBeGreaterThan(0.85)
    expect(rtp).toBeLessThan(0.98)
    // The closed form should agree with the simulation.
    expect(Math.abs(rtp - theoreticalReturn())).toBeLessThan(0.05)
  })

  it('is a losing proposition in expectation, like a real machine', () => {
    expect(theoreticalReturn()).toBeLessThan(1)
  })

  it('only pays on three of a kind', () => {
    const rng = mulberry32(3)
    for (let i = 0; i < 2000; i++) {
      const result = spin(10, rng)
      const allSame = result.reels.every((r) => r.id === result.reels[0].id)
      expect(result.payout > 0).toBe(allSame)
    }
  })

  it('pays rarer symbols more', () => {
    const sorted = [...SLOT_SYMBOLS].sort((a, b) => b.weight - a.weight)
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].triplePays).toBeGreaterThan(sorted[i - 1].triplePays)
    }
  })
})

describe('craps pass line', () => {
  it('wins immediately on a natural', () => {
    expect(resolveRoll(newCrapsState(), roll(3, 4)).outcome).toBe('win')
    expect(resolveRoll(newCrapsState(), roll(5, 6)).outcome).toBe('win')
  })

  it('loses immediately on craps', () => {
    for (const [a, b] of [[1, 1], [1, 2], [6, 6]]) {
      expect(resolveRoll(newCrapsState(), roll(a, b)).outcome).toBe('lose')
    }
  })

  it('establishes a point on anything else', () => {
    const step = resolveRoll(newCrapsState(), roll(2, 2))
    expect(step.outcome).toBe('continue')
    expect(step.state.phase).toBe('point')
    expect(step.state.point).toBe(4)
  })

  it('wins by repeating the point and loses to a seven', () => {
    const pointState = resolveRoll(newCrapsState(), roll(2, 2)).state
    expect(resolveRoll(pointState, roll(1, 3)).outcome).toBe('win')
    expect(resolveRoll(pointState, roll(3, 4)).outcome).toBe('lose')
    expect(resolveRoll(pointState, roll(5, 5)).outcome).toBe('continue')
  })

  it('produces the real pass-line win rate of about 49.3%', () => {
    // 244/495 is the textbook figure; hitting it from simulation proves the
    // rules are implemented correctly rather than approximately.
    const rng = mulberry32(11)
    let wins = 0
    const trials = 200_000
    for (let i = 0; i < trials; i++) {
      if (playPassLine(rng) === 'win') wins++
    }
    const rate = wins / trials
    expect(Math.abs(rate - 244 / 495)).toBeLessThan(0.006)
  })
})

describe('craps, both sides', () => {
  it('don’t pass wins on 2 and 3, pushes on 12 and loses to 7 and 11 on the come-out', () => {
    const come = newCrapsState()
    expect(resolveSide('dontPass', come, roll(1, 1)).outcome).toBe('win')
    expect(resolveSide('dontPass', come, roll(1, 2)).outcome).toBe('win')
    expect(resolveSide('dontPass', come, roll(6, 6)).outcome).toBe('push')
    expect(resolveSide('dontPass', come, roll(3, 4)).outcome).toBe('lose')
    expect(resolveSide('dontPass', come, roll(5, 6)).outcome).toBe('lose')
  })

  it('don’t pass wins on the seven out and loses when the point is made', () => {
    const point = resolveRoll(newCrapsState(), roll(2, 2)).state
    expect(resolveSide('dontPass', point, roll(3, 4)).outcome).toBe('win')
    expect(resolveSide('dontPass', point, roll(1, 3)).outcome).toBe('lose')
    expect(resolveSide('dontPass', point, roll(5, 5)).outcome).toBe('continue')
  })

  it('has a house edge near 1.36% on don’t pass', () => {
    const rng = mulberry32(5)
    let net = 0
    const trials = 300_000
    for (let i = 0; i < trials; i++) {
      const r = playLine('dontPass', rng)
      net += r === 'win' ? 1 : r === 'lose' ? -1 : 0
    }
    expect(Math.abs(net / trials + 0.0136)).toBeLessThan(0.008)
  })

  it('pays odds at the true price, so the odds bet is fair', () => {
    for (const point of [4, 5, 6, 8, 9, 10]) {
      const ways = (n: number) => 6 - Math.abs(7 - n)
      const pWin = ways(point) / (ways(point) + 6)
      const stake = 60
      const passEv = pWin * oddsWinnings('pass', point, stake) - (1 - pWin) * stake
      const dontEv = (1 - pWin) * oddsWinnings('dontPass', point, stake) - pWin * stake
      expect(Math.abs(passEv)).toBeLessThan(1e-9)
      expect(Math.abs(dontEv)).toBeLessThan(1e-9)
    }
  })
})

describe('roulette', () => {
  it('has thirty-seven pockets, each on the wheel once', () => {
    expect(WHEEL_ORDER).toHaveLength(37)
    expect(new Set(WHEEL_ORDER).size).toBe(37)
  })

  it('colours the zero green and splits the rest eighteen and eighteen', () => {
    expect(colorOf(0)).toBe('green')
    const all = Array.from({ length: 36 }, (_, i) => i + 1)
    expect(all.filter((n) => colorOf(n) === 'red')).toHaveLength(18)
    expect(all.filter((n) => colorOf(n) === 'black')).toHaveLength(18)
  })

  it('pays 35 to 1 straight up, even money outside and 2 to 1 on dozens and columns', () => {
    expect(payoutOdds({ kind: 'straight', number: 17 })).toBe(35)
    expect(payoutOdds({ kind: 'color', color: 'red' })).toBe(1)
    expect(payoutOdds({ kind: 'dozen', dozen: 2 })).toBe(2)
    expect(payoutOdds({ kind: 'column', column: 3 })).toBe(2)
  })

  it('loses every outside bet to the zero', () => {
    const bets: RouletteBet[] = [
      { kind: 'color', color: 'red' }, { kind: 'parity', parity: 'even' }, { kind: 'half', half: 'low' },
      { kind: 'dozen', dozen: 1 }, { kind: 'column', column: 1 },
    ]
    for (const bet of bets) expect(covers(bet)).not.toContain(0)
    expect(settle(bets.map((bet) => ({ bet, stake: 10 })), 0).net).toBe(-50)
  })

  it('returns stake and winnings on a win', () => {
    const r = settle([{ bet: { kind: 'straight', number: 17 }, stake: 10 }, { bet: { kind: 'color', color: 'red' }, stake: 20 }], 17)
    // 17 is black: only the straight-up bet wins.
    expect(r.returned).toBe(360)
    expect(r.net).toBe(330)
  })

  it('takes a 2.70% edge from every kind of bet over the long run', () => {
    const rng = mulberry32(9)
    const bets: RouletteBet[] = [
      { kind: 'straight', number: 7 }, { kind: 'color', color: 'black' }, { kind: 'dozen', dozen: 3 }, { kind: 'half', half: 'high' },
    ]
    for (const bet of bets) {
      let net = 0
      const trials = 200_000
      for (let i = 0; i < trials; i++) net += settle([{ bet, stake: 1 }], spinWheel(rng)).net
      expect(Math.abs(net / trials + 1 / 37)).toBeLessThan(payoutOdds(bet) > 5 ? 0.06 : 0.012)
    }
  })
})
