import type { Rng } from '../engine/rng'
import type { CarStats } from '../world/types'

/**
 * The race itself: a straight road, three lanes, and everything on it.
 *
 * Every car — yours and theirs — runs the same physics over the same road, so a
 * race is not rigged and a better car is simply faster. Nobody is slowed down to
 * keep it close and nobody is sped up to catch you: the only difference between
 * a driver and a driver is their car and how well they see the road. (It is the
 * poker rule applied to a different table: the game never fudges the odds.)
 *
 * Distances are metres, speeds metres a second, lanes are 0..LANES-1 and a car's
 * place across the road is a fraction of one.
 */

export const LANES = 3
export const CAR_LENGTH = 4.5
/** How close across the road two things must be to touch. */
const HIT_WIDTH = 0.62

export type HazardKind = 'traffic' | 'oil' | 'cone'

export interface Hazard {
  id: number
  /** Where along the road it starts. Traffic drives on from here. */
  at: number
  lane: number
  kind: HazardKind
  /** A traffic car's own speed; 0 for the rest. */
  speed: number
}

export interface Racer {
  id: string
  name: string
  paint: string
  stats: CarStats
  isPlayer: boolean
  /** 0..1: an AI driver's eyes and hands. Unused by the player. */
  skill: number
  x: number
  dist: number
  v: number
  /** Seconds left of steering you cannot use: you are sliding. */
  slide: number
  crashed: boolean
  /** The time the line was crossed, once it has been. */
  finish: number | null
  /** Hazards already hit, so each is struck once. */
  struck: number[]
  /** Hazards an AI has seen: the ones it can steer round. The rest it drives into. */
  seen: number[]
  /** An AI's chosen lane, and when it next thinks about it. */
  target: number
  thinkAt: number
}

export interface Race {
  length: number
  hazards: Hazard[]
  racers: Racer[]
  t: number
  rng: Rng
}

export interface Driver {
  id: string
  name: string
  stats: CarStats
  isPlayer: boolean
  skill: number
}

export interface Input {
  /** -1 left, 1 right. */
  steer: -1 | 0 | 1
  brake: boolean
}

export const NO_INPUT: Input = { steer: 0, brake: false }

/** What a car's stats mean on the road. */
export function topSpeedOf(stats: CarStats): number {
  return 38 + 2.2 * stats.topSpeed
}
export function accelOf(stats: CarStats): number {
  return topSpeedOf(stats) / 6.5
}
/** Lanes a second the wheel can move the car. */
export function steerRateOf(stats: CarStats): number {
  return 1.2 + 0.3 * stats.handling
}
const BRAKE = 42
/** The chance the worst driver sees any one hazard; the best sees all of them. */
const NOTICE_BASE = 0.86
const MIN_SPEED = 14

/** A fair shuffle. (`sort(() => rng() - 0.5)` is not one: it leaves the first item where it was far too often.) */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** The road: traffic, oil and cones, laid down from a seed and the same for every car. */
export function layRoad(length: number, traffic: number, rng: Rng): Hazard[] {
  const out: Hazard[] = []
  let at = 160
  let id = 0
  while (at < length - 120) {
    // One or two things across the road, never all three lanes: there is always a way through.
    const count = rng() < 0.4 ? 2 : 1
    const lanes = shuffle([0, 1, 2], rng).slice(0, count)
    for (const lane of lanes) {
      const roll = rng()
      const kind: HazardKind = roll < 0.55 ? 'traffic' : roll < 0.8 ? 'oil' : 'cone'
      out.push({ id: id++, at: at + (rng() - 0.5) * 8, lane, kind, speed: kind === 'traffic' ? 18 + rng() * 6 : 0 })
    }
    at += (78 + rng() * 52) / traffic
  }
  return out
}

export function startRace(length: number, traffic: number, drivers: Driver[], rng: Rng): Race {
  // Everyone starts level. Which lane is drawn, so no seat on the grid is a better one.
  const grid = shuffle(drivers.map((_, i) => i % LANES), rng)
  const racers = drivers.map<Racer>((d, i) => ({
    ...d,
    paint: d.stats.paint,
    x: grid[i],
    // Nobody leaves the line at exactly the same instant: a few metres of head start, give or take.
    dist: (rng() - 0.5) * 3,
    v: 0,
    slide: 0,
    crashed: false,
    finish: null,
    struck: [],
    seen: [],
    target: grid[i],
    thinkAt: 0,
  }))
  return { length, hazards: layRoad(length, traffic, rng), racers, t: 0, rng }
}

/** Where a hazard is at time t. */
export function hazardAt(h: Hazard, t: number): number {
  return h.at + h.speed * t
}

/** One car for one tick. */
function drive(race: Race, r: Racer, input: Input, dt: number) {
  if (r.crashed || r.finish !== null) return
  const { stats } = r
  const vmax = topSpeedOf(stats)
  if (input.brake) r.v = Math.max(MIN_SPEED, r.v - BRAKE * dt)
  else if (r.v < vmax) r.v = Math.min(vmax, r.v + accelOf(stats) * dt)
  if (r.slide > 0) r.slide -= dt
  else r.x = Math.max(0, Math.min(LANES - 1, r.x + input.steer * steerRateOf(stats) * dt))
  r.dist += r.v * dt

  for (const h of race.hazards) {
    if (r.struck.includes(h.id)) continue
    const pos = hazardAt(h, race.t)
    if (Math.abs(r.dist - pos) > CAR_LENGTH) continue
    if (Math.abs(r.x - h.lane) > HIT_WIDTH) continue
    r.struck.push(h.id)
    if (h.kind === 'traffic') {
      r.crashed = true
      r.v = 0
      return
    }
    if (h.kind === 'oil') {
      // Grip is what oil takes away: the less you have, the more you lose and the longer you slide.
      r.v *= 1 - Math.max(0.06, 0.38 - 0.03 * stats.grip)
      r.slide = Math.max(0.25, 0.95 - 0.07 * stats.grip)
    } else {
      r.v *= 0.82
    }
  }
  // The line is crossed somewhere inside the tick, not at its end.
  if (r.dist >= race.length) r.finish = race.t - (r.dist - race.length) / Math.max(r.v, 1)
}

/** What an AI does with the wheel: look ahead as far as its eyes go, and take the clearest lane. */
export function aiInput(race: Race, r: Racer): Input {
  if (race.t >= r.thinkAt) {
    r.thinkAt = race.t + 0.12
    const reach = r.v * (0.2 + 1.0 * r.skill) + 5
    const here = Math.round(r.x)
    let best = r.target
    let bestClear = -1
    for (const lane of [here, here - 1, here + 1]) {
      if (lane < 0 || lane >= LANES) continue
      let clear = reach
      for (const h of race.hazards) {
        if (h.lane !== lane) continue
        const gap = hazardAt(h, race.t) - r.dist
        if (gap < -CAR_LENGTH || gap > reach) continue
        // The first time something comes into view, a driver either sees it or does not.
        if (!r.seen.includes(h.id)) {
          r.seen.push(h.id)
          if (race.rng() > NOTICE_BASE + (1 - NOTICE_BASE) * r.skill) r.seen.push(-h.id - 1)
        }
        if (r.seen.includes(-h.id - 1)) continue
        // A car is a wall, oil is a nuisance, and a cone is a bruise.
        const weight = h.kind === 'traffic' ? 1 : h.kind === 'oil' ? 0.55 : 0.3
        clear = Math.min(clear, Math.max(0, gap) / weight)
      }
      // Staying where you are is slightly preferred: nobody weaves for nothing.
      const score = clear + (lane === here ? 6 : 0) - Math.abs(lane - r.x) * 2
      if (score > bestClear) {
        bestClear = score
        best = lane
      }
    }
    r.target = best
    // Now and then a driver does something silly. Better drivers do it less often.
    if (race.rng() < 0.05 * (1 - r.skill) * (1 - r.skill)) r.target = Math.floor(race.rng() * LANES)
  }
  const gap = r.target - r.x
  return { steer: Math.abs(gap) < 0.05 ? 0 : gap > 0 ? 1 : -1, brake: false }
}

/** Moves the whole race on by dt, with `input` for the player and the AI for the rest. */
export function stepRace(race: Race, dt: number, input: Input) {
  race.t += dt
  for (const r of race.racers) drive(race, r, r.isPlayer ? input : aiInput(race, r), dt)
}

export function over(race: Race): boolean {
  return race.racers.every((r) => r.crashed || r.finish !== null)
}

/** Lets the rest of the field run to the line (or the wall) once the player is done. */
export function runOut(race: Race, limit = 180) {
  while (!over(race) && race.t < limit) stepRace(race, 1 / 30, NO_INPUT)
}

/** 1 is first. Crashed cars are below everyone who finished. */
export function placeOf(race: Race, id: string): number {
  const order = [...race.racers].sort((a, b) => {
    if (a.crashed !== b.crashed) return a.crashed ? 1 : -1
    if (a.finish !== null && b.finish !== null) return a.finish - b.finish
    if (a.finish !== null) return -1
    if (b.finish !== null) return 1
    return b.dist - a.dist
  })
  return order.findIndex((r) => r.id === id) + 1
}

export interface Settlement {
  /** Cash in or out, repairs counted: negative when you lose. */
  cash: number
  place: number
  crashed: boolean
  /** Pink slip: whether the car changes hands. */
  wonCar: boolean
  lostCar: boolean
  winner: string
}

/**
 * What the race was worth. A cash race wins `pays` times the stake for first
 * place and loses the stake otherwise; a crash loses the repairs on top. A
 * pink slip moves the car and no cash — except the repairs, if you wrecked it.
 */
export function settle(
  race: Race,
  playerId: string,
  o: { stake: number; pays: number; pinkSlip: boolean; repair: number },
): Settlement {
  const me = race.racers.find((r) => r.id === playerId)!
  const place = placeOf(race, playerId)
  const winner = [...race.racers].sort((a, b) => placeOf(race, a.id) - placeOf(race, b.id))[0]
  const won = place === 1
  if (o.pinkSlip) {
    return { cash: 0, place, crashed: me.crashed, wonCar: won, lostCar: !won, winner: winner.name }
  }
  const cash = won ? Math.round(o.stake * o.pays) : -o.stake - (me.crashed ? o.repair : 0)
  return { cash, place, crashed: me.crashed, wonCar: false, lostCar: false, winner: winner.name }
}
