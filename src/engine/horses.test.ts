import { describe, expect, it } from 'vitest'
import {
  callsFor,
  isPhotoFinish,
  margin,
  runningOrder,
  FIELD_SIZE,
  MIN_RETURN,
  TAKEOUT,
  chances,
  drawField,
  drawFinish,
  payLabel,
  planRace,
  placesPaid,
  progressAt,
  returnPerDollar,
  settleBet,
  type BetKind,
} from './horses'
import { mulberry32 } from './rng'

const KINDS: BetKind[] = ['win', 'place', 'show']

describe('horse racing', () => {
  it('chances add up: one winner, two placed, three shown', () => {
    const c = chances(drawField(mulberry32(3)))
    expect(c.win.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9)
    expect(c.place.reduce((a, b) => a + b, 0)).toBeCloseTo(2, 9)
    expect(c.show.reduce((a, b) => a + b, 0)).toBeCloseTo(3, 9)
  })

  it('fields are six different horses with different names', () => {
    for (let seed = 1; seed < 40; seed++) {
      const field = drawField(mulberry32(seed))
      expect(field).toHaveLength(FIELD_SIZE)
      expect(new Set(field.map((h) => h.name)).size).toBe(FIELD_SIZE)
    }
  })

  it('every bet on every horse in every field loses to the house, by at least a few percent', () => {
    for (let seed = 1; seed < 300; seed++) {
      const field = drawField(mulberry32(seed))
      const c = chances(field)
      for (const kind of KINDS) {
        for (const h of field) {
          const p = c[kind][h.post]
          const ev = p * returnPerDollar(p)
          expect(ev, `${kind} on ${h.name}, seed ${seed}`).toBeLessThan(1)
          expect(ev, `${kind} on ${h.name}, seed ${seed}`).toBeGreaterThan(0.7)
          // Rounded down, so the edge is at least the takeout unless the minimum payout is what pays.
          if (returnPerDollar(p) > MIN_RETURN) expect(ev).toBeLessThanOrEqual(1 - TAKEOUT + 1e-9)
        }
      }
    }
  })

  it('the finishing order is drawn in proportion to the odds (simulated)', () => {
    const field = drawField(mulberry32(11))
    const c = chances(field)
    const rng = mulberry32(5)
    const wins = field.map(() => 0)
    const shows = field.map(() => 0)
    const N = 60_000
    for (let i = 0; i < N; i++) {
      const order = drawFinish(field, rng)
      wins[order[0]]++
      for (const post of order.slice(0, 3)) shows[post]++
    }
    field.forEach((h) => {
      expect(wins[h.post] / N).toBeCloseTo(c.win[h.post], 1)
      expect(Math.abs(wins[h.post] / N - c.win[h.post])).toBeLessThan(0.01)
      expect(Math.abs(shows[h.post] / N - c.show[h.post])).toBeLessThan(0.01)
    })
  })

  it('a simulated bettor loses money on every kind of bet', () => {
    for (const kind of KINDS) {
      const rng = mulberry32(21 + placesPaid(kind))
      let staked = 0
      let returned = 0
      for (let i = 0; i < 20_000; i++) {
        const field = drawField(rng)
        const finish = drawFinish(field, rng)
        const post = Math.floor(rng() * FIELD_SIZE)
        staked += 100
        returned += settleBet(field, { kind, post }, 100, finish).returned
      }
      expect(returned / staked).toBeLessThan(0.97)
      expect(returned / staked).toBeGreaterThan(0.75)
    }
  })

  it('settles by where the horse finished', () => {
    const field = drawField(mulberry32(2))
    const finish = [3, 0, 5, 1, 2, 4]
    expect(settleBet(field, { kind: 'win', post: 3 }, 50, finish).won).toBe(true)
    expect(settleBet(field, { kind: 'win', post: 0 }, 50, finish).won).toBe(false)
    expect(settleBet(field, { kind: 'place', post: 0 }, 50, finish).won).toBe(true)
    expect(settleBet(field, { kind: 'place', post: 5 }, 50, finish).won).toBe(false)
    expect(settleBet(field, { kind: 'show', post: 5 }, 50, finish).won).toBe(true)
    expect(settleBet(field, { kind: 'show', post: 1 }, 50, finish).net).toBe(-50)
  })

  it('labels what a winning dollar comes back as', () => {
    expect(payLabel(0.5)).toBe('x1.70')
    expect(returnPerDollar(0.99)).toBe(MIN_RETURN)
  })

  it('the run of the race ends in the drawn order, and nobody runs backwards', () => {
    for (let seed = 1; seed < 60; seed++) {
      const rng = mulberry32(seed)
      const field = drawField(rng)
      const finish = drawFinish(field, rng)
      const plans = planRace(finish, rng)
      for (const p of plans) {
        let last = -1
        for (let ms = 0; ms <= p.finishMs + 500; ms += 20) {
          const x = progressAt(p, ms)
          expect(x).toBeGreaterThanOrEqual(last)
          last = x
        }
        expect(progressAt(p, 0)).toBe(0)
        expect(progressAt(p, p.finishMs)).toBeCloseTo(1, 9)
      }
      const byTime = [...plans].sort((a, b) => a.finishMs - b.finishMs).map((p) => p.post)
      expect(byTime).toEqual(finish)
    }
  })
})

describe('the call of the race', () => {
  it('has a break, the poles and a finish, in order, and every run style turns up', () => {
    const styles = new Set<string>()
    let photos = 0
    for (let seed = 1; seed < 200; seed++) {
      const rng = mulberry32(seed)
      const field = drawField(rng)
      const plans = planRace(drawFinish(field, rng), rng)
      plans.forEach((p) => styles.add(p.style))
      if (isPhotoFinish(plans)) photos++
      const calls = callsFor(field, plans)
      expect(calls[0].text).toMatch(/off/)
      expect(calls.length).toBeGreaterThanOrEqual(5)
      expect(calls.map((c) => c.at)).toEqual(calls.map((c) => c.at).sort((x, y) => x - y))
      const lastCall = calls[calls.length - 1]
      expect(lastCall.at).toBe(Math.min(...plans.map((p) => p.finishMs)))
      expect(runningOrder(plans, plans[0].finishMs * 3)).toHaveLength(6)
    }
    expect(styles.size).toBe(3)
    expect(photos).toBeGreaterThan(10)
    expect(photos).toBeLessThan(120)
  })

  it('names a margin in racing words', () => {
    expect(margin(0.001)).toBe('a nose')
    expect(margin(0.03)).toBe('a length')
    expect(margin(0.2)).toBe('6 lengths')
  })
})
