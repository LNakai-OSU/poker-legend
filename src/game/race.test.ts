import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../engine/rng'
import { LANES, hazardAt, layRoad, placeOf, runOut, settle, startRace, type Driver } from './race'

const car = (n: number) => ({ topSpeed: n, handling: n, grip: n, paint: '#ffffff' })
const driver = (id: string, c: number, skill: number): Driver => ({ id, name: id, stats: car(c), isPlayer: false, skill })

/** Who wins, across a lot of roads. */
function wins(specs: Array<[string, number, number]>, runs = 300, length = 2000) {
  const out: Record<string, number> = {}
  for (let seed = 1; seed <= runs; seed++) {
    const race = startRace(length, 1, specs.map(([id, c, s]) => driver(id, c, s)), mulberry32(seed * 7919))
    runOut(race)
    const first = race.racers.find((r) => placeOf(race, r.id) === 1)!
    out[first.id] = (out[first.id] ?? 0) + 1
  }
  return out
}

describe('the race', () => {
  it('is fair between equals: nobody wins for where they started or what order they are listed in', () => {
    // Three of the same car and the same driver. Each should take about a third;
    // a start lane or a stable sort handing ties to whoever is listed first
    // showed up here as 130 wins to 68.
    const w = wins([['a', 5, 0.5], ['b', 5, 0.5], ['c', 5, 0.5]])
    for (const id of ['a', 'b', 'c']) {
      expect(w[id], `${id} won ${w[id]} of 300`).toBeGreaterThan(70)
      expect(w[id], `${id} won ${w[id]} of 300`).toBeLessThan(135)
    }
  })

  it('makes a better car faster', () => {
    const w = wins([['slow', 4, 0.5], ['fast', 8, 0.5]])
    expect(w.fast).toBeGreaterThan(w.slow ?? 0)
  })

  it('makes a better driver win', () => {
    const w = wins([['lo', 5, 0.15], ['hi', 5, 0.95]])
    expect(w.hi).toBeGreaterThan((w.lo ?? 0) * 2)
  })

  it('lets a sharp driver in a worse car still win a good share', () => {
    // Skill is not a rounding error next to the car: otherwise this would just be a purchase.
    const w = wins([['sharp', 4, 0.95], ['dull', 6, 0.3]])
    expect(w.sharp, `sharp won ${w.sharp} of 300`).toBeGreaterThan(75)
  })

  it('is the same race for the same seed', () => {
    const run = () => {
      const race = startRace(1800, 1, [driver('a', 5, 0.5), driver('b', 6, 0.7)], mulberry32(42))
      runOut(race)
      return race.racers.map((r) => [r.id, r.crashed, r.finish])
    }
    expect(run()).toEqual(run())
  })

  it('always leaves a way through the road', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const road = layRoad(2600, 1.25, mulberry32(seed))
      for (const h of road) {
        const across = new Set(road.filter((o) => Math.abs(hazardAt(o, 0) - hazardAt(h, 0)) < 12).map((o) => o.lane))
        expect(across.size, `seed ${seed}: the road is shut at ${Math.round(h.at)} m`).toBeLessThan(LANES)
      }
    }
  })
})

describe('the money', () => {
  const race = () => {
    const r = startRace(500, 1, [driver('you', 5, 0.5), driver('x', 5, 0.5)], mulberry32(1))
    runOut(r)
    return r
  }
  const me = (r: ReturnType<typeof race>) => r.racers.find((x) => x.id === 'you')!

  it('pays first place and takes the bet from everyone else', () => {
    const r = race()
    const won = placeOf(r, 'you') === 1
    const s = settle(r, 'you', { stake: 100, pays: 1.6, pinkSlip: false, repair: 250 })
    expect(s.cash).toBe(won ? 160 : -100 - (me(r).crashed ? 250 : 0))
  })

  it('charges the repairs on top of the bet for a wreck', () => {
    const r = race()
    me(r).crashed = true
    const s = settle(r, 'you', { stake: 100, pays: 1.6, pinkSlip: false, repair: 250 })
    expect(s.cash).toBe(-350)
    expect(s.crashed).toBe(true)
  })

  it('moves a car and no cash on a pink slip', () => {
    const r = race()
    const s = settle(r, 'you', { stake: 0, pays: 0, pinkSlip: true, repair: 250 })
    expect(s.cash).toBe(0)
    expect(s.wonCar).toBe(placeOf(r, 'you') === 1)
    expect(s.lostCar).toBe(!s.wonCar)
  })
})
