import { describe, expect, it } from 'vitest'
import { NEXT_STEPS, nextStep } from './nextSteps'
import { EVENTS, canBothFire, type GameEvent } from './events'
import { initialState, type GameState } from '../game/state'

const at = (flags: Partial<GameState['flags']>, done: string[] = [], extra: Partial<GameState> = {}): GameState => ({
  ...initialState(),
  flags: { ...initialState().flags, ...flags },
  completedEventIds: done,
  ...extra,
})

describe('the next step on the Jobs page', () => {
  it('says where to go from the first tick of a new game', () => {
    expect(nextStep(initialState())).toBe('Go outside. Someone is looking for you.')
  })

  it('follows the opening through to the bus out of town', () => {
    expect(nextStep(at({ metDana: true, danaAtTheStop: true }))).toMatch(/Dana is waiting at the bus stop/)
    expect(nextStep(at({ metDana: true }))).toMatch(/middle door/)
    expect(nextStep(at({ metDana: true }, ['poker-night']))).toMatch(/deal you back in/)
    expect(nextStep(at({ metDana: true, wonPokerNight: true, marcusSeesYouOff: true }, ['poker-night']))).toMatch(/Silver Creek/)
  })

  it('stands aside once a town has a goal to show', () => {
    const inTown = at({ metDana: true, wonPokerNight: true }, ['poker-night'], { unlockedCityIds: ['apartment', 'silverCreek'] })
    expect(nextStep(inTown)).toBeNull()
  })

  it('never has two steps ready at once, and names only beats that exist', () => {
    const asEvent = (s: (typeof NEXT_STEPS)[number]): GameEvent => ({
      id: `step-${s.id}`,
      about: s.line,
      trigger: { kind: 'talkTo', characterId: 'marcus' },
      conditions: s.when,
      repeatable: true,
      actions: [],
    })
    for (const a of NEXT_STEPS) {
      for (const c of a.when) if (c.kind === 'eventDone') expect(EVENTS.some((e) => e.id === c.eventId), c.eventId).toBe(true)
      for (const b of NEXT_STEPS) if (a !== b) expect(canBothFire(asEvent(a), asEvent(b)), `${a.id} and ${b.id}`).toBe(false)
    }
  })
})
