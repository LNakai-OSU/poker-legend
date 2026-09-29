import { describe, expect, it } from 'vitest'
import { TexasHoldEmTable } from './table'
import { decideAiAction } from './ai'
import { mulberry32 } from './rng'
import type { PlayerConfig } from './types'

function makePlayers(n: number, startingStack = 1000): PlayerConfig[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    isHuman: false,
    skillTier: 'amateur' as const,
    startingStack,
  }))
}

function totalChips(table: TexasHoldEmTable, players: PlayerConfig[]): number {
  const state = table.getState()
  return state.players.reduce((sum, p) => sum + p.stack, 0)
}

describe('TexasHoldEmTable heads-up hand', () => {
  it('deals two hole cards to each player and posts blinds', () => {
    const players = makePlayers(2, 500)
    const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind: 10, rng: mulberry32(1) })
    table.startNewHand()
    expect(table.getHoleCards('p0').length).toBe(2)
    expect(table.getHoleCards('p1').length).toBe(2)
    const state = table.getState()
    expect(state.pot).toBe(15) // sb + bb
  })

  it('awards the pot to the last player standing when everyone else folds', () => {
    const players = makePlayers(2, 500)
    const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind: 10, rng: mulberry32(1) })
    table.startNewHand()
    const state = table.getState()
    const actingId = state.actingPlayerId!
    table.submitAction(actingId, { type: 'fold' })

    const result = table.getLastHandResult()!
    const totalAfter = totalChips(table, players)
    expect(totalAfter).toBe(1000)
    expect(result.pots.reduce((s, p) => s + p.amount, 0)).toBe(15)
  })
})

describe('TexasHoldEmTable full freezeout simulation', () => {
  it('conserves total chips and terminates across many random-seeded games', () => {
    for (let seed = 0; seed < 15; seed++) {
      const players = makePlayers(3, 300)
      const rng = mulberry32(seed * 1000 + 1)
      const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind: 10, rng })
      const startingTotal = players.reduce((s, p) => s + p.startingStack, 0)

      let safety = 0
      while (!table.isGameOver()) {
        safety++
        if (safety > 500) throw new Error(`hand loop did not terminate (seed ${seed})`)
        table.startNewHand()

        let stepSafety = 0
        while (table.getState().handInProgress) {
          stepSafety++
          if (stepSafety > 200) throw new Error(`hand did not resolve (seed ${seed})`)
          const state = table.getState()
          const actingId = state.actingPlayerId
          if (!actingId) throw new Error(`handInProgress true but no acting player (seed ${seed})`)
          const ctx = table.getAiContext(actingId)!
          const action = decideAiAction(ctx, rng)
          table.submitAction(actingId, action)
        }

        const totalNow = totalChips(table, players)
        if (totalNow !== startingTotal) {
          throw new Error(`chip conservation violated after hand (seed ${seed}): ${totalNow} !== ${startingTotal}`)
        }
      }

      expect(table.getFreezeoutWinnerId()).not.toBeNull()
      expect(totalChips(table, players)).toBe(startingTotal)
    }
  }, 30000)
})
