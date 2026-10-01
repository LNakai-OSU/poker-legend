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

function totalChips(table: TexasHoldEmTable): number {
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
    const totalAfter = totalChips(table)
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

        const totalNow = totalChips(table)
        if (totalNow !== startingTotal) {
          throw new Error(`chip conservation violated after hand (seed ${seed}): ${totalNow} !== ${startingTotal}`)
        }
      }

      expect(table.getFreezeoutWinnerId()).not.toBeNull()
      expect(totalChips(table)).toBe(startingTotal)
    }
    // Fifteen whole freezeouts, with a Monte Carlo equity estimate behind every
    // decision. It fits inside a minute on its own, but vitest runs files in
    // parallel and alongside the other simulations it does not — and a timeout
    // reports as a failure with no assertion message, which reads like a real bug.
  }, 180_000)
})

describe('when the game is actually over', () => {
  /**
   * An all-in is not an elimination.
   *
   * Heads-up, the instant an opponent shoved their stack read as zero, so the
   * freezeout declared the table cleaned out and announced a winner before the
   * board that decided the hand had been dealt.
   */
  it('is not over while an all-in hand is still being played', () => {
    const players = makePlayers(2, 100)
    const table = new TexasHoldEmTable(players, {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(4),
    })
    table.startNewHand()

    // Shove, so one player has nothing behind while the hand is still live.
    const shover = table.getState().actingPlayerId!
    const me = table.getState().players.find((p) => p.id === shover)!
    table.submitAction(shover, { type: 'raise', to: me.streetContribution + me.stack })

    const shoved = table.getState().players.find((p) => p.id === shover)!
    expect(shoved.stack, 'the shover should have nothing behind').toBe(0)
    expect(table.getState().handInProgress, 'the hand should still be live').toBe(true)
    expect(table.isGameOver(), 'nobody is out while the pot is undecided').toBe(false)
    expect(table.getFreezeoutWinnerId()).toBeNull()
  })

  it('is over once the hand settles and only one player has chips', () => {
    const players = makePlayers(2, 100)
    const table = new TexasHoldEmTable(players, {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(4),
    })
    table.startNewHand()
    // Get everyone all in so the hand runs to a conclusion.
    let guard = 0
    while (table.getState().handInProgress && guard++ < 50) {
      const acting = table.getState().actingPlayerId
      if (!acting) break
      const player = table.getState().players.find((p) => p.id === acting)!
      const allInTo = player.streetContribution + player.stack
      if (table.getLegalActions(acting).some((a) => a.type === 'raise')) {
        table.submitAction(acting, { type: 'raise', to: allInTo })
      } else {
        table.submitAction(acting, { type: 'call' })
      }
    }
    expect(table.getState().handInProgress).toBe(false)
    const withChips = table.getState().players.filter((p) => p.stack > 0)
    // One side of a heads-up all-in has to end up with everything (or they chop).
    if (withChips.length === 1) {
      expect(table.isGameOver()).toBe(true)
      expect(table.getFreezeoutWinnerId()).toBe(withChips[0].id)
    }
  })
})

describe('TexasHoldEmTable rebuy (cash game mode)', () => {
  const stackOf = (table: TexasHoldEmTable, id: string) =>
    table.getState().players.find((p) => p.id === id)?.stack

  /** Plays out a hand so the table is between hands and buy-ins are legal. */
  const finishHand = (table: TexasHoldEmTable) => {
    while (table.getState().handInProgress) {
      const id = table.getState().actingPlayerId!
      table.submitAction(id, { type: 'fold' })
    }
  }

  it('refuses to buy in during a hand', () => {
    const table = new TexasHoldEmTable(makePlayers(2, 100), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(1),
    })
    table.startNewHand()
    expect(() => table.rebuy('p0', 100)).toThrow(/in progress/)
  })

  it('sits a busted player back down with the amount asked for', () => {
    const table = new TexasHoldEmTable(makePlayers(2, 100), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(1),
    })
    table.startNewHand()
    finishHand(table)
    const busted = table.getState().players.find((p) => p.stack === 0)
    if (busted) {
      table.rebuy(busted.id, 100)
      expect(stackOf(table, busted.id)).toBe(100)
    }
  })

  /**
   * The case that took the whole game down.
   *
   * Buying in used to throw for anybody who still had a chip, so topping a short
   * stack back up to a buy-in — which is what keeps a cash table a cash table —
   * threw mid-session and froze the table permanently: no hand would deal and no
   * button responded. Every cash game in the build died around hand 8, and nothing
   * caught it because the only test here asserted that the throw happened.
   */
  it('tops a live short stack up to a full buy-in', () => {
    const table = new TexasHoldEmTable(makePlayers(3, 300), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(7),
    })
    table.startNewHand()
    finishHand(table)

    const short = table.getState().players.find((p) => p.stack > 0 && p.stack < 300)!
    expect(short, 'a blind should have left somebody short of a full buy-in').toBeDefined()
    expect(() => table.rebuy(short.id, 300)).not.toThrow()
    expect(stackOf(table, short.id)).toBe(300)
  })

  it('takes a stack to end up with, never chips to add', () => {
    const table = new TexasHoldEmTable(makePlayers(2, 100), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(1),
    })
    // Repeated top-ups settle at the buy-in rather than compounding past it.
    table.rebuy('p0', 250)
    table.rebuy('p0', 250)
    expect(stackOf(table, 'p0')).toBe(250)
  })

  it('leaves a stack alone when it is already deep enough', () => {
    const table = new TexasHoldEmTable(makePlayers(2, 500), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(1),
    })
    table.rebuy('p0', 300)
    expect(stackOf(table, 'p0'), 'a top-up must never shrink anybody').toBe(500)
  })

  it('rejects a meaningless buy-in', () => {
    const table = new TexasHoldEmTable(makePlayers(2, 100), {
      smallBlind: 5,
      bigBlind: 10,
      rng: mulberry32(1),
    })
    expect(() => table.rebuy('p0', 0)).toThrow(/positive/)
    expect(() => table.rebuy('nobody', 100)).toThrow(/unknown player/)
  })
})
