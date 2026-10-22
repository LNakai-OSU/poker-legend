import { describe, expect, it } from 'vitest'
import { artForPoi, figureForCharacter, figuresForPois, lookFromId, roleForPoi } from './casting'
import { visualKey } from './characterArt'
import { CITIES, allAreas } from '../world/cities'
import { CHARACTERS, charactersIn } from '../world/characters'
import { TIME_PERIODS } from '../game/time'
import type { PoiDef } from '../world/types'

const poi = (overrides: Partial<PoiDef>): PoiDef => ({
  id: 'someone',
  name: 'Someone',
  col: 1,
  row: 1,
  color: 0,
  lines: [],
  action: { kind: 'flavor' },
  ...overrides,
})

describe('who is dressed as what', () => {
  it('dresses people for what they do', () => {
    expect(roleForPoi(poi({ action: { kind: 'table', tableId: 't' } }))).toBe('dealer')
    expect(roleForPoi(poi({ action: { kind: 'craps' } }))).toBe('dealer')
    expect(roleForPoi(poi({ action: { kind: 'shop', shopId: 's' }, name: 'Clerk' }))).toBe('clerk')
    expect(roleForPoi(poi({ action: { kind: 'shop', shopId: 's' }, name: 'Salesman' }))).toBe('suit')
    expect(roleForPoi(poi({ action: { kind: 'sponsor', sponsorId: 's' } }))).toBe('suit')
    expect(roleForPoi(poi({ action: { kind: 'venue', venueId: 'v' }, name: 'Waiter' }))).toBe('waiter')
    expect(roleForPoi(poi({ action: { kind: 'venue', venueId: 'v' }, name: 'Door Host' }))).toBe('security')
    expect(roleForPoi(poi({ action: { kind: 'penthouse' } }))).toBe('bellhop')
  })

  it('reads a job out of a name when the action does not say', () => {
    expect(roleForPoi(poi({ name: 'Patrol Officer' }))).toBe('officer')
    expect(roleForPoi(poi({ name: 'Bartender' }))).toBe('bartender')
    expect(roleForPoi(poi({ name: 'Sunburnt Tourist' }))).toBe('tourist')
    expect(roleForPoi(poi({ name: 'Kid on a Bike' }))).toBe('kid')
    expect(roleForPoi(poi({ name: 'Neighbour' }))).toBe('local')
  })

  it('lets content say outright, whatever the defaults would have been', () => {
    expect(roleForPoi(poi({ name: 'Patrol Officer', role: 'chef' }))).toBe('chef')
    expect(roleForPoi(poi({ action: { kind: 'table', tableId: 't' }, role: 'suit' }))).toBe('suit')
  })
})

describe('what is not a person', () => {
  it('draws things as things', () => {
    expect(artForPoi(poi({ name: 'Note on the Table' }))).toBe('note')
    expect(artForPoi(poi({ name: 'Mile Sign' }))).toBe('sign')
    expect(artForPoi(poi({ name: 'Gull on a Post' }))).toBe('gull')
    expect(artForPoi(poi({ name: 'Dryers' }))).toBe('none')
    expect(artForPoi(poi({ action: { kind: 'travel' }, name: 'Bus Stop' }))).toBe('sign')
    expect(artForPoi(poi({ name: 'Woman with Shopping' }))).toBe('person')
    expect(artForPoi(poi({ name: 'Note on the Table', art: 'person' }))).toBe('person')
  })
})

describe('looks', () => {
  it('makes up the same stranger every time', () => {
    expect(lookFromId('neighbour', 'Neighbour')).toEqual(lookFromId('neighbour', 'Neighbour'))
    expect(lookFromId('neighbour')).not.toEqual(lookFromId('street-kid'))
  })

  it('draws a character in the street from their own look, as at the table', () => {
    for (const [id, character] of Object.entries(CHARACTERS)) {
      const { look } = figureForCharacter(id, character)
      expect(look.skin).toBe(character.look.skin)
      expect(look.hair).toBe(character.look.hair)
      expect(look.hairStyle).toBe(character.look.hairStyle)
      expect(look.shirt).toBe(character.look.shirt)
      expect(look.accessory).toBe(character.look.accessory)
    }
  })

  it('casts a POI that is a character as that character', () => {
    const figures = figuresForPois([poi({ id: 'marcus-dana', name: 'Dana' })], CHARACTERS)
    expect(figures.get('marcus-dana')?.look.shirt).toBe(CHARACTERS.dana.look.shirt)
  })

  it('gives somebody who turns up in two towns the same face in both', () => {
    // Hal teaches in Crescent Harbor and on the Strip; he was drawn from each
    // POI's id, so the same man had two faces.
    const drawn = new Map<string, string[]>()
    for (const city of Object.values(CITIES)) {
      for (const area of allAreas(city)) {
        const figures = figuresForPois(area.pois, CHARACTERS)
        for (const p of area.pois) {
          if (p.name !== 'Hal') continue
          drawn.set(p.id, [visualKey(figures.get(p.id)!)])
        }
      }
    }
    expect([...drawn.keys()].sort()).toEqual(['hal', 'hal-mesa'])
    expect(drawn.get('hal')).toEqual(drawn.get('hal-mesa'))
  })

  it('dresses the shopkeeper and the boat dealer for the job', () => {
    const everyone = Object.values(CITIES).flatMap((city) => allAreas(city).flatMap((a) => a.pois))
    expect(roleForPoi(everyone.find((p) => p.id === 'patel')!)).toBe('clerk')
    expect(roleForPoi(everyone.find((p) => p.id === 'marina')!)).toBe('suit')
  })

  /**
   * The whole point of giving strangers faces: no street has two of the same
   * person standing in it, at any hour.
   */
  it('puts nobody in any area who looks exactly like anybody else there', () => {
    for (const city of Object.values(CITIES)) {
      for (const area of allAreas(city)) {
        for (const period of TIME_PERIODS) {
          const scheduled = charactersIn(area.id, period).map(({ id, character }) => figureForCharacter(id, character))
          const people = area.pois.filter((p) => artForPoi(p) === 'person')
          const figures = figuresForPois(people, CHARACTERS, scheduled)
          const keys = [...scheduled, ...people.map((p) => figures.get(p.id)!)].map(visualKey)
          expect(new Set(keys).size, `${area.id} in the ${period}`).toBe(keys.length)
        }
      }
    }
  })
})

describe('what people wear', () => {
  /** Everybody standing at a POI in the game, as drawn. */
  const everyone = Object.values(CITIES).flatMap((city) =>
    allAreas(city).flatMap((area) => {
      const figures = figuresForPois(area.pois, CHARACTERS)
      return area.pois.filter((poi) => artForPoi(poi) === 'person').map((poi) => figures.get(poi.id)!)
    }),
  )

  it('does not put half the town in the same hat', () => {
    // Eight people across the game wore one navy cap, so the street read as one
    // man in different shirts. A hat is a person's own now, in their own colour.
    const hats = new Map<string, number>()
    for (const { role, look } of everyone) {
      // A cap from the portrait accessories shows on anybody whose job has no hat of its own.
      const own = role === 'local' || role === 'kid' ? look.hat : undefined
      const hat = own ?? (look.accessory === 'cap' || look.accessory === 'visor' ? look.accessory : undefined)
      if (!hat) continue
      const key = `${hat} ${look.hatColor ?? 'default'}`
      hats.set(key, (hats.get(key) ?? 0) + 1)
    }
    const common = [...hats.entries()].filter(([, n]) => n > 3)
    expect(common, 'the same hat in the same colour on more than three heads').toEqual([])
  })

  it('dresses people in their own clothes in more than a shirt', () => {
    const own = everyone.filter(({ role }) => role === 'local')
    const garments = new Set(own.map(({ look }) => look.garment).filter(Boolean))
    const hairs = new Set(own.map(({ look }) => look.hairStyle))
    expect(garments.size, 'kinds of thing worn over the shirt').toBeGreaterThanOrEqual(4)
    expect(hairs.size, 'haircuts').toBeGreaterThanOrEqual(9)
  })

  it('keeps a uniform a uniform', () => {
    // A dealer in a hoodie is not a dealer. Garments and hats of one's own are
    // for people in their own clothes; the job's clothes cover them.
    const look = lookFromId('somebody')
    const plain = visualKey({ role: 'dealer', look: { ...look, garment: undefined, hat: undefined } })
    const dressed = visualKey({
      role: 'dealer',
      look: { ...look, garment: 'hoodie', garmentColor: '#c83a3a', hat: 'cowboy' },
    })
    expect(dressed).toBe(plain)
  })
})
