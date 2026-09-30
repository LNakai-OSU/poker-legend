import { describe, expect, it } from 'vitest'
import {
  advanceDay,
  daysUntilDue,
  initialState,
  overdueDebts,
  payDebt,
  takeStake,
  totalOwed,
  travelTo,
  type GameState,
} from './state'
import { dressCodeLevel, missionStatus, tableAccess, travelCostTo, travelDiscount } from './progression'
import { TABLES } from '../world/content'

const CASS = { id: 'cass', name: 'Cass' }

function staked(overrides: Partial<GameState> = {}): GameState {
  const base = { ...initialState(), cityId: 'riverbend' as const, cash: 500, ...overrides }
  return takeStake(base, CASS, 1000, 0.25, 3)
}

describe('debt', () => {
  it('hands over the principal and records what is owed back', () => {
    const state = staked()
    expect(state.cash).toBe(1500)
    expect(totalOwed(state)).toBe(1250)
    expect(daysUntilDue(state)).toBe(3)
  })

  it('does not send collectors before the deadline', () => {
    let state = staked()
    state = advanceDay(state, 3)
    expect(overdueDebts(state)).toHaveLength(0)
    expect(state.huntedInCityId).toBeNull()
  })

  it('sends collectors once the deadline passes', () => {
    let state = staked()
    state = advanceDay(state, 4)
    expect(overdueDebts(state)).toHaveLength(1)
    expect(state.huntedInCityId).toBe('riverbend')
  })

  it('calls off the hunt when the debt is paid', () => {
    let state = staked({ cash: 5000 })
    state = advanceDay(state, 4)
    expect(state.huntedInCityId).toBe('riverbend')
    state = payDebt(state, state.debts[0].id)
    expect(state.debts).toHaveLength(0)
    expect(state.huntedInCityId).toBeNull()
  })

  it('refuses a repayment the player cannot cover', () => {
    const state = staked({ cash: 0 })
    const broke = { ...state, cash: 10 }
    expect(payDebt(broke, broke.debts[0].id)).toBe(broke)
  })

  it('keeps the hunt on while any other debt is still overdue', () => {
    let state = staked({ cash: 20000 })
    state = takeStake(state, { id: 'emeka', name: 'Mr. Emeka' }, 2000, 0.3, 3)
    state = advanceDay(state, 4)
    expect(state.huntedInCityId).not.toBeNull()
    state = payDebt(state, state.debts[0].id)
    expect(state.debts).toHaveLength(1)
    expect(state.huntedInCityId).not.toBeNull()
  })

  it('shakes collectors by leaving town, and buys a day of breathing room', () => {
    let state = staked()
    state = advanceDay(state, 4)
    expect(state.huntedInCityId).toBe('riverbend')

    state = travelTo(state, 'crescentHarbor')
    expect(state.cityId).toBe('crescentHarbor')
    expect(state.huntedInCityId).toBeNull()

    // They pick the trail back up once another day burns, so fleeing delays
    // the problem rather than solving it.
    state = advanceDay(state)
    expect(state.huntedInCityId).toBe('crescentHarbor')
  })
})

describe('items', () => {
  it('uses the best dress code and travel discount owned', () => {
    const state: GameState = {
      ...initialState(),
      ownedItemIds: ['work-jacket', 'tailored-suit', 'bicycle', 'sedan'],
    }
    expect(dressCodeLevel(state)).toBe(2)
    expect(travelDiscount(state)).toBe(0.5)
  })

  it('discounts travel cost with a vehicle', () => {
    const broke = { ...initialState(), cash: 10000 }
    const full = travelCostTo(broke, 'palmCay')
    const driving = travelCostTo({ ...broke, ownedItemIds: ['sedan'] }, 'palmCay')
    expect(driving).toBe(Math.round(full * 0.5))
  })
})

describe('table access', () => {
  it('turns you away from a high room without the clothes', () => {
    const state = { ...initialState(), cash: 1_000_000 }
    const access = tableAccess(state, TABLES['mesa-highroller'])
    expect(access.allowed).toBe(false)
    expect(access.reason).toMatch(/dress code/i)
  })

  it('lets you in once you are dressed for it', () => {
    const state = { ...initialState(), cash: 1_000_000, ownedItemIds: ['designer-suit'] }
    expect(tableAccess(state, TABLES['mesa-highroller']).allowed).toBe(true)
  })

  it('turns you away when you cannot cover the buy-in', () => {
    const state = { ...initialState(), cash: 50 }
    const access = tableAccess(state, TABLES['silvercreek-low'])
    expect(access.allowed).toBe(false)
    expect(access.reason).toMatch(/buy-in/i)
  })

  it('only warns about bankroll once the lesson is learned', () => {
    const thin = { ...initialState(), cash: 150 }
    expect(tableAccess(thin, TABLES['silvercreek-low']).bankrollWarning).toBeNull()
    const taught = { ...thin, lessonIds: ['bankroll'] }
    expect(tableAccess(taught, TABLES['silvercreek-low']).bankrollWarning).toMatch(/buy-ins/)
  })
})

describe('missions', () => {
  it('moves from unseen to active to ready as the goal is met', () => {
    const base = initialState()
    expect(missionStatus(base, 'riverbend-marker')).toBe('unseen')

    const accepted = { ...base, acceptedMissionIds: ['riverbend-marker'] }
    expect(missionStatus(accepted, 'riverbend-marker')).toBe('active')

    const won = { ...accepted, stats: { ...accepted.stats, handsWon: 5 } }
    expect(missionStatus(won, 'riverbend-marker')).toBe('ready')

    const done = { ...won, completedMissionIds: ['riverbend-marker'] }
    expect(missionStatus(done, 'riverbend-marker')).toBe('done')
  })
})
