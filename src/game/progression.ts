import { CITIES, MISSIONS, findItem } from '../world/content'
import type { MissionGoal, TableDef } from '../world/types'
import type { CityId, GameState } from './state'

/** Best dress-code level across everything the player owns. */
export function dressCodeLevel(state: GameState): number {
  return state.ownedItemIds.reduce((best, itemId) => {
    const effect = findItem(itemId)?.effect
    return effect?.kind === 'dressCode' ? Math.max(best, effect.level) : best
  }, 0)
}

/** Best travel discount across everything the player owns (0 = full price). */
export function travelDiscount(state: GameState): number {
  return state.ownedItemIds.reduce((best, itemId) => {
    const effect = findItem(itemId)?.effect
    return effect?.kind === 'travelDiscount' ? Math.max(best, effect.value) : best
  }, 0)
}

export function travelCostTo(state: GameState, cityId: CityId): number {
  const city = CITIES[cityId]
  if (!city) return 0
  return Math.round(city.travelCost * (1 - travelDiscount(state)))
}

export interface TravelOption {
  cityId: CityId
  name: string
  blurb: string
  cost: number
  locked: boolean
  lockReason: string | null
}

export function travelOptions(state: GameState): TravelOption[] {
  return Object.values(CITIES)
    .filter((city) => city.id !== state.cityId)
    .map((city) => {
      const cost = travelCostTo(state, city.id)
      const visited = state.unlockedCityIds.includes(city.id)
      const bankrollShort = state.cash < city.unlockCash
      const cantAfford = state.cash < cost
      const locked = (!visited && bankrollShort) || cantAfford
      let lockReason: string | null = null
      if (!visited && bankrollShort) lockReason = `Needs a bankroll of $${city.unlockCash.toLocaleString()}`
      else if (cantAfford) lockReason = `Travel costs $${cost.toLocaleString()}`
      return { cityId: city.id, name: city.name, blurb: city.blurb, cost, locked, lockReason }
    })
}

export interface TableAccess {
  allowed: boolean
  reason: string | null
  /** Set when the player can technically sit but is risking too much of their roll. */
  bankrollWarning: string | null
}

export function tableAccess(state: GameState, table: TableDef): TableAccess {
  const dress = dressCodeLevel(state)
  if (table.dressCode && dress < table.dressCode) {
    return {
      allowed: false,
      reason: 'The room has a dress code, and you are not dressed for it.',
      bankrollWarning: null,
    }
  }
  if (state.cash < table.buyIn) {
    return {
      allowed: false,
      reason: `The buy-in is $${table.buyIn.toLocaleString()}. You have $${state.cash.toLocaleString()}.`,
      bankrollWarning: null,
    }
  }
  // Standard cash-game advice is ~20 buy-ins for the stake you sit in; the
  // mentor's bankroll lesson is what makes the game point this out.
  const hasLesson = state.lessonIds.includes('bankroll')
  const rollRatio = state.cash / table.buyIn
  const bankrollWarning =
    hasLesson && rollRatio < 5
      ? `This is ${rollRatio.toFixed(1)} buy-ins of your roll. Twenty is the usual advice.`
      : null
  return { allowed: true, reason: null, bankrollWarning }
}

export function isGoalMet(state: GameState, goal: MissionGoal): boolean {
  switch (goal.kind) {
    case 'handsWonTotal':
      return state.stats.handsWon >= goal.value
    case 'biggestPot':
      return state.stats.biggestPot >= goal.value
    case 'ownItem':
      return state.ownedItemIds.includes(goal.itemId)
    case 'hasLesson':
      return state.lessonIds.includes(goal.lessonId)
    case 'cash':
      return state.cash >= goal.value
  }
}

export type MissionStatus = 'unseen' | 'active' | 'ready' | 'done'

export function missionStatus(state: GameState, missionId: string): MissionStatus {
  if (state.completedMissionIds.includes(missionId)) return 'done'
  const mission = MISSIONS[missionId]
  const goalMet = mission !== undefined && isGoalMet(state, mission.goal)
  // A goal that is *already* met is ready whether or not the mission has been
  // briefed. Otherwise the Harbor Doorman tells a player in a tailored suit to
  // "come back in a real suit", because the brief is keyed on having talked to
  // him rather than on what the player is actually wearing.
  if (!state.acceptedMissionIds.includes(missionId)) return goalMet ? 'ready' : 'unseen'
  return goalMet ? 'ready' : 'active'
}

/** Which stake the player's roll actually supports, for the mentor's advice. */
export function recommendedStakeText(state: GameState): string {
  if (state.cash < 2000) return 'Silver Creek or Riverbend money.'
  if (state.cash < 20000) return 'Crescent Harbor money.'
  if (state.cash < 200000) return 'Palm Cay or Neon Mesa money.'
  return 'Porto Lumina money.'
}
