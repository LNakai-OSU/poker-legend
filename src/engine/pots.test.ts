import { describe, expect, it } from 'vitest'
import { calculatePots } from './pots'

describe('calculatePots', () => {
  it('builds a single pot when everyone contributes equally and stays in', () => {
    const contributions = new Map([['a', 100], ['b', 100], ['c', 100]])
    const pots = calculatePots(contributions, new Set())
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'b', 'c'], uncalled: false }])
  })

  it('creates a side pot when one player is short-stacked all-in', () => {
    // a is all-in for 50, b and c put in 150 each
    const contributions = new Map([['a', 50], ['b', 150], ['c', 150]])
    const pots = calculatePots(contributions, new Set())
    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['a', 'b', 'c'], uncalled: false }, // 50 * 3
      { amount: 200, eligiblePlayerIds: ['b', 'c'], uncalled: false }, // 100 * 2
    ])
    const total = pots.reduce((sum, p) => sum + p.amount, 0)
    expect(total).toBe(50 + 150 + 150)
  })

  it('excludes folded players from eligibility but keeps their chips in the pot', () => {
    const contributions = new Map([['a', 100], ['b', 100], ['c', 100]])
    const pots = calculatePots(contributions, new Set(['b']))
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'c'], uncalled: false }])
  })

  it('flags the layer nobody matched as uncalled rather than a pot', () => {
    // b shoved 680 into a pot a could only call 300 of: the top 380 is b's own
    // money coming straight back, not a pot won from anyone.
    const pots = calculatePots(new Map([['a', 300], ['b', 680]]), new Set())
    expect(pots).toEqual([
      { amount: 600, eligiblePlayerIds: ['a', 'b'], uncalled: false },
      { amount: 380, eligiblePlayerIds: ['b'], uncalled: true },
    ])
  })

  it('conserves total chips across arbitrary contribution patterns', () => {
    const contributions = new Map([['a', 20], ['b', 75], ['c', 200], ['d', 200]])
    const pots = calculatePots(contributions, new Set(['c']))
    const total = pots.reduce((sum, p) => sum + p.amount, 0)
    expect(total).toBe(20 + 75 + 200 + 200)
  })
})
