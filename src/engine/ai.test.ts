import { describe, expect, it } from 'vitest'
import { decideAiAction, type AiDecisionContext } from './ai'
import { createDeck, shuffleDeck } from './deck'
import { mulberry32 } from './rng'
import type { Archetype, Card, SkillTier } from './types'

const SKILL_TIERS: SkillTier[] = ['novice', 'amateur', 'competent', 'sharp', 'elite']

const TRASH: Card[] = [
  { rank: 7, suit: 'hearts' },
  { rank: 4, suit: 'hearts' },
]
const ACES: Card[] = [
  { rank: 14, suit: 'spades' },
  { rank: 14, suit: 'hearts' },
]
const SUITED_CONNECTORS: Card[] = [
  { rank: 8, suit: 'clubs' },
  { rank: 7, suit: 'clubs' },
]

function ctx(overrides: Partial<AiDecisionContext> = {}): AiDecisionContext {
  return {
    hole: TRASH,
    board: [],
    potSize: 60,
    currentBet: 20,
    toCall: 20,
    minRaiseTo: 40,
    allInTo: 1000,
    opponentsInHand: 1,
    skillTier: 'competent',
    street: 'preflop',
    ...overrides,
  }
}

/** Someone has shoved 1,000 into a 60-chip pot: the price is ~94%, which no hand beats. */
function facingAllIn(overrides: Partial<AiDecisionContext> = {}): AiDecisionContext {
  return ctx({ potSize: 60, currentBet: 1000, toCall: 980, minRaiseTo: 1980, allInTo: 1000, ...overrides })
}

function rates(build: (i: number) => AiDecisionContext, samples: number, seed: number) {
  const rng = mulberry32(seed)
  const counts = { fold: 0, check: 0, call: 0, raise: 0 }
  for (let i = 0; i < samples; i++) counts[decideAiAction(build(i), rng).type]++
  return {
    fold: counts.fold / samples,
    call: counts.call / samples,
    raise: counts.raise / samples,
    continue: (samples - counts.fold) / samples,
  }
}

describe('facing an all-in with trash', () => {
  // The old AI folded mechanically here *except* when a flat bluff roll fired,
  // and then called off its whole stack with any two cards. A player who shoved
  // blind every hand turned $1,000 into $18,075 in twenty hands.
  it('folds the great majority of the time at every skill tier', () => {
    for (const skillTier of SKILL_TIERS) {
      const { fold } = rates(() => facingAllIn({ skillTier }), 100, 7)
      expect(fold, `${skillTier} folds only ${(fold * 100).toFixed(0)}% of trash to a shove`).toBeGreaterThan(0.85)
    }
  }, 60000)

  it('folds trash to a shove essentially always at the top tiers', () => {
    for (const skillTier of ['sharp', 'elite'] as SkillTier[]) {
      const { fold } = rates(() => facingAllIn({ skillTier }), 80, 11)
      expect(fold, `${skillTier} folds only ${(fold * 100).toFixed(0)}%`).toBe(1)
    }
  }, 60000)

  it('never bluff-raises at a price that big', () => {
    for (const skillTier of SKILL_TIERS) {
      const { raise } = rates(() => facingAllIn({ skillTier, allInTo: 4000, minRaiseTo: 1980 }), 60, 3)
      expect(raise, `${skillTier} bluff-shoved at a 94% price`).toBe(0)
    }
  }, 60000)
})

describe('with the price on its side', () => {
  it('never folds aces to a modest bet', () => {
    for (const skillTier of SKILL_TIERS) {
      const { fold } = rates(
        () => ctx({ hole: ACES, potSize: 200, currentBet: 50, toCall: 50, minRaiseTo: 100, skillTier }),
        50,
        5,
      )
      expect(fold, `${skillTier} folded aces getting 5:1`).toBe(0)
    }
  }, 60000)

  it('calls a cheap bet with a hand that beats the pot odds', () => {
    // 8-7 suited is ~40% against one hand and only has to beat a 20% price, so
    // calling is correct and a disciplined player should find it.
    const { call, fold } = rates(
      () =>
        ctx({
          hole: SUITED_CONNECTORS,
          potSize: 200,
          currentBet: 50,
          toCall: 50,
          minRaiseTo: 100,
          skillTier: 'elite',
        }),
      60,
      13,
    )
    expect(fold).toBe(0)
    expect(call).toBeGreaterThan(0.8)
  }, 60000)

  it('sizes a raise as a fraction of the pot rather than shoving', () => {
    const rng = mulberry32(2)
    let raises = 0
    let shoves = 0
    for (let i = 0; i < 60; i++) {
      const action = decideAiAction(
        ctx({ hole: ACES, potSize: 200, currentBet: 50, toCall: 50, minRaiseTo: 100, skillTier: 'elite' }),
        rng,
      )
      if (action.type !== 'raise') continue
      raises++
      if (action.to >= 1000) shoves++
      // Half-pot to pot on top of a 50 bet into a 200 pot, i.e. 175-300.
      expect(action.to).toBeGreaterThanOrEqual(100)
      expect(action.to).toBeLessThanOrEqual(310)
    }
    expect(raises).toBeGreaterThan(0)
    expect(shoves).toBe(0)
  }, 60000)
})

describe('archetypes', () => {
  /** Non-fold rate facing a 2x-pot bet (a 67% price) with whatever the deck deals. */
  function continueRate(skillTier: SkillTier, archetype: Archetype, samples: number, seed: number) {
    const deckRng = mulberry32(seed)
    return rates(
      () => {
        const deck = shuffleDeck(createDeck(), deckRng)
        return ctx({
          hole: [deck[0], deck[1]],
          board: [deck[2], deck[3], deck[4]],
          potSize: 100,
          currentBet: 200,
          toCall: 200,
          minRaiseTo: 400,
          skillTier,
          street: 'flop',
          archetype,
        })
      },
      samples,
      seed + 1,
    ).continue
  }

  it('has whales call far wider than sharp players', () => {
    const whale = continueRate('novice', 'whale', 80, 31)
    const sharp = continueRate('sharp', 'regular', 80, 31)
    expect(whale, `whale ${whale.toFixed(2)} vs sharp ${sharp.toFixed(2)}`).toBeGreaterThan(sharp + 0.15)
  }, 120000)

  it('has a whale chase a hand a sharp player folds for the same price', () => {
    // 7-4 suited is ~40% heads-up and the price here is 50%, so folding is
    // correct: the sharp player does, the whale cannot help itself.
    const price = { potSize: 100, currentBet: 100, toCall: 100, minRaiseTo: 200 }
    const whale = rates(() => ctx({ ...price, hole: TRASH, skillTier: 'novice', archetype: 'whale' }), 80, 41)
    const sharp = rates(() => ctx({ ...price, hole: TRASH, skillTier: 'sharp', archetype: 'regular' }), 80, 41)
    expect(sharp.fold).toBeGreaterThan(0.8)
    expect(whale.continue).toBeGreaterThan(0.5)
    expect(whale.continue).toBeGreaterThan(sharp.continue + 0.3)
  }, 120000)

  it('has whales put money in voluntarily more often than sharp players', () => {
    const bet = (skillTier: SkillTier, archetype: Archetype) => {
      const deckRng = mulberry32(77)
      return rates(
        () => {
          const deck = shuffleDeck(createDeck(), deckRng)
          return ctx({
            hole: [deck[0], deck[1]],
            board: [deck[2], deck[3], deck[4]],
            potSize: 200,
            currentBet: 0,
            toCall: 0,
            minRaiseTo: 20,
            skillTier,
            street: 'flop',
            archetype,
          })
        },
        80,
        78,
      ).raise
    }
    expect(bet('novice', 'whale')).toBeGreaterThan(bet('sharp', 'regular'))
  }, 120000)
})
