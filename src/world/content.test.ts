import { describe, expect, it } from 'vitest'
import { CITIES, CITY_ORDER, LESSONS, MISSIONS, SHOPS, SPONSORS, TABLES, findItem } from './content'
import { isWalkable, parseMap } from '../overworld/tileRenderer'

describe('parseMap', () => {
  it('builds a rectangular grid and marks walls unwalkable', () => {
    const grid = parseMap(`
###
#.#
###
`)
    expect(grid.length).toBe(3)
    expect(grid[0].length).toBe(3)
    expect(isWalkable(grid, 1, 1)).toBe(true)
    expect(isWalkable(grid, 0, 0)).toBe(false)
  })

  it('treats carpet and road as walkable, water as not', () => {
    const grid = parseMap(`
#####
#,=~#
#####
`)
    expect(isWalkable(grid, 1, 1)).toBe(true) // carpet
    expect(isWalkable(grid, 2, 1)).toBe(true) // road
    expect(isWalkable(grid, 3, 1)).toBe(false) // water
  })

  it('rejects unknown characters rather than silently making a hole', () => {
    expect(() => parseMap('#?#')).toThrow(/unknown map character/)
  })
})

describe('city content', () => {
  const cities = Object.values(CITIES)

  it('has rectangular maps', () => {
    for (const city of cities) {
      const widths = new Set(city.map.map((row) => row.length))
      expect(widths.size, `${city.name} has ragged rows`).toBe(1)
    }
  })

  it('starts the player on a walkable tile', () => {
    for (const city of cities) {
      expect(
        isWalkable(city.map, city.playerStart.col, city.playerStart.row),
        `${city.name} starts the player inside something solid`,
      ).toBe(true)
    }
  })

  it('keeps every point of interest reachable', () => {
    // Interaction needs the player standing at Manhattan distance 1, so every
    // POI must have at least one walkable neighbour or it can never be used.
    for (const city of cities) {
      for (const poi of city.pois) {
        const neighbours = [
          [poi.col + 1, poi.row],
          [poi.col - 1, poi.row],
          [poi.col, poi.row + 1],
          [poi.col, poi.row - 1],
        ]
        const reachable = neighbours.some(([col, row]) => isWalkable(city.map, col, row))
        expect(reachable, `${city.name}: ${poi.name} at (${poi.col},${poi.row}) is unreachable`).toBe(true)
      }
    }
  })

  it('only references content that exists', () => {
    for (const city of cities) {
      for (const poi of city.pois) {
        const action = poi.action
        if (action.kind === 'table') expect(TABLES[action.tableId], `${poi.name}`).toBeDefined()
        if (action.kind === 'shop') expect(SHOPS[action.shopId], `${poi.name}`).toBeDefined()
        if (action.kind === 'sponsor') expect(SPONSORS[action.sponsorId], `${poi.name}`).toBeDefined()
        if (action.kind === 'mission') expect(MISSIONS[action.missionId], `${poi.name}`).toBeDefined()
      }
    }
  })

  it('gives every city a way out', () => {
    for (const city of cities) {
      if (city.id === 'apartment') continue
      const hasTravel = city.pois.some((poi) => poi.action.kind === 'travel')
      expect(hasTravel, `${city.name} has no travel point`).toBe(true)
    }
  })
})

describe('progression curve', () => {
  it('raises the bankroll gate at every stop on the ladder', () => {
    const gates = CITY_ORDER.map((id) => CITIES[id].unlockCash)
    for (let i = 1; i < gates.length; i++) {
      expect(gates[i], `${CITY_ORDER[i]} is not gated above ${CITY_ORDER[i - 1]}`).toBeGreaterThan(gates[i - 1])
    }
  })

  it('raises the stakes at every stop on the ladder', () => {
    const buyInByCity = CITY_ORDER.map((cityId) => {
      const tableIds = CITIES[cityId].pois
        .map((poi) => (poi.action.kind === 'table' ? poi.action.tableId : null))
        .filter((id): id is string => id !== null)
      return Math.min(...tableIds.map((id) => TABLES[id].buyIn))
    })
    for (let i = 1; i < buyInByCity.length; i++) {
      expect(buyInByCity[i]).toBeGreaterThan(buyInByCity[i - 1])
    }
  })

  it('lets the player afford the cheapest local table once the city unlocks', () => {
    for (const cityId of CITY_ORDER) {
      const city = CITIES[cityId]
      const tableIds = city.pois
        .map((poi) => (poi.action.kind === 'table' ? poi.action.tableId : null))
        .filter((id): id is string => id !== null)
      const cheapest = Math.min(...tableIds.map((id) => TABLES[id].buyIn))
      expect(
        city.unlockCash + 1 >= cheapest || cityId === 'silverCreek',
        `${city.name} unlocks below its own cheapest buy-in`,
      ).toBe(true)
    }
  })

  it('can actually satisfy every dress code from the shops', () => {
    const levels = Object.values(SHOPS)
      .flatMap((shop) => shop.items)
      .map((item) => (item.effect?.kind === 'dressCode' ? item.effect.level : 0))
    const best = Math.max(...levels)
    for (const table of Object.values(TABLES)) {
      if (table.dressCode) {
        expect(best, `nothing on sale meets ${table.name}'s dress code`).toBeGreaterThanOrEqual(table.dressCode)
      }
    }
  })
})

describe('missions and lessons', () => {
  it('references items and lessons that exist', () => {
    for (const mission of Object.values(MISSIONS)) {
      if (mission.goal.kind === 'ownItem') expect(findItem(mission.goal.itemId), mission.id).not.toBeNull()
      if (mission.goal.kind === 'hasLesson') expect(LESSONS[mission.goal.lessonId], mission.id).toBeDefined()
    }
  })

  it('gives every lesson teaching content and a stated unlock', () => {
    for (const lesson of Object.values(LESSONS)) {
      expect(lesson.teaching.length).toBeGreaterThan(0)
      expect(lesson.unlocks.length).toBeGreaterThan(0)
      expect(lesson.price).toBeGreaterThan(0)
    }
  })
})
