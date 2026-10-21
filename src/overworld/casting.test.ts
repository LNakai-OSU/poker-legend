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
