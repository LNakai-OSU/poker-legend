import { createDeck } from './deck'
import { bestHand, compareHandStrength } from './handRank'
import type { Rng } from './rng'
import { shuffleDeck } from './deck'
import type { Action, Card, SkillTier, Street } from './types'

export interface AiDecisionContext {
  hole: Card[]
  board: Card[]
  potSize: number
  toCall: number
  minRaiseTo: number
  /** The 'to' value if this player commits their entire remaining stack. */
  allInTo: number
  opponentsInHand: number
  skillTier: SkillTier
  street: Street
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

export function decideAiAction(ctx: AiDecisionContext, rng: Rng): Action {
  const trueEquity = estimateEquity(
    ctx.hole,
    ctx.board,
    ctx.opponentsInHand,
    rng,
    EQUITY_ITERATIONS[ctx.skillTier],
  )
  const noise = EQUITY_NOISE[ctx.skillTier]
  const perceivedEquity = clamp01(trueEquity + (rng() - 0.5) * 2 * noise)

  const wantsToBluff = rng() < BLUFF_CHANCE[ctx.skillTier]
  const raiseTo = () => {
    const potSizedExtra = Math.round(ctx.potSize * (0.5 + rng() * 0.5))
    const to = Math.max(ctx.minRaiseTo, ctx.minRaiseTo + potSizedExtra - ctx.toCall)
    return Math.min(to, ctx.allInTo)
  }

  if (ctx.toCall <= 0) {
    if (perceivedEquity > RAISE_THRESHOLD[ctx.skillTier] || wantsToBluff) {
      return { type: 'raise', to: raiseTo() }
    }
    return { type: 'check' }
  }

  const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall)
  if (perceivedEquity < potOdds && !wantsToBluff) {
    return { type: 'fold' }
  }
  if (perceivedEquity > RAISE_THRESHOLD[ctx.skillTier] || wantsToBluff) {
    return { type: 'raise', to: raiseTo() }
  }
  return { type: 'call' }
}
