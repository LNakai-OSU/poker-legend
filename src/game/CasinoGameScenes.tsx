import { useState } from 'react'
import { SLOT_SYMBOLS, spin, theoreticalReturn, type SpinResult } from '../engine/slots'
import {
  newCrapsState,
  resolveRoll,
  rollDice,
  type CrapsState,
  type DiceRoll,
} from '../engine/craps'
import { defaultRng } from '../engine/rng'
import { playSound } from '../audio/audio'
import { MenuScreen, buttonStyle } from './MenuScenes'
import type { GameState } from './state'

const STAKES = [10, 50, 200, 1000]

function StakePicker({
  stake,
  setStake,
  cash,
}: {
  stake: number
  setStake: (n: number) => void
  cash: number
}) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
      {STAKES.filter((s) => s <= Math.max(cash, STAKES[0])).map((s) => (
        <button
          key={s}
          aria-pressed={stake === s}
          onClick={() => setStake(s)}
          style={{
            ...buttonStyle,
            background: stake === s ? '#3a9d5c' : '#2e2e40',
            color: stake === s ? '#fff' : '#b9b9c9',
          }}
        >
          ${s}
        </button>
      ))}
    </div>
  )
}

// --- slots ------------------------------------------------------------------

export function SlotsScene({
  state,
  onResult,
  onBack,
}: {
  state: GameState
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const [stake, setStake] = useState(STAKES[0])
  const [result, setResult] = useState<SpinResult | null>(null)
  const [spinning, setSpinning] = useState(false)
  const canPlay = state.cash >= stake && !spinning

  const doSpin = () => {
    if (!canPlay) return
    setSpinning(true)
    playSound('chip')
    onResult(-stake)

    // Let the reels blur for a moment before settling.
    const started = Date.now()
    const tick = window.setInterval(() => {
      setResult(spin(stake, defaultRng))
      if (Date.now() - started > 550) {
        window.clearInterval(tick)
        const final = spin(stake, defaultRng)
        setResult(final)
        setSpinning(false)
        if (final.payout > 0) {
          onResult(final.payout)
          playSound(final.payout >= stake * 20 ? 'win' : 'cash')
        }
      }
    }, 70)
  }

  return (
    <MenuScreen
      title="Slot Row"
      subtitle={`Cash: $${state.cash.toLocaleString()} · Returns about ${Math.round(theoreticalReturn() * 100)}% over the long run`}
      onBack={onBack}
      backLabel="Walk away"
    >
      <StakePicker stake={stake} setStake={setStake} cash={state.cash} />

      <div
        data-testid="slot-reels"
        style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          fontSize: 44,
          padding: '20px 0',
          border: '1px solid #2e2e40',
          borderRadius: 8,
          background: '#171722',
          marginBottom: 12,
        }}
      >
        {(result?.reels ?? [SLOT_SYMBOLS[0], SLOT_SYMBOLS[1], SLOT_SYMBOLS[2]]).map((symbol, i) => (
          <span key={i} style={{ opacity: spinning ? 0.55 : 1 }}>{symbol.label}</span>
        ))}
      </div>

      <div data-testid="slot-result" style={{ minHeight: 24, marginBottom: 12, color: result?.payout ? '#3a9d5c' : '#9a9ab0' }}>
        {spinning ? 'Spinning…' : result ? `${result.label}${result.payout ? ` — won $${result.payout.toLocaleString()}` : ''}` : 'Pick a stake and pull.'}
      </div>

      <button style={canPlay ? buttonStyle : { ...buttonStyle, background: '#2e2e40', color: '#7a7a90' }} disabled={!canPlay} onClick={doSpin}>
        {state.cash < stake ? 'Not enough cash' : `Spin ($${stake})`}
      </button>
    </MenuScreen>
  )
}

// --- craps ------------------------------------------------------------------

export function CrapsScene({
  state,
  onResult,
  onBack,
}: {
  state: GameState
  onResult: (delta: number) => void
  onBack: () => void
}) {
  const [stake, setStake] = useState(STAKES[0])
  const [craps, setCraps] = useState<CrapsState>(newCrapsState())
  const [dice, setDice] = useState<DiceRoll | null>(null)
  const [message, setMessage] = useState('Place a pass line bet and come out.')
  // The stake stays on the table across rolls until the point resolves.
  const [wagered, setWagered] = useState(0)

  const betting = craps.phase === 'come-out' && wagered === 0
  const canRoll = betting ? state.cash >= stake : true

  const roll = () => {
    if (!canRoll) return
    let bet = wagered
    if (betting) {
      bet = stake
      setWagered(stake)
      onResult(-stake)
      playSound('chip')
    }

    const next = resolveRoll(craps, rollDice(defaultRng))
    setDice(next.roll)
    setCraps(next.state)
    setMessage(next.message)

    if (next.outcome === 'win') {
      onResult(bet * 2)
      setWagered(0)
      playSound('win')
    } else if (next.outcome === 'lose') {
      setWagered(0)
      playSound('lose')
    } else {
      playSound('check')
    }
  }

  return (
    <MenuScreen
      title="Craps — Pass Line"
      subtitle={`Cash: $${state.cash.toLocaleString()} · House edge on the pass line is 1.41%`}
      onBack={onBack}
      backLabel="Walk away"
    >
      {betting && <StakePicker stake={stake} setStake={setStake} cash={state.cash} />}

      <div
        data-testid="craps-dice"
        style={{
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          fontSize: 40,
          padding: '20px 0',
          border: '1px solid #2e2e40',
          borderRadius: 8,
          background: '#171722',
          marginBottom: 12,
        }}
      >
        <span>{dice ? dice.a : '–'}</span>
        <span>{dice ? dice.b : '–'}</span>
      </div>

      <div style={{ marginBottom: 8 }}>
        {craps.point ? `Point: ${craps.point}` : 'Come-out roll'}
        {wagered > 0 && ` · $${wagered.toLocaleString()} on the pass line`}
      </div>
      <div data-testid="craps-message" style={{ minHeight: 24, marginBottom: 12, color: '#9a9ab0' }}>{message}</div>

      <button
        style={canRoll ? buttonStyle : { ...buttonStyle, background: '#2e2e40', color: '#7a7a90' }}
        disabled={!canRoll}
        onClick={roll}
      >
        {betting ? `Bet $${stake} and roll` : 'Roll'}
      </button>
    </MenuScreen>
  )
}
