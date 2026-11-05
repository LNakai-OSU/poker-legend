import { useState } from 'react'
import { VENUES } from '../world/content'
import { PENTHOUSE_FLOORS } from '../world/cities'
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
  onGoTo,
}: {
  state: GameState
  onBack: () => void
  /** Ride to a floor: the lobby, the workroom, the gym, the pool, or home. */
  onGoTo: (areaId: string) => void
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
    <MenuScreen title="The Lift" subtitle="Every button works for you now." onBack={onBack} backLabel="Stay here">
      <div
        style={{
          width: 'fit-content',
          maxWidth: '100%',
          boxSizing: 'border-box',
          margin: '8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '16px 20px',
          background: 'linear-gradient(90deg, #8a6a2a, #d8b45a 30%, #f2dc92 50%, #d8b45a 70%, #8a6a2a)',
          border: '3px solid #5a4218',
          borderRadius: 8,
          boxShadow: 'inset 0 0 0 2px rgba(255,244,200,0.45), 0 6px 18px rgba(0,0,0,0.6)',
        }}
      >
        {[...PENTHOUSE_FLOORS].reverse().map((floor) => {
          const here = state.areaId === floor.areaId
          return (
            <button
              key={floor.areaId}
              data-testid={`lift-${floor.areaId}`}
              disabled={here}
              aria-label={`${floor.label}, ${floor.name}`}
              onClick={() => {
                playSound('ui')
                onGoTo(floor.areaId)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: here ? 'default' : 'pointer',
                width: '100%',
                fontFamily: 'inherit',
              }}
            >
              <span
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: here ? '#2a1a00' : '#3a2a10',
                  background: here
                    ? 'radial-gradient(circle at 50% 40%, #fff2b0, #ffb830 70%)'
                    : 'radial-gradient(circle at 35% 30%, #fffbe8, #d8d0b8 60%, #9a9078)',
                  border: '3px solid #5a4218',
                  boxShadow: here
                    ? '0 0 14px 3px rgba(255,190,60,0.85), inset 0 -3px 5px rgba(120,60,0,0.4)'
                    : 'inset 0 -3px 5px rgba(0,0,0,0.3), 0 2px 3px rgba(0,0,0,0.5)',
                }}
              >
                {floor.label}
              </span>
              <span style={{ color: '#2a1a00', fontSize: 14, fontWeight: 600, minWidth: 130, textAlign: 'left' }}>
                {floor.name}
                {here ? ' •' : ''}
              </span>
            </button>
          )
        })}
      </div>
    </MenuScreen>
  )
}
