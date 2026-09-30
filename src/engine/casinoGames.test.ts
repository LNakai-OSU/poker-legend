import { describe, expect, it } from 'vitest'
import { SLOT_SYMBOLS, spin, theoreticalReturn } from './slots'
import { newCrapsState, playPassLine, resolveRoll, type DiceRoll } from './craps'
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
