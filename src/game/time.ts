/**
 * What time of day it is.
 *
 * The town used to be the same town whenever you walked through it: the same
 * people on the same tiles, whether you had just got up or had been playing
 * since Tuesday. A period is the smallest thing that fixes that — somewhere for
 * a character to be *instead of* where they were an hour ago.
 */

export const TIME_PERIODS = ['morning', 'afternoon', 'evening', 'night'] as const

export type TimePeriod = (typeof TIME_PERIODS)[number]

/** What the clock in the corner says. */
export const PERIOD_LABEL: Record<TimePeriod, string> = {
  morning: 'Morning',
  afternoon: 'Afternoon',
  evening: 'Evening',
  night: 'Night',
}

/**
 * The light at each time of day, laid over the whole map.
 *
 * Drawn over the tiles rather than baked into them, so every town gets a dawn
 * and a night for free and a new map cannot forget to have one. Morning is left
 * clear: it is the hour everything else is read against.
 */
export const PERIOD_LIGHT: Record<TimePeriod, string> = {
  morning: 'transparent',
  afternoon: 'rgba(255, 214, 140, 0.07)',
  evening: 'rgba(255, 137, 71, 0.16)',
  night: 'rgba(28, 42, 102, 0.34)',
}

/** How far through the day a period is, 0 for morning. */
export function periodIndex(period: TimePeriod): number {
  return TIME_PERIODS.indexOf(period)
}

/**
 * The period `steps` later, and whether the day rolled over getting there.
 *
 * Kept here rather than in the state so the arithmetic can be tested on its own,
 * and so the caller decides what a new day means — advancing one is what sets
 * the collectors on you, and that is not a decision for a clock.
 */
export function periodAfter(
  period: TimePeriod,
  steps = 1,
): { period: TimePeriod; daysPassed: number } {
  const total = periodIndex(period) + Math.max(0, Math.round(steps))
  return {
    period: TIME_PERIODS[total % TIME_PERIODS.length],
    daysPassed: Math.floor(total / TIME_PERIODS.length),
  }
}
