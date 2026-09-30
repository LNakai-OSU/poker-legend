import { createDeck } from './deck'
import { bestHand, compareHandStrength } from './handRank'
import type { Rng } from './rng'
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
 * How much of an opponent's range a tier discounts when it faces aggression.
 * Someone firing a pot-sized bet usually has something, and pricing that in is
 * the single biggest thing separating a strong player from one who only ever
 * compares its own hand to a uniformly random opponent. 0.62 means an elite
 * player facing a pot-sized bet reads the bettor for their top 38% of holdings;
 * a novice barely adjusts at all.
 */
const RANGE_READING: Record<SkillTier, number> = {
  novice: 0.04,
  amateur: 0.14,
  competent: 0.3,
  sharp: 0.5,
  elite: 0.62,
}

/** The bet-to-pot ratio at which a tier applies its full range read. */
const FULL_READ_BET_TO_POT = 1

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

/**
 * Extra equity, on top of the break-even price, a tier demands per unit of
 * bet-to-pot before it will call.
 *
 * Pot odds alone answer "how often do I have to win", never "how often am I
 * actually being bluffed". A player who only checks the price calls every
 * bluff-catcher, which means an opponent can bet the maximum with every strong
 * hand and never be wrong: they are always paid in full and can never be folded
 * out. The correction is a bluff-catch premium that grows with the size of the
 * bet — a bigger bet is a stronger range, and it also needs to be bluffing more
 * often to be worth calling — and that grows with skill, because reading that
 * message is exactly what a better player does. Whales pay no premium at all.
 */
const BLUFF_CATCH_PREMIUM: Record<SkillTier, number> = {
  novice: 0.02,
  amateur: 0.06,
  competent: 0.12,
  sharp: 0.2,
  elite: 0.27,
}

/** Past this bet-to-pot ratio the message is already "I have it"; it stops scaling. */
const BLUFF_CATCH_MAX_BET_TO_POT = 2.5

/**
 * Bluff-catching is a mixed decision, not a threshold: how much credit you give
 * *this* bet varies, so the same spot is sometimes a call and sometimes a fold.
 * The premium is drawn uniformly over 0..2x its tier value, which turns the
 * call/fold line into a frequency — the thing an opponent cannot simply pick a
 * single bet size to beat.
 */
const BLUFF_CATCH_SPREAD = 2

/**
 * However big the bet, nobody folds a hand that beats essentially everything:
 * the premium can never push the requirement past this, so the nuts always call.
 */
const MAX_CALL_REQUIREMENT = 0.72

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

// --- Opponent range modelling ----------------------------------------------
// Sampling opponents uniformly at random is only correct when the opponent has
// shown nothing. Once they bet, their range is no longer every hand they could
// hold, and an equity estimate that ignores that is systematically too
// optimistic. These helpers let a caller reject the weak tail of the range.

/** Longest tiebreak any hand category produces (flush / high card kickers). */
const TIEBREAK_SLOTS = 5
/** One above the highest rank, so tiebreaks pack into a single monotone number. */
const TIEBREAK_BASE = 15

/** Total order over made hands, so holdings can be sorted and cut at a quantile. */
function madeHandScore(hole: Card[], board: Card[]): number {
  const strength = bestHand([...hole, ...board])
  let score = strength.category
  for (let i = 0; i < TIEBREAK_SLOTS; i++) {
    score = score * TIEBREAK_BASE + (strength.tiebreak[i] ?? 0)
  }
  return score
}

/** Cheap pre-flop ordering: high cards, then pairs, suitedness and connectedness. */
function preflopScore(hole: Card[]): number {
  const hi = Math.max(hole[0].rank, hole[1].rank)
  const lo = Math.min(hole[0].rank, hole[1].rank)
  let score = hi * 2 + lo
  if (hi === lo) score += 22
  else score -= Math.min(hi - lo - 1, 4) * 2
  if (hole[0].suit === hole[1].suit) score += 4
  return score
}

/** How strong a holding is *right now*, which is all an opponent can have acted on. */
function holdingStrength(hole: Card[], board: Card[]): number {
  return board.length >= 3 ? madeHandScore(hole, board) : preflopScore(hole)
}

/** Holdings sampled to calibrate the quantile cut-off for a narrowed range. */
const RANGE_CALIBRATION_SAMPLES = 120
/** Redraws allowed per opponent before a below-range holding is accepted anyway. */
const RANGE_DRAW_ATTEMPTS = 6
/** Nobody reads an opponent for only their very best hands, however big the bet. */
const MAX_RANGE_PERCENTILE = 0.8

/**
 * The strength a holding has to beat to be inside the top `1 - percentile` of
 * the range, estimated from a sample rather than a table so it stays correct on
 * any board texture.
 */
function rangeFloorScore(deck: Card[], board: Card[], rng: Rng, percentile: number): number {
  const scores: number[] = []
  for (let i = 0; i < RANGE_CALIBRATION_SAMPLES; i++) {
    const a = Math.min(deck.length - 1, Math.floor(rng() * deck.length))
    let b = Math.min(deck.length - 1, Math.floor(rng() * deck.length))
    if (b === a) b = (b + 1) % deck.length
    scores.push(holdingStrength([deck[a], deck[b]], board))
  }
  scores.sort((x, y) => x - y)
  return scores[Math.min(scores.length - 1, Math.floor(percentile * scores.length))]
}

export interface EquityOptions {
  /**
   * Narrows the opponents' range: holdings below this percentile of the range
   * are rejected and redrawn, so 0.6 means "assume they hold their top 40%".
   * 0 (the default) samples opponents uniformly at random.
   */
  opponentRangePercentile?: number
}

/**
 * Monte Carlo win-probability estimate: deals cards for the opponents and the
 * remaining board many times and checks how often this hand wins (ties split
 * fractionally). This is the same technique real poker equity calculators use,
 * just with fewer iterations. Opponents are dealt at random unless the caller
 * asks for a tightened range, in which case weak holdings are rejected.
 */
export function estimateEquity(
  hole: Card[],
  board: Card[],
  opponentCount: number,
  rng: Rng,
  iterations: number,
  options?: EquityOptions,
): number {
  if (opponentCount <= 0) return 1

  const known = new Set([...hole, ...board].map((c) => `${c.rank}${c.suit}`))
  const remainingDeck = createDeck().filter((c) => !known.has(`${c.rank}${c.suit}`))
  const boardSlotsNeeded = 5 - board.length
  const deckSize = remainingDeck.length

  const percentile = Math.max(0, Math.min(MAX_RANGE_PERCENTILE, options?.opponentRangePercentile ?? 0))
  const narrowing = percentile > 0
  const rangeFloor = narrowing ? rangeFloorScore(remainingDeck, board, rng, percentile) : 0

  // Dealt by drawing indices rather than shuffling the whole deck, so a holding
  // outside the assumed range can be put back and redrawn.
  const used = new Uint8Array(deckSize)
  const draw = (): number => {
    let idx = Math.min(deckSize - 1, Math.floor(rng() * deckSize))
    while (used[idx]) idx = idx + 1 === deckSize ? 0 : idx + 1
    used[idx] = 1
    return idx
  }

  let winShare = 0
  for (let i = 0; i < iterations; i++) {
    used.fill(0)
    const opponentHoles: Card[][] = []
    for (let o = 0; o < opponentCount; o++) {
      let a = draw()
      let b = draw()
      for (let attempt = 1; narrowing && attempt < RANGE_DRAW_ATTEMPTS; attempt++) {
        if (holdingStrength([remainingDeck[a], remainingDeck[b]], board) >= rangeFloor) break
        used[a] = 0
        used[b] = 0
        a = draw()
        b = draw()
      }
      opponentHoles.push([remainingDeck[a], remainingDeck[b]])
    }
    const fullBoard = [...board]
    for (let b = 0; b < boardSlotsNeeded; b++) fullBoard.push(remainingDeck[draw()])

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

/** How big the bet in front of us is relative to the pot it was fired into. */
export function betToPotRatio(ctx: AiDecisionContext): number {
  if (ctx.toCall <= 0) return 0
  return ctx.toCall / Math.max(1, ctx.potSize - ctx.toCall)
}

/**
 * What the action in front of us says about the range we're up against.
 *
 * A check is no information at all. A bet is, and the bigger it is relative to
 * the pot the more it is: the read scales linearly up to a pot-sized bet and
 * then flattens, because past that point the message is already "I have
 * something". How much of that read a player actually uses is their skill tier.
 * Whales give nobody credit for anything — that leak is what makes them whales.
 */
export function inferredRangePercentile(ctx: AiDecisionContext, isWhale: boolean): number {
  if (isWhale || ctx.toCall <= 0) return 0
  return RANGE_READING[ctx.skillTier] * Math.min(1, betToPotRatio(ctx) / FULL_READ_BET_TO_POT)
}

/**
 * The equity a player actually demands before calling: the break-even price,
 * loosened by their calling discipline, then *tightened* by a bluff-catch
 * premium proportional to how big the bet is. Returns a threshold in [0, 1].
 */
export function callRequirement(
  ctx: AiDecisionContext,
  callSlack: number,
  isWhale: boolean,
  rng: Rng,
): number {
  const potOdds = ctx.toCall / (ctx.potSize + ctx.toCall)
  const priced = potOdds * callSlack
  if (isWhale) return priced
  const betPressure = Math.min(BLUFF_CATCH_MAX_BET_TO_POT, betToPotRatio(ctx))
  const premium = BLUFF_CATCH_PREMIUM[ctx.skillTier] * betPressure * rng() * BLUFF_CATCH_SPREAD
  // The cap only ever trims the premium: a price that is already above it (a
  // huge overbet shove) still has to be beaten on its own terms.
  return Math.max(priced, Math.min(MAX_CALL_REQUIREMENT, priced + premium))
}

/**
 * Decides one action.
 *
 * Whether to *continue* is settled by perceived equity against what the price
 * and the size of the bet together demand, and nothing else. Bluffing is a
 * betting decision, so it can only ever turn a check into a bet or a cheap call
 * into a raise — it can never rescue a hand that the price says to fold. (It
 * used to, which let a 3-12% roll call off an entire stack with any two cards.)
 */
export function decideAiAction(ctx: AiDecisionContext, rng: Rng): Action {
  const isWhale = ctx.archetype === 'whale'
  const trueEquity = estimateEquity(
    ctx.hole,
    ctx.board,
    ctx.opponentsInHand,
    rng,
    EQUITY_ITERATIONS[ctx.skillTier],
    { opponentRangePercentile: inferredRangePercentile(ctx, isWhale) },
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

  if (perceivedEquity < callRequirement(ctx, callSlack, isWhale, rng)) {
    return { type: 'fold' }
  }
  if (perceivedEquity > raiseThreshold || wantsToBluff) {
    return { type: 'raise', to: raiseTo() }
  }
  return { type: 'call' }
}
