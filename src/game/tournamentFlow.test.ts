import { describe, expect, it } from 'vitest'
import { decideAiAction } from '../engine/ai'
import { mulberry32 } from '../engine/rng'
import { TexasHoldEmTable } from '../engine/table'
import type { PlayerConfig } from '../engine/types'
import { TABLES } from '../world/content'
import { seatsOf } from '../world/characters'
import { blindsForRound } from '../engine/tournament'
import { stepTournament } from './tournamentFlow'

const table = TABLES['lumina-tournament']

function build(rng: () => number) {
  const seats = seatsOf(table, table.opponents)
  const players: PlayerConfig[] = [
    { id: 'you', name: 'You', isHuman: true, skillTier: 'amateur', startingStack: table.buyIn },
    ...seats.map((s) => ({ id: s.id, name: s.name, isHuman: false, skillTier: s.skillTier, archetype: s.archetype, startingStack: table.buyIn })),
  ]
  return new TexasHoldEmTable(players, { smallBlind: table.smallBlind, bigBlind: table.bigBlind, rng })
}

/** Plays hand after hand, the human included, calling like a station, until the stop condition. */
function playHand(engine: TexasHoldEmTable, rng: () => number) {
  let guard = 0
  while (engine.getState().handInProgress && guard++ < 400) {
    const id = engine.getState().actingPlayerId
    if (!id) break
    const ctx = engine.getAiContext(id)
    if (!ctx) break
    engine.submitAction(id, decideAiAction(ctx, rng))
  }
}

/** Deals `hands` hands the way the scene does, keeping the human alive so the whole schedule is played. */
function run(seed: number, hands: number) {
  const rng = mulberry32(seed)
  const engine = build(rng)
  const everSeated = new Set<string>(table.opponents.map((r) => (typeof r === 'string' ? r : r.character)))
  let big = table.bigBlind
  const log: Array<{ hand: number; big: number; round: number; finalTable: boolean; replaced: number; seated: number; broke: number }> = []
  for (let hand = 1; hand <= hands; hand++) {
    // Nobody wins every chip: the human is topped up when low, which a real player cannot do but a test must.
    if (engine.getState().players.find((p) => p.id === 'you')!.stack < big * 12) engine.rebuy('you', big * 30)
    if (engine.isGameOver()) break
    const step = stepTournament(engine, table, big, everSeated, rng)
    if (step.newBlinds) big = step.newBlinds.big
    const players = engine.getState().players
    log.push({ hand, big, round: step.round, finalTable: step.finalTable, replaced: step.replaced.length, seated: players.length, broke: players.filter((p) => p.stack <= 0).length })
    engine.startNewHand()
    playHand(engine, rng)
  }
  return { engine, log }
}

describe('a tournament, hand by hand', () => {
  // One run does for all of it: the AI's equity maths makes every hand cost real time.
  it('raises the blinds each round, keeps six funded chairs, replaces the knocked out, and stops at the final table', () => {
    const { log } = run(5, 108)
    const rounds = log.filter((e) => !e.finalTable)
    expect(rounds).toHaveLength(100)
    for (const entry of log) {
      expect(entry.round).toBe(Math.floor((entry.hand - 1) / 10) + 1)
      expect(entry.big).toBe(blindsForRound(table.tournament!, entry.round).big)
      expect(entry.seated).toBe(6)
    }
    // The blinds are up on the first hand of a round and not before.
    expect([log[0].big, log[9].big, log[10].big, log[99].big]).toEqual([200, 200, 300, 4000])
    // Until the rounds are over nobody is dealt in broke: a knocked-out player's chair always has a newcomer in it.
    for (const entry of rounds) expect(entry.broke, `hand ${entry.hand}: dealt in with a broke player`).toBe(0)
    expect(rounds.reduce((n, e) => n + e.replaced, 0), 'nobody was ever knocked out in a hundred hands').toBeGreaterThan(0)
    // Then it is the final table: announced on hand 101, and nobody new sits down.
    const finals = log.filter((e) => e.finalTable)
    expect(finals[0]?.hand).toBe(101)
    expect(finals[0]?.round).toBe(11)
    for (const entry of finals) expect(entry.replaced).toBe(0)
  }, 300_000)
})
