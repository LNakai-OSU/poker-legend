import { CASINO_GOALS } from '../world/goals'
import { CITIES } from '../world/cities'
import { arriveAt, TOWN_ORDER, type CityId, type GameState } from './state'

/**
 * The playtest account: the one name that gets the tools for checking scenes
 * without playing to them. It is a convenience for whoever is testing, not a
 * security boundary — a single-player save has nothing to protect — so it is
 * decided by the name alone; on the deployed game the name is held by a
 * password on the account server.
 */
export const PLAYTEST_NAME = 'playtest'

export const isPlaytester = (slug: string): boolean => slug === PLAYTEST_NAME

/** Cash that is always safe to set: whole dollars, never negative. */
export const cleanCash = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0)

/**
 * The state of a run that has just got to a town the proper way: every earlier
 * town visited, its private room opened and its boss beaten, enough cash to have
 * paid to get in, standing at the town's own entry. Nothing is taken away, so
 * jumping back to an earlier town keeps what was already done.
 */
export function checkpointAt(state: GameState, cityId: CityId): GameState {
  const index = TOWN_ORDER.indexOf(cityId)
  const behind = TOWN_ORDER.filter((_, i) => i > 0 && i < index)
  const city = CITIES[cityId]
  const union = (a: CityId[], b: CityId[]) => [...new Set([...a, ...b])]
  const earlier = TOWN_ORDER.slice(0, index + 1)
  const arrived = arriveAt(
    {
      ...state,
      cash: Math.max(state.cash, city.unlockCash),
      unlockedCityIds: union(state.unlockedCityIds, earlier),
      casino: {
        ...state.casino,
        roomOpen: union(state.casino.roomOpen, behind.filter((id) => CASINO_GOALS[id])),
        bossBeaten: union(state.casino.bossBeaten, behind.filter((id) => CASINO_GOALS[id])),
      },
      flags: index >= 1 ? { ...state.flags, wonPokerNight: true } : state.flags,
    },
    city.arrivalAreaId ?? city.entryAreaId,
    cityId,
  )
  return arrived
}
