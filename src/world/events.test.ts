import { describe, expect, it } from 'vitest'
import { EVENTS, canBothFire, conditionHolds, eventFor, eventsSharing, type GameEvent } from './events'
import { CHARACTERS } from './characters'
import { TABLES } from './content'
import { initialState, type GameState } from '../game/state'

const at = (overrides: Partial<GameState> = {}): GameState => ({ ...initialState(), ...overrides })

const SAY_HELLO: GameEvent = {
  id: 'say-hello',
  about: 'test',
  trigger: { kind: 'talkTo', characterId: 'marcus' },
  actions: [{ kind: 'dialogue', lines: ['Hello.'] }],
}

describe('conditions', () => {
  it('reads a flag both ways round', () => {
    const won = at({ flags: { wonPokerNight: true, beatFinalRival: false, hasPenthouse: false } })
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
      for (const action of event.actions) {
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

  it('ends the first poker night at a table rather than nowhere', () => {
    const night = EVENTS.find((event) => event.id === 'poker-night')
    expect(night, 'the game that opens the campaign is gone').toBeDefined()
    expect(night!.actions.some((a) => a.kind === 'startPokerNight')).toBe(true)
    expect(night!.repeatable ?? false, 'the opening night can be played again').toBe(false)
  })
})
