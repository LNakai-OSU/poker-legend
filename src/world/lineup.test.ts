import { describe, expect, it } from 'vitest'
import { TIME_PERIODS } from '../game/time'
import { TABLES } from './content'
import { lineupFor } from './lineup'

const average = (table: string, period: (typeof TIME_PERIODS)[number]) => {
  const sizes = Array.from({ length: 60 }, (_, day) => lineupFor(TABLES[table], period, day + 1).length)
  return { sizes, mean: sizes.reduce((a, b) => a + b, 0) / sizes.length }
}

describe('who is at an open table', () => {
  it('stays between one and five at every open table, every hour', () => {
    for (const table of Object.values(TABLES).filter((t) => t.walkIns)) {
      for (const period of TIME_PERIODS) {
        for (const size of average(table.id, period).sizes) {
          expect(size, `${table.id} at ${period}`).toBeGreaterThanOrEqual(1)
          expect(size, `${table.id} at ${period}`).toBeLessThanOrEqual(5)
        }
      }
    }
  })

  it('is fullest at night and thinnest in the morning', () => {
    const mean = (p: (typeof TIME_PERIODS)[number]) => average('silvercreek-low', p).mean
    expect(mean('night')).toBeGreaterThan(mean('evening'))
    expect(mean('evening')).toBeGreaterThan(mean('afternoon'))
    expect(mean('afternoon')).toBeGreaterThan(mean('morning'))
  })

  it('is not always the same people', () => {
    const faces = new Set(Array.from({ length: 30 }, (_, d) => lineupFor(TABLES['silvercreek-low'], 'night', d).join()))
    expect(faces.size).toBeGreaterThan(5)
  })

  it('seats a table’s regulars at every hour of every day, and only people the table seats', () => {
    const tables = Object.values(TABLES).filter((t) => t.regulars?.length)
    expect(tables.length, 'nobody is a regular anywhere').toBeGreaterThan(0)
    for (const table of tables) {
      const seats = table.opponents.map((ref) => (typeof ref === 'string' ? ref : ref.character))
      expect(table.walkIns, `${table.id} has regulars but is not an open table`).toBeDefined()
      for (const id of table.regulars!) {
        expect(seats, `${id} is a regular at ${table.id} but not one of its opponents`).toContain(id)
        for (const period of TIME_PERIODS) {
          for (let day = 1; day <= 14; day++) {
            const lineup = lineupFor(table, period, day).map((ref) => (typeof ref === 'string' ? ref : ref.character))
            expect(lineup, `${id} is missing from ${table.id} on day ${day}, ${period}`).toContain(id)
            expect(lineup.length).toBeGreaterThan(1)
          }
        }
      }
    }
  })

  it('is the same table twice in one period, and leaves fixed games alone', () => {
    expect(lineupFor(TABLES['silvercreek-low'], 'evening', 3)).toEqual(lineupFor(TABLES['silvercreek-low'], 'evening', 3))
    expect(lineupFor(TABLES['silvercreek-boss'], 'night', 3)).toEqual(TABLES['silvercreek-boss'].opponents)
  })
})
