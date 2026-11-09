import type { Card, Rank } from '../engine/types'

/**
 * What Hal's old tape puts on the board while he talks: real cards, real seats,
 * real stacks of chips. A line of the reel names the exhibit; `TapePanel` draws
 * it. Cards are written the way a player would say them: "As" is the ace of
 * spades, "10h" the ten of hearts.
 */

/** Space-separated cards: `'As Kd 10h'`. */
export type CardList = string

/** One five-card (or any) hand laid out in a row with its name. */
export interface TapeHand {
  title: string
  /** A few words under the title: what makes it this hand. */
  sub?: string
  cards: CardList
  /** Which of the cards make the hand; the rest are dimmed. All of them, when left out. */
  make?: CardList
  /** The hand this really is, by `HAND_CATEGORY_NAMES`. The content test checks the cards say so. */
  rank?: string
  /** Set when two hands are compared: the winner is ticked, the loser crossed. */
  verdict?: 'wins' | 'loses'
}

export type SeatName = 'btn' | 'sb' | 'bb' | 'utg' | 'hj' | 'co'

export type TapeExhibit =
  /** One or two hands in rows: the ranking of hands, a kicker, a flush against a straight. */
  | { kind: 'hands'; hands: TapeHand[]; note?: string }
  /** A hold'em hand as it is dealt: your two cards, and as many of the five shared ones as are out. */
  | { kind: 'board'; hole: CardList; board: CardList; make?: CardList; rank?: string; note?: string }
  /** The table from above, six seats. `order` numbers who acts first; `mark` lights some seats. */
  | { kind: 'seats'; order?: 'preflop' | 'flop'; mark?: SeatName[]; zones?: boolean; note?: string }
  /** Chips in the middle and chips in front of a player; a stack's height is its size. */
  | { kind: 'bets'; pot: number; bets: { label: string; chips: number; tone?: 'bet' | 'call' | 'raise' }[]; note?: string }

/** The rank character of a card string, as a number. */
const RANKS: Record<string, Rank> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13, A: 14,
}
const SUITS = { h: 'hearts', d: 'diamonds', c: 'clubs', s: 'spades' } as const

/** Reads `'As 10h'`; throws on a card that is not one, so a typo is a failed test and not a blank space. */
export function parseCards(list: CardList): Card[] {
  return list
    .split(/\s+/)
    .filter(Boolean)
    .map((text) => {
      const rank = RANKS[text.slice(0, -1).toUpperCase()]
      const suit = SUITS[text.slice(-1).toLowerCase() as keyof typeof SUITS]
      if (!rank || !suit) throw new Error(`"${text}" is not a card`)
      return { rank, suit }
    })
}
