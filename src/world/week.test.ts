import { describe, expect, it } from 'vitest'
import { TIME_PERIODS } from '../game/time'
import { initialState } from '../game/state'
import { CHARACTERS } from './characters'
import { TABLES } from './content'
import { lineupFor } from './lineup'
import { activeNight, nextRun, weekdayName, weekdayOf } from './week'
import { weekAhead, whenText } from './weekCalendar'

const idOf = (ref: string | { character: string }) => (typeof ref === 'string' ? ref : ref.character)
const nightTables = Object.values(TABLES).filter((t) => t.nights?.length)

describe('the week', () => {
  it('starts on a Friday and wraps', () => {
    expect(weekdayName(1)).toBe('Friday')
    expect(weekdayName(2)).toBe('Saturday')
    expect(weekdayName(4)).toBe('Monday')
    expect(weekdayName(8)).toBe('Friday')
    expect(weekdayOf(0)).toBe(3)
  })

  it('finds the next time a night runs, now if it is on', () => {
    const night = TABLES['silvercreek-low'].nights![0]
    expect(nextRun(night, 1, 'evening')).toEqual({ day: 1, period: 'evening' })
    expect(nextRun(night, 1, 'night')).toEqual({ day: 1, period: 'night' })
    // Saturday morning: next Friday evening is six days off.
    expect(nextRun(night, 2, 'morning')).toEqual({ day: 8, period: 'evening' })
    // Friday afternoon: later today.
    expect(nextRun(night, 1, 'afternoon')).toEqual({ day: 1, period: 'evening' })
  })
})

describe('nights at the tables', () => {
  it('have somebody who plays, a day, an hour, and a table open enough to take them', () => {
    expect(nightTables.length).toBeGreaterThanOrEqual(6)
    const ids = new Set<string>()
    for (const table of nightTables) {
      expect(table.walkIns, `${table.id} has nights but is not an open table`).toBeDefined()
      for (const night of table.nights!) {
        expect(ids.has(night.id), `${night.id} is used twice`).toBe(false)
        ids.add(night.id)
        expect(night.days.length, night.id).toBeGreaterThan(0)
        expect(night.periods.length, night.id).toBeGreaterThan(0)
        expect(night.guests.length, night.id).toBeGreaterThan(0)
        expect(night.guests.length, `${night.id} leaves no one to play`).toBeLessThan(5)
        for (const g of night.guests) expect(CHARACTERS[idOf(g)]?.seat, `${night.id}: ${idOf(g)} does not sit at tables`).toBeDefined()
      }
    }
  })

  it('never overlap on one table', () => {
    for (const table of nightTables) {
      for (const day of [1, 2, 3, 4, 5, 6, 7]) {
        for (const period of TIME_PERIODS) {
          const on = table.nights!.filter((n) => n.days.includes(weekdayOf(day)) && n.periods.includes(period))
          expect(on.length, `${table.id} day ${day} ${period}`).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('seat the guest while they run, and the usual crowd otherwise', () => {
    for (const table of nightTables) {
      for (const night of table.nights!) {
        for (let day = 1; day <= 14; day++) {
          for (const period of TIME_PERIODS) {
            const seats = lineupFor(table, period, day).map(idOf)
            const on = activeNight(table, day, period)?.id === night.id
            if (on) for (const g of night.guests) expect(seats, `${night.id} day ${day} ${period}`).toContain(idOf(g))
            expect(new Set(seats).size, `${table.id} seats somebody twice`).toBe(seats.length)
            expect(seats.length).toBeLessThanOrEqual(5)
            expect(seats.length).toBeGreaterThanOrEqual(2 > seats.length ? 0 : 1)
          }
        }
      }
    }
  })

  it('bring a guest who is not usually there', () => {
    const table = TABLES['silvercreek-low']
    // Friday evening: Big Dale. Saturday evening: nobody has heard of him.
    expect(lineupFor(table, 'evening', 1).map(idOf)).toContain('dale')
    for (let day = 2; day <= 7; day++) expect(lineupFor(table, 'evening', day).map(idOf)).not.toContain('dale')
  })
})

describe('the calendar', () => {
  it('lists only towns you have reached, soonest first', () => {
    const start = initialState()
    expect(weekAhead({ ...start, unlockedCityIds: ['apartment'] })).toEqual([])
    const open = weekAhead({ ...start, unlockedCityIds: ['apartment', 'silverCreek', 'riverbend'] })
    expect(open.map((e) => e.night.id)).toEqual(['silvercreek-payday', 'riverbend-tiny'])
    expect(open[0].guests).toEqual(['Big Dale'])
  })

  it('says when, in words', () => {
    const state = { ...initialState(), unlockedCityIds: ['apartment', 'silverCreek'] as never, day: 1, period: 'evening' as const }
    expect(whenText(weekAhead(state)[0])).toBe('On now')
    expect(whenText(weekAhead({ ...state, day: 2, period: 'morning' })[0])).toContain('Friday evening to night, in 6 days')
    expect(whenText(weekAhead({ ...state, period: 'morning' })[0])).toContain('Later today')
  })
})
