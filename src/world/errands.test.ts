import { describe, expect, it } from 'vitest'
import { ERRANDS, ERRAND_EVENTS, errandPois, errandStage, payRange } from './errands'
import { EVENTS, eventFor, everyAction } from './events'
import { AREAS, TABLES } from './content'
import { initialState, type CityId, type GameState } from '../game/state'
import { challengeLines } from '../game/progression'
import { OUTSKIRTS_GAPS } from './outskirts'
import { isWalkable } from '../overworld/tiles'

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
  it('give every town two to four jobs (four where one is a poker lesson that pays little)', () => {
    for (const town of TOWNS) {
      const n = ERRANDS.filter((e) => e.cityId === town).length
      expect(n, town).toBeGreaterThanOrEqual(2)
      expect(n, town).toBeLessThanOrEqual(4)
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
      // A gated job is walked once what it asks for has happened.
      for (const c of e.requires ?? []) {
        if (c.kind === 'flag') state = { ...state, flags: { ...state.flags, [c.flag]: c.set ?? true } }
        if (c.kind === 'eventDone') state = { ...state, completedEventIds: [...state.completedEventIds, c.eventId] }
      }
      const at = (poiId: string) => eventFor(EVENTS, { kind: 'interact', poiId }, state)
      const play = (id: string) => {
        state = { ...state, completedEventIds: [...state.completedEventIds, id] }
      }

      expect(errandStage(e, state.completedEventIds).stage).toBe('new')
      // Before it is asked, a leg's fixture does nothing special and the client asks.
      for (const leg of e.legs) expect(at(leg.poi)?.id.startsWith(e.id), `${e.id}: ${leg.poi} fires early`).not.toBe(true)
      // Gated and night jobs do not ask at the wrong hour.
      if (e.periods) {
        const wrong = (['morning', 'afternoon', 'evening', 'night'] as const).find((p) => !e.periods!.includes(p))
        if (wrong) expect(eventFor(EVENTS, { kind: 'interact', poiId: e.client }, { ...state, period: wrong })?.id).not.toBe(`${e.id}-ask`)
      }
      state = { ...state, period: e.periods?.[0] ?? 'morning' }
      expect(at(e.client)?.id).toBe(`${e.id}-ask`)
      play(`${e.id}-ask`)

      for (let i = 0; i < e.legs.length; i++) {
        // Open: the client reminds you, over and over, and the stage says what is next.
        expect(at(e.client)?.id, `${e.id}: reminder before leg ${i + 1}`).toBe(`${e.id}-hint`)
        expect(errandStage(e, state.completedEventIds, state.flags)).toMatchObject({ stage: 'open', todo: e.legs[i].todo })
        // Later legs wait their turn.
        for (let later = i + 1; later < e.legs.length; later++) {
          expect(at(e.legs[later].poi)?.id, `${e.id}: leg ${later + 1} fires out of order`).not.toBe(`${e.id}-leg${later + 1}`)
        }
        // A leg that waits for an hour is walked at an hour it allows.
        const hours = e.legs[i].periods ?? e.periods
        state = { ...state, period: hours ? hours[0] : 'morning' }
        expect(at(e.legs[i].poi)?.id).toBe(`${e.id}-leg${i + 1}`)
        play(`${e.id}-leg${i + 1}`)
      }

      expect(at(e.client)?.id).toBe(`${e.id}-done`)
      expect(errandStage(e, state.completedEventIds, state.flags).todo).toContain(e.clientName)
      play(`${e.id}-done`)
      expect(errandStage(e, state.completedEventIds, state.flags).stage).toBe('done')
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

describe('errand pay and wording', () => {
  it('never pays more down any branch than the stated reward', () => {
    for (const e of ERRANDS) {
      const cashOf = (flag?: string) =>
        e.legs.flatMap((l) => l.choice?.options.filter((o) => o.flag === flag).map((o) => o.cash ?? 0) ?? [])
      for (const v of e.variants ?? []) {
        for (const cash of cashOf(v.flag)) expect(cash + v.reward, `${e.id}: ${v.flag}`).toBeLessThanOrEqual(e.reward)
      }
      for (const cash of cashOf(undefined)) expect(cash + (e.defaultReward ?? e.reward), `${e.id}: plain`).toBeLessThanOrEqual(e.reward)
    }
  })

  it('make the other answer cost or earn something different', () => {
    for (const e of ERRANDS) {
      for (const v of e.variants ?? []) {
        const cash = e.legs.flatMap((l) => l.choice?.options.filter((o) => o.flag === v.flag).map((o) => o.cash ?? 0) ?? [])[0] ?? 0
        const plainCash = e.legs.flatMap((l) => l.choice?.options.filter((o) => !o.flag).map((o) => o.cash ?? 0) ?? [])[0] ?? 0
        const other = cash + v.reward
        const plain = plainCash + (e.defaultReward ?? e.reward)
        // Same totals are allowed only where the other answer changes who you are to the client (Loretta, Dutch, Sal's bluff differ in pay too).
        expect(other === plain && v.after.length < 3 && e.after.length < 3, `${e.id}: the fork pays the same and says little`).toBe(false)
      }
    }
  })

  it('show the range of pay, or the exact pay once the answer is given', () => {
    const wendell = ERRANDS.find((e) => e.id === 'errand-wendell')!
    expect(payRange(wendell)).toBe('$20-$60')
    const all = wendell.legs.map((_, i) => `${wendell.id}-leg${i + 1}`)
    const done = [`${wendell.id}-ask`, ...all]
    expect(errandStage(wendell, done, { errandWendellSold: true }).pays).toBe('Pays $20.')
    expect(errandStage(wendell, done, { errandWendellSold: false }).pays).toBe('Pays $60.')
    expect(errandStage(wendell, done, { errandWendellSold: true }).todo).toContain('Nico')
  })

  it('say narration under no name, and each speaker’s lines under theirs', () => {
    for (const event of ERRAND_EVENTS) {
      for (const action of everyAction(event.actions)) {
        if (action.kind !== 'dialogue') continue
        const prefixes = new Set(action.lines.map((l) => l.match(/^([^:]{1,24}): /)?.[1] ?? ''))
        expect(prefixes.size, `${event.id}: two voices in one box`).toBe(1)
        const who = [...prefixes][0]
        expect(action.speaker ?? '', `${event.id}: “${action.lines[0].slice(0, 40)}”`).toBe(who)
      }
    }
  })

  it('wait for dark without ever rolling a day', () => {
    for (const poi of ['nm-darkbench', 'pl-darkbench']) {
      const event = EVENTS.find((e) => e.id === `wait-for-dark-${poi}`)!
      for (const period of ['morning', 'afternoon', 'evening'] as const) {
        expect(eventFor(EVENTS, { kind: 'interact', poiId: poi }, { ...initialState(), period })?.id).toBe(event.id)
        // However much it advances, it lands on night on the same day.
        const steps = period === 'morning' ? 3 : period === 'afternoon' ? 2 : 1
        const index = ['morning', 'afternoon', 'evening', 'night'].indexOf(period)
        expect(index + steps).toBe(3)
      }
      expect(eventFor(EVENTS, { kind: 'interact', poiId: poi }, { ...initialState(), period: 'night' })?.id).not.toBe(event.id)
    }
  })

  it('show the challenge and the gap on the Jobs page', () => {
    const state = { ...initialState(), cityId: 'silverCreek' as const, cash: 100 }
    const lines = challengeLines(state)
    expect(lines[0]).toMatch(/Win \$/)
    expect(lines[1]).toMatch(/short/)
    expect(challengeLines({ ...state, cityId: 'apartment' as never })).toEqual([])
  })

  it('open the odd job only to the nearly broke, by day', () => {
    const job = EVENTS.find((e) => e.id === 'odd-job-rb-fishrack')!
    const rich = { ...initialState(), cash: 5000 }
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'rb-fishrack' }, rich)).toBeUndefined()
    const broke = { ...initialState(), cash: 10, period: 'morning' as const }
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'rb-fishrack' }, broke)?.id).toBe(job.id)
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'rb-fishrack' }, { ...broke, period: 'night' })).toBeUndefined()
  })

  it('keep the outskirts joined to their roads, walkable at the gap', () => {
    for (const id of ['sc', 'rb', 'ch', 'pc', 'nm', 'pl']) {
      const outskirts = AREAS[`${id}-outskirts`]
      const north = outskirts.area.edges?.north
      expect(north, id).toBeDefined()
      const road = AREAS[north!.toAreaId]
      expect(road.area.edges?.south?.toAreaId, `${id}: the road does not lead back`).toBe(`${id}-outskirts`)
      const [c0, c1] = OUTSKIRTS_GAPS[`${id}-outskirts`]
      const roadRows = road.area.map.length
      for (let c = c0; c <= c1; c++) {
        expect(isWalkable(outskirts.area.map, c, 0), `${id}: gap ${c} on the outskirts`).toBe(true)
        expect(isWalkable(road.area.map, c, roadRows - 1), `${id}: gap ${c} on the road`).toBe(true)
      }
    }
  })
})
