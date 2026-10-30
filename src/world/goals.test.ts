import { describe, expect, it } from 'vitest'
import { AREAS, CITIES } from './cities'
import { CHARACTERS } from './characters'
import { TABLES } from './content'
import { CASINO_GOALS, GOAL_ORDER } from './goals'
import { bossBlocking, goalStatus, tableAccess, travelOptions } from '../game/progression'
import { initialState, recordBossBeaten, recordCasinoSession, TOWN_ORDER, type GameState } from '../game/state'
import type { SkillTier } from '../engine/types'

const TIERS: SkillTier[] = ['novice', 'amateur', 'competent', 'sharp', 'elite']

describe('casino goals', () => {
  it('gives every town but the last a goal, in climbing order', () => {
    const towns = TOWN_ORDER.filter((id) => id !== 'apartment' && id !== 'portoLumina')
    expect(GOAL_ORDER.map((g) => g.cityId)).toEqual(towns)
  })

  it('makes each boss a better player than the last, and the win target and stake bigger', () => {
    // Rule 2: harder is skill, never luck. Bosses climb the skill tiers one step per town.
    let tier = -1
    let target = 0
    let stake = 0
    for (const goal of GOAL_ORDER) {
      const boss = CHARACTERS[goal.bossId]
      expect(boss, `${goal.cityId}: boss ${goal.bossId} is not a character`).toBeDefined()
      const rank = TIERS.indexOf(boss.seat!.skillTier)
      expect(rank, `${boss.name} is no better than the boss before`).toBeGreaterThan(tier)
      tier = rank
      expect(goal.winTarget, `${goal.cityId}: win target does not climb`).toBeGreaterThan(target)
      target = goal.winTarget
      const table = TABLES[goal.tableId]
      expect(table.buyIn, `${goal.cityId}: boss stake does not climb`).toBeGreaterThan(stake)
      stake = table.buyIn
    }
  })

  it('puts every boss one on one at a table that says whose it is', () => {
    for (const goal of GOAL_ORDER) {
      const table = TABLES[goal.tableId]
      expect(table.bossOf).toBe(goal.cityId)
      expect(table.opponents).toEqual([goal.bossId])
    }
  })

  it('opens each private room off the casino floor, and back, behind a shut door', () => {
    for (const goal of GOAL_ORDER) {
      const city = CITIES[goal.cityId]
      const floor = AREAS[goal.floorAreaId].area
      const room = AREAS[goal.roomAreaId].area
      expect(AREAS[goal.roomAreaId].cityId).toBe(goal.cityId)
      const door = floor.exits.find((e) => e.toAreaId === goal.roomAreaId)
      expect(door?.privateRoomOf, `${city.name}: the door to the room is not marked as earned`).toBe(goal.cityId)
      const back = room.exits.find((e) => e.toAreaId === goal.floorAreaId)
      expect(back, `${city.name}: no way back out of the room`).toBeDefined()
      expect(back!.toCol).toBe(door!.col)
      expect(back!.toRow).toBe(door!.row - 1)
      expect(door!.toCol).toBe(back!.col)
      expect(door!.toRow).toBe(back!.row - 1)
      const dealer = room.pois.find((p) => p.action.kind === 'table' && p.action.tableId === goal.tableId)
      expect(dealer, `${city.name}: nobody deals the boss's table`).toBeDefined()
    }
  })
})

describe('the gates', () => {
  const base = (): GameState => ({ ...initialState(), cash: 1_000_000 })

  it('keeps the bus from the next town until the boss is beaten', () => {
    let state = { ...base(), unlockedCityIds: ['apartment', 'silverCreek'] as GameState['unlockedCityIds'] }
    const riverbend = () => travelOptions(state).find((o) => o.cityId === 'riverbend')!
    expect(riverbend().locked).toBe(true)
    expect(riverbend().lockReason).toMatch(/boss/i)
    expect(bossBlocking(state, 'riverbend')).toBe('lou')
    state = recordBossBeaten(state, 'silverCreek')
    expect(riverbend().locked).toBe(false)
    expect(bossBlocking(state, 'riverbend')).toBeNull()
  })

  it('does not lock a town you have already been to', () => {
    const state = { ...base(), unlockedCityIds: ['apartment', 'silverCreek', 'riverbend'] as GameState['unlockedCityIds'] }
    expect(travelOptions(state).find((o) => o.cityId === 'riverbend')!.locked).toBe(false)
  })

  it('opens the room once the target is won, and keeps it open after a bad night', () => {
    let state = base()
    const goal = CASINO_GOALS.silverCreek
    state = recordCasinoSession(state, 'silverCreek', goal.winTarget - 1, goal.winTarget)
    expect(state.casino.roomOpen).toEqual([])
    expect(goalStatus(state, 'silverCreek')!.phase).toBe('win')
    state = recordCasinoSession(state, 'silverCreek', 1, goal.winTarget)
    expect(state.casino.roomOpen).toEqual(['silverCreek'])
    expect(goalStatus(state, 'silverCreek')!.phase).toBe('boss')
    state = recordCasinoSession(state, 'silverCreek', -300, goal.winTarget)
    expect(state.casino.roomOpen).toEqual(['silverCreek'])
  })

  it('will not seat you across from a boss whose room is shut', () => {
    const table = TABLES.silvercreek_boss ?? TABLES['silvercreek-boss']
    expect(tableAccess(base(), table).allowed).toBe(false)
    const open = recordCasinoSession(base(), 'silverCreek', 10_000, CASINO_GOALS.silverCreek.winTarget)
    expect(tableAccess(open, table).allowed).toBe(true)
  })
})
