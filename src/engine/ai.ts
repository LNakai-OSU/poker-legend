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
  /**
   * True when this player made the last aggressive action on the previous
   * street. A player who raised and then checks the flop has told the table
   * they missed; continuation betting is what stops that happening.
   */
  wasPreviousStreetAggressor?: boolean
  /**
   * Live opponents still to act behind this seat on this street; 0 means last
   * word. Undefined preflop, where the blinds make the orbit a different shape
   * and position matters far less to a betting decision.
   */
  opponentsToActAfter?: number
  /**
   * The big blind, so an unopened preflop pot can be told apart from a raised
   * one: facing nothing but the blind is an *opening* decision even though
   * there is technically a bet to call.
   */
  bigBlind?: number
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
  novice: 0.82,
  amateur: 0.85,
  competent: 0.9,
  sharp: 0.95,
  elite: 0.98,
}

/**
 * Nobody calls a big bet holding literally nothing, however loose they are.
 *
 * Slack alone is a *proportion* of the price, so at long odds it approves calls
 * on almost no equity at all, and a table of novices — where every seat does that
 * every street — stopped being poker: six-way, every hand, average pot 150 big
 * blinds on 100 big blind stacks. Real loose players are loose about marginal
 * hands, not about air. This floor only ever applies when the bet is a serious
 * fraction of the pot, so a cheap call at genuinely long odds is still correct.
 */
const AIR_FOLD_EQUITY = 0.2
const AIR_FOLD_MIN_BET_TO_POT = 0.4

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
 * often to be worth calling. Whales pay no premium at all.
 *
 * It grows with skill, because reading that message is what a better player
 * does — but it only engages at all once the bet is *large* relative to the pot
 * (see `BLUFF_CATCH_MIN_BET_TO_POT`). Applied to ordinary bets as well, it
 * double-counted `RANGE_READING`, which already narrows the bettor's range
 * inside the equity estimate: an elite demanded up to 27% over the break-even
 * price on top of an equity figure computed against the opponent's top 62% of
 * hands, and so folded to a routine half-pot bet on every street. A table of
 * them reached a flop on 31% of hands and a showdown on 3%, which is a folding
 * contest rather than a poker game. Below the threshold the price is the whole
 * story, which is correct: pot odds answer a normal bet on their own.
 */
const BLUFF_CATCH_PREMIUM: Record<SkillTier, number> = {
  novice: 0.02,
  amateur: 0.06,
  competent: 0.12,
  sharp: 0.2,
  elite: 0.27,
}

/**
 * The bet-to-pot ratio below which no premium applies, because a bet of ordinary
 * size carries little information: it is made with value hands and bluffs alike,
 * and the price already accounts for it.
 *
 * Set below half-pot, which is the routine bet this is meant to stop punishing. A
 * pot-size bet still earns most of the premium and a shove earns all of it —
 * those genuinely are strong, and a player who calls them down with middle pair
 * can be bet at with impunity.
 */
const BLUFF_CATCH_MIN_BET_TO_POT = 0.3

/**
 * How much of the premium applies on each street.
 *
 * A bet means more the later it comes. On the river it is final: there is no card
 * left to improve with, so a big bet is genuinely polarised and a marginal made
 * hand is a fold. On the flop the same bet is far weaker information, and a hand
 * that folds to it has thrown away two streets of playability it had already paid
 * for. Weighting these equally is what produced a table of sharp players who
 * folded the flop every time and reached a showdown on 3% of hands, while *also*
 * calling down river shoves — exactly backwards on both counts.
 */
const BLUFF_CATCH_STREET_WEIGHT: Record<Street, number> = {
  preflop: 0.2,
  flop: 0.3,
  turn: 0.55,
  river: 1,
  // Nobody acts at showdown, but the map has to be total or the lookup is
  // `undefined` and the whole requirement silently becomes NaN.
  showdown: 1,
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

/**
 * Opening a street is sized smaller than raising into one: a third to two
 * thirds of the pot. Betting every street at full pot would turn every hand into
 * an all-in, which is the opposite problem to the one continuation betting
 * fixes — a shallow table would just trade stacks instead of playing poker.
 */
const BET_POT_FRACTION_MIN = 0.33
const BET_POT_FRACTION_SPAN = 0.3

/** Why a bet is being made, which is what decides how big it should be. */
export type BetPurpose = 'value' | 'thin' | 'bluff'

/**
 * The sizings a player actually chooses between, as fractions of the pot.
 *
 * Drawing uniformly from a single narrow band — a third to two thirds of the pot,
 * on every street, for every hand — meant a bet carried no information at all.
 * Across 211 observed opening bets not one exceeded 80% of the pot and there were
 * no overbets and no shoves, so a player could never be polarised at, never
 * induced, and never faced with the decision that makes bet sizing interesting.
 *
 * A strong hand wants a big pot and a thin one wants a small pot; a bluff wants to
 * look like the strong hand, which is why it borrows the same large sizings. The
 * river is where ranges are most polarised, so the big sizings get more weight
 * there and the small ones less.
 */
const BET_SIZINGS: { fraction: number; value: number; thin: number; bluff: number }[] = [
  { fraction: 0.25, value: 1, thin: 4, bluff: 1 },
  { fraction: 0.33, value: 2, thin: 5, bluff: 2 },
  { fraction: 0.5, value: 4, thin: 4, bluff: 3 },
  { fraction: 0.75, value: 5, thin: 1, bluff: 4 },
  { fraction: 1, value: 3, thin: 0, bluff: 3 },
  { fraction: 1.5, value: 1, thin: 0, bluff: 1 },
  // The player's own buttons offer 1½x and 2x pot, so opponents have to be able
  // to make those bets too — otherwise the player's overbet is never answered in
  // kind and an overbet facing them is, by itself, a reliable tell.
  { fraction: 2, value: 1, thin: 0, bluff: 1 },
  { fraction: 2.5, value: 0.5, thin: 0, bluff: 0.6 },
]

/**
 * How far a chosen sizing is nudged either side of its nominal fraction.
 *
 * Without it every bet in the game landed on one of a handful of exact pot
 * fractions, which is itself readable: a table where bets are only ever 0.5 or
 * 0.75 of the pot tells you which one you are facing.
 */
const SIZING_JITTER = 0.1

/**
 * How much of the big sizings a tier actually has in its game.
 *
 * Overbetting is an expert tool: it only works if you have a polarised range and
 * a reason to think it will be called or folded to correctly. Letting every tier
 * fire 2.5x pot handed the *weakest* opponents the strongest weapon, and it
 * inverted the whole difficulty curve — a straightforward tight-aggressive bot
 * that calls on pot odds alone lost 103bb/100 to novices while beating elites for
 * 6bb/100, which makes the late game easier than the first casino.
 */
const OVERBET_APTITUDE: Record<SkillTier, number> = {
  novice: 0.08,
  amateur: 0.2,
  competent: 0.45,
  sharp: 0.75,
  elite: 1,
}

/** Sizings above this count as overbets for the purposes of the above. */
const OVERBET_THRESHOLD = 1

/**
 * How much of a bluffing urge survives on the river, where a real betting range
 * is about three-quarters value.
 */
const RIVER_BLUFF_DAMPING = 0.3

/** How much the big sizings are favoured on each street. 1 is neutral. */
const SIZING_POLARITY: Record<Street, number> = {
  preflop: 0.5,
  flop: 0.8,
  turn: 1,
  river: 1.6,
  showdown: 1,
}

/**
 * Preflop has its own ladder, because pot fractions do not describe it: an open
 * is a multiple of the big blind, and a re-raise is a multiple of the open. Flat
 * pot-fraction sizing made a three-bet the same size as an open, so the two were
 * indistinguishable.
 */
const PREFLOP_OPEN_BB = [2.2, 2.5, 3, 3.5]
const PREFLOP_RERAISE_MULTIPLE = { inPosition: 3, outOfPosition: 4 }

/**
 * What a bet is for, from the strength behind it. A hand that is clearly best
 * bets for value and wants a big pot; a marginal one bets thin and wants a small
 * one; anything below the point where checking would be ahead is a bluff.
 */
function purposeFor(
  ctx: AiDecisionContext,
  perceivedEquity: number,
  raiseThreshold: number,
): BetPurpose {
  const evenShare = 1 / (ctx.opponentsInHand + 1)
  if (perceivedEquity >= raiseThreshold) return 'value'
  if (perceivedEquity >= evenShare) return 'thin'
  return 'bluff'
}

function pickBetFraction(ctx: AiDecisionContext, purpose: BetPurpose, rng: Rng): number {
  if (ctx.street === 'preflop' && ctx.bigBlind !== undefined && ctx.bigBlind > 0) {
    const potAfterCall = Math.max(1, ctx.potSize + ctx.toCall)
    const opening = ctx.currentBet <= ctx.bigBlind
    const target = opening
      ? ctx.bigBlind * PREFLOP_OPEN_BB[Math.floor(rng() * PREFLOP_OPEN_BB.length)]
      : ctx.currentBet *
        ((ctx.opponentsToActAfter ?? 0) > 0
          ? PREFLOP_RERAISE_MULTIPLE.outOfPosition
          : PREFLOP_RERAISE_MULTIPLE.inPosition)
    // Expressed back as a pot fraction, since that is what the caller adds on.
    return Math.max(0.1, (target - ctx.currentBet) / potAfterCall)
  }

  const polarity = SIZING_POLARITY[ctx.street]
  const weights = BET_SIZINGS.map((sizing) => {
    const base = sizing[purpose]
    // Polarity pushes weight toward the sizings furthest from half-pot.
    const distance = Math.abs(sizing.fraction - 0.5)
    const aptitude =
      sizing.fraction > OVERBET_THRESHOLD ? OVERBET_APTITUDE[ctx.skillTier] : 1
    return base * Math.pow(polarity, distance * 2) * aptitude
  })
  const total = weights.reduce((sum, w) => sum + w, 0)
  if (total <= 0) return BET_POT_FRACTION_MIN + rng() * BET_POT_FRACTION_SPAN

  const jittered = (fraction: number) =>
    Math.max(0.1, fraction * (1 - SIZING_JITTER + rng() * SIZING_JITTER * 2))

  let roll = rng() * total
  for (let i = 0; i < BET_SIZINGS.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return jittered(BET_SIZINGS[i].fraction)
  }
  return jittered(BET_SIZINGS[BET_SIZINGS.length - 1].fraction)
}
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

/**
 * Every starting hand's score, sorted, so a holding can be placed as a
 * percentile of the 1,326 combinations rather than judged on a raw number.
 * Built once: 1,326 cheap scores.
 */
const PREFLOP_SCORE_LADDER: number[] = (() => {
  const deck = createDeck()
  const scores: number[] = []
  for (let i = 0; i < deck.length; i++) {
    for (let j = i + 1; j < deck.length; j++) {
      scores.push(preflopScore([deck[i], deck[j]]))
    }
  }
  return scores.sort((a, b) => a - b)
})()

/**
 * Where a starting hand ranks, as a fraction in [0,1] where 1 is the best hand
 * in the deck.
 */
export function preflopPercentile(hole: Card[]): number {
  const score = preflopScore(hole)
  let low = 0
  let high = PREFLOP_SCORE_LADDER.length
  while (low < high) {
    const mid = (low + high) >> 1
    if (PREFLOP_SCORE_LADDER[mid] < score) low = mid + 1
    else high = mid
  }
  return low / PREFLOP_SCORE_LADDER.length
}

/**
 * Roughly what fraction of starting hands a tier is willing to put money in
 * with, before position and the price tighten it further.
 *
 * This is the concept the AI was missing entirely. Pot odds alone will call a
 * blind with any two cards — a random hand has about a third of the equity
 * three-handed, and the small blind only has to beat a quarter — so every hand
 * was played, only 7% of them ended before a flop, and the average pot was over
 * 100 big blinds. Real low-stakes hold'em folds most hands before the flop,
 * because what matters is not this one price but whether the hand can keep
 * playing profitably on three more streets.
 */
/*
 * The spread between tiers here is deliberately almost flat, which is both
 * realistic and necessary.
 *
 * Realistic, because what separates a good player from a bad one is mostly
 * *postflop* — reading a range, pricing a call, catching a bluff, betting for
 * thin value — all of which is modelled elsewhere. The number of hands they play
 * differs far less than people assume, and short-handed everyone plays a lot.
 *
 * Necessary, because folds compound across a table: with every seat gated
 * independently, dropping this from 0.64 to 0.45 took the share of hands that
 * never reach a flop from 40% to 79%. A wide spread does not read as the good
 * players being disciplined; it reads as an empty table where no poker happens.
 */
const PREFLOP_RANGE: Record<SkillTier, number> = {
  novice: 0.72,
  amateur: 0.68,
  competent: 0.65,
  sharp: 0.63,
  elite: 0.61,
}

/**
 * How much a raise in front narrows the range, per big blind of raise size.
 *
 * This has to scale with the size of the raise rather than being one flat
 * discount for "there was a raise". Flat, it punished the aggressive tiers
 * twice: they raise more, so they faced more raises, so they folded more, and a
 * table of sharp players saw a flop on one hand in six. A min-raise is cheap
 * information and barely narrows anything; a big three-bet narrows a lot.
 */
const PREFLOP_RANGE_PER_BB_RAISED = 0.055
/** Even the largest re-raise leaves a range this wide — nobody folds everything. */
const PREFLOP_RANGE_VS_RAISE_FLOOR = 0.45

/** Out of position, it tightens again: a weak hand plays badly from the front. */
const PREFLOP_RANGE_OUT_OF_POSITION = 0.88

/**
 * Seat-count adjustment, as `WIDENING - PER_OPPONENT * opponents`: about 1.4x
 * three-handed down to 0.95x at a full table. The base ranges above are written
 * for six-handed, which is where most of the ladder sits.
 */
const SEAT_RANGE_WIDENING = 1.18
const SEAT_RANGE_PER_OPPONENT = 0.06

/**
 * The share of starting hands this player will commit chips with in this spot,
 * or 1 for a whale, who is the one person at the table genuinely playing
 * everything.
 */
export function preflopRange(ctx: AiDecisionContext, isWhale: boolean): number {
  if (isWhale) return 1
  let range = PREFLOP_RANGE[ctx.skillTier]
  if (ctx.bigBlind !== undefined && ctx.currentBet > ctx.bigBlind) {
    const raisedBy = (ctx.currentBet - ctx.bigBlind) / ctx.bigBlind
    range *= Math.max(PREFLOP_RANGE_VS_RAISE_FLOOR, 1 - raisedBy * PREFLOP_RANGE_PER_BB_RAISED)
  }
  if ((ctx.opponentsToActAfter ?? 0) > 0) range *= PREFLOP_RANGE_OUT_OF_POSITION
  // Short-handed, ranges widen: with two opponents there is far less chance
  // somebody behind holds a real hand, and the blinds come round three times as
  // often, so folding everything but premiums is not patience but a leak. A flat
  // range made the high tiers fold 85% of hands three-handed, which is a table
  // nobody is playing at.
  range *= SEAT_RANGE_WIDENING - SEAT_RANGE_PER_OPPONENT * ctx.opponentsInHand
  return clamp01(range)
}

/** Whether this hand is inside the range the player plays from this seat. */
export function isPlayablePreflop(ctx: AiDecisionContext, isWhale: boolean): boolean {
  if (ctx.street !== 'preflop' || ctx.hole.length < 2) return true
  return preflopPercentile(ctx.hole) >= 1 - preflopRange(ctx, isWhale)
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

// --- Betting when nobody has bet --------------------------------------------
// The AI used to open a street only when it held a 60-75% hand or a flat 3-12%
// bluff roll fired, which meant a checked-down pot was almost always free: over
// a measured 400-hand sample at 1/2 the player faced a flop bet 22% of the time
// and 69% of hands went to showdown. Real low-stakes poker is 20-25%.
//
// Betting is modelled as a *frequency* assembled from the three reasons to bet,
// combined as independent chances rather than a single threshold:
//
//  1. Value, on a ramp. There is no 60% cliff: a hand starts betting as soon as
//     it is better than the opponent's average holding, and bets nearly always
//     once it is clearly ahead. Better players value-bet thinner.
//  2. Continuation, i.e. the previous street's aggressor firing again whatever
//     they hit. This is the single biggest source of postflop action in real
//     poker, and its absence is why pots sat at 20 through three streets.
//  3. Fold equity from position: having the last word, and facing fewer
//     opponents, is what makes a bet without a hand profitable.

// The value ramp is expressed as a multiple of an equal share of the pot
// (1/(opponents+1)) rather than an absolute number, because "am I ahead of the
// field" is the question a value bet actually asks: 40% equity is a monster
// four-handed and a fold heads-up. An absolute threshold meant that preflop,
// where no hand has 60% against two opponents, nothing was ever worth a raise.

/** Equity, as a multiple of an equal share, at which a bet is pure value. */
const VALUE_BET_CEILING_MULT: Record<SkillTier, number> = {
  novice: 1.42,
  amateur: 1.34,
  competent: 1.26,
  sharp: 1.18,
  elite: 1.12,
}

/** Equity, as a multiple of an equal share, below which a bet is a bluff. */
const VALUE_BET_FLOOR_MULT: Record<SkillTier, number> = {
  novice: 1,
  amateur: 0.94,
  competent: 0.88,
  sharp: 0.82,
  elite: 0.76,
}

/** How often the top of the value range actually fires, rather than trapping. */
const MAX_VALUE_BET_FREQUENCY = 0.92

/** How often last street's aggressor continues, before board and table adjustments. */
const CONTINUATION_BET: Record<SkillTier, number> = {
  novice: 0.34,
  amateur: 0.44,
  competent: 0.53,
  sharp: 0.6,
  elite: 0.66,
}

/**
 * Each barrel after the flop gets rarer: by the turn the hands that called a
 * flop bet are a real range, and firing into it with nothing stops working.
 */
const BARREL_DECAY = 0.72

/** Every extra opponent is another hand that has to fold, so bluffs shrink. */
const FOLD_EQUITY_DECAY = 0.72

/**
 * Betting a postflop pot nobody has shown any strength in. A limped or
 * checked-through pot is the softest spot in poker — every range in it is wide
 * and uncoordinated — and leaving it uncontested is exactly how a table ends up
 * checking hands down for three streets.
 */
const OPEN_STAB: Record<SkillTier, number> = {
  novice: 0.18,
  amateur: 0.24,
  competent: 0.3,
  sharp: 0.35,
  elite: 0.4,
}

/** Extra betting frequency for having the last word on the street. */
const POSITION_BET_BONUS: Record<SkillTier, number> = {
  novice: 0.04,
  amateur: 0.07,
  competent: 0.11,
  sharp: 0.14,
  elite: 0.17,
}

/**
 * A whale bets a lot and for no reason at all. Keeping them loose *and* bad
 * means a high flat frequency rather than a better read of when to bet.
 */
const WHALE_BET_FREQUENCY = 0.55

/**
 * Raising into a bet is a bigger commitment than opening one, so the same read
 * fires less often — and it is only on the table at a cheap price at all (see
 * `isOpeningSpot`), never as a way to talk itself into a shove.
 */
const RAISE_INTO_BET_SCALE = 0.6

/**
 * How often a hand past the raise threshold actually raises rather than calling.
 *
 * Below 1 so that calling is a real action with a strong hand. Better players
 * mix more, because flatting to keep a worse hand in — or to control the pot from
 * out of position — is a decision rather than timidity.
 */
const RAISE_WITH_STRENGTH_FREQUENCY: Record<SkillTier, number> = {
  novice: 0.5,
  amateur: 0.55,
  competent: 0.6,
  sharp: 0.62,
  elite: 0.65,
}

/**
 * Whether a bet to call is really an *opening* decision: facing nothing but the
 * blind preflop, or a small stab postflop that a raise still prices in cheaply.
 */
function isOpeningSpot(ctx: AiDecisionContext): boolean {
  if (ctx.street === 'preflop') {
    return ctx.bigBlind !== undefined && ctx.currentBet <= ctx.bigBlind
  }
  return ctx.board.length >= 3 && ctx.toCall <= ctx.potSize * BLUFF_MAX_PRICE_AS_POT_FRACTION
}

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
  const read = RANGE_READING[ctx.skillTier] * Math.min(1, betToPotRatio(ctx) / FULL_READ_BET_TO_POT)
  const damped = ctx.street === 'preflop' ? read * PREFLOP_RANGE_READ_DAMPING : read
  // You cannot read somebody for a narrower range than they actually bet.
  return Math.min(damped, MAX_RANGE_READ_BY_STREET[ctx.street])
}

/**
 * The narrowest range a bet on each street can credibly represent.
 *
 * Without this ceiling the strongest tiers read a flop bet as the bettor's top
 * 38% of hands — but a player who continuation-bets 60% of flops is betting 60% of
 * their hands, so crediting them with only the best 38% is arithmetically
 * impossible and simply wrong. Two elites would therefore each fold to the other's
 * routine bet, and a table of them reached a showdown on 9% of hands against about
 * a quarter in real short-handed play. Later streets allow a narrower read because
 * a range that has survived more betting genuinely is narrower.
 */
const MAX_RANGE_READ_BY_STREET: Record<Street, number> = {
  preflop: 0.35,
  flop: 0.42,
  turn: 0.55,
  river: 0.65,
  showdown: 0.65,
}

/**
 * How much of a range read survives being applied before the flop.
 *
 * Preflop a raise is very weak information: it is made with a quarter to a third
 * of all hands, and it is cheap relative to the pot it is raising, so the
 * bet-to-pot ratio reads as enormous. Undamped, the sharp tiers concluded that
 * anyone who opened held a premium, computed their own equity against that, and
 * folded — four hands in five never reached a flop at an elite table. The read
 * belongs on the later streets, where a bet actually means something.
 */
const PREFLOP_RANGE_READ_DAMPING = 0.3

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
  const betPressure = Math.max(
    0,
    Math.min(BLUFF_CATCH_MAX_BET_TO_POT, betToPotRatio(ctx)) - BLUFF_CATCH_MIN_BET_TO_POT,
  )
  const premium =
    BLUFF_CATCH_PREMIUM[ctx.skillTier] *
    BLUFF_CATCH_STREET_WEIGHT[ctx.street] *
    betPressure *
    rng() *
    BLUFF_CATCH_SPREAD
  // The cap only ever trims the premium: a price that is already above it (a
  // huge overbet shove) still has to be beaten on its own terms.
  const demanded = Math.max(priced, Math.min(MAX_CALL_REQUIREMENT, priced + premium))
  // ...and against a real bet, air is folded regardless of the price.
  const floor = betToPotRatio(ctx) >= AIR_FOLD_MIN_BET_TO_POT ? AIR_FOLD_EQUITY : 0
  return Math.max(demanded, floor)
}

/** Chance that independent reasons, each with its own probability, all fail. */
function anyOf(...chances: number[]): number {
  return clamp01(1 - chances.reduce((product, p) => product * (1 - clamp01(p)), 1))
}

/**
 * How often this player opens the betting on this street, given what they think
 * of their hand. See the section above for where each term comes from.
 */
export function openBetFrequency(
  ctx: AiDecisionContext,
  perceivedEquity: number,
  isWhale: boolean,
): number {
  const tier = ctx.skillTier
  const opponents = Math.max(1, ctx.opponentsInHand)
  const evenShare = 1 / (opponents + 1)
  const floor = evenShare * VALUE_BET_FLOOR_MULT[tier]
  const ceiling = evenShare * VALUE_BET_CEILING_MULT[tier]
  const valueWeight = clamp01((perceivedEquity - floor) / Math.max(0.01, ceiling - floor))
  const value = MAX_VALUE_BET_FREQUENCY * valueWeight

  const foldEquity = FOLD_EQUITY_DECAY ** (opponents - 1)

  const barrels = ctx.street === 'turn' ? 1 : ctx.street === 'river' ? 2 : 0
  const postflop = ctx.board.length >= 3
  const continuation = ctx.wasPreviousStreetAggressor
    ? CONTINUATION_BET[tier] * BARREL_DECAY ** barrels * foldEquity
    : postflop
      ? OPEN_STAB[tier] * BARREL_DECAY ** barrels * foldEquity
      : 0

  const stab = (BLUFF_CHANCE[tier] + (isWhale ? WHALE_EXTRA_BLUFF_CHANCE : 0)) * foldEquity

  const position = ctx.opponentsToActAfter === 0 ? POSITION_BET_BONUS[tier] * foldEquity : 0

  // Continuation bets, stabs and positional bets are all made without a hand, so
  // on the river — where there is no card to come and the bluff has to simply
  // work — they are damped hard. Left at full strength, half of all river bets
  // were made with high card or a bare pair, which makes a river bet mean nothing
  // at all: it cannot be folded to correctly and it cannot bluff anyone.
  const bluffing = perceivedEquity < evenShare
  const damping = bluffing && ctx.street === 'river' ? RIVER_BLUFF_DAMPING : 1

  return anyOf(
    value,
    continuation * damping,
    stab * damping,
    position * damping,
    isWhale ? WHALE_BET_FREQUENCY : 0,
  )
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
  const raiseTo = (purpose: BetPurpose = 'value') => {
    const potAfterCall = ctx.potSize + ctx.toCall
    const fraction = pickBetFraction(ctx, purpose, rng)
    const betSize = Math.round(potAfterCall * fraction)
    const cap = Math.max(ctx.minRaiseTo, Math.round(ctx.allInTo * MAX_RAISE_STACK_FRACTION))
    let to = Math.min(ctx.currentBet + betSize, cap)
    if (to >= ctx.allInTo * SHOVE_SNAP_FRACTION) to = ctx.allInTo
    return Math.min(Math.max(to, ctx.minRaiseTo), ctx.allInTo)
  }

  // Hand selection, before any price is considered. A hand outside the range
  // this player opens from this seat is not raised with and not called with; it
  // is checked if that is free and folded if it is not.
  const playable = isPlayablePreflop(ctx, isWhale)

  if (ctx.toCall <= 0) {
    // Nothing to call: this is an opening decision, settled on a frequency
    // rather than a threshold, so thin value and continuation bets both exist.
    if (playable && rng() < openBetFrequency(ctx, perceivedEquity, isWhale)) {
      return { type: 'raise', to: raiseTo(purposeFor(ctx, perceivedEquity, raiseThreshold)) }
    }
    return { type: 'check' }
  }

  if (!playable) return { type: 'fold' }

  if (perceivedEquity < callRequirement(ctx, callSlack, isWhale, rng)) {
    return { type: 'fold' }
  }
  // A hand strong enough to raise is not raised *every* time. Flatting a strong
  // hand to keep a worse one in, or to keep the pot small out of position, is
  // ordinary poker, and raising every time instead turned every made hand into a
  // bet-or-fold contest where calling barely existed as an action.
  if (perceivedEquity > raiseThreshold && rng() < RAISE_WITH_STRENGTH_FREQUENCY[ctx.skillTier]) {
    return { type: 'raise', to: raiseTo('value') }
  }
  if (wantsToBluff) {
    return { type: 'raise', to: raiseTo('bluff') }
  }
  // An unopened *preflop* pot is an opening dressed up as a bet to call: treating
  // it as calls-only is what left a table where nobody ever raised before the
  // flop, so every hand went three-handed to a showdown. Postflop the same
  // fallback was doing real damage — any bet under a third of the pot reopened
  // the raise branch, so the cheap bets that should be called were raised
  // instead, and a turn bet was answered by a raise or a fold and almost never
  // by a call.
  if (
    ctx.street === 'preflop' &&
    isOpeningSpot(ctx) &&
    rng() < openBetFrequency(ctx, perceivedEquity, isWhale) * RAISE_INTO_BET_SCALE
  ) {
    return { type: 'raise', to: raiseTo(purposeFor(ctx, perceivedEquity, raiseThreshold)) }
  }
  return { type: 'call' }
}
