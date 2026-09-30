import type { TileGrid } from '../overworld/tileRenderer'
import type { Archetype, SkillTier } from '../engine/types'
import type { CityId } from '../game/state'

export interface OpponentDef {
  id: string
  name: string
  skillTier: SkillTier
  archetype?: Archetype
  /** Whales sit down deeper than everyone else. */
  stackMultiplier?: number
}

export interface TableDef {
  id: string
  name: string
  smallBlind: number
  bigBlind: number
  buyIn: number
  opponents: OpponentDef[]
  /** Minimum dress-code level the room enforces (see ITEM dressCode effects). */
  dressCode?: number
  /** Heads-up finale tables end the game rather than being a normal cash game. */
  isFinale?: boolean
}

export type ItemEffect =
  | { kind: 'travelDiscount'; value: number }
  | { kind: 'dressCode'; level: number }

export interface ShopItemDef {
  id: string
  name: string
  price: number
  blurb: string
  effect?: ItemEffect
}

export interface ShopDef {
  id: string
  name: string
  items: ShopItemDef[]
}

export interface SponsorDef {
  id: string
  name: string
  principal: number
  /** 0.25 = pay back 125% of what you took. */
  interestRate: number
  dueInDays: number
  pitch: string[]
}

export type MissionGoal =
  | { kind: 'handsWonTotal'; value: number }
  | { kind: 'biggestPot'; value: number }
  | { kind: 'ownItem'; itemId: string }
  | { kind: 'hasLesson'; lessonId: string }
  | { kind: 'cash'; value: number }

export interface MissionDef {
  id: string
  title: string
  brief: string[]
  goalText: string
  goal: MissionGoal
  rewardCash: number
  doneText: string[]
}

export interface LessonDef {
  id: string
  name: string
  price: number
  /** Real, standard poker strategy — this is teaching, not flavor. */
  teaching: string[]
  unlocks: string
}

export type PoiAction =
  | { kind: 'table'; tableId: string }
  | { kind: 'shop'; shopId: string }
  | { kind: 'mentor' }
  | { kind: 'sponsor'; sponsorId: string }
  | { kind: 'mission'; missionId: string }
  | { kind: 'travel' }
  | { kind: 'flavor' }
  | { kind: 'pokerNight' }

export interface PoiDef {
  id: string
  name: string
  col: number
  row: number
  color: number
  lines: string[]
  action: PoiAction
}

export interface CityDef {
  id: CityId
  name: string
  blurb: string
  map: TileGrid
  playerStart: { col: number; row: number }
  background: string
  pois: PoiDef[]
  /** Bankroll needed before you can travel here at all. */
  unlockCash: number
  travelCost: number
}
