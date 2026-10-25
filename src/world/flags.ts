/**
 * Story flags: things true about the run that one beat sets and another asks
 * about.
 *
 * Named here rather than written as free strings, so a typo in an event is a
 * type error instead of a condition that is quietly never satisfied. Adding a
 * flag is adding a line to this list: the state, the save, the editor and the
 * conditions all read it from here.
 *
 * Each says, in words, what it means when it is set and when it is not, which
 * is how the editor reads an event out loud.
 *
 * Most of the flags below the line are set by a choice the player made, and
 * read by a later beat that remembers it. A flag nobody reads is a choice that
 * changed nothing, and `events.test.ts` fails on one.
 */
export const STORY_FLAGS = {
  wonPokerNight: {
    set: 'you have won the first poker night',
    clear: 'you have not won the first poker night yet',
  },
  beatFinalRival: {
    set: 'you have beaten the final rival',
    clear: 'you have not beaten the final rival yet',
  },
  hasPenthouse: {
    set: 'you own the penthouse',
    clear: 'you do not own the penthouse',
  },
  cameBack: {
    set: 'you have come back from a setback',
    clear: 'you have not come back from a setback yet',
  },

  // The opening, and how you answered Dana the first time she spoke to you.
  metDana: {
    set: 'Dana has walked you to the 14',
    clear: 'Dana has not found you yet',
  },
  askedDanaWhy: {
    set: 'you asked Dana why she watches',
    clear: 'you did not ask Dana why she watches',
  },
  toldDanaToWatch: {
    set: 'you told Dana to watch, then',
    clear: 'you did not tell Dana to watch',
  },
  brushedOffDana: {
    set: 'you told Dana to mind her own business',
    clear: 'you did not brush Dana off',
  },

  // Porto Lumina: what you said to Nadia, and to Dana once you knew.
  askedNadiaWho: {
    set: 'you asked Nadia who has been writing to her',
    clear: 'you did not ask Nadia who writes to her',
  },
  toldNadiaLeaveMarcus: {
    set: 'you told Nadia to leave Marcus out of it',
    clear: 'you did not ask Nadia to leave Marcus out of it',
  },
  trustsDana: {
    set: 'you told Dana you were glad it was her',
    clear: 'you have not told Dana you are glad it was her',
  },
  cutDanaOff: {
    set: 'you told Dana to stay away from your games',
    clear: 'you have not told Dana to stay away',
  },

  // Going broke, and whether you took the kitchen table.
  turnedDownMarcus: {
    set: 'you turned down Marcus’s kitchen table the last time you were broke',
    clear: 'you took the kitchen table, or never had to',
  },

  // The aftermath: whether you staked Kit.
  stakedKit: {
    set: 'you staked Kit',
    clear: 'you have not staked Kit',
  },
} as const satisfies Record<string, { set: string; clear: string }>

export type StoryFlag = keyof typeof STORY_FLAGS

/** Every flag, in the order it is written above. */
export const STORY_FLAG_IDS = Object.keys(STORY_FLAGS) as StoryFlag[]

/** A run that has done nothing yet: every flag clear. */
export function clearFlags(): Record<StoryFlag, boolean> {
  return Object.fromEntries(STORY_FLAG_IDS.map((flag) => [flag, false])) as Record<StoryFlag, boolean>
}
