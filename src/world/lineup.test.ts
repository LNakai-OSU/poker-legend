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

  it('is the same table twice in one period, and leaves fixed games alone', () => {
    expect(lineupFor(TABLES['silvercreek-low'], 'evening', 3)).toEqual(lineupFor(TABLES['silvercreek-low'], 'evening', 3))
    expect(lineupFor(TABLES['silvercreek-boss'], 'night', 3)).toEqual(TABLES['silvercreek-boss'].opponents)
  })
})
