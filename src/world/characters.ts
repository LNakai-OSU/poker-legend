import type { AvatarLook } from '../game/avatars'
import type { Archetype, SkillTier } from '../engine/types'
import type { OpponentDef, TableDef } from './types'
import type { NpcArt } from '../overworld/Npc'
import { TIME_PERIODS, type TimePeriod } from '../game/time'

/**
 * Who somebody is, in one place.
 *
 * A character used to be written down three times: their name and how they play
 * in the table definition, their face and their dialogue in a personalities
 * file, and a seat at a heads-up table got a whole second copy of the person
 * under a different id. Adding someone meant editing three files and keeping
 * them in agreement, and nothing checked that you had.
 *
 * One definition now. A table seats characters by id; the engine reads `seat`;
 * the felt reads `look`, `style` and `lines`.
 */

/** What a character says while they are taking your money. */
export interface TableLines {
  /** On sitting down with them. */
  greeting: string[]
  raise: string[]
  /** Opening the betting when it was checked to them — the commonest action. */
  bet: string[]
  /** Checking it back. */
  check: string[]
  call: string[]
  fold: string[]
  /** They won the pot. */
  win: string[]
  /** You won the pot. */
  lose: string[]
}

/** How a character plays, for the seats they take. */
export interface Seat {
  skillTier: SkillTier
  archetype?: Archetype
  /** Whales sit down deeper than everyone else. */
  stackMultiplier?: number
}

/**
 * The same person in a different room.
 *
 * Vance at a six-handed table and Vance one on one are the same man playing
 * differently, not two people — so he is one character with a second way of
 * talking, rather than a duplicate under another id.
 */
export interface Persona {
  style?: string
  lines?: Partial<TableLines>
}

/**
 * Where a character is at a given time of day.
 *
 * A character with a schedule exists in the world outside the card room: you
 * pass Deb on Basin Street in the morning and find her in the bodega by evening.
 * The point is not the walking — it is that the town has somebody in it who was
 * somewhere else an hour ago, and who you could have gone looking for.
 */
export interface ScheduleEntry {
  period: TimePeriod
  /** An area id, as `AREAS` keys them. */
  areaId: string
  col: number
  row: number
  /** What they say here. Falls back to the character's usual lines. */
  lines?: string[]
}

/** A character you can walk up to in the street, as opposed to sit down against. */
export interface OverworldPresence {
  art?: NpcArt
  /** Their name plate's colour on the map. */
  color?: number
  /** What they say when you have nothing more specific for the hour. */
  lines: string[]
  /** Where they are through the day. An empty schedule means they are nowhere. */
  schedule: ScheduleEntry[]
}

export interface CharacterDef {
  name: string
  /** Shown under their name at the table, e.g. "Calls everything". */
  style: string
  look: AvatarLook
  /** Characters who never sit down — Marcus, Dana — have none. */
  seat?: Seat
  lines: Partial<TableLines>
  personas?: Record<string, Persona>
  /** Where they are in the town, and when. Characters who only ever sit at a
   *  table have none. */
  overworld?: OverworldPresence
}

/** What anyone says when their character has nothing of their own for it. */
const DEFAULT_LINES: TableLines = {
  greeting: ['Good luck.'],
  raise: ['Raise.'],
  bet: ['Bet.', 'I will put something in.', "Let's find out."],
  check: ['Check.', 'I am good.', 'Go ahead.'],
  call: ['Call.'],
  fold: ['Fold.'],
  win: ['That one is mine.'],
  lose: ['Nice hand.'],
}

export const CHARACTERS: Record<string, CharacterDef> = {
  // Every table in the game used to be two or three handed, which meant the
  // player sat in a blind on most hands and every pot was an all-in by the turn.
  // These are the extra seats on the main cash games.
  gus: {
    name: 'Gus',
    style: 'Talks through every hand.',
    look: { skin: '#d8a878', hair: '#8a6a3a', hairStyle: 'short', shirt: '#4a7a8b', accessory: 'none' },
    seat: { skillTier: 'novice', archetype: 'station' },
    lines: {
      greeting: ['Gus: New blood. Good, good.'],
      bet: ['Gus: I will lead out here.', 'Gus: Let me put a bet in.'],
      check: ['Gus: Check. Let us see a card.'],
      raise: ['Gus: Raising, and I will tell you why.', 'Gus: Up it goes.'],
      call: ['Gus: Call, call, call.'],
      fold: ['Gus: Not with this. No.'],
      win: ['Gus: See, I knew it on the flop.'],
      lose: ['Gus: I had you until the river. Story of my year.'],
    },
  },
  pearl: {
    name: 'Pearl',
    style: 'Never looks at her cards twice.',
    look: { skin: '#6b4226', hair: '#1a1a1a', hairStyle: 'tied', shirt: '#b5739a', accessory: 'earring' },
    seat: { skillTier: 'competent', archetype: 'regular' },
    lines: {
      greeting: ['Pearl: Sit down then.'],
      bet: ['Pearl: Bet.'],
      check: ['Pearl: Check.'],
      raise: ['Pearl: Raise.', 'Pearl: And more.'],
      call: ['Pearl: Call.'],
      fold: ['Pearl: Yours.'],
      win: ['Pearl: Thank you.'],
      lose: ['Pearl: Good hand. Deal.'],
    },
  },
  omar: {
    name: 'Omar',
    style: 'Here straight from a night shift.',
    look: { skin: '#a9743f', hair: '#2a1d14', hairStyle: 'short', shirt: '#5a6a4a', accessory: 'cap' },
    seat: { skillTier: 'amateur', archetype: 'maniac' },
    lines: {
      greeting: ['Omar: Two hours then I am going to bed.'],
      bet: ['Omar: Bet. Let us speed this up.'],
      check: ['Omar: Check.'],
      raise: ['Omar: Raise, and I mean it.'],
      call: ['Omar: Yeah, alright.'],
      fold: ['Omar: Done with it.'],
      win: ['Omar: That buys breakfast.'],
      lose: ['Omar: Figures.'],
    },
  },
  bette: {
    name: 'Bette',
    style: 'Counts the pot out loud.',
    look: { skin: '#eac3a0', hair: '#9a9a9a', hairStyle: 'short', shirt: '#7a5a9a', accessory: 'glasses' },
    seat: { skillTier: 'competent', archetype: 'nit' },
    lines: {
      greeting: ['Bette: Forty years I have played this game.'],
      bet: ['Bette: Four hundred in there, so — bet.'],
      check: ['Bette: Check to you.'],
      raise: ['Bette: That is a raise, dear.'],
      call: ['Bette: Getting the right price. Call.'],
      fold: ['Bette: Wrong price. No.'],
      win: ['Bette: The arithmetic does not lie.'],
      lose: ['Bette: Correct call, wrong result. It happens.'],
    },
  },
  teo: {
    name: 'Teo',
    style: 'Youngest at the table, by a lot.',
    look: { skin: '#c08552', hair: '#141414', hairStyle: 'long', shirt: '#2f6ea8', accessory: 'shades' },
    seat: { skillTier: 'competent', archetype: 'maniac' },
    lines: {
      greeting: ['Teo: Let us run it up.'],
      bet: ['Teo: Betting.', 'Teo: Pressure.'],
      check: ['Teo: Check back.'],
      raise: ['Teo: Three-bet.', 'Teo: Raise.'],
      call: ['Teo: Call. I have a plan.'],
      fold: ['Teo: Fold. Next.'],
      win: ['Teo: Standard.'],
      lose: ['Teo: Fine. Variance.'],
    },
  },
  junie: {
    name: 'Junie',
    style: 'Plays the people, not the cards.',
    look: { skin: '#f0d0b0', hair: '#c04a2a', hairStyle: 'long', shirt: '#3a9d5c', accessory: 'none' },
    seat: { skillTier: 'sharp', archetype: 'regular' },
    lines: {
      greeting: ['Junie: I like watching new people play.'],
      bet: ['Junie: Bet. See what you do.'],
      check: ['Junie: Check. Your move.'],
      raise: ['Junie: Raise. You did not like that card.'],
      call: ['Junie: I think you are lying. Call.'],
      fold: ['Junie: No, you have it. Fold.'],
      win: ['Junie: You hesitated.'],
      lose: ['Junie: Well read.'],
    },
  },
  marcus: {
    name: 'Marcus',
    style: 'Your friend. Plays scared.',
    look: { skin: '#8d5a3b', hair: '#241a12', hairStyle: 'short', shirt: '#6ea8fe', accessory: 'none' },
    lines: {
      greeting: ['Marcus: Alright, no hard feelings tonight, yeah?'],
      raise: ['Marcus: ...okay. Raise.', 'Marcus: I think I have to raise here.'],
      call: ['Marcus: Ugh. Call.', 'Marcus: Fine, call.'],
      fold: ['Marcus: Nope. Nope nope nope.', 'Marcus: Take it.'],
      win: ['Marcus: YES. Finally.', 'Marcus: Did you see that?'],
      lose: ['Marcus: Of course. Of course you had it.'],
    },
    overworld: {
      // He works, he eats, he goes home and deals. The Friday game is at his
      // place because his place is where he already is.
      lines: ['Marcus: Catch me later. I am always around.'],
      schedule: [
        { period: 'morning', areaId: 'basin', col: 9, row: 11, lines: [
          'Marcus: Morning. You look like you slept on the floor again.',
          'Marcus: Game is Friday. It is always Friday.',
        ] },
        { period: 'afternoon', areaId: 'marcus-house', col: 5, row: 6, lines: [
          'Marcus: Home early. Cleared the table off and everything.',
        ] },
        { period: 'evening', areaId: 'marcus-house', col: 5, row: 6, lines: [
          'Marcus: Door is open. Chairs are out.',
          'Marcus: I am not saying I will win. I am saying I will be there.',
        ] },
        { period: 'night', areaId: 'marcus-house', col: 5, row: 6, lines: [
          'Marcus: Still up. Cannot sleep after a session. You know how it is.',
        ] },
      ],
    },
  },
  dana: {
    name: 'Dana',
    style: 'Quiet. Watches everything.',
    look: { skin: '#e0b48c', hair: '#5c3a22', hairStyle: 'tied', shirt: '#b56576', accessory: 'none' },
    lines: {
      greeting: ['Dana: Deal them.'],
      raise: ['Dana: Raise.', 'Dana: More.'],
      call: ['Dana: I call.'],
      fold: ['Dana: No.'],
      win: ['Dana: Mm.'],
      lose: ['Dana: Hm. Noted.'],
    },
    overworld: {
      // She is at the laundromat because it is warm and nobody asks her anything.
      lines: ['Dana: Mm.'],
      schedule: [
        { period: 'morning', areaId: 'laundromat', col: 8, row: 4, lines: [
          'Dana: Dryer four is the only one that works. Now you know.',
        ] },
        { period: 'afternoon', areaId: 'seventh', col: 12, row: 9, lines: [
          'Dana: You played Tuesday. You raised the river with nothing.',
          'Dana: I watch. That is all. It costs nothing to watch.',
        ] },
        { period: 'evening', areaId: 'diner', col: 13, row: 1, lines: [
          'Dana: Coffee. Corner booth. Back to the wall.',
        ] },
      ],
    },
  },
  ray: {
    name: 'Ray',
    style: 'Plays every hand he is dealt.',
    look: { skin: '#c78a5e', hair: '#7a7a7a', hairStyle: 'bald', shirt: '#7a8b5a', accessory: 'cap' },
    seat: { skillTier: 'novice', archetype: 'station' },
    lines: {
      greeting: ['Ray: I am due. I can feel it.'],
      raise: ['Ray: Why not!', 'Ray: Let us find out.'],
      call: ['Ray: I have come this far.', 'Ray: Curiosity call.'],
      fold: ['Ray: ...this one time.'],
      win: ['Ray: TOLD you I was due!'],
      lose: ['Ray: Bah. Next one.'],
    },
    overworld: {
      lines: ['Ray: I am due. I can feel it.'],
      schedule: [
        { period: 'afternoon', areaId: 'sc-street', col: 18, row: 9, lines: [
          'Ray: Heading in. You heading in?',
        ] },
        { period: 'evening', areaId: 'sc-street', col: 18, row: 9, lines: [
          'Ray: Down a bit. It is early.',
        ] },
        { period: 'night', areaId: 'sc-street', col: 18, row: 9, lines: [
          'Ray: Down a lot. It is late.',
          'Ray: Tomorrow, though. Tomorrow I am due.',
        ] },
      ],
    },
  },
  sully: {
    name: 'Sully',
    style: 'Grinds small pots.',
    look: { skin: '#6f4429', hair: '#191919', hairStyle: 'short', shirt: '#4a6b8a', accessory: 'glasses' },
    seat: { skillTier: 'amateur', archetype: 'nit' },
    lines: {
      greeting: ['Sully: Evening.'],
      raise: ['Sully: Bump it.'],
      call: ['Sully: Price is right.'],
      fold: ['Sully: Not at that price.'],
      win: ['Sully: Appreciated.'],
      lose: ['Sully: Well played.'],
    },
    overworld: {
      lines: ['Sully: Working.'],
      schedule: [
        { period: 'morning', areaId: 'sc-street', col: 11, row: 14, lines: [
          'Sully: In early. Out early. That is the whole trick.',
        ] },
        { period: 'afternoon', areaId: 'sc-street', col: 11, row: 14, lines: [
          'Sully: Up forty. I will take forty.',
        ] },
      ],
    },
  },
  deb: {
    name: 'Deb',
    style: 'Been here longer than you.',
    look: { skin: '#d8a077', hair: '#8a5a2b', hairStyle: 'long', shirt: '#9c6644', accessory: 'earring' },
    seat: { skillTier: 'amateur', archetype: 'regular' },
    lines: {
      greeting: ['Deb: You are new. That is fine. Everyone is, once.'],
      raise: ['Deb: Raise, sweetheart.'],
      call: ['Deb: Call. Show me.'],
      fold: ['Deb: All yours.'],
      win: ['Deb: Told you I have been here longer.'],
      lose: ['Deb: Alright. That was good.'],
    },
    overworld: {
      lines: ['Deb: Been here longer than you.'],
      schedule: [
        { period: 'morning', areaId: 'rb-street', col: 9, row: 7, lines: [
          'Deb: Boat does not open till noon. Everyone forgets that.',
        ] },
        { period: 'evening', areaId: 'rb-street', col: 9, row: 7, lines: [
          'Deb: Busy tonight. Good. Busy is good for me.',
        ] },
      ],
    },
  },
  mack: {
    name: 'Mack',
    style: 'Tight. Waits for a hand.',
    look: { skin: '#c08a5e', hair: '#2b2118', hairStyle: 'short', shirt: '#3d4a5c', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'nit' },
    lines: {
      greeting: ['Mack: Let us keep it civil.'],
      raise: ['Mack: Raise.'],
      call: ['Mack: Call.'],
      fold: ['Mack: Fold. Easy.'],
      win: ['Mack: That is why I waited.'],
      lose: ['Mack: Hm.'],
    },
    overworld: {
      lines: ['Mack: Waiting on a hand. Same as always.'],
      schedule: [
        { period: 'afternoon', areaId: 'rb-street', col: 20, row: 12, lines: [
          'Mack: I fold all afternoon so I can play one hand right.',
        ] },
        { period: 'night', areaId: 'rb-street', col: 20, row: 12, lines: [
          'Mack: One hand. That is all it took. Goodnight.',
        ] },
      ],
    },
  },
  tiny: {
    name: 'Tiny',
    style: 'Has not folded since noon.',
    look: { skin: '#e8b98f', hair: '#c24a2b', hairStyle: 'short', shirt: '#d9a441', accessory: 'none' },
    seat: { skillTier: 'novice', archetype: 'whale', stackMultiplier: 2 },
    lines: {
      greeting: ['Tiny: HERE we go. I love this table.'],
      raise: ['Tiny: Let us make it interesting!', 'Tiny: RAISE. Why not!'],
      call: ['Tiny: Call! Obviously call.', 'Tiny: I am not folding, are you kidding?'],
      fold: ['Tiny: ...fine. FINE.'],
      win: ['Tiny: HA! Drinks on me!'],
      lose: ['Tiny: Ohh, that is beautiful. Deal again!'],
    },
  },
  corinne: {
    name: 'Corinne',
    style: 'Does this for a living.',
    look: { skin: '#e3bb95', hair: '#3b2a1c', hairStyle: 'tied', shirt: '#5c5470', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'regular' },
    lines: {
      greeting: ['Corinne: You are in my game now.'],
      raise: ['Corinne: Raise.', 'Corinne: I do not mind a bigger pot.'],
      call: ['Corinne: Call.'],
      fold: ['Corinne: Take it.'],
      win: ['Corinne: Thank you.'],
      lose: ['Corinne: Mm. You had it.'],
    },
  },
  vance: {
    name: 'Vance',
    style: 'Thinks about it too long.',
    look: { skin: '#a8673f', hair: '#1c1c1c', hairStyle: 'short', shirt: '#2f6b5c', accessory: 'glasses' },
    seat: { skillTier: 'competent', archetype: 'station' },
    lines: {
      greeting: ['Vance: Give me a second to settle in.'],
      raise: ['Vance: ...raise.'],
      call: ['Vance: Call, I suppose.'],
      fold: ['Vance: I do not like it. Fold.'],
      win: ['Vance: Good. Good.'],
      lose: ['Vance: I knew it. I knew it and I called anyway.'],
    },
    personas: {
      // The heads-up match against the same man. Shorter-handed and one on one, he
      // has nowhere to hide, and he knows it.
      headsUp: {
        style: 'Thinks about it too long. Worse one on one.',
        lines: {
          greeting: ['Vance: Just the two of us. Right. Fine.'],
          bet: ['Vance: Bet. I think. Yes, bet.'],
          check: ['Vance: Check. I am not committing to anything yet.'],
          raise: ['Vance: Raise. No, I mean it this time.'],
          call: ['Vance: Call. I have to see it.'],
          fold: ['Vance: Take it. I cannot do this all night.'],
          win: ['Vance: There. I do know how to do this.'],
          lose: ['Vance: Every time. Every single time with you.'],
        },
      },
    },
  },
  hollis: {
    name: 'Hollis',
    style: 'Third buy-in tonight.',
    look: { skin: '#f0c9a0', hair: '#d8d0c0', hairStyle: 'short', shirt: '#b5532f', accessory: 'none' },
    seat: { skillTier: 'amateur', archetype: 'whale', stackMultiplier: 2 },
    lines: {
      greeting: ['Hollis: Do not worry about me. I am having fun.'],
      raise: ['Hollis: More! More.'],
      call: ['Hollis: Sure, call.', 'Hollis: I want to see it.'],
      fold: ['Hollis: Eh.'],
      win: ['Hollis: There we are! Back in it.'],
      lose: ['Hollis: Ohh. Another one. Rack me up again.'],
    },
  },
  delphine: {
    name: 'Delphine',
    style: 'Runs the back room.',
    look: { skin: '#7a4b2e', hair: '#141414', hairStyle: 'long', shirt: '#1f1f2e', accessory: 'earring' },
    seat: { skillTier: 'sharp', archetype: 'regular' },
    lines: {
      greeting: ['Delphine: I invited you. Do not embarrass me.'],
      raise: ['Delphine: Raise.'],
      call: ['Delphine: I call.'],
      fold: ['Delphine: Yours.'],
      win: ['Delphine: As expected.'],
      lose: ['Delphine: Good. Genuinely.'],
    },
  },
  otto: {
    name: 'Otto',
    style: 'Never folds. Ever.',
    look: { skin: '#dba97e', hair: '#6b5a3a', hairStyle: 'bald', shirt: '#7a5c9e', accessory: 'none' },
    seat: { skillTier: 'amateur', archetype: 'whale', stackMultiplier: 3 },
    lines: {
      greeting: ['Otto: I am only here for the company.'],
      raise: ['Otto: Up!'],
      call: ['Otto: Call, call, call.'],
      fold: ['Otto: This is unusual for me.'],
      win: ['Otto: Oh! Marvellous.'],
      lose: ['Otto: Well spent.'],
    },
  },
  adaeze: {
    name: 'Adaeze',
    style: 'Patient. Punishes mistakes.',
    look: { skin: '#66402a', hair: '#141414', hairStyle: 'tied', shirt: '#2f7a6b', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'nit' },
    lines: {
      greeting: ['Adaeze: Take your time. I have all week.'],
      raise: ['Adaeze: Raise.'],
      call: ['Adaeze: Call.'],
      fold: ['Adaeze: Not this one.'],
      win: ['Adaeze: Thank you kindly.'],
      lose: ['Adaeze: That was well done.'],
    },
  },
  kit: {
    name: 'Kit',
    style: 'Aggressive. Very good.',
    look: { skin: '#eac6a0', hair: '#c9a227', hairStyle: 'short', shirt: '#1f1f2e', accessory: 'shades' },
    seat: { skillTier: 'sharp', archetype: 'maniac' },
    lines: {
      greeting: ['Kit: Let us not waste each other’s afternoon.'],
      raise: ['Kit: Raise.', 'Kit: Pressure.'],
      call: ['Kit: Call.'],
      fold: ['Kit: Have it.'],
      win: ['Kit: Predictable.'],
      lose: ['Kit: Huh. Alright.'],
    },
    personas: {
      returning: {
        lines: {
          greeting: ['Kit: You again.'],
          raise: ['Kit: Raise.'],
        },
      },
    },
  },
  rosa: {
    name: 'Rosa',
    style: 'Knows everyone on the island.',
    look: { skin: '#c98b5f', hair: '#4a2c1a', hairStyle: 'long', shirt: '#d96c6c', accessory: 'none' },
    seat: { skillTier: 'amateur', archetype: 'regular' },
    lines: {
      greeting: ['Rosa: Bernard is the one you want. Not me.'],
      raise: ['Rosa: Raise.'],
      call: ['Rosa: Call.'],
      fold: ['Rosa: Nope.'],
      win: ['Rosa: Sorry! Not sorry.'],
      lose: ['Rosa: Ah, you got me.'],
    },
  },
  bernard: {
    name: 'Bernard',
    style: 'Two days at this table.',
    look: { skin: '#f2cfa8', hair: '#b8b8b8', hairStyle: 'short', shirt: '#4a9dd9', accessory: 'visor' },
    seat: { skillTier: 'novice', archetype: 'whale', stackMultiplier: 3 },
    lines: {
      greeting: ['Bernard: Is it Thursday? Someone said it was Thursday.'],
      raise: ['Bernard: I raise! Is that right? I raise.'],
      call: ['Bernard: Call. I always call.', 'Bernard: I want to SEE it.'],
      fold: ['Bernard: Hm? Oh. Fold, then.'],
      win: ['Bernard: Oh, lovely! Another round!'],
      lose: ['Bernard: Ha! Wonderful. Again.'],
    },
  },
  lorna: {
    name: 'Lorna',
    style: 'Studied. Relentless.',
    look: { skin: '#e6c0a0', hair: '#2a2a2a', hairStyle: 'short', shirt: '#3a3a56', accessory: 'none' },
    seat: { skillTier: 'sharp', archetype: 'regular' },
    lines: {
      greeting: ['Lorna: Solver line or feel? We will find out.'],
      raise: ['Lorna: Raise.'],
      call: ['Lorna: Call.'],
      fold: ['Lorna: Fold.'],
      win: ['Lorna: Standard.'],
      lose: ['Lorna: Interesting line.'],
    },
    personas: {
      headsUp: {
        style: 'Heads-up specialist.',
        lines: {
          greeting: ['Lorna: One on one. No hiding.'],
          fold: ['Lorna: Yours.'],
          lose: ['Lorna: Good.'],
        },
      },
    },
  },
  dmitri: {
    name: 'Dmitri',
    style: 'Silent. Enormous stack.',
    look: { skin: '#d9b48f', hair: '#3a2a1a', hairStyle: 'short', shirt: '#22222e', accessory: 'shades' },
    seat: { skillTier: 'sharp', archetype: 'nit' },
    lines: {
      greeting: ['Dmitri: ...'],
      raise: ['Dmitri: Raise.'],
      call: ['Dmitri: Call.'],
      fold: ['Dmitri: No.'],
      win: ['Dmitri: Mm.'],
      lose: ['Dmitri: ...'],
    },
  },
  whitaker: {
    name: 'Whitaker',
    style: 'Rich. Cheerfully bad.',
    look: { skin: '#f0cba4', hair: '#a89878', hairStyle: 'short', shirt: '#8a5c2f', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
    lines: {
      greeting: ['Whitaker: I am told I am a fish. I think that is rude.'],
      raise: ['Whitaker: Let us liven it up.'],
      call: ['Whitaker: Call! I am invested now.'],
      fold: ['Whitaker: Reluctantly.'],
      win: ['Whitaker: Ha! See, not a fish.'],
      lose: ['Whitaker: Fine. Fine! Another.'],
    },
  },
  saul: {
    name: 'Saul',
    style: 'Old school. Sharp.',
    look: { skin: '#c99a6e', hair: '#c8c8c8', hairStyle: 'bald', shirt: '#4a4a5c', accessory: 'glasses' },
    seat: { skillTier: 'sharp', archetype: 'nit' },
    lines: {
      greeting: ['Saul: Forty years I have sat in this seat.'],
      raise: ['Saul: Raise.'],
      call: ['Saul: I will look you up.'],
      fold: ['Saul: Too rich.'],
      win: ['Saul: Experience.'],
      lose: ['Saul: Good for you, kid.'],
    },
  },
  priya: {
    name: 'Priya',
    style: 'Best player in the room.',
    look: { skin: '#8a5a38', hair: '#141414', hairStyle: 'long', shirt: '#2f2f4a', accessory: 'none' },
    seat: { skillTier: 'elite', archetype: 'regular' },
    lines: {
      greeting: ['Priya: I will be honest, I have looked you up.'],
      raise: ['Priya: Raise.'],
      call: ['Priya: Call.'],
      fold: ['Priya: Fold.'],
      win: ['Priya: Thank you.'],
      lose: ['Priya: That was the right line.'],
    },
  },
  august: {
    name: 'August',
    style: 'Runs the invitational.',
    look: { skin: '#e0b48c', hair: '#5a5a5a', hairStyle: 'short', shirt: '#1a1a28', accessory: 'none' },
    seat: { skillTier: 'elite', archetype: 'nit' },
    lines: {
      greeting: ['August: You are here because someone vouched. Remember that.'],
      raise: ['August: Raise.'],
      call: ['August: Call.'],
      fold: ['August: Take it.'],
      win: ['August: Naturally.'],
      lose: ['August: Hm. Good.'],
    },
  },
  rhodes: {
    name: 'Rhodes',
    style: 'A philanthropist, allegedly.',
    look: { skin: '#f0cba4', hair: '#8a7a5a', hairStyle: 'bald', shirt: '#9e2f2f', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'whale', stackMultiplier: 4 },
    lines: {
      greeting: ['Rhodes: I am not very good. I am very rich. It balances.'],
      raise: ['Rhodes: Why not, raise.'],
      call: ['Rhodes: Call. Always call.'],
      fold: ['Rhodes: Hm, no.'],
      win: ['Rhodes: Oh! Splendid.'],
      lose: ['Rhodes: Worth every penny.'],
    },
  },
  xue: {
    name: 'Xue',
    style: 'Nosebleed regular.',
    look: { skin: '#e8c09a', hair: '#141414', hairStyle: 'short', shirt: '#1f2e3a', accessory: 'none' },
    seat: { skillTier: 'elite', archetype: 'maniac' },
    lines: {
      greeting: ['Xue: We play big here. I hope you understand that.'],
      raise: ['Xue: Raise.'],
      call: ['Xue: Call.'],
      fold: ['Xue: No.'],
      win: ['Xue: Good.'],
      lose: ['Xue: Well played.'],
    },
  },
  marchetti: {
    name: 'Marchetti',
    style: 'Never shows a hand.',
    look: { skin: '#d0a070', hair: '#2a2018', hairStyle: 'short', shirt: '#2a2a2a', accessory: 'shades' },
    seat: { skillTier: 'elite', archetype: 'nit' },
    lines: {
      greeting: ['Marchetti: Pleasure.'],
      raise: ['Marchetti: Raise.'],
      call: ['Marchetti: Call.'],
      fold: ['Marchetti: Yours.'],
      win: ['Marchetti: Grazie.'],
      lose: ['Marchetti: Bravo.'],
    },
  },
  kingsley: {
    name: 'Kingsley',
    style: 'Here to be seen losing.',
    look: { skin: '#f2d0ad', hair: '#c0a060', hairStyle: 'short', shirt: '#6b2f7a', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'whale', stackMultiplier: 2 },
    lines: {
      greeting: ['Kingsley: My accountant hates this room.'],
      raise: ['Kingsley: Up it!'],
      call: ['Kingsley: Call, of course.'],
      fold: ['Kingsley: Must I?'],
      win: ['Kingsley: HA! Photograph that.'],
      lose: ['Kingsley: Marvellous. Again!'],
    },
  },
  nadia: {
    name: 'Nadia Okonkwo',
    style: 'Four years in the penthouse.',
    look: { skin: '#5e3a22', hair: '#0f0f0f', hairStyle: 'tied', shirt: '#101018', accessory: 'none' },
    seat: { skillTier: 'elite', archetype: 'regular' },
    lines: {
      greeting: [
        'Nadia: I have watched you come up. It has been a pleasure.',
        'Nadia: Let us see if it was worth watching.',
      ],
      raise: ['Nadia: Raise.', 'Nadia: I think you will fold.'],
      call: ['Nadia: Call.', 'Nadia: I do not believe you.'],
      fold: ['Nadia: Take it. That one was yours.'],
      win: ['Nadia: The room stays mine, then.'],
      lose: ['Nadia: ...that was very good.'],
    },
  },
}

/** Everything the felt needs about one seat: who they are and how they talk. */
export interface Personality {
  name: string
  style: string
  look: AvatarLook
  lines: TableLines
}

/**
 * The character behind a seat, with their missing lines filled in.
 *
 * `personaId` picks one of their alternate ways of talking — see `Persona`.
 * Unknown ids fall back to a blank stranger rather than throwing, because a seat
 * with no character is a content bug, not a reason to blank the screen
 * mid-session.
 */
export function personalityFor(id: string, personaId?: string): Personality {
  const character = CHARACTERS[id]
  if (!character) {
    return { name: id, style: '', look: FALLBACK_LOOK, lines: DEFAULT_LINES }
  }
  const persona = personaId ? character.personas?.[personaId] : undefined
  return {
    name: character.name,
    style: persona?.style ?? character.style,
    look: character.look,
    lines: { ...DEFAULT_LINES, ...character.lines, ...persona?.lines },
  }
}

const FALLBACK_LOOK: AvatarLook = {
  skin: '#c89f78',
  hair: '#3a2a1a',
  hairStyle: 'short',
  shirt: '#4a4a5a',
  accessory: 'none',
}

/**
 * The seats at a table, with each character looked up.
 *
 * Tables name characters; this is where a name becomes a player — their tier,
 * their archetype and how deep they sit down. A seat naming a character who does
 * not exist is a content bug, and `content.test.ts` fails on it rather than
 * letting a nameless stranger appear on the felt.
 */
export function seatsOf(table: TableDef): OpponentDef[] {
  return table.opponents.map((ref) => {
    const id = typeof ref === 'string' ? ref : ref.character
    const persona = typeof ref === 'string' ? undefined : ref.persona
    const character = CHARACTERS[id]
    if (!character?.seat) {
      throw new Error(`table "${table.id}" seats "${id}", who is not a character who plays`)
    }
    return { id, name: character.name, ...character.seat, ...(persona ? { persona } : {}) }
  })
}


/**
 * Everybody who is standing in this area at this hour.
 *
 * Looked up per area and per period rather than kept as moving state, because a
 * schedule is a statement about where somebody *is*, not a simulation of them
 * walking there. It costs nothing while you are not looking, it cannot drift out
 * of step with the clock, and a save holds the hour rather than everyone's
 * coordinates.
 */
export function charactersIn(areaId: string, period: TimePeriod): Array<{
  id: string
  character: CharacterDef
  at: ScheduleEntry
}> {
  const here = []
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const at = character.overworld?.schedule.find(
      (entry) => entry.areaId === areaId && entry.period === period,
    )
    if (at) here.push({ id, character, at })
  }
  return here
}

/** Every period a character is somewhere, for checking nobody is in two places. */
export function scheduleConflicts(): string[] {
  const seen = new Map<string, string>()
  const problems: string[] = []
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const periods = new Set<TimePeriod>()
    for (const entry of character.overworld?.schedule ?? []) {
      if (periods.has(entry.period)) {
        problems.push(`${id} is in two places at once in the ${entry.period}`)
      }
      periods.add(entry.period)
      const key = `${entry.areaId}:${entry.period}:${entry.col},${entry.row}`
      const other = seen.get(key)
      if (other) problems.push(`${id} and ${other} stand on the same tile in the ${entry.period}`)
      seen.set(key, id)
    }
  }
  return problems
}

/** Periods a character has nowhere to be, so you can tell a gap from an oversight. */
export function periodsAway(character: CharacterDef): TimePeriod[] {
  const scheduled = new Set(character.overworld?.schedule.map((e) => e.period))
  return TIME_PERIODS.filter((period) => !scheduled.has(period))
}
