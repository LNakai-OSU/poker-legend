import { describe, expect, it } from 'vitest'
import { ERRANDS, ERRAND_EVENTS, errandPois, errandStage } from './errands'
import { EVENTS, eventFor, everyAction } from './events'
import { AREAS, TABLES } from './content'
import { initialState, type CityId, type GameState } from '../game/state'

/** The cheapest seat in each town: what a bust costs you there. */
const CHEAPEST_SEAT: Record<string, number> = {
  silverCreek: TABLES['silvercreek-low'].buyIn,
  riverbend: TABLES['riverbend-mid'].buyIn,
  crescentHarbor: TABLES['crescent-main'].buyIn,
  palmCay: TABLES['palmcay-high'].buyIn,
  neonMesa: TABLES['mesa-main'].buyIn,
  portoLumina: TABLES['lumina-nosebleed'].buyIn,
}

const TOWNS: CityId[] = ['silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa', 'portoLumina']

const allPois = () => Object.values(AREAS).flatMap(({ area, cityId }) => area.pois.map((poi) => ({ poi, area, cityId })))

describe('errands', () => {
  it('give every town two or three jobs', () => {
    for (const town of TOWNS) {
      const n = ERRANDS.filter((e) => e.cityId === town).length
      expect(n, town).toBeGreaterThanOrEqual(2)
      expect(n, town).toBeLessThanOrEqual(3)
    }
  })

  it('stand where they say they do, in the town they belong to', () => {
    const pois = allPois()
    for (const e of ERRANDS) {
      for (const poiId of [e.client, ...e.legs.map((l) => l.poi)]) {
        const found = pois.filter((p) => p.poi.id === poiId)
        expect(found.length, `${e.id}: "${poiId}" is not on any map`).toBe(1)
        expect(found[0].cityId, `${e.id}: "${poiId}" is in another town`).toBe(e.cityId)
      }
    }
  })

  it('put every new person on the map they name, once', () => {
    for (const e of ERRANDS) {
      for (const person of e.people) {
        expect(errandPois(person.areaId).filter((p) => p.id === person.id)).toHaveLength(1)
        expect(AREAS[person.areaId], `${person.id}: no such area`).toBeDefined()
      }
    }
  })

  it('are each worth about a seat at the town’s cheapest table, never a windfall', () => {
    // They are there to climb back from a bad beat with, not to replace the tables.
    for (const town of TOWNS) {
      const total = ERRANDS.filter((e) => e.cityId === town).reduce((sum, e) => sum + e.reward, 0)
      const seat = CHEAPEST_SEAT[town]
      expect(total, `${town}: ${total} against a ${seat} seat`).toBeGreaterThanOrEqual(seat * 0.5)
      expect(total, `${town}: ${total} against a ${seat} seat`).toBeLessThanOrEqual(seat * 2.5)
    }
  })

  it('climb with the ladder', () => {
    const ratio = (town: CityId) => ERRANDS.filter((e) => e.cityId === town).reduce((s, e) => s + e.reward, 0)
    const totals = TOWNS.map(ratio)
    totals.forEach((total, i) => {
      if (i > 0) expect(total, TOWNS[i]).toBeGreaterThan(totals[i - 1])
    })
  })

  it('never hand out a day, or move the story', () => {
    for (const event of ERRAND_EVENTS) {
      for (const action of everyAction(event.actions)) {
        expect(['advanceDay', 'unlockCity', 'unlockTable', 'startTable', 'teleport', 'ride']).not.toContain(action.kind)
      }
    }
  })

  it('walk through, step by step, to the pay', () => {
    for (const e of ERRANDS) {
      let state: GameState = initialState()
      const at = (poiId: string) => eventFor(EVENTS, { kind: 'interact', poiId }, state)
      const play = (id: string) => {
        state = { ...state, completedEventIds: [...state.completedEventIds, id] }
      }

      expect(errandStage(e, state.completedEventIds).stage).toBe('new')
      // Before it is asked, a leg's fixture does nothing special and the client asks.
      for (const leg of e.legs) expect(at(leg.poi)?.id.startsWith(e.id), `${e.id}: ${leg.poi} fires early`).not.toBe(true)
      expect(at(e.client)?.id).toBe(`${e.id}-ask`)
      play(`${e.id}-ask`)

      for (let i = 0; i < e.legs.length; i++) {
        // Open: the client reminds you, over and over, and the stage says what is next.
        expect(at(e.client)?.id, `${e.id}: reminder before leg ${i + 1}`).toBe(`${e.id}-hint`)
        expect(errandStage(e, state.completedEventIds)).toEqual({ stage: 'open', todo: e.legs[i].todo })
        // Later legs wait their turn.
        for (let later = i + 1; later < e.legs.length; later++) {
          expect(at(e.legs[later].poi)?.id, `${e.id}: leg ${later + 1} fires out of order`).not.toBe(`${e.id}-leg${later + 1}`)
        }
        expect(at(e.legs[i].poi)?.id).toBe(`${e.id}-leg${i + 1}`)
        play(`${e.id}-leg${i + 1}`)
      }

      expect(at(e.client)?.id).toBe(`${e.id}-done`)
      play(`${e.id}-done`)
      expect(errandStage(e, state.completedEventIds).stage).toBe('done')
      // Once it is paid, it is over: no second payout.
      expect(at(e.client)?.id).toBeUndefined()
      const paid = EVENTS.find((x) => x.id === `${e.id}-done`)!
      expect(paid.actions.some((a) => a.kind === 'giveCash' && a.amount === e.reward)).toBe(true)
    }
  })
})
