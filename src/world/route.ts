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
  /** What you will know the town by: its buildings and sights, as Marcus names them on the map. */
  landmarks: string[]
  /** The boss's character id, so the map can show their face beside the town. */
  bossId?: string
}

const LANDMARKS: Record<string, string[]> = {
  apartment: ['The flat above the bakery', 'Marcus’s kitchen table'],
  silverCreek: ['Silver Creek Casino saloon', 'The diner', 'The gift shop'],
  riverbend: ['The paddle-steamer Riverboat', 'The dock and outfitters', 'The Captain’s cabin'],
  crescentHarbor: ['The Harbour Room', 'Marina Motors', 'The boutiques on the quay'],
  palmCay: ['The Cay Room', 'Shoreline Grill', 'Palm-lined promenade'],
  neonMesa: ['The Mesa Casino', 'Mesa Arena', 'Ultraviolet and the Strip'],
  portoLumina: ['The grand foyer and its rope', 'The Supper Club', 'The penthouse tower'],
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
    landmarks: LANDMARKS[id] ?? [],
    bossId: goal?.bossId,
  }
})
