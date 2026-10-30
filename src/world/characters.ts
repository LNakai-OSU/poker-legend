import type { AvatarLook } from '../game/avatars'
import type { Archetype, SkillTier } from '../engine/types'
import type { OpponentDef, TableDef } from './types'
import type { NpcArt } from '../overworld/Npc'
import type { NpcRole, PersonLook } from '../overworld/characterArt'
import { TIME_PERIODS, type TimePeriod } from '../game/time'
import type { GameState } from '../game/state'
import { allHold, type EventCondition } from './events'

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
  /**
   * A uniform, if they wear one in the street. Without it they are in their own
   * clothes: their `look`'s shirt, the same person you sit across from.
   */
  role?: NpcRole
  /**
   * What the street shows that a table portrait does not: trousers, shoes, a
   * skirt. Laid over `look`; generated from their id where left out.
   */
  look?: Partial<PersonLook>
  /** What they say when you have nothing more specific for the hour. */
  lines: string[]
  /** Where they are through the day. An empty schedule means they are nowhere. */
  schedule: ScheduleEntry[]
  /**
   * Where the story takes them later.
   *
   * A schedule used to be forever: Marcus was in Basin on the last day of the
   * game exactly as on the first, so nobody you met could come up the ladder
   * with you. A chapter is a whole day somewhere else, from the moment its
   * conditions hold — usually how far the run has got. The last chapter whose
   * conditions hold replaces `schedule`, so the list reads as a timeline: later
   * in the story is lower down.
   */
  chapters?: ScheduleChapter[]
}

/** Part of somebody's story: where they spend their days once it has begun. */
export interface ScheduleChapter {
  /** When this part of the story applies. All must hold. */
  when: EventCondition[]
  /** Where they are at each hour of it. Hours left out, they are nowhere. */
  schedule: ScheduleEntry[]
  /** What they say when the hour has nothing more specific. Falls back to their usual lines. */
  lines?: string[]
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
      // Straight from work: overalls over the shirt he plays in.
      look: { garment: 'overalls', garmentColor: '#3a5a8a', trousers: '#3a5a8a', shoes: '#5a3a22' },
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
      // The friend you leave behind, who comes to see whether it is true, and is
      // at the rail for the match. See docs/STORYBOARD.md.
      chapters: [
        {
          // The day of the first game, before Dana has brought you: he has the
          // morning off to get the front room ready and is out for ice, so he
          // is not standing in the street Dana runs up.
          when: [
            { kind: 'eventDone', eventId: 'dana-walks-you-to-the-bus', done: false },
            { kind: 'eventDone', eventId: 'dana-at-the-depot', done: false },
            { kind: 'flag', flag: 'wonPokerNight', set: false },
            { kind: 'eventDone', eventId: 'poker-night', done: false },
          ],
          schedule: [
            { period: 'afternoon', areaId: 'marcus-house', col: 5, row: 6, lines: [
              'Marcus: You made it! Dana found you, then. She finds everybody.',
            ] },
            { period: 'evening', areaId: 'marcus-house', col: 5, row: 6, lines: [
              'Marcus: Door is open. Chairs are out.',
            ] },
            { period: 'night', areaId: 'marcus-house', col: 5, row: 6, lines: [
              'Marcus: Still up. Cannot sleep before a session. You know how it is.',
            ] },
          ],
        },
        {
          // A week off, at the midpoint. Home again once you have gone on.
          when: [{ kind: 'chapter', cityId: 'palmCay' }, { kind: 'flag', flag: 'wonPokerNight' }],
          lines: ['Marcus: Four drinks with umbrellas in. I regret nothing.'],
          schedule: [
            { period: 'morning', areaId: 'pc-street', col: 13, row: 7 },
            { period: 'afternoon', areaId: 'pc-street', col: 13, row: 7 },
            { period: 'evening', areaId: 'pc-grill', col: 5, row: 3, lines: [
              'Marcus: They brought me a fish with its face on. I have named him.',
            ] },
          ],
        },
        {
          // Nadia sends a car for him once she has named the match.
          when: [{ kind: 'chapter', cityId: 'portoLumina' }, { kind: 'eventDone', eventId: 'nadia-names-the-match' }],
          lines: ['Marcus: I am at the rail. That is the rule.'],
          schedule: [
            { period: 'afternoon', areaId: 'pl-street', col: 12, row: 6 },
            { period: 'evening', areaId: 'pl-casino', col: 12, row: 8 },
            { period: 'night', areaId: 'pl-casino', col: 12, row: 8 },
          ],
        },
        {
          when: [{ kind: 'flag', flag: 'hasPenthouse' }],
          lines: ['Marcus: Winner hosts. Those are the rules.'],
          schedule: [
            { period: 'morning', areaId: 'pl-lift', col: 4, row: 4 },
            { period: 'afternoon', areaId: 'pl-lift', col: 4, row: 4 },
            { period: 'evening', areaId: 'pl-lift', col: 4, row: 4 },
            { period: 'night', areaId: 'pl-lift', col: 4, row: 4 },
          ],
        },
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
      look: { garment: 'cardigan', garmentColor: '#4a4a54', lower: 'skirt', trousers: '#2e2e36' },
      lines: ['Dana: Mm.'],
      schedule: [
        { period: 'morning', areaId: 'laundromat', col: 8, row: 4, lines: [
          'Dana: Dryer four is the only one that works. Now you know.',
        ] },
        { period: 'afternoon', areaId: 'seventh', col: 12, row: 11, lines: [
          'Dana: You played Tuesday. You raised the river with nothing.',
          'Dana: I watch. That is all. It costs nothing to watch.',
        ] },
        { period: 'evening', areaId: 'diner', col: 12, row: 5, lines: [
          'Dana: Coffee. Corner booth. Back to the wall.',
        ] },
      ],
      // Wherever you play next, she is already in the corner of it — because she
      // is writing to Nadia about you. Revealed in Porto Lumina (`dana-reveal`).
      chapters: [
        {
          // The night of the first game. She went in ahead of you, and has the
          // chair by the window at Marcus's table until she walks you home
          // (`dana-walks-you-home`). Mornings she is at the laundromat as ever.
          when: [
            { kind: 'chapter', cityId: 'apartment' },
            { kind: 'flag', flag: 'metDana' },
            { kind: 'eventDone', eventId: 'dana-walks-you-home', done: false },
          ],
          schedule: [
            { period: 'morning', areaId: 'laundromat', col: 8, row: 4, lines: [
              'Dana: Dryer four is the only one that works. Now you know.',
            ] },
            { period: 'afternoon', areaId: 'marcus-house', col: 9, row: 5, lines: [
              'Dana: He has been talking about this game all week.',
              'Dana: He is going to lose. He always loses.',
            ] },
            { period: 'evening', areaId: 'marcus-house', col: 9, row: 5, lines: [
              'Dana: He has been talking about this game all week.',
              'Dana: He is going to lose. He always loses.',
            ] },
            { period: 'night', areaId: 'marcus-house', col: 9, row: 5, lines: [
              'Dana: He is going to lose. He always loses.',
            ] },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'silverCreek' }],
          lines: ['Dana: I go where the games are.'],
          schedule: [
            { period: 'evening', areaId: 'sc-floor', col: 17, row: 7 },
            { period: 'night', areaId: 'sc-floor', col: 17, row: 7 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'riverbend' }],
          lines: ['Dana: A bar on a boat that does not move. My kind of place.'],
          schedule: [
            { period: 'evening', areaId: 'rb-boat', col: 19, row: 3 },
            { period: 'night', areaId: 'rb-boat', col: 19, row: 3 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'crescentHarbor' }],
          lines: ['Dana: Corner table. Back to the wall. Some things do not change.'],
          schedule: [
            { period: 'evening', areaId: 'ch-supper', col: 12, row: 3 },
            { period: 'night', areaId: 'ch-club', col: 13, row: 4 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'palmCay' }],
          lines: ['Dana: Marcus is here. He does not know I am. Let us keep it that way.'],
          schedule: [{ period: 'night', areaId: 'pc-casino', col: 9, row: 8 }],
        },
        {
          when: [{ kind: 'chapter', cityId: 'neonMesa' }],
          lines: ['Dana: Loud in here. Good. Nobody hears anything.'],
          schedule: [
            { period: 'evening', areaId: 'nm-club', col: 13, row: 4 },
            { period: 'night', areaId: 'nm-club', col: 13, row: 4 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'portoLumina' }],
          lines: ['Dana: Go and say hello to her. She has waited a long time for somebody worth it.'],
          schedule: [
            { period: 'evening', areaId: 'pl-casino', col: 16, row: 7 },
            { period: 'night', areaId: 'pl-casino', col: 16, row: 7 },
          ],
        },
        {
          when: [{ kind: 'flag', flag: 'hasPenthouse' }],
          lines: ['Dana: Somebody, somewhere, is sitting down at a kitchen table tonight.'],
          schedule: [
            { period: 'afternoon', areaId: 'pl-lift', col: 11, row: 4 },
            { period: 'evening', areaId: 'pl-lift', col: 11, row: 4 },
            { period: 'night', areaId: 'pl-lift', col: 11, row: 4 },
          ],
        },
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
      // A windbreaker he has had since the casino gave them away.
      look: { garment: 'jacket', garmentColor: '#a8603a', sleeves: 'long' },
      lines: ['Ray: I am due. I can feel it.'],
      schedule: [
        { period: 'afternoon', areaId: 'sc-street', col: 18, row: 7, lines: [
          'Ray: Heading in. You heading in?',
        ] },
        { period: 'evening', areaId: 'sc-street', col: 18, row: 7, lines: [
          'Ray: Down a bit. It is early.',
        ] },
        { period: 'night', areaId: 'sc-street', col: 18, row: 7, lines: [
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
      look: { garment: 'vest', garmentColor: '#2e2e36', sleeves: 'short' },
      lines: ['Sully: Working.'],
      schedule: [
        { period: 'morning', areaId: 'sc-street', col: 12, row: 13, lines: [
          'Sully: In early. Out early. That is the whole trick.',
        ] },
        { period: 'afternoon', areaId: 'sc-street', col: 12, row: 13, lines: [
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
      look: { garment: 'jacket', garmentColor: '#2a1e1a', lower: 'skirt', trousers: '#5a3a24' },
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
      look: { garment: 'hoodie', garmentColor: '#5a6a4a' },
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
  // --- The bosses -----------------------------------------------------------
  // One in every casino town, in the private room behind the floor. Each is a
  // better player than the one before (skill tiers climb a step a town) and none
  // is a palette swap: how they play, and how they lose, differs.
  lou: {
    name: 'Lou Brannigan',
    style: 'Owns the saloon. Never folds a hand he likes.',
    look: { skin: '#d9a47a', hair: '#8a8a8a', hairStyle: 'short', shirt: '#7a2e2e', accessory: 'cap' },
    seat: { skillTier: 'novice', archetype: 'station' },
    lines: {
      greeting: ['Lou: Sit. Thirty years I have been waiting for somebody worth the chair.'],
      raise: ['Lou: Up she goes.'],
      call: ['Lou: I will see that. I see everything.'],
      fold: ['Lou: Hm. Fine. Take it.'],
      check: ['Lou: Check. Do not read into it.'],
      win: ['Lou: That is how it is done, son.'],
      lose: ['Lou: Beginner’s luck. Has to be.'],
    },
  },
  odette: {
    name: 'Captain Odette Marsh',
    style: 'Runs the boat. Folds to nothing but trouble.',
    look: { skin: '#c68a62', hair: '#2a2a3a', hairStyle: 'tied', shirt: '#1d2f55', accessory: 'cap' },
    seat: { skillTier: 'amateur', archetype: 'nit' },
    lines: {
      greeting: ['Odette: The river keeps the ones who play badly. Sit down.'],
      raise: ['Odette: Raise. Mind the current.'],
      call: ['Odette: Call.'],
      fold: ['Odette: I am not paid to be brave. Yours.'],
      check: ['Odette: Check.'],
      win: ['Odette: Over the side with that one.'],
      lose: ['Odette: Hm. A leak below the waterline.'],
    },
  },
  bellamy: {
    name: 'Mr. Bellamy',
    style: 'The Harbor Room’s house man. Has read every book on you.',
    look: { skin: '#e7bd96', hair: '#3a3a3a', hairStyle: 'short', shirt: '#243a2e', accessory: 'glasses' },
    seat: { skillTier: 'competent', archetype: 'regular' },
    lines: {
      greeting: ['Bellamy: Please. Sit. I have read about you. It was brief.'],
      raise: ['Bellamy: A modest increase.'],
      call: ['Bellamy: I will pay to see it.'],
      fold: ['Bellamy: A sound fold is a gift to oneself.'],
      check: ['Bellamy: Check.'],
      win: ['Bellamy: As the book says.'],
      lose: ['Bellamy: …Noted.'],
    },
  },
  ines: {
    name: 'Inés Calloway',
    style: 'Owns the Cay Room. Raises first, asks later.',
    look: { skin: '#b9794f', hair: '#6b1d2a', hairStyle: 'long', shirt: '#0f6f6a', accessory: 'shades' },
    seat: { skillTier: 'sharp', archetype: 'maniac' },
    lines: {
      greeting: ['Inés: Darling. Sit. I do hope you brought enough.'],
      raise: ['Inés: Up, up, up!'],
      call: ['Inés: Oh, I am staying. I am always staying.'],
      fold: ['Inés: Take it, darling, you earned it. Barely.'],
      check: ['Inés: Check. Do not get comfortable.'],
      win: ['Inés: Kisses.'],
      lose: ['Inés: Oh, that stings. Do it again.'],
    },
  },
  vale: {
    name: 'Solomon Vale',
    style: 'The Mesa’s owner. Nobody has seen him bluff.',
    look: { skin: '#8a5a3a', hair: '#e6e6e6', hairStyle: 'bald', shirt: '#1a1a24', accessory: 'shades' },
    seat: { skillTier: 'elite', archetype: 'regular' },
    lines: {
      greeting: ['Vale: Sit. The cameras are off. I like to see how people actually play.'],
      raise: ['Vale: Raise.'],
      call: ['Vale: Call.'],
      fold: ['Vale: No.'],
      check: ['Vale: Check.'],
      win: ['Vale: Predictable. Not your fault.'],
      lose: ['Vale: Interesting.'],
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
    overworld: {
      // The rival: a town ahead of you, until the debt catches up. Nowhere at the
      // start — Kit is a rumour in Silver Creek and a face from Riverbend on.
      lines: ['Kit: Not now.'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'chapter', cityId: 'riverbend' }],
          lines: ['Kit: The boat leaves when it leaves. So do I.'],
          schedule: [
            { period: 'morning', areaId: 'rb-street', col: 26, row: 12 },
            { period: 'afternoon', areaId: 'rb-street', col: 26, row: 12 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'crescentHarbor' }],
          lines: ['Kit: Still no suit? Brave.'],
          schedule: [
            { period: 'evening', areaId: 'ch-street', col: 4, row: 6 },
            { period: 'night', areaId: 'ch-street', col: 4, row: 6 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'palmCay' }],
          lines: ['Kit: Working. Bernard is working too. He just does not know it.'],
          schedule: [
            { period: 'afternoon', areaId: 'pc-casino', col: 12, row: 4 },
            { period: 'evening', areaId: 'pc-casino', col: 12, row: 4 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'neonMesa' }],
          lines: ['Kit: Not now.'],
          schedule: [
            { period: 'morning', areaId: 'nm-street', col: 18, row: 9 },
            { period: 'night', areaId: 'nm-street', col: 18, row: 9 },
          ],
        },
        {
          when: [{ kind: 'chapter', cityId: 'portoLumina' }],
          lines: ['Kit: Next boat. Any boat.'],
          schedule: [
            { period: 'morning', areaId: 'pl-street', col: 26, row: 13 },
            { period: 'afternoon', areaId: 'pl-street', col: 26, row: 13 },
          ],
        },
        {
          when: [{ kind: 'flag', flag: 'hasPenthouse' }],
          lines: ['Kit: Remember I asked nicely.'],
          schedule: [
            { period: 'morning', areaId: 'pl-street', col: 26, row: 13 },
            { period: 'afternoon', areaId: 'pl-street', col: 26, row: 13 },
          ],
        },
      ],
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
  hal: {
    // The mentor. He sells lessons from a stool on Harbor Boulevard and again on
    // the Mesa Strip — those are POIs, and they take his face from here by name —
    // and turns up in Porto Lumina the night before the match, uninvited.
    name: 'Hal',
    style: 'Forty years in card rooms.',
    look: { skin: '#b98a62', hair: '#b8b8b0', hairStyle: 'short', shirt: '#6b5a44', accessory: 'glasses' },
    // He does not sit down any more. If anybody ever seats him, this is what he says.
    lines: { greeting: ['Hal: I do not play now. I watch other people play the way I taught them.'] },
    overworld: {
      lines: ['Hal: Position. Always position.'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'chapter', cityId: 'portoLumina' }],
          lines: ['Hal: Position. Pot odds. The person. In that order.'],
          schedule: [
            { period: 'evening', areaId: 'pl-street', col: 13, row: 6 },
            { period: 'night', areaId: 'pl-street', col: 13, row: 6 },
          ],
        },
        {
          when: [{ kind: 'flag', flag: 'hasPenthouse' }],
          lines: ['Hal: Well played. I mean that, which I rarely do.'],
          schedule: [{ period: 'morning', areaId: 'pl-lift', col: 9, row: 5 }],
        },
      ],
    },
  },
  // ---------------------------------------------------------------------------
  // The sponsors and the people they send. A sponsor is a menu at a fixture —
  // these give Cass and Mr. Emeka a face that turns up again once you have paid
  // them, and give each collector a face before the chase. While you owe a
  // sponsor on time, their collector stands beside them; once the stake runs out
  // they are the one coming down the street (`collector` in npcs.ts), and the
  // `caught` beats in events.ts are their lines. See docs/STORYBOARD.md.
  // ---------------------------------------------------------------------------
  cass: {
    name: 'Cass',
    style: 'Stakes players off the Riverbend dock.',
    look: { skin: '#c68e62', hair: '#2a1a12', hairStyle: 'tied', shirt: '#2f5d62', accessory: 'earring' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Cass: I do not play. I back people who do.'] },
    overworld: {
      // A river woman's coat, not a banker's suit. She lends from a bait shed.
      role: 'local',
      look: { garment: 'jacket', garmentColor: '#3a3a2e', trousers: '#2e2e26', sleeves: 'long' },
      lines: ['Cass: Nobody pays me back. You did.'],
      schedule: [],
      chapters: [
        {
          // Paid her back, and she comes to watch what that looks like at the top.
          when: [{ kind: 'chapter', cityId: 'portoLumina' }, { kind: 'count', of: 'repaid', sponsorId: 'cass' }],
          lines: ['Cass: Watching my investment. It is a long way from the dock.'],
          schedule: [
            { period: 'evening', areaId: 'pl-casino', col: 8, row: 8 },
            { period: 'night', areaId: 'pl-casino', col: 8, row: 8 },
          ],
        },
      ],
    },
  },
  emeka: {
    name: 'Mr. Emeka',
    style: 'Backs patient players.',
    look: { skin: '#4a2c1a', hair: '#1a1a1a', hairStyle: 'bald', shirt: '#e8e2d0', accessory: 'glasses' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Mr. Emeka: I do not sit down. I invest in people who do.'] },
    overworld: {
      role: 'suit',
      lines: ['Mr. Emeka: Patient. I said I liked patient.'],
      schedule: [],
      chapters: [
        {
          // Paid back, he turns up on the Strip with a new player and an opinion.
          when: [{ kind: 'chapter', cityId: 'neonMesa' }, { kind: 'count', of: 'repaid', sponsorId: 'emeka' }],
          lines: ['Mr. Emeka: My new player is not patient. I am working on him.'],
          schedule: [
            { period: 'afternoon', areaId: 'nm-street', col: 22, row: 8 },
            { period: 'evening', areaId: 'nm-street', col: 22, row: 8 },
          ],
        },
      ],
    },
  },
  dutch: {
    name: 'Dutch',
    style: "Cass's brother-in-law. Collects for her.",
    look: { skin: '#e0b088', hair: '#9a6a32', hairStyle: 'short', shirt: '#5a6a3a', accessory: 'cap' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Dutch: Me? No. I just hold the coats.'] },
    overworld: {
      // A yellow slicker in all weathers: the river is always about to happen.
      look: { garment: 'jacket', garmentColor: '#d4a51c', trousers: '#3a3a30', sleeves: 'long' },
      lines: ['Dutch: Just here for the view. Lovely day for it. Three days, she said?'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'debt', sponsorId: 'cass', status: 'owing' }],
          schedule: [
            { period: 'morning', areaId: 'rb-street', col: 6, row: 8 },
            { period: 'afternoon', areaId: 'rb-street', col: 6, row: 8 },
            { period: 'evening', areaId: 'rb-street', col: 6, row: 8 },
          ],
        },
      ],
    },
  },
  abel: {
    name: 'Abel',
    style: "Mr. Emeka's man. Very polite.",
    look: { skin: '#6b4226', hair: '#141414', hairStyle: 'short', shirt: '#3a4a6a', accessory: 'none' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Abel: I do not play, thank you. I keep count.'] },
    overworld: {
      role: 'suit',
      lines: ['Abel: Mr. Emeka hopes you are well. He asked me to hope it too.'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'debt', sponsorId: 'emeka', status: 'owing' }],
          schedule: [
            { period: 'afternoon', areaId: 'ch-street', col: 8, row: 12 },
            { period: 'evening', areaId: 'ch-street', col: 8, row: 12 },
            { period: 'night', areaId: 'ch-street', col: 8, row: 12 },
          ],
        },
      ],
    },
  },
  lowe: {
    name: 'Mr. Lowe',
    style: 'One of the Consortium’s two men. The one who talks.',
    look: { skin: '#d8b49a', hair: '#5a5a5a', hairStyle: 'short', shirt: '#2a2a32', accessory: 'shades' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Mr. Lowe: We do not play. We collect.'] },
    overworld: {
      // The Consortium's men dress identically. That is the point of them.
      role: 'collector',
      lines: ['Mr. Lowe: We are not here. You will know when we are here.'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'debt', sponsorId: 'consortium', status: 'owing' }],
          schedule: [
            { period: 'morning', areaId: 'nm-street', col: 25, row: 9 },
            { period: 'evening', areaId: 'nm-street', col: 25, row: 9 },
            { period: 'night', areaId: 'nm-street', col: 25, row: 9 },
          ],
        },
      ],
    },
  },
  fong: {
    name: 'Ms. Fong',
    style: "Madame Wen's bookkeeper. Carries a ledger, not a bat.",
    look: { skin: '#e8c4a0', hair: '#0e0e10', hairStyle: 'tied', shirt: '#6a1a2a', accessory: 'glasses' },
    // They never sit down; if anybody ever seats them, this is what they say.
    lines: { greeting: ['Ms. Fong: I keep the book. I do not write in it at the table.'] },
    overworld: {
      role: 'suit',
      look: { lower: 'skirt' },
      lines: ['Ms. Fong: I keep the book. Your page is short so far.'],
      schedule: [],
      chapters: [
        {
          when: [{ kind: 'debt', sponsorId: 'wen', status: 'owing' }],
          schedule: [
            { period: 'afternoon', areaId: 'pl-street', col: 6, row: 9 },
            { period: 'evening', areaId: 'pl-street', col: 6, row: 9 },
            { period: 'night', areaId: 'pl-street', col: 6, row: 9 },
          ],
        },
      ],
    },
  },
  // The lunatics: one per town, each the kind of person a card room breeds.
  // They are on the floor in their own town and at the final table's rail (or
  // its felt) at the end; the broadcast scouts them on the way (see events.ts).
  dolores: {
    name: 'Lucky Dolores',
    style: 'Has a system. It is a rabbit foot.',
    look: { skin: '#e0b894', hair: '#d8d8dc', hairStyle: 'tied', shirt: '#a8486a', accessory: 'glasses' },
    seat: { skillTier: 'novice', archetype: 'station' },
    lines: {
      greeting: ['Dolores: Do not sit in the blue chair, honey. The blue chair took my husband.'],
      raise: ['Dolores: The foot says raise.', 'Dolores: Hold my cigarette.'],
      call: ['Dolores: I have a feeling about this one. I have the same feeling about all of them.'],
      fold: ['Dolores: The foot says no. The foot is rarely wrong.'],
      win: ['Dolores: Seventy-four years of this. You cannot teach it.'],
      lose: ['Dolores: Beginner\'s luck. Mine was in 1971.'],
    },
    overworld: {
      look: { garment: 'cardigan', garmentColor: '#8a3a5a', sleeves: 'long' },
      lines: ['Dolores: Rub the foot. Go on. It does not bite. Much.'],
      schedule: [
        { period: 'afternoon', areaId: 'sc-floor', col: 13, row: 7, lines: [
          'Dolores: I tip the dealer in cigarettes. They love it. They are not allowed to say.',
        ] },
        { period: 'evening', areaId: 'sc-floor', col: 13, row: 7, lines: [
          'Dolores: Never play on a Tuesday. Never play on a Wednesday. Thursday I am in a mood.',
        ] },
        { period: 'night', areaId: 'sc-floor', col: 13, row: 7, lines: [
          'Dolores: Honey, you look like a man who is about to be right. Do not let it show.',
        ] },
      ],
    },
  },
  gaines: {
    name: 'Gaines',
    style: 'The Reverend. Tithes ten percent of every pot.',
    look: { skin: '#7a4a2e', hair: '#1a1a1a', hairStyle: 'short', shirt: '#2a2a32', accessory: 'none' },
    seat: { skillTier: 'competent', archetype: 'nit', stackMultiplier: 1.2 },
    lines: {
      greeting: ['Gaines: The Lord provides. I just need the flop.'],
      raise: ['Gaines: Let us pray over this one.', 'Gaines: I am led to raise.'],
      bet: ['Gaines: A small offering.'],
      call: ['Gaines: I will see your sin and raise you nothing.'],
      fold: ['Gaines: Forgive me. I cannot call that.'],
      win: ['Gaines: Ten percent goes to the boat fund. The church boat. It is for souls.'],
      lose: ['Gaines: The meek shall inherit it. Not today, evidently.'],
    },
    overworld: {
      look: { garment: 'jacket', garmentColor: '#1c1c24', sleeves: 'long' },
      lines: ['Gaines: Ten percent, my friend. Not for me. For the boat.'],
      schedule: [
        { period: 'evening', areaId: 'rb-boat', col: 17, row: 5, lines: [
          'Gaines: I took up a collection. It was mostly me. It is called a bankroll, in the gospel.',
        ] },
        { period: 'night', areaId: 'rb-boat', col: 17, row: 5, lines: [
          'Gaines: Folds to a river bet seven times in ten. The Lord does not hold with bluffing. He prefers to be asked.',
        ] },
      ],
    },
  },
  contessa: {
    name: 'Contessa Valmont',
    style: 'The accent comes and goes.',
    look: { skin: '#f0d0b8', hair: '#6a2a18', hairStyle: 'long', shirt: '#2a2a62', accessory: 'shades' },
    seat: { skillTier: 'sharp', archetype: 'maniac' },
    lines: {
      greeting: ['Contessa: Darling. Contessa Valmont. Of the Lyon Valmonts. Or Leeds.'],
      raise: ['Contessa: Raise, darling. We are not here to be liked.', 'Contessa: Oh, I do not THINK so.'],
      bet: ['Contessa: A little something.'],
      call: ['Contessa: I call, mate. Darling. Mate.'],
      fold: ['Contessa: Fold. How dreadfully middle class.'],
      win: ['Contessa: Mine, mine, all mine. Like the Alps.'],
      lose: ['Contessa: Bloody hell. Mon dieu.'],
    },
    overworld: {
      look: { garment: 'vest', garmentColor: '#40204a', sleeves: 'short' },
      lines: ['Contessa: My late husband left me everything. His name was Gary.'],
      schedule: [
        { period: 'evening', areaId: 'ch-cardroom', col: 9, row: 6, lines: [
          'Contessa: Another cocktail, darling. A small one. The size of a Gary.',
        ] },
        { period: 'night', areaId: 'ch-cardroom', col: 9, row: 6, lines: [
          'Contessa: Bluff? Me? I am an aristocrat. I do not need to. I simply bet.',
        ] },
      ],
    },
  },
  zeke: {
    name: 'Zeke "KingPin"',
    style: 'Streams every hand. Mute for the river.',
    look: { skin: '#d8a880', hair: '#f0c820', hairStyle: 'short', shirt: '#c82060', accessory: 'earring' },
    seat: { skillTier: 'competent', archetype: 'regular' },
    lines: {
      greeting: ['Zeke: Chat, say hi to the new donk. Say hi, chat. Chat? Chat.'],
      raise: ['Zeke: Chat, he is not going to call. Watch this.', 'Zeke: Smash that raise button.'],
      call: ['Zeke: Standard call. Chat, tell him it is standard.'],
      fold: ['Zeke: Fold. We love a disciplined fold. Subscribe.'],
      win: ['Zeke: ABSOLUTELY ICONIC. Clip that. Clip it.'],
      lose: ['Zeke: Chat, that was the nuts. That was fine. Do not clip that.'],
    },
    overworld: {
      look: { garment: 'hoodie', garmentColor: '#c82060', sleeves: 'long' },
      lines: ['Zeke: Live in four-three-two. Say something interesting.'],
      schedule: [
        { period: 'afternoon', areaId: 'nm-casino', col: 17, row: 8, lines: [
          'Zeke: Eleven thousand watching. Eleven. And one is my mum.',
        ] },
        { period: 'evening', areaId: 'nm-casino', col: 17, row: 8, lines: [
          'Zeke: I read three poker books and watched six hundred hours of solver. I have never won a hand against anyone in the same room.',
        ] },
        { period: 'night', areaId: 'nm-casino', col: 17, row: 8, lines: [
          'Zeke: Stack of ten thousand, sub-goal of twenty. Be cool. Tip the streamer.',
        ] },
      ],
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
 *
 * Given the state, the story counts too: whoever has followed you up the
 * ladder is where their current chapter puts them. `lines` is what they say
 * here, with the fallbacks already applied.
 */
export function charactersIn(
  areaId: string,
  period: TimePeriod,
  state?: GameState,
): Array<{
  id: string
  character: CharacterDef
  at: ScheduleEntry
  lines: string[]
}> {
  const here = []
  for (const [id, character] of Object.entries(CHARACTERS)) {
    const { schedule, lines } = scheduleFor(character, state)
    // Where they are this hour first, then whether that is here — so nobody can
    // be in two rooms at once however their chapters are written.
    const at = schedule.find((entry) => entry.period === period)
    if (at && at.areaId === areaId) here.push({ id, character, at, lines: at.lines ?? lines })
  }
  return here
}

/**
 * Where somebody spends their days at this point in the story: the last of
 * their chapters whose conditions hold, or their usual schedule.
 *
 * Without a state it is the usual schedule — where they are when the game
 * begins.
 */
export function scheduleFor(
  character: CharacterDef,
  state?: GameState,
): { schedule: ScheduleEntry[]; lines: string[] } {
  const presence = character.overworld
  if (!presence) return { schedule: [], lines: [] }
  const chapter = state
    ? [...(presence.chapters ?? [])].reverse().find((c) => allHold(c.when, state))
    : undefined
  return chapter
    ? { schedule: chapter.schedule, lines: chapter.lines ?? presence.lines }
    : { schedule: presence.schedule, lines: presence.lines }
}

/**
 * Every schedule a character keeps at any point in the story — their usual
 * one and each chapter's — for checking every place anybody could ever stand.
 */
export function allSchedules(character: CharacterDef): ScheduleEntry[][] {
  const presence = character.overworld
  if (!presence) return []
  return [presence.schedule, ...(presence.chapters ?? []).map((c) => c.schedule)]
}

/**
 * Anybody in two places at once, or two people on one tile.
 *
 * One place per hour is checked within each schedule — the usual one and each
 * chapter — because a chapter is somebody's whole day somewhere else. A tile is
 * checked across every schedule anybody keeps, whatever the story: two people
 * sharing one would only be fine if their chapters could never overlap, and
 * that is not worth proving.
 */
export function scheduleConflicts(): string[] {
  const seen = new Map<string, string>()
  const problems: string[] = []
  for (const [id, character] of Object.entries(CHARACTERS)) {
    for (const schedule of allSchedules(character)) {
      const periods = new Set<TimePeriod>()
      for (const entry of schedule) {
        if (periods.has(entry.period)) {
          problems.push(`${id} is in two places at once in the ${entry.period}`)
        }
        periods.add(entry.period)
        const key = `${entry.areaId}:${entry.period}:${entry.col},${entry.row}`
        const other = seen.get(key)
        if (other && other !== id) problems.push(`${id} and ${other} stand on the same tile in the ${entry.period}`)
        seen.set(key, id)
      }
    }
  }
  return problems
}

/**
 * Periods a character has nowhere to be at any point in the story, so you can
 * tell a gap from an oversight.
 */
export function periodsAway(character: CharacterDef): TimePeriod[] {
  const scheduled = new Set(allSchedules(character).flat().map((e) => e.period))
  return TIME_PERIODS.filter((period) => !scheduled.has(period))
}
