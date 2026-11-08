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
  wonTournament: {
    set: 'you have won the Poker Legends tournament and have a seat at the Invitational',
    clear: 'you have not won the Poker Legends tournament',
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
  danaAtTheStop: {
    set: 'you told Dana you had a stop to make first, and she went on to wait at the bus stop',
    clear: 'you walked to the 14 with Dana, or she has not found you yet',
  },

  // The broadcast's scouting reports: each interlude names one town's lunatic,
  // and the final table's recap reads what you were told.
  scoutedDolores: {
    set: 'the broadcast has scouted Lucky Dolores',
    clear: 'the broadcast has not scouted Lucky Dolores',
  },
  scoutedGaines: {
    set: 'the broadcast has scouted Reverend Gaines',
    clear: 'the broadcast has not scouted Reverend Gaines',
  },
  scoutedContessa: {
    set: 'the broadcast has scouted the Contessa',
    clear: 'the broadcast has not scouted the Contessa',
  },
  scoutedBernard: {
    set: 'the broadcast has scouted Bernard',
    clear: 'the broadcast has not scouted Bernard',
  },
  scoutedZeke: {
    set: 'the broadcast has scouted Zeke',
    clear: 'the broadcast has not scouted Zeke',
  },

  // The night of the first game and the morning after: Dana walks you home,
  // and Marcus rides the 14 out to Silver Creek with you.
  marcusSeesYouOff: {
    set: 'Marcus is seeing you off: from the night of the first game till he has walked you into Silver Creek',
    clear: 'nobody is seeing you off',
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

  // The Okonkwo question (docs/STORYBOARD.md §8): six clues, one per stop, and what you do about the penthouse's debt.
  clueWatch: {
    set: 'Marcus told you Nadia once left her watch at his kitchen table',
    clear: 'you have not heard about the watch',
  },
  clueRing: {
    set: 'Ray told you about the girl who paid for her first stack with a ring, and Mr. W',
    clear: 'you have not heard Ray’s story of the girl',
  },
  clueRope: {
    set: 'Deb told you everybody on the river owes somebody',
    clear: 'you have not heard Deb on who owes whom',
  },
  clueTable: {
    set: 'Hal told you why Nadia never stopped reading rooms',
    clear: 'you have not heard why Hal and Nadia parted',
  },
  clueConsortium: {
    set: 'Marcus told you nobody has seen the champion spend the prize',
    clear: 'you have not heard who pays the Invitational',
  },
  clueScout: {
    set: 'Dana told you what her brief from Nadia was',
    clear: 'you have not heard what Dana was told to find',
  },
  penthouseSettled: {
    set: 'you paid Wen’s paper on the penthouse from the prize',
    clear: 'you have not settled Wen’s paper',
  },
  penthouseWen: {
    set: 'you left Wen’s paper on the penthouse with Wen',
    clear: 'you have not left Wen’s paper with her',
  },
  penthouseFund: {
    set: 'you opened a stake fund in the penthouse’s name',
    clear: 'you have not opened the stake fund',
  },

  // The errands (`errands.ts`): small jobs round each town. Each is a choice the
  // client and the afterword remember.
  errandPatelRaised: {
    set: 'you raised the busker to four sevens with Mr Patel’s dollar, and lost it',
    clear: 'you called the busker’s bluff and won Mr Patel his dollar back',
  },
  errandWendellSold: {
    set: 'you told Fat Nico which room Wendell was hiding in',
    clear: 'you kept Wendell’s secret from Fat Nico',
  },
  errandLorettaLied: {
    set: 'you told Loretta that Ray said he would be along',
    clear: 'you told Loretta what Ray really said',
  },
  errandDutchTold: {
    set: 'you told Cass’s runner the lemon sponge was for Dutch’s mum',
    clear: 'you kept Dutch’s sponge a secret',
  },
  errandSalBluffed: {
    set: 'you got Sal’s money by dropping Cass’s name at the dealer',
    clear: 'you collected Sal’s money by counting it out aloud',
  },
  errandFennPointed: {
    set: 'you pointed Abel to the light, with Captain Fenn inside',
    clear: 'you whistled Abel off',
  },
  errandSawTheTell: {
    set: 'you read the maître d’s tell and brought Odalys the real napkin',
    clear: 'you were handed a copy of Odalys’s napkin',
  },
  errandBlamedBernard: {
    set: 'you told Brenda it was Bernard’s fault',
    clear: 'you told Brenda Chad was sorry',
  },
  errandPruittSold: {
    set: 'you told Mrs. Tran where the Commodore is',
    clear: 'you lied to Mrs. Tran about the Commodore',
  },
  errandObjected: {
    set: 'you objected at Randy and Sheila’s wedding',
    clear: 'you witnessed Randy and Sheila’s wedding',
  },
  errandDeeTookCar: {
    set: 'you took the Eldorado off the showroom floor',
    clear: 'you took only the transformer',
  },
  errandFongAdmitted: {
    set: 'you told the guard the greyhound was Ms. Fong’s',
    clear: 'you told the guard the greyhound was yours',
  },
  errandTeodoroChip: {
    set: 'you took Nadia’s first chip to Teodoro',
    clear: 'you left Nadia’s first chip on the felt',
  },
  errandQuizRight: {
    set: 'you answered Wick’s pot-odds question right',
    clear: 'you got Wick’s pot-odds question wrong',
  },
  errandQuizOdds: {
    set: 'you worked out Wick’s pot odds (3 to 1)',
    clear: 'you got Wick’s pot odds wrong',
  },
  errandCoachTilt: {
    set: 'you called Hollis’s rebuys tilt',
    clear: 'you did not call Hollis’s rebuys tilt',
  },
  errandCoachRead: {
    set: 'you read that Hollis plays looser after a rebuy',
    clear: 'you misread Hollis’s rebuys',
  },
  errandSpotTell: {
    set: 'you spotted Bernard’s collar tell from the roulette wheel',
    clear: 'you misread Bernard’s tell',
  },
} as const satisfies Record<string, { set: string; clear: string }>

export type StoryFlag = keyof typeof STORY_FLAGS

/** Every flag, in the order it is written above. */
export const STORY_FLAG_IDS = Object.keys(STORY_FLAGS) as StoryFlag[]

/** A run that has done nothing yet: every flag clear. */
export function clearFlags(): Record<StoryFlag, boolean> {
  return Object.fromEntries(STORY_FLAG_IDS.map((flag) => [flag, false])) as Record<StoryFlag, boolean>
}
