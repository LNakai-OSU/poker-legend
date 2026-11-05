import type { Rng } from '../engine/rng'

/**
 * The road: a ribbon of short segments, each with a bend, a height and the
 * things standing beside it. The sim reads the bends and the slope; the view
 * reads everything. Built from a seed, so a race is the same road for every car
 * and for the replay.
 *
 * Distances are metres. A sim segment is `SEG` long; the view cuts each into
 * smaller slices so the bends read as curves rather than as corners.
 */

export const SEG = 8

/** Half the width of the tarmac, in metres. A car's lateral place is in these. */
export const ROAD_HALF = 4.5

export type Theme = 'harbor' | 'coast' | 'strip'

export type DecoKind =
  | 'lamp'
  | 'container'
  | 'crate'
  | 'bollard'
  | 'palm'
  | 'umbrella'
  | 'sign'
  | 'neon'
  | 'tower'
  | 'rail'

export interface Deco {
  kind: DecoKind
  /** -1 left, 1 right. */
  side: -1 | 1
  /** How far beyond the road's edge, in road halves. */
  off: number
  /** A second look at the same sprite: its colour, picked once. */
  tint: number
}

export interface Seg {
  /** Bend, from -6 (hard left) to 6 (hard right). 1 is a gentle sweep. */
  curve: number
  /** Height of the road at the start of this segment, in metres. */
  y: number
  deco: Deco[]
}

export interface TrackSpec {
  name: string
  theme: Theme
  /** 0..1: how often and how hard it bends. */
  curviness: number
  /** 0..1: how much it rises and falls. */
  hills: number
}

export interface Track {
  spec: TrackSpec
  segs: Seg[]
  length: number
}

/** Curve strengths a section can have: a sweep, a bend, a corner, a hairpin. */
const STRENGTH = [1.1, 2.1, 3.4, 5]

function smooth(t: number): number {
  // Ease in over the first quarter, hold, ease out over the last.
  if (t < 0.25) return t / 0.25
  if (t > 0.75) return (1 - t) / 0.25
  return 1
}

export function buildTrack(length: number, spec: TrackSpec, rng: Rng): Track {
  const count = Math.ceil(length / SEG) + 40
  const curves = new Array<number>(count).fill(0)
  const FLAT = 14
  let at = FLAT
  let flip = rng() < 0.5 ? -1 : 1
  while (at < count - FLAT - 30) {
    // Straights between the bends: shorter on a twisty road.
    at += Math.floor((10 + rng() * 26) * (1.25 - spec.curviness * 0.8))
    if (at >= count - FLAT - 30) break
    const roll = rng()
    const hard = Math.min(3, Math.floor(rng() * (1 + spec.curviness * 3.2)))
    const peak = STRENGTH[hard] * (0.85 + rng() * 0.3)
    const run = 14 + Math.floor(rng() * 26) + hard * 4
    const second = roll < 0.3 // an S: the next bend goes the other way
    flip = -flip
    for (let i = 0; i < run && at + i < count - FLAT; i++) curves[at + i] = flip * peak * smooth(i / run)
    at += run
    if (second && at < count - FLAT - 30) {
      const peak2 = STRENGTH[Math.max(0, hard - (rng() < 0.4 ? 1 : 0))] * (0.85 + rng() * 0.3)
      const run2 = 12 + Math.floor(rng() * 20)
      for (let i = 0; i < run2 && at + i < count - FLAT; i++) curves[at + i] = -flip * peak2 * smooth(i / run2)
      at += run2
    }
  }

  // Hills: two slow waves, faded in so the start line is level.
  const a1 = 3 + spec.hills * 9
  const a2 = 1.5 + spec.hills * 5
  const p1 = 22 + rng() * 14
  const p2 = 9 + rng() * 7
  const ph = rng() * 6.28
  const heights = Array.from({ length: count }, (_, i) => {
    const fade = Math.min(1, i / 16) * Math.min(1, (count - i) / 16)
    return fade * (a1 * Math.sin(i / p1 + ph) + a2 * Math.sin(i / p2 + ph * 1.7)) * (spec.hills > 0 ? 1 : 0)
  })

  const segs: Seg[] = []
  for (let i = 0; i < count; i++) segs.push({ curve: curves[i], y: heights[i], deco: decorate(spec.theme, i, rng) })
  return { spec, segs, length }
}

const TINTS = 4

function decorate(theme: Theme, i: number, rng: Rng): Deco[] {
  const out: Deco[] = []
  const put = (kind: DecoKind, side: -1 | 1, off: number) => out.push({ kind, side, off, tint: Math.floor(rng() * TINTS) })
  if (theme === 'harbor') {
    if (i % 6 === 0) {
      put('lamp', -1, 0.25)
      put('lamp', 1, 0.25)
    }
    if (i % 3 === 1 && rng() < 0.5) put(rng() < 0.55 ? 'container' : 'crate', rng() < 0.5 ? -1 : 1, 0.9 + rng() * 2.2)
    if (i % 2 === 0 && rng() < 0.25) put('bollard', rng() < 0.5 ? -1 : 1, 0.2)
    if (i % 9 === 4) put('sign', rng() < 0.5 ? -1 : 1, 0.7)
  } else if (theme === 'coast') {
    if (i % 4 === 0 && rng() < 0.85) put('palm', rng() < 0.5 ? -1 : 1, 0.5 + rng() * 2.5)
    if (i % 7 === 2) put('umbrella', rng() < 0.5 ? -1 : 1, 1.4 + rng() * 2)
    if (i % 8 === 0) put('lamp', rng() < 0.5 ? -1 : 1, 0.25)
    if (i % 11 === 5) put('sign', rng() < 0.5 ? -1 : 1, 0.8)
  } else {
    if (i % 5 === 0) put('neon', rng() < 0.5 ? -1 : 1, 0.6 + rng() * 1.2)
    if (i % 7 === 3) put('tower', rng() < 0.5 ? -1 : 1, 2.2 + rng() * 3)
    if (i % 4 === 0) put('lamp', i % 8 === 0 ? -1 : 1, 0.25)
    if (i % 10 === 0) put('sign', rng() < 0.5 ? -1 : 1, 0.7)
  }
  // A guard rail the length of the straights keeps the edge of the world honest.
  if (i % 2 === 0) {
    out.push({ kind: 'rail', side: -1, off: 0.05, tint: 0 })
    out.push({ kind: 'rail', side: 1, off: 0.05, tint: 0 })
  }
  return out
}

export function segIndex(track: Track, dist: number): number {
  return Math.max(0, Math.min(track.segs.length - 1, Math.floor(dist / SEG)))
}

/** The bend under a point on the road, blended between neighbours so it is never a step. */
export function curveAt(track: Track, dist: number): number {
  const i = segIndex(track, dist)
  const f = Math.max(0, Math.min(1, dist / SEG - i))
  const a = track.segs[i].curve
  const b = track.segs[Math.min(track.segs.length - 1, i + 1)].curve
  return a + (b - a) * f
}

/** The height of the road under a point on it, in metres. */
export function heightAt(track: Track, dist: number): number {
  const i = segIndex(track, dist)
  const f = Math.max(0, Math.min(1, dist / SEG - i))
  const a = track.segs[i].y
  const b = track.segs[Math.min(track.segs.length - 1, i + 1)].y
  return a + (b - a) * f
}

/** Rise over run: positive uphill. */
export function slopeAt(track: Track, dist: number): number {
  return (heightAt(track, dist + 4) - heightAt(track, dist - 4)) / 8
}

/**
 * The shape of the road from above, as points from 0..1 on both axes: what the
 * lobby draws so you know what you are getting into.
 */
export function outline(track: Track, steps = 90): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = []
  let heading = -Math.PI / 2
  let x = 0
  let y = 0
  const per = Math.max(1, Math.floor(track.segs.length / steps))
  for (let i = 0; i < track.segs.length; i += per) {
    // Bend is 1/m; the same constant the sim and the view use (see `KAPPA`).
    heading += track.segs[i].curve * KAPPA * SEG * per
    x += Math.cos(heading) * per
    y += Math.sin(heading) * per
    pts.push({ x, y })
  }
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const span = Math.max(Math.max(...xs) - minX, Math.max(...ys) - minY, 1)
  return pts.map((p) => ({ x: (p.x - minX) / span, y: (p.y - minY) / span }))
}

/** Curvature in 1/m for a bend of 1: radius about 435 m, so a 5 is a 90 m hairpin. */
export const KAPPA = 0.0023
