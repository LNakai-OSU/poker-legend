import { TIME_PERIODS, periodIndex, type TimePeriod } from '../game/time'
import type { SeatRef } from './types'

/**
 * The week.
 *
 * Days are the scarce resource (rule 4), so which day you turn up is a decision.
 * The first morning is a Friday (Marcus: "Game is Friday. It is always
 * Friday"), and from there the week turns over every seven days.
 *
 * A table can have *nights*: an hour of the week when a particular person
 * sits in. Most are whales, so a night is a reason to plan, and to be in the
 * right town on the right evening. Nothing is hidden: the menu lists them.
 * Data, on the table (`nights` in `content.ts`); `lineupFor` does the rest.
 */
export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const
/** 0 is Monday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

/** Day 1 is a Friday. */
const FIRST_DAY: Weekday = 4

export const weekdayOf = (day: number): Weekday => ((((day - 1 + FIRST_DAY) % 7) + 7) % 7) as Weekday
export const weekdayName = (day: number): string => WEEKDAYS[weekdayOf(day)]
export const weekdayShort = (day: number): string => weekdayName(day).slice(0, 3)

export interface TableNight {
  id: string
  /** What the room calls it. */
  title: string
  /** Said when you sit down on it. */
  blurb: string
  days: Weekday[]
  periods: TimePeriod[]
  /** Who is certain to be at the table while it runs. */
  guests: SeatRef[]
}

export function nightHolds(night: TableNight, day: number, period: TimePeriod): boolean {
  return night.days.includes(weekdayOf(day)) && night.periods.includes(period)
}

/** The night on at this hour, if the table has one. */
export function activeNight(table: { nights?: TableNight[] }, day: number, period: TimePeriod): TableNight | null {
  return table.nights?.find((n) => nightHolds(n, day, period)) ?? null
}

/** The next time a night is on: now if it is, otherwise the first hour it comes round. */
export function nextRun(night: TableNight, day: number, period: TimePeriod): { day: number; period: TimePeriod } {
  for (let offset = 0; offset < 8; offset++) {
    for (const p of TIME_PERIODS) {
      if (offset === 0 && periodIndex(p) < periodIndex(period)) continue
      if (nightHolds(night, day + offset, p)) return { day: day + offset, period: p }
    }
  }
  // A night with no days or no periods never runs; content tests keep that out.
  return { day, period }
}
