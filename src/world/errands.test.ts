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
        // A leg that waits for an hour is walked at an hour it allows.
        const hours = e.legs[i].periods
        state = { ...state, period: hours ? hours[0] : 'morning' }
        expect(at(e.legs[i].poi)?.id).toBe(`${e.id}-leg${i + 1}`)
        play(`${e.id}-leg${i + 1}`)
      }

      expect(at(e.client)?.id).toBe(`${e.id}-done`)
      play(`${e.id}-done`)
      expect(errandStage(e, state.completedEventIds).stage).toBe('done')
      // Once it is paid, it is over: no second payout, only the client's afterword.
      expect(at(e.client)?.id).toBe(`${e.id}-after`)
      const paid = EVENTS.find((x) => x.id === `${e.id}-done`)!
      const pays = everyAction(paid.actions).filter((a) => a.kind === 'giveCash').map((a) => (a.kind === 'giveCash' ? a.amount : 0))
      expect(Math.max(...pays), `${e.id}: the best ending pays the reward`).toBe(e.reward)
      expect(Math.min(...pays)).toBeGreaterThan(0)
    }
  })

  it('keep every line short enough for a text box', () => {
    for (const event of ERRAND_EVENTS) {
      for (const action of everyAction(event.actions)) {
        if (action.kind !== 'dialogue') continue
        for (const line of action.lines) expect(line.length, `${event.id}: ${line.slice(0, 40)}…`).toBeLessThanOrEqual(190)
      }
    }
  })

  it('only wait in daylight, so an hour passes and a day never does', () => {
    for (const event of ERRAND_EVENTS) {
      if (!everyAction(event.actions).some((a) => a.kind === 'advancePeriod')) continue
      const period = event.conditions?.find((c) => c.kind === 'period')
      expect(period, `${event.id} waits at any hour`).toBeDefined()
      const allowed = period && period.kind === 'period' ? [period.period].flat() : []
      expect(allowed).not.toContain('night')
    }
  })
})

describe('errand choices', () => {
  const flagsSet = (e: (typeof ERRANDS)[number]) =>
    e.legs.flatMap((l) => l.choice?.options.flatMap((o) => (o.flag ? [o.flag] : [])) ?? [])

  it('make the client answer differently, for every flag a choice sets', () => {
    for (const e of ERRANDS) {
      for (const flag of flagsSet(e)) {
        const variant = e.variants?.find((v) => v.flag === flag)
        expect(variant, `${e.id}: ${flag} changes nothing at the finish`).toBeDefined()
        expect(variant!.finish).not.toEqual(e.finish)
        expect(variant!.after).not.toEqual(e.after)
      }
    }
  })

  it('pay on the spot at no more than the reward, and keep each town in its range', () => {
    for (const e of ERRANDS) {
      const spot = e.legs.flatMap((l) => l.choice?.options.map((o) => o.cash ?? 0) ?? [])
      for (const cash of spot) expect(cash, e.id).toBeLessThan(e.reward)
    }
  })

  it('send the broke to the Jobs page', () => {
    const broke = { ...initialState(), record: { ...initialState().record, busted: 1 }, cash: 0 }
    const fresh = initialState()
    for (const poi of ['sc-regular', 'rb-diner-pilot', 'ch-suit', 'pc-lifeguard', 'nm-tout', 'pl-photographer']) {
      expect(eventFor(EVENTS, { kind: 'interact', poiId: poi }, broke)?.id, poi).toBe(`bust-nudge-${poi}`)
      expect(eventFor(EVENTS, { kind: 'interact', poiId: poi }, fresh)?.id, poi).not.toBe(`bust-nudge-${poi}`)
    }
  })
})
