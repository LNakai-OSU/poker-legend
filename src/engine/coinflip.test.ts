import { describe, expect, it } from 'vitest'
import { FAIRNESS, MAX_RIDE, flip, inspect, rideChance } from './coinflip'
import { mulberry32 } from './rng'

describe('coin-flip hustlers', () => {
  it('no coin is better than even for the player', () => {
    for (const f of Object.values(FAIRNESS)) expect(f).toBeLessThan(0.5)
  })

  it('the call lands as often as the coin says', () => {
    const rng = mulberry32(8)
    for (const f of Object.values(FAIRNESS)) {
      let wins = 0
      const N = 40_000
      for (let i = 0; i < N; i++) if (flip({ fairness: f, limit: 10 }, 'heads', rng).won) wins++
      expect(Math.abs(wins / N - f)).toBeLessThan(0.012)
    }
  })

  it('the landed side agrees with the verdict', () => {
    const rng = mulberry32(2)
    for (let i = 0; i < 500; i++) {
      const call = i % 2 ? 'heads' : 'tails'
      const r = flip({ fairness: 0.45, limit: 1 }, call, rng)
      expect(r.won).toBe(r.landed === call)
    }
  })

  it('a ride compounds the odds against you', () => {
    expect(rideChance({ fairness: 0.45, limit: 1 }, MAX_RIDE)).toBeLessThan(0.1)
    expect(inspect({ fairness: 0.4, limit: 1 })).toMatch(/heavy/)
  })
})
