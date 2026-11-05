import { describe, expect, it } from 'vitest'
import { mulberry32 } from './rng'
import { TexasHoldEmTable } from './table'
import { blindsForRound, isFinalTable, replacementStack, roundOfNextHand, type TournamentRules } from './tournament'

const RULES: TournamentRules = {
  rounds: 10,
  handsPerRound: 10,
  blinds: [[100, 200], [150, 300], [200, 400], [300, 600], [400, 800], [600, 1200], [800, 1600], [1000, 2000], [1500, 3000], [2000, 4000]],
}

describe('tournament rules', () => {
  it('moves up a round every ten hands', () => {
    expect(roundOfNextHand(RULES, 0)).toBe(1)
    expect(roundOfNextHand(RULES, 9)).toBe(1)
    expect(roundOfNextHand(RULES, 10)).toBe(2)
    expect(roundOfNextHand(RULES, 99)).toBe(10)
  })

  it('raises the blinds every round and keeps raising past the schedule', () => {
    let previous = 0
    for (let round = 1; round <= 14; round++) {
      const { small, big } = blindsForRound(RULES, round)
      expect(big).toBe(small * 2)
      expect(big).toBeGreaterThan(previous)
      previous = big
    }
  })

  it('becomes the final table after the tenth round and not before', () => {
    expect(isFinalTable(RULES, 99)).toBe(false)
    expect(isFinalTable(RULES, 100)).toBe(true)
  })

  it('seats a newcomer with a stack that fits the stage', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 200; i++) {
      const bb = [200, 800, 4000][i % 3]
      const others = [20000, 12000, 30000, 8000, 15000]
      const stack = replacementStack(rng, others, bb)
      expect(stack).toBeGreaterThanOrEqual(bb * 10)
      expect(stack).toBeLessThanOrEqual(Math.max(3 * 17000, bb * 10))
      expect(stack % bb).toBe(0)
    }
  })

  it('never leaves a newcomer dead on arrival when the table is short', () => {
    expect(replacementStack(mulberry32(1), [1000, 1500], 4000)).toBeGreaterThanOrEqual(40000)
  })
})

describe('replacing a knocked-out player', () => {
  it('puts the newcomer in the same chair with a fresh stack', () => {
    const table = new TexasHoldEmTable(
      [
        { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: 1000 },
        { id: 'a', name: 'A', isHuman: false, skillTier: 'amateur', startingStack: 1000 },
        { id: 'b', name: 'B', isHuman: false, skillTier: 'amateur', startingStack: 1000 },
      ],
      { smallBlind: 10, bigBlind: 20, rng: mulberry32(3) },
    )
    table.replacePlayer('a', { id: 'c', name: 'C', isHuman: false, skillTier: 'sharp', startingStack: 2500 })
    const players = table.getState().players
    expect(players.map((p) => p.id)).toEqual(['you', 'c', 'b'])
    expect(players[1].stack).toBe(2500)
    table.startNewHand()
    expect(() => table.replacePlayer('b', { id: 'd', name: 'D', isHuman: false, skillTier: 'amateur', startingStack: 900 })).toThrow()
  })
})
