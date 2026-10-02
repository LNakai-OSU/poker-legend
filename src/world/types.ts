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
  /**
   * Makes opponents' tells easier to see, in the same currency as the Spotting
   * Tells lesson. A keepsake you handle instead of fidgeting with your cards is
   * one less thing taking your eyes off the table.
   */
  | { kind: 'tellClarity'; value: number }
  /**
   * Counts toward the reputation that clubs check at the door. A thing you wear
   * that says you belong here is the whole point of wearing it.
   */
  | { kind: 'reputation'; value: number }
  /**
   * Travel stops costing a day.
   *
   * This is what makes a vehicle worth buying. Priced purely off the fare, every
   * vehicle in the game was a loss: the sports car saved $2,250 on the most
   * expensive route, so it paid for itself after forty trips in a game with maybe
   * twenty. Time is the scarce resource — debts come due on a day count — so time
   * is what a car should buy.
   */
  | { kind: 'fastTravel'; discount: number }

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
  /** Scenery sets this false so no name plate floats over it. */
  labelled?: boolean
  /**
   * Other things this person might say, chosen by the day.
   *
   * Ambient locals repeated one line verbatim on the second, third and tenth
   * talk, which is most of why walking anywhere felt pointless: the town produced
   * one sentence you had already read. Rotating by day means coming back later
   * gets you something new.
   */
  altLines?: string[][]
  /**
   * A story flag that must be set before the action fires. Until then the POI is
   * still there to look at and says `lockedLines` instead — a locked door you can
   * see reads better than one that is simply absent.
   */
  requiresFlag?: string
  lockedLines?: string[]
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
  /**
   * Restaurants: days of being rested a meal buys.
   *
   * Every restaurant in the game charged between $12 and $260 for two lines of
   * flavour text and changed no state at all, which made half the town a cash sink
   * with a sentence attached. Sitting down to eat now buys you a session of seeing
   * the table more clearly.
   */
  restsForDays?: number
}

export type Edge = 'north' | 'south' | 'east' | 'west'

/**
 * What lies beyond one side of a map.
 *
 * Towns used to be islands: every street was joined to the next by a *door*, so
 * crossing a road meant walking into a doorway and being teleported, and the
 * world read as a set of disconnected rooms rather than a place. An edge link is
 * the Pokémon model instead — you walk off the side of one map and straight onto
 * the next, with no transition to acknowledge and nothing to step on.
 */
export interface EdgeLink {
  toAreaId: string
  /**
   * How the two maps line up along the shared side: added to the coordinate you
   * leave on to get the one you arrive at. A map whose neighbour starts four
   * tiles further north uses -4.
   */
  offset?: number
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
  /** Doorways into buildings. Streets join to each other with `edges` instead. */
  exits: ExitDef[]
  /** Which map lies off each side, for walking straight from one into the next. */
  edges?: Partial<Record<Edge, EdgeLink>>
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
  /** Which tile palette the whole town is drawn in (see TILE_THEMES). */
  theme?: string
  /**
   * Stops the local bus serves inside this town.
   *
   * The bus is a shortcut across a world you can also walk, so these are places
   * you could reach on foot — it just saves the walk.
   */
  stops?: LocalStop[]
}

export interface LocalStop {
  areaId: string
  name: string
  blurb: string
  /** Where you are put down. */
  col: number
  row: number
}
