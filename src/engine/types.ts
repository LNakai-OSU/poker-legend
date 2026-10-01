export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export type Suit = (typeof SUITS)[number]

// 2-14, where 11=J, 12=Q, 13=K, 14=A
export type Rank =
  | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
}

export const HandCategory = {
  HighCard: 0,
  Pair: 1,
  TwoPair: 2,
  ThreeOfAKind: 3,
  Straight: 4,
  Flush: 5,
  FullHouse: 6,
  FourOfAKind: 7,
  StraightFlush: 8,
} as const
export type HandCategory = (typeof HandCategory)[keyof typeof HandCategory]

export interface HandStrength {
  category: HandCategory
  /** Descending tiebreak ranks, most significant first (e.g. trips-rank, then kickers). */
  tiebreak: number[]
  /** The 5 cards that make up the best hand, for UI highlighting. */
  cards: Card[]
}

export type Action =
  | { type: 'fold' }
  | { type: 'check' }
  | { type: 'call' }
  | { type: 'raise'; to: number }

export type Street = 'preflop' | 'flop' | 'turn' | 'river' | 'showdown'

export type SkillTier = 'novice' | 'amateur' | 'competent' | 'sharp' | 'elite'

/**
 * *How* a player plays, independently of how well.
 *
 * Skill tier decides how accurately somebody reads a spot; archetype decides what
 * they do with it. Without a real axis here every opponent in the game played the
 * same game with a different name over their head: "Ray plays every hand he is
 * dealt" and "Sully grinds small pots" had action counts that were statistically
 * indistinguishable, which meant there was nobody to learn and so no reason to
 * play the two hundredth hand rather than the twentieth.
 *
 * - `regular` — balanced; the baseline every multiplier is measured against.
 * - `nit` — plays few hands, folds to pressure, rarely bluffs.
 * - `station` — calls far too much and almost never raises. Unbluffable, and
 *   pays off every value bet.
 * - `maniac` — plays and raises everything, bluffs constantly, overbets.
 * - `whale` — a station with money, who also broadcasts honest tells however high
 *   the stakes: a target of opportunity rather than a difficulty step.
 */
export type Archetype = 'regular' | 'nit' | 'station' | 'maniac' | 'whale'

export interface PlayerConfig {
  id: string
  name: string
  isHuman: boolean
  skillTier: SkillTier
  startingStack: number
  archetype?: Archetype
}

export interface TellSignal {
  playerId: string
  /** 0 = perfectly hidden, 1 = completely obvious. Shrinks as skillTier rises. */
  visibility: number
  /** True tell correlates with strength; a decoy is a deliberately misleading tell (bluff). */
  meansStrongHand: boolean
  kind: 'arm-shift' | 'lip-twitch' | 'glance' | 'stillness' | 'chip-tap'
}
