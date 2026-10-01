import { useState } from 'react'
import { audio } from '../audio/audio'
import { MenuScreen, buttonStyle } from './MenuScenes'
import type { GameState } from './state'
import { standing } from './progression'

export function SettingsScene({
  state,
  onNewGame,
  onBack,
}: {
  state: GameState
  onNewGame: () => void
  onBack: () => void
}) {
  const [volume, setVolume] = useState(audio.getVolume())
  const [muted, setMuted] = useState(audio.isMuted())
  const [confirming, setConfirming] = useState(false)

  return (
    <MenuScreen
      title="Settings"
      subtitle={`Day ${state.day} · $${state.cash.toLocaleString()} · reputation ${standing(state)}`}
      onBack={onBack}
      backLabel="Back to the game"
    >
      <div style={{ border: '1px solid #2e2e40', borderRadius: 8, padding: 16, marginBottom: 12 }}>
        <label htmlFor="volume" style={{ display: 'block', marginBottom: 8 }}>
          Volume: {Math.round(volume * 100)}%
        </label>
        <input
          id="volume"
          data-testid="volume-slider"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={(e) => {
            const next = Number(e.target.value) / 100
            setVolume(next)
            audio.setVolume(next)
          }}
          style={{ width: '100%' }}
        />
        <button
          style={{ ...buttonStyle, marginTop: 12, background: muted ? '#2e2e40' : '#3a9d5c' }}
          onClick={() => {
            const next = !muted
            setMuted(next)
            audio.setMuted(next)
          }}
        >
          {muted ? 'Sound is off' : 'Sound is on'}
        </button>
      </div>

      <div style={{ border: '1px solid #2e2e40', borderRadius: 8, padding: 16 }}>
        <div style={{ marginBottom: 4 }}>Progress</div>
        <div style={{ color: '#9a9ab0', fontSize: 13, marginBottom: 12 }}>
          {state.stats.tablesPlayed} sessions played · {state.stats.handsWon} pots won · biggest $
          {state.stats.biggestPot.toLocaleString()} · {state.lessonIds.length} lessons ·{' '}
          {state.ownedItemIds.length} items
        </div>

        {confirming ? (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ color: '#e05a5a' }}>This erases your save. Sure?</span>
            <button
              data-testid="confirm-new-game"
              style={{ ...buttonStyle, background: '#b01c1c' }}
              onClick={onNewGame}
            >
              Erase and start over
            </button>
            <button style={{ ...buttonStyle, background: '#2e2e40' }} onClick={() => setConfirming(false)}>
              Keep playing
            </button>
          </div>
        ) : (
          <button
            data-testid="new-game"
            style={{ ...buttonStyle, background: '#2e2e40' }}
            onClick={() => setConfirming(true)}
          >
            New game
          </button>
        )}
      </div>
    </MenuScreen>
  )
}
