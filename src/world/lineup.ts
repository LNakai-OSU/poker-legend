import type { TimePeriod } from '../game/time'
import type { SeatRef, TableDef } from './types'

/**
 * Who is at an open cash game right now.
 *
 * A casino is not the same five people at the same hour. The floor is thinnest
 * in the morning, picks up through the afternoon and is at its fullest in the
 * small hours, so an open table (one with `walkIns`) seats one to five of its
 * pool, more as the night goes on. Which ones is rolled from the day and the
 * hour, so the same table is the same table within a period and a different
 * one the next.
 */

/** Fewest and most other players at an open table, by period. Night is the 2 am peak. */
export const PERIOD_CROWD: Record<TimePeriod, { min: number; max: number }> = {
  morning: { min: 1, max: 2 },
  afternoon: { min: 2, max: 3 },
  evening: { min: 3, max: 4 },
  night: { min: 4, max: 5 },
}

function seeded(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  let state = h >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The seats at a table at this hour: all of `opponents` unless it is an open game. */
export function lineupFor(table: TableDef, period: TimePeriod, day: number): SeatRef[] {
  if (!table.walkIns) return table.opponents
  const pool = [...table.opponents, ...table.walkIns]
  const next = seeded(`${table.id}|${day}|${period}`)
  const { min, max } = PERIOD_CROWD[period]
  const count = Math.min(pool.length, min + Math.floor(next() * (max - min + 1)))
  // A shuffle, then the first few. Keep the pool's own order for who sits where.
  const picked = pool
    .map((ref, index) => ({ ref, index, order: next() }))
    .sort((a, b) => a.order - b.order)
    .slice(0, count)
    .sort((a, b) => a.index - b.index)
  return picked.map((p) => p.ref)
}
