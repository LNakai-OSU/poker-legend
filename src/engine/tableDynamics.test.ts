import { describe, expect, it } from 'vitest'
import { TexasHoldEmTable } from './table'
import { decideAiAction, preflopPercentile } from './ai'
import { mulberry32 } from './rng'
import type { SkillTier } from './types'

/**
 * What a table of these opponents actually *feels* like, measured rather than
 * asserted hand by hand.
 *
 * These are the numbers that decide whether a session reads as poker. They were
 * all badly wrong at one point and nothing caught it, because every individual
 * decision was defensible: the AI had no concept of hand selection, so pot odds
 * alone played every hand, 93% of hands reached a flop and the average pot was
 * over 100 big blinds — a table where nobody ever folded and every hand was a
 * stack-off. The bands below are deliberately wide: they are there to catch a
 * table that has stopped being poker, not to pin the tuning in place.
 */

interface Dynamics {
  /** Share of hands that never reach a flop. */
  preflopEnd: number
  /** Share of hands where at least two hands are turned over. */
  showdown: number
  /** Average final pot, in big blinds. */
  potBb: number
}

function measure(tier: SkillTier, seats: number, hands: number, seed: number): Dynamics {
  const BUY = 1000
  const bigBlind = 10
  const players = ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, seats).map((id) => ({
    id,
    name: id,
    isHuman: false,
    skillTier: tier,
    startingStack: BUY,
  }))
  const rng = mulberry32(seed)
  const table = new TexasHoldEmTable(players, { smallBlind: 5, bigBlind, rng })

  let played = 0
  let preflopEnd = 0
  let showdowns = 0
  let potTotal = 0

  while (played < hands) {
    for (const player of table.getState().players) {
      if (player.stack <= 0) table.rebuy(player.id, BUY)
    }
    table.startNewHand()
    played++

    let lastStreet = 'preflop'
    let guard = 0
    while (table.getState().handInProgress && guard++ < 300) {
      const state = table.getState()
      const acting = state.actingPlayerId
      if (!acting) break
      lastStreet = state.street
      table.submitAction(acting, decideAiAction(table.getAiContext(acting)!, rng))
    }

    const result = table.getLastHandResult()
    const wentToShowdown = (result?.revealed.length ?? 0) >= 2
    if (result) potTotal += result.pots.reduce((sum, pot) => sum + pot.amount, 0)
    if (wentToShowdown) showdowns++
    if (lastStreet === 'preflop' && !wentToShowdown) preflopEnd++
  }

  return {
    preflopEnd: preflopEnd / played,
    showdown: showdowns / played,
    potBb: potTotal / played / bigBlind,
  }
}

/**
 * The ends and the middle of the ladder. Every hand runs a Monte Carlo equity
 * estimate per decision, so this is sampled rather than exhaustive: the bands are
 * wide enough that 200 hands is plenty to catch a table that has stopped playing
 * poker, and narrow enough that the original failure (7% of hands ending preflop)
 * would have failed loudly.
 */
const TIERS: SkillTier[] = ['novice', 'competent', 'elite']
const HANDS = 200

/** Simulating hundreds of hands with Monte Carlo equity is far past vitest's default. */
const MEASURE_TIMEOUT_MS = 240_000

describe('preflop hand selection', () => {
  it('ranks starting hands sensibly', () => {
    const aces = preflopPercentile([
      { rank: 14, suit: 'spades' },
      { rank: 14, suit: 'hearts' },
    ])
    const suitedBroadway = preflopPercentile([
      { rank: 14, suit: 'spades' },
      { rank: 13, suit: 'spades' },
    ])
    const trash = preflopPercentile([
      { rank: 7, suit: 'spades' },
      { rank: 2, suit: 'hearts' },
    ])
    expect(aces).toBeGreaterThan(0.98)
    expect(suitedBroadway).toBeGreaterThan(0.9)
    expect(suitedBroadway).toBeLessThan(aces)
    expect(trash).toBeLessThan(0.05)
  })

  it('is suited-aware, so the same ranks differ by suit', () => {
    const suited = preflopPercentile([
      { rank: 10, suit: 'spades' },
      { rank: 9, suit: 'spades' },
    ])
    const offsuit = preflopPercentile([
      { rank: 10, suit: 'spades' },
      { rank: 9, suit: 'hearts' },
    ])
    expect(suited).toBeGreaterThan(offsuit)
  })
})

describe('table dynamics', () => {
  for (const tier of TIERS) {
    it(`plays recognisable poker at a ${tier} table`, () => {
      const short = measure(tier, 3, HANDS, 99)
      const full = measure(tier, 6, HANDS, 1234)

      for (const [seats, d] of [
        ['3-handed', short],
        ['6-handed', full],
      ] as const) {
        const where = `${tier} ${seats}`
        // Some hands have to end before a flop, and some have to reach one.
        expect(d.preflopEnd, `${where}: share of hands ending preflop`).toBeGreaterThan(0.12)
        expect(d.preflopEnd, `${where}: share of hands ending preflop`).toBeLessThan(0.7)
        // Showdowns are how a player learns what opponents hold. Too few and the
        // table is a folding contest; too many and nobody is betting.
        expect(d.showdown, `${where}: share of hands reaching showdown`).toBeGreaterThan(0.08)
        // The ceiling is generous because a table of novices genuinely is a
        // showdown contest — six calling stations reach one on about 60% of
        // hands, and that is the table being modelled correctly, not a fault.
        expect(d.showdown, `${where}: share of hands reaching showdown`).toBeLessThan(0.7)
        // On 100bb stacks, an average pot at or past the buy-in means every hand
        // is a stack-off rather than a hand of poker. This is the loosest of the
        // three bands on purpose: pot size is mostly a consequence of how many
        // hands end early, so `preflopEnd` above is the invariant with teeth.
        expect(d.potBb, `${where}: average pot in bb`).toBeGreaterThan(3)
        expect(d.potBb, `${where}: average pot in bb`).toBeLessThan(115)
      }
    }, MEASURE_TIMEOUT_MS)
  }

  it('makes the better tiers more selective, but only somewhat', () => {
    // The spread belongs postflop. A wide preflop spread empties the table,
    // because every seat folding independently compounds.
    const loose = measure('novice', 3, HANDS, 7)
    const tight = measure('elite', 3, HANDS, 7)
    expect(tight.preflopEnd).toBeGreaterThan(loose.preflopEnd)
    expect(tight.preflopEnd - loose.preflopEnd).toBeLessThan(0.45)
  }, MEASURE_TIMEOUT_MS)
})
