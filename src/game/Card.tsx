import type { Card as CardData } from '../engine/types'
import { CARD_ART, cardBackUrl, cardFaceUrl, slotUrl, type CardBack } from './pixel/cards'

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_SYMBOL: Record<CardData['suit'], string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}

/** Compact text form of a card ("A♠"), for summaries where a chit is too big. */
export function cardText(card: CardData): string {
  return `${RANK_LABEL[card.rank] ?? card.rank}${SUIT_SYMBOL[card.suit]}`
}

interface CardProps {
  card?: CardData
  faceDown?: boolean
  /** An undealt community-card slot, drawn as an empty space on the felt. */
  placeholder?: boolean
  /** Opponent hole cards on the felt, where space is tight. */
  small?: boolean
  /** 'deal' slides in from the deck, 'flip' turns face-up at showdown. */
  anim?: 'deal' | 'flip'
  delayMs?: number
  /** CSS pixels per art pixel. */
  scale: number
  /** How this room prints the back of its cards. */
  back: CardBack
  /** The cloth an empty slot is pressed into. */
  felt: string
}

/**
 * A playing card, drawn on the art grid and scaled up whole pixels at a time.
 *
 * Face-down cards used to be a box with a "?" in it, which read as missing data;
 * then a CSS crosshatch, which read as a web page. Now they are the house's
 * printed back. Every card carries `data-card` — the card itself, or "back" —
 * so a test can find a card without knowing how it happens to be drawn.
 */
export function Card({ card, faceDown, placeholder, anim, delayMs = 0, small, scale, back, felt }: CardProps) {
  const size = small ? 'small' : 'big'
  const { w, h } = CARD_ART[size]
  const style = {
    display: 'block',
    width: w * scale,
    height: h * scale,
    imageRendering: 'pixelated' as const,
    flex: 'none',
    animationDelay: anim ? `${delayMs}ms` : undefined,
  }
  const animClass = anim === 'deal' ? 'card-deal' : anim === 'flip' ? 'card-flip' : undefined

  if (placeholder) {
    return <img src={slotUrl(felt, size)} alt="" data-slot="true" draggable={false} style={style} />
  }
  if (faceDown || !card) {
    return (
      <img
        src={cardBackUrl(back, size)}
        alt="a face-down card"
        data-facedown="true"
        data-card="back"
        className={animClass}
        draggable={false}
        style={style}
      />
    )
  }
  const label = cardText(card)
  return (
    <img
      src={cardFaceUrl(card, size)}
      alt={label}
      data-card={label}
      className={animClass}
      draggable={false}
      style={style}
    />
  )
}
