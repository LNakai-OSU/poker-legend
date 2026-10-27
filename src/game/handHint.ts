import { bestHand, HAND_CATEGORY_NAMES } from '../engine/handRank'
import { HandCategory, type Card } from '../engine/types'

const RANK_WORD: Record<number, string> = {
  2: 'Twos', 3: 'Threes', 4: 'Fours', 5: 'Fives', 6: 'Sixes', 7: 'Sevens', 8: 'Eights', 9: 'Nines',
  10: 'Tens', 11: 'Jacks', 12: 'Queens', 13: 'Kings', 14: 'Aces',
}
const RANK_SINGLE: Record<number, string> = {
  2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight', 9: 'Nine',
  10: 'Ten', 11: 'Jack', 12: 'Queen', 13: 'King', 14: 'Ace',
}

/**
 * What a first-time player is holding, in words: "a pair" before the flop, and
 * the best hand they have made once cards are out. Used only where the game is
 * teaching (the first poker night); it reveals nothing the player can't see.
 */
export function describeHold(hole: Card[], board: Card[]): string | null {
  if (hole.length < 2) return null
  const [a, b] = hole
  if (board.length < 3) {
    if (a.rank === b.rank) return `You hold a pair of ${RANK_WORD[a.rank]} — a double. A strong start.`
    const high = Math.max(a.rank, b.rank)
    const suited = a.suit === b.suit ? ', same suit' : ''
    return `You hold ${RANK_SINGLE[high]} high${suited}. Nothing made yet — the board decides.`
  }
  const best = bestHand([...hole, ...board])
  const name = HAND_CATEGORY_NAMES[best.category]
  const boardOnly = board.length >= 5 ? bestHand(board) : null
  if (boardOnly && boardOnly.category === best.category && best.category <= HandCategory.Pair) {
    return `Your best is just the board's ${name.toLowerCase()} — you've added nothing.`
  }
  if (best.category === HandCategory.HighCard) return 'You have nothing yet — just a high card.'
  if (best.category === HandCategory.Pair) {
    const paired = hole.some((c) => board.some((d) => d.rank === c.rank)) || a.rank === b.rank
    return paired ? `You have a pair${a.rank === b.rank ? ` of ${RANK_WORD[a.rank]}` : ''}.` : `The board has a pair — you haven't added to it.`
  }
  return `You have ${/^[AEIOU]/.test(name) ? 'an' : 'a'} ${name}.`
}
