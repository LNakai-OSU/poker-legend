import { allShopItems, findItem } from './content'
import type { TrackSpec } from '../game/raceTrack'
import type { CityId } from '../game/state'
import type { CarStat, CarStats, ShopItemDef } from './types'

/**
 * Street racing: a side hustle.
 *
 * Poker stays the only way past a boss. A race pays small and costs a period
 * (see `settleRace` in `GameApp`), so it can fund a car or a cushion and nothing
 * more: the content tests cap what any race can win against what the next town
 * asks of you, and hold a race between equals at a loss to the house.
 *
 * A **car** is a shop item with `car` stats. A **race** is data here: who you
 * race, in what, for how much. How it is driven is `game/race.ts`.
 */

/** Wrecking a car costs this fraction of what it is worth. */
export const REPAIR_FRACTION = 0.05
export const REPAIR_FLOOR = 100

/** The most any one stat can be, bought parts included. */
export const STAT_CEILING = 10

export interface RaceDriver {
  /** A character id: their name and the line they say when you beat them. */
  character: string
  /** The shop item they drive. */
  carId: string
  /** 0..1: how early they see a hazard and how rarely they fumble the wheel. */
  skill: number
}

export interface RaceDef {
  id: string
  name: string
  cityId: CityId
  blurb: string
  /** What the person running it says when you ask. */
  hostLines: string[]
  /** The road: its name, its scenery, how it bends and rises. */
  track: TrackSpec
  /** Metres to the line. */
  length: number
  /** 1 is the usual road; more is busier. */
  traffic: number
  field: RaceDriver[]
  /** Cash races: what you can put down. */
  stakes: number[]
  /**
   * What a win pays, as a multiple of the stake. Always under the number of cars
   * you beat for it to be fair, so a race between equals loses a little.
   */
  pays: number
  /** Pink slip: your car against theirs, and no cash on it. */
  pinkSlip?: { driver: number; prizeCarId: string }
  /** What the loser of the pink slip says. */
  beatenLine: string
  /** What they say when the car is theirs. */
  winLine: string
}

export const RACES: Record<string, RaceDef> = {
  'harbor-dash': {
    id: 'harbor-dash',
    name: 'Harbor Dash',
    cityId: 'crescentHarbor',
    blurb: 'Down the waterfront and back before the harbour police wake up. Three cars.',
    hostLines: ['Racer: Three cars, one road, two minutes. Put money on yourself or don’t.'],
    track: { name: 'Waterfront Run', theme: 'harbor', curviness: 0.35, hills: 0.2 },
    length: 1700,
    traffic: 0.9,
    field: [
      { character: 'abel', carId: 'beater', skill: 0.35 },
      { character: 'otto', carId: 'sedan', skill: 0.45 },
    ],
    stakes: [50, 100, 250, 500],
    pays: 1.6,
    beatenLine: 'Otto: I never fold. I don’t brake either.',
    winLine: 'Otto: Nobody’s ever passed me on the front straight.',
  },
  'dockside-slip': {
    id: 'dockside-slip',
    name: 'Dockside Slip',
    cityId: 'crescentHarbor',
    blurb: 'Otto’s coupe against yours. Pink slips on the table, no cash. Lose and it is his.',
    hostLines: ['Racer: Otto put his coupe up. You’d have to put up yours.'],
    track: { name: 'Dockside Loop', theme: 'harbor', curviness: 0.55, hills: 0.3 },
    length: 1900,
    traffic: 1,
    field: [{ character: 'otto', carId: 'harbor-coupe', skill: 0.55 }],
    stakes: [],
    pays: 0,
    pinkSlip: { driver: 0, prizeCarId: 'harbor-coupe' },
    beatenLine: 'Otto: Keys are on the dash. Take care of her.',
    winLine: 'Otto: Told you she pulls left. Not any more.',
  },
  'coast-run': {
    id: 'coast-run',
    name: 'Coast Run',
    cityId: 'palmCay',
    blurb: 'The coast road in the evening sun, a four-car field and a lot of cheerful money.',
    hostLines: ['Racer: Four cars on the coast road. Sun’s going down, it’s lovely, don’t look at it.'],
    track: { name: 'Coast Road', theme: 'coast', curviness: 0.5, hills: 0.5 },
    length: 2100,
    traffic: 1,
    field: [
      { character: 'whitaker', carId: 'sedan', skill: 0.3 },
      { character: 'rosa', carId: 'convertible', skill: 0.5 },
      { character: 'ines', carId: 'convertible', skill: 0.6 },
    ],
    stakes: [200, 500, 1000, 2000],
    pays: 2.4,
    beatenLine: 'Rosa: That’s my whole afternoon.',
    winLine: 'Inés: Do come again.',
  },
  'cay-slip': {
    id: 'cay-slip',
    name: 'Cay Slip',
    cityId: 'palmCay',
    blurb: 'Inés’s roadster for your car. She does not lose often, and she does not say it twice.',
    hostLines: ['Racer: Inés would like to race you for a car. She’s already had the paperwork drawn up.'],
    track: { name: 'Cliffside', theme: 'coast', curviness: 0.7, hills: 0.65 },
    length: 2200,
    traffic: 1.1,
    field: [{ character: 'ines', carId: 'cay-roadster', skill: 0.68 }],
    stakes: [],
    pays: 0,
    pinkSlip: { driver: 0, prizeCarId: 'cay-roadster' },
    beatenLine: 'Inés: Hm. Keys. Mind the seats.',
    winLine: 'Inés: Do give my love to your old car.',
  },
  'strip-sprint': {
    id: 'strip-sprint',
    name: 'Strip Sprint',
    cityId: 'neonMesa',
    blurb: 'Down the Strip with the neon in the paint, four cars, serious money.',
    hostLines: ['Racer: Strip’s shut for the night. Four cars. Don’t clip the taxi rank.'],
    track: { name: 'The Strip', theme: 'strip', curviness: 0.45, hills: 0.2 },
    length: 2400,
    traffic: 1.2,
    field: [
      { character: 'zeke', carId: 'sports-car', skill: 0.5 },
      { character: 'lowe', carId: 'convertible', skill: 0.6 },
      { character: 'dmitri', carId: 'sports-car', skill: 0.7 },
    ],
    stakes: [1000, 2500, 5000, 8000],
    pays: 2.4,
    beatenLine: 'Zeke: Chat, he took the Strip. Chat? Chat.',
    winLine: 'Dmitri: …',
  },
  'mesa-slip': {
    id: 'mesa-slip',
    name: 'Mesa Slip',
    cityId: 'neonMesa',
    blurb: 'Solomon Vale’s GT against your car. He has never been seen to lose one.',
    hostLines: ['Racer: Mr. Vale has a car you’ve been looking at. He would like yours.'],
    track: { name: 'Mesa Switchbacks', theme: 'strip', curviness: 0.8, hills: 0.55 },
    length: 2600,
    traffic: 1.25,
    field: [{ character: 'vale', carId: 'vale-gt', skill: 0.78 }],
    stakes: [],
    pays: 0,
    pinkSlip: { driver: 0, prizeCarId: 'vale-gt' },
    beatenLine: 'Vale: A fair race. The keys are in my pocket and it’s a pleasure.',
    winLine: 'Vale: Well. I’ll have to buy another.',
  },
}

/** What a car is worth: the repair bill is a fraction of it. */
export function carValue(item: ShopItemDef): number {
  return item.price
}

export function repairCost(item: ShopItemDef): number {
  return Math.max(REPAIR_FLOOR, Math.round(carValue(item) * REPAIR_FRACTION))
}

/** Every car the player owns, best first. */
export function ownedCars(ownedItemIds: string[]): ShopItemDef[] {
  return ownedItemIds
    .map((id) => findItem(id))
    .filter((item): item is ShopItemDef => item !== null && item.car !== undefined)
    .sort((a, b) => rating(b.car!) - rating(a.car!))
}

export function rating(stats: CarStats): number {
  return stats.topSpeed + stats.handling + stats.grip
}

/** A car's stats with every part its driver has bought on top, capped. */
export function tunedStats(car: CarStats, ownedItemIds: string[]): CarStats {
  const out = { ...car }
  for (const id of ownedItemIds) {
    const effect = findItem(id)?.effect
    if (effect?.kind === 'carTune') {
      const stat: CarStat = effect.stat
      out[stat] = Math.min(STAT_CEILING, out[stat] + effect.value)
    }
  }
  return out
}

/** The races on offer in a town. */
export function racesIn(cityId: CityId): RaceDef[] {
  return Object.values(RACES).filter((r) => r.cityId === cityId)
}

/** Whether an item id is a car at all. */
export function isCar(itemId: string): boolean {
  return allShopItems().some((item) => item.id === itemId && item.car !== undefined)
}
