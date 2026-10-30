import type { CityId } from '../game/state'

/**
 * What each casino town asks of you besides money.
 *
 * Every town has a private room behind its casino floor and a boss in it. The
 * door opens once you have *won* `winTarget` at the town's poker tables (net, over
 * the whole run), and the boss plays you one on one. Beat them and the bus to the
 * next town will take you; until then it will not. The boss is a better player
 * than anybody on the floor, and a better one than the boss before — their
 * character's `seat.skillTier` climbs one step per town (rule 2: difficulty is
 * skill, never luck).
 *
 * Data, not code. A town's goal is a line here, a character, a table in
 * `content.ts` and a room in `cities.ts`; the content tests check they agree.
 */
export interface CasinoGoal {
  cityId: CityId
  /** The casino, as the door and the goal line name it. */
  casino: string
  /** Net winnings at this town's poker tables that open the private room. */
  winTarget: number
  /** The boss: a character id. */
  bossId: string
  /** The one-on-one table in `TABLES`. */
  tableId: string
  /** The private room, an area of this town. */
  roomAreaId: string
  /** The casino floor the room opens off. */
  floorAreaId: string
  /** Who keeps the door, for the line said when it is shut. */
  doorman: string
  /** Said at the shut door, with the numbers added after. */
  shut: string
  /** Said on the way in, the first time through. */
  open: string[]
  /** Said when the boss is down. */
  beaten: string[]
}

export const CASINO_GOALS: Record<string, CasinoGoal> = {
  silverCreek: {
    cityId: 'silverCreek',
    casino: 'Silver Creek Casino',
    winTarget: 400,
    bossId: 'lou',
    tableId: 'silvercreek-boss',
    roomAreaId: 'sc-private',
    floorAreaId: 'sc-floor',
    doorman: 'Lou’s Nephew',
    shut: 'Nephew: Uncle Lou only plays people who have taken money off this floor.',
    open: ['Nephew: Uncle Lou says come on back. Do not touch the humidor.'],
    beaten: [
      'Lou: Well, I will be.',
      'Lou: That is thirty years I have owned this saloon and nobody has done that to me sitting down.',
      'Lou: Go on. The bus to the river runs whether I like it or not.',
    ],
  },
  riverbend: {
    cityId: 'riverbend',
    casino: 'The Riverboat',
    winTarget: 1200,
    bossId: 'odette',
    tableId: 'riverbend-boss',
    roomAreaId: 'rb-private',
    floorAreaId: 'rb-boat',
    doorman: 'Deckhand',
    shut: 'Deckhand: The Captain’s cabin is for people who have won on her boat.',
    open: ['Deckhand: Captain Marsh will see you. Wipe your feet.'],
    beaten: [
      'Odette: Hm.',
      'Odette: I have put a hundred men over the side of this boat, and you are the first who made me enjoy it.',
      'Odette: Harbor will be a different animal. Go and be eaten by it.',
    ],
  },
  crescentHarbor: {
    cityId: 'crescentHarbor',
    casino: 'The Harbor Room',
    winTarget: 4000,
    bossId: 'bellamy',
    tableId: 'crescent-boss',
    roomAreaId: 'ch-private',
    floorAreaId: 'ch-cardroom',
    doorman: 'Attendant',
    shut: 'Attendant: Mr. Bellamy receives only those who have done well in the room.',
    open: ['Attendant: Mr. Bellamy is expecting you. He is always expecting someone.'],
    beaten: [
      'Bellamy: Well played. I will say so once and not again.',
      'Bellamy: The house has noted it. The island will have noted it by Tuesday.',
      'Bellamy: Go east.',
    ],
  },
  palmCay: {
    cityId: 'palmCay',
    casino: 'The Cay Room',
    winTarget: 12000,
    bossId: 'ines',
    tableId: 'palmcay-boss',
    roomAreaId: 'pc-private',
    floorAreaId: 'pc-casino',
    doorman: 'Bouncer',
    shut: 'Bouncer: The owner’s table is for people who have already taken the Cay’s money.',
    open: ['Bouncer: Miss Calloway has cleared her evening. Do not make her regret it.'],
    beaten: [
      'Inés: Oh, that was lovely. I haven’t been robbed that politely since 2009.',
      'Inés: You will want Mesa. They have no sense of humour there at all.',
    ],
  },
  neonMesa: {
    cityId: 'neonMesa',
    casino: 'The Mesa Casino',
    winTarget: 40000,
    bossId: 'vale',
    tableId: 'mesa-boss',
    roomAreaId: 'nm-private',
    floorAreaId: 'nm-casino',
    doorman: 'Doorman',
    shut: 'Doorman: Mr. Vale plays people the floor has already lost to.',
    open: ['Doorman: Mr. Vale. The suite. He has been told your name.'],
    beaten: [
      'Vale: …',
      'Vale: Nobody has beaten me in this room in nine years. I find I am not offended.',
      'Vale: Lumina. Her door is open to you now. Mine always was.',
    ],
  },
}

/** The goal for a town, if it has one: the last town, Lumina, ends on the final table instead. */
export function goalOf(cityId: string): CasinoGoal | undefined {
  return CASINO_GOALS[cityId]
}

/** Every goal, in the order the towns climb. */
export const GOAL_ORDER: CasinoGoal[] = ['silverCreek', 'riverbend', 'crescentHarbor', 'palmCay', 'neonMesa'].map(
  (id) => CASINO_GOALS[id],
)
