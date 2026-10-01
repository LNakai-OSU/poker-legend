import { describe, expect, it } from 'vitest'
import {
  CITIES,
  CITY_ORDER,
  COLLECTOR_MIN_PLAYER_DISTANCE,
  LESSONS,
  MISSIONS,
  SHOPS,
  SPONSORS,
  TABLES,
  VENUES,
  allAreas,
  allPois,
  collectorSpawn,
  distanceToEscape,
  escapeTiles,
  findItem,
} from './content'
import { DOOR, isWalkable, parseMap } from '../overworld/tileRenderer'

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
  const areas = cities.flatMap((city) => allAreas(city).map((a) => ({ city, area: a })))

  it('has rectangular maps', () => {
    for (const { city, area } of areas) {
      const widths = new Set(area.map.map((row) => row.length))
      expect(widths.size, `${city.name}/${area.name} has ragged rows`).toBe(1)
    }
  })

  it('starts the player on a walkable tile in every area', () => {
    for (const { city, area } of areas) {
      expect(
        isWalkable(area.map, area.playerStart.col, area.playerStart.row),
        `${city.name}/${area.name} starts the player inside something solid`,
      ).toBe(true)
    }
  })

  it('keeps every point of interest reachable', () => {
    for (const { city, area } of areas) {
      for (const poi of area.pois) {
        const reachable = [
          [poi.col + 1, poi.row],
          [poi.col - 1, poi.row],
          [poi.col, poi.row + 1],
          [poi.col, poi.row - 1],
        ].some(([col, row]) => isWalkable(area.map, col, row))
        expect(reachable, `${city.name}/${area.name}: ${poi.name} is unreachable`).toBe(true)
      }
    }
  })

  it('gives every point of interest an unambiguous approach tile', () => {
    // Interaction picks the first POI within one tile, so if every approach to
    // a POI is also next to a different one, the player can never reach it.
    for (const { city, area } of areas) {
      for (const poi of area.pois) {
        const approaches = [
          [poi.col + 1, poi.row],
          [poi.col - 1, poi.row],
          [poi.col, poi.row + 1],
          [poi.col, poi.row - 1],
        ].filter(([col, row]) => isWalkable(area.map, col, row))

        const unambiguous = approaches.some(([col, row]) =>
          area.pois.every(
            (other) =>
              other.id === poi.id || Math.abs(other.col - col) + Math.abs(other.row - row) !== 1,
          ),
        )
        expect(
          unambiguous,
          `${city.name}/${area.name}: ${poi.name} has no approach tile that isn't also next to another POI`,
        ).toBe(true)
      }
    }
  })

  it('puts every door on a tile the player can step onto', () => {
    for (const { city, area } of areas) {
      for (const exit of area.exits) {
        expect(
          isWalkable(area.map, exit.col, exit.row),
          `${city.name}/${area.name}: door "${exit.label}" at (${exit.col},${exit.row}) is not steppable`,
        ).toBe(true)
      }
    }
  })

  it('puts every door on the tile that is drawn as a door', () => {
    // A door is opened by walking into it from the tile in front, so the exit
    // has to coincide with the doorway the player can see. The apartment's exit
    // was one tile to the left of its own doorframe, which read as the player
    // stopping in the middle of the room and teleporting.
    for (const { city, area } of areas) {
      for (const exit of area.exits) {
        expect(
          area.map[exit.row][exit.col],
          `${city.name}/${area.name}: door "${exit.label}" at (${exit.col},${exit.row}) is not drawn as a door`,
        ).toBe(DOOR)
      }
    }
  })

  it('leaves somewhere to stand in front of every door', () => {
    // Doors are no longer stood on, so a door whose only neighbours are walls
    // and other doors can never be opened at all.
    for (const { city, area } of areas) {
      for (const exit of area.exits) {
        const frontage = [
          [exit.col + 1, exit.row],
          [exit.col - 1, exit.row],
          [exit.col, exit.row + 1],
          [exit.col, exit.row - 1],
        ].filter(
          ([col, row]) => isWalkable(area.map, col, row) && area.map[row]?.[col] !== DOOR,
        )
        expect(
          frontage.length,
          `${city.name}/${area.name}: door "${exit.label}" has no tile to stand on in front of it`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('lands every door somewhere real', () => {
    for (const { city, area } of areas) {
      for (const exit of area.exits) {
        const target = city.areas[exit.toAreaId]
        expect(target, `${city.name}/${area.name}: door "${exit.label}" leads nowhere`).toBeDefined()
        expect(
          isWalkable(target.map, exit.toCol, exit.toRow),
          `${city.name}: door "${exit.label}" drops you inside a wall of ${exit.toAreaId}`,
        ).toBe(true)
      }
    }
  })

  it('never drops the player straight back onto another door', () => {
    // Landing on a door tile would bounce you through it again immediately.
    for (const { city, area } of areas) {
      for (const exit of area.exits) {
        const target = city.areas[exit.toAreaId]
        const landsOnDoor = target.exits.some((e) => e.col === exit.toCol && e.row === exit.toRow)
        expect(
          landsOnDoor,
          `${city.name}: door "${exit.label}" lands on another door in ${exit.toAreaId}`,
        ).toBe(false)
      }
    }
  })

  it('can reach every area from the entry area', () => {
    for (const city of cities) {
      const seen = new Set([city.entryAreaId])
      const queue = [city.entryAreaId]
      while (queue.length > 0) {
        const current = city.areas[queue.shift()!]
        for (const exit of current.exits) {
          if (!seen.has(exit.toAreaId)) {
            seen.add(exit.toAreaId)
            queue.push(exit.toAreaId)
          }
        }
      }
      for (const area of allAreas(city)) {
        expect(seen.has(area.id), `${city.name}: ${area.name} is cut off from the entrance`).toBe(true)
      }
    }
  })

  it('only references content that exists', () => {
    for (const city of cities) {
      for (const poi of allPois(city)) {
        const action = poi.action
        if (action.kind === 'table') expect(TABLES[action.tableId], `${poi.name}`).toBeDefined()
        if (action.kind === 'shop') expect(SHOPS[action.shopId], `${poi.name}`).toBeDefined()
        if (action.kind === 'sponsor') expect(SPONSORS[action.sponsorId], `${poi.name}`).toBeDefined()
        if (action.kind === 'mission') expect(MISSIONS[action.missionId], `${poi.name}`).toBeDefined()
        if (action.kind === 'venue') expect(VENUES[action.venueId], `${poi.name}`).toBeDefined()
      }
    }
  })

  it('gives every city a way out', () => {
    for (const city of cities) {
      if (city.id === 'apartment') continue
      expect(
        allPois(city).some((poi) => poi.action.kind === 'travel'),
        `${city.name} has no travel point`,
      ).toBe(true)
    }
  })

  it('puts people on the streets, not just shopfronts', () => {
    for (const city of cities) {
      const street = city.areas[city.entryAreaId]
      const people = street.pois.filter((p) => (p.art ?? 'person') === 'person')
      expect(people.length, `${city.name}: nobody is out on ${street.name}`).toBeGreaterThan(0)
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
      const tableIds = allPois(CITIES[cityId])
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
      const tableIds = allPois(city)
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

describe('venues', () => {
  it('points clubs at tables that exist', () => {
    for (const venue of Object.values(VENUES)) {
      if (venue.unlocksTableId) expect(TABLES[venue.unlocksTableId], venue.id).toBeDefined()
      if (venue.kind === 'club') expect(venue.reputationNeeded).toBeGreaterThan(0)
    }
  })

  it('keeps every invite-only table behind a club', () => {
    // A private table with no club to unlock it would be unreachable content.
    const unlockable = new Set(
      Object.values(VENUES).map((v) => v.unlocksTableId).filter((id): id is string => !!id),
    )
    const privateTables = Object.values(CITIES)
      .flatMap((c) => allPois(c))
      .filter((p) => p.action.kind === 'table' && /private/.test(p.action.tableId))
      .map((p) => (p.action.kind === 'table' ? p.action.tableId : ''))
    for (const id of privateTables) {
      expect(unlockable.has(id), `${id} can never be unlocked`).toBe(true)
    }
  })
})

describe('the collector chase', () => {
  // The bug: the collector spawned at `width - 3`, which in Silver Creek is the
  // tile beside the Bus Stop — the only way out of town. Being caught three tiles
  // after stepping onto the street, with the exit behind the man chasing you and
  // no sponsor on that street to pay, is not a chase.
  const entryTiles = (city: (typeof CITIES)[string]) => {
    const area = city.areas[city.entryAreaId]
    const doors = allAreas(city)
      .flatMap((a) => a.exits)
      .filter((exit) => exit.toAreaId === city.entryAreaId)
      .map((exit) => ({ col: exit.toCol, row: exit.toRow }))
    return [area.playerStart, ...doors]
  }

  it('never puts the collector between the player and the way out', () => {
    // This is the invariant that makes the chase survivable: running for the bus
    // is never running towards the man chasing you, and the player walks about
    // three times as fast as a collector steps.
    for (const city of Object.values(CITIES)) {
      const area = city.areas[city.entryAreaId]
      for (const player of entryTiles(city)) {
        const spawn = collectorSpawn(area, player)
        const label = `${city.id} from (${player.col},${player.row})`
        expect(
          distanceToEscape(area, spawn),
          `${label}: collector is ${distanceToEscape(area, spawn)} from the exit, player ${distanceToEscape(area, player)}`,
        ).toBeGreaterThanOrEqual(distanceToEscape(area, player))
      }
    }
  })

  it('never materialises on top of the player, a wall, or someone else', () => {
    for (const city of Object.values(CITIES)) {
      const area = city.areas[city.entryAreaId]
      const occupied = new Set(area.pois.map((poi) => `${poi.col},${poi.row}`))
      for (const player of entryTiles(city)) {
        const spawn = collectorSpawn(area, player)
        const label = `${city.id} from (${player.col},${player.row})`
        expect(isWalkable(area.map, spawn.col, spawn.row), `${label}: spawned in a wall`).toBe(true)
        expect(occupied.has(`${spawn.col},${spawn.row}`), `${label}: spawned on an NPC`).toBe(false)
        const gap = Math.abs(spawn.col - player.col) + Math.abs(spawn.row - player.row)
        expect(gap, `${label}: spawned ${gap} tiles away`).toBeGreaterThanOrEqual(COLLECTOR_MIN_PLAYER_DISTANCE)
      }
    }
  })

  it('does not park the collector on the travel point itself', () => {
    for (const city of Object.values(CITIES)) {
      const area = city.areas[city.entryAreaId]
      const spawn = collectorSpawn(area, area.playerStart)
      for (const escape of escapeTiles(area)) {
        expect(`${spawn.col},${spawn.row}`, `${city.id}`).not.toBe(`${escape.col},${escape.row}`)
      }
    }
  })
})

describe('missions and lessons', () => {
  it('references items and lessons that exist', () => {
    for (const mission of Object.values(MISSIONS)) {
      if (mission.goal.kind === 'ownItem') expect(findItem(mission.goal.itemId), mission.id).not.toBeNull()
      if (mission.goal.kind === 'hasLesson') expect(LESSONS[mission.goal.lessonId], mission.id).toBeDefined()
      if (mission.rewardItemId) expect(findItem(mission.rewardItemId), mission.id).not.toBeNull()
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
