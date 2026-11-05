import type { TileGrid } from '../overworld/tileRenderer'
import type { NpcArt } from '../overworld/Npc'
import type { NpcRole, PersonLook } from '../overworld/characterArt'
import type { Archetype, SkillTier } from '../engine/types'
import type { TournamentRules } from '../engine/tournament'
import type { CityId } from '../game/state'
import type { PlacedStamp } from './stamps'
import type { TimePeriod } from '../game/time'

/**
 * Who a table seats.
 *
 * A character id, or that id with one of their alternate personas — Vance plays
 * a different way one on one, and Kit greets you differently the second time she
 * finds you at her table. See `CharacterDef` in `characters.ts`.
 */
export type SeatRef = string | { character: string; persona?: string }

/** A seat with its character resolved. Produced by `seatsOf`. */
export interface OpponentDef {
  id: string
  name: string
  skillTier: SkillTier
  archetype?: Archetype
  /** Whales sit down deeper than everyone else. */
  stackMultiplier?: number
  /** Which of the character's personas is sitting here, if not their usual one. */
  persona?: string
}

/**
 * The room a table stands in: its felt, its rail, the deck the house prints and
 * what is on the walls behind it. See `TABLE_THEMES` in `game/tableThemes.ts`.
 */
export type TableThemeId =
  | 'home'
  | 'silvercreek'
  | 'riverboat'
  | 'harbor'
  | 'backroom'
  | 'palmcay'
  | 'mesa'
  | 'invitational'
  | 'lumina'
  | 'finale'

export interface TableDef {
  id: string
  name: string
  smallBlind: number
  bigBlind: number
  buyIn: number
  opponents: SeatRef[]
  /**
   * Makes this an open cash game, whose table fills and thins with the hour:
   * who is at it is drawn from `opponents` and `walkIns` together, one to five
   * of them (see `lineup.ts`). Leave it out for a match, a boss or a private
   * room, where `opponents` are exactly who you play. `[]` is allowed when
   * `opponents` is already a full table.
   */
  walkIns?: SeatRef[]
  /** Minimum dress-code level the room enforces (see ITEM dressCode effects). */
  dressCode?: number
  /** Heads-up finale tables end the game rather than being a normal cash game. */
  isFinale?: boolean
  /**
   * Your chips as a fraction of `buyIn`, when you do not sit down with the same
   * as everybody: the final table, where you arrive short.
   */
  yourStack?: number
  /** Nothing is paid to sit down, and nothing is kept for losing: the stack is given. */
  freeroll?: boolean
  /**
   * Makes this a tournament: `buyIn` is the entry fee and the chips you start
   * with, the blinds rise every round, and a knocked-out player is replaced from
   * `walkIns` until the last round is done. Then it is the final table, played to
   * one winner. You cannot stand up, and nothing is paid back: the prize is the
   * seat at the final (`tournamentWon`).
   */
  tournament?: TournamentRules
  /** Cash you must be holding, not spending, to be let in. */
  proof?: number
  /** What winning the table pays, in a freeroll. */
  prize?: number
  /**
   * Which room the table is in. Tables in the same room share one, so the
   * heads-up table on the Harbor floor looks like the Harbor floor.
   */
  theme?: TableThemeId
  /**
   * This is the boss of that town's casino, one on one in the private room.
   *
   * A match, like the final: your buy-in against theirs, no cashing out and no
   * standing up, over when one of you has every chip. Beating them is what lets
   * you travel to the next town. See `CASINO_GOALS` in `goals.ts`.
   */
  bossOf?: CityId
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
  /** Clothing: what the hero looks like wearing it, once they choose to. */
  wear?: { style: 'suit' | 'tux' | 'jacket' | 'hoodie'; color: string }
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
  /**
   * Who they send when a stake runs out: a character id. Their face is the one
   * that chases you down the street, and `caught` beats are written for them.
   */
  collector: string
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
  | { kind: 'roulette' }
  | { kind: 'venue'; venueId: string }
  | { kind: 'penthouse' }
  | { kind: 'shop'; shopId: string }
  | { kind: 'mentor' }
  | { kind: 'sponsor'; sponsorId: string }
  | { kind: 'mission'; missionId: string }
  | { kind: 'travel' }
  | { kind: 'flavor' }

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
  /**
   * What a person here is dressed as: a dealer's waistcoat, a police cap.
   *
   * Defaults from the action — whoever seats you at a table is a dealer, whoever
   * sells you something wears an apron — and then from the name, so a "Patrol
   * Officer" is in uniform. Set it whenever the job is not obvious from either.
   * See `roleForPoi`.
   */
  role?: NpcRole
  /**
   * How they look, over the stranger made up from their id: a fixed shirt
   * colour, a hairstyle, a skirt. Anything left out stays as generated.
   */
  look?: Partial<PersonLook>
  /** Scenery sets this false so no name plate shows over it. */
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
  /**
   * Somebody out walking: the tiles they turn at on a short beat, in order,
   * after the one they start on (`col`, `row`). They walk it there and back a
   * tile at a time, pausing at each end, and stop when spoken to. Each leg runs
   * straight along a row or a column, over pavement — never the road, a
   * doorway, or where somebody else stands (the content tests check). A street
   * with three or four of them reads as a street people use.
   */
  patrol?: Array<{ col: number; row: number }>
  /** The hours they are about, when not all of them: a street is busiest in the afternoon, quietest at night. */
  hours?: TimePeriod[]
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
   * Set and the side is a wall of road: walking into it stops you and says this,
   * instead of crossing. The link stays written down so the two maps still agree
   * on how they would line up, but no one crosses it on foot. This is how towns
   * stay apart: the bus is the only way between them.
   */
  blocked?: string
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
  /**
   * The private room behind a casino door: it stays shut until you have won
   * enough at that town's casino (see `CASINO_GOALS`).
   */
  privateRoomOf?: CityId
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
  /**
   * Objects bigger than a tile standing on this map — a poker table, a house.
   *
   * Their tiles are already written into `map`, so everything that reads the
   * grid works whether or not this is here; this is what lets the renderer draw
   * one object instead of a patch of repeated texture.
   */
  stamps?: PlacedStamp[]
  /**
   * How full the room is kept, 0 to 1: the more exclusive the house, the more
   * of its chairs are taken. Left out, tables fill as they happen to.
   */
  crowd?: number
  /**
   * Under open sky, out of town: no street lamps, but nothing between you and the
   * moon either, so its night is a lighter blue than a street's and a path and
   * the way back to the road still read without a lamp on them.
   */
  moonlit?: boolean
}

export interface CityDef {
  id: CityId
  name: string
  blurb: string
  /** Where a new game begins. */
  entryAreaId: string
  /**
   * Where the bus puts you down, when it is not where the game starts.
   *
   * Your home town begins inside your flat, so travelling there dropped the
   * player into their own bedroom — off a bus, through a locked front door, into
   * the corner of a room. A bus stops at a bus stop.
   */
  arrivalAreaId?: string
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
