import type { Rng } from '../engine/rng'
import type { CarStats } from '../world/types'
import { SEG, buildTrack, curveAt, slopeAt, type Track, type TrackSpec } from './raceTrack'

/**
 * The race itself: a bending, rising road, traffic on it, and cars that drive it.
 *
 * Every car — yours and theirs — runs the same physics over the same road, so a
 * better car is faster and nobody is slowed down to keep it close or sped up to
 * catch you. A rival is good because it brakes at the right place and sees the
 * road, not because the game helps it. (It is the poker rule on a different
 * table: the game never fudges the odds.)
 *
 * What the model has, because the best racers all have it:
 *
 * - **Grip that gives out gradually.** A bend asks for a lateral force that
 *   grows with the square of your speed. Under the limit the car goes where you
 *   point it; over it, steering goes soft (understeer), the car drifts wide and
 *   scrubs speed. It is a slope, not a cliff, so you feel it going and can lift.
 * - **Weight on the nose.** Braking while turning takes grip off the rear.
 * - **Damage, not a switch.** A scrape costs a little, a wall or a rear-ender
 *   costs by how hard it was, and enough of it is a wreck. The repair bill is the
 *   damage done.
 * - **Boost you earn.** Slipstreaming, near misses with traffic and holding a
 *   slide through a bend fill a meter; spending it is a burst of speed.
 *
 * Distances are metres, speeds metres a second, a car's place across the road is
 * in road halves (-1 is the left edge of the tarmac, 1 the right).
 */

export const CAR_LENGTH = 4.5
/** How close across the road two cars must be to touch. */
const HIT_X = 0.42
/** The speed a car's demand on its tyres is measured against. */
export const VREF = 50
const WALL = 1.5
const LANES = [-0.6, 0, 0.6]

export type HazardKind = 'traffic' | 'oil' | 'cone'

export interface Hazard {
  id: number
  at: number
  /** Where across the road. */
  lat: number
  kind: HazardKind
  /** A traffic car's own speed; 0 for the rest. */
  speed: number
}

export type RaceEvent =
  | { kind: 'hit'; strength: number }
  | { kind: 'wall'; strength: number }
  | { kind: 'scrape' }
  | { kind: 'nearMiss' }
  | { kind: 'oil' }
  | { kind: 'wreck' }

export interface Racer {
  id: string
  name: string
  paint: string
  stats: CarStats
  isPlayer: boolean
  /** 0..1: an AI driver's eyes, hands and nerve. Unused by the player. */
  skill: number
  x: number
  dist: number
  v: number
  /** The wheel, -1..1, after the car has turned the input into steering. */
  steer: number
  /** How far past the limit of grip the tyres are, from 0. */
  slide: number
  /** 0..1: how hurt the car is. At 1 it is a wreck. */
  damage: number
  wrecked: boolean
  finish: number | null
  braking: boolean
  /** The boost meter, 0..1. */
  boost: number
  boosting: boolean
  /** Seconds left on oil, and seconds left spinning out. */
  oil: number
  spin: number
  /** Whether it is in somebody's slipstream right now. */
  draft: boolean
  /** Hits and near misses, for the pictures and the audio: pushed by the sim and cleared by whoever reads them. */
  events: RaceEvent[]
  topSpeed: number
  struck: number[]
  passed: number[]
  seen: number[]
  target: number
  thinkAt: number
  wobble: number
  wobbleT: number
  wallT: number
}

export interface Race {
  track: Track
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
  /** -1 full left, 1 full right. */
  steer: number
  brake: boolean
  boost: boolean
}

export const NO_INPUT: Input = { steer: 0, brake: false, boost: false }

// --- what a car's stats mean -----------------------------------------------

export function topSpeedOf(stats: CarStats): number {
  return 41 + 1.5 * stats.topSpeed
}
export function accelOf(stats: CarStats): number {
  return topSpeedOf(stats) / 6.2
}
/** How hard the tyres can hold a bend. */
export function gripOf(stats: CarStats): number {
  return 1 + 0.15 * stats.grip
}
/** Road halves a second the wheel can move the car at the reference speed. */
export function steerGainOf(stats: CarStats): number {
  return 0.8 + 0.1 * stats.handling
}
const BRAKE = 38
const MIN_SPEED = 8
/** How hard a bend of 1 shoves a car wide at the reference speed. */
const PUSH = 0.42
const MID_GRIP = 1.75

/** The speed at which a bend of `c` asks for exactly the grip there is. */
export function safeSpeed(stats: CarStats, c: number): number {
  return VREF * Math.sqrt(gripOf(stats) / Math.max(0.2, Math.abs(c)))
}

// --- the road ----------------------------------------------------------------

/** A fair shuffle. (`sort(() => rng() - 0.5)` is not one: it leaves the first item where it was far too often.) */
function shuffle<T>(items: T[], rng: Rng): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Traffic, oil and cones, laid down from a seed: the same for every car. */
export function layRoad(length: number, traffic: number, rng: Rng): Hazard[] {
  const out: Hazard[] = []
  let at = 170
  let id = 0
  while (at < length - 130) {
    // One or two things across the road, never all three lanes: there is always a way through.
    const count = rng() < 0.35 ? 2 : 1
    const lanes = shuffle(LANES, rng).slice(0, count)
    for (const lat of lanes) {
      const roll = rng()
      const kind: HazardKind = roll < 0.6 ? 'traffic' : roll < 0.82 ? 'oil' : 'cone'
      out.push({ id: id++, at: at + (rng() - 0.5) * 10, lat, kind, speed: kind === 'traffic' ? 20 + rng() * 8 : 0 })
    }
    at += (92 + rng() * 70) / traffic
  }
  return out
}

/**
 * `trackRng` lays the road and `rng` everything on it. A circuit is the same road
 * every time you race it — you learn where to brake — while the traffic is new.
 */
export function startRace(length: number, traffic: number, spec: TrackSpec, drivers: Driver[], rng: Rng, trackRng: Rng = rng): Race {
  const track = buildTrack(length, spec, trackRng)
  // A grid two across, each row a car's length back. Which slot is drawn, so no seat is a better one.
  const slots = shuffle(drivers.map((_, i) => i), rng)
  const racers = drivers.map<Racer>((d, i) => ({
    ...d,
    paint: d.stats.paint,
    x: slots[i] % 2 === 0 ? -0.45 : 0.45,
    // Nobody leaves the line at exactly the same instant: a few metres of head start, give or take.
    dist: -Math.floor(slots[i] / 2) * 8 + (rng() - 0.5) * 1.6,
    v: 0,
    steer: 0,
    slide: 0,
    damage: 0,
    wrecked: false,
    finish: null,
    braking: false,
    boost: 0,
    boosting: false,
    oil: 0,
    spin: 0,
    draft: false,
    events: [],
    topSpeed: 0,
    struck: [],
    passed: [],
    seen: [],
    target: slots[i] % 2 === 0 ? -0.45 : 0.45,
    thinkAt: 0,
    wobble: 0,
    wobbleT: 0,
    wallT: 0,
  }))
  return { track, length, hazards: layRoad(length, traffic, rng), racers, t: 0, rng }
}

/** Where a hazard is at time t. */
export function hazardAt(h: Hazard, t: number): number {
  return h.at + h.speed * t
}

// --- one car, one tick -------------------------------------------------------

function demandOf(r: Racer, c: number): number {
  const vr = r.v / VREF
  let cap = gripOf(r.stats)
  if (r.oil > 0) cap *= 0.42
  // Weight on the nose: hard on the brakes in a bend takes grip off the rear.
  if (r.braking && Math.abs(r.steer) > 0.3) cap *= 0.9
  if (Math.abs(r.x) > 1) cap *= 0.6
  return (Math.abs(c) * vr * vr) / cap
}

function hurt(r: Racer, amount: number) {
  r.damage = Math.min(1, r.damage + amount)
  if (r.damage >= 1 && !r.wrecked) {
    r.wrecked = true
    r.events.push({ kind: 'wreck' })
  }
}

function drive(race: Race, r: Racer, input: Input, dt: number) {
  const { track } = race
  if (r.finish !== null && r.v < 1) return
  const stats = r.stats
  const vmax = topSpeedOf(stats)
  const c = curveAt(track, Math.max(0, r.dist))
  const slope = slopeAt(track, Math.max(0, r.dist))

  if (r.wrecked) {
    r.v = Math.max(0, r.v - 22 * dt)
    r.dist += r.v * dt
    r.slide = 0
    return
  }

  const done = r.finish !== null
  r.braking = done ? true : input.brake
  // The wheel follows the input, not instantly.
  const want = done ? 0 : Math.max(-1, Math.min(1, input.steer))
  r.steer += (want - r.steer) * Math.min(1, 14 * dt)

  // Boost: spend the meter while asked for.
  r.boosting = !done && input.boost && r.boost > 0.02
  if (r.boosting) r.boost = Math.max(0, r.boost - 0.34 * dt)

  // Speed.
  let cap = vmax * (r.boosting ? 1.13 : 1) * (r.draft ? 1.035 : 1)
  if (Math.abs(r.x) > 1) cap = Math.min(cap, vmax * 0.42)
  if (r.braking) {
    r.v = Math.max(MIN_SPEED, r.v - BRAKE * dt)
  } else if (r.v < cap) {
    r.v = Math.min(cap, r.v + accelOf(stats) * (1.15 - (r.v / cap) ** 2) * (r.boosting ? 1.9 : 1) * dt)
  } else {
    r.v = Math.max(cap, r.v - 14 * dt)
  }
  // Up a hill is slower; down it is faster.
  r.v = Math.max(MIN_SPEED, r.v - slope * 28 * dt)

  // Across the road.
  const vr = r.v / VREF
  const demand = demandOf(r, c)
  r.slide = Math.max(0, demand - 0.9)
  const spinning = r.spin > 0
  if (spinning) r.spin -= dt
  // Past the limit the wheel goes soft.
  const auth = (1 / (1 + Math.max(0, demand - 1) * 2.5)) * (spinning ? 0.15 : 1) * (r.oil > 0 ? 0.5 : 1)
  const steering = r.steer * steerGainOf(stats) * vr * auth
  let push = c * vr * vr * PUSH * (MID_GRIP / (gripOf(stats) * (r.oil > 0 ? 0.42 : 1)))
  if (demand > 1) {
    push *= 1 + (demand - 1) * 1.2
    r.v = Math.max(MIN_SPEED, r.v - (demand - 1) * 16 * vr * dt)
  }
  r.x += (steering - push) * dt
  if (r.oil > 0) r.oil -= dt
  if (r.wallT > 0) r.wallT -= dt

  // A held slide through a bend is how you earn boost the hard way.
  if (demand > 1 && demand < 1.8 && r.v > 20) r.boost = Math.min(1, r.boost + 0.2 * dt)
  if (r.draft) r.boost = Math.min(1, r.boost + 0.07 * dt)

  // The wall.
  if (Math.abs(r.x) > WALL) {
    r.x = Math.sign(r.x) * WALL
    if (r.wallT <= 0) {
      const strength = Math.min(1, r.v / vmax)
      hurt(r, 0.04 + 0.4 * strength * strength)
      r.v *= 0.6
      r.wallT = 0.45
      r.events.push({ kind: 'wall', strength })
    } else {
      r.v *= 1 - 1.5 * dt
    }
  }

  r.dist += r.v * dt
  if (r.v > r.topSpeed) r.topSpeed = r.v
  hits(race, r, vmax)
  if (r.dist >= race.length && r.finish === null) r.finish = race.t - (r.dist - race.length) / Math.max(r.v, 1)
}

/** Everything on the road that is not a car under glass. */
function hits(race: Race, r: Racer, vmax: number) {
  for (const h of race.hazards) {
    const gap = hazardAt(h, race.t) - r.dist
    const lateral = Math.abs(r.x - h.lat)
    if (h.kind === 'traffic' && !r.passed.includes(h.id) && gap < -CAR_LENGTH && gap > -CAR_LENGTH - 2.5 && !r.struck.includes(h.id)) {
      // Slipped by with a car-width to spare is a near miss: skilled, and worth a little.
      r.passed.push(h.id)
      if (lateral < HIT_X + 0.34 && r.v > 25) {
        r.boost = Math.min(1, r.boost + 0.1)
        r.events.push({ kind: 'nearMiss' })
      }
    }
    if (r.struck.includes(h.id)) continue
    if (Math.abs(gap) > CAR_LENGTH || lateral > HIT_X) continue
    r.struck.push(h.id)
    if (h.kind === 'traffic') {
      const rel = Math.max(0, r.v - h.speed)
      const overlap = 1 - lateral / HIT_X
      const strength = Math.min(1, rel / vmax)
      hurt(r, (0.06 + 0.95 * strength) * (0.35 + 0.65 * overlap))
      r.v = Math.max(MIN_SPEED, Math.min(r.v, h.speed + rel * 0.35))
      r.x += (r.x >= h.lat ? 1 : -1) * 0.25
      r.spin = 0.35 + 0.5 * strength
      r.events.push({ kind: 'hit', strength })
    } else if (h.kind === 'oil') {
      r.oil = 1.3
      r.events.push({ kind: 'oil' })
    } else {
      hurt(r, 0.035)
      r.v *= 0.93
      r.events.push({ kind: 'scrape' })
    }
  }
}

/** The cars touch: the rear one backs off and both are shoved apart. */
function contact(a: Racer, b: Racer, dt: number) {
  const gap = a.dist - b.dist
  if (Math.abs(gap) > CAR_LENGTH || Math.abs(a.x - b.x) > HIT_X) return
  const [front, rear] = gap >= 0 ? [a, b] : [b, a]
  if (!rear.wrecked) {
    const rel = Math.max(0, rear.v - front.v)
    if (rel > 3) {
      hurt(rear, 0.02 + 0.4 * (rel / VREF))
      if (!front.wrecked) hurt(front, 0.01 + 0.15 * (rel / VREF))
      rear.events.push({ kind: 'hit', strength: Math.min(1, rel / 30) })
    }
    rear.v = Math.max(MIN_SPEED, Math.min(rear.v, front.v * 0.97))
  }
  const push = (a.x >= b.x ? 1 : -1) * 1.1 * dt
  a.x += push
  b.x -= push
}

/** Who is in whose slipstream. */
function draftWho(race: Race) {
  const traffic = race.hazards.filter((h) => h.kind === 'traffic')
  for (const r of race.racers) {
    r.draft = false
    if (r.wrecked || r.finish !== null) continue
    const near = (at: number, lat: number) => at - r.dist > CAR_LENGTH + 1 && at - r.dist < 26 && Math.abs(lat - r.x) < 0.4
    r.draft =
      race.racers.some((o) => o !== r && !o.wrecked && near(o.dist, o.x)) ||
      traffic.some((h) => near(hazardAt(h, race.t), h.lat))
  }
}

// --- the AI -----------------------------------------------------------------

/** The chance the worst driver sees any one hazard; the best sees all of them. */
const NOTICE_BASE = 0.72

interface Ahead {
  gap: number
  lat: number
  speed: number
  weight: number
}

function whatIsAhead(race: Race, r: Racer, look: number): Ahead[] {
  const out: Ahead[] = []
  for (const h of race.hazards) {
    const gap = hazardAt(h, race.t) - r.dist
    if (gap < -CAR_LENGTH || gap > look) continue
    // The first time something comes into view, a driver either sees it or does not.
    if (!r.seen.includes(h.id)) {
      r.seen.push(h.id)
      if (race.rng() > NOTICE_BASE + (1 - NOTICE_BASE) * r.skill) r.seen.push(-h.id - 1)
    }
    if (r.seen.includes(-h.id - 1)) continue
    out.push({ gap, lat: h.lat, speed: h.speed, weight: h.kind === 'traffic' ? 1 : h.kind === 'oil' ? 0.55 : 0.3 })
  }
  for (const o of race.racers) {
    if (o === r) continue
    const gap = o.dist - r.dist
    if (gap < -CAR_LENGTH || gap > look) continue
    out.push({ gap, lat: o.x, speed: o.wrecked ? 0 : o.v, weight: o.wrecked ? 1 : 0.8 })
  }
  return out
}

/** What an AI does with the wheel and pedals: brake for the bend, take the line, avoid the traffic, boost the straight. */
export function aiInput(race: Race, r: Racer): Input {
  const stats = r.stats
  const look = r.v * (0.9 + 1.1 * r.skill) + 14
  const things = whatIsAhead(race, r, look)
  if (race.t >= r.thinkAt) {
    r.thinkAt = race.t + 0.1
    const aheadC = curveAt(race.track, r.dist + look * 0.55)
    // Cut toward the inside of the bend that is coming.
    const line = Math.max(-0.62, Math.min(0.62, aheadC * 0.2))
    let best = line
    let bestScore = -Infinity
    for (const lane of [...LANES, line]) {
      let clear = look
      for (const t of things) {
        if (Math.abs(t.lat - lane) > 0.46) continue
        clear = Math.min(clear, Math.max(0, t.gap) / t.weight)
      }
      const score = clear - 16 * Math.abs(lane - line) - 6 * Math.abs(lane - r.x)
      if (score > bestScore) {
        bestScore = score
        best = lane
      }
    }
    r.target = best
    if (race.rng() < 0.04 * (1 - r.skill) * (1 - r.skill)) {
      r.wobble = (race.rng() - 0.5) * 1.6
      r.wobbleT = 0.5
    }
  }
  if (r.wobbleT > 0) r.wobbleT -= 1 / 60

  const c = curveAt(race.track, r.dist)
  const vr = r.v / VREF
  const feed = (c * vr * vr * PUSH * (MID_GRIP / gripOf(stats))) / (steerGainOf(stats) * Math.max(0.3, vr))
  const steer = (r.target - r.x) * 2.8 + feed * (0.65 + 0.35 * r.skill) + (r.wobbleT > 0 ? r.wobble : 0)

  // Brake for a bend it cannot take at this speed: work backwards from the apex.
  let brake = false
  const margin = 0.72 + 0.28 * r.skill
  for (let d = 0; d <= look; d += SEG) {
    const vs = safeSpeed(stats, curveAt(race.track, r.dist + d)) * margin
    if (r.v > vs && d <= (r.v * r.v - vs * vs) / (2 * BRAKE * 0.85) + 4) {
      brake = true
      break
    }
  }
  if (demandOf(r, c) > 1.2) brake = true
  // And for the traffic it cannot get round.
  for (const t of things) {
    if (Math.abs(t.lat - r.x) > 0.5 || t.weight < 0.7) continue
    const closing = r.v - t.speed
    if (closing > 0 && t.gap > 0 && t.gap < closing * 0.55 + 5 && Math.abs(r.target - t.lat) < 0.46) brake = true
  }
  const straight = Math.abs(c) < 1.2 && Math.abs(curveAt(race.track, r.dist + look * 0.6)) < 1.5
  const boost = (r.boost > 0.4 || (r.boosting && r.boost > 0.02)) && straight && !brake
  return { steer: Math.max(-1, Math.min(1, steer)), brake, boost }
}

// --- the race ----------------------------------------------------------------

/** Moves the whole race on by dt, with `input` for the player and the AI for the rest. */
export function stepRace(race: Race, dt: number, input: Input) {
  race.t += dt
  draftWho(race)
  for (const r of race.racers) drive(race, r, r.isPlayer ? input : aiInput(race, r), dt)
  for (let i = 0; i < race.racers.length; i++) {
    for (let j = i + 1; j < race.racers.length; j++) contact(race.racers[i], race.racers[j], dt)
  }
}

export function over(race: Race): boolean {
  return race.racers.every((r) => (r.wrecked && r.v < 0.5) || r.finish !== null)
}

/** Lets the rest of the field run to the line (or the wall) once the player is done. */
export function runOut(race: Race, limit = 240) {
  while (!over(race) && race.t < limit) stepRace(race, 1 / 30, NO_INPUT)
}

/** 1 is first. Wrecks are below everyone who finished. */
export function placeOf(race: Race, id: string): number {
  const order = [...race.racers].sort((a, b) => {
    if (a.wrecked !== b.wrecked) return a.wrecked ? 1 : -1
    if (a.finish !== null && b.finish !== null) return a.finish - b.finish
    if (a.finish !== null) return -1
    if (b.finish !== null) return 1
    return b.dist - a.dist
  })
  return order.findIndex((r) => r.id === id) + 1
}

export interface Settlement {
  place: number
  wrecked: boolean
  /** Cash back at the line, before repairs: the stake and the winnings, or nothing. */
  payout: number
  /** What the damage costs to put right. */
  repairs: number
  /** Net against before the bet: negative when you lose. */
  cash: number
  /** Pink slip: whether the car changes hands. */
  wonCar: boolean
  lostCar: boolean
  winner: string
  /** Finish times by id, for the standings. */
  times: Array<{ id: string; name: string; time: number | null; wrecked: boolean }>
}

/**
 * What the race was worth. A cash race returns the stake and `pays` times it for
 * first place and nothing otherwise; the repairs come off either way, in
 * proportion to the damage, and a wreck is the whole bill. A pink slip moves the
 * car and no cash.
 */
export function settle(
  race: Race,
  playerId: string,
  o: { stake: number; pays: number; pinkSlip: boolean; repair: number },
): Settlement {
  const me = race.racers.find((r) => r.id === playerId)!
  const place = placeOf(race, playerId)
  const ordered = [...race.racers].sort((a, b) => placeOf(race, a.id) - placeOf(race, b.id))
  const won = place === 1
  const repairs = me.wrecked ? o.repair : Math.round(o.repair * Math.min(1, me.damage))
  const times = ordered.map((r) => ({ id: r.id, name: r.name, time: r.finish, wrecked: r.wrecked }))
  const base = { place, wrecked: me.wrecked, winner: ordered[0].name, times }
  if (o.pinkSlip) {
    // A lost car is not repaired by anybody; a kept one is.
    return { ...base, payout: 0, repairs: won ? repairs : 0, cash: won ? -repairs : 0, wonCar: won, lostCar: !won }
  }
  const payout = won ? Math.round(o.stake * (1 + o.pays)) : 0
  return { ...base, payout, repairs, cash: payout - o.stake - repairs, wonCar: false, lostCar: false }
}
