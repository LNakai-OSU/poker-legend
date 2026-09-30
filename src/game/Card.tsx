import type { CSSProperties } from 'react'
import type { Card as CardData } from '../engine/types'

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_SYMBOL: Record<CardData['suit'], string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}
const SUIT_COLOR: Record<CardData['suit'], string> = {
  hearts: '#e05a5a', diamonds: '#e05a5a', clubs: '#e8e8f0', spades: '#e8e8f0',
}

/** Compact text form of a card ("A♠"), for summaries where a chit is too big. */
export function cardText(card: CardData): string {
  return `${RANK_LABEL[card.rank] ?? card.rank}${SUIT_SYMBOL[card.suit]}`
}

const cardBaseStyle: CSSProperties = {
  // Shrinks on phone widths so a five-card board still fits without scrolling.
  width: 'clamp(26px, 8vw, 40px)',
  height: 'clamp(36px, 11vw, 56px)',
  borderRadius: 6,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'monospace',
  fontWeight: 'bold',
  marginRight: 4,
  border: '1px solid #4a4a66',
}

interface CardProps {
  card?: CardData
  faceDown?: boolean
  /** Opponent hole cards on the felt, where space is tight. */
  small?: boolean
  /** 'deal' slides in from the deck, 'flip' turns face-up at showdown. */
  anim?: 'deal' | 'flip'
  delayMs?: number
}

export function Card({ card, faceDown, anim, delayMs = 0, small }: CardProps) {
  const sizeStyle: CSSProperties = small
    ? { width: 'clamp(18px, 5vw, 26px)', height: 'clamp(25px, 7vw, 36px)', marginRight: 2 }
    : {}
  const animClass = anim === 'deal' ? 'card-deal' : anim === 'flip' ? 'card-flip' : undefined
  const animStyle = anim ? { animationDelay: `${delayMs}ms` } : undefined

  if (faceDown || !card) {
    return <div className={animClass} style={{ ...cardBaseStyle, ...sizeStyle, ...animStyle, background: '#2a2a44' }}>?</div>
  }
  const label = RANK_LABEL[card.rank] ?? String(card.rank)
  return (
    <div
      className={animClass}
      style={{ ...cardBaseStyle, ...sizeStyle, ...animStyle, background: '#171722', color: SUIT_COLOR[card.suit] }}
    >
      <div style={{ fontSize: 'clamp(11px, 3.4vw, 16px)' }}>{label}</div>
      <div style={{ fontSize: 'clamp(10px, 3vw, 14px)' }}>{SUIT_SYMBOL[card.suit]}</div>
    </div>
  )
}
