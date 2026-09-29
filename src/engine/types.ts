export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'] as const
export type Suit = (typeof SUITS)[number]

// 2-14, where 11=J, 12=Q, 13=K, 14=A
export type Rank =
  | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14

export interface Card {
  rank: Rank
  suit: Suit
}

export enum HandCategory {
  HighCard = 0,
  Pair = 1,
  TwoPair = 2,
  ThreeOfAKind = 3,
  Straight = 4,
  Flush = 5,
  FullHouse = 6,
  FourOfAKind = 7,
  StraightFlush = 8,
}

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

export interface PlayerConfig {
  id: string
  name: string
  isHuman: boolean
  skillTier: SkillTier
  startingStack: number
}

export interface TellSignal {
  playerId: string
  /** 0 = perfectly hidden, 1 = completely obvious. Shrinks as skillTier rises. */
  visibility: number
  /** True tell correlates with strength; a decoy is a deliberately misleading tell (bluff). */
  meansStrongHand: boolean
  kind: 'arm-shift' | 'lip-twitch' | 'glance' | 'stillness' | 'chip-tap'
}
