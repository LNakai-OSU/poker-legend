import { describe, expect, it } from 'vitest'
import {
  EVENTS,
  arrivalClashes,
  arrivalsDuring,
  canBothFire,
  conditionHolds,
  eventFor,
  eventsSharing,
  everyAction,
  everyCondition,
  type EventAction,
  type GameEvent,
} from './events'
import { actionProblems, type StoryWorld } from './eventChecks'
import { LESSONS, allShopItems } from './content'
import { STORY_FLAG_IDS, type StoryFlag } from './flags'
import { readFileSync } from 'node:fs'
import { CHARACTERS, allSchedules, scheduleFor } from './characters'
import { AREAS, CITIES, CITY_ORDER, SPONSORS, TABLES } from './content'
import { TOWN_ORDER, initialState, type CityId, type GameState } from '../game/state'

const at = (overrides: Partial<GameState> = {}): GameState => ({ ...initialState(), ...overrides })

/**
 * The story as an event asks for it: its chapter, its flags, the beats it waits
 * on, what is owed, where the match stands and the record. The hour and the cash
 * are left alone — they decide when, not where.
 */
function storyStateFor(event: GameEvent, town: CityId): GameState {
  let state = at({ day: 10, unlockedCityIds: TOWN_ORDER.slice(0, TOWN_ORDER.indexOf(town) + 1) })
  for (const c of event.conditions ?? []) {
    switch (c.kind) {
      case 'flag':
        state = { ...state, flags: { ...state.flags, [c.flag]: c.set ?? true } }
        break
      case 'eventDone':
        if (c.done ?? true) state = { ...state, completedEventIds: [...state.completedEventIds, c.eventId] }
        break
      case 'count': {
        const n = c.atLeast ?? (c.atMost === undefined ? 1 : 0)
        const record = state.record
        const sponsor = c.sponsorId ?? 'cass'
        const before = record.sponsors[sponsor] ?? { staked: 0, repaid: 0, missed: 0, caught: 0 }
        state =
          c.of === 'busted' || c.of === 'challengeLost'
            ? { ...state, record: { ...record, [c.of]: n } }
            : {
                ...state,
                record: {
                  ...record,
                  sponsors: {
                    ...record.sponsors,
                    [sponsor]: { ...before, [c.of]: n },
                  },
                },
              }
        break
      }
      case 'challenge': {
        const want = [c.status].flat()[0]
        if (want === 'won') state = { ...state, flags: { ...state.flags, hasPenthouse: true } }
        if (want === 'lost' || want === 'rematch') {
          state = { ...state, finaleRematchDay: want === 'lost' ? 15 : 0, record: { ...state.record, challengeLost: 1 } }
        }
        break
      }
      case 'debt': {
        const want = [c.status].flat()[0]
        if (want === 'none' || !c.sponsorId) break
        const debt = { id: c.sponsorId, sponsorId: c.sponsorId, sponsorName: c.sponsorId, principal: 1, owed: 1, cityId: town }
        state = { ...state, debts: [...state.debts, { ...debt, dueOnDay: want === 'owing' ? 12 : 5 }] }
        break
      }
    }
  }
  return state
}

const SAY_HELLO: GameEvent = {
  id: 'say-hello',
  about: 'test',
  trigger: { kind: 'talkTo', characterId: 'marcus' },
  actions: [{ kind: 'dialogue', lines: ['Hello.'] }],
}

describe('conditions', () => {
  it('reads a flag both ways round', () => {
    const won = at({ flags: { ...initialState().flags, wonPokerNight: true } })
    expect(conditionHolds({ kind: 'flag', flag: 'wonPokerNight' }, won)).toBe(true)
    expect(conditionHolds({ kind: 'flag', flag: 'wonPokerNight', set: false }, won)).toBe(false)
    expect(conditionHolds({ kind: 'flag', flag: 'wonPokerNight', set: false }, at())).toBe(true)
  })

  it('takes one hour or a list of them', () => {
    const evening = at({ period: 'evening' })
    expect(conditionHolds({ kind: 'period', period: 'evening' }, evening)).toBe(true)
    expect(conditionHolds({ kind: 'period', period: 'morning' }, evening)).toBe(false)
    expect(conditionHolds({ kind: 'period', period: ['afternoon', 'evening'] }, evening)).toBe(true)
    expect(conditionHolds({ kind: 'period', period: ['morning', 'night'] }, evening)).toBe(false)
  })

  it('compares days, cash, items and lessons', () => {
    expect(conditionHolds({ kind: 'dayAtLeast', day: 3 }, at({ day: 3 }))).toBe(true)
    expect(conditionHolds({ kind: 'dayAtLeast', day: 4 }, at({ day: 3 }))).toBe(false)
    expect(conditionHolds({ kind: 'cashAtLeast', amount: 500 }, at({ cash: 500 }))).toBe(true)
    expect(conditionHolds({ kind: 'hasItem', itemId: 'x' }, at({ ownedItemIds: ['x'] }))).toBe(true)
    expect(conditionHolds({ kind: 'hasLesson', lessonId: 'x' }, at({ lessonIds: [] }))).toBe(false)
  })

  it('can ask whether a beat has already happened, either way round', () => {
    const after = at({ completedEventIds: ['poker-night'] })
    expect(conditionHolds({ kind: 'eventDone', eventId: 'poker-night' }, after)).toBe(true)
    expect(conditionHolds({ kind: 'eventDone', eventId: 'poker-night', done: false }, after)).toBe(false)
    expect(conditionHolds({ kind: 'eventDone', eventId: 'poker-night', done: false }, at())).toBe(true)
  })

  it('reads what you owe, whose collectors are in town, the match and the record', () => {
    const owing = at({ day: 2, cityId: 'riverbend', debts: [{ id: 'd', sponsorId: 'cass', sponsorName: 'Cass', principal: 1, owed: 2, dueOnDay: 4, cityId: 'riverbend' }] })
    expect(conditionHolds({ kind: 'debt', sponsorId: 'cass', status: 'owing' }, owing)).toBe(true)
    expect(conditionHolds({ kind: 'debt', sponsorId: 'emeka', status: 'none' }, owing)).toBe(true)
    expect(conditionHolds({ kind: 'debt', status: ['overdue', 'none'] }, owing)).toBe(false)
    const hunted = { ...owing, day: 6, huntedInCityId: 'riverbend' as const }
    expect(conditionHolds({ kind: 'debt', status: 'overdue' }, hunted)).toBe(true)
    expect(conditionHolds({ kind: 'hunted', sponsorId: 'cass' }, hunted)).toBe(true)
    expect(conditionHolds({ kind: 'hunted', sponsorId: 'wen' }, hunted)).toBe(false)
    expect(conditionHolds({ kind: 'hunted', set: false }, owing)).toBe(true)
    expect(conditionHolds({ kind: 'cashBelow', amount: 100 }, at({ cash: 99 }))).toBe(true)
    expect(conditionHolds({ kind: 'cashBelow', amount: 100 }, at({ cash: 100 }))).toBe(false)
    const lost = at({ day: 3, finaleRematchDay: 9, record: { busted: 2, challengeLost: 1, sponsors: { cass: { staked: 1, repaid: 1, missed: 0, caught: 0 } } } })
    expect(conditionHolds({ kind: 'challenge', status: 'lost' }, lost)).toBe(true)
    expect(conditionHolds({ kind: 'challenge', status: ['rematch', 'won'] }, lost)).toBe(false)
    expect(conditionHolds({ kind: 'count', of: 'busted' }, lost)).toBe(true)
    expect(conditionHolds({ kind: 'count', of: 'busted', atLeast: 3 }, lost)).toBe(false)
    expect(conditionHolds({ kind: 'count', of: 'missed', sponsorId: 'cass', atMost: 0 }, lost)).toBe(true)
    expect(conditionHolds({ kind: 'count', of: 'repaid', sponsorId: 'emeka' }, lost)).toBe(false)
  })

  it('reads the chapter as the furthest town set foot in, not the one you are in', () => {
    const upriver = at({ cityId: 'silverCreek', unlockedCityIds: ['apartment', 'silverCreek', 'riverbend'] })
    expect(conditionHolds({ kind: 'chapter', cityId: 'riverbend' }, upriver)).toBe(true)
    expect(conditionHolds({ kind: 'chapter', cityId: 'silverCreek' }, upriver)).toBe(false)
    expect(conditionHolds({ kind: 'chapter', cityId: ['palmCay', 'riverbend'] }, upriver)).toBe(true)
    expect(conditionHolds({ kind: 'chapter', cityId: 'apartment' }, at())).toBe(true)
  })
})

describe('telling two events apart', () => {
  const event = (id: string, conditions: GameEvent['conditions'], repeatable?: boolean): GameEvent => ({
    ...SAY_HELLO,
    id,
    conditions,
    repeatable,
  })

  it('separates them by a flag, an hour or a chapter', () => {
    expect(canBothFire(event('a', [{ kind: 'flag', flag: 'wonPokerNight' }]), event('b', [{ kind: 'flag', flag: 'wonPokerNight', set: false }]))).toBe(false)
    expect(canBothFire(event('a', [{ kind: 'period', period: 'morning' }]), event('b', [{ kind: 'period', period: ['evening', 'night'] }]))).toBe(false)
    expect(canBothFire(event('a', [{ kind: 'chapter', cityId: 'riverbend' }]), event('b', [{ kind: 'chapter', cityId: 'palmCay' }]))).toBe(false)
  })

  it('does not separate them by things that can both be true', () => {
    expect(canBothFire(event('a', []), event('b', []))).toBe(true)
    expect(canBothFire(event('a', [{ kind: 'period', period: 'morning' }]), event('b', [{ kind: 'period', period: ['morning', 'night'] }]))).toBe(true)
    expect(canBothFire(event('a', [{ kind: 'chapter', cityId: 'riverbend' }]), event('b', [{ kind: 'cashAtLeast', amount: 600 }]))).toBe(true)
    // An hour that differs does not help when the other has no hour at all.
    expect(canBothFire(event('a', [{ kind: 'period', period: 'morning' }]), event('b', [{ kind: 'chapter', cityId: 'riverbend' }]))).toBe(true)
  })

  it('separates them by what you hold, owe and have been through', () => {
    const apart = (a: GameEvent['conditions'], b: GameEvent['conditions']) => !canBothFire(event('a', a), event('b', b))
    expect(apart([{ kind: 'cashAtLeast', amount: 600 }], [{ kind: 'cashBelow', amount: 100 }])).toBe(true)
    expect(apart([{ kind: 'cashAtLeast', amount: 50 }], [{ kind: 'cashBelow', amount: 100 }])).toBe(false)
    expect(apart([{ kind: 'debt', sponsorId: 'cass', status: 'owing' }], [{ kind: 'debt', sponsorId: 'cass', status: ['none', 'overdue'] }])).toBe(true)
    expect(apart([{ kind: 'debt', status: 'none' }], [{ kind: 'debt', sponsorId: 'cass', status: 'owing' }])).toBe(true)
    expect(apart([{ kind: 'debt', status: 'owing' }], [{ kind: 'debt', sponsorId: 'cass', status: 'overdue' }])).toBe(true)
    // Two sponsors can each be owed at once.
    expect(apart([{ kind: 'debt', sponsorId: 'cass', status: 'owing' }], [{ kind: 'debt', sponsorId: 'wen', status: 'owing' }])).toBe(false)
    expect(apart([{ kind: 'hunted', sponsorId: 'cass' }], [{ kind: 'hunted', sponsorId: 'wen' }])).toBe(true)
    expect(apart([{ kind: 'hunted' }], [{ kind: 'hunted', set: false }])).toBe(true)
    expect(apart([{ kind: 'challenge', status: ['lost', 'rematch'] }], [{ kind: 'flag', flag: 'hasPenthouse' }])).toBe(true)
    expect(apart([{ kind: 'challenge', status: 'unplayed' }], [{ kind: 'challenge', status: ['unplayed', 'lost'] }])).toBe(false)
    expect(apart([{ kind: 'count', of: 'caught', sponsorId: 'cass', atMost: 0 }], [{ kind: 'count', of: 'caught', sponsorId: 'cass' }])).toBe(true)
    expect(apart([{ kind: 'count', of: 'caught', sponsorId: 'cass', atMost: 0 }], [{ kind: 'count', of: 'caught', sponsorId: 'wen' }])).toBe(false)
  })

  it('separates a beat from the one that waits for it', () => {
    const first = event('first', [{ kind: 'chapter', cityId: 'riverbend' }])
    const second = event('second', [
      { kind: 'chapter', cityId: 'riverbend' },
      { kind: 'eventDone', eventId: 'first' },
    ])
    expect(canBothFire(first, second)).toBe(false)
    expect(canBothFire(second, first)).toBe(false)
    // Unless the first can happen again, in which case they really can collide.
    expect(canBothFire({ ...first, repeatable: true }, second)).toBe(true)
  })

  it('separates two beats that ask opposite things about a third', () => {
    const before = event('a', [{ kind: 'eventDone', eventId: 'x', done: false }])
    const after = event('b', [{ kind: 'eventDone', eventId: 'x' }])
    expect(canBothFire(before, after)).toBe(false)
  })
})

/**
 * A beat that carries you somewhere is still holding the screen when you walk
 * in, so it and any beat for walking in must be told apart — by what it has
 * done on the way, down whichever branch it went.
 */
describe('a beat that carries you into somewhere', () => {
  const carry = (actions: EventAction[], conditions: GameEvent['conditions'] = []): GameEvent => ({
    id: 'carry',
    about: 'test',
    trigger: { kind: 'talkTo', characterId: 'dana' },
    conditions,
    actions,
  })
  const arrival = (conditions: GameEvent['conditions']): GameEvent => ({
    id: 'arrival',
    about: 'test',
    trigger: { kind: 'enterArea', areaId: 'depot' },
    conditions,
    actions: [{ kind: 'dialogue', lines: ['Here.'] }],
  })

  it('clashes with a beat for walking in that could be ready as it arrives', () => {
    const into = carry([{ kind: 'teleport', areaId: 'depot', col: 6, row: 2 }])
    expect(arrivalClashes([into, arrival([])])).toHaveLength(1)
  })

  it('is told apart by a flag it sets on the way, down the branch that moves you', () => {
    const into = carry([
      {
        kind: 'choice',
        prompt: 'Come?',
        options: [
          { label: 'Yes', then: [{ kind: 'setFlag', flag: 'metDana' }, { kind: 'teleport', areaId: 'depot', col: 6, row: 2 }] },
          { label: 'No', then: [] },
        ],
      },
    ])
    expect(arrivalsDuring(into)).toHaveLength(1)
    expect(arrivalClashes([into, arrival([{ kind: 'flag', flag: 'metDana', set: false }])])).toEqual([])
    // Set on the other branch only, it tells nothing apart.
    const wrongWay = carry([
      {
        kind: 'choice',
        prompt: 'Come?',
        options: [
          { label: 'Yes', then: [{ kind: 'teleport', areaId: 'depot', col: 6, row: 2 }] },
          { label: 'No', then: [{ kind: 'setFlag', flag: 'metDana' }] },
        ],
      },
    ])
    expect(arrivalClashes([wrongWay, arrival([{ kind: 'flag', flag: 'metDana', set: false }])])).toHaveLength(1)
  })

  it('is told apart from a beat that waits for it, since it is not over yet', () => {
    const into = carry([{ kind: 'ride', areaId: 'depot', col: 6, row: 2 }])
    expect(arrivalClashes([into, arrival([{ kind: 'eventDone', eventId: 'carry' }])])).toEqual([])
    // A ride costs the hour, so the hour it started in tells nothing apart.
    const hourly = carry([{ kind: 'ride', areaId: 'depot', col: 6, row: 2 }], [{ kind: 'period', period: 'morning' }])
    expect(arrivalClashes([hourly, arrival([{ kind: 'period', period: 'afternoon' }])])).toHaveLength(1)
  })
})

describe('picking the event for a moment', () => {
  it('matches a trigger exactly, not loosely', () => {
    const trigger = { kind: 'talkTo', characterId: 'marcus' } as const
    expect(eventFor([SAY_HELLO], trigger, at())).toBe(SAY_HELLO)
    expect(eventFor([SAY_HELLO], { kind: 'talkTo', characterId: 'dana' }, at())).toBeUndefined()
    expect(eventFor([SAY_HELLO], { kind: 'interact', poiId: 'marcus' }, at())).toBeUndefined()
  })

  it('distinguishes one tile from another', () => {
    const here: GameEvent = { ...SAY_HELLO, trigger: { kind: 'standOn', areaId: 'basin', col: 4, row: 4 } }
    expect(eventFor([here], { kind: 'standOn', areaId: 'basin', col: 4, row: 4 }, at())).toBe(here)
    expect(eventFor([here], { kind: 'standOn', areaId: 'basin', col: 4, row: 5 }, at())).toBeUndefined()
    expect(eventFor([here], { kind: 'standOn', areaId: 'seventh', col: 4, row: 4 }, at())).toBeUndefined()
  })

  it('does not fire a one-time beat twice', () => {
    const trigger = { kind: 'talkTo', characterId: 'marcus' } as const
    const after = at({ completedEventIds: ['say-hello'] })
    expect(eventFor([SAY_HELLO], trigger, after)).toBeUndefined()
    expect(eventFor([{ ...SAY_HELLO, repeatable: true }], trigger, after)).toBeDefined()
  })

  it('holds back an event whose conditions are not met', () => {
    const gated: GameEvent = { ...SAY_HELLO, conditions: [{ kind: 'period', period: 'night' }] }
    const trigger = { kind: 'talkTo', characterId: 'marcus' } as const
    expect(eventFor([gated], trigger, at({ period: 'morning' }))).toBeUndefined()
    expect(eventFor([gated], trigger, at({ period: 'night' }))).toBe(gated)
  })

  it('requires every condition, not any of them', () => {
    const both: GameEvent = {
      ...SAY_HELLO,
      conditions: [
        { kind: 'period', period: 'night' },
        { kind: 'cashAtLeast', amount: 1000 },
      ],
    }
    const trigger = { kind: 'talkTo', characterId: 'marcus' } as const
    expect(eventFor([both], trigger, at({ period: 'night', cash: 10 }))).toBeUndefined()
    expect(eventFor([both], trigger, at({ period: 'night', cash: 1000 }))).toBe(both)
  })
})

describe('the events in the game', () => {
  it('gives every event an id of its own', () => {
    const ids = EVENTS.map((event) => event.id)
    expect(ids).toEqual([...new Set(ids)])
  })

  it('says what every event is for', () => {
    for (const event of EVENTS) {
      expect(event.about.length, `${event.id} does not say what it is for`).toBeGreaterThan(10)
      expect(event.actions.length, `${event.id} does nothing`).toBeGreaterThan(0)
    }
  })

  it('triggers on characters who exist', () => {
    for (const event of EVENTS) {
      if (event.trigger.kind !== 'talkTo') continue
      const character = CHARACTERS[event.trigger.characterId]
      expect(character, `${event.id} waits for "${event.trigger.characterId}", who does not exist`).toBeDefined()
      expect(
        character.overworld,
        `${event.id} waits to talk to ${event.trigger.characterId}, who is never out in the town`,
      ).toBeDefined()
    }
  })

  it('names characters and tables that exist in its actions', () => {
    for (const event of EVENTS) {
      for (const action of everyAction(event.actions)) {
        if (action.kind === 'dialogue' && action.speaker) {
          // A speaker is a character id or a plain name; an id that nearly
          // matches one is the bug worth catching.
          const looksLikeId = action.speaker === action.speaker.toLowerCase()
          if (looksLikeId) {
            expect(CHARACTERS[action.speaker], `${event.id} is spoken by nobody`).toBeDefined()
          }
        }
        if (action.kind === 'startTable' || action.kind === 'unlockTable') {
          expect(TABLES[action.tableId], `${event.id} points at table "${action.tableId}"`).toBeDefined()
        }
        if (action.kind === 'moveNpc') {
          expect(CHARACTERS[action.characterId], `${event.id} moves nobody`).toBeDefined()
        }
      }
    }
  })

  it('never leaves two events fighting over the same moment', () => {
    // Two events that could both fire would be resolved by declaration order,
    // which is not a decision anybody made on purpose.
    for (const event of EVENTS) {
      const rivals = eventsSharing(EVENTS, event.trigger).filter((other) => other.id !== event.id)
      for (const rival of rivals) {
        const exclusive = !canBothFire(event, rival)
        expect(
          exclusive,
          `${event.id} and ${rival.id} share a trigger and could both fire`,
        ).toBe(true)
      }
    }
  })

  it('makes sense down every branch: who it names, where it walks people, every question with a way on', () => {
    const world: StoryWorld = {
      characters: CHARACTERS,
      areas: AREAS,
      tables: TABLES,
      cityIds: Object.keys(CITIES),
      itemIds: allShopItems().map((item) => item.id),
      lessonIds: Object.keys(LESSONS),
      sponsorIds: Object.keys(SPONSORS),
      eventIds: EVENTS.map((e) => e.id),
    }
    for (const event of EVENTS) {
      expect(actionProblems(event, world), event.id).toEqual([])
    }
  })

  it('never carries the player into somewhere another beat is waiting for them to walk into', () => {
    const clashes = arrivalClashes(EVENTS).map(([a, b]) => `${a.id} carries you to where ${b.id} fires`)
    expect(clashes).toEqual([])
  })

  it('remembers every choice: a flag an answer sets is read by some other beat or person', () => {
    // A choice whose flag nobody reads changed nothing but the next line.
    const read = new Map<StoryFlag, Set<string>>()
    const note = (flag: StoryFlag, by: string) => read.set(flag, new Set([...(read.get(flag) ?? []), by]))
    for (const event of EVENTS) {
      for (const c of everyCondition(event)) if (c.kind === 'flag') note(c.flag, event.id)
    }
    for (const [id, character] of Object.entries(CHARACTERS)) {
      for (const chapter of character.overworld?.chapters ?? []) {
        for (const c of chapter.when) if (c.kind === 'flag') note(c.flag, `character:${id}`)
      }
    }
    for (const { area } of Object.values(AREAS)) for (const poi of area.pois) if (poi.requiresFlag) note(poi.requiresFlag as StoryFlag, `poi:${poi.id}`)

    let choices = 0
    for (const event of EVENTS) {
      for (const action of everyAction(event.actions)) {
        if (action.kind !== 'choice') continue
        choices++
        for (const option of action.options) {
          for (const set of everyAction(option.then)) {
            if (set.kind !== 'setFlag' && set.kind !== 'clearFlag') continue
            const readers = [...(read.get(set.flag) ?? [])].filter((by) => by !== event.id)
            expect(readers.length, `${event.id}: “${option.label}” sets ${set.flag}, which nothing else reads`).toBeGreaterThan(0)
          }
        }
      }
    }
    expect(choices, 'no beat lets the player decide anything').toBeGreaterThan(0)
    // And every flag the game knows is about something.
    expect(STORY_FLAG_IDS.length).toBeGreaterThan(4)
  })

  it('ends the first poker night at a table rather than nowhere', () => {
    const night = EVENTS.find((event) => event.id === 'poker-night')
    expect(night, 'the game that opens the campaign is gone').toBeDefined()
    expect(night!.actions.some((a) => a.kind === 'startPokerNight')).toBe(true)
    expect(night!.repeatable ?? false, 'the opening night can be played again').toBe(false)
  })
})

/**
 * The shape of the run, as docs/STORYBOARD.md sets it out: every town says what
 * it costs and notices when you have outgrown it, and somebody you know is in
 * every one of them.
 */
describe('the run is carried by people', () => {
  const townOf = (areaId: string) => AREAS[areaId]?.cityId
  const townsOf = (id: string) => new Set(allSchedules(CHARACTERS[id]).flat().map((e) => townOf(e.areaId)))

  it('greets the player in every town with what it costs and what moves them on', () => {
    for (const town of CITY_ORDER) {
      const arrival = EVENTS.find((e) => e.trigger.kind === 'enterArea' && townOf(e.trigger.areaId) === town)
      expect(arrival, `nothing happens when you arrive in ${CITIES[town].name}`).toBeDefined()
    }
  })

  it('notices when the player has the bankroll for the next town', () => {
    // Tied to the gate itself, so moving a gate without moving the send-off fails.
    for (let i = 0; i + 1 < CITY_ORDER.length; i++) {
      const town = CITY_ORDER[i]
      const gate = CITIES[CITY_ORDER[i + 1]].unlockCash
      const sendOff = EVENTS.find((e) => {
        const conditions = e.conditions ?? []
        return (
          conditions.some((c) => c.kind === 'chapter' && [c.cityId].flat().includes(town)) &&
          conditions.some((c) => c.kind === 'cashAtLeast' && c.amount === gate)
        )
      })
      expect(sendOff, `nobody in ${CITIES[town].name} notices when you reach $${gate.toLocaleString()}`).toBeDefined()
    }
  })

  it('puts somebody who follows you up the ladder in every town', () => {
    const recurring = Object.keys(CHARACTERS).filter((id) => townsOf(id).size >= 4)
    expect(recurring.length, 'nobody follows the player from town to town').toBeGreaterThanOrEqual(2)
    for (const town of TOWN_ORDER) {
      const here = recurring.filter((id) => townsOf(id).has(town))
      expect(here.length, `nobody the player knows is ever in ${CITIES[town].name}`).toBeGreaterThan(0)
    }
  })

  it('only writes somebody a beat for a chapter in which they can be found', () => {
    // The chapter is how far the run has got, not where you are standing:
    // Marcus stays in Basin while you are up in Riverbend, and the kitchen table
    // he deals there when you go broke is a beat for the Riverbend chapter. What
    // is wrong is a beat for a chapter in which the person is nowhere at all.
    for (const event of EVENTS) {
      if (event.trigger.kind !== 'talkTo') continue
      const chapter = event.conditions?.find((c) => c.kind === 'chapter')
      if (chapter?.kind !== 'chapter') continue
      const id = event.trigger.characterId
      for (const town of [chapter.cityId].flat()) {
        const { schedule } = scheduleFor(CHARACTERS[id], storyStateFor(event, town))
        expect(schedule.length, `${event.id} waits for ${id} in the ${town} chapter, where they are nowhere`).toBeGreaterThan(0)
      }
    }
  })

  it('tells the browser suite which beats a seeded save has already seen', () => {
    // A beat that fires on walking in or using a fixture would otherwise open
    // over the first step of every scenario seeded past it.
    const suite = readFileSync(new URL('../../tests/ui.mjs', import.meta.url), 'utf8')
    for (const event of EVENTS) {
      if (event.trigger.kind !== 'enterArea' && event.trigger.kind !== 'interact') continue
      expect(suite.includes(`'${event.id}'`), `tests/ui.mjs STORY_SEEN does not list ${event.id}`).toBe(true)
    }
  })
})

/**
 * Losing is part of the story, not a dead end: every setback is met by
 * somebody, and every one of them leaves a way on. docs/STORYBOARD.md, "When it
 * goes wrong".
 */
describe('losing is part of the story', () => {
  const TIMES = ['morning', 'afternoon', 'evening', 'night'] as const
  const marcus = CHARACTERS.marcus
  const upTo = (town: CityId) => TOWN_ORDER.slice(0, TOWN_ORDER.indexOf(town) + 1)

  /** Talks to somebody until a beat starts the kitchen table, as a player would. */
  function talkUntilTheGame(state: GameState): boolean {
    let s = state
    for (let i = 0; i < 4; i++) {
      const event = eventFor(EVENTS, { kind: 'talkTo', characterId: 'marcus' }, s)
      if (!event) return false
      // Any answer that deals you in will do: the player can always pick it.
      if (everyAction(event.actions).some((a) => a.kind === 'startPokerNight')) return true
      if (event.repeatable) return false
      s = { ...s, completedEventIds: [...s.completedEventIds, event.id] }
    }
    return false
  }

  /** Whether, at some hour Marcus can be found, talking to him gets you dealt back in. */
  function dealtBackIn(state: GameState): boolean {
    const { schedule } = scheduleFor(marcus, state)
    return TIMES.some((period) => schedule.some((e) => e.period === period) && talkUntilTheGame({ ...state, period }))
  }

  it('never strands a broke player: the kitchen table is open in every chapter', () => {
    const broke = (town: CityId, extra: Partial<GameState> = {}) =>
      at({
        cash: 0,
        day: 12,
        unlockedCityIds: upTo(town),
        flags: { ...initialState().flags, wonPokerNight: true },
        ...extra,
      })
    for (const town of TOWN_ORDER) {
      expect(dealtBackIn(broke(town)), `broke in the ${town} chapter, and Marcus will not deal`).toBe(true)
    }
    const named = ['nadia-names-the-match']
    expect(dealtBackIn(broke('portoLumina', { completedEventIds: named })), 'broke at the rail').toBe(true)
    expect(
      dealtBackIn(broke('portoLumina', { completedEventIds: named, finaleRematchDay: 15, record: { busted: 1, challengeLost: 1, sponsors: {} } })),
      'broke after losing the match',
    ).toBe(true)
    expect(
      dealtBackIn(broke('portoLumina', { completedEventIds: named, flags: { ...initialState().flags, wonPokerNight: true, beatFinalRival: true, hasPenthouse: true } })),
      'broke in the penthouse',
    ).toBe(true)
    // Losing the very first night and walking out is not the end either.
    const walkedOut = at({ cash: 0, completedEventIds: ['poker-night'] })
    expect(dealtBackIn(walkedOut), 'walked out of the first night and cannot get back in').toBe(true)
  })

  it('can always get a broke player home, and pass the hours there for free', () => {
    // Marcus keeps hours; a player with nothing has to be able to reach them.
    expect(CITIES.apartment.travelCost).toBe(0)
    expect(CITIES.apartment.stops?.length ?? 0).toBeGreaterThan(0)
  })

  it('gives every sponsor a collector with a face and something to say when they catch you', () => {
    for (const sponsor of Object.values(SPONSORS)) {
      const collector = CHARACTERS[sponsor.collector]
      expect(collector, `${sponsor.name} sends nobody`).toBeDefined()
      const hunted = (caught: number) =>
        at({
          day: 9,
          cityId: 'riverbend',
          huntedInCityId: 'riverbend',
          debts: [{ id: 'd', sponsorId: sponsor.id, sponsorName: sponsor.name, principal: 1, owed: 2, dueOnDay: 5, cityId: 'riverbend' }],
          record: { busted: 0, challengeLost: 0, sponsors: { [sponsor.id]: { staked: 1, repaid: 0, missed: 1, caught } } },
        })
      for (const times of [0, 1, 4]) {
        const beat = eventFor(EVENTS, { kind: 'caught' }, hunted(times))
        const speaker = beat?.actions.find((a) => a.kind === 'dialogue')
        expect(speaker?.kind === 'dialogue' && speaker.speaker, `${sponsor.name}'s collector is silent the ${times + 1}th time`).toBe(sponsor.collector)
      }
    }
  })

  it('has every sponsor notice you owing, late, square on time and square late', () => {
    for (const sponsor of Object.values(SPONSORS)) {
      const debt = (dueOnDay: number) => [{ id: 'd', sponsorId: sponsor.id, sponsorName: sponsor.name, principal: 1, owed: 2, dueOnDay, cityId: 'riverbend' as const }]
      const record = (missed: number) => ({ busted: 0, challengeLost: 0, sponsors: { [sponsor.id]: { staked: 1, repaid: 1, missed, caught: missed } } })
      const states: Array<[string, GameState]> = [
        ['owing', at({ day: 3, debts: debt(5) })],
        ['late', at({ day: 7, debts: debt(5) })],
        ['square', at({ day: 7, record: record(0) })],
        ['square after being late', at({ day: 7, record: record(1) })],
      ]
      const seen = new Set<string>()
      for (const [what, state] of states) {
        const beat = eventFor(EVENTS, { kind: 'interact', poiId: sponsor.id }, state)
        expect(beat, `${sponsor.name} says nothing when you are ${what}`).toBeDefined()
        seen.add(beat!.id)
      }
      expect(seen.size, `${sponsor.name} says the same thing whatever you did`).toBe(states.length)
    }
  })

  it('meets a lost match with the people who followed you up, and the rematch', () => {
    const lost = (rematch: boolean) =>
      at({
        cash: 5000,
        day: 20,
        period: 'evening',
        unlockedCityIds: upTo('portoLumina'),
        finaleRematchDay: rematch ? 18 : 25,
        flags: { ...initialState().flags, wonPokerNight: true },
        completedEventIds: ['nadia-names-the-match', 'marcus-at-the-rail', 'dana-reveal', 'hal-on-the-eve', 'kit-lumina'],
        record: { busted: 0, challengeLost: 1, sponsors: {} },
      })
    for (const who of ['marcus', 'dana', 'hal', 'kit']) {
      const beat = eventFor(EVENTS, { kind: 'talkTo', characterId: who }, lost(false))
      expect(beat?.id, `${who} has nothing to say about the lost match`).toMatch(/loss|told-you/)
    }
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'nadia' }, lost(false))?.id).toBe('nadia-makes-you-wait')
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'nadia' }, lost(true))?.id).toBe('nadia-rematch')
    const ready = { ...lost(true), cash: 130000, completedEventIds: [...lost(true).completedEventIds, 'marcus-after-the-loss'] }
    expect(eventFor(EVENTS, { kind: 'talkTo', characterId: 'marcus' }, ready)?.id).toBe('marcus-rematch-night')
  })

  it('pays off Kit’s warning about Wen either way', () => {
    const lost = (wen: boolean) =>
      at({
        day: 20,
        unlockedCityIds: upTo('portoLumina'),
        finaleRematchDay: 25,
        completedEventIds: ['kit-lumina'],
        record: { busted: 0, challengeLost: 1, sponsors: {} },
        debts: wen ? [{ id: 'w', sponsorId: 'wen', sponsorName: 'Madame Wen', principal: 1, owed: 2, dueOnDay: 22, cityId: 'portoLumina' }] : [],
      })
    expect(eventFor(EVENTS, { kind: 'talkTo', characterId: 'kit' }, lost(false))?.id).toBe('kit-after-the-loss')
    expect(eventFor(EVENTS, { kind: 'talkTo', characterId: 'kit' }, lost(true))?.id).toBe('kit-told-you')
  })

  it('pays off the rent: the receipt is under the door when you come home', () => {
    const home = at({ unlockedCityIds: upTo('riverbend'), flags: { ...initialState().flags, wonPokerNight: true } })
    expect(eventFor(EVENTS, { kind: 'enterArea', areaId: 'home' }, home)?.id).toBe('rent-receipt')
    expect(eventFor(EVENTS, { kind: 'interact', poiId: 'apartment-window' }, at({ day: 10 }))?.id).toBe('rent-day')
  })
})
