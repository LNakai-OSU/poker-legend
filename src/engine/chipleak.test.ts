import { describe, it } from 'vitest'
import { TexasHoldEmTable } from './table'
import { decideAiAction } from './ai'
import { mulberry32 } from './rng'
import type { PlayerConfig } from './types'

function runGame(seed: number) {
  const players: PlayerConfig[] = [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: 500 },
    { id: 'marcus', name: 'Marcus', isHuman: false, skillTier: 'novice', startingStack: 500 },
    { id: 'dana', name: 'Dana', isHuman: false, skillTier: 'novice', startingStack: 500 },
  ]
  const startingTotal = players.reduce((s, p) => s + p.startingStack, 0)
  const rng = mulberry32(seed)
  const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind: 10, rng })

  const totalNow = () => {
    const s = table.getState()
    return s.pot + s.players.reduce((sum, p) => sum + p.stack, 0)
  }

  let hands = 0
  while (!table.isGameOver() && hands < 500) {
    hands++
    table.startNewHand()
    const before = totalNow()
    if (before !== startingTotal) {
      throw new Error(`seed ${seed}: mismatch right after startNewHand, hand ${hands}: ${before} !== ${startingTotal}`)
    }

    let steps = 0
    while (table.getState().handInProgress) {
      steps++
      if (steps > 100) throw new Error(`seed ${seed}: hand ${hands} did not resolve`)
      const state = table.getState()
      const actingId = state.actingPlayerId!

      if (actingId === 'you') {
        const legal = table.getLegalActions('you')
        const action = legal.some((a) => a.type === 'check') ? { type: 'check' as const } : { type: 'call' as const }
        table.submitAction('you', action)
      } else {
        const ctx = table.getAiContext(actingId)!
        const action = decideAiAction(ctx, rng)
        table.submitAction(actingId, action)
      }

      const total = totalNow()
      if (total !== startingTotal) {
        throw new Error(
          `seed ${seed}: chip mismatch after an action in hand ${hands}, step ${steps}: ${total} !== ${startingTotal}\n` +
          JSON.stringify(table.getState(), null, 2),
        )
      }
    }
  }
}

describe('chip conservation with a check/call-only human mixed in', () => {
  // Generous timeout: the AI now sizes bets as a fraction of the pot instead of
  // shoving, so games grind on for many more hands (and many more Monte Carlo
  // equity runs) before anyone busts.
  it('never loses or creates chips after any single action, across many seeds', () => {
    for (let seed = 0; seed < 15; seed++) {
      runGame(seed)
    }
  }, 180000)
})
