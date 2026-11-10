import { describe, expect, it } from 'vitest'
import { halsNotes, judge, potOddsNeeded, summarise, type Decision } from './review'

const d = (over: Partial<Decision>): Decision => ({ hand: 3, street: 'river', action: 'call', toCall: 80, pot: 120, equity: 0.5, bigBlind: 2, ...over })

describe('pot odds', () => {
  it('are the call over the pot with the call in it', () => {
    expect(potOddsNeeded(50, 100)).toBeCloseTo(1 / 3)
    expect(potOddsNeeded(0, 100)).toBe(0)
  })
})

describe('judging a decision', () => {
  it('calls a call with too little equity a mistake, and prices it', () => {
    const f = judge(d({ equity: 0.18 }))
    expect(f?.kind).toBe('bad-call')
    // Needed 40%, had 18%, into a pot of 200: about 44 down.
    expect(f && 'cost' in f ? f.cost : 0).toBe(44)
  })

  it('leaves a close call alone: estimates wobble', () => {
    expect(judge(d({ equity: 0.37 }))).toBeNull()
  })

  it('only calls a fold a mistake when it threw away a big favourite', () => {
    expect(judge(d({ action: 'fold', equity: 0.55 }))).toBeNull()
    expect(judge(d({ action: 'fold', equity: 0.8 }))?.kind).toBe('bad-fold')
  })

  it('credits a fold of a loser and a call with the price right', () => {
    expect(judge(d({ action: 'fold', equity: 0.1 }))?.kind).toBe('good-fold')
    expect(judge(d({ equity: 0.7 }))?.kind).toBe('good-call')
  })

  it('does not fuss over a bet smaller than a big blind', () => {
    expect(judge(d({ toCall: 1, equity: 0.0 }))).toBeNull()
  })
})

describe("Hal's notes", () => {
  const session = { net: 0, hands: 10, potsWon: 2, bestHand: null }
  it('lead with the costliest mistake', () => {
    const recap = summarise([d({ hand: 2, equity: 0.3 }), d({ hand: 7, equity: 0.05 })], session)
    expect(recap.worst?.decision.hand).toBe(7)
    expect(halsNotes(recap)[0]).toContain('Hand 7')
    expect(recap.badCalls).toBe(2)
  })

  it('says something kind when there is nothing to fix, and never nothing', () => {
    expect(halsNotes(summarise([d({ equity: 0.9 })], session)).join(' ')).toContain('odds on your side')
    expect(halsNotes(summarise([], session)).length).toBe(1)
    expect(halsNotes(summarise([], { ...session, hands: 2 }))[0]).toContain('Too short')
  })
})
