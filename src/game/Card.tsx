import type { CSSProperties } from 'react'
import type { Card as CardData } from '../engine/types'

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_SYMBOL: Record<CardData['suit'], string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}
// Printed on white stock, the way a real deck is, so a board reads at a glance.
const SUIT_COLOR: Record<CardData['suit'], string> = {
  hearts: '#c2182b', diamonds: '#c2182b', clubs: '#15151c', spades: '#15151c',
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

/**
 * The back of a real deck: a bordered panel with a crosshatch. Face-down cards
 * used to be a box with a "?" in it, which read as missing data rather than as a
 * card somebody is holding.
 */
const cardBackStyle: CSSProperties = {
  background: '#7a1f2b',
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255,255,255,0.13) 0 2px, transparent 2px 4px),' +
    'repeating-linear-gradient(-45deg, rgba(0,0,0,0.22) 0 2px, transparent 2px 4px)',
  boxShadow: 'inset 0 0 0 2px #f0e6d2, inset 0 0 0 3px #5e1420',
  borderColor: '#45101a',
}

/** An undealt board slot: a dark recess, not a card anybody is holding. */
const emptySlotStyle: CSSProperties = {
  background: 'rgba(0,0,0,0.22)',
  border: '1px dashed rgba(255,255,255,0.16)',
  boxShadow: 'none',
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
}

export function Card({ card, faceDown, placeholder, anim, delayMs = 0, small }: CardProps) {
  const sizeStyle: CSSProperties = small
    ? { width: 'clamp(18px, 5vw, 26px)', height: 'clamp(25px, 7vw, 36px)', marginRight: 2 }
    : {}
  const animClass = anim === 'deal' ? 'card-deal' : anim === 'flip' ? 'card-flip' : undefined
  const animStyle = anim ? { animationDelay: `${delayMs}ms` } : undefined

  if (placeholder) {
    return <div style={{ ...cardBaseStyle, ...sizeStyle, ...emptySlotStyle }} />
  }
  if (faceDown || !card) {
    return (
      <div
        className={animClass}
        data-facedown="true"
        style={{ ...cardBaseStyle, ...sizeStyle, ...animStyle, ...cardBackStyle }}
      />
    )
  }
  const label = RANK_LABEL[card.rank] ?? String(card.rank)
  return (
    <div
      className={animClass}
      style={{
        ...cardBaseStyle,
        ...sizeStyle,
        ...animStyle,
        // White stock with the index in the top-left corner and a large pip
        // below it, so a card is recognisable at a glance and at phone size.
        background: 'linear-gradient(170deg, #ffffff 0%, #f2f0ea 100%)',
        color: SUIT_COLOR[card.suit],
        border: '1px solid #b9b4a6',
        boxShadow: '0 1px 2px rgba(0,0,0,0.45)',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        padding: small ? '1px 2px' : '2px 3px',
        lineHeight: 1,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ fontSize: small ? 'clamp(9px, 2.6vw, 12px)' : 'clamp(11px, 3.4vw, 15px)' }}>
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          right: small ? 1 : 2,
          bottom: small ? 0 : 1,
          fontSize: small ? 'clamp(10px, 3vw, 14px)' : 'clamp(14px, 4.4vw, 22px)',
          lineHeight: 1,
          opacity: 0.95,
        }}
      >
        {SUIT_SYMBOL[card.suit]}
      </div>
    </div>
  )
}
