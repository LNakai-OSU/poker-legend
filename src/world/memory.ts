import type { Archetype } from '../engine/types'
import type { OpponentNotes } from '../game/book'

/**
 * What an opponent remembers about you, and says.
 *
 * The Book of Reads is what *you* know about *them*. This is the other way
 * round: the named people at the tables keep score too, and say so at the next
 * sitting. A grudge from a big pot, a smugness from taking one, or — inside a
 * single sitting — the third time you have run them off a pot.
 *
 * Flavour only. Nothing here touches the cards or the way they play (rule 2);
 * it is the ladder acting like a career and not a row of fresh strangers.
 */
export type MemoryKind =
  /** Last time, you took a big pot off them. */
  | 'youTookBig'
  /** Last time, they took a big pot off you. */
  | 'theyTookBig'
  /** This sitting: you have bet them out of a pot three times. */
  | 'foldsToYou'
  /** You have shared a table a good while, and nothing in particular happened. */
  | 'knowYou'

/** Folds to your bets, this sitting, before they say something. */
export const FOLDS_BEFORE_THEY_SAY = 3
/** Hands shared, over past sittings, before they act as if they know you. */
export const HANDS_TO_KNOW_YOU = 20

/**
 * What, if anything, this person has on you. A fresh run-off this sitting
 * outranks a long memory; a big pot outranks plain familiarity.
 */
export function memoryOf(prior: OpponentNotes | undefined, live: OpponentNotes | undefined): MemoryKind | null {
  if (live && live.foldedToYou >= FOLDS_BEFORE_THEY_SAY) return 'foldsToYou'
  if (prior?.lastBigPot === 'you') return 'youTookBig'
  if (prior?.lastBigPot === 'them') return 'theyTookBig'
  if (prior && prior.hands >= HANDS_TO_KNOW_YOU) return 'knowYou'
  return null
}

/** For somebody with no lines of their own: how their kind of player says it. */
export const MEMORY_LINES: Record<Archetype, Record<MemoryKind, string[]>> = {
  regular: {
    youTookBig: ['That pot last time. I wrote it down. Not tonight.', 'You took a big one off me before. I have not forgotten the hand.'],
    theyTookBig: ['I remember you. I took a nice pot off you last time. Let us see if you learned anything.'],
    foldsToYou: ['You keep betting and I keep folding. That ends now.', 'Third pot you have pushed me out of. I am counting.'],
    knowYou: ['We have sat together before. You know how I play, and I know how you do.'],
  },
  nit: {
    youTookBig: ['I folded for an hour and you still found my chips last time. I remember.', 'You made me pay once. This time I wait for better.'],
    theyTookBig: ['Last time I waited, and it paid. Do you remember that?'],
    foldsToYou: ['You think I fold because I am scared. I am waiting.', 'Betting into me again. Bold. Keep going.'],
    knowYou: ['Same face as before. I remember every hand I folded to you.'],
  },
  station: {
    youTookBig: ['You beat me last time and I am still not sure how.', 'I called you down and lost. I will call you down again, I have a feeling.'],
    theyTookBig: ['Hey! I beat you last time! Remember? I remember.'],
    foldsToYou: ['Fine, you got me to fold a few. I am not folding now.'],
    knowYou: ['Oh hey, it is you again. Good.'],
  },
  maniac: {
    youTookBig: ['You took a big one off me. I will be taking it back with interest.', 'Last time stung. Let us go again, and bigger.'],
    theyTookBig: ['Remember last time? I do. Hand over the chips again.'],
    foldsToYou: ['You keep running me off pots. Let me show you what running back looks like.'],
    knowYou: ['Back again! Good. I was getting bored.'],
  },
  whale: {
    youTookBig: ['You won a big one off me last time and I am still smiling. Do it again!'],
    theyTookBig: ['I beat you last time! Do you remember? Lucky, lucky me.'],
    foldsToYou: ['Folding again! Hm. Maybe I will not, this time.'],
    knowYou: ['Oh, it is you! My favourite person at the table.'],
  },
}

/**
 * In their own voice, where they have one. Only the lines worth writing are
 * here; anything left out falls back to `MEMORY_LINES` for how they play.
 */
export const MEMORY_OF_YOU: Record<string, Partial<Record<MemoryKind, string[]>>> = {
  mack: {
    youTookBig: ['You got into a big pot of mine last time. I do not forget how.'],
    foldsToYou: ['I am folding because I am patient. Not because of you.'],
  },
  deb: {
    youTookBig: ['I have been here twenty years and you took that pot off me in front of everyone. I remember.'],
    foldsToYou: ['Kid, you have run me off three hands. I am not impressed. I am counting.'],
  },
  vance: {
    youTookBig: ['I have been thinking about that hand since last time. I could have folded it. I know that now.'],
    foldsToYou: ['I fold. Again. I need to think about why I keep folding to you.'],
  },
  corinne: {
    youTookBig: ['That pot last time was my rent. Not tonight, friend.'],
    foldsToYou: ['Three pots you have pushed me off. Either you have it or you are good. I am going to find out which.'],
  },
  sully: {
    youTookBig: ['Took me an hour to grind back what you took in one hand. I sat down early to start.'],
    foldsToYou: ['Small pots add up, and you have been taking them. Stop.'],
  },
  walt: {
    youTookBig: ['I counted what I lost to you last time. Twice. It was the same both times.'],
    foldsToYou: ['That is four of my pots you have folded me out of. I counted.'],
  },
  gus: {
    youTookBig: ['Remember when you took that pot off me? I told everyone. Twice.'],
    foldsToYou: ['You keep betting and I keep folding, and I will tell you why that has to stop, and it will take a while.'],
  },
  pearl: {
    youTookBig: ['You took a pot off me. I did not look at my cards twice. I will this time.'],
    foldsToYou: ['Bet. Fold. Bet. Fold. I see the pattern.'],
  },
  junie: {
    youTookBig: ['You beat me once. I learned your face. Now it is my turn.'],
    foldsToYou: ['You keep making me fold. I am starting to read you instead.'],
  },
  delphine: {
    youTookBig: ['You took a big pot off me. I invited you. Remember that.'],
    foldsToYou: ['Three folds to you. Do you want me to remember who you were before?'],
  },
  kit: {
    youTookBig: ['You got me last time. I have not stopped thinking about it. Good. I like that.'],
    foldsToYou: ['You keep running me off pots. I will let you. Once more.'],
  },
  nadia: {
    youTookBig: ['Last time, a big pot. I let you have it. Or I did not. Decide which.'],
    foldsToYou: ['You press and I fold. Interesting. Do you know why?'],
  },
  priya: {
    youTookBig: ['You took a large pot from me. I replayed it. I would do it differently.'],
    foldsToYou: ['Fold, fold. You have my attention.'],
  },
  xue: {
    youTookBig: ['One big pot off me. That is a month of my life. Fine. Come and get another.'],
    foldsToYou: ['You are pushing me off pots. That is rude.'],
  },
  saul: {
    youTookBig: ['Forty years, and you took a pot off me like it was nothing. I respect that. I resent it more.'],
    foldsToYou: ['Folding to your bets. A young man’s game. I will fold until I do not.'],
  },
}

/** What they say, or null if they have nothing on you. */
export function memoryLine(characterId: string, archetype: Archetype | undefined, kind: MemoryKind, pick: (n: number) => number = (n) => Math.floor(Math.random() * n)): string {
  const own = MEMORY_OF_YOU[characterId]?.[kind]
  const lines = own ?? MEMORY_LINES[archetype ?? 'regular'][kind]
  return lines[pick(lines.length)]
}
