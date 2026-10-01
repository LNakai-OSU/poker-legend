import { describe, expect, it } from 'vitest'
import { TexasHoldEmTable } from './table'
import { decideAiAction, MIN_READ_SAMPLES, readAdjustment, type AiDecisionContext } from './ai'
import { generateTell } from './tells'
import { mulberry32 } from './rng'
import type { Archetype, Card, SkillTier } from './types'

/**
 * That the opponents are actually different people.
 *
 * Every opponent in the game used to play the same game with a different name
 * over their head: "Ray plays every hand he is dealt" and "Sully grinds small
 * pots" had action counts that were statistically indistinguishable, because the
 * only axis beyond skill was `regular | whale`. With nobody to learn there was no
 * reason to play the two hundredth hand rather than the twentieth.
 */

interface Profile {
  /** Share of hands they voluntarily put money in before the flop. */
  vpip: number
  /** Share of decisions that were a bet or a raise. */
  aggression: number
  /** Share of decisions that were a fold. */
  foldRate: number
  /** Share of decisions that were a call. */
  callRate: number
}

function profileTable(kinds: Archetype[], hands: number, seed: number): Record<string, Profile> {
  const BUY = 1000
  const players = kinds.map((kind) => ({
    id: kind,
    name: kind,
    isHuman: false,
    skillTier: 'competent' as SkillTier,
    startingStack: BUY,
    archetype: kind,
  }))
  const rng = mulberry32(seed)
  const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind: 10, rng })

  const counts: Record<string, { fold: number; call: number; aggressive: number; other: number }> = {}
  const vpipHands: Record<string, number> = {}
  for (const kind of kinds) {
    counts[kind] = { fold: 0, call: 0, aggressive: 0, other: 0 }
    vpipHands[kind] = 0
  }

  let played = 0
  while (played < hands) {
    for (const p of table.getState().players) if (p.stack <= 0) table.rebuy(p.id, BUY)
    table.startNewHand()
    played++
    const putMoneyIn = new Set<string>()

    let guard = 0
    while (table.getState().handInProgress && guard++ < 300) {
      const state = table.getState()
      const acting = state.actingPlayerId
      if (!acting) break
      const street = state.street
      const action = decideAiAction(table.getAiContext(acting)!, rng)
      const row = counts[acting]
      if (action.type === 'fold') row.fold++
      else if (action.type === 'call') row.call++
      else if (action.type === 'raise') row.aggressive++
      else row.other++
      if (street === 'preflop' && (action.type === 'call' || action.type === 'raise')) {
        putMoneyIn.add(acting)
      }
      table.submitAction(acting, action)
    }
    for (const id of putMoneyIn) vpipHands[id]++
  }

  const result: Record<string, Profile> = {}
  for (const kind of kinds) {
    const row = counts[kind]
    const total = row.fold + row.call + row.aggressive + row.other
    result[kind] = {
      vpip: vpipHands[kind] / played,
      aggression: row.aggressive / total,
      foldRate: row.fold / total,
      callRate: row.call / total,
    }
  }
  return result
}

describe('archetypes', () => {
  const kinds: Archetype[] = ['regular', 'nit', 'station', 'maniac']
  // Sampled, not exhaustive: the gaps being asserted are large, and a heavier run
  // here starves the rest of the suite and times out unrelated tests.
  const profiles = profileTable(kinds, 220, 5)

  it('makes a nit play far fewer hands than a station', () => {
    expect(profiles.nit.vpip).toBeLessThan(profiles.regular.vpip)
    expect(profiles.station.vpip).toBeGreaterThan(profiles.regular.vpip)
    // The gap is the whole point: these have to be recognisably different people,
    // not the same bot with a label.
    expect(profiles.station.vpip - profiles.nit.vpip).toBeGreaterThan(0.2)
  })

  it('makes a station call and a maniac bet', () => {
    expect(profiles.station.callRate).toBeGreaterThan(profiles.maniac.callRate)
    expect(profiles.maniac.aggression).toBeGreaterThan(profiles.station.aggression * 2)
  })

  it('makes a nit fold more than anyone else', () => {
    expect(profiles.nit.foldRate).toBeGreaterThan(profiles.station.foldRate)
    expect(profiles.nit.foldRate).toBeGreaterThan(profiles.maniac.foldRate)
  })

  it('leaves every archetype actually playing poker', () => {
    for (const kind of kinds) {
      const p = profiles[kind]
      expect(p.vpip, `${kind} never plays a hand`).toBeGreaterThan(0.1)
      expect(p.vpip, `${kind} plays literally everything`).toBeLessThan(0.95)
      expect(p.aggression, `${kind} never bets`).toBeGreaterThan(0.03)
    }
  }, 120000)
})

describe('reading an opponent', () => {
  const base: AiDecisionContext = {
    hole: [
      { rank: 13, suit: 'spades' },
      { rank: 12, suit: 'spades' },
    ],
    board: [
      { rank: 9, suit: 'hearts' },
      { rank: 5, suit: 'clubs' },
      { rank: 2, suit: 'diamonds' },
    ],
    potSize: 200,
    toCall: 60,
    currentBet: 60,
    minRaiseTo: 120,
    allInTo: 1000,
    opponentsInHand: 1,
    skillTier: 'elite',
    street: 'flop',
  }

  it('ignores a read taken from too few hands', () => {
    const adjustment = readAdjustment({
      ...base,
      opponentRead: { aggression: 0.9, foldRate: 0.01, samples: MIN_READ_SAMPLES - 1 },
    })
    expect(adjustment.callLoosening).toBe(1)
    expect(adjustment.bluffScale).toBe(1)
  })

  it('calls looser against somebody who bets constantly', () => {
    const vsManiac = readAdjustment({
      ...base,
      opponentRead: { aggression: 0.8, foldRate: 0.1, samples: 100 },
    })
    const vsNit = readAdjustment({
      ...base,
      opponentRead: { aggression: 0.1, foldRate: 0.5, samples: 100 },
    })
    // Lower slack demands more equity, so looser calling is the smaller number.
    expect(vsManiac.callLoosening).toBeLessThan(vsNit.callLoosening)
  })

  it('stops bluffing somebody who never folds', () => {
    const vsStation = readAdjustment({
      ...base,
      opponentRead: { aggression: 0.1, foldRate: 0.02, samples: 100 },
    })
    const vsFolder = readAdjustment({
      ...base,
      opponentRead: { aggression: 0.3, foldRate: 0.6, samples: 100 },
    })
    expect(vsStation.bluffScale).toBeLessThan(1)
    expect(vsFolder.bluffScale).toBeGreaterThan(vsStation.bluffScale)
  })

  it('barely adjusts for a player who cannot read anyone', () => {
    const read = { aggression: 0.9, foldRate: 0.02, samples: 100 }
    const novice = readAdjustment({ ...base, skillTier: 'novice', opponentRead: read })
    const elite = readAdjustment({ ...base, skillTier: 'elite', opponentRead: read })
    expect(Math.abs(1 - novice.bluffScale)).toBeLessThan(Math.abs(1 - elite.bluffScale))
  })
})

describe('tells', () => {
  const ACES: Card[] = [
    { rank: 14, suit: 'spades' },
    { rank: 14, suit: 'hearts' },
  ]
  const DRY_BOARD: Card[] = [
    { rank: 9, suit: 'hearts' },
    { rank: 5, suit: 'clubs' },
    { rank: 2, suit: 'diamonds' },
  ]

  const sampleRate = (hole: Card[], tier: SkillTier, opponents: number, samples = 400) => {
    const rng = mulberry32(99)
    let seen = 0
    for (let i = 0; i < samples; i++) {
      if (generateTell('p', hole, DRY_BOARD, tier, rng, 'regular', opponents)) seen++
    }
    return seen / samples
  }

  it('is an event, not wallpaper', () => {
    // A cue was on screen for 99% of hands and about half of all live seats, which
    // is not a read — it is decoration. The lesson teaching this mechanic says so
    // itself: "a tell is a change, not a behaviour".
    expect(sampleRate(ACES, 'novice', 1)).toBeLessThan(0.45)
    expect(sampleRate(ACES, 'elite', 1)).toBeLessThan(0.08)
  })

  it('judges strength against the players actually in the hand', () => {
    /*
     * Middle pair on this board is a real hand heads-up — about 64% against one
     * opponent, where an even share is 50% — and nothing at all four-handed, where
     * it runs about 21% against an even share of 20%.
     *
     * So heads-up it is worth reacting to, and four-handed there is nothing to
     * react to, and the cue should appear in the first case and not the second.
     * Equity was always computed against exactly one opponent regardless of how
     * many were actually in the hand, so this holding was labelled "strong" at a
     * four-handed table and the cue carried no information.
     */
    const middlePair: Card[] = [
      { rank: 5, suit: 'spades' },
      { rank: 4, suit: 'spades' },
    ]
    const rate = (opponents: number) => {
      const rng = mulberry32(7)
      let strong = 0
      for (let i = 0; i < 600; i++) {
        const tell = generateTell('p', middlePair, DRY_BOARD, 'novice', rng, 'regular', opponents)
        if (tell?.meansStrongHand) strong++
      }
      return strong / 600
    }
    const headsUp = rate(1)
    const fourHanded = rate(4)
    expect(headsUp, 'middle pair should read strong heads-up').toBeGreaterThan(0.15)
    expect(fourHanded, 'and should barely register four-handed').toBeLessThan(headsUp / 2)
  })

  it('still reads honestly from a whale', () => {
    expect(sampleRate(ACES, 'elite', 1)).toBeLessThan(0.08)
    const rng = mulberry32(3)
    let seen = 0
    for (let i = 0; i < 400; i++) {
      if (generateTell('p', ACES, DRY_BOARD, 'elite', rng, 'whale', 1)) seen++
    }
    // A whale leaks far more than their skill tier would suggest — that is what
    // makes them worth sitting down with.
    expect(seen / 400).toBeGreaterThan(0.2)
  })
})
