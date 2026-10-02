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
  AREAS,
  allAreas,
  allPois,
  collectorSpawn,
  distanceToEscape,
  escapeTiles,
  findItem,
} from './content'
import { DOOR, isWalkable, parseMap } from '../overworld/tileRenderer'
import { PERSONALITIES } from './personalities'

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
    // Doors *and* edges: a street joins to the next one by being walked off, so
    // an area reachable only that way is still reachable.
    for (const city of cities) {
      const seen = new Set([city.entryAreaId])
      const queue = [city.entryAreaId]
      while (queue.length > 0) {
        const current = AREAS[queue.shift()!]?.area
        if (!current) continue
        const onward = [
          ...current.exits.map((exit) => exit.toAreaId),
          ...Object.values(current.edges ?? {}).map((link) => link.toAreaId),
        ]
        for (const next of onward) {
          if (!seen.has(next)) {
            seen.add(next)
            queue.push(next)
          }
        }
      }
      for (const area of allAreas(city)) {
        expect(seen.has(area.id), `${city.name}: ${area.name} is cut off from the entrance`).toBe(true)
      }
    }
  })

  it('lets you walk from your front door to the last town', () => {
    /*
     * The whole world is one continuous place. Towns are joined by roads you can
     * walk, and the bus is a shortcut through it rather than the only way across —
     * so every town has to be reachable on foot from the apartment, using doors
     * and open edges and nothing else.
     */
    const start = CITIES.apartment.entryAreaId
    const seen = new Set([start])
    const queue = [start]
    while (queue.length > 0) {
      const current = AREAS[queue.shift()!]?.area
      if (!current) continue
      const onward = [
        ...current.exits.map((exit) => exit.toAreaId),
        ...Object.values(current.edges ?? {}).map((link) => link.toAreaId),
      ]
      for (const next of onward) {
        if (!seen.has(next)) {
          seen.add(next)
          queue.push(next)
        }
      }
    }

    for (const city of cities) {
      const unreachable = allAreas(city).filter((area) => !seen.has(area.id))
      expect(
        unreachable.map((a) => a.name),
        `${city.name} cannot be walked to from your front door`,
      ).toEqual([])
    }
  })

  it('puts the bus down somewhere you can walk out of', () => {
    /*
     * Where a town *begins* and where the bus *stops* are not the same place. The
     * home town starts inside your flat, so travelling there put the player in
     * their own bedroom — and with a stale entry tile from the map they had just
     * left, in the corner of it, unable to move at all.
     */
    for (const city of cities) {
      const arrivalId = city.arrivalAreaId ?? city.entryAreaId
      const arrival = AREAS[arrivalId]?.area
      expect(arrival, `${city.name}: the bus stops at "${arrivalId}", which does not exist`).toBeDefined()
      expect(
        isWalkable(arrival.map, arrival.playerStart.col, arrival.playerStart.row),
        `${city.name}: the bus puts you down somewhere solid`,
      ).toBe(true)

      // And it has to be somewhere you can leave on foot, not a sealed room.
      const ways = arrival.exits.length + Object.keys(arrival.edges ?? {}).length
      expect(ways, `${city.name}: nothing leads out of where the bus stops`).toBeGreaterThan(0)
    }
  })

  it('gives every area a globally unique id', () => {
    // Areas resolve by id across the whole world now, because walking off a map
    // edge can cross a town boundary. Two areas sharing an id would make one of
    // them unreachable and silently swap the other in.
    const seen = new Map<string, string>()
    for (const { city, area } of areas) {
      const previous = seen.get(area.id)
      expect(previous, `area id "${area.id}" is used by both ${previous} and ${city.name}`).toBeUndefined()
      seen.set(area.id, city.name)
    }
  })

  it('joins every open edge to a real map, both ways', () => {
    const OPPOSITE = { north: 'south', south: 'north', east: 'west', west: 'east' } as const
    for (const { city, area } of areas) {
      for (const [side, link] of Object.entries(area.edges ?? {})) {
        const edge = side as keyof typeof OPPOSITE
        const destination = AREAS[link.toAreaId]
        expect(
          destination,
          `${city.name}/${area.name}: ${edge} edge leads to "${link.toAreaId}", which does not exist`,
        ).toBeDefined()

        // The way back has to exist, or the player walks somewhere they cannot
        // return from by retracing a single step.
        const back = destination.area.edges?.[OPPOSITE[edge]]
        expect(
          back?.toAreaId,
          `${city.name}/${area.name}: ${edge} into ${link.toAreaId}, which has no way back`,
        ).toBe(area.id)
        // `|| 0` normalises negative zero, which Object.is treats as distinct.
        expect(
          (back?.offset ?? 0) || 0,
          `${city.name}/${area.name}: ${edge} offset does not match the return trip`,
        ).toBe(-(link.offset ?? 0) || 0)
      }
    }
  })

  it('leaves a walkable strip on both sides of every open edge', () => {
    for (const { city, area } of areas) {
      for (const [side, link] of Object.entries(area.edges ?? {})) {
        const next = AREAS[link.toAreaId].area
        const offset = link.offset ?? 0
        const vertical = side === 'north' || side === 'south'
        const span = vertical ? area.map[0].length : area.map.length
        const nextSpan = vertical ? next.map[0].length : next.map.length

        let crossings = 0
        for (let along = 0; along < span; along++) {
          const from = vertical
            ? { col: along, row: side === 'north' ? 0 : area.map.length - 1 }
            : { col: side === 'west' ? 0 : area.map[0].length - 1, row: along }
          if (!isWalkable(area.map, from.col, from.row)) continue

          const landingAlong = along + offset
          if (landingAlong < 0 || landingAlong >= nextSpan) continue
          const to = vertical
            ? { col: landingAlong, row: side === 'north' ? next.map.length - 1 : 0 }
            : { col: side === 'west' ? next.map[0].length - 1 : 0, row: landingAlong }
          if (isWalkable(next.map, to.col, to.row)) crossings++
        }
        expect(
          crossings,
          `${city.name}/${area.name}: nothing lines up across the ${side} edge into ${link.toAreaId}`,
        ).toBeGreaterThan(0)
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

describe('the town is a place, not a palette swap', () => {
  const cities = Object.values(CITIES)

  it('gives every city its own colour', () => {
    const themes = cities.map((city) => city.theme)
    for (const city of cities) {
      expect(city.theme, `${city.name} has no tile theme`).toBeDefined()
    }
    // Porto Lumina and the street outside your flat used to be the same grey,
    // because one palette was baked into the tile art for the whole world.
    expect(new Set(themes).size, 'two cities share a palette').toBe(cities.length)
  })

  it('does not draw two casinos as the same room', () => {
    // Two cities' casino floors were pixel-for-pixel identical, down to the tile
    // each dealer stood on, so climbing the ladder changed a number rather than
    // taking you anywhere.
    const signatures = new Map<string, string[]>()
    for (const city of cities) {
      for (const area of allAreas(city)) {
        // Casino floors are the carpeted rooms.
        if (!area.map.some((row) => row.includes(3))) continue
        const signature = area.map.map((row) => row.join('')).join('/')
        signatures.set(signature, [...(signatures.get(signature) ?? []), `${city.name}/${area.name}`])
      }
    }
    const shared = [...signatures.values()].filter((rooms) => rooms.length > 1)
    expect(
      shared,
      `these rooms are the identical tilemap: ${shared.map((r) => r.join(' = ')).join('; ')}`,
    ).toHaveLength(0)
  })
})

describe('the economy', () => {
  const allItems = Object.values(SHOPS).flatMap((shop) => shop.items)

  it('gives everything on sale an actual effect', () => {
    // A lucky card protector, a casino hoodie and a $40,000 gold watch were
    // inventory strings with a price: half the shops were a cash sink with a
    // sentence attached.
    for (const item of allItems) {
      expect(item.effect, `${item.name} ($${item.price}) does nothing at all`).toBeDefined()
    }
  })

  it('makes a vehicle worth buying', () => {
    // Priced off the fare alone every vehicle was a strict loss — the sports car
    // repaid itself after forty trips in a game with about twenty. A vehicle has
    // to buy something other than a discount.
    const vehicles = allItems.filter((item) => item.effect?.kind === 'fastTravel')
    expect(vehicles.length, 'nothing in the game saves you a day on the road').toBeGreaterThan(0)
    for (const vehicle of vehicles) {
      const effect = vehicle.effect
      if (effect?.kind !== 'fastTravel') continue
      // And it should still cut the fare, or a car is a downgrade on price.
      expect(effect.discount, `${vehicle.name} does not cut the fare`).toBeGreaterThan(0)
    }
  })

  it('makes eating somewhere do something', () => {
    const restaurants = Object.values(VENUES).filter((venue) => venue.kind === 'restaurant')
    expect(restaurants.length).toBeGreaterThan(0)
    for (const restaurant of restaurants) {
      expect(
        restaurant.restsForDays,
        `${restaurant.name} charges $${restaurant.price} for two lines of flavour text`,
      ).toBeGreaterThan(0)
    }
  })
})

describe('the opponents', () => {
  it('says how every one of them plays', () => {
    // Skill tier says how well somebody plays; archetype says how. Without the
    // second, "plays every hand he is dealt" and "grinds small pots" were the same
    // bot with different captions.
    for (const table of Object.values(TABLES)) {
      for (const opponent of table.opponents) {
        expect(
          opponent.archetype,
          `${opponent.name} at ${table.name} has no playing style`,
        ).toBeDefined()
      }
    }
  })

  it('seats more than two people at the main cash games', () => {
    // Every table in the game was two or three handed, so the player was in a
    // blind on most hands and every pot was an all-in by the turn.
    const sixHanded = Object.values(TABLES).filter((table) => table.opponents.length >= 5)
    expect(sixHanded.length, 'there is no six-handed game anywhere on the ladder').toBeGreaterThan(0)
  })

  it('gives every seated opponent a personality to speak with', () => {
    for (const table of Object.values(TABLES)) {
      for (const opponent of table.opponents) {
        expect(
          PERSONALITIES[opponent.id],
          `${opponent.name} (${opponent.id}) has no personality entry`,
        ).toBeDefined()
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
