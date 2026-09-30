import { createDeck } from './deck'
import { bestHand, compareHandStrength } from './handRank'
import type { Rng } from './rng'
import { shuffleDeck } from './deck'
import type { Action, Archetype, Card, SkillTier, Street } from './types'

export interface AiDecisionContext {
  hole: Card[]
  board: Card[]
  potSize: number
  toCall: number
  /** The highest street contribution anyone has made — what a call matches. */
  currentBet: number
  minRaiseTo: number
  /** The 'to' value if this player commits their entire remaining stack. */
  allInTo: number
  opponentsInHand: number
  skillTier: SkillTier
  street: Street
  archetype?: Archetype
}

const EQUITY_ITERATIONS: Record<SkillTier, number> = {
  novice: 80,
  amateur: 120,
  competent: 200,
  sharp: 300,
  elite: 400,
}

/** How far a player's read of their own equity can drift from the true Monte Carlo estimate. */
const EQUITY_NOISE: Record<SkillTier, number> = {
  novice: 0.3,
  amateur: 0.2,
  competent: 0.1,
  sharp: 0.05,
  elite: 0.02,
}

const RAISE_THRESHOLD: Record<SkillTier, number> = {
  novice: 0.75,
  amateur: 0.7,
  competent: 0.65,
  sharp: 0.62,
  elite: 0.6,
}

const BLUFF_CHANCE: Record<SkillTier, number> = {
  novice: 0.03,
  amateur: 0.05,
  competent: 0.08,
  sharp: 0.1,
  elite: 0.12,
}

/**
 * How much of the break-even price a tier actually demands before calling.
 * 1.0 is textbook-correct (call exactly when equity beats pot odds); below 1.0
 * is a calling station, since it accepts hands that are not getting the price.
 * Weak players call much too wide, strong players hew close to correct.
 */
const CALL_SLACK: Record<SkillTier, number> = {
  novice: 0.72,
  amateur: 0.78,
  competent: 0.85,
  sharp: 0.93,
  elite: 0.98,
}

/** A bluff is only ever considered when the price of the bluff-raise is this
 * small relative to the pot — you cannot bluff-raise into a shove. */
const BLUFF_MAX_PRICE_AS_POT_FRACTION = 0.34

/** Raise sizing, as a fraction of the pot after the call: half-pot to pot. */
const RAISE_POT_FRACTION_MIN = 0.5
const RAISE_POT_FRACTION_SPAN = 0.5
/** A single raise never commits more of the stack than this... */
const MAX_RAISE_STACK_FRACTION = 0.7
/** ...but once a raise is nearly everything, shove rather than leave a stub. */
const SHOVE_SNAP_FRACTION = 0.85

/**
 * Monte Carlo win-probability estimate: deals random cards for the
 * opponents and the remaining board many times and checks how often this
 * hand wins (ties split fractionally). This is the same technique real
 * poker equity calculators use, just with fewer iterations.
 */
export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponentCount: number,
  rng: Rng,
  iterations: number,
): number {
  if (opponentCount <= 0) return 1

  const known = new Set([...hole, ...board].map((c) => `${c.rank}${c.suit}`))
  const remainingDeck = createDeck().filter((c) => !known.has(`${c.rank}${c.suit}`))
  const boardSlotsNeeded = 5 - board.length

  let winShare = 0
  for (let i = 0; i < iterations; i++) {
    const shuffled = shuffleDeck(remainingDeck, rng)
    let cursor = 0
    const opponentHoles: Card[][] = []
    for (let o = 0; o < opponentCount; o++) {
      opponentHoles.push([shuffled[cursor++], shuffled[cursor++]])
    }
    const fullBoard = [...board]
    for (let b = 0; b < boardSlotsNeeded; b++) fullBoard.push(shuffled[cursor++])

    const myStrength = bestHand([...hole, ...fullBoard])
    let bestStrength = myStrength
    let winners = 1
    let iAmWinner = true
    for (const oppHole of opponentHoles) {
      const oppStrength = bestHand([...oppHole, ...fullBoard])
      const cmp = compareHandStrength(oppStrength, bestStrength)
      if (cmp > 0) {
        bestStrength = oppStrength
        winners = 1
        iAmWinner = false
      } else if (cmp === 0) {
        winners += 1
      }
    }
    if (iAmWinner) winShare += 1 / winners
  }
  return winShare / iterations
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

/** Whales misjudge their hand wildly, chase almost anything, and splash around. */
const WHALE_EXTRA_NOISE = 0.25
/** A whale calls well below the break-even price — that leak is the whole point. */
const WHALE_CALL_SLACK = 0.55
const WHALE_EXTRA_BLUFF_CHANCE = 0.12

/**
 * Decides one action.
 *
 * The rule that matters: whether to *continue* is settled by perceived equity
 * against the pot odds and nothing else. Bluffing is a betting decision, so it
 * can only ever turn a check into a bet or a cheap call into a raise — it can
 * never rescue a hand that the price says to fold. (It used to, which let a
 * 3-12% roll call off an entire stack with any two cards.)
 */
export function decideAiAction(ctx: AiDecisionContext, rng: Rng): Action {
  const isWhale = ctx.archetype === 'whale'
  const trueEquity = estimateEquity(
    ctx.hole,
    ctx.board,
    ctx.opponentsInHand,
    rng,
    EQUITY_ITERATIONS[ctx.skillTier],
  )
  const noise = EQUITY_NOISE[ctx.skillTier] + (isWhale ? WHALE_EXTRA_NOISE : 0)
  const perceivedEquity = clamp01(trueEquity + (rng() - 0.5) * 2 * noise)
  const raiseThreshold = RAISE_THRESHOLD[ctx.skillTier]

  // Whales are looser than even the worst disciplined player, but the two
  // leaks don't stack: take whichever slack is wider.
  const callSlack = isWhale
    ? Math.min(WHALE_CALL_SLACK, CALL_SLACK[ctx.skillTier])
    : CALL_SLACK[ctx.skillTier]

  const bluffRoll = rng() < BLUFF_CHANCE[ctx.skillTier] + (isWhale ? WHALE_EXTRA_BLUFF_CHANCE : 0)
  // Bluffing is only on the table when it is cheap: facing nothing, or a small
  // bet relative to the pot, and never when calling would already be all-in.
  const priceIsSmall =
    ctx.allInTo > ctx.currentBet &&
    (ctx.toCall <= 0 || ctx.toCall <= ctx.potSize * BLUFF_MAX_PRICE_AS_POT_FRACTION)
  const wantsToBluff = bluffRoll && priceIsSmall

  /** Pot-fraction sizing, so a raise is proportionate to what is being fought over. */
  const raiseTo = () => {
    const potAfterCall = ctx.potSize + ctx.toCall
    const betSize = Math.round(potAfterCall * (RAISE_POT_FRACTION_MIN + rng() * RAISE_POT_FRACTION_SPAN))
    const cap = Math.max(ctx.minRaiseTo, Math.round(ctx.allInTo * MAX_RAISE_STACK_FRACTION))
    let to = Math.min(ctx.currentBet + betSize, cap)
    if (to >= ctx.allInTo * SHOVE_SNAP_FRACTION) to = ctx.allInTo
    return Math.min(Math.max(to, ctx.minRaiseTo), ctx.allInTo)
  }

  if (ctx.toCall <= 0) {
    if (perceivedEquity > raiseThreshold || wantsToBluff) {
      return { type: 'raise', to: raiseTo() }
    }
    return { type: 'check' }
  }

  const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall)
  if (perceivedEquity < potOdds * callSlack) {
    return { type: 'fold' }
  }
  if (perceivedEquity > raiseThreshold || wantsToBluff) {
    return { type: 'raise', to: raiseTo() }
  }
  return { type: 'call' }
}
