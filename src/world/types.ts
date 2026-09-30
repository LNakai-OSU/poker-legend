import type { TileGrid } from '../overworld/tileRenderer'
import type { NpcArt } from '../overworld/Npc'
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
  /** Some jobs pay in goods rather than cash. */
  rewardItemId?: string
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
  | { kind: 'slots' }
  | { kind: 'craps' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'penthouse' }
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
  /** Overrides the sprite chosen from the action kind (people by default). */
  art?: NpcArt
}

export type VenueKind = 'restaurant' | 'club'

export interface VenueDef {
  id: string
  name: string
  kind: VenueKind
  blurb: string
  /** Restaurants: what a meal costs. Clubs: what the door costs. */
  price: number
  /** Clubs only: reputation needed before anyone invites you anywhere. */
  reputationNeeded?: number
  /** Clubs only: the invite-only table a successful night opens up. */
  unlocksTableId?: string
  /** Lines shown on entry. */
  lines: string[]
  /** Lines shown when a club invite lands. */
  inviteLines?: string[]
}

/** A door: step onto this tile and you come out somewhere else. */
export interface ExitDef {
  col: number
  row: number
  toAreaId: string
  toCol: number
  toRow: number
  /** Shown as a signpost over the door. */
  label: string
}

/**
 * One walkable space — a street, a casino floor, a shop interior. Cities are
 * made of several, joined by doors, so a town is somewhere you walk around
 * rather than a single screen with everything standing in the open.
 */
export interface AreaDef {
  id: string
  name: string
  map: TileGrid
  playerStart: { col: number; row: number }
  background: string
  pois: PoiDef[]
  exits: ExitDef[]
}

export interface CityDef {
  id: CityId
  name: string
  blurb: string
  /** The street you arrive on. */
  entryAreaId: string
  areas: Record<string, AreaDef>
  /** Bankroll needed before you can travel here at all. */
  unlockCash: number
  travelCost: number
}
