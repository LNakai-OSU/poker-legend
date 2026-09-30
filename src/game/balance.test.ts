import { describe, expect, it } from 'vitest'
import { decideAiAction, estimateEquity } from '../engine/ai'
import { createDeck, shuffleDeck } from '../engine/deck'
import { mulberry32 } from '../engine/rng'
import { TexasHoldEmTable } from '../engine/table'
import type { Archetype, PlayerConfig, SkillTier } from '../engine/types'
import { CITIES, CITY_ORDER, TABLES } from '../world/content'

/**
 * Economy and difficulty sanity checks.
 *
 * Mostly *not* measured by simulating win rates: poker win rates need tens of
 * thousands of hands before the signal clears the variance, which is far more
 * than a test suite should run. So these check design invariants and decision
 * quality, both of which are cheap and deterministic.
 *
 * The one exception is the difficulty-curve check at the bottom. That one has to
 * be a simulation, because the failure it guards against — the whole ladder
 * being upside down, with the elite final boss the easiest opponent in the game
 * — is invisible to any per-decision assertion. It is deliberately coarse: a
 * fixed-depth heads-up match against a trivial exploiter bot, averaged over a
 * few seeds, asserting only the *ordering* of the two extreme tiers with a wide
 * margin.
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
        currentBet: 50,
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

// --- difficulty curve -------------------------------------------------------

const BENCH_BIG_BLIND = 10
const BENCH_STACK = 100 * BENCH_BIG_BLIND

/**
 * The yardstick: a trivial bot that calls whenever its equity beats the pot odds
 * and bets 3/4 pot whenever it is better than a 70% favourite. It never bluffs
 * and never folds a hand that is priced in, so the only way to beat it is to
 * stop paying it off — which means noticing that its big bets mean something.
 */
function exploiterAction(table: TexasHoldEmTable, rng: () => number) {
  const ctx = table.getAiContext('bot')!
  const equity = estimateEquity(ctx.hole, ctx.board, Math.max(1, ctx.opponentsInHand), rng, 160)
  const canRaise = table.getLegalActions('bot').some((a) => a.type === 'raise')
  if (equity > 0.7 && canRaise) {
    const to = ctx.currentBet + Math.round((ctx.potSize + ctx.toCall) * 0.75)
    return { type: 'raise' as const, to: Math.min(Math.max(to, ctx.minRaiseTo), ctx.allInTo) }
  }
  if (ctx.toCall <= 0) return { type: 'check' as const }
  if (equity > ctx.toCall / (ctx.potSize + ctx.toCall)) return { type: 'call' as const }
  return { type: 'fold' as const }
}

/**
 * What the exploiter bot wins, in big blinds per 100 hands, heads-up against one
 * AI of the given tier. Stacks are reset to 100bb every hand and the button
 * alternates, so the number measures decision quality rather than who happened
 * to win the first all-in.
 */
function exploiterBbPer100(skillTier: SkillTier, hands: number, seed: number): number {
  const rng = mulberry32(seed)
  const bot: PlayerConfig = { id: 'bot', name: 'Bot', isHuman: true, skillTier: 'amateur', startingStack: BENCH_STACK }
  const villain: PlayerConfig = { id: 'ai', name: 'AI', isHuman: false, skillTier, startingStack: BENCH_STACK }

  let profit = 0
  for (let hand = 0; hand < hands; hand++) {
    const seats = hand % 2 === 0 ? [bot, villain] : [villain, bot]
    const table = new TexasHoldEmTable(seats, {
      smallBlind: BENCH_BIG_BLIND / 2,
      bigBlind: BENCH_BIG_BLIND,
      rng,
    })
    table.startNewHand()
    let steps = 0
    while (table.getState().handInProgress && steps++ < 200) {
      const acting = table.getState().actingPlayerId!
      if (acting === 'bot') table.submitAction('bot', exploiterAction(table, rng))
      else table.submitAction(acting, decideAiAction(table.getAiContext(acting)!, rng))
    }
    profit += table.getState().players.find((p) => p.id === 'bot')!.stack - BENCH_STACK
  }
  return (profit / BENCH_BIG_BLIND / hands) * 100
}

const meanBbPer100 = (skillTier: SkillTier, hands: number, seeds: number[]) =>
  seeds.reduce((sum, seed) => sum + exploiterBbPer100(skillTier, hands, seed), 0) / seeds.length

describe('difficulty curve', () => {
  it('makes the trivial exploiter bot do worse against a better tier', () => {
    // The bug this exists for: estimateEquity sampled opponents uniformly at
    // random and the AI never narrowed a range, so higher tiers were only
    // *quieter*, not better. Measured against this bot, the shipped ladder ran
    // backwards — the elite final boss leaked ~1,600bb/100 while a competent
    // regular leaked ~48.
    const seeds = [7, 23, 71]
    const hands = 160
    const novice = meanBbPer100('novice', hands, seeds)
    const elite = meanBbPer100('elite', hands, seeds)
    expect(
      elite,
      `bot beats elite for ${elite.toFixed(0)}bb/100 but novice for only ${novice.toFixed(0)}bb/100`,
    ).toBeLessThan(novice - 100)
  }, 600000)
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
