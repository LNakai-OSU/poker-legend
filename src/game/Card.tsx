import type { CSSProperties } from 'react'
import type { Card as CardData } from '../engine/types'

const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }
const SUIT_SYMBOL: Record<CardData['suit'], string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
}
const SUIT_COLOR: Record<CardData['suit'], string> = {
  hearts: '#e05a5a', diamonds: '#e05a5a', clubs: '#e8e8f0', spades: '#e8e8f0',
}

const cardBaseStyle: CSSProperties = {
  width: 40,
  height: 56,
  borderRadius: 6,
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'monospace',
  fontWeight: 'bold',
  marginRight: 6,
  border: '1px solid #4a4a66',
}

export function Card({ card, faceDown }: { card?: CardData; faceDown?: boolean }) {
  if (faceDown || !card) {
    return <div style={{ ...cardBaseStyle, background: '#2a2a44' }}>?</div>
  }
  const label = RANK_LABEL[card.rank] ?? String(card.rank)
  return (
    <div style={{ ...cardBaseStyle, background: '#171722', color: SUIT_COLOR[card.suit] }}>
      <div style={{ fontSize: 16 }}>{label}</div>
      <div style={{ fontSize: 14 }}>{SUIT_SYMBOL[card.suit]}</div>
    </div>
  )
}
