import { describe, expect, it } from 'vitest'
import { CITIES, SHOPS, allShopItems, findItem } from './content'
import { CHARACTERS } from './characters'
import { RACES, REPAIR_FLOOR, STAT_CEILING, ownedCars, racesIn, repairCost, tunedStats } from './racing'
import { TOWN_ORDER } from '../game/state'

describe('street racing', () => {
  const races = Object.values(RACES)

  it('is raced by people who exist, in cars that exist', () => {
    for (const race of races) {
      expect(race.field.length, `${race.name} has nobody to race`).toBeGreaterThan(0)
      for (const d of race.field) {
        expect(CHARACTERS[d.character], `${race.name}: no character ${d.character}`).toBeDefined()
        expect(findItem(d.carId)?.car, `${race.name}: ${d.carId} is not a car`).toBeDefined()
        expect(d.skill).toBeGreaterThan(0)
        expect(d.skill).toBeLessThanOrEqual(1)
      }
    }
  })

  it('never pays more than a race between equals would: a field of n is beaten for less than n-1 times the bet', () => {
    // Winning a race against `rivals` equals happens 1 time in rivals+1. Paying
    // the bet back times rivals would be a fair bet; anything less is a small
    // cost of racing, and that is what keeps this a side hustle.
    for (const race of races.filter((r) => !r.pinkSlip)) {
      expect(race.pays, `${race.name} pays like a free bet`).toBeLessThan(race.field.length)
      expect(race.pays).toBeGreaterThan(0)
    }
  })

  it('cannot make a bankroll: the biggest win in a town is a fraction of the next town’s asking price', () => {
    // Poker is the only way up. A race may fund a car and a cushion, not the ladder.
    for (const race of races.filter((r) => !r.pinkSlip)) {
      const next = TOWN_ORDER[TOWN_ORDER.indexOf(race.cityId) + 1]
      const biggest = Math.max(...race.stakes) * race.pays
      const ask = CITIES[next].unlockCash
      expect(biggest, `${race.name} can win $${biggest} against a $${ask} bankroll gate`).toBeLessThanOrEqual(ask * 0.25)
    }
  })

  it('lets stakes climb', () => {
    for (const race of races.filter((r) => !r.pinkSlip)) {
      expect(race.stakes.length).toBeGreaterThan(1)
      expect([...race.stakes].sort((a, b) => a - b)).toEqual(race.stakes)
    }
  })

  it('puts a prize car up on every slip, and sells it nowhere', () => {
    for (const race of races.filter((r) => r.pinkSlip)) {
      const prize = race.pinkSlip!.prizeCarId
      expect(findItem(prize)?.car, `${race.name}: ${prize} is not a car`).toBeDefined()
      const sold = Object.values(SHOPS).filter((s) => s.items.some((i) => i.id === prize))
      expect(sold.map((s) => s.id), `${prize} is for sale`).toEqual(['winnings'])
      expect(race.field[race.pinkSlip!.driver].carId).toBe(prize)
    }
  })

  it('is offered in the town it is set in, by somebody you can walk up to', () => {
    for (const race of races) {
      const pois = Object.values(CITIES[race.cityId].areas).flatMap((a) => a.pois)
      const hosts = pois.filter((p) => p.action.kind === 'race' && p.action.raceIds.includes(race.id))
      expect(hosts.length, `${race.name} is not offered anywhere in ${race.cityId}`).toBe(1)
    }
    for (const city of Object.values(CITIES)) {
      for (const area of Object.values(city.areas)) {
        for (const poi of area.pois) {
          if (poi.action.kind !== 'race') continue
          for (const id of poi.action.raceIds) expect(RACES[id]?.cityId, `${poi.id} offers ${id}`).toBe(city.id)
        }
      }
    }
  })

  it('has a way to get a car before the first race, and a beater cheap enough to buy there', () => {
    const first = TOWN_ORDER.find((c) => racesIn(c).length > 0)!
    const cheapest = Math.min(...allShopItems().filter((i) => i.car && i.price > 0 && !SHOPS.winnings.items.includes(i)).map((i) => i.price))
    expect(cheapest).toBeLessThanOrEqual(CITIES[first].unlockCash)
  })

  it('makes every car and part do something, and has the better car cost more', () => {
    const sold = allShopItems().filter((i) => i.car && !SHOPS.winnings.items.includes(i))
    const byPrice = [...sold].sort((a, b) => a.price - b.price)
    const rate = (i: (typeof sold)[number]) => i.car!.topSpeed + i.car!.handling + i.car!.grip
    for (let i = 1; i < byPrice.length; i++) {
      expect(rate(byPrice[i]), `${byPrice[i].name} costs more than ${byPrice[i - 1].name} and is no better`).toBeGreaterThanOrEqual(rate(byPrice[i - 1]))
    }
    for (const item of allShopItems().filter((i) => i.effect?.kind === 'carTune')) {
      expect(item.price).toBeGreaterThan(0)
    }
  })

  it('costs something to wreck a car, and a bigger car costs more', () => {
    const beater = findItem('beater')!
    const gt = findItem('sports-car')!
    expect(repairCost(beater)).toBeGreaterThanOrEqual(REPAIR_FLOOR)
    expect(repairCost(gt)).toBeGreaterThan(repairCost(beater))
  })

  it('tunes a car by the parts you own, up to a ceiling', () => {
    const base = findItem('sedan')!.car!
    expect(tunedStats(base, []).grip).toBe(base.grip)
    expect(tunedStats(base, ['street-tyres']).grip).toBe(base.grip + 1)
    const everything = allShopItems().filter((i) => i.effect?.kind === 'carTune').map((i) => i.id)
    const maxed = tunedStats(findItem('vale-gt')!.car!, [...everything, ...everything])
    expect(maxed.topSpeed).toBeLessThanOrEqual(STAT_CEILING)
  })

  it('lists the cars you own, best first', () => {
    expect(ownedCars(['beater', 'sports-car', 'sedan', 'tailored-suit']).map((c) => c.id)).toEqual(['sports-car', 'sedan', 'beater'])
  })
})
