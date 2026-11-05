import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../engine/rng'
import { SEG, buildTrack, cornersOf, curveAt, heightAt, nextCorner, shapeOf, type TrackSpec } from './raceTrack'
import {
  CAR_HALF_W,
  CONE_HALF_W,
  NO_INPUT,
  OIL_HALF_L,
  OIL_HALF_W,
  hasWayThrough,
  reachX,
  reachY,
  threatOf,
  VREF,
  aiInput,
  gripOf,
  layRoad,
  placeOf,
  runOut,
  safeSpeed,
  settle,
  startRace,
  stepRace,
  topSpeedOf,
  type Driver,
  type Race,
} from './race'

const SPEC: TrackSpec = { name: 'test', theme: 'coast', curviness: 0.5, hills: 0.4 }
const car = (n: number) => ({ topSpeed: n, handling: n, grip: n, paint: '#ffffff' })
const driver = (id: string, c: number, skill: number): Driver => ({ id, name: id, stats: car(c), isPlayer: false, skill })

/** Who wins, across a lot of roads. */
function wins(specs: Array<[string, number, number]>, runs = 300, length = 1900) {
  const out: Record<string, number> = {}
  for (let seed = 1; seed <= runs; seed++) {
    const race = startRace(length, 1, SPEC, specs.map(([id, c, s]) => driver(id, c, s)), mulberry32(seed * 7919))
    runOut(race)
    const first = race.racers.find((r) => placeOf(race, r.id) === 1)!
    out[first.id] = (out[first.id] ?? 0) + 1
  }
  return out
}

/** A race with the road bent the same way throughout and nothing on it, for testing one thing at a time. */
function lab(curve: number, drivers: Driver[]): Race {
  const race = startRace(3000, 1, SPEC, drivers, mulberry32(1))
  for (const s of race.track.segs) {
    s.curve = curve
    s.y = 0
  }
  race.hazards = []
  for (const r of race.racers) {
    r.x = 0
    r.dist = 100
    r.v = 40
  }
  return race
}

describe('the road', () => {
  it('is the same road for the same seed, whatever else is going on', () => {
    const a = buildTrack(2000, SPEC, mulberry32(9))
    const b = buildTrack(2000, SPEC, mulberry32(9))
    expect(a.segs.map((s) => s.curve)).toEqual(b.segs.map((s) => s.curve))
    expect(a.segs.map((s) => s.y)).toEqual(b.segs.map((s) => s.y))
  })

  it('starts and ends straight and level, and never bends past a hairpin', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const t = buildTrack(2200, { ...SPEC, curviness: 1, hills: 1 }, mulberry32(seed))
      for (let i = 0; i < 10; i++) expect(t.segs[i].curve, `seed ${seed} bends at the line`).toBe(0)
      expect(Math.abs(t.segs[0].y)).toBeLessThan(0.5)
      for (const s of t.segs) expect(Math.abs(s.curve)).toBeLessThanOrEqual(6.5)
    }
  })

  it('bends more where the road is twistier', () => {
    const bend = (curviness: number) => {
      let total = 0
      for (let seed = 1; seed <= 30; seed++) {
        total += buildTrack(2200, { ...SPEC, curviness }, mulberry32(seed)).segs.reduce((a, s) => a + Math.abs(s.curve), 0)
      }
      return total
    }
    expect(bend(0.9)).toBeGreaterThan(bend(0.2) * 1.3)
  })

  it('rises and falls where it is hilly, and lies flat where it is not', () => {
    const t = buildTrack(2200, { ...SPEC, hills: 1 }, mulberry32(3))
    const heights = t.segs.map((s) => s.y)
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(6)
    const flat = buildTrack(2200, { ...SPEC, hills: 0 }, mulberry32(3))
    expect(Math.max(...flat.segs.map((s) => Math.abs(s.y)))).toBe(0)
    expect(heightAt(t, 5 * SEG)).toBeDefined()
    expect(curveAt(t, 5 * SEG)).toBe(t.segs[5].curve)
  })

  it('always leaves a way through: room beside a slick, not just an empty lane', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const road = layRoad(2600, 1.25, mulberry32(seed))
      for (const h of road) {
        const across = road.filter((o) => Math.abs(o.at - h.at) < 14)
        expect(hasWayThrough(across), `seed ${seed}: the road is shut at ${Math.round(h.at)} m`).toBe(true)
      }
    }
  })

  it('numbers its corners and calls the next one, bent the way it turns', () => {
    const t = buildTrack(2400, { ...SPEC, curviness: 0.9 }, mulberry32(4))
    const corners = cornersOf(t)
    expect(corners.length).toBeGreaterThan(3)
    for (const c of corners) {
      const mid = t.segs[Math.round(c.dist / SEG)].curve
      expect(Math.sign(mid) || c.dir).toBe(c.dir)
      expect(Math.abs(c.peak)).toBeGreaterThanOrEqual(1.4)
    }
    const next = nextCorner(corners, 0)!
    expect(next.corner.n).toBe(1)
    expect(next.away).toBeGreaterThan(0)
    expect(nextCorner(corners, 1e6)).toBeNull()
    const shape = shapeOf(t)
    expect(shape.corners).toEqual(corners)
    expect(shape.climb).toBeGreaterThanOrEqual(0)
  })
})

describe('the car', () => {
  it('holds a bend with grip and goes wide without it', () => {
    // The same car, the same bend, nobody steering: the one with less grip ends up further out.
    const out = (grip: number) => {
      const race = lab(3, [{ ...driver('a', 5, 0), stats: { topSpeed: 5, handling: 5, grip, paint: '#fff' }, isPlayer: true }])
      // Long enough to drift visibly, short enough that neither has reached the wall.
      for (let i = 0; i < 40; i++) stepRace(race, 1 / 60, NO_INPUT)
      return Math.abs(race.racers[0].x)
    }
    expect(out(3)).toBeGreaterThan(out(9))
  })

  it('goes soft under the wheel past the limit: the faster you take a bend, the less it turns', () => {
    const turned = (v: number) => {
      const race = lab(4, [{ ...driver('a', 5, 0), isPlayer: true }])
      const me = race.racers[0]
      me.v = v
      const before = me.x
      stepRace(race, 1 / 60, { steer: 1, brake: false, boost: false })
      for (let i = 0; i < 30; i++) stepRace(race, 1 / 60, { steer: 1, brake: false, boost: false })
      // How much better it did than the bend alone would have pushed it, per unit of speed.
      return (me.x - before) / (v / VREF)
    }
    expect(turned(52)).toBeLessThan(turned(30))
  })

  it('has a speed a bend can be taken at, higher with grip', () => {
    expect(safeSpeed(car(9), 4)).toBeGreaterThan(safeSpeed(car(3), 4))
    expect(safeSpeed(car(5), 5)).toBeLessThan(safeSpeed(car(5), 2))
    expect(gripOf(car(9))).toBeGreaterThan(gripOf(car(3)))
    expect(topSpeedOf(car(9))).toBeGreaterThan(topSpeedOf(car(3)))
  })

  it('hurts by how hard the hit was, not by whether there was one', () => {
    const crash = (speed: number) => {
      const race = lab(0, [{ ...driver('a', 5, 0), isPlayer: true }])
      race.racers[0].dist = 40
      race.racers[0].v = speed
      race.hazards = [{ id: 1, at: 60, lat: 0, kind: 'traffic', speed: 22 }]
      for (let i = 0; i < 120; i++) stepRace(race, 1 / 60, { steer: 0, brake: false, boost: false })
      return race.racers[0].damage
    }
    // (Both cars are accelerating on the way in, so the slow one is not very slow; the order is what counts.)
    expect(crash(26)).toBeLessThan(crash(52) * 0.85)
    expect(crash(52)).toBeGreaterThan(0.3)
  })

  it('is wrecked by enough damage and stops being driven', () => {
    const race = lab(0, [{ ...driver('a', 5, 0), isPlayer: true }])
    const me = race.racers[0]
    // Already badly hurt, and into the back of a stopped car at speed.
    me.damage = 0.85
    race.hazards = [{ id: 1, at: 80, lat: 0, kind: 'traffic', speed: 0 }]
    me.dist = 40
    me.v = 48
    for (let i = 0; i < 60 * 3; i++) stepRace(race, 1 / 60, { steer: 0, brake: false, boost: false })
    expect(me.wrecked).toBe(true)
    expect(me.damage).toBe(1)
    const stopped = me.dist
    for (let i = 0; i < 180; i++) stepRace(race, 1 / 60, { steer: 0, brake: false, boost: false })
    expect(me.v).toBeLessThan(1)
    expect(me.dist - stopped).toBeLessThan(15)
  })

  it('earns boost in a slipstream and spends it', () => {
    const race = lab(0, [{ ...driver('a', 5, 0), isPlayer: true }, driver('b', 5, 0.5)])
    const [me, lead] = race.racers
    me.dist = 100
    lead.dist = 120
    me.x = lead.x = 0
    lead.v = me.v = 45
    for (let i = 0; i < 90; i++) {
      lead.dist = me.dist + 18
      stepRace(race, 1 / 60, NO_INPUT)
    }
    expect(me.boost).toBeGreaterThan(0.05)
    const before = me.boost
    stepRace(race, 1 / 60, { steer: 0, brake: false, boost: true })
    expect(me.boosting).toBe(true)
    expect(me.boost).toBeLessThan(before)
  })

  it('slows on the grass and does not on the tarmac', () => {
    const speedAfter = (x: number) => {
      const race = lab(0, [{ ...driver('a', 5, 0), isPlayer: true }])
      race.racers[0].x = x
      for (let i = 0; i < 240; i++) stepRace(race, 1 / 60, NO_INPUT)
      return race.racers[0].v
    }
    expect(speedAfter(1.3)).toBeLessThan(speedAfter(0) - 8)
  })
})

describe('the field', () => {
  it('is fair between equals: nobody wins for where they started or what order they are listed in', () => {
    // Three of the same car and the same driver. Each should take about a third;
    // a start lane or a stable sort handing ties to whoever is listed first
    // showed up as 130 wins to 68.
    const w = wins([['a', 5, 0.5], ['b', 5, 0.5], ['c', 5, 0.5]])
    for (const id of ['a', 'b', 'c']) {
      expect(w[id], `${id} won ${w[id]} of 300`).toBeGreaterThan(70)
      expect(w[id], `${id} won ${w[id]} of 300`).toBeLessThan(135)
    }
  })

  it('makes a better car faster', () => {
    const w = wins([['slow', 4, 0.5], ['fast', 8, 0.5]])
    expect(w.fast).toBeGreaterThan((w.slow ?? 0) * 2)
  })

  it('makes a better driver win', () => {
    const w = wins([['lo', 5, 0.15], ['hi', 5, 0.95]])
    expect(w.hi).toBeGreaterThan((w.lo ?? 0) * 2)
  })

  it('lets a sharp driver in a worse car still win a good share', () => {
    // Skill is not a rounding error next to the car: otherwise this would just be a purchase.
    const w = wins([['sharp', 4, 0.95], ['dull', 6, 0.3]])
    expect(w.sharp, `sharp won ${w.sharp} of 300`).toBeGreaterThan(36)
  })

  it('is the same race for the same seed', () => {
    const run = () => {
      const race = startRace(1800, 1, SPEC, [driver('a', 5, 0.5), driver('b', 6, 0.7)], mulberry32(42))
      runOut(race)
      return race.racers.map((r) => [r.id, r.wrecked, r.finish, r.damage])
    }
    expect(run()).toEqual(run())
  })

  it('drives the road: brakes for a bend instead of taking it flat out', () => {
    const race = lab(5, [driver('a', 9, 1)])
    const me = race.racers[0]
    me.v = 60
    let min = 60
    for (let i = 0; i < 240; i++) {
      stepRace(race, 1 / 60, NO_INPUT)
      min = Math.min(min, me.v)
    }
    expect(min).toBeLessThan(55)
    expect(aiInput(race, me).steer).toBeLessThanOrEqual(1)
  })
})

describe('the money', () => {
  const race = () => {
    const r = startRace(500, 1, SPEC, [{ ...driver('you', 5, 0.5), isPlayer: true }, driver('x', 5, 0.5)], mulberry32(1))
    runOut(r)
    return r
  }
  const me = (r: ReturnType<typeof race>) => r.racers.find((x) => x.id === 'you')!

  it('pays the stake and the winnings for first place, and takes the repairs off', () => {
    const r = race()
    me(r).wrecked = false
    me(r).damage = 0.5
    me(r).finish = 1
    r.racers.find((x) => x.id === 'x')!.finish = 5
    const s = settle(r, 'you', { stake: 100, pays: 1.6, pinkSlip: false, repair: 400 })
    expect(s.place).toBe(1)
    expect(s.payout).toBe(260)
    expect(s.repairs).toBe(200)
    expect(s.cash).toBe(260 - 100 - 200)
  })

  it('takes the bet for anything but first, and the repairs on top', () => {
    const r = race()
    me(r).wrecked = false
    me(r).damage = 0.25
    me(r).finish = 9
    r.racers.find((x) => x.id === 'x')!.finish = 2
    const s = settle(r, 'you', { stake: 100, pays: 1.6, pinkSlip: false, repair: 400 })
    expect(s.payout).toBe(0)
    expect(s.cash).toBe(-100 - 100)
  })

  it('charges the whole bill for a wreck', () => {
    const r = race()
    me(r).wrecked = true
    me(r).damage = 1
    const s = settle(r, 'you', { stake: 100, pays: 1.6, pinkSlip: false, repair: 400 })
    expect(s.repairs).toBe(400)
    expect(s.cash).toBe(-500)
    expect(s.wrecked).toBe(true)
  })

  it('moves a car and no cash on a pink slip, and repairs only the car you keep', () => {
    const r = race()
    me(r).wrecked = false
    me(r).damage = 0.5
    me(r).finish = 1
    r.racers.find((x) => x.id === 'x')!.finish = 5
    const won = settle(r, 'you', { stake: 0, pays: 0, pinkSlip: true, repair: 400 })
    expect(won.wonCar).toBe(true)
    expect(won.repairs).toBe(200)
    me(r).finish = 9
    const lost = settle(r, 'you', { stake: 0, pays: 0, pinkSlip: true, repair: 400 })
    expect(lost.lostCar).toBe(true)
    expect(lost.cash).toBe(0)
  })
})

describe('what is on the road', () => {
  const me = () => ({ ...driver('a', 5, 0), isPlayer: true })
  const withThing = (kind: 'traffic' | 'oil' | 'cone', lat: number, speed = 0) => {
    const race = lab(0, [me()])
    race.hazards = [{ id: 1, at: 100, lat, kind, speed }]
    const r = race.racers[0]
    r.dist = 60
    r.v = 45
    r.x = 0
    return { race, r }
  }
  const run = (race: Race, seconds: number, steer = 0) => {
    for (let i = 0; i < seconds * 60; i++) stepRace(race, 1 / 60, { steer, brake: false, boost: false })
  }

  it('is as wide as it looks: a slick catches you across its drawn width and not a hair beyond', () => {
    // The picture draws the slick OIL_HALF_W road-halves each side of its middle, and the car
    // CAR_HALF_W each side of its own. Touching is those two overlapping, and nothing else.
    const caught = (offset: number) => {
      const { race, r } = withThing('oil', 0)
      r.x = offset
      // Park the steering against the push: no bend, so the car stays where it was put.
      run(race, 2)
      return r.hitLog.oil > 0
    }
    expect(caught(OIL_HALF_W + CAR_HALF_W - 0.04)).toBe(true)
    expect(caught(OIL_HALF_W + CAR_HALF_W + 0.04)).toBe(false)
    expect(reachX('oil')).toBeCloseTo(OIL_HALF_W + CAR_HALF_W, 9)
    expect(reachY('oil')).toBeGreaterThan(OIL_HALF_L)
  })

  it('has cones that are as wide as they look, and traffic as wide as a car', () => {
    expect(reachX('cone')).toBeCloseTo(CONE_HALF_W + CAR_HALF_W, 9)
    expect(reachX('traffic')).toBeCloseTo(CAR_HALF_W * 2, 9)
  })

  it('throws the car sideways on oil, and no damage', () => {
    const { race, r } = withThing('oil', 0)
    r.steer = 0.6
    let skid = 0
    for (let i = 0; i < 60 * 3 && r.hitLog.oil === 0; i++) {
      stepRace(race, 1 / 60, { steer: 0.6, brake: false, boost: false })
      skid = r.skid
    }
    expect(r.hitLog.oil).toBe(1)
    expect(r.damage).toBe(0)
    expect(Math.abs(skid)).toBeGreaterThan(0.3)
  })

  it('gives the wheel back faster if you ease off it than if you fight the skid', () => {
    const settle = (steer: number) => {
      const race = lab(0, [me()])
      const r = race.racers[0]
      r.skid = 1
      r.steer = steer
      for (let i = 0; i < 36; i++) stepRace(race, 1 / 60, { steer, brake: false, boost: false })
      return Math.abs(r.skid)
    }
    expect(settle(0)).toBeLessThan(settle(0.9))
  })

  it('leaves you behind a car you rear-end rather than inside it, and shoves you aside', () => {
    const { race, r } = withThing('traffic', 0, 22)
    run(race, 2.6)
    const traffic = race.hazards[0]
    expect(r.damage).toBeGreaterThan(0.1)
    expect(r.hitLog.traffic).toBe(1)
    // It is not overlapping the car it hit: either behind it, or off to one side.
    const behind = traffic.at + traffic.speed * race.t - r.dist >= 4.5 - 0.5
    const beside = Math.abs(r.x - traffic.lat) > CAR_HALF_W * 2
    expect(behind || beside).toBe(true)
    expect(r.lastHit?.id).toBe(1)
  })

  it('says what hit you and what it cost', () => {
    const { race, r } = withThing('traffic', 0, 22)
    const seen: string[] = []
    for (let i = 0; i < 180; i++) {
      stepRace(race, 1 / 60, NO_INPUT)
      for (const e of r.events.splice(0)) if (e.kind === 'hit') seen.push(`${e.cause}:${e.damage > 0}`)
    }
    expect(seen).toEqual(['traffic:true'])
    expect(r.damageBy.traffic).toBeCloseTo(r.damage, 9)
    expect(r.hitLog.wall).toBe(0)
  })

  it('warns of what is ahead in your path, and in time to do something about it', () => {
    const { race, r } = withThing('traffic', 0, 22)
    r.dist = 0
    r.v = 45
    // Far off: nothing to say.
    race.hazards[0].at = 400
    expect(threatOf(race, r)).toBeNull()
    // Closing: first a caution, then danger.
    race.hazards[0].at = 70
    expect(threatOf(race, r)?.level).toBe('caution')
    race.hazards[0].at = 30
    const close = threatOf(race, r)
    expect(close?.level).toBe('danger')
    expect(close?.kind).toBe('traffic')
    expect(close!.ttc).toBeGreaterThan(0)
    // Not in your lane: nothing to worry about.
    race.hazards[0].lat = 0.95
    expect(threatOf(race, r)).toBeNull()
    // And oil is a caution before it is a danger.
    race.hazards[0] = { id: 2, at: 90, lat: 0, kind: 'oil', speed: 0 }
    expect(threatOf(race, r)?.kind).toBe('oil')
  })

  it('tallies the cones, the walls and the cars separately', () => {
    const race = lab(0, [me()])
    race.hazards = [{ id: 1, at: 80, lat: 0, kind: 'cone', speed: 0 }]
    const r = race.racers[0]
    r.dist = 50
    r.x = 0
    run(race, 1.5)
    expect(r.hitLog.cone).toBe(1)
    expect(r.damageBy.cone).toBeGreaterThan(0)
    expect(r.hitLog.traffic).toBe(0)
    r.x = 1.7
    run(race, 0.2)
    expect(r.hitLog.wall).toBeGreaterThan(0)
    expect(r.damageBy.wall).toBeGreaterThan(0)
  })
})
