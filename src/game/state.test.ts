import { describe, expect, it } from 'vitest'
import {
  advanceDay,
  CAUGHT_GRACE_DAYS,
  caughtByCollectors,
  daysUntilDue,
  daysUntilRematch,
  FINALE_REMATCH_DAYS,
  initialState,
  lostFinalChallenge,
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

describe('getting caught', () => {
  function hunted() {
    return advanceDay(staked({ cash: 500 }), 4)
  }

  it('takes most of the bankroll but leaves the debt standing', () => {
    // Wiping the debt made deliberately walking into collectors strictly better
    // than paying, which inverted the whole point of borrowing.
    const before = hunted()
    const after = caughtByCollectors(before)
    expect(after.cash).toBeLessThan(before.cash)
    expect(after.debts).toEqual(before.debts)
    expect(totalOwed(after)).toBe(totalOwed(before))
  })

  it('leaves enough behind to keep playing', () => {
    // Taking the whole bankroll ended the run on the spot: broke, still in debt,
    // and with no buy-in to earn it back with. It has to hurt, not be terminal.
    const before = advanceDay(staked({ cash: 4000 }), 4)
    const after = caughtByCollectors(before)
    expect(after.cash).toBeGreaterThan(0)
    expect(after.cash / before.cash).toBeLessThan(0.5)
  })

  it('is never cheaper than paying what you owe', () => {
    const rich = advanceDay(staked({ cash: 10000 }), 4)
    const paid = payDebt(rich, rich.debts[0].id)
    const caught = caughtByCollectors(rich)
    // Paying leaves you with money and no debt; being caught leaves you with
    // neither the money nor a clean slate.
    expect(paid.cash - totalOwed(paid)).toBeGreaterThan(caught.cash - totalOwed(caught))
  })

  it('calls off the hunt and grants a few days of breathing room', () => {
    const caught = caughtByCollectors(hunted())
    expect(caught.huntedInCityId).toBeNull()

    // Still overdue, but they leave you alone long enough to earn.
    let state = caught
    for (let day = 1; day < CAUGHT_GRACE_DAYS; day++) {
      state = advanceDay(state)
      expect(overdueDebts(state).length).toBe(1)
      expect(state.huntedInCityId).toBeNull()
    }
  })

  it('sends the collectors back once the grace period runs out', () => {
    let state = caughtByCollectors(hunted())
    state = advanceDay(state, CAUGHT_GRACE_DAYS + 1)
    expect(state.huntedInCityId).toBe('riverbend')
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

  it('is ready on first contact when the goal is already met', () => {
    // The Harbor Doorman's brief says "you are not currently meeting them... come
    // back in a real suit", and it was shown on the strength of never having
    // spoken to him — so a player already wearing the tailored suit that
    // completes the mission got told to go and buy one.
    const base = initialState()
    expect(missionStatus(base, 'crescent-suit')).toBe('unseen')

    const suited = { ...base, ownedItemIds: ['tailored-suit'] }
    expect(missionStatus(suited, 'crescent-suit')).toBe('ready')
  })
})

describe('the heads-up finale', () => {
  // Losing used to be free: you walked back out to the overworld and Nadia was
  // ready to go again, so the climax was an expensive cash game you could grind.
  it('costs the buy-in and puts the rematch days away', () => {
    const before = { ...initialState(), day: 10, cash: 200000 }
    expect(daysUntilRematch(before)).toBe(0)

    // Sitting down is what moves the money, exactly as any other buy-in does.
    const seated = { ...before, cash: before.cash - TABLES['lumina-finale'].buyIn }
    const lost = lostFinalChallenge(seated)
    expect(lost.cash).toBe(80000)
    expect(daysUntilRematch(lost)).toBe(FINALE_REMATCH_DAYS)
    expect(daysUntilRematch(advanceDay(lost, FINALE_REMATCH_DAYS))).toBe(0)
  })
})
