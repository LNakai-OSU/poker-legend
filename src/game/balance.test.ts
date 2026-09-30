import { describe, expect, it } from 'vitest'
import { decideAiAction, estimateEquity } from '../engine/ai'
import { createDeck, shuffleDeck } from '../engine/deck'
import { mulberry32 } from '../engine/rng'
import type { Archetype, SkillTier } from '../engine/types'
import { CITIES, CITY_ORDER, TABLES } from '../world/content'

/**
 * Economy and difficulty sanity checks.
 *
 * Deliberately *not* measured by simulating win rates: poker win rates need
 * tens of thousands of hands before the signal clears the variance, which is
 * far more than a test suite should run. An earlier version of this file tried
 * it over a few hundred hands and produced numbers that were pure noise. These
 * check design invariants and decision quality instead, both of which are
 * cheap and deterministic enough to be trusted.
 */

/**
 * Average true equity at the moment a player commits chips. Playing badly means
 * putting money in with worse hands, which is exactly what the skill tiers'
 * equity-estimation noise produces.
 */
function averageEquityWhenCommitting(
  skillTier: SkillTier,
  archetype: Archetype,
  samples: number,
  seed: number,
): number {
  const rng = mulberry32(seed)
  let total = 0
  let commits = 0

  for (let i = 0; i < samples; i++) {
    const deck = shuffleDeck(createDeck(), rng)
    const hole = [deck[0], deck[1]]
    const board = [deck[2], deck[3], deck[4]]

    const action = decideAiAction(
      {
        hole,
        board,
        potSize: 100,
        toCall: 50,
        minRaiseTo: 100,
        allInTo: 1000,
        opponentsInHand: 1,
        skillTier,
        street: 'flop',
        archetype,
      },
      rng,
    )
    if (action.type === 'fold') continue
    total += estimateEquity(hole, board, 1, rng, 120)
    commits++
  }
  return commits === 0 ? 0 : total / commits
}

describe('opponent difficulty', () => {
  it('has whales commit chips with worse hands than disciplined players', () => {
    // This is what makes a whale table worth seeking out, and it is a property
    // of the equity-noise model rather than a hand-tuned behaviour.
    const whale = averageEquityWhenCommitting('novice', 'whale', 260, 4)
    const sharp = averageEquityWhenCommitting('sharp', 'regular', 260, 4)
    expect(whale).toBeLessThan(sharp)
  }, 120000)

  it('reads hands better as skill rises', () => {
    const novice = averageEquityWhenCommitting('novice', 'regular', 260, 21)
    const elite = averageEquityWhenCommitting('elite', 'regular', 260, 21)
    expect(elite).toBeGreaterThan(novice)
  }, 120000)
})

describe('stakes ladder shape', () => {
  const cheapestBuyIn = (cityId: string) => {
    const ids = CITIES[cityId].pois
      .map((poi) => (poi.action.kind === 'table' ? poi.action.tableId : null))
      .filter((id): id is string => id !== null)
    return Math.min(...ids.map((id) => TABLES[id].buyIn))
  }

  it('steps buy-ins up smoothly rather than in one huge jump', () => {
    // Porto Lumina originally jumped 10x while every other step was 2.5-4x,
    // which made the last city feel like a different game.
    for (let i = 1; i < CITY_ORDER.length; i++) {
      const prev = cheapestBuyIn(CITY_ORDER[i - 1])
      const next = cheapestBuyIn(CITY_ORDER[i])
      const jump = next / prev
      expect(jump, `${CITY_ORDER[i]} buy-in jumps ${jump.toFixed(1)}x`).toBeGreaterThan(1.5)
      expect(jump, `${CITY_ORDER[i]} buy-in jumps ${jump.toFixed(1)}x`).toBeLessThanOrEqual(5)
    }
  })

  it('opens each city with enough money to rebuy, not just to sit once', () => {
    // Arriving with exactly one buy-in means one bad hand ends the trip.
    for (const cityId of CITY_ORDER) {
      if (cityId === 'silverCreek') continue // the first stop is meant to be reachable broke
      const gate = CITIES[cityId].unlockCash
      const buyIn = cheapestBuyIn(cityId)
      expect(gate / buyIn, `${cityId} opens with only ${(gate / buyIn).toFixed(1)} buy-ins`).toBeGreaterThanOrEqual(2)
    }
  })

  it('keeps each gate a sane multiple of the one before it', () => {
    const gates = CITY_ORDER.map((id) => CITIES[id].unlockCash).filter((g) => g > 0)
    for (let i = 1; i < gates.length; i++) {
      const ratio = gates[i] / gates[i - 1]
      expect(ratio).toBeGreaterThan(1.5)
      expect(ratio).toBeLessThanOrEqual(6)
    }
  })
})
