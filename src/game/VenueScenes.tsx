import { useState } from 'react'
import { VENUES } from '../world/content'
import { MenuScreen, buttonStyle } from './MenuScenes'
import { playSound } from '../audio/audio'
import type { GameState } from './state'
import { standing } from './progression'

/**
 * Restaurants and clubs. Restaurants trade cash for a read on the room — the
 * gossip points you at the softest games in town. Clubs are where invitations
 * to private games actually come from, and they only come once the room has
 * heard of you.
 */
export function VenueScene({
  venueId,
  state,
  onSpend,
  onUnlockTable,
  onRest,
  onBack,
}: {
  venueId: string
  state: GameState
  onSpend: (amount: number) => void
  onUnlockTable: (tableId: string) => void
  /** A meal bought this many days of being rested. */
  onRest: (days: number) => void
  onBack: () => void
}) {
  const venue = VENUES[venueId]
  const [entered, setEntered] = useState(false)
  const rep = standing(state)
  const invited = venue.kind === 'club' && rep >= (venue.reputationNeeded ?? 0)
  const alreadyUnlocked = venue.unlocksTableId ? state.unlockedTableIds.includes(venue.unlocksTableId) : false
  const affordable = state.cash >= venue.price

  if (!entered && !alreadyUnlocked) {
    return (
      <MenuScreen
        title={venue.name}
        subtitle={`Cash: $${state.cash.toLocaleString()}`}
        onBack={onBack}
        backLabel="Not tonight"
      >
        <p style={{ color: '#9a9ab0' }}>{venue.blurb}</p>
        {venue.kind === 'club' && (
          <p style={{ color: invited ? '#3a9d5c' : '#9a9ab0' }}>
            {invited
              ? 'People here know your name.'
              : `Nobody here knows you yet. (Reputation ${rep} of ${venue.reputationNeeded})`}
          </p>
        )}
        <button
          style={affordable ? buttonStyle : { ...buttonStyle, background: '#2e2e40', color: '#7a7a90' }}
          disabled={!affordable}
          onClick={() => {
            onSpend(venue.price)
            playSound('cash')
            setEntered(true)
            if (venue.restsForDays) onRest(venue.restsForDays)
            if (invited && venue.unlocksTableId) onUnlockTable(venue.unlocksTableId)
          }}
        >
          {affordable
            ? venue.kind === 'restaurant'
              ? `Eat ($${venue.price.toLocaleString()})`
              : `Pay the door ($${venue.price.toLocaleString()})`
            : 'Too expensive'}
        </button>
      </MenuScreen>
    )
  }

  const lines = invited && venue.inviteLines ? venue.inviteLines : venue.lines

  return (
    <MenuScreen title={venue.name} onBack={onBack} backLabel="Head out">
      {lines.map((line, i) => (
        <p key={i} style={{ lineHeight: 1.6 }}>{line}</p>
      ))}
      {invited && venue.unlocksTableId && (
        <p data-testid="club-invite" style={{ color: '#3a9d5c' }}>
          The private game is open to you now.
        </p>
      )}
    </MenuScreen>
  )
}

/** The prize for the heads-up match — and the free-play hub afterwards. */
export function PenthouseScene({
  state,
  onBack,
}: {
  state: GameState
  onBack: () => void
}) {
  if (!state.flags.hasPenthouse) {
    return (
      <MenuScreen title="Penthouse Lift" onBack={onBack} backLabel="Step back">
        <p>The attendant does not press the button.</p>
        <p style={{ color: '#9a9ab0' }}>
          &ldquo;Forty-one is Ms. Okonkwo&rsquo;s floor. If that ever changes, I&rsquo;ll hear about it before you do.&rdquo;
        </p>
      </MenuScreen>
    )
  }

  return (
    <MenuScreen title="Your Penthouse" onBack={onBack} backLabel="Take the lift down">
      <p>Corner glass, harbour on two sides, and the felt table still by the window.</p>
      <p style={{ color: '#9a9ab0' }}>
        Day {state.day}. ${state.cash.toLocaleString()} in the safe, {state.stats.handsWon} pots taken,
        biggest one ${state.stats.biggestPot.toLocaleString()}.
      </p>
      <p style={{ color: '#9a9ab0' }}>
        The attendant presses the button before you reach it now.
      </p>
    </MenuScreen>
  )
}
