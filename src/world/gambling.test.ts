import { describe, expect, it } from 'vitest'
import { CITIES, allAreas } from './cities'
import { SCRATCHERS } from '../engine/scratch'

const pois = Object.values(CITIES).flatMap((city) => allAreas(city).flatMap((a) => a.pois.map((poi) => ({ city, area: a, poi }))))

describe('street gambling', () => {
  it('every coin-flip hustler offers a coin that is worse than even and stakes the game has chips for', () => {
    const flippers = pois.filter(({ poi }) => poi.action.kind === 'coinflip')
    expect(flippers.length).toBeGreaterThanOrEqual(6)
    for (const { poi } of flippers) {
      if (poi.action.kind !== 'coinflip') continue
      expect(poi.action.fairness, poi.name).toBeLessThan(0.5)
      expect(poi.action.fairness, poi.name).toBeGreaterThan(0.3)
      expect([50, 200, 1000], poi.name).toContain(poi.action.limit)
    }
  })

  it('hustlers get bolder, never gentler, as the towns get richer', () => {
    const limits = ['apartment', 'silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa', 'portoLumina'].map((id) => {
      const flipper = pois.find(({ city, poi }) => city.id === id && poi.action.kind === 'coinflip')
      return flipper && flipper.poi.action.kind === 'coinflip' ? flipper.poi.action.limit : 0
    })
    for (const l of limits) expect(l).toBeGreaterThan(0)
    for (let i = 1; i < limits.length; i++) expect(limits[i]).toBeGreaterThanOrEqual(limits[i - 1])
  })

  it('every lottery counter sells scratchers that exist', () => {
    const counters = pois.filter(({ poi }) => poi.action.kind === 'lottery')
    expect(counters.length).toBeGreaterThanOrEqual(3)
    for (const { poi } of counters) {
      if (poi.action.kind !== 'lottery') continue
      for (const price of poi.action.scratchers) expect(SCRATCHERS.map((t) => t.price), poi.name).toContain(price)
    }
  })

  it('Neon Mesa has a sports arena with a box office, reached from the Strip', () => {
    const mesa = CITIES.neonMesa
    expect(mesa.areas['nm-arena']).toBeDefined()
    expect(mesa.areas['nm-street'].exits.some((e) => e.toAreaId === 'nm-arena')).toBe(true)
    expect(mesa.areas['nm-arena'].pois.some((p) => p.action.kind === 'boxing')).toBe(true)
    expect(pois.filter(({ poi }) => poi.action.kind === 'boxing')).toHaveLength(1)
  })
})
