import { describe, expect, it } from 'vitest'
import { edgeTile, firstHop } from './wayfinding'
import { AREAS, CITIES } from './content'
import { CASINO_GOALS } from './goals'
import { NEXT_STEPS, nextHeading } from './nextSteps'
import { TOWN_ORDER, initialState, type GameState } from '../game/state'

describe('the way on foot', () => {
  it('starts with the door out of the flat, and the street toward the depot', () => {
    expect(firstHop('home', 'basin')).toEqual({ kind: 'door', col: 6, row: 9 })
    expect(firstHop('home', 'marcus-house')).toEqual({ kind: 'door', col: 6, row: 9 })
    expect(firstHop('basin', 'depot')).toEqual({ kind: 'edge', edge: 'east' })
    expect(firstHop('eastgate', 'marcus-house')).toEqual({ kind: 'door', col: 11, row: 3 })
    expect(firstHop('marcus-house', 'marcus-house')).toEqual({ kind: 'here' })
  })

  it('does not walk between towns, or through a door that is shut', () => {
    expect(firstHop('basin', 'sc-floor')).toBeNull()
    const goal = CASINO_GOALS.silverCreek
    expect(firstHop(goal.floorAreaId, goal.roomAreaId, (exit) => !exit.privateRoomOf)).toBeNull()
    expect(firstHop(goal.floorAreaId, goal.roomAreaId)).not.toBeNull()
  })

  it('steps off a side of the map on the open tile nearest you', () => {
    const map = [
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 0],
    ]
    // 1 is a wall in the tile ids; the east edge is open on rows 0 and 2.
    const open = edgeTile(map, 'east', { col: 0, row: 1 })
    expect(open?.col).toBe(2)
    expect([0, 2]).toContain(open?.row)
    expect(edgeTile(map, 'west', { col: 2, row: 0 })).toEqual({ col: 0, row: 2 })
  })
})

const at = (extra: Partial<GameState>, flags: Partial<GameState['flags']> = {}): GameState => ({
  ...initialState(),
  ...extra,
  flags: { ...initialState().flags, ...flags },
})

describe('what the overworld points at', () => {
  it('sends a new game out of the door, and on to the first poker night', () => {
    const fresh = initialState()
    expect(nextHeading(fresh)?.goTo?.areaId).toBe('basin')
    const toGame = nextHeading(at({}, { metDana: true }))
    expect(toGame?.hud).toMatch(/poker game/)
    expect(toGame?.goTo).toEqual({ areaId: 'marcus-house', characterId: 'marcus' })
  })

  it('every step of the opening can be walked to from the flat', () => {
    for (const step of NEXT_STEPS) {
      expect(AREAS[step.goTo.areaId], step.id).toBeDefined()
      expect(firstHop('home', step.goTo.areaId), step.id).not.toBeNull()
      expect(step.hud.length, step.id).toBeLessThanOrEqual(32)
    }
  })

  it('leads through every casino town with nothing written for it: the floor, the room, the bus', () => {
    const played = { completedEventIds: ['poker-night'] }
    const flags = { metDana: true, wonPokerNight: true }
    for (const goal of Object.values(CASINO_GOALS)) {
      const from = CITIES[goal.cityId].arrivalAreaId ?? CITIES[goal.cityId].entryAreaId
      const base = initialState().casino
      const win = nextHeading(at({ ...played, cityId: goal.cityId }, flags))
      expect(win?.goTo?.areaId, goal.cityId).toBe(goal.floorAreaId)
      expect(firstHop(from, goal.floorAreaId), `${goal.cityId}: to the floor`).not.toBeNull()

      const boss = nextHeading(at({ ...played, cityId: goal.cityId, casino: { ...base, roomOpen: [goal.cityId] } }, flags))
      expect(boss?.goTo?.areaId, goal.cityId).toBe(goal.roomAreaId)
      expect(boss?.goTo?.poiId, `${goal.cityId}: the boss's dealer`).toBeDefined()
      expect(firstHop(goal.floorAreaId, goal.roomAreaId), `${goal.cityId}: to the room`).not.toBeNull()

      const done = { ...base, roomOpen: [goal.cityId], bossBeaten: [goal.cityId] }
      const onward = nextHeading(at({ ...played, cityId: goal.cityId, casino: done }, flags))
      expect(onward?.hud, goal.cityId).toContain(CITIES[TOWN_ORDER[TOWN_ORDER.indexOf(goal.cityId) + 1]].name)
      expect(onward?.goTo, `${goal.cityId}: a bus stop`).not.toBeNull()
      expect(firstHop(goal.roomAreaId, onward!.goTo!.areaId), `${goal.cityId}: back to the bus`).not.toBeNull()
    }
  })
})
