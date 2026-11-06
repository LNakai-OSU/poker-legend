import type { Rng } from './rng'

/**
 * A coin-flip hustler: you call it, they flip it, even money.
 *
 * Nobody on the street flips a fair coin for you. `fairness` is the chance the
 * player's call comes up, always at or under a half, so the best a bet can do is
 * lose slowly. The hustler's tell is that the coin is weighted: you can ask to
 * look at it, and a careful look says how bad.
 */

/** The chances a hustler's coin can have, best to worst for the player. */
export const FAIRNESS = { honest: 0.49, shaved: 0.45, loaded: 0.4 } as const

export interface Hustler {
  /** The chance the player's call comes up. */
  fairness: number
  /** The most they will flip for. */
  limit: number
}

export type Side = 'heads' | 'tails'

export function flip(h: Hustler, call: Side, rng: Rng): { landed: Side; won: boolean } {
  const won = rng() < h.fairness
  const landed: Side = won ? call : call === 'heads' ? 'tails' : 'heads'
  return { landed, won }
}

/** What an honest look at the coin tells you. */
export function inspect(h: Hustler): string {
  if (h.fairness >= FAIRNESS.honest) return 'It looks like a plain quarter. The edge is clean. Close to even.'
  if (h.fairness >= FAIRNESS.shaved) return 'The rim is worn on one side. It spins a little lopsided. You are a shade behind.'
  return 'The coin is heavy on one side. You are well behind, and he knows it.'
}

/** A streak is let ride up to this many times, so a lucky run ends before it breaks a town. */
export const MAX_RIDE = 3

/** Chance of winning `n` in a row on an even-money ride. */
export function rideChance(h: Hustler, n: number): number {
  return Math.pow(h.fairness, n)
}
