import { describe, expect, it } from 'vitest'
import {
  BOUTS,
  MIN_RETURN,
  ROSTER,
  ROUNDS,
  TAKEOUT,
  boutChances,
  cardFor,
  drawCard,
  drawResult,
  planFight,
  returnPerDollar,
  settleBet,
  type BetKind,
} from './boxing'
import { mulberry32 } from './rng'

const KINDS: BetKind[] = ['winA', 'winB', 'koA', 'koB', 'distance']

describe('the Mesa arena', () => {
  it('the roster is twelve different people', () => {
    expect(new Set(ROSTER.map((f) => f.name)).size).toBe(ROSTER.length)
    expect(new Set(ROSTER.map((f) => f.nick)).size).toBe(ROSTER.length)
    expect(ROSTER.length).toBeGreaterThanOrEqual(12)
  })

  it('a card is three bouts between six different fighters, and is the same all evening', () => {
    for (let seed = 1; seed < 100; seed++) {
      const card = drawCard(mulberry32(seed))
      expect(card).toHaveLength(BOUTS)
      expect(new Set(card.flatMap((b) => [b.a.id, b.b.id])).size).toBe(BOUTS * 2)
      expect(card.filter((b) => b.main)).toHaveLength(1)
    }
    expect(cardFor(7, 2).map((b) => b.a.id)).toEqual(cardFor(7, 2).map((b) => b.a.id))
    expect(cardFor(7, 2).map((b) => b.a.id)).not.toEqual(cardFor(8, 2).map((b) => b.a.id))
  })

  it('the five bets cover every result exactly once', () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const bout of drawCard(mulberry32(seed))) {
        const c = boutChances(bout)
        expect(c.winA + c.winB).toBeCloseTo(1, 9)
        expect(c.koA + c.koB + c.distance).toBeCloseTo(1, 9)
        for (const k of KINDS) expect(c[k]).toBeGreaterThan(0)
      }
    }
  })

  it('every bet on every bout loses to the house', () => {
    for (let seed = 1; seed < 300; seed++) {
      for (const bout of drawCard(mulberry32(seed))) {
        const c = boutChances(bout)
        for (const k of KINDS) {
          const ev = c[k] * returnPerDollar(c[k])
          expect(ev, `${k} ${bout.a.name} v ${bout.b.name}`).toBeLessThan(1)
          expect(ev).toBeGreaterThan(0.7)
          if (returnPerDollar(c[k]) > MIN_RETURN) expect(ev).toBeLessThanOrEqual(1 - TAKEOUT + 1e-9)
        }
      }
    }
  })

  it('results are drawn in proportion to the odds (simulated)', () => {
    const bout = drawCard(mulberry32(5))[2]
    const c = boutChances(bout)
    const rng = mulberry32(21)
    const N = 60_000
    const seen = { winA: 0, koA: 0, koB: 0, distance: 0 }
    for (let i = 0; i < N; i++) {
      const r = drawResult(bout, rng)
      if (r.winner === 'a') seen.winA++
      if (r.winner === 'a' && r.method === 'ko') seen.koA++
      if (r.winner === 'b' && r.method === 'ko') seen.koB++
      if (r.method === 'decision') seen.distance++
    }
    for (const k of ['winA', 'koA', 'koB', 'distance'] as const) expect(Math.abs(seen[k] / N - c[k]), k).toBeLessThan(0.012)
  })

  it('the fight you watch fits the result', () => {
    const rng = mulberry32(33)
    for (let i = 0; i < 400; i++) {
      const bout = drawCard(rng)[i % BOUTS]
      const result = drawResult(bout, rng)
      const plan = planFight(result, rng)
      const winnerLeft = result.winner === 'a' ? plan.endA : plan.endB
      const loserLeft = result.winner === 'a' ? plan.endB : plan.endA
      expect(plan.rounds).toHaveLength(result.method === 'ko' ? result.round : ROUNDS)
      expect(winnerLeft).toBeGreaterThan(loserLeft)
      if (result.method === 'ko') {
        expect(loserLeft).toBe(0)
        const last = plan.rounds[plan.rounds.length - 1].exchanges.at(-1)!
        expect(last.finisher && last.landed && last.by === result.winner).toBe(true)
      } else {
        expect(loserLeft).toBeGreaterThan(0)
      }
      // The damage on the page adds up to what each man loses.
      const all = plan.rounds.flatMap((r) => r.exchanges)
      const hurtA = all.filter((e) => e.by === 'b' && e.landed).reduce((s, e) => s + e.damage, 0)
      const hurtB = all.filter((e) => e.by === 'a' && e.landed).reduce((s, e) => s + e.damage, 0)
      expect(100 - hurtA).toBe(plan.endA)
      expect(100 - hurtB).toBe(plan.endB)
    }
  })

  it('the fight has footwork, combinations and defence, and its knockdowns are fair', () => {
    const rng = mulberry32(61)
    let combos = 0
    const defences = new Set<string>()
    const steps = new Set<string>()
    let downs = 0
    for (let i = 0; i < 600; i++) {
      const bout = drawCard(rng)[i % BOUTS]
      const result = drawResult(bout, rng)
      for (const e of planFight(result, rng).rounds.flatMap((r) => r.exchanges)) {
        expect(e.combo.length).toBeLessThanOrEqual(2)
        if (e.combo.length) combos++
        steps.add(e.step)
        // Only a miss is answered; a hit has no defence.
        expect(e.defense === undefined).toBe(e.landed)
        if (e.defense) defences.add(e.defense)
        if (e.knockdown) {
          downs++
          expect(e.landed && !e.finisher && e.by === result.winner).toBe(true)
        }
      }
    }
    expect(combos).toBeGreaterThan(100)
    expect(downs).toBeGreaterThan(20)
    expect(defences.size).toBe(5)
    expect(steps.size).toBe(4)
  })

  it('a winning bet pays and a losing one does not', () => {
    const bout = drawCard(mulberry32(2))[0]
    const r = { winner: 'a' as const, method: 'decision' as const, round: ROUNDS }
    expect(settleBet(bout, 'winA', 100, r).returned).toBeGreaterThanOrEqual(105)
    expect(settleBet(bout, 'winB', 100, r)).toEqual({ won: false, returned: 0, net: -100 })
    expect(settleBet(bout, 'koA', 100, r).won).toBe(false)
    expect(settleBet(bout, 'distance', 100, r).won).toBe(true)
  })
})
