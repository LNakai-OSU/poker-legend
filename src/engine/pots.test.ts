import { describe, expect, it } from 'vitest'
import { calculatePots } from './pots'

describe('calculatePots', () => {
  it('builds a single pot when everyone contributes equally and stays in', () => {
    const contributions = new Map([['a', 100], ['b', 100], ['c', 100]])
    const pots = calculatePots(contributions, new Set())
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'b', 'c'] }])
  })

  it('creates a side pot when one player is short-stacked all-in', () => {
    // a is all-in for 50, b and c put in 150 each
    const contributions = new Map([['a', 50], ['b', 150], ['c', 150]])
    const pots = calculatePots(contributions, new Set())
    expect(pots).toEqual([
      { amount: 150, eligiblePlayerIds: ['a', 'b', 'c'] }, // 50 * 3
      { amount: 200, eligiblePlayerIds: ['b', 'c'] }, // 100 * 2
    ])
    const total = pots.reduce((sum, p) => sum + p.amount, 0)
    expect(total).toBe(50 + 150 + 150)
  })

  it('excludes folded players from eligibility but keeps their chips in the pot', () => {
    const contributions = new Map([['a', 100], ['b', 100], ['c', 100]])
    const pots = calculatePots(contributions, new Set(['b']))
    expect(pots).toEqual([{ amount: 300, eligiblePlayerIds: ['a', 'c'] }])
  })

  it('conserves total chips across arbitrary contribution patterns', () => {
    const contributions = new Map([['a', 20], ['b', 75], ['c', 200], ['d', 200]])
    const pots = calculatePots(contributions, new Set(['c']))
    const total = pots.reduce((sum, p) => sum + p.amount, 0)
    expect(total).toBe(20 + 75 + 200 + 200)
  })
})
