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
/**
 * How far apart along the road two cars' middles are when they touch. The picture draws a car as a
 * flat rear view at its middle, so there is no body in front of or behind that point to touch with:
 * the cars meet when their pictures do, not a whole car-length before.
 */
export const CAR_REACH = 1.3
/**
 * What things measure, in the units the view draws them in. The sim and the
 * picture both read these, so what you can see touching is what touches: a slick
 * is as wide on the road as it looks, and a car's sides are where they seem to be.
 */
export const CAR_HALF_W = 0.23
/** Road halves across: the half-width of each thing's footprint. */
export const OIL_HALF_W = 0.3
export const CONE_HALF_W = 0.22
/** Metres along the road: half the length of each thing's footprint. */
export const OIL_HALF_L = 3.2
export const CONE_HALF_L = 0.7
/** How close across the road two cars must be to touch. */
const HIT_X = CAR_HALF_W * 2
/** The speed a car's demand on its tyres is measured against. */
export const VREF = 50
const WALL = 1.5
const LANES = [-0.6, 0, 0.6]
/** Where an AI will put its car: the lanes, and the two lines out by the edges, to get round a slick. */
const LINES = [-0.85, -0.6, 0, 0.6, 0.85]

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

/** What hurt, or what happened, so the screen can say so. */
export type Cause = 'traffic' | 'car' | 'wreck' | 'wall' | 'cone' | 'oil'

export type RaceEvent =
  | { kind: 'hit'; cause: 'traffic' | 'car' | 'wreck'; strength: number; damage: number; id: number | string }
  | { kind: 'wall'; strength: number; damage: number }
  | { kind: 'scrape'; damage: number; id: number }
  | { kind: 'nearMiss' }
  | { kind: 'oil'; id: number }
  | { kind: 'wreck' }

/** How often each thing got you, and how much of the car it took. */
export type Tally = Record<Cause, number>
export const emptyTally = (): Tally => ({ traffic: 0, car: 0, wreck: 0, wall: 0, cone: 0, oil: 0 })

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
  /** Sideways speed from a shove or a slick, in road halves a second; it dies away. */
  skid: number
  /** What has hurt this car, how many times and how much. */
  hitLog: Tally
  damageBy: Tally
  /** The last thing hit and when (race time), so the view can mark it. */
  lastHit: { id: number | string; t: number } | null
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

/** How far across the road a car's middle has to be from a thing's middle to touch it. */
export function reachX(kind: HazardKind): number {
  return kind === 'traffic' ? HIT_X : kind === 'oil' ? OIL_HALF_W + CAR_HALF_W : CONE_HALF_W + CAR_HALF_W
}

/** Where along the road a thing touches, from its middle, for a car this long. */
export function reachY(kind: HazardKind): number {
  return kind === 'traffic' ? CAR_REACH : kind === 'oil' ? OIL_HALF_L + CAR_REACH / 2 : CONE_HALF_L + CAR_REACH / 2
}

/** The widest a car's middle can be put without leaving the tarmac. */
const KEEP = 0.85

/** Whether there is anywhere across the road to put a car's middle that touches none of these. */
export function hasWayThrough(things: Array<{ kind: HazardKind; lat: number }>): boolean {
  for (let x = -KEEP; x <= KEEP + 1e-9; x += 0.05) {
    if (things.every((t) => Math.abs(x - t.lat) > reachX(t.kind))) return true
  }
  return false
}

/** Traffic, oil and cones, laid down from a seed: the same for every car. */
export function layRoad(length: number, traffic: number, rng: Rng): Hazard[] {
  const out: Hazard[] = []
  let at = 170
  let id = 0
  while (at < length - 130) {
    // One or two things across the road, and always a way through them: a slick is as wide as it looks,
    // so there has to be room beside it, not just an empty lane.
    const count = rng() < 0.35 ? 2 : 1
    const cluster: Hazard[] = []
    for (const lat of shuffle(LANES, rng).slice(0, count)) {
      const roll = rng()
      const kind: HazardKind = roll < 0.64 ? 'traffic' : roll < 0.8 ? 'oil' : 'cone'
      const next: Hazard = { id: id++, at: at + (rng() - 0.5) * 10, lat, kind, speed: kind === 'traffic' ? 20 + rng() * 8 : 0 }
      if (hasWayThrough([...cluster, next])) cluster.push(next)
    }
    out.push(...cluster)
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
    skid: 0,
    hitLog: emptyTally(),
    damageBy: emptyTally(),
    lastHit: null,
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

/** Takes `amount` off the car, on the books under `cause`; returns what it actually cost. */
function hurt(r: Racer, amount: number, cause: Cause): number {
  const before = r.damage
  r.damage = Math.min(1, r.damage + amount)
  const cost = r.damage - before
  r.hitLog[cause]++
  r.damageBy[cause] += cost
  if (r.damage >= 1 && !r.wrecked) {
    r.wrecked = true
    r.events.push({ kind: 'wreck' })
  }
  return cost
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
  const auth = (1 / (1 + Math.max(0, demand - 1) * 2.5)) * (spinning ? 0.15 : 1) * (r.oil > 0 ? 0.3 : 1)
  const steering = r.steer * steerGainOf(stats) * vr * auth
  let push = c * vr * vr * PUSH * (MID_GRIP / (gripOf(stats) * (r.oil > 0 ? 0.42 : 1)))
  if (demand > 1) {
    push *= 1 + (demand - 1) * 1.2
    r.v = Math.max(MIN_SPEED, r.v - (demand - 1) * 16 * vr * dt)
  }
  r.x += (steering - push + r.skid) * dt
  // A skid dies away faster if you ease off the wheel than if you fight it.
  r.skid *= Math.exp(-dt / (Math.abs(r.steer) < 0.25 ? 0.35 : 0.8))
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
      const damage = hurt(r, 0.04 + 0.4 * strength * strength, 'wall')
      r.v *= 0.6
      r.wallT = 0.45
      // It throws you back off the wall.
      r.skid = -Math.sign(r.x) * (0.5 + 1.3 * strength)
      r.events.push({ kind: 'wall', strength, damage })
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
    const pos = hazardAt(h, race.t)
    const gap = pos - r.dist
    const lateral = Math.abs(r.x - h.lat)
    if (h.kind === 'traffic' && !r.passed.includes(h.id) && gap < -CAR_REACH && gap > -CAR_REACH - 2.5 && !r.struck.includes(h.id)) {
      // Slipped by with a car-width to spare is a near miss: skilled, and worth a little.
      r.passed.push(h.id)
      if (lateral < HIT_X + 0.34 && r.v > 25) {
        r.boost = Math.min(1, r.boost + 0.1)
        r.events.push({ kind: 'nearMiss' })
      }
    }
    if (r.struck.includes(h.id)) continue
    // Each thing touches over its own footprint, the one it is drawn with.
    if (Math.abs(gap) > reachY(h.kind) || lateral > reachX(h.kind)) continue
    r.struck.push(h.id)
    r.lastHit = { id: h.id, t: race.t }
    if (h.kind === 'traffic') {
      const rel = Math.max(0, r.v - h.speed)
      const overlap = 1 - lateral / HIT_X
      const strength = Math.min(1, rel / vmax)
      const damage = hurt(r, (0.06 + 0.95 * strength) * (0.35 + 0.65 * overlap), 'traffic')
      // Rear-ended it: you stop being inside it. You end up behind it, slowed to about its speed.
      if (overlap > 0.5 && gap > 0) {
        r.dist = Math.min(r.dist, pos - CAR_REACH + 0.1)
        r.v = Math.max(MIN_SPEED, Math.min(r.v, h.speed * 0.95))
      } else {
        r.v = Math.max(MIN_SPEED, Math.min(r.v, h.speed + rel * 0.4))
      }
      // And it shoves you off to the side you were already further toward.
      r.skid += (r.x >= h.lat ? 1 : -1) * (0.7 + 1.5 * strength)
      r.spin = 0.3 + 0.5 * strength
      r.events.push({ kind: 'hit', cause: 'traffic', strength, damage, id: h.id })
    } else if (h.kind === 'oil') {
      // Oil takes the grip away; the car goes on in the direction it was already moving.
      r.oil = 0.8
      r.hitLog.oil++
      r.skid += Math.sign(r.steer || (race.rng() < 0.5 ? -1 : 1)) * (0.3 + 0.3 * Math.min(1, r.v / vmax))
      r.events.push({ kind: 'oil', id: h.id })
    } else {
      const damage = hurt(r, 0.035, 'cone')
      r.v *= 0.93
      r.events.push({ kind: 'scrape', damage, id: h.id })
    }
  }
}

/** The cars touch: the rear one backs off and both are shoved apart. */
function contact(a: Racer, b: Racer, dt: number, t: number) {
  const gap = a.dist - b.dist
  if (Math.abs(gap) > CAR_REACH || Math.abs(a.x - b.x) > HIT_X) return
  const [front, rear] = gap >= 0 ? [a, b] : [b, a]
  if (!rear.wrecked) {
    const rel = Math.max(0, rear.v - front.v)
    if (rel > 3) {
      const cause = front.wrecked ? 'wreck' : 'car'
      const damage = hurt(rear, 0.02 + 0.4 * (rel / VREF), cause)
      if (!front.wrecked) hurt(front, 0.01 + 0.15 * (rel / VREF), 'car')
      rear.lastHit = { id: front.id, t }
      rear.events.push({ kind: 'hit', cause, strength: Math.min(1, rel / 30), damage, id: front.id })
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
    const near = (at: number, lat: number) => at - r.dist > CAR_REACH + 1 && at - r.dist < 26 && Math.abs(lat - r.x) < 0.4
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
  /** How far across the road from its middle it touches. */
  reach: number
}

function whatIsAhead(race: Race, r: Racer, look: number): Ahead[] {
  const out: Ahead[] = []
  for (const h of race.hazards) {
    const gap = hazardAt(h, race.t) - r.dist
    if (gap < -CAR_REACH || gap > look) continue
    // The first time something comes into view, a driver either sees it or does not.
    if (!r.seen.includes(h.id)) {
      r.seen.push(h.id)
      if (race.rng() > NOTICE_BASE + (1 - NOTICE_BASE) * r.skill) r.seen.push(-h.id - 1)
    }
    if (r.seen.includes(-h.id - 1)) continue
    out.push({ gap, lat: h.lat, speed: h.speed, weight: h.kind === 'traffic' ? 1 : h.kind === 'oil' ? 0.55 : 0.3, reach: reachX(h.kind) })
  }
  for (const o of race.racers) {
    if (o === r) continue
    const gap = o.dist - r.dist
    if (gap < -CAR_REACH || gap > look) continue
    out.push({ gap, lat: o.x, speed: o.wrecked ? 0 : o.v, weight: o.wrecked ? 1 : 0.8, reach: HIT_X })
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
    for (const lane of [...LINES, line]) {
      let clear = look
      for (const t of things) {
        if (Math.abs(t.lat - lane) > t.reach) continue
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
    if (Math.abs(t.lat - r.x) > t.reach + 0.04 || t.weight < 0.7) continue
    const closing = r.v - t.speed
    if (closing > 0 && t.gap > 0 && t.gap < closing * 0.55 + 5 && Math.abs(r.target - t.lat) < t.reach) brake = true
  }
  const straight = Math.abs(c) < 1.2 && Math.abs(curveAt(race.track, r.dist + look * 0.6)) < 1.5
  const boost = (r.boost > 0.4 || (r.boosting && r.boost > 0.02)) && straight && !brake
  return { steer: Math.max(-1, Math.min(1, steer)), brake, boost }
}

// --- warning ------------------------------------------------------------------

export interface Threat {
  kind: HazardKind | 'car' | 'wreck'
  id: number | string
  /** Metres to it and seconds until you reach it at the speed you are closing. */
  gap: number
  ttc: number
  level: 'caution' | 'danger'
}

/**
 * The thing on the road you are about to meet, if there is one: the nearest object
 * in your path that you are closing on, how long you have, and how worried to be.
 * The screen uses this to warn you (and to ring the thing in the road), so that
 * a hit is never out of nowhere. Nothing here changes the race.
 */
export function threatOf(race: Race, r: Racer): Threat | null {
  if (r.wrecked || r.finish !== null) return null
  let best: Threat | null = null
  const consider = (kind: Threat['kind'], id: number | string, gap: number, lat: number, speed: number, reach: number, long: number) => {
    if (gap <= 0 || gap > 150 || Math.abs(r.x - lat) > reach + 0.1) return
    const closing = r.v - speed
    if (closing < 1) return
    const ttc = Math.max(0, gap - long) / closing
    const soft = kind === 'oil' || kind === 'cone'
    const level = ttc < (soft ? 0.9 : 1.5) ? 'danger' : ttc < (soft ? 2.4 : 3.2) ? 'caution' : null
    if (level && (!best || ttc < best.ttc)) best = { kind, id, gap, ttc, level }
  }
  for (const h of race.hazards) {
    if (r.struck.includes(h.id)) continue
    consider(h.kind, h.id, hazardAt(h, race.t) - r.dist - reachY(h.kind) / 2, h.lat, h.speed, reachX(h.kind), 0)
  }
  for (const o of race.racers) {
    if (o === r) continue
    consider(o.wrecked ? 'wreck' : 'car', o.id, o.dist - r.dist - CAR_REACH, o.x, o.wrecked ? 0 : o.v, HIT_X, 0)
  }
  return best
}

// --- the race ----------------------------------------------------------------

/** Moves the whole race on by dt, with `input` for the player and the AI for the rest. */
export function stepRace(race: Race, dt: number, input: Input) {
  race.t += dt
  draftWho(race)
  for (const r of race.racers) drive(race, r, r.isPlayer ? input : aiInput(race, r), dt)
  for (let i = 0; i < race.racers.length; i++) {
    for (let j = i + 1; j < race.racers.length; j++) contact(race.racers[i], race.racers[j], dt, race.t)
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
