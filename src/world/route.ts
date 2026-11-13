import { CITIES } from './content'
import { CASINO_GOALS } from './goals'
import { CHARACTERS } from './characters'
import { TOWN_ORDER } from '../game/state'

/**
 * The road from the flat to the penthouse, read off the data the rest of the
 * game already runs on: the town ladder, each town's goal and its boss. The map
 * Marcus draws (`RoutePanel`) and the signs at the bus stops say what this says,
 * so a changed win target changes them all.
 */
export interface RouteStop {
  cityId: string
  town: string
  /** Where the money is made: the casino's name. */
  casino: string
  /** Net poker winnings in this town that open the boss's door; 0 for home and for the last town. */
  winTarget: number
  /** The boss's name; absent where the goal is something else. */
  boss?: string
  /** The bankroll that gets the bus to take you here. */
  bankroll: number
}

export const ROUTE: RouteStop[] = TOWN_ORDER.map((id) => {
  const city = CITIES[id]
  const goal = CASINO_GOALS[id]
  return {
    cityId: id,
    town: city.name,
    casino: goal?.casino ?? (id === 'portoLumina' ? 'The Poker Legends Tournament' : city.name),
    winTarget: goal?.winTarget ?? 0,
    boss: goal ? CHARACTERS[goal.bossId]?.name : undefined,
    bankroll: city.unlockCash,
  }
})
